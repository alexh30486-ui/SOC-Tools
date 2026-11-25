"""Focused v5 tests: review lifecycle, tenant isolation, input validation and queue idempotency."""
import json
import os
import pathlib
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'api'))
os.environ.setdefault('SPEC_PBKDF2_ITER','20000')
from spec_api.server import App
from spec_api.soc_backend import SOCBackend
from spec_api.db import Store

SECRET='soc-v5-triage-tests-secret-string-minimum-length'

class TriageLifecycleTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.app=App('sqlite:///'+self.tmp.name+'/soc.db',SECRET)
  self.app.store.migrate()
 def tearDown(self):
  self.app.store.conn.close();self.tmp.cleanup()
 def account(self,email):
  _,r=self.app.signup({'email':email,'password':'correct-horse-battery','name':'Reviewer'})
  user=self.app.user_from(r['token'])
  return user,self.app.default_org(user['id'])
 def sample(self,user,org):
  content=(ROOT/'samples/kyle_security_events.jsonl').read_text()
  return self.app.soc.submit(org,user['id'],'kyle.jsonl',content)
 def test_persists_separate_immutable_review_actions(self):
  u,o=self.account('v5-review@example.com')
  r=self.sample(u,o)
  f=r['report']['alerts'][0]
  first=self.app.soc.triage(o,u['id'],r['id'],f['id'],'investigating','Check network controls')
  second=self.app.soc.triage(o,u['id'],r['id'],f['id'],'false_positive','Legitimate approved job')
  self.assertNotEqual(first['id'],second['id'])
  review=self.app.soc.triage_actions(o)
  self.assertEqual(len(review['history']),2)
  self.assertEqual(review['latest'][0]['status'],'false_positive')
  self.assertEqual(self.app.soc.summary(o)['triage_counts']['false_positive'],1)
  again=self.sample(u,o)
  self.assertTrue(again['deduplicated'])
  self.assertEqual(len(self.app.soc.triage_actions(o)['history']),2)
 def test_cross_org_and_unknown_finding_rejected(self):
  u,o=self.account('v5-a@example.com')
  v,p=self.account('v5-b@example.com')
  r=self.sample(u,o)
  fid=r['report']['alerts'][0]['id']
  with self.assertRaises(LookupError): self.app.soc.triage(p,v['id'],r['id'],fid,'confirmed','')
  with self.assertRaises(LookupError): self.app.soc.triage(o,u['id'],r['id'],'DET-FFFFFFFFFFFF','confirmed','')
  self.assertEqual(self.app.soc.triage_actions(p)['latest'],[])
 def test_rejects_invalid_status_or_note_and_redacts_secrets(self):
  u,o=self.account('v5-validation@example.com')
  r=self.sample(u,o);fid=r['report']['alerts'][0]['id']
  for status in ('reset_everything','CONFIRMED',None):
   with self.assertRaises(ValueError):self.app.soc.triage(o,u['id'],r['id'],fid,status,'note')
  with self.assertRaises(ValueError):self.app.soc.triage(o,u['id'],r['id'],fid,'confirmed','x'*1001)
  result=self.app.soc.triage(o,u['id'],r['id'],fid,'investigating','Password=abc1234\nBearer abcdefghijk12345')
  self.assertNotIn('abc1234',result['note'])
  self.assertNotIn('abcdefghijk12345',result['note'])
  self.assertNotIn('\n',result['note'])
 def test_no_duplicate_redis_queue_for_existing_queued_or_complete_run(self):
  class FakeStream:
   def __init__(self):self.jobs=[]
   def push(self,record,content):self.jobs.append({k:record[k] for k in ('id','org_id','actor_id','filename')}|{'content':content})
  st=Store('sqlite:///'+self.tmp.name+'/queue.db');st.migrate()
  stream=FakeStream();soc=SOCBackend(st,mode='local',queue='redis',stream=stream);soc.migrate()
  sample=(ROOT/'samples/kyle_security_events.jsonl').read_text()
  a=soc.submit('test-org','test-user','data.jsonl',sample)
  b=soc.submit('test-org','test-user','data.jsonl',sample)
  self.assertEqual(len(stream.jobs),1)
  self.assertEqual(b['status'],'queued')
  self.assertTrue(b['deduplicated'])
  soc.process_message(stream.jobs[0])
  c=soc.submit('test-org','test-user','data.jsonl',sample)
  self.assertEqual(c['status'],'completed')
  self.assertEqual(len(stream.jobs),1)
  st.conn.close()

if __name__=='__main__':unittest.main()
