# Spectacle SOC v7 — Better playbooks + optional Gemma 4 LoRA evaluation

## What changed in the application

- Five **new** full-length, source-first playbooks: `password-spray`, `successful-login-after-failures`, `outbound-data-transfer`, `backend-5xx-stability`, and `agent-decision-review`.
- Playbooks route to a **recommended guided run** based on case findings and event summaries. This is a **local rules matcher**, not a hosted LLM, real-time detection engine, or confidence probability.
- An analyst must intentionally start the run. All action/checks marked `(needs approval)` appear as approval gates in the run. The UI **does not execute containment**.
- Existing workspaces with a customized library are preserved. Use “Add updated playbooks to my library” to install missing starter procedures. New workspaces automatically receive the full catalog. Existing draft/version history is unchanged.
- Run page now displays an advisory and report-readiness counts.

## Optional Gemma 4 LoRA evaluation kit

No dataset, model weights, GPUs, Kaggle account, or competition submission was supplied for this upgrade. **No adapter was trained or executed.** The tools below operate offline and only inspect files you explicitly pass to them.

```bash
# Dataset structure, unique-trajectory accounting and leakage detection
python3 tools/lora_eval.py dataset trajectories.jsonl --expected-trajectories 1670 --expected-steps 56702

# Compare model runs on exactly paired task IDs; use real verifier PASS/FAIL
python3 tools/lora_eval.py compare --base 31b_base.jsonl --adapter 31b_lora.jsonl

# Verify the same prompt / seed / decoding settings and loaded adapter changed an output
python3 tools/lora_eval.py probe adapter-probe.json

# Inspect ZIP filenames, expected root and LoRA PEFT artifacts; does not execute submission
python3 tools/lora_eval.py archive submission.zip
```

The comparison input is JSONL with at least `task_id`, `passed` and optional `elapsed_seconds`, `tool_format_valid`, `unauthorized_action`. The per-task rows must be produced by a real verifier and run on comparable hardware. The tool computes paired solve-rate change with a 1,000-resample bootstrap interval and per-model latency statistics. It is exploratory with small samples, not a competition score.

Dataset JSONL should carry `trajectory_id` (or `traj_id`, `episode_id`, `run_id`, `task_id`) and `split` on each row. This catches cross-split contamination when the same trajectory is split into multiple steps. If your original template omits these fields, add metadata in a **copy**, keeping the official chat messages, tool schemas and model control tokens unchanged. Use assistant-only loss masking, group train/validation/test by trajectory or original task, and validate tool schemas.

`probe` input must include:

```json
{
  "prompt_id": "a stable shared ID",
  "base_output": "exact response from the base model",
  "adapter_output": "exact response with LoRA selected",
  "same_prompt": true,
  "same_seed": true,
  "same_sampling_settings": true,
  "adapter_confirmed_loaded": true
}
```

A changed output is **only evidence that the adapter may have influenced generation**. It is not proof of improved tool use or task success. Keep the probe separate from the held-out benchmark. The archive audit checks ZIP paths, root `agent.yaml`, and optional PEFT adapters, but cannot certify competition acceptance or a Kaggle run.

## Proposed experiment (once real data is available)

1. Audit actual 1,670 trajectories / 56,702 steps, tool schemas and train/validation split. Remove secrets; avoid sharing private repository code without permission.
2. Establish a **base-model prompt-only baseline** on held-out tasks. Collect task PASS/FAIL from actual tests, valid tool-call rate, unauthorized action count, time per task, GPU memory and timeouts.
3. Try **QLoRA rank 32 / alpha 64**, starting with a small high-quality sample and assistant-only target masking, then measure adapter behavior using a controlled probe.
4. Run the same held-out tasks with the adapter. Reject if the solve rate drops or the invalid-tool/unauthorized-action rate worsens; compare cost and latency on the same hardware.
5. Measure 31B versus 12B only where each variant is supported in the current competition harness; do not mix base models within a single submission. Check [official rules](https://www.kaggle.com/competitions/gemma-4-developer-agent) close to submission time.
6. For **SOC-specific** LoRA, build an additional permissioned dataset of reviewed, de-identified SOC investigation decisions. The software-agent trajectories alone do not teach network forensics or security verdicts.
7. Deploy in **shadow/read-only mode** until evals and human review pass. Never let an LLM initiate account disabling, isolation, deletion, or network blocks.

## Sources used for the design

- https://gemma.ai/tuning/ (RAG vs LoRA; fine-tuning goals)
- https://gemma.ai/tuning/qlora/ (rank and alpha, adapted projections)
- https://gemma.ai/tuning/datasets-formatting/ (Gemma 4 chat template and assistant-only completion masking)
- https://www.kaggle.com/competitions/gemma-4-developer-agent (competition scoring, supported model rules and timeline)

## Limitations

The app's playbook recommendations still use local text matching; they do **not** query Supabase, Redis, Kaggle, or an inference server by themselves. The sample evaluations in `samples/lora-eval/` are fabricated strictly for testing the evaluator, not derived from your 1,670 trajectories.
