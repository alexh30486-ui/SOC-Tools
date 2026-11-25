"""Deterministic SOC log analysis. No external AI, no uncalibrated probability claims.

Input bounds and normalization are shared by the inline worker and Redis consumer.
All source IPs in demo fixtures belong to RFC 5737 documentation ranges.
"""
import csv
import hashlib
import io
import json
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

MAX_CONTENT = 600_000  # characters; HTTP enforces a 1 MB request cap
MAX_EVENTS = 1200
MAX_EVENT_CHARS = 1200
MAX_FINDINGS = 50

SECRET_PATTERNS = [
    re.compile(r'(?i)\b(bearer\s+)[a-z0-9._~+/=-]{10,}'),
    re.compile(r'(?i)\b(password|passwd|api[_-]?key|secret|token)\s*[:=]\s*[^\s,;]{4,}'),
]


def redact(value):
    text = re.sub(r'[\r\n\x00-\x1f]+', ' ', str(value))
    text = SECRET_PATTERNS[0].sub(r'\1[REDACTED]', text)
    text = SECRET_PATTERNS[1].sub(r'\1=[REDACTED]', text)
    return text[:MAX_EVENT_CHARS]


def date_seconds(value):
    if isinstance(value, (int, float)):
        return float(value) / 1000 if value > 10**11 else float(value)
    try:
        d = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.timestamp()
    except (ValueError, TypeError, OverflowError):
        return None


def normalize(raw, index):
    if not isinstance(raw, dict):
        raise ValueError('record is not a JSON object')
    src = raw.get('winlog') if isinstance(raw.get('winlog'), dict) else {}
    data = raw.get('data') if isinstance(raw.get('data'), dict) else {}
    event_id = raw.get('event_id', raw.get('EventID', src.get('event_id', raw.get('id', ''))))
    stamp = raw.get('timestamp') or raw.get('@timestamp') or raw.get('time') or raw.get('date') or ''
    ts = date_seconds(stamp)
    if ts is None:
        raise ValueError('timestamp missing or invalid')
    def get(*keys):
        for k in keys:
            if raw.get(k) is not None: return raw[k]
            if data.get(k) is not None: return data[k]
        return ''
    try:
        out = max(0, int(get('bytes_out', 'bytes_sent', 'sent_bytes') or 0))
    except (TypeError, ValueError):
        out = 0
    try: status = int(get('status', 'status_code', 'http_status') or 0)
    except (TypeError, ValueError): status = 0
    return {
        'id': f'event-{index:04d}', 'timestamp': datetime.fromtimestamp(ts, tz=timezone.utc).isoformat().replace('+00:00', 'Z'),
        '_epoch': ts, 'event_id': str(event_id), 'host': redact(get('host', 'hostname', 'computer') or 'unknown'),
        'user': redact(get('user', 'username', 'TargetUserName')),
        'src_ip': redact(get('src_ip', 'source_ip', 'ip')),
        'dest_ip': redact(get('dest_ip', 'destination_ip')),
        'level': redact(get('level', 'severity') or 'INFO').upper(),
        'process': redact(get('process', 'process_name', 'Image')),
        'command_line': redact(get('command_line', 'CommandLine', 'command')),
        'message': redact(get('message', 'Message', 'description')),
        'bytes_out': out, 'status': status,
    }


def parse_logs(content, filename):
    if not isinstance(content, str) or len(content) > MAX_CONTENT:
        raise ValueError('input must be text of at most 600,000 characters')
    if not isinstance(filename, str) or len(filename) > 120 or not re.search(r'\.(json|jsonl|ndjson|csv|log|txt)$', filename, re.I):
        raise ValueError('supported types: .json, .jsonl, .ndjson, .csv, .log, .txt')
    ext = Path(filename).suffix.lower()
    parse_errors, records = [], []
    if ext == '.csv':
        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames or not ({'timestamp', '@timestamp', 'time', 'date'} & set(reader.fieldnames)):
            raise ValueError('CSV requires a timestamp/time/date header')
        iterable = enumerate(reader, 1)
    elif ext == '.json':
        try: obj = json.loads(content)
        except json.JSONDecodeError as exc: raise ValueError('invalid JSON document') from exc
        if isinstance(obj, dict) and isinstance(obj.get('events'), list): obj = obj['events']
        if isinstance(obj, dict): obj = [obj]
        if not isinstance(obj, list): raise ValueError('JSON file requires array/object of events')
        iterable = enumerate(obj, 1)
    else:
        def entries():
            for i, line in enumerate(content.splitlines(), 1):
                if not line.strip(): continue
                try:
                    if line.lstrip().startswith('{'):
                        yield i, json.loads(line)
                    else:
                        # Loose text format: ISO 8601 date at beginning and text after it.
                        m = re.match(r'^(\S{19,30})\s+(.*)$', line.strip())
                        if not m: raise ValueError('requires an ISO timestamp then message')
                        level = (re.search(r'\b(INFO|WARN|WARNING|ERROR|CRITICAL|DEBUG)\b', m[2], re.I) or [None, 'INFO'])[1]
                        yield i, {'timestamp': m[1], 'level': level, 'message': m[2], 'host':'app-log'}
                except (ValueError, json.JSONDecodeError) as exc:
                    parse_errors.append({'line': i, 'reason': redact(str(exc))[:90]})
        iterable = entries()
    for i, event in iterable:
        if len(records) >= MAX_EVENTS:
            raise ValueError(f'files may contain no more than {MAX_EVENTS} events')
        try: records.append(normalize(event, i))
        except (ValueError, TypeError) as exc:
            parse_errors.append({'line': i, 'reason': redact(str(exc))[:90]})
    if not records:
        raise ValueError('no valid timestamped events found')
    records.sort(key=lambda x: (x['_epoch'], x['id']))
    return records, {'count': len(parse_errors), 'details': parse_errors[:20]}


def detect(events):
    findings = []
    def add(rule, title, score, kind, technique, selected, reason):
        if not selected: return
        ids = [x['id'] for x in selected[:15]]
        signature = rule + '|' + '|'.join(ids)
        fid = 'DET-' + hashlib.sha256(signature.encode()).hexdigest()[:12].upper()
        findings.append({
            'id': fid, 'rule': rule, 'title': title, 'confidence_score': score,
            'confidence_type': 'heuristic_not_calibrated_probability',
            'severity': 'Critical' if score >= 95 else 'High' if score >= 80 else 'Medium' if score >= 60 else 'Low',
            'category': kind, 'technique': technique, 'source_event_ids': ids,
            'first_seen': selected[0]['timestamp'], 'last_seen': selected[-1]['timestamp'],
            'host': selected[-1]['host'], 'explanation': reason, 'disposition': 'Needs review',
        })
    # Windowed password-spray correlation; never conflate different source IPs.
    fails = defaultdict(list)
    for e in events:
        if e['event_id'] == '4625' and e['src_ip']:
            fails[e['src_ip']].append(e)
    spray_windows = {}
    for ip, items in fails.items():
        best = []
        for i, x in enumerate(items):
            window = [y for y in items[i:] if 0 <= y['_epoch'] - x['_epoch'] <= 600]
            if len(window) >= 6 and len({y['user'] for y in window if y['user']}) >= 3 and len(window) > len(best):
                best = window
        if best:
            spray_windows[ip] = best
            add('AUTH_SPRAY', 'Repeated failed logons across multiple accounts', 89, 'Security', 'T1110.003', best,
                f'{len(best)} failures across {len(set(x["user"] for x in best))} accounts from one source within 10 minutes. Review VPN, maintenance, and known scanners before escalating.')
            success = [e for e in events if e['event_id']=='4624' and e['src_ip']==ip and best[-1]['_epoch'] <= e['_epoch'] <= best[-1]['_epoch']+600]
            if success:
                add('AUTH_SPRAY_SUCCESS', 'Successful authentication after spray-like failures', 96, 'Security', 'T1078', best[-3:] + success[:2],
                    'An authentication success followed repeated failures from the same source. Verify account owner, sign-in policy, and session context.')
    # Powershell correlation: two independent suspicious indicators on same host => stronger heuristic.
    by_host = defaultdict(list)
    for e in events:
        cmd = (e['command_line'] + ' ' + e['message']).lower()
        if 'powershell' in (e['process'] + ' ' + cmd).lower() and any(p in cmd for p in ('-enc', 'encodedcommand', 'invoke-webrequest', 'downloadstring', 'iex', 'invoke-expression')):
            by_host[e['host']].append(e)
    for host, items in by_host.items():
        encoded = [x for x in items if re.search(r'-enc\b|encodedcommand', x['command_line'], re.I)]
        download = [x for x in items if re.search(r'iex\b|invoke-webrequest|downloadstring|invoke-expression', x['command_line'], re.I)]
        if encoded and download and abs(download[0]['_epoch'] - encoded[0]['_epoch']) <= 600:
            add('PS_MULTI_SIGNAL', 'Encoded PowerShell and remote-code execution indicators', 92, 'Security', 'T1059.001', sorted({x['id']:x for x in (encoded[:2]+download[:2])}.values(), key=lambda x:x['_epoch']),
                'Encoded command and network-related script execution indicators were observed on the same host. Legitimate automation can trigger these patterns.')
        else:
            add('PS_SUSPICIOUS', 'Suspicious PowerShell command', 74, 'Security', 'T1059.001', items[:5],
                'Command line contains encoded or remote execution indicators. Inspect parent process and signed script provenance.')
    # Large outbound transfer is a lead; only mark high when paired with suspicious process evidence.
    for e in events:
        if e['bytes_out'] >= 100_000_000 and e['dest_ip']:
            supporting = [x for x in by_host.get(e['host'], []) if abs(x['_epoch']-e['_epoch']) <= 600]
            score = 91 if supporting and 'powershell' in e['process'].lower() else 70
            add('EGRESS_SPIKE', 'Large outbound transfer warrants review', score, 'Security', 'T1041', supporting[:2] + [e],
                f'{e["bytes_out"]:,} outbound bytes to {e["dest_ip"]}. Confirm authorized backup, deployment, or business transfer before treating this as exfiltration.')
    # Operational errors are not a proof of hostile activity, and are categorized separately.
    errgroups = defaultdict(list)
    for e in events:
        if e['status'] >= 500 or e['level'] in ('ERROR','CRITICAL'):
            errgroups[e['host']].append(e)
    for host, items in errgroups.items():
        for i, x in enumerate(items):
            window = [y for y in items[i:] if 0 <= y['_epoch']-x['_epoch'] <= 600]
            if len(window) >= 5:
                add('BACKEND_5XX_BURST', 'Repeated backend errors in a 10-minute window', 83, 'Operational', None, window[:15],
                    f'{len(window)} error events on {host}. Review upstream availability, deployment changes, request traces, and retry patterns. Not classified as an intrusion.')
                break
    findings.sort(key=lambda x:(-x['confidence_score'], x['rule']))
    return findings[:MAX_FINDINGS]


def analyze(content, filename):
    records, parse_errors = parse_logs(content, filename)
    findings = detect(records)
    # Keep essential sanitized details, never persist opaque source log bytes or original secrets.
    public_events = [{k:v for k,v in e.items() if k!='_epoch'} for e in records[:MAX_EVENTS]]
    return {
        'dataset': filename, 'source_sha256': hashlib.sha256(content.encode()).hexdigest(),
        'event_count': len(records), 'parse_errors': parse_errors,
        'alerts': findings, 'high_confidence_count': sum(f['confidence_score'] >= 80 for f in findings),
        'events': public_events, 'analyst_note': 'Scores are deterministic heuristic priorities, not calibrated probabilities or proof of compromise.',
    }


def job_id(workspace_id, content):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, workspace_id + ':' + hashlib.sha256(content.encode()).hexdigest()))


def sample_path():
    return Path(__file__).resolve().parents[2] / 'samples' / 'kyle_security_events.jsonl'


def sample_report():
    p = sample_path()
    return analyze(p.read_text(encoding='utf8'), p.name)
