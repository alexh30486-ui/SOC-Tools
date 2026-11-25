# Spectacle SOC v7 — Playbook intelligence + Gemma 4 adapter evaluation kit

**Status:** Runnable local web application and offline evaluator. No model trained and no external inference connection created.

## Included

- Full v6 SOC dashboard and workflows (Hunt, Case, Event Timeline, Threat Intel, Reports, Supabase/Redis adapters).
- 5 additional investigation playbooks, linted together with the original 4.
- Evidence-first, local rule-based playbook suggestions. Suggested run button uses the **live version** and creates a version-pinned checklist; it does not execute security actions.
- Better Playbooks screen with step sequence, evidence checklist, and manual approval labels.
- Existing user libraries do not get overwritten: optional import of missing reference playbooks.
- Offline dataset inspection, trajectory-level split leakage checks, paired benchmark summary, effect probe and ZIP structure audit for Gemma 4 competition artifacts.
- Self-contained HTML frontend preview based on the same TypeScript source.

## Run

```bash
./run.sh
```

Open `http://localhost:8080`. For a read-only standalone preview, open `web/preview-offline.html`; the preview has no backend connection.

## Rebuild

```bash
python3 web/build.py index.html
python3 tools/build_offline_preview.py
```

## Verification record

- `python3 tools/playbook_lint.py`: 9 procedures, 0 problems.
- `python3 -m pytest -q tests/test_lora_eval_v7.py tests/test_playbook_lint.py`: 20 tests + 5 subtests passed.
- Combined API and integration suite: 61 passed, two **existing** signup tests returned HTTP 429 when run together. Both affected tests passed individually in separate invocations.
- Desktop headless browser **before the final procedure-summary styling change**: recommendation selection, version-pinned run start and no horizontal overflow passed. Later full preview compiled, but fresh desktop/mobile browser attempts encountered environment timeouts; the final visual check remains incomplete.

## Boundaries

The uploaded trajectory dataset and the user's adapter/benchmark files have **not been provided in this exchange**. Figures 1,670 trajectories and 56,702 steps are user-reported, **not independently verified**. The included sample model metrics are synthetic fixtures only.

The LoRA tools do not perform GPU training, execute adapters, connect to Kaggle, or measure hidden leaderboard outcomes. Deployment settings/competition eligibility can change; consult Kaggle's official rules prior to entry and submission. Playbook approval labels are workflow reminders only; they are not a verified multi-person containment authorization service.
