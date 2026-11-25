"""Allowlisted, bounded network checks for SOC analysts.

Not a shell, packet sniffer, port scanner, or browser-local network interface.
All probes originate from this server. Default is disabled. No unsolicited traffic
is sent until an operator enables diagnostics and allowlists specific targets.
"""
import ipaddress
import os
import re
import shlex
import socket
import subprocess
import time
from dataclasses import dataclass


class DiagnosticError(ValueError):
    pass


@dataclass(frozen=True)
class Config:
    enabled: bool
    allowed_targets: tuple
    allowed_ports: frozenset
    max_duration: float = 1.5


def from_env():
    targets = tuple(x.strip().lower() for x in os.getenv('SPEC_NET_ALLOWED_TARGETS', '127.0.0.1,::1,localhost').split(',') if x.strip())
    ports = frozenset(int(x.strip()) for x in os.getenv('SPEC_NET_ALLOWED_PORTS', '53,443,5300,8080').split(',') if x.strip().isdigit() and 1 <= int(x.strip()) <= 65535)
    return Config(os.getenv('SPEC_NET_DIAGNOSTICS_ENABLED', '').strip() == '1', targets, ports)


def resolve_allowed(target, cfg):
    """Resolve once; pin the resolved address for probes; deny DNS rebinding."""
    if not isinstance(target, str) or not re.fullmatch(r'[A-Za-z0-9.:-]{1,100}', target):
        raise DiagnosticError('invalid target: use an allowlisted host or IP')
    target = target.lower()
    networks, hosts = [], set()
    for allowed in cfg.allowed_targets:
        try:
            networks.append(ipaddress.ip_network(allowed, strict=False))
        except ValueError:
            hosts.add(allowed)
    try:
        literal = ipaddress.ip_address(target)
    except ValueError:
        literal = None
    if literal is None and target not in hosts:
        raise DiagnosticError('target is not allowlisted by the server administrator')
    if literal is not None:
        if not (target in hosts or any(literal in net for net in networks)):
            raise DiagnosticError('target is not allowlisted by the server administrator')
        return str(literal)
    try:
        resolved = socket.getaddrinfo(target, None, type=socket.SOCK_STREAM)
    except OSError:
        raise DiagnosticError('allowlisted hostname could not be resolved') from None
    ips = sorted({record[4][0] for record in resolved})
    # Explicit hostname allowlist is not license to target arbitrary newly-resolved addresses.
    # It must additionally resolve only to IPs covered by explicit IP/CIDR allowlists.
    if not ips or not networks or any(not any(ipaddress.ip_address(ip) in net for net in networks) for ip in ips):
        raise DiagnosticError('hostname resolves outside the IP allowlist')
    return ips[0]


def parse(command):
    if not isinstance(command, str) or len(command) > 150 or any(c in command for c in ';&|`$\\<>\n\r'):
        raise DiagnosticError('only one supported diagnostic command is allowed')
    try:
        parts = shlex.split(command)
    except ValueError:
        raise DiagnosticError('invalid command syntax') from None
    if not parts:
        raise DiagnosticError('enter a command')
    verb = parts[0].lower()
    if verb in ('help', 'status') and len(parts) == 1:
        return verb, None, None
    if verb in ('ping', 'dns', 'nslookup') and len(parts) == 2:
        return 'dns' if verb == 'nslookup' else verb, parts[1], None
    if verb in ('tcp', 'udp') and len(parts) == 3 and parts[2].isdigit() and 1 <= int(parts[2]) <= 65535:
        return verb, parts[1], int(parts[2])
    raise DiagnosticError('supported: help, status, ping HOST, dns HOST, tcp HOST PORT, udp HOST PORT')


def _result(kind, target, status, detail, elapsed, port=None, address=None, code=None):
    return {'kind': kind, 'target': target, 'port': port, 'address': address, 'status': status,
            'detail': str(detail)[:500], 'duration_ms': round(elapsed * 1000, 1),
            'observed_at': int(time.time() * 1000), 'mode': 'live_server', 'code': code}


def run(command, cfg):
    kind, target, port = parse(command)
    if kind == 'help':
        return _result(kind, '', 'information', 'Commands: ping HOST; dns HOST; tcp HOST PORT; udp HOST PORT; status. No shell or packet capture.', 0)
    if kind == 'status':
        return _result(kind, '', 'information', f"Backend diagnostics {'enabled' if cfg.enabled else 'disabled'}; {len(cfg.allowed_targets)} allowlist entries. Tests originate from the server, not the browser.", 0)
    if not cfg.enabled:
        raise DiagnosticError('live network diagnostics are disabled; enable them explicitly in the server environment')
    if kind in ('tcp', 'udp') and port not in cfg.allowed_ports:
        raise DiagnosticError('port is not allowlisted by the server administrator')
    address = resolve_allowed(target, cfg)
    start = time.monotonic()
    if kind == 'dns':
        return _result(kind, target, 'resolved', f'Allowlisted hostname resolved to {address}; this does not prove the host is reachable.', time.monotonic()-start, address=address)
    if kind == 'ping':
        # Never route the host string to a shell; the pinned numeric IP is used.
        args = ['ping', '-n', '-c', '1', '-W', '1', address]
        try:
            cp = subprocess.run(args, capture_output=True, text=True, timeout=2.5, check=False)
        except (OSError, subprocess.TimeoutExpired):
            return _result(kind, target, 'unavailable', 'ICMP ping utility unavailable or timed out on the server.', time.monotonic()-start, address=address)
        if cp.returncode == 0:
            return _result(kind, target, 'reply', 'One ICMP echo reply received from the server location. Does not prove services are healthy.', time.monotonic()-start, address=address)
        return _result(kind, target, 'no_reply', 'No ICMP echo reply. Firewalls may block ICMP; host reachability remains unknown.', time.monotonic()-start, address=address)
    family = socket.AF_INET6 if ':' in address else socket.AF_INET
    with socket.socket(family, socket.SOCK_STREAM if kind == 'tcp' else socket.SOCK_DGRAM) as sock:
        sock.settimeout(cfg.max_duration)
        if kind == 'tcp':
            try:
                sock.connect((address, port))
                status, detail = 'open', 'TCP handshake succeeded from the server. Application identity and security are not established.'
            except ConnectionRefusedError:
                status, detail = 'closed', 'TCP connection actively refused. Port appears closed from the server location.'
            except OSError:
                status, detail = 'no_reply', 'TCP connection failed or timed out. Filtering or routing may be involved.'
        else:
            try:
                # Echo-style UDP datagram only. A timeout is NOT evidence that a UDP port is closed.
                sock.sendto(b'SPECTACLE_SOC_DIAGNOSTIC_V1', (address, port))
                data, src = sock.recvfrom(256)
                if src[0] != address:
                    status, detail = 'inconclusive', 'Datagram arrived from an unexpected peer; result ignored.'
                else:
                    status, detail = 'reply', f'UDP response received ({len(data)} bytes) from the allowlisted address. Application protocol not authenticated.'
            except (socket.timeout, ConnectionRefusedError, OSError):
                status, detail = 'inconclusive', 'UDP probe sent; no valid response. UDP has no handshake, so open/closed state cannot be inferred.'
    return _result(kind, target, status, detail, time.monotonic()-start, port=port, address=address)
