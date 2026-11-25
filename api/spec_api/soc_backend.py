"""SOC persistence, tenant-bound auth, and optional Redis Streams integration.

Supabase storage is server-only and fails closed when credentials are absent.
Local SQLite mode is an explicit development/test mode, not fake cloud persistence.
"""
import json
import re
import uuid
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from .soc_pipeline import analyze, job_id, sample_path, sample_report, redact

SOC_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS soc_ingestions (
 id TEXT PRIMARY KEY,
 org_id TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 filename TEXT NOT NULL,
 content_sha256 TEXT NOT NULL,
 status TEXT NOT NULL,
 report TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_soc_ingestions_org_date ON soc_ingestions(org_id, updated_at);
CREATE TABLE IF NOT EXISTS soc_finding_actions (
 id TEXT PRIMARY KEY,
 org_id TEXT NOT NULL,
 run_id TEXT NOT NULL,
 finding_id TEXT NOT NULL,
 status TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 actor_id TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_soc_finding_actions_org ON soc_finding_actions(org_id, created_at DESC);
'''


class BackendUnavailable(Exception):
    pass


def utcnow():
    return datetime.now(timezone.utc).isoformat()


class SupabaseAdapter:
    def __init__(self, url, publishable, secret):
        if not url or not publishable or not secret:
            raise BackendUnavailable('Supabase requires SOC_SUPABASE_URL, SOC_SUPABASE_PUBLISHABLE_KEY and SOC_SUPABASE_SECRET_KEY')
        self.url = url.rstrip('/')
        self.publishable = publishable
        self.secret = secret

    def request(self, path, method='GET', data=None, *, authenticated_token=None, admin=False, prefer=None):
        key = self.secret if admin else self.publishable
        headers = {'apikey': key, 'Accept': 'application/json', 'User-Agent': 'SpectacleSOC-Backend/4'}
        if authenticated_token:
            headers['Authorization'] = 'Bearer ' + authenticated_token
        elif admin and self.secret.startswith('eyJ'):
            headers['Authorization'] = 'Bearer ' + self.secret  # legacy service_role JWT only
        if data is not None:
            headers['Content-Type'] = 'application/json'
        if prefer:
            headers['Prefer'] = prefer
        payload = json.dumps(data, separators=(',', ':')).encode() if data is not None else None
        req = urllib.request.Request(self.url + path, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                raw = r.read(1_000_000)
                return json.loads(raw) if raw else []
        except urllib.error.HTTPError as exc:
            # Do not copy error bodies containing tokens or PII into API responses.
            raise BackendUnavailable(f'Supabase returned HTTP {exc.code} for {path.split("?")[0]}') from exc
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise BackendUnavailable('Supabase network or response error') from exc

    def verify_user_workspace(self, token):
        obj = self.request('/auth/v1/user', authenticated_token=token)
        uid = obj.get('id') if isinstance(obj, dict) else None
        if not uid:
            raise PermissionError('Supabase user token invalid or expired')
        qs = urllib.parse.urlencode({'select':'workspace_id,role', 'user_id':'eq.' + uid, 'limit':1})
        membership = self.request('/rest/v1/workspace_members?' + qs, authenticated_token=token)
        if not isinstance(membership, list) or not membership:
            raise PermissionError('No accessible Supabase workspace')
        role=membership[0].get('role')
        if role not in ('owner','contributor','viewer'):
            raise PermissionError('A recognized workspace role is required')
        return {'id': uid, 'org_id': membership[0]['workspace_id'], 'auth':'supabase', 'role':role}

    def save(self, record):
        data = {'id':record['id'], 'workspace_id':record['org_id'], 'actor_id':record['actor_id'],
                'filename':record['filename'], 'content_sha256':record['content_sha256'],
                'status':record['status'], 'report':record['report'], 'updated_at':record['updated_at']}
        # Upsert is idempotent across worker redeliveries. created_at DB default remains first-write.
        self.request('/rest/v1/soc_ingestions?on_conflict=id', method='POST', data=data, admin=True,
                     prefer='resolution=merge-duplicates,return=minimal')

    def run(self, workspace_id, run_id):
        qs = urllib.parse.urlencode({'select':'id,filename,status,content_sha256,report,created_at,updated_at',
            'workspace_id':'eq.'+str(workspace_id), 'id':'eq.'+str(run_id), 'limit':1})
        rows=self.request('/rest/v1/soc_ingestions?' + qs, admin=True)
        return {**rows[0], 'org_id':str(workspace_id)} if isinstance(rows,list) and rows else None

    def actions(self, workspace_id, limit=300):
        qs=urllib.parse.urlencode({'select':'id,run_id,finding_id,status,note,actor_id,created_at',
            'workspace_id':'eq.'+str(workspace_id),'order':'created_at.desc','limit':min(limit,300)})
        data=self.request('/rest/v1/soc_finding_actions?' + qs, admin=True)
        return data if isinstance(data,list) else []

    def add_action(self, action):
        data={**action, 'workspace_id':action['org_id']}
        del data['org_id']
        self.request('/rest/v1/soc_finding_actions', method='POST', data=data, admin=True,
                     prefer='return=minimal')

    def rows(self, workspace_id, limit=20):
        qs = urllib.parse.urlencode({'select':'id,filename,status,content_sha256,report,created_at,updated_at',
            'workspace_id':'eq.'+str(workspace_id),'order':'updated_at.desc','limit':min(max(limit,1),100)})
        rows = self.request('/rest/v1/soc_ingestions?' + qs, admin=True)
        return [{**x,'org_id':str(workspace_id)} for x in (rows if isinstance(rows,list) else [])]


class RedisStream:
    STREAM='soc:ingestions:v1'
    GROUP='soc-analysts'
    def __init__(self, url):
        try:
            import redis
        except ImportError as exc:
            raise BackendUnavailable('Redis queue needs redis-py: pip install redis>=5,<7') from exc
        if not url:
            raise BackendUnavailable('SOC_REDIS_URL must be configured in redis queue mode')
        self.client=redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=3, socket_timeout=5)
        try:
            self.client.xgroup_create(self.STREAM, self.GROUP, id='0-0', mkstream=True)
        except redis.exceptions.ResponseError as exc:
            if 'BUSYGROUP' not in str(exc): raise

    def push(self, record, content):
        # Sensitive log data transits Redis; require private/TLS Redis for real workloads.
        return self.client.xadd(self.STREAM, {'id':record['id'], 'org_id':record['org_id'],
            'actor_id':record['actor_id'], 'filename':record['filename'], 'content':content},
            maxlen=1000, approximate=True)

    def pull(self, consumer, block_ms=1000):
        # First reclaim messages that were not acknowledged after a worker crash.
        result = self.client.xautoclaim(self.STREAM, self.GROUP, consumer, min_idle_time=60000,
                                        start_id='0-0', count=5)
        claimed = result[1] if result else []
        if claimed: return claimed
        batches=self.client.xreadgroup(self.GROUP, consumer, {self.STREAM:'>'}, count=5, block=block_ms)
        return batches[0][1] if batches else []

    def ack(self, stream_id):
        self.client.xack(self.STREAM, self.GROUP, stream_id)
        # Single consumer group owns these raw records; delete to minimize sensitive retention.
        self.client.xdel(self.STREAM, stream_id)


class SOCBackend:
    def __init__(self, store, mode=None, queue=None, adapter=None, stream=None):
        self.store = store
        self.mode = (mode or os.environ.get('SOC_STORAGE', 'local')).lower()
        self.queue_mode = (queue or os.environ.get('SOC_QUEUE', 'inline')).lower()
        if self.mode not in ('local', 'supabase'):
            raise BackendUnavailable('SOC_STORAGE must be local or supabase')
        if self.queue_mode not in ('inline', 'redis'):
            raise BackendUnavailable('SOC_QUEUE must be inline or redis')
        self.adapter = adapter
        if self.mode == 'supabase' and self.adapter is None:
            self.adapter = SupabaseAdapter(os.environ.get('SOC_SUPABASE_URL',''),
                os.environ.get('SOC_SUPABASE_PUBLISHABLE_KEY',''), os.environ.get('SOC_SUPABASE_SECRET_KEY',''))
        self.stream = stream
        if self.queue_mode == 'redis' and self.stream is None:
            self.stream = RedisStream(os.environ.get('SOC_REDIS_URL',''))

    def migrate(self):
        if self.mode == 'local':
            for sql in SOC_TABLE_SQL.split(';'):
                if sql.strip(): self.store.write(sql)

    def run(self, org_id, run_id):
        if self.mode == 'supabase':
            return self.adapter.run(org_id, run_id)
        row=self.store.one("""SELECT id,org_id,actor_id,filename,status,content_sha256,report,created_at,updated_at
                        FROM soc_ingestions WHERE org_id=? AND id=?""",(org_id,run_id))
        return {**row,'report':json.loads(row['report'])} if row else None

    def triage_actions(self, org_id):
        if self.mode == 'supabase':
            actions=self.adapter.actions(org_id)
        else:
            actions=self.store.all("""SELECT id,run_id,finding_id,status,note,actor_id,created_at
                FROM soc_finding_actions WHERE org_id=? ORDER BY created_at DESC LIMIT 300""",(org_id,))
        latest={}
        for action in actions:
            key=(action['run_id'],action['finding_id'])
            if key not in latest:
                latest[key]=action
        return {'latest':list(latest.values()),'history':actions}

    def triage(self, org_id, actor_id, run_id, finding_id, status, note=''):
        statuses=('needs_review','investigating','confirmed','false_positive','escalated')
        if status not in statuses:
            raise ValueError('status must be needs_review, investigating, confirmed, false_positive or escalated')
        if not isinstance(run_id,str) or not re.fullmatch(r'[a-f0-9-]{36}',run_id,re.I):
            raise ValueError('invalid run ID')
        if not isinstance(finding_id,str) or not re.fullmatch(r'DET-[A-F0-9]{12}',finding_id):
            raise ValueError('invalid finding ID')
        if not isinstance(note,str) or len(note)>1000:
            raise ValueError('note must be at most 1000 characters')
        run=self.run(org_id,run_id)
        if not run or run['status']!='completed' or finding_id not in {x.get('id') for x in run['report'].get('alerts',[])}:
            raise LookupError('finding not present in this workspace')
        action={'id':str(uuid.uuid4()),'org_id':org_id,'run_id':run_id,'finding_id':finding_id,
                'status':status,'note':redact(note)[:1000], 'actor_id':actor_id,'created_at':utcnow()}
        if self.mode=='supabase':
            self.adapter.add_action(action)
        else:
            self.store.write("""INSERT INTO soc_finding_actions
                (id,org_id,run_id,finding_id,status,note,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?)""",
                (action['id'],org_id,run_id,finding_id,status,action['note'],actor_id,action['created_at']))
        return {k:v for k,v in action.items() if k!='org_id'}

    def record(self, job, org_id, actor_id, filename, content, status, report=None):
        t=utcnow()
        return {'id':job, 'org_id':org_id, 'actor_id':actor_id, 'filename':filename,
            'content_sha256':__import__('hashlib').sha256(content.encode()).hexdigest(),
            'status':status, 'report':report or {}, 'created_at':t, 'updated_at':t}

    def save(self, record):
        if self.mode == 'supabase':
            self.adapter.save(record)
        else:
            self.store.write('''INSERT INTO soc_ingestions (id,org_id,actor_id,filename,content_sha256,status,report,created_at,updated_at)
               VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
               status=excluded.status, report=excluded.report, updated_at=excluded.updated_at''',
               (record['id'],record['org_id'],record['actor_id'],record['filename'],record['content_sha256'],
                record['status'],json.dumps(record['report']),record['created_at'],record['updated_at']))

    def rows(self, org_id, limit=20):
        if self.mode == 'supabase':
            return self.adapter.rows(org_id,limit=limit)
        data=self.store.all('''SELECT id,org_id,filename,status,content_sha256,report,created_at,updated_at
                    FROM soc_ingestions WHERE org_id = ? ORDER BY updated_at DESC LIMIT ?''',(org_id,limit))
        return [{**r,'report':json.loads(r['report'])} for r in data]

    def submit(self, org_id, actor_id, filename, content):
        # Validate everything before enqueuing, even in worker mode.
        from .soc_pipeline import parse_logs
        parse_logs(content,filename)
        jid=job_id(org_id,content)
        existing=self.run(org_id,jid)
        if existing and existing['status'] in ('queued','completed'):
            return {'id':jid,'status':existing['status'],'workspace_id':org_id,
                    'report':existing['report'] if existing['status']=='completed' else None,
                    'deduplicated':True}
        record=self.record(jid, org_id, actor_id, filename, content, 'queued' if self.queue_mode=='redis' else 'completed')
        if self.queue_mode == 'redis':
            self.save(record)
            try: self.stream.push(record, content)
            except Exception as exc:
                record['status']='failed';record['report']={'error':'Redis enqueue failed; nothing was analyzed'}
                self.save(record)
                raise BackendUnavailable('Redis enqueue failed') from exc
            return {'id':jid, 'status':'queued', 'workspace_id':org_id}
        report=analyze(content,filename)
        record['report']=report
        self.save(record)
        return {'id':jid, 'status':'completed', 'workspace_id':org_id, 'report':report}

    def process_message(self, fields):
        # Worker never trusts client-supplied findings; it computes again.
        data = {k:fields[k] for k in ('id','org_id','actor_id','filename','content')}
        record=self.record(data['id'], data['org_id'], data['actor_id'], data['filename'], data['content'], 'completed')
        record['report']=analyze(data['content'],data['filename'])
        self.save(record)
        return record

    def summary(self, org_id):
        rows=self.rows(org_id, limit=100)
        totals={'runs':len(rows),'completed':0,'queued':0,'events':0,'high_confidence':0,'parser_errors':0,'alerts':[]}
        for r in rows:
            totals[r['status']]=totals.get(r['status'],0)+1
            if r['status']!='completed':continue
            v=r.get('report') or {}
            totals['events']+=v.get('event_count',0)
            totals['high_confidence']+=v.get('high_confidence_count',0)
            totals['parser_errors']+=v.get('parse_errors',{}).get('count',0)
            for f in v.get('alerts',[]):
                totals['alerts'].append({**f,'run_id':r['id'],'source_file':r['filename']})
        totals['alerts'].sort(key=lambda x:-x['confidence_score'])
        totals['alerts']=totals['alerts'][:50]
        actions=self.triage_actions(org_id)['latest']
        totals['triage']=actions
        totals['triage_counts']={k:sum(a['status']==k for a in actions) for k in ('needs_review','investigating','confirmed','false_positive','escalated')}
        return totals

    def demo(self):
        return sample_report()
