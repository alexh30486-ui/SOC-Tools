#!/usr/bin/env python3
"""Safely incorporate newly supplied reference files and regenerate dashboard receipts.

Usage: python tools/refresh_gemma_research.py --incoming /path/to/new/batch
Then run: cd web && python build.py && python ../tools/build_offline_preview.py
"""
import argparse
import csv
import hashlib
import re
import shutil
from pathlib import Path
from build_gemma_receipts import make_report
import json

ROOT=Path(__file__).resolve().parents[1]


def refresh(incoming):
    archive=ROOT/'research/gemma4/references'
    manifest={r['file']:r for r in csv.DictReader((archive/'release_manifest.csv').open(encoding='utf8'))}
    accepted=[];rejected=[]
    for f in sorted(incoming.iterdir()):
        if not f.is_file():continue
        name=f.name
        if name=='README(8).md':name='README.md'
        else:name=re.sub(r'\(\d+\)(\.[^.]+)$',r'\1',name)
        row=manifest.get(name)
        if not row:
            rejected.append([f.name,'Not in the supplied manifest']);continue
        if f.stat().st_size != int(row['bytes']) or hashlib.sha256(f.read_bytes()).hexdigest()!=row['sha256']:
            rejected.append([f.name,'Checksum mismatch; not copied']);continue
        if f.resolve()!=(archive/name).resolve():shutil.copy2(f,archive/name)
        accepted.append(name)
    report=make_report(archive,archive)
    (ROOT/'research/gemma4/receipt.json').write_text(json.dumps(report,indent=2)+'\n')
    (ROOT/'web/src/gemma-research.ts').write_text('/* Generated from manifest-verified attachments; historical research only */\nconst SOC_GEMMA_RECEIPTS:any='+json.dumps(report,separators=(',',':'))+';\n')
    return {'accepted':accepted,'rejected':rejected,'available':report['receipts']['verified_and_bundled'],'expected':report['receipts']['listed_in_manifest']}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--incoming',required=True,type=Path);a=p.parse_args();print(json.dumps(refresh(a.incoming),indent=2))
