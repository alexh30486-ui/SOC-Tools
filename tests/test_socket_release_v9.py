"""90 distinct HTTP-over-TCP release socket checks for Spectacle SOC.

These are real local TCP socket requests against ThreadingHTTPServer, not WebSocket
coverage or GPU/model inference tests. Designed to avoid signup-rate collisions.
"""
import http.client
import json
import os
import socket
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'api'))
os.environ.setdefault('SPEC_PBKDF2_ITER', '20000')
from spec_api import server


@pytest.fixture(scope='module')
def running():
    with tempfile.TemporaryDirectory() as tmp:
        app = server.App('sqlite:///' + tmp + '/release.db', 'release-socket-test-key-longer-than-32-bytes',
                         cors_origins=['http://approved.local', 'https://trusted.local'],
                         auth_per_minute=10000, api_per_minute=10000, static_dir=None)
        app.store.migrate()
        httpd = ThreadingHTTPServer(('127.0.0.1', 0), server.make_handler(app))
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        host,port=httpd.server_address

        def call(method, path, raw=None, headers=None):
            conn=http.client.HTTPConnection(host, port, timeout=12)
            h={'Content-Type':'application/json'}
            h.update(headers or {})
            try:
                conn.request(method,path,body=raw,headers=h)
                resp=conn.getresponse()
                payload=resp.read()
                try: parsed=json.loads(payload) if payload else {}
                except json.JSONDecodeError: parsed=payload
                return resp.status, dict(resp.getheaders()), parsed
            finally:
                conn.close()

        try:
            code,headers,out=call('POST','/v1/auth/signup',json.dumps({'email':'socket-owner@example.com',
              'password':'correct-horse-battery','name':'Socket QA'}).encode())
            assert code==201 and out['token'],(code,out)
            yield {'call':call,'token':out['token'],'port':port,'host':host}
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=3)


# 20 distinct endpoint-and-route-shape checks.
PUBLIC_CASES=[
 ('GET','/v1/health',200),('GET','/v1/health?probe=1',200),
 ('GET','/v1/metrics',200),('GET','/v1/metrics?format=json',200),
 ('GET','/v1/soc/status',200),('GET','/v1/soc/status?reload=1',200),
 ('GET','/v1/soc/demo',200),('GET','/v1/soc/demo?source=fixture',200),
 ('GET','/v1/no-such-route',404),('GET','/v1/unknown',404),
 ('GET','/v1/health/extra',404),('GET','/v1/soc/status/extra',404),
 ('GET','/v1/soc/demo/extra',404),('GET','/v1/projects/nothex',404),
 ('GET','/v1/projects/1',404),('GET','/v1/me/extra',404),
 ('GET','/v1/soc/runs/extra',404),('GET','/v1/unknown?foo=bar',404),
 ('GET','/v1/..%2fhealth',404),('GET','/v1/HEALTH',404),
]

@pytest.mark.parametrize('method,path,expected',PUBLIC_CASES,ids=[f'public-{i+1:02d}' for i in range(20)])
def test_socket_public_route_matrix(running,method,path,expected):
    code,headers,result=running['call'](method,path)
    assert code==expected,(path,code,result)
    if path=='/v1/health' and '?' not in path:
        with socket.create_connection((running['host'],running['port']),timeout=3) as tcp:
            assert tcp.getpeername()[1]==running['port']
    if code==200 and path.startswith('/v1/soc/status'):
        assert result['live_siem'] is False


# 24 unauthenticated/invalid-token access checks (eight sensitive routes × three credentials).
PRIVATE_ROUTES=['/v1/me','/v1/projects','/v1/team','/v1/projects/'+'0'*32,
                '/v1/soc/summary','/v1/soc/runs','/v1/soc/triage','/v1/projects/'+'f'*32]
AUTH_CASES=[(route,mode) for route in PRIVATE_ROUTES for mode in ['none','bad-bearer','wrong-scheme']]
@pytest.mark.parametrize('path,mode',AUTH_CASES,ids=[f'auth-{i+1:02d}' for i in range(24)])
def test_socket_authentication_denials(running,path,mode):
    auth={'none':'','bad-bearer':'Bearer definitely-bad','wrong-scheme':'Basic abc'}[mode]
    hdr={'Authorization':auth} if auth else {}
    code,_,obj=running['call']('GET',path,headers=hdr)
    assert code==401,(path,mode,code,obj)


# 18 content-parser checks: six routes × invalid bytes / JSON array / JSON null.
PAYLOAD_ROUTES=['/v1/auth/signup','/v1/auth/login','/v1/projects',
                '/v1/soc/ingest','/v1/soc/triage','/v1/events']
PAYLOAD_CASES=[(route,fmt) for route in PAYLOAD_ROUTES for fmt in ['broken','array','null']]
@pytest.mark.parametrize('path,fmt',PAYLOAD_CASES,ids=[f'payload-{i+1:02d}' for i in range(18)])
def test_socket_json_parser_rejections(running,path,fmt):
    raw={'broken':b'{ invalid','array':b'[1,2,3]','null':b'null'}[fmt]
    headers={'Authorization':'Bearer '+running['token']}
    code,_,obj=running['call']('POST',path,raw=raw,headers=headers)
    assert code==400,(path,fmt,code,obj)


# 10 CORS cases: trusted, untrusted, and null origins over GET and OPTIONS.
ORIGINS=['http://approved.local','https://trusted.local','https://attacker.local',
         'null','http://approved.local.attacker.example']
CORS_CASES=[(origin,method) for origin in ORIGINS for method in ['GET','OPTIONS']]
@pytest.mark.parametrize('origin,method',CORS_CASES,ids=[f'cors-{i+1:02d}' for i in range(10)])
def test_socket_cors_origin_boundaries(running,origin,method):
    code,headers,obj=running['call'](method,'/v1/health',headers={'Origin':origin})
    assert code==(200 if method=='GET' else 204)
    allowed=origin in ('http://approved.local','https://trusted.local')
    assert headers.get('Access-Control-Allow-Origin')==(origin if allowed else None)


# 10 response-hardening checks across success, error, protected, query and versioned paths.
HARDEN_PATHS=['/v1/health','/v1/metrics','/v1/soc/status','/v1/soc/demo',
              '/v1/unknown','/v1/health?probe=security','/v1/me','/v1/projects',
              '/v1/soc/summary','/v1/soc/triage']
@pytest.mark.parametrize('path',HARDEN_PATHS,ids=[f'headers-{i+1:02d}' for i in range(10)])
def test_socket_security_headers(running,path):
    code,headers,obj=running['call']('GET',path,headers={'X-Request-ID':'release-security-90'})
    assert headers['Cache-Control']=='no-store'
    assert headers['X-Content-Type-Options']=='nosniff'
    assert headers['X-Request-ID']=='release-security-90'
    assert 'application/json' in headers['Content-Type']


# 8 complete real-socket workflow checks with a valid owner in a fresh isolated DB.
INTEGRATION=['login','me','project-list','project-create','project-detail',
             'soc-status','soc-sample','soc-runs']
@pytest.mark.parametrize('scenario',INTEGRATION,ids=[f'workflow-{i+1:02d}' for i in range(8)])
def test_socket_authenticated_workflows(running,scenario):
    call=running['call']
    h={'Authorization':'Bearer '+running['token']}
    if scenario=='login':
        code,_,obj=call('POST','/v1/auth/login',json.dumps({'email':'socket-owner@example.com','password':'correct-horse-battery'}).encode())
        assert code==200 and obj['token']
    elif scenario=='me':
        code,_,obj=call('GET','/v1/me',headers=h)
        assert code==200 and obj['orgs'][0]['role']=='owner'
    elif scenario=='project-list':
        code,_,obj=call('GET','/v1/projects?kind=soc-case',headers=h)
        assert code==200 and obj['kind']=='soc-case'
    elif scenario=='project-create':
        code,_,obj=call('POST','/v1/projects',json.dumps({'name':'SOC Verification','kind':'soc-case'}).encode(),h)
        assert code==201 and obj['kind']=='soc-case'
    elif scenario=='project-detail':
        code,_,obj=call('POST','/v1/projects',json.dumps({'name':'Readback','kind':'soc-case'}).encode(),h)
        assert code==201
        read_code,_,doc=call('GET','/v1/projects/'+obj['id'],headers=h)
        assert read_code==200 and doc['id']==obj['id']
    elif scenario=='soc-status':
        code,_,obj=call('GET','/v1/soc/status')
        assert code==200 and obj['scoring']=='deterministic_heuristic_not_calibrated_probability'
    elif scenario=='soc-sample':
        code,_,obj=call('POST','/v1/soc/sample',b'{}',h)
        assert code==200 and isinstance(obj,dict),obj
    elif scenario=='soc-runs':
        code,_,obj=call('GET','/v1/soc/runs',headers=h)
        assert code==200 and isinstance(obj['runs'],list)


def test_test_plan_exactly_ninety():
    # This plan assertion is independent of the 90 network checks themselves.
    assert sum(map(len,(PUBLIC_CASES,AUTH_CASES,PAYLOAD_CASES,CORS_CASES,HARDEN_PATHS,INTEGRATION)))==90
