import json
import os
import pathlib
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'api'))
from spec_api.soc_pipeline import analyze, parse_logs, sample_report, job_id
from spec_api.soc_backend import SOCBackend, BackendUnavailable
from spec_api.db import Store
from spec_api.server import App, HTTPError

os.environ.setdefault('SPEC_PBKDF2_ITER','20000')
SECRET='soc-test-secret-this-is-at-least-32-characters'

class DetectorTests(unittest.TestCase):
 def test_kyle_fixture_expected_correlations(self):
  report=sample_report()
  self.assertEqual(report['event_count'],21)
  self.assertEqual(report['parse_errors']['count'],0)
  self.assertEqual(report['high_confidence_count'],5)
  self.assertEqual({x['rule'] for x in report['alerts']}, {
    'AUTH_SPRAY','AUTH_SPRAY_SUCCESS','PS_MULTI_SIGNAL','EGRESS_SPIKE','BACKEND_5XX_BURST'})
  self.assertTrue(all(0<=a['confidence_score']<=100 for a in report['alerts']))
  self.assertTrue(all(a['confidence_type']=='heuristic_not_calibrated_probability' for a in report['alerts']))
  self.assertEqual([a for a in report['alerts'] if a['category']=='Operational'][0]['technique'], None)

 def test_determinism_and_idempotency(self):
  content=(ROOT/'samples/kyle_security_events.jsonl').read_text()
  self.assertEqual(analyze(content,'logs.jsonl'),analyze(content,'logs.jsonl'))
  self.assertEqual(job_id('org-a',content),job_id('org-a',content))
  self.assertNotEqual(job_id('org-a',content),job_id('org-b',content))

 def test_benign_does_not_trigger(self):
  data='\n'.join(json.dumps({'timestamp':'2026-11-22T10:00:00Z','event_id':4624,'host':'host1','user':'staff'}) for _ in range(8))
  self.assertEqual(analyze(data,'benign.jsonl')['alerts'],[])

 def test_invalid_and_malformed_are_logged(self):
  data='not a log\n'+json.dumps({'timestamp':'2026-11-22T10:00:00Z','event_id':4624,'host':'a'})+'\n{bad json\n'
  r=analyze(data,'errors.jsonl')
  self.assertEqual(r['parse_errors']['count'],2)
  self.assertEqual(r['event_count'],1)

 def test_log_injection_and_secret_redaction(self):
  data=json.dumps({'timestamp':'2026-11-22T10:00:00Z','event_id':4624,'host':'a','message':'hello\nFAKE ALERT token=highlysecretpassword123 password=superSecret123 bearer eyJmb28.alongtoken'})
  report=analyze(data,'logs.jsonl')
  msg=report['events'][0]['message']
  self.assertNotIn('\n',msg)
  self.assertNotIn('highlysecretpassword123',msg)
  self.assertNotIn('superSecret123',msg)
  self.assertNotIn('alongtoken',msg)

 def test_size_and_extension_guards(self):
  with self.assertRaises(ValueError): analyze('x'*(600_001),'fail.log')
  with self.assertRaises(ValueError): analyze('{}','bad.exe')
  with self.assertRaises(ValueError): analyze('not a csv','bad.csv')

 def test_csv_and_text_formats(self):
  csvdata='timestamp,event_id,host,level,message\n2026-11-22T10:00:00Z,4625,DC1,WARN,Login failed\n'
  self.assertEqual(analyze(csvdata,'t.csv')['event_count'],1)
  text='2026-11-22T10:00:00Z ERROR upstream unavailable\n'
  self.assertEqual(analyze(text,'t.log')['event_count'],1)

class LocalPersistenceTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.app=App(f'sqlite:///{self.tmp.name}/test.db',SECRET)
  self.app.store.migrate()
 def tearDown(self): self.tmp.cleanup()
 def signup(self,email):
  _,p=self.app.signup({'email':email,'password':'correct-horse-battery','name':'Sample'})
  user=self.app.user_from(p['token'])
  return p['token'], user, self.app.default_org(user['id'])
 def test_tenant_isolation(self):
  alice, a, oa=self.signup('soc-alice@example.com')
  bob,b,ob=self.signup('soc-bob@example.com')
  self.assertNotEqual(oa,ob)
  source=(ROOT/'samples/kyle_security_events.jsonl').read_text()
  self.app.soc.submit(oa,a['id'],'kyle.jsonl',source)
  s1=self.app.soc.summary(oa);s2=self.app.soc.summary(ob)
  self.assertEqual(s1['runs'],1)
  self.assertEqual(s2['runs'],0)
  self.assertEqual(s1['high_confidence'],5)
  self.assertEqual(s2['alerts'],[])
  self.assertEqual(self.app.soc_principal('Bearer '+alice)['org_id'],oa)
  with self.assertRaises(HTTPError): self.app.soc_principal('Bearer forged')
 def test_idempotent_upsert(self):
  tok,user,org=self.signup('soc-repeat@example.com')
  source=(ROOT/'samples/kyle_security_events.jsonl').read_text()
  a=self.app.soc.submit(org,user['id'],'kyle.jsonl',source)
  b=self.app.soc.submit(org,user['id'],'kyle.jsonl',source)
  self.assertEqual(a['id'],b['id'])
  self.assertEqual(self.app.soc.summary(org)['runs'],1)

class RedisContractTests(unittest.TestCase):
 def test_queue_and_worker_are_idempotent_with_fake_stream(self):
  class Stream:
   def __init__(self): self.jobs=[]
   def push(self,record,content):
    self.jobs.append({'id':record['id'],'org_id':record['org_id'],'actor_id':record['actor_id'],'filename':record['filename'],'content':content})
  tmp=tempfile.TemporaryDirectory()
  try:
   st=Store(f'sqlite:///{tmp.name}/q.db'); st.migrate()
   fake=Stream()
   soc=SOCBackend(st,mode='local',queue='redis',stream=fake)
   soc.migrate()
   sample=(ROOT/'samples/kyle_security_events.jsonl').read_text()
   result=soc.submit('workspace-1','analyst-1','kyle.jsonl',sample)
   self.assertEqual(result['status'],'queued')
   self.assertEqual(soc.summary('workspace-1')['queued'],1)
   soc.process_message(fake.jobs[0]);soc.process_message(fake.jobs[0])
   self.assertEqual(soc.summary('workspace-1')['runs'],1)
   self.assertEqual(soc.summary('workspace-1')['completed'],1)
  finally:tmp.cleanup()

if __name__=='__main__': unittest.main()
