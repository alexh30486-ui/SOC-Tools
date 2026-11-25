"""Redis consumer: python -m spec_api.soc_worker.
Requires SOC_QUEUE=redis, SOC_STORAGE configured, and private Redis network.
"""
import os
import socket
import sys
import time
from .db import Store
from .soc_backend import SOCBackend


def run():
    store=Store(os.environ.get('SPEC_DATABASE_URL','sqlite:///spec-dev.db'))
    store.migrate()
    soc=SOCBackend(store)
    soc.migrate()
    if soc.queue_mode != 'redis':
        raise SystemExit('Set SOC_QUEUE=redis to run the worker')
    consumer=socket.gethostname().replace(':','_')+'-'+str(os.getpid())
    print('worker connected; stream=',soc.stream.STREAM, 'consumer=',consumer, flush=True)
    while True:
        for stream_id, fields in soc.stream.pull(consumer):
            try:
                soc.process_message(fields)
            except Exception as exc:
                # Retry bounded failures and keep an auditable non-sensitive dead-letter entry.
                # If storage is unavailable, leave the message pending for XAUTOCLAIM.
                print('job failed:',stream_id,type(exc).__name__,flush=True)
                try:
                    attempts=soc.stream.client.hincrby('soc:attempts:v1',fields['id'],1)
                    if attempts >= 3:
                        failed=soc.record(fields['id'],fields['org_id'],fields['actor_id'],
                                          fields['filename'],fields['content'],'failed',
                                          {'error':'processing failed after 3 attempts; inspect server logs'})
                        soc.save(failed)
                        soc.stream.client.xadd('soc:deadletter:v1',{'job_id':fields['id'],
                            'workspace_id':fields['org_id'],'reason':type(exc).__name__},
                            maxlen=1000,approximate=True)
                        soc.stream.ack(stream_id)
                        soc.stream.client.hdel('soc:attempts:v1',fields['id'])
                except Exception:
                    pass  # never acknowledge messages until failed status is persisted
                time.sleep(1)
            else:
                soc.stream.ack(stream_id)
                print('processed',fields.get('id'),flush=True)

if __name__ == '__main__':run()
