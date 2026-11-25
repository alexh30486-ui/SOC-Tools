#!/usr/bin/env python3
"""Offline Gemma 4 agent data and adapter checks. Standard library only.

Not a trainer or inference engine. Never uploads user data.

python tools/lora_eval.py dataset path/to/steps.jsonl --expected-steps 56702 --expected-trajectories 1670
python tools/lora_eval.py compare --base base.jsonl --adapter adapter.jsonl
python tools/lora_eval.py probe probe.json
python tools/lora_eval.py archive submission.zip
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
from pathlib import Path
import random
import statistics
import sys
import zipfile

NINE_TOOLS = frozenset({
    'run_command','submit_patch','get_status','read_file','edit_file',
    'write_file','get_code_neighbors','search_similar_code','get_code_subgraph'
})
MAX_ARCHIVE_ENTRIES = 20000
MAX_ARCHIVE_UNCOMPRESSED = 2_000_000_000


def rows(path):
    p=Path(path)
    if p.suffix == '.jsonl':
        with p.open(encoding='utf8') as f:
            for line_no, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    x=json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f'{p.name}:{line_no}: invalid JSON: {exc.msg}') from exc
                if not isinstance(x, dict):
                    raise ValueError(f'{p.name}:{line_no}: each row must be an object')
                yield x
    else:
        x=json.loads(p.read_text(encoding='utf8'))
        data=x.get('rows') if isinstance(x,dict) else x
        if not isinstance(data,list):
            raise ValueError('Expect a JSON array, a JSON object with rows, or JSONL')
        for i,item in enumerate(data,1):
            if not isinstance(item,dict):
                raise ValueError(f'row {i}: expected an object')
            yield item


def stable_id(x):
    for k in ('trajectory_id','traj_id','episode_id','run_id','task_id'):
        if x.get(k) is not None:
            return str(x[k])
    meta=x.get('metadata')
    if isinstance(meta,dict):
        for k in ('trajectory_id','task_id'):
            if meta.get(k) is not None: return str(meta[k])
    return None


def dataset(path, expected_steps=None, expected_trajectories=None):
    total=0;ids=set();missing=0;splits=collections.defaultdict(set)
    roles=collections.Counter();tools=collections.Counter();empty=0
    for x in rows(path):
        total+=1
        tid=stable_id(x)
        if tid is None:missing+=1
        else:
            ids.add(tid)
            splits[str(x.get('split','unspecified')).lower()].add(tid)
        for field in ('target','completion'):
            if field in x and (x[field] is None or x[field]==''):
                empty+=1
        msgs=x.get('messages')
        if isinstance(msgs,list):
            for m in msgs:
                if not isinstance(m,dict):continue
                roles[str(m.get('role','unknown'))]+=1
                for call in m.get('tool_calls',[]) or []:
                    if isinstance(call,dict):
                        fn=call.get('function',{})
                        name=(fn.get('name') if isinstance(fn,dict) else None) or call.get('name')
                        if name:tools[str(name)]+=1
        elif isinstance(x.get('tools'),list):
            for t in x['tools']:
                if isinstance(t,dict):
                    name=t.get('name') or (t.get('function') or {}).get('name')
                    if name:tools[str(name)]+=1
    overlaps=[]
    for a,b in [('train','validation'),('train','val'),('train','test'),('validation','test'),('val','test')]:
        overlap=splits[a] & splits[b]
        if overlap:overlaps.append({'splits':[a,b],'unique_trajectories':len(overlap)})
    issues=[]
    if missing:issues.append(f'{missing} rows have no trajectory ID; cannot verify group-level splits')
    if total and not any(k in splits for k in ('train','validation','val','test')):
        issues.append('No explicit train/validation/test labels; cannot verify held-out split isolation')
    if overlaps:issues.append('SPLIT LEAKAGE: same trajectory IDs occur in multiple splits')
    if empty:issues.append(f'{empty} empty completion/target fields')
    if expected_steps is not None and total!=expected_steps:issues.append(f'Expected {expected_steps} steps, found {total}')
    if expected_trajectories is not None and len(ids)!=expected_trajectories:issues.append(f'Expected {expected_trajectories} unique trajectory IDs, found {len(ids)}')
    return {'steps':total,'unique_trajectories':len(ids),'rows_without_trajectory_id':missing,'splits':{k:len(v) for k,v in splits.items() if v},'cross_split_overlaps':overlaps,'message_roles':dict(roles),'tool_call_names':dict(tools),'nonstandard_tool_names':sorted(set(tools)-NINE_TOOLS),'issues':issues,'status':'needs_review' if issues else 'pass'}


def quantile(vals,q):
    if not vals:return None
    s=sorted(vals)
    return round(s[min(len(s)-1,int((len(s)-1)*q))],3)


def compare(baseline, adapter):
    b={};a={}
    def collect(source,d):
        for x in rows(source):
            k=x.get('task_id',x.get('issue_id',x.get('id')))
            if k is None:raise ValueError(f'{source}: missing task_id')
            k=str(k)
            if k in d:raise ValueError(f'{source}: repeated task_id {k}; aggregate repeated runs before comparison')
            d[k]=x
    collect(baseline,b);collect(adapter,a)
    common=sorted(set(b)&set(a))
    if not common:raise ValueError('No matching task_id across baseline and adapter')
    passed=lambda x: bool(x.get('passed',x.get('resolved',False)))
    def success(xs):return sum(passed(x) for x in xs)/len(xs)
    base=[b[k] for k in common];new=[a[k] for k in common]
    deltas=[int(passed(a[k]))-int(passed(b[k])) for k in common]
    rng=random.Random(2026)
    boots=[sum(rng.choice(deltas) for _ in deltas)/len(deltas) for _ in range(1000)]
    def latency(xs):
        nums=[]
        for x in xs:
            v=x.get('elapsed_seconds',x.get('runtime_seconds'))
            if v is not None:
                v=float(v)
                if v < 0:raise ValueError('Negative elapsed time')
                nums.append(v)
        return {'tasks_measured':len(nums),'median_seconds':quantile(nums,.5),'p90_seconds':quantile(nums,.9)}
    def rate(xs,key):
        known=[x[key] for x in xs if key in x]
        return round(sum(bool(v) for v in known)/len(known),4) if known else None
    return {'paired_tasks':len(common),'baseline_only_tasks':len(set(b)-set(a)),'adapter_only_tasks':len(set(a)-set(b)),
            'baseline_pass_rate':round(success(base),4),'adapter_pass_rate':round(success(new),4),'pass_rate_delta_pp':round((success(new)-success(base))*100,2),
            'paired_bootstrap_95pct_delta_pp':[round(quantile(boots,.025)*100,2),round(quantile(boots,.975)*100,2)],
            'baseline_latency':latency(base),'adapter_latency':latency(new),
            'baseline_tool_format_valid_rate':rate(base,'tool_format_valid'),'adapter_tool_format_valid_rate':rate(new,'tool_format_valid'),
            'baseline_unauthorized_action_rate':rate(base,'unauthorized_action'),'adapter_unauthorized_action_rate':rate(new,'unauthorized_action'),
            'notes':['Same task IDs required for valid paired comparison; bootstrap interval is exploratory.',
                     'Pass/fail must come from real verifier tests, not a model self-rating.',
                     'Only compare inference time on equivalent hardware and settings.']}


def probe(path):
    p=json.loads(Path(path).read_text(encoding='utf8'))
    if not isinstance(p,dict):raise ValueError('probe must be a JSON object')
    for k in ('base_output','adapter_output','prompt_id'):
        if k not in p:raise ValueError(f'probe missing {k}')
    changed=p['base_output']!=p['adapter_output']
    comparable=bool(p.get('same_prompt') and p.get('same_seed') and p.get('same_sampling_settings') and p.get('adapter_confirmed_loaded'))
    return {'prompt_id':str(p['prompt_id']),'output_changed':changed,'conditions_comparable':comparable,
            'conclusion':'Adapter affected output; quality still unverified.' if changed and comparable else 'Inconclusive: check same prompt/decoding and actual adapter selection.' if not comparable else 'No observed output change; adapter effect not demonstrated.',
            'quality_improvement_demonstrated':False}


def archive(path):
    p=Path(path)
    issues=[]
    with zipfile.ZipFile(p) as z:
        infos=z.infolist()
        if len(infos)>MAX_ARCHIVE_ENTRIES:issues.append('too many archive entries')
        if sum(x.file_size for x in infos)>MAX_ARCHIVE_UNCOMPRESSED:issues.append('archive expands beyond 2 GB inspection limit')
        names={i.filename for i in infos if not i.is_dir()}
        invalid=[]
        for i in infos:
            components=i.filename.replace('\\','/').split('/')
            if i.filename.startswith('/') or '..' in components or i.filename.startswith('~') or (i.external_attr>>16)&0o170000==0o120000:
                invalid.append(i.filename)
        if invalid:issues.append(f'unsafe archive entries: {invalid[:6]}')
        if 'agent.yaml' not in names:issues.append('agent.yaml missing at ZIP root')
        configs=sorted(n for n in names if n.endswith('/adapter_config.json'))
        weights=sorted(n for n in names if n.endswith('/adapter_model.safetensors'))
        adapters=[]
        for name in configs:
            parent=name.rsplit('/',1)[0]
            weight=parent+'/adapter_model.safetensors'
            if weight not in names:issues.append(f'adapter weights missing in {parent}')
            try:
                cfg=json.loads(z.read(name))
                if not cfg.get('r') or not cfg.get('lora_alpha'):issues.append(f'adapter config lacks rank/alpha in {parent}')
                adapters.append({'directory':parent,'rank':cfg.get('r'),'alpha':cfg.get('lora_alpha'),'base_model_name_or_path':cfg.get('base_model_name_or_path')})
            except (ValueError,KeyError) as exc:issues.append(f'invalid adapter config in {parent}: {exc}')
        for w in weights:
            if w.rsplit('/',1)[0]+'/adapter_config.json' not in names:issues.append(f'adapter config missing for {w}')
        if 'agent.yaml' in names:
            cfg=z.read('agent.yaml').decode('utf8','replace')
            if not cfg.strip():issues.append('agent.yaml empty')
        else:cfg=''
        return {'archive':p.name,'entry_count':len(infos),'uncompressed_bytes':sum(i.file_size for i in infos),'agent_yaml_exists':'agent.yaml' in names,
                'adapter_count':len(adapters),'adapters':adapters,'model_lines':[s.strip() for s in cfg.splitlines() if ('model:' in s or 'adapter:' in s)][:20],
                'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'issues':issues,'status':'needs_review' if issues else 'structurally_plausible',
                'limitations':['This does not execute the official Kaggle harness, validate YAML schemas, load adapters, or guarantee score.',
                               'Check the current competition model and tool rules before submission.']}


def main():
    ap=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    sub=ap.add_subparsers(dest='command',required=True)
    d=sub.add_parser('dataset');d.add_argument('path');d.add_argument('--expected-steps',type=int);d.add_argument('--expected-trajectories',type=int)
    c=sub.add_parser('compare');c.add_argument('--base',required=True);c.add_argument('--adapter',required=True)
    p=sub.add_parser('probe');p.add_argument('path')
    ar=sub.add_parser('archive');ar.add_argument('path')
    a=ap.parse_args()
    try:
        out=dataset(a.path,a.expected_steps,a.expected_trajectories) if a.command=='dataset' else compare(a.base,a.adapter) if a.command=='compare' else probe(a.path) if a.command=='probe' else archive(a.path)
        print(json.dumps(out,indent=2))
        return 0 if out.get('status') not in ('needs_review',) else 1
    except (OSError,ValueError,zipfile.BadZipFile) as e:
        print(json.dumps({'error':str(e),'status':'error'},indent=2))
        return 2
if __name__=='__main__':sys.exit(main())
