"""Three additional bounded network acceptance cases to extend the v10 37-case
loopback diagnostics test plan to 40. No external traffic is sent.
"""
import pathlib
import sys
from dataclasses import replace

import pytest

sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'api'))
from spec_api import net_diagnostics as net


def test_missing_command_disallowed():
    with pytest.raises(net.DiagnosticError,match='enter a command'):
        net.parse('   ')


def test_remote_ip_denied_even_on_allowed_udp_port():
    cfg=net.Config(enabled=True,allowed_targets=('127.0.0.1/32',),allowed_ports=frozenset([53]))
    with pytest.raises(net.DiagnosticError,match='allowlist'):
        net.run('udp 192.0.2.12 53',cfg)


def test_nested_shell_token_disallowed():
    for value in ('ping 127.0.0.1 $(id)', 'tcp 127.0.0.1 443 > out'):
        with pytest.raises(net.DiagnosticError,match='only one supported'):
            net.parse(value)
