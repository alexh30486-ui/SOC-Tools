"""Focused network terminal tests; only loopback sockets are contacted.

These are actual local TCP/UDP socket interactions, not a port scan and not
WebSocket or browser raw-socket tests.
"""
import http.client
import ipaddress
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from dataclasses import replace

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'api'))
os.environ.setdefault('SPEC_PBKDF2_ITER', '20000')
from spec_api import net_diagnostics as net
from spec_api import server

CONFIG = net.Config(enabled=True, allowed_targets=('127.0.0.1/32','::1/128','localhost'), allowed_ports=frozenset((53, 443, 5300, 8080)), max_duration=0.08)

@pytest.mark.parametrize('cmd,expected', [
 ('help',('help',None,None)), ('status',('status',None,None)),
 ('ping 127.0.0.1',('ping','127.0.0.1',None)),
 ('dns localhost',('dns','localhost',None)),
 ('nslookup localhost',('dns','localhost',None)),
 ('tcp 127.0.0.1 443',('tcp','127.0.0.1',443)),
 ('udp 127.0.0.1 5300',('udp','127.0.0.1',5300))
])
def test_allowed_syntax(cmd,expected):
    assert net.parse(cmd)==expected

@pytest.mark.parametrize('cmd', [
 'ping', 'tcp 127.0.0.1', 'udp 127.0.0.1 0',
 'udp 127.0.0.1 65536', 'ping localhost; whoami',
 'ping 127.0.0.1 && id','ping 127.0.0.1 | cat',
 'ping $(whoami)', 'wget https://example.net',
 'ping 127.0.0.1\nstatus', 'run_command cat /etc/passwd'
])
def test_blocked_syntax(cmd):
    with pytest.raises(net.DiagnosticError): net.parse(cmd)

@pytest.mark.parametrize('cmd', ['ping 8.8.8.8','udp 8.8.8.8 53','tcp 10.0.0.1 443'])
def test_outside_allowlist(cmd):
    with pytest.raises(net.DiagnosticError,match='allowlist'):
        net.run(cmd,CONFIG)

def test_disabled_by_default():
    with pytest.raises(net.DiagnosticError,match='disabled'):
        net.run('ping 127.0.0.1',replace(CONFIG, enabled=False))

def test_disallowed_port():
    with pytest.raises(net.DiagnosticError,match='port is not allowlisted'):
        net.run('udp 127.0.0.1 50000',CONFIG)

def test_status_and_help_no_probe():
    status=net.run('status',replace(CONFIG, enabled=False))
    help_=net.run('help',replace(CONFIG, enabled=False))
    assert 'disabled' in status['detail']
    assert 'No shell' in help_['detail']

def test_hostname_must_be_ip_pinned(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *args,**kwargs:[(socket.AF_INET,socket.SOCK_STREAM,0,'',('10.2.3.4',0))])
    with pytest.raises(net.DiagnosticError,match='outside the IP allowlist'):
        net.resolve_allowed('localhost', CONFIG)

def test_dns_pinned(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *args,**kwargs:[(socket.AF_INET,socket.SOCK_STREAM,0,'',('127.0.0.1',0))])
    result=net.run('dns localhost',CONFIG)
    assert result['status']=='resolved' and result['address']=='127.0.0.1'

def test_icmp_reply(monkeypatch):
    commands=[]
    def fake(cmd,**kw):
        commands.append(cmd)
        return subprocess.CompletedProcess(cmd,0,'','')
    monkeypatch.setattr(subprocess,'run',fake)
    r=net.run('ping 127.0.0.1',CONFIG)
    assert r['status']=='reply' and r['kind']=='ping'
    assert commands[0][-1]=='127.0.0.1' and isinstance(commands[0],list)

def test_icmp_no_reply_is_not_unreachable(monkeypatch):
    monkeypatch.setattr(subprocess,'run',lambda cmd,**kw:subprocess.CompletedProcess(cmd,1,'',''))
    r=net.run('ping 127.0.0.1',CONFIG)
    assert r['status']=='no_reply' and 'unknown' in r['detail']

def test_tcp_handshake_loopback():
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as srv:
        srv.bind(('127.0.0.1',0));srv.listen(1)
        port=srv.getsockname()[1]
        cfg=replace(CONFIG,allowed_ports=frozenset([port]))
        r=net.run(f'tcp 127.0.0.1 {port}',cfg)
        assert r['status']=='open' and r['mode']=='live_server'

def test_udp_echo_loopback():
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as srv:
        srv.bind(('127.0.0.1',0));srv.settimeout(3)
        port=srv.getsockname()[1]
        def echo():
            data,src=srv.recvfrom(256)
            assert data==b'SPECTACLE_SOC_DIAGNOSTIC_V1'
            srv.sendto(b'ack',src)
        t=threading.Thread(target=echo);t.start()
        r=net.run(f'udp 127.0.0.1 {port}',replace(CONFIG,allowed_ports=frozenset([port]),max_duration=1.0))
        t.join(timeout=3)
        assert r['status']=='reply' and '3 bytes' in r['detail']

def test_udp_timeout_inconclusive():
    with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as srv:
        srv.bind(('127.0.0.1',0))
        port=srv.getsockname()[1]
        r=net.run(f'udp 127.0.0.1 {port}',replace(CONFIG,allowed_ports=frozenset([port]),max_duration=0.05))
        assert r['status']=='inconclusive'
        assert 'cannot be inferred' in r['detail']

@pytest.fixture(scope='module')
def http_app():
    with tempfile.TemporaryDirectory() as tmp:
        app=server.App('sqlite:///'+tmp+'/net.db','diagnostic-test-secret-over-32-bytes',auth_per_minute=999,api_per_minute=999)
        app.store.migrate();app.net_config=replace(CONFIG,enabled=False)
        listener=ThreadingHTTPServer(('127.0.0.1',0),server.make_handler(app))
        thread=threading.Thread(target=listener.serve_forever,daemon=True);thread.start()
        host,port=listener.server_address
        def call(method,path,body=None,token=''):
            conn=http.client.HTTPConnection(host,port,timeout=5)
            h={'Content-Type':'application/json'}
            if token:h['Authorization']='Bearer '+token
            try:
                conn.request(method,path,body=json.dumps(body).encode() if body is not None else None,headers=h)
                resp=conn.getresponse();return resp.status,dict(resp.getheaders()),json.loads(resp.read())
            finally:conn.close()
        status,_,out=call('POST','/v1/auth/signup',{'email':'network-test@localhost.net','name':'Network QA','password':'correct-password-12'})
        assert status==201
        try:yield app,call,out['token']
        finally:
            listener.shutdown();listener.server_close();thread.join(timeout=4)

def test_route_requires_login(http_app):
    app,call,token=http_app
    code,_,_=call('GET','/v1/network/status')
    assert code==401

def test_route_status_offline(http_app):
    app,call,token=http_app
    code,_,out=call('GET','/v1/network/status',token=token)
    assert code==200 and out['enabled'] is False and out['websocket'] is False

def test_route_probe_disabled(http_app):
    app,call,token=http_app
    code,_,out=call('POST','/v1/network/execute',{'command':'udp 127.0.0.1 5300'},token)
    assert code==422 and 'disabled' in out['error']

def test_route_rejects_shell(http_app):
    app,call,token=http_app
    code,_,out=call('POST','/v1/network/execute',{'command':'ping localhost; touch /tmp/x'},token)
    assert code==422 and 'supported diagnostic' in out['error']

def test_route_logs_successful_probe(http_app):
    app,call,token=http_app
    app.net_config=replace(CONFIG,enabled=True)
    code,_,out=call('POST','/v1/network/execute',{'command':'status'},token)
    assert code==200 and out['result']['kind']=='status'
    rows=app.store.all("SELECT action,target FROM audit_log WHERE action='network.probe'")
    assert any('status:' in r['target'] for r in rows)

def test_route_invalid_json(http_app):
    app,call,token=http_app
    code,_,out=call('POST','/v1/network/execute',{'command':22},token)
    assert code==422 and 'string' in out['error']
