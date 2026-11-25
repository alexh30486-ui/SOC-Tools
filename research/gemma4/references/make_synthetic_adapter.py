"""Copyright 2026 Dmitry Gluzdov. Apache-2.0. CPU synthetic diagnostic only."""
import argparse
import os
os.environ['CUDA_VISIBLE_DEVICES']=''
os.environ['OMP_NUM_THREADS']='2'
import hashlib
import json
from pathlib import Path
import re
import torch
from safetensors import safe_open
from safetensors.torch import save_file


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--model-safetensors',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    output=a.output;output.mkdir(parents=True,exist_ok=False)
    rank=4;generator=torch.Generator(device='cpu').manual_seed(4243)
    tensors={};shapes={};counts={}
    pattern=re.compile(r'^model\.language_model\.layers\.(\d+)\.(self_attn|mlp)\.(q_proj|k_proj|v_proj|o_proj|gate_proj|up_proj|down_proj)\.weight_shape$')
    with safe_open(a.model_safetensors,framework='pt',device='cpu') as source:
        for name in sorted(source.keys()):
            match=pattern.match(name)
            if not match:continue
            out_features,in_features=source.get_tensor(name).tolist();module=name.removesuffix('.weight_shape')
            shapes[module]=[out_features,in_features];projection=match.group(3);counts[projection]=counts.get(projection,0)+1
            prefix='base_model.model.'+module
            tensors[prefix+'.lora_A.weight']=(torch.randn(rank,in_features,generator=generator)*.02).to(torch.bfloat16)
            tensors[prefix+'.lora_B.weight']=torch.randn(out_features,rank,generator=generator).to(torch.bfloat16)
    assert len(shapes)>200 and len(counts)==7,counts
    config={'base_model_name_or_path':'google/gemma-4-31b-it-qat-w4a16-ct','peft_type':'LORA','task_type':'CAUSAL_LM',
        'r':rank,'lora_alpha':8,'lora_dropout':0.,'bias':'none','inference_mode':True,'target_modules':sorted(counts),
        'layers_pattern':'layers','fan_in_fan_out':False,'modules_to_save':None}
    (output/'adapter_config.json').write_text(json.dumps(config,indent=2)+'\n')
    path=output/'adapter_model.safetensors';save_file(tensors,str(path))
    with path.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
    result={'synthetic_not_trained':True,'never_promote':True,'seed':4243,'rank':rank,'alpha':8,'A_std':.02,'B_std':1.,
        'projection_counts':counts,'modules':len(shapes),'tensor_count':len(tensors),'bytes':path.stat().st_size,
        'sha256':digest,'path':str(output),'shape_manifest':shapes}
    (output/'diagnostic_manifest.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='shape_manifest'}))


if __name__=='__main__':main()
