#!/usr/bin/env python3
"""Reproducible offline sample analysis. No credentials, cloud, network or Redis used."""
import json
import pathlib
import sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'api'))
from spec_api.soc_pipeline import sample_report
result=sample_report()
out=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'sample-analysis-report.json'
out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print('Saved',out)
print('Events:',result['event_count'],'Parser errors:',result['parse_errors']['count'],'High priority:',result['high_confidence_count'])
for a in result['alerts']:
 print(f"{a['confidence_score']:3}/100 {a['category']:<12} {a['rule']}: {a['title']}")
