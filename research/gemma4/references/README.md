Training data, tools and measurements for LoRA adapters and submissions in the Gemma 4 Developer Agent competition. The dataset holds 1,670 resolved agent trajectories in the competition's chat template and nine-tool format, split into 56,702 prompt and target training steps, together with an offline check of the submission archive, a probe that confirms an adapter changes the served model's output, and the measured time per task of the 31B and 12B models.

![Left: 103 native Gemma 31B trajectories, 14 external A, 729 external B and 824 external B2 trajectories. Right: share of training steps with context up to 8k, 8–16k and 16–32k tokens per tier.](https://raw.githubusercontent.com/Gluzdov-Dmitrii/Gemma-4-Developer-Agent/main/kaggle-datasets/gemma-4-serving-and-lora-verification-kit/lora_data_dark.png)

## Quick start

The example reads training steps from either supported Kaggle mount location.

```python
import sys
from pathlib import Path
slug = 'gemma-4-serving-and-lora-verification-kit'
D = next(p for p in (Path('/kaggle/input/datasets/dmitriigluzdov') / slug, Path('/kaggle/input') / slug) if p.is_dir())
sys.path.insert(0, str(D))
from lora_data import iter_steps
steps = list(iter_steps(D, tiers=('native', 'external_A'), max_context_tokens=16384))  # add 'external_B', 'external_B2' for the full set
print(len(steps), 'steps')
print(steps[0]['prompt'][-300:])
print(steps[0]['completion'][:300])
```

Each step is a prompt (`prompt`, the full rendered history) and a target (`completion`, one assistant turn). Any prompt–completion SFT trainer can use them with the loss on the target; tokenize the prompt with `add_special_tokens=False`, because it already starts with the BOS token. Native steps also carry the token IDs as served (`prompt_token_ids`, `completion_token_ids`); train on those rather than retokenizing, because 26 of the 1,766 native targets do not round-trip through the tokenizer. The archive checker accepts a user-supplied submission archive. The agent YAML and submission archive mentioned below are user-created inputs, not packaged dataset files.

## Training data

| Tier | Files | Trajectories | Steps (context ≤ 16k) | Target tokens | Content |
|---|---|---|---|---|---|
| Native | `lora_native_resolved.jsonl` | 103 on 55 tasks | 1,766 (1,761) | 0.52M | Gemma 4 31B with the Budget-Fit configuration on the official serving stack, on public SWE-rebench tasks: prompts and token IDs as served (privacy edits flagged) and the model's own reasoning. |
| External A | `lora_external_A.jsonl` | 14 | 382 (321) | 0.08M | Public trajectories within 28 tool calls, converted with stricter checks; free text between actions omitted. |
| External B | `lora_external_B.part000.jsonl`, `lora_external_B.part001.jsonl`, `lora_external_B.part002.jsonl`, `lora_external_B.part003.jsonl` | 729 on 729 tasks | 25,165 (13,110) | 4.30M | Public trajectories of Qwen3-Coder-480B within 40 actions, adapted to the nine tools. |
| External B2 | `lora_external_B2.part000.jsonl`, `lora_external_B2.part001.jsonl`, `lora_external_B2.part002.jsonl`, `lora_external_B2.part003.jsonl` | 824 on 473 tasks | 29,389 (15,440) | 4.90M | Second and third resolved attempts of B tasks. |
| Native unresolved | `lora_native_unresolved.jsonl` | 56 on 30 tasks | 1,228 | 0.45M | Failed attempts for failure analysis or preference pairs, not positive data. |

`lora_index.csv` lists every trajectory with file, line, tier, issue, attempt rank, steps, target tokens and maximum context. `lora_recipe.md` describes the record format and how to choose a mixture; `lora_data.py` reads the files with the standard library only. External tools were mapped as shell → `run_command`, file view → `read_file`, replacement → `edit_file`, creation → `write_file` and finish → `submit_patch`.

Points to check before training:

- The native trajectories use the Budget-Fit settings of 28 tool calls and 8 minutes per task (recovery calls can add a few); external B and B2 allow up to 40 actions. Keeping the native tier in the mixture keeps the pace close to those limits.
- About half of the external steps need more than 16k tokens of context.
- Sweep the adapter scale `lora_alpha / r` first; a [public report](https://www.kaggle.com/competitions/gemma-4-developer-agent/discussion/750713) by icfoer saw repeated commands and a zero score at scale 2.0 (rank 16, alpha 32). `check_submission.py` prints the scale and warns above 1.0.
- Confirm that agent YAML names the adapter and that `probe_adapter_effect.py` shows a changed output on the served model.

## Trained small-model adapters

Two experimental E4B adapters are included in `e4b_adapter_learning_rate_0_00002.zip` and `e4b_adapter_learning_rate_0_000005.zip`. Each archive contains the configuration, weights, licence and modification notice. Both train on original synthetic repair tasks using model-generated successful attempts. The recipe and exact data/weight receipts are in `e4b_training_recipe.md` and `e4b_training_receipts.json`; original tasks are in `e4b_synthetic_tasks.jsonl`, with the split in `e4b_synthetic_manifest.json`. Executed training and data construction code are in `e4b_train.py` and `e4b_build_onpolicy.py`. Tokenized training turns and captured collection histories are unavailable in this local export; hashes and selection receipts are included, so byte-identical retraining needs those missing inputs.

The base model is [Google Gemma 4 E4B](https://huggingface.co/google/gemma-4-E4B-it-qat-w4a16-ct/tree/6cd26aaa2357fb2bad8c51699a7558a4d1a965bb), under [Apache 2.0](https://ai.google.dev/gemma/apache_2). The adapter weights are modifications by Dmitrii Gluzdov; licence texts and notices accompany the archives and are also in `e4b_APACHE_LICENSE.txt` and `e4b_NOTICE.txt`. These small-model adapters have separate experimental provenance from the historical 31B trajectory collection above. On one exposed local 40-task panel, base solved 5 tasks, the higher learning rate 7 and the lower rate 4. The nominal paired sign-test p value for the higher rate is 0.625; repository dependence further limits inference. Valid tensors and a served-output effect establish adapter loading. The higher-rate adapter added to the same E4B agent scored 0.06 on the public leaderboard (2026-11-07), against 0.05 for the base agent; this difference is within the run-to-run variation of about one to two tasks, so no hidden-task benefit is shown. The [companion results dataset](https://www.kaggle.com/datasets/dmitriigluzdov/gemma-4-task-soundness-and-local-results) carries task outcomes and the earlier unsuccessful pilot.

## Serving checks

![Left: an untrained test adapter lowers the log-probability of the base model's top next token by at least 4.89 nats; control runs drift by at most 0.125. Right: mean per task with one client, 31B takes 144 s and 5.0k generated tokens, 12B with a five-minute cap 253 s and 16.2k tokens.](https://raw.githubusercontent.com/Gluzdov-Dmitrii/Gemma-4-Developer-Agent/main/kaggle-datasets/gemma-4-serving-and-lora-verification-kit/overview_dark.png)

| Main file | What it contains |
|---|---|
| `check_submission.py` | Offline check of submission archive: file name, one root configuration, one permitted model, adapter structure, rank and scale, token limits, size, and the time budget for sequential scoring. |
| `make_synthetic_adapter.py`, `probe_adapter_effect.py`, `gate_measurements.csv`, `gate_result.json` | A deliberately untrained adapter and a probe showing that the served adapter changes next-token probabilities far beyond noise. |
| `serial_timing_calibration.csv` | Speed with one client: 31B about 35 and 12B about 64 generated tokens per second of agent time (tool time included), and the tokens and seconds each spends per task. |
| `gemma4_12b_loader_fix.md` | Why an older copy of the official vLLM build cannot load the 12B model, and the one-file official fix. |
| `serve_official.py`, `served_render_reference.py`, `served_prompt_checks.csv`, `official_wheel_hashes.csv` | The recorded official serving path, prompt-rendering checks and wheel hashes. |
| `adaptation_evaluation.json`, `adaptation_loss_changes.csv` | An earlier short adaptation experiment: lower loss on held-out examples, but fewer solved tasks in a small check. |
| `budget_aware_*`, `public_bundle_catalogue.csv`, `public_notebook_catalogue.csv`, `ideas.csv` | The credited public budget-aware agent, and a dated map of 187 public notebooks and 74 mechanisms. |

Column definitions and provenance are in `TECHNICAL_NOTES.md`, `lora_build_notes.md`, `data_dictionary.json` and `idea_map_data_dictionary.json`.

## How it was made

Native trajectories are runs of Gemma 4 31B with the Budget-Fit configuration on verified public tasks from [SWE-rebench](https://huggingface.co/datasets/nebius/SWE-rebench) and [SWE-rebench-v2 clean Python tasks](https://huggingface.co/datasets/whitecircle/swe-rebench-v2-clean-python-tasks), graded with each task's tests; none of them is a competition task. The packaged attempts cover 81 tasks: 103 resolved trajectories on 55 tasks and 56 unresolved attempts on 30 tasks, four tasks in both. External trajectories come from [Nebius SWE-rebench OpenHands trajectories](https://huggingface.co/datasets/nebius/SWE-rebench-openhands-trajectories/tree/35455389ab51bf5e2306bfd436ef72d0f98bf882) (revision 3545538) with task metadata from [SWE-rebench](https://huggingface.co/datasets/nebius/SWE-rebench). They were kept when the source marks them resolved, use at most 40 acting calls, come from repositories under MIT, Apache 2.0, BSD or ISC licences, do not overlap the competition's public tasks (11 trajectories on 5 tasks come from httpx, a repository with one competition task) and fit 32,768 tokens; planning calls and free text between actions were removed. Every step was rendered with the Gemma 4 chat template and checked with the official tokenizer. Credentials, private paths and user names were redacted; counts are in `lora_validation.json`. External success labels were not re-graded and their tool outputs were not re-executed. A benefit of training on these data has not been measured.

## Updates

- **2026-11-07:** experimental E4B adapter weights, original synthetic tasks, training recipes and receipts; README synchronized with the card.

- **2026-10-20 (correction):** native token IDs in the loader, fixed validators, corrected tier descriptions, limits wording and credits.
- **2026-10-20:** LoRA training data in four tiers with a loader, index and guide; adapter-scale warning in the archive check; 12B loader note, single-client speed measurements and technical notes.
- **2026-10-19:** offline archive check.
- **2026-10-15:** public notebook catalogue, mechanism map and the credited budget-aware agent.
- **Earlier versions:** serving fidelity checks, adapter-effect probes and adaptation diagnostics.

## Licence and credits

Original measurements, documentation and the native trajectories: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Native task texts come from SWE-rebench (Nebius) and [SWE-rebench-v2 clean Python tasks](https://huggingface.co/datasets/whitecircle/swe-rebench-v2-clean-python-tasks) (White Circle, derived from [Nebius SWE-rebench-V2](https://huggingface.co/datasets/nebius/SWE-rebench-V2)), all CC BY 4.0. External trajectories are derived from the Nebius SWE-rebench OpenHands trajectories ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), credit Nebius), generated with [Qwen3-Coder-480B-A35B-Instruct](https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct) (Apache 2.0, text in `lora_teacher_licence.txt`); repository excerpts in all tiers remain under their repositories' licences, with the licence texts and notices in `lora_sources_native.json` and `lora_sources_external_*.json`. Original utilities are Apache 2.0, and the loader excerpt in `gemma4_12b_loader_fix.md` is quoted from [vLLM](https://github.com/vllm-project/vllm) (Apache 2.0). The budget-aware agent is by [Igor Zharov](https://www.kaggle.com/code/flexonafft/gemma-4-budget-aware-coding-agent-v2) on the Budget-Fit core by [Wilmer E. Henao](https://www.kaggle.com/code/verracodeguacas/gemma-4-agent-budget-fit-single-agent), both Apache 2.0. Tools, conversion and measurements by Dmitrii Gluzdov.
