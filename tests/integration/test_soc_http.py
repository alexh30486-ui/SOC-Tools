import http.client
import json
import pathlib
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'api'))
from spec_api.server import App,make_handler

SECRET='secret-soc-http-test-which-is-very-long'

class SOCHTTPTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory()
  cls.app=App(f'sqlite:///{cls.tmp.name}/soc.db',SECRET,api_per_minute=500)
  cls.app.store.migrate()
  cls.httpd=ThreadingHTTPServer(('127.0.0.1',0),make_handler(cls.app))
  cls.port=cls.httpd.server_address[1]
  threading.Thread(target=cls.httpd.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):
  cls.httpd.shutdown();cls.httpd.server_close();cls.app.store.conn.close();cls.tmp.cleanup()
 def request(self,method,path,token=None,payload=None):
  c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=5)
  b=json.dumps(payload).encode() if payload is not None else None
  headers={'Content-Type':'application/json'}
  if token: headers['Authorization']='Bearer '+token
  c.request(method,path,body=b,headers=headers)
  r=c.getresponse();raw=r.read();c.close()
  return r.status,(json.loads(raw) if raw else {})
 def signup(self,email):
  c,d=self.request('POST','/v1/auth/signup',payload={'email':email,'name':'Fixture','password':'correct-horse-battery'})
  self.assertEqual(c,201,d)
  return d['token']
 def test_public_demo_is_clear_and_real(self):
  status,result=self.request('GET','/v1/soc/demo')
  self.assertEqual(status,200)
  self.assertEqual(result['mode'],'synthetic_fixture')
  self.assertEqual(result['report']['event_count'],21)
  self.assertEqual(result['report']['high_confidence_count'],5)
 def test_unauthenticated_ingest_rejected(self):
  self.assertEqual(self.request('POST','/v1/soc/sample')[0],401)
  self.assertEqual(self.request('GET','/v1/soc/summary')[0],401)
 def test_sample_submission_summary_and_idempotency(self):
  token=self.signup('http-kyle@example.com')
  status,result=self.request('POST','/v1/soc/sample',token)
  self.assertEqual(status,200,result)
  self.assertEqual(result['report']['event_count'],21)
  status,summary=self.request('GET','/v1/soc/summary',token)
  self.assertEqual(status,200)
  self.assertEqual(summary['runs'],1)
  self.assertEqual(summary['high_confidence'],5)
  self.assertEqual(self.request('POST','/v1/soc/sample',token)[1]['id'],result['id'])
  self.assertEqual(self.request('GET','/v1/soc/runs',token)[1]['runs'][0]['id'],result['id'])
 def test_cross_workspace_isolation(self):
  a=self.signup('http-org-a@example.com');b=self.signup('http-org-b@example.com')
  self.request('POST','/v1/soc/sample',a)
  self.assertEqual(self.request('GET','/v1/soc/summary',a)[1]['runs'],1)
  self.assertEqual(self.request('GET','/v1/soc/summary',b)[1]['runs'],0)
 def test_review_http_auth_workspace_and_status(self):
  a=self.signup('http-review-v5@example.com')
  b=self.signup('http-review-other-v5@example.com')
  _,result=self.request('POST','/v1/soc/sample',a)
  fid=result['report']['alerts'][0]['id']
  payload={'run_id':result['id'],'finding_id':fid,'status':'investigating','note':'Validating on host'}
  self.assertEqual(self.request('POST','/v1/soc/triage',payload=payload)[0],401)
  self.assertEqual(self.request('POST','/v1/soc/triage',b,payload)[0],404)
  code,data=self.request('POST','/v1/soc/triage',a,payload)
  self.assertEqual(code,201,data)
  self.assertEqual(data['status'],'investigating')
  code,summary=self.request('GET','/v1/soc/summary',a)
  self.assertEqual(code,200,summary)
  self.assertEqual(summary['triage_counts']['investigating'],1)
  self.assertEqual(self.request('GET','/v1/soc/triage',b)[1]['history'],[])
  self.assertEqual(self.request('POST','/v1/soc/triage',a,{**payload,'status':'remove_all'})[0],422)
  self.assertEqual(self.request('GET','/v1/soc/triage',a)[1]['latest'][0]['note'],'Validating on host')
 def test_invalid_log_and_custom_csv(self):
  token=self.signup('http-csv@example.com')
  bad=self.request('POST','/v1/soc/ingest',token,{'filename':'x.exe','content':'a'})
  self.assertEqual(bad[0],422,bad)
  good=self.request('POST','/v1/soc/ingest',token,{'filename':'events.csv','content':'timestamp,event_id,host,level\n2026-11-22T10:00:00Z,4625,a,WARN\n'})
  self.assertEqual(good[0],200,good)
  self.assertEqual(good[1]['report']['event_count'],1)

if __name__=='__main__': unittest.main()
