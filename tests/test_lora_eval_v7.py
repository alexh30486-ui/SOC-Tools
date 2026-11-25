"""V7 LoRA evaluator regression tests: stdlib and synthetic only."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('lora_eval',ROOT/'tools/lora_eval.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class LoraEvaluation(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory()
        self.dir=Path(self.t.name)
    def tearDown(self):self.t.cleanup()
    def make_rows(self,name,rows):
        p=self.dir/name
        p.write_text(''.join(json.dumps(x)+'\n' for x in rows),encoding='utf8')
        return p
    def test_sample_dataset(self):
        p=ROOT/'samples/lora-eval/steps.jsonl'
        self.assertEqual(module.dataset(p,3,2)['status'],'pass')
    def test_prevent_leakage_by_trajectory_not_row(self):
        p=self.make_rows('d.jsonl',[{'trajectory_id':'same','split':'train'}, {'trajectory_id':'same','split':'test'}])
        self.assertEqual(module.dataset(p)['status'],'needs_review')
    def test_invalid_rows_fail(self):
        p=self.dir/'d.jsonl';p.write_text('{BAD\n')
        with self.assertRaises(ValueError):list(module.rows(p))
    def test_id_count_mismatch(self):
        p=self.make_rows('d.jsonl',[{'trajectory_id':'case-1','split':'train'}])
        self.assertIn('Expected 1670',module.dataset(p,expected_trajectories=1670)['issues'][0])
    def test_missing_ids_flag(self):
        p=self.make_rows('d.jsonl',[{'prompt':'x','target':'y','split':'train'}])
        self.assertEqual(module.dataset(p)['rows_without_trajectory_id'],1)
    def test_compare_paired(self):
        a=ROOT/'samples/lora-eval/base-results.jsonl';b=ROOT/'samples/lora-eval/adapter-results.jsonl'
        r=module.compare(a,b)
        self.assertEqual(r['paired_tasks'],4)
        self.assertEqual(r['pass_rate_delta_pp'],25.0)
        self.assertEqual(r['baseline_latency']['median_seconds'],355.0)
    def test_duplicate_task_rejected(self):
        a=self.make_rows('a.jsonl',[{'task_id':'x'},{'task_id':'x'}]);b=self.make_rows('b.jsonl',[{'task_id':'x'}])
        with self.assertRaisesRegex(ValueError,'repeated task_id'):module.compare(a,b)
    def test_probe_measures_effect_not_quality(self):
        p=ROOT/'samples/lora-eval/adapter-probe.json'
        r=module.probe(p)
        self.assertTrue(r['output_changed'])
        self.assertFalse(r['quality_improvement_demonstrated'])
    def test_probe_requires_matching_settings(self):
        x={'prompt_id':'a','base_output':'one','adapter_output':'two','same_prompt':False}
        p=self.dir/'probe.json';p.write_text(json.dumps(x))
        self.assertFalse(module.probe(p)['conditions_comparable'])
    def test_archive_structure_valid_no_adapter(self):
        p=self.dir/'submission.zip'
        with zipfile.ZipFile(p,'w') as z:z.writestr('agent.yaml','model: gemma-4-31b-it-qat-w4a16-ct')
        self.assertEqual(module.archive(p)['status'],'structurally_plausible')
    def test_archive_path_traversal_flags(self):
        p=self.dir/'submission.zip'
        with zipfile.ZipFile(p,'w') as z:
            z.writestr('agent.yaml','model: x')
            z.writestr('../escape.txt','bad')
        self.assertEqual(module.archive(p)['status'],'needs_review')
    def test_archive_lora_pair_required(self):
        p=self.dir/'submission.zip'
        with zipfile.ZipFile(p,'w') as z:
            z.writestr('agent.yaml','model: x')
            z.writestr('adapters/main/adapter_config.json',json.dumps({'r':32,'lora_alpha':64}))
        self.assertTrue(any('weights missing' in e for e in module.archive(p)['issues']))

if __name__=='__main__':unittest.main()
