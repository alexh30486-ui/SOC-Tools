# Spectacle SOC v8 — Model & adapter settings integrated

This version integrates the user-supplied Gemma 4 Serving and LoRA Verification Kit into the **normal application Settings navigation** (Workspace → Models & adapters) and links to it from Playbooks. It does not claim LoRA training, live inference or automatic containment.

## Included in the app

- **Dataset receipt:** 1,670 published resolved agent trajectories and 56,702 published training steps, split into four source-derived tiers. The full JSONL training files themselves are not bundled.
- **Performance:** Recorded 8-task single-client sample: 31B 3/8 resolved, 143.84 s average/task; 12B 1/8, 253.04 s average/task. These are historical measurements on one setup, not a representative model benchmark or current deployment speed.
- **Prompt fidelity:** 803/803 native and 133/133 held-out recorded prompt-length matches with the recorded `served_history` transformation; 5/5 identity probes, but only 765/803 native reconstructed target-count matches. Historical vLLM 0.19.1 / ADK 0.2.11 environment.
- **Integrity:** Original uploaded manifest has 85 expected files; 18 supplied files matched SHA-256 + byte count and are bundled unchanged. The remaining 67 are listed as missing in the UI. Historical release validation reports a *smoke sample* of one trajectory per 11 files; not a rerun by us.
- **Browser verification:** Upload files for a local SHA-256 check against the manifest; matching files show MATCH and modifications show MISMATCH. The fallback hash implementation is tested against standard SHA-256 digests.
- **Runtime planning controls:** select 31B or 12B and task-budget preference. Human approval remains on and these preferences do not change the backend or initiate inference. The UI explicitly says model weights and trained adapters are absent.
- **Source/attribution:** Original reference files, licence, scripts, provenance and research notes are included at `research/gemma4/references/` and documented in `research/gemma4/README.md`.
- **Incremental intake:** `tools/refresh_gemma_research.py` can verify and add later user-supplied batches, then regenerate the UI snapshot. It does not execute untrusted script content.

## Verification and limitations

The original app regression suite reported **64 pass, 2 signup rate-limit failures, and 5 subtests passed** when run together. The two failed signup tests passed independently; the failures reflect the shared in-memory rate limit between tests and do not affect the new UI.

`python -m pytest -q tests/test_model_receipts_v8.py tests/test_playbook_lint.py tests/test_lora_eval_v7.py` passes. The Playwright model-settings check tests desktop and 390px mobile, the historical metrics, SHA-256 acceptance/rejection and navigation. Browser `about:blank` may not permit persistent localStorage, in which case preferences remain only in component state and the UI reports this honestly.

The generated standalone preview includes the front end and demonstration backend only. For real inference, supply licensed model weights, trained adapter weights, an authenticated inference service, permissions, SOC-specific evaluation cases and explicit human approval gates. Do not feed untrusted training corpora into a model or allow execution of generated security actions without review.
