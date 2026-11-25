# SPDX-License-Identifier: Apache-2.0
"""Independent standard-library validation of the published B/B2 layout.

python lora_validate_external_B2.py --data . --output validation_B2_structure.json
Checks saved artifacts only. The historical conversion audit against original
downloads, caches and competition identities is not reproduced here.
"""
import argparse
import collections
import csv
import hashlib
import json
import os
from pathlib import Path

os.environ['CUDA_VISIBLE_DEVICES'] = ''

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    a=parser.parse_args()
    index={r['id']:r for r in csv.DictReader((a.data/'lora_index.csv').open(encoding='utf-8'))}
    files=sorted(a.data.glob('lora_external_B*.jsonl'))
    assert len(files)==8, 'Expected four B and four B2 parts'
    sources={}
    for tier in ('B','B2'):
        doc=json.loads((a.data/f'lora_sources_external_{tier}.json').read_text(encoding='utf-8'))
        sources[tier]={(r['repo'],r['base_commit']) for r in doc['repository_notices']}
    ranks=collections.defaultdict(set);hashes=set();seen=set();stats=collections.defaultdict(collections.Counter)
    for file in files:
        assert file.stat().st_size<500_000_000
        tier='B2' if file.name.startswith('lora_external_B2.') else 'B'
        with file.open(encoding='utf-8') as stream:
            for line_number,line in enumerate(stream,1):
                r=json.loads(line);assert r['id'] not in seen;seen.add(r['id'])
                ir=index[r['id']];assert ir['file']==file.name and int(ir['line'])==line_number
                key=(r['repo'].casefold(),r['instance'].casefold());rank=r.get('attempt_rank',1)
                assert rank not in ranks[key] and rank in (1,2,3);ranks[key].add(rank)
                sequence=[];examples=r['sft_examples'];assert len(r['messages'])==2+2*len(examples)
                declarations={t['function']['name']:t['function']['parameters'] for t in r['tools']}
                for i,ex in enumerate(examples):
                    assistant,result=r['messages'][2+2*i:4+2*i]
                    assert assistant['role']=='assistant' and result['role']=='tool'
                    call,=assistant['tool_calls'];assert call['id']==result['tool_call_id']
                    fn=call['function'];args=fn['arguments'];args=json.loads(args) if isinstance(args,str) else args
                    assert isinstance(args,dict) and fn['name'] in declarations
                    schema=declarations[fn['name']];assert set(schema.get('required',[]))<=set(args)
                    if schema.get('additionalProperties') is False:assert set(args)<=set(schema.get('properties',{}))
                    sequence.append([fn['name'],args]);assert json.loads(result['content'])['status'] in ('ok','error')
                    assert len(ex['completion_token_ids'])==ex['completion_tokens']
                    assert ex['context_tokens']==ex['prompt_tokens']+ex['completion_tokens']<=32768
                ah=hashlib.sha256(json.dumps(sequence,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
                assert (key,ah) not in hashes;hashes.add((key,ah))
                if tier=='B2':assert ah==r['action_sequence_sha256'] and r['issue_id']==r['instance']
                assert (r['repo'],r['base_commit']) in sources[tier]
                assert r['source_resolved_label'] is True and r['regraded'] is False and r['observations_replayed'] is False
                assert r['budget']==40
                assert int(ir['steps'])==len(examples)
                assert int(ir['supervised_tokens'])==sum(len(e['completion_token_ids']) for e in examples)
                assert int(ir['max_context_tokens'])==max(e['context_tokens'] for e in examples)
                for bound in (16384,32768):assert int(ir[f'steps_le_{bound}'])==sum(e['context_tokens']<=bound for e in examples)
                stats[tier].update(trajectories=1,steps=len(examples),target_tokens=sum(len(e['completion_token_ids']) for e in examples))
    assert all(sorted(x)==list(range(1,len(x)+1)) for x in ranks.values())
    assert seen=={r['id'] for r in index.values() if r['file'] in {f.name for f in files}}
    result={'status':'PASS','cpu_only':True,'files':len(files),'statistics':{k:dict(v) for k,v in stats.items()},
            'scope':'Published B/B2 index, message pairing, tool arguments, token counts, context limits, provenance notices, ranks and action hashes. Original-source conversion and competition-overlap audits are historical, not repeated.'}
    a.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))

if __name__=='__main__':main()
