#!/usr/bin/env python3
"""Verify the original research files against supplied release_manifest.csv.
No model execution, package installation, network access, or source-code execution.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

def verify(path):
    with (path/'release_manifest.csv').open(encoding='utf-8',newline='') as f:
        rows=list(csv.DictReader(f))
    good=[];bad=[];missing=[]
    for row in rows:
        name=row['file']
        if Path(name).name != name:raise ValueError('Unsafe manifest entry')
        fp=path/name
        if not fp.exists():missing.append(name);continue
        sha=hashlib.sha256(fp.read_bytes()).hexdigest()
        if sha == row['sha256'] and fp.stat().st_size==int(row['bytes']):good.append(name)
        else:bad.append(name)
    return {'verified':len(good),'expected':len(rows),'missing':len(missing),'mismatches':bad,
            'verified_files':good,'missing_files':missing,
            'scope':'Local SHA-256 and size matching only; does not prove independent authenticity or repeat historical model experiments.'}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--dir',type=Path,default=Path(__file__).resolve().parents[1]/'research/gemma4/references')
    a=p.parse_args();r=verify(a.dir);print(json.dumps(r,indent=2));raise SystemExit(2 if r['mismatches'] else 0)
