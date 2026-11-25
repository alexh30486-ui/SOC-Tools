# SPDX-License-Identifier: Apache-2.0
"""CPU tokenizer/renderer checks for published native and external A/B data.

python lora_validate.py --data . --model TOKENIZER_DIRECTORY --output validation.json
Only local tokenizer/template files are read. Model weights are never loaded.
Use lora_validate_B2.py to include B2 and joint rank/action checks.
"""
import os
os.environ.update(CUDA_VISIBLE_DEVICES='',TOKENIZERS_PARALLELISM='false',HF_HUB_OFFLINE='1',HF_HUB_DISABLE_IMPLICIT_TOKEN='1',OMP_NUM_THREADS='1',OPENBLAS_NUM_THREADS='1',MKL_NUM_THREADS='1')
import argparse
import collections
import concurrent.futures
import csv
import hashlib
import json
import multiprocessing
from pathlib import Path
import served_render_reference as ref
from lora_sanitize import Scanner

TOKENIZER=None
INDEX=None

def initialize(model,data):
    global TOKENIZER,INDEX
    if TOKENIZER is None:
        from transformers import AutoTokenizer
        TOKENIZER=AutoTokenizer.from_pretrained(model,local_files_only=True)
    if INDEX is None:
        with (Path(data)/'lora_index.csv').open(encoding='utf-8',newline='') as stream:
            rows=list(csv.DictReader(stream));INDEX={r['id']:r for r in rows}
        assert len(INDEX)==len(rows), 'Duplicate index identifiers'

def validate_file(arguments):
    filename,limit=arguments;file=Path(filename);tok=TOKENIZER;scan=Scanner()
    assert file.stat().st_size<=500_000_000
    stats=collections.defaultdict(collections.Counter);ids=[];external=[];digest=hashlib.sha256()
    with file.open('rb') as stream:
        for n,raw in enumerate(stream,1):
            if limit and n>limit:break
            digest.update(raw);row=json.loads(raw);ir=INDEX[row['id']];ids.append(row['id'])
            assert ir['file']==file.name and int(ir['line'])==n
            _,delta=scan.clean(row);assert not delta, 'Residual privacy scan match; values are not logged'
            examples=row['sft_examples'];assert examples
            assert int(ir['steps'])==len(examples)
            assert int(ir['supervised_tokens'])==sum(len(e['completion_token_ids']) for e in examples)
            assert int(ir['max_context_tokens'])==max(e['context_tokens'] for e in examples)
            for bound in (16384,32768):assert int(ir[f'steps_le_{bound}'])==sum(e['context_tokens']<=bound for e in examples)
            tier=row.get('tier','external_tierA');s=stats[tier];s.update(trajectories=1,jsonl_bytes=len(raw))
            if tier.startswith('native_'):
                for ex in examples:
                    prefix=ref.render_prefix(tok,ex['request']);assert prefix==ex['prefix']
                    assert tok.encode(prefix,add_special_tokens=False)==ex['prompt_token_ids']
                    assert tok.decode(ex['completion_token_ids'],skip_special_tokens=False,clean_up_tokenization_spaces=False)==ex['completion']
                    assert ex['prompt_tokens']==len(ex['prompt_token_ids'])
                    assert ex['completion_tokens']==len(ex['completion_token_ids'])
                    assert ex['context_tokens']==ex['prompt_tokens']+ex['completion_tokens']
                    s['text_id_roundtrip_mismatches']+=tok.encode(ex['completion'],add_special_tokens=False)!=ex['completion_token_ids']
                    try:
                        canonical=ref.encode_example(tok,ex['request'],ex['response_message'])
                        agrees=canonical is not None and canonical['joint_consistent'] and canonical['thought_ids']+canonical['action_ids']==ex['completion_token_ids']
                    except (ValueError,TypeError,KeyError):agrees=False
                    assert agrees==ex['canonical_target_matches']
                    s['canonical_target_mismatches']+=not agrees
                    s['redacted_turns']+=bool(ex['redactions'])
                maximum=max(e['context_tokens'] for e in examples)
            else:
                key=(row['repo'].casefold(),row['instance'].casefold());rank=row.get('attempt_rank',1)
                sequence=[[c['function']['name'],json.loads(c['function']['arguments']) if isinstance(c['function']['arguments'],str) else c['function']['arguments']]
                          for m in row['messages'] if m['role']=='assistant' for c in m.get('tool_calls') or []]
                ah=hashlib.sha256(json.dumps(sequence,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
                external.append((key,rank,ah))
                if tier=='external_tierB2':assert rank in (1,2,3) and row['issue_id']==row['instance'] and ah==row['action_sequence_sha256']
                hist=row['messages'][:2];assert len(row['messages'])==2+2*len(examples)
                for i,saved in enumerate(examples):
                    assistant,result=row['messages'][2+2*i:4+2*i];call,=assistant['tool_calls'];assert call['id']==result['tool_call_id']
                    ind=ref.encode_example(tok,{'messages':hist,'tools':row['tools'],'chat_template_kwargs':{'enable_thinking':True}},assistant)
                    assert ind and ind['joint_consistent']
                    assert saved['prefix']==ind['texts']['prefix']
                    assert saved['completion']==ind['texts']['thought']+ind['texts']['action']
                    assert saved['completion_token_ids']==ind['thought_ids']+ind['action_ids']
                    assert saved['prompt_tokens']==len(ind['prefix_ids'])
                    assert saved['completion_tokens']==len(saved['completion_token_ids'])
                    assert saved['context_tokens']==saved['prompt_tokens']+saved['completion_tokens']<=32768
                    hist.extend([assistant,result])
                rendered=tok.apply_chat_template(ref.served_history(hist),tools=row['tools'],add_generation_prompt=False,tokenize=False,enable_thinking=True)
                assert rendered==row['rendered_history']
                maximum=max(len(tok.encode(rendered,add_special_tokens=False)),max(e['context_tokens'] for e in examples))
                assert maximum<=32768
            assert maximum==row['tokens'];assert row['le16384']==(maximum<=16384)
            s['le16384']+=row['le16384'];s['turns']+=len(examples);s['supervised_tokens']+=sum(e['completion_tokens'] for e in examples)
    assert ids, 'Empty trajectory file'
    return {'file':file.name,'bytes':file.stat().st_size,'sha256':digest.hexdigest(),'ids':ids,'external':external,'statistics':dict(stats),'privacy_scan':scan.receipt()}

def main(include_b2=False):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,required=True);parser.add_argument('--model',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True);parser.add_argument('--limit-per-file',type=int,default=0)
    parser.add_argument('--processes',type=int,default=1,choices=range(1,9),help='CPU processes; default 1')
    a=parser.parse_args()
    files=sorted(a.data.glob('lora_*.jsonl'))
    if not include_b2:files=[f for f in files if not f.name.startswith('lora_external_B2.')]
    assert files, 'No published trajectory files'
    for name in ['lora_sources_native.json','lora_sources_external_A.json','lora_sources_external_B.json']+(['lora_sources_external_B2.json'] if include_b2 else []):
        assert isinstance(json.loads((a.data/name).read_text(encoding='utf-8')),dict)
    initialize(a.model,a.data)
    arguments=[(str(f),a.limit_per_file) for f in files]
    if a.processes==1:parts=list(map(validate_file,arguments))
    else:
        method='fork' if 'fork' in multiprocessing.get_all_start_methods() else 'spawn'
        with concurrent.futures.ProcessPoolExecutor(max_workers=a.processes,mp_context=multiprocessing.get_context(method),initializer=initialize,initargs=(a.model,a.data)) as pool:
            parts=list(pool.map(validate_file,arguments))
    stats=collections.defaultdict(collections.Counter);seen=set();ranks=collections.defaultdict(set);actions=set()
    for part in parts:
        assert len(part['ids'])==len(set(part['ids'])) and not seen.intersection(part['ids']);seen.update(part['ids'])
        for tier,counts in part['statistics'].items():stats[tier].update(counts)
        for key,rank,ah in part['external']:
            key=tuple(key);assert rank not in ranks[key] and (key,ah) not in actions
            ranks[key].add(rank);actions.add((key,ah))
            assert len(ranks[key])<=3
        print(json.dumps({'validated_file':part['file'],'trajectories':len(part['ids'])}),flush=True)
    if not a.limit_per_file:
        assert seen=={r['id'] for r in INDEX.values() if r['file'] in {f.name for f in files}}
        assert all(sorted(x)==list(range(1,len(x)+1)) for x in ranks.values())
    import sys
    torch=sys.modules.get('torch');cuda_initialized=bool(torch and torch.cuda.is_initialized());assert not cuda_initialized
    result={'status':'SMOKE_PASS' if a.limit_per_file else 'PASS','limit_per_file':a.limit_per_file,'cpu_only':True,'processes':a.processes,
            'statistics':{k:dict(v) for k,v in stats.items()},'files':len(files),'cuda_initialized':cuda_initialized,
            'validated_files':[{k:p[k] for k in ('file','bytes','sha256')} for p in parts],
            'privacy_scan':{p['file']:p['privacy_scan'] for p in parts},
            'scope':'Saved native prefixes/IDs, decoded targets, canonical response reconstruction and text-ID round trips; external renderer strings, token boundaries and whole-episode limits; published index, sizes, regex privacy scan and cross-file ranks/action dedup. Original-source conversion, teacher identity and overlap audits are historical, not repeated.'}
    a.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':result['status'],'files':len(files),'statistics':result['statistics']}),flush=True)

if __name__=='__main__':main()
