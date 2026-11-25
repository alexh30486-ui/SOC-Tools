#!/usr/bin/env python3
"""Build a read-only, source-verified research snapshot from uploaded Gemma 4 files.

This does not run a model, verify historic GPU runs, or train adapters.
Use --source-dir <folder of user-provided research files> to refresh the snapshot.
"""
import argparse
import csv
import hashlib
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def find_asset(root, name):
    variants=[name]
    stem, suffix = name.rsplit('.',1)
    variants.extend(f'{stem}({i}).{suffix}' for i in (1,8))
    if name == 'README.md':variants.append('README(8).md')
    return next((p for n in variants if (p:=root/n).is_file()),None)


def make_report(source, assets):
    manifest_file=find_asset(source,'release_manifest.csv')
    if not manifest_file:raise FileNotFoundError('release_manifest.csv is required')
    rows=list(csv.DictReader(manifest_file.open(encoding='utf-8',newline='')))
    index={r['file']:r for r in rows}
    if len(index)!=len(rows):raise ValueError('duplicate release manifest entries')
    verified,missing,mismatches=[],[],[]
    assets.mkdir(parents=True,exist_ok=True)
    for name,r in index.items():
        # Restrict copied paths to single root-level filenames, no traversal.
        if pathlib.PurePosixPath(name).name!=name or name in ('.','..'):
            raise ValueError('Invalid manifest filename: '+name)
        f=find_asset(source,name)
        if f is None:missing.append(name);continue
        sha=digest(f)
        if sha!=r['sha256'] or f.stat().st_size!=int(r['bytes']):
            mismatches.append({'name':name,'reason':'SHA-256 or byte count mismatch'})
            continue
        if f.resolve() != (assets/name).resolve():shutil.copy2(f,assets/name)
        verified.append({'name':name,'sha256':sha,'bytes':int(r['bytes'])})
    if manifest_file.resolve() != (assets/'release_manifest.csv').resolve():shutil.copy2(manifest_file,assets/'release_manifest.csv')
    release_path=assets/'release_validation.json'
    checks_path=assets/'served_prompt_checks.csv'
    speed_path=assets/'serial_timing_calibration.csv'
    if not all(p.exists() for p in (release_path,checks_path,speed_path)):
        raise FileNotFoundError('Expected measured receipts not all present and hash-matching')
    raw_release=json.loads(release_path.read_text(encoding='utf-8'))
    check_rows=list(csv.DictReader(checks_path.open(encoding='utf-8',newline='')))
    timing=list(csv.DictReader(speed_path.open(encoding='utf-8',newline='')))
    if len(timing)!=2 or not {'12B','31B'}<=set(r['model'] for r in timing):
        raise ValueError('Unexpected timing cohorts')
    readme_path=assets/'README.md'
    if not readme_path.exists():raise FileNotFoundError('manifest-verified README.md is required')
    contents=readme_path.read_text(encoding='utf-8')
    tier_rows=[]
    for line in contents.splitlines():
        if line.startswith('| Native |') or line.startswith('| External A |') or line.startswith('| External B |') or line.startswith('| External B2 |'):
            parts=[p.strip() for p in line.strip().strip('|').split('|')]
            count=int(re.search(r'^\d+',parts[2]).group(0))
            steps=int(parts[3].replace(',','').split(' ')[0])
            tier_rows.append({'tier':parts[0], 'trajectories':count, 'steps':steps})
    if len(tier_rows)!=4:raise ValueError('Unable to parse 4 published trajectory tiers')
    total_traj=sum(r['trajectories'] for r in tier_rows)
    total_steps=sum(r['steps'] for r in tier_rows)
    repo_license='Original measurements/docs CC BY 4.0; reference Python Apache 2.0; teacher licence and source-attribution obligations apply.'
    # Additional supplied agent evidence. All reads are from manifest-verified copies.
    agent_files=('budget_aware_agent.yaml','budget_aware_sampling.yaml','budget_aware_limits.yaml','budget_aware_system.md',
                 'budget_aware_bundle.json','budget_aware_credits.json','archive_compilation.json',
                 'archive_registry.json','adaptation_evaluation.json','adaptation_loss_changes.csv',
                 'budget_aware_APACHE_LICENSE.txt','budget_aware_NOTICE.txt')
    agent_evidence={'available':False,'source_checked':False,'deployment_ready':False}
    if all((assets/n).is_file() and any(v['name']==n for v in verified) for n in agent_files):
        ev=json.loads((assets/'adaptation_evaluation.json').read_text(encoding='utf-8'))
        comp=json.loads((assets/'archive_compilation.json').read_text(encoding='utf-8'))
        bundle=json.loads((assets/'budget_aware_bundle.json').read_text(encoding='utf-8'))
        registry=json.loads((assets/'archive_registry.json').read_text(encoding='utf-8'))
        agent=(assets/'budget_aware_agent.yaml').read_text(encoding='utf-8')
        limits=(assets/'budget_aware_limits.yaml').read_text(encoding='utf-8')
        sampling=(assets/'budget_aware_sampling.yaml').read_text(encoding='utf-8')
        tools_list=[line.strip()[2:] for line in agent.splitlines() if line.strip().startswith('- ')]
        bundle_checks={path:(digest(assets/spec['dataset_file'])==spec['sha256'])
                       for path,spec in bundle['members'].items()
                       if (assets/spec['dataset_file']).is_file()}
        agent_evidence={
          'available':True,'source_checked':True,'deployment_ready':False,
          'model':next((line.split(':',1)[1].strip() for line in agent.splitlines() if line.startswith('model:')),''),
          'tools':tools_list,'tool_count':len(tools_list),
          'limits':{'tool_calls':int(re.search(r'max_tool_calls:\s*(\d+)',limits).group(1)),
                    'turns':int(re.search(r'max_turns:\s*(\d+)',limits).group(1)),
                    'time_minutes':int(re.search(r'max_time_minutes:\s*(\d+)',limits).group(1)),
                    'command_timeout_seconds':int(re.search(r'timeout_seconds:\s*(\d+)',limits).group(1)),
                    'temperature':float(re.search(r'temperature:\s*([\d.]+)',sampling).group(1)),
                    'thinking_tokens':int(re.search(r'thinking_budget:\s*(\d+)',sampling).group(1))},
          'bundle':{'sha256_members_match':bundle_checks,'verified_members':sum(bundle_checks.values()),
                    'total_members':len(bundle['members']),
                    'public_score_author_reported':bundle['best_public_score'],
                    'score_is_new_local_measurement':False,'licence':bundle['license']},
          'archive':{'compile':comp['compile'],'archive':comp['archive'],
                     'inference_run':comp['inference_run'],'limitation':comp['limitation'],
                     'historical_package_versions':comp['packages']},
          'adaptation':{'verdict':ev['verdict'],'failed_gates':ev['failed'],
                        'baseline_resolved':ev['criteria']['minieval_resolved_not_worse_than_base_minus_1']['base'],
                        'adapter_resolved':ev['criteria']['minieval_resolved_not_worse_than_base_minus_1']['adapter'],
                        'runs_per_route':ev['protocol']['mini_evaluation_runs_per_route'],
                        'relative_dev_loss_change_pct':round(ev['criteria']['devval_nll_improves']['value']*100,2),
                        'quality_approved':False,'source':'Historical uploaded diagnostic, NOT a new SOC evaluation'},
          'archived_configurations':[{'name':x['configuration'],'time_cap_minutes':x['time_cap_minutes'],
                                      'thinking_tokens':x['thinking_tokens'],'local_quality_measured':x['local_quality_measured']}
                                     for x in registry],
          'attribution':'Apache-2.0 source credits/NOTICE preserved; see supplied budget_aware_credits.json and budget_aware_NOTICE.txt',
          'scope':'Static source verification only; not an executed model, serving test or competition score.'}
    return {
        'kind':'uploaded-gemma4-research-receipt-v1',
        'source_attribution':'Dmitrii Gluzdov, Gemma 4 Serving and LoRA Verification Kit (October 2026 public research)',
        'source_dataset':'https://www.kaggle.com/datasets/dmitriigluzdov/gemma-4-serving-and-lora-verification-kit',
        'dataset':{'tiers':tier_rows, 'resolved_trajectories':total_traj, 'training_steps':total_steps,
                   'present_in_app':False, 'note':'Totals describe the published dataset. Multi-GB JSONL training corpora are not present in these uploads.'},
        'receipts':{'listed_in_manifest':len(index),'verified_and_bundled':len(verified),'missing':missing,'mismatches':mismatches,
                    'verified':verified,'expected_assets':[{'name':r['file'],'sha256':r['sha256'],'bytes':int(r['bytes'])} for r in rows],'claim':'SHA-256 and byte sizes verified locally against uploaded release_manifest.csv. Source authenticity is not independently established.'},
        'serving_checks':[{'cohort':r['cohort'],'rendering':r['rendering'],'check':r['check'],'matched':int(r['matched']),'total':int(r['total'])} for r in check_rows],
        'timing':[{'configuration':r['configuration'],'model':r['model'],'tasks':int(r['tasks']),
                   'resolved':int(r['resolved']),'mean_agent_seconds':float(r['mean_agent_seconds']),
                   'mean_generated_tokens':float(r['mean_generated_tokens']),
                   'patch_submitted_share':float(r['patch_submitted_share']),
                   'generated_tokens_per_agent_second':float(r['generated_tokens_per_agent_second'])} for r in timing],
        'validation':{'historical_tokenizer_status':raw_release['tokenizer_validation']['status'],
                     'sample_per_file':raw_release['tokenizer_validation'].get('limit_per_file'),
                     'files':raw_release['tokenizer_validation'].get('files'),
                     'historical_archive_checker_pass':raw_release.get('archive_checker_pass'),
                     'historical_syntax_status':raw_release.get('syntax_checks',{}).get('status'),
                     'historical_privacy_scan_pass':raw_release.get('privacy_scan_pass'),
                     'source':'uploaded release_validation.json',
                     'limit':'Historical receipts; this build only reruns SHA-256 checks, not tokenizer inference, original source validation, or GPU probes.'},
        'agent_evidence':agent_evidence,
        'model_connection':{'server_connected':False, 'adapter_loaded':False,'model_weights_bundled':False,
                            'dataset_bundled':False,'soc_task_quality_verified':False},
        'licence':repo_license,
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir',type=pathlib.Path,required=True)
    parser.add_argument('--output',type=pathlib.Path,default=ROOT/'research/gemma4/receipt.json')
    args=parser.parse_args()
    dest=args.output.parent
    report=make_report(args.source_dir,dest/'references')
    args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    out=ROOT/'web/src/gemma-research.ts'
    out.write_text('/* Generated from manifest-verified user attachments, not live inference */\nconst SOC_GEMMA_RECEIPTS:any='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    print(json.dumps({'verified_and_bundled':report['receipts']['verified_and_bundled'], 'manifest_total':report['receipts']['listed_in_manifest'], 'missing':len(report['receipts']['missing']), 'mismatches':report['receipts']['mismatches'], 'resolved':report['dataset']['resolved_trajectories'], 'steps':report['dataset']['training_steps']}))

if __name__=='__main__':main()
