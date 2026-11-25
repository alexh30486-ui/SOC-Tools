from pathlib import Path
import sys
import json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from verify_gemma_research import verify

ROOT=Path(__file__).resolve().parents[1]

def test_verified_manifest():
    report=verify(ROOT/'research/gemma4/references')
    assert report['verified']==30
    assert report['expected']==85
    assert report['missing']==55
    assert report['mismatches']==[]

def test_gemma_numbers_match_sources():
    data=json.loads((ROOT/'research/gemma4/receipt.json').read_text())
    assert sum(r['trajectories'] for r in data['dataset']['tiers'])==1670
    assert sum(r['steps'] for r in data['dataset']['tiers'])==56702
    assert {(r['model'],r['tasks'],r['resolved']) for r in data['timing']}=={('31B',8,3),('12B',8,1)}
    assert next(r for r in data['serving_checks'] if r['cohort']=='native' and r['rendering']=='served_history')['matched']==803
    assert data['model_connection']['server_connected'] is False
    assert data['model_connection']['adapter_loaded'] is False

def test_notebook_and_synthetic_controls_retain_attribution():
    data=json.loads((ROOT/'research/gemma4/receipt.json').read_text())
    assert 'CC BY 4.0' in data['licence']
    assert 'Dmitrii Gluzdov' in data['source_attribution']
    assert (ROOT/'research/gemma4/references/make_synthetic_adapter.py').is_file()
