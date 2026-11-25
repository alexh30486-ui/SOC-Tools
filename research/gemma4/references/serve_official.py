"""Copyright 2026 Dmitry Gluzdov. Apache-2.0. Build the frozen ADK server command."""
import argparse,json,os
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--model',type=Path,required=True)
    p.add_argument('--zero-adapter',type=Path,required=True)
    p.add_argument('--adapter',type=Path,required=True)
    p.add_argument('--tp',type=int,default=1)
    p.add_argument('--port',type=int,default=8875)
    p.add_argument('--execute',action='store_true')
    a=p.parse_args()
    for path in [a.model,a.zero_adapter,a.adapter]:
        if not path.is_dir():raise ValueError('Missing local directory: '+str(path))
    from adk_submission.server import VllmConfig,VllmServer
    config=VllmConfig(model=str(a.model.resolve()),host='127.0.0.1',port=a.port,tensor_parallel_size=a.tp,gpu_memory_utilization=.8,max_model_len=32768,tool_call_parser='gemma4',reasoning_parser='gemma4',default_chat_template_kwargs={'enable_thinking':True},enable_lora=True,max_lora_rank=128,max_loras=8,extra_args=['--served-model-name','gemma-4-31b-it-qat-w4a16-ct'])
    # A nonempty map is required: this ADK version otherwise omits --enable-lora.
    cmd=VllmServer(config=config,lora_modules={'official_example':str(a.zero_adapter.resolve()),'tiny_gate':str(a.adapter.resolve())}).build_cmd()
    assert '--enable-lora' in cmd and '--lora-modules' in cmd
    print(json.dumps({'command':cmd,'scope':'Frozen September 30 ADK API; TP1 A100 measured, TP4 L4 unmeasured.'},indent=2),flush=True)
    if a.execute:os.execv(cmd[0],cmd)

if __name__=='__main__':main()
