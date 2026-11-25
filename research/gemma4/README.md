# Gemma 4 research in the Spectacle SOC app

Open **Spectacle SOC → Workspace → Models & adapters**. That is the normal application settings page; no separate offline tool is required to view measurements, the verification receipts, or configuration planning. **Playbooks** links directly to this page.

The app's model page is populated from `research/gemma4/receipt.json`, generated from the original uploaded and SHA-256-verified reference files. The browser displays the four published training tiers, recorded serial 31B/12B timing measurements, prompt-render comparisons, historical validation scope, missing/present release files, and server connection status. The page can SHA-256 check selected files **locally in the browser** (recommended <25MB per file). Export creates a structured JSON receipt. Planning controls save only the preferred model and task budget to localStorage. They DO NOT enable a server or run tools. Human approval stays mandatory.

`references/` contains original uploaded source files and the supplied manifest. **30/85** manifest entries were supplied and hash-matched; the other 55 are explicitly listed as missing. This count is the research-file inventory, not a test-pass score. The original multi-gigabyte JSONL training corpus, tokenizer assets, model weights, and trained adapter weights were NOT uploaded, so LoRA training, full tokenizer validation, and model serving cannot honestly be claimed. The historical `release_validation.json` reports a smoke check of ONE trajectory per each of 11 files, not a full re-run here. The source papers and tool scripts are archival references, not automatically trusted executables.

## Refresh with a later file batch

1. Place incoming downloaded source files in a directory; do not execute untrusted scripts.
2. `python tools/refresh_gemma_research.py --incoming /path/to/new/batch` — this accepts only files with filenames, byte sizes and SHA-256 that match the original release manifest.
3. `cd web && python build.py && python ../tools/build_offline_preview.py` — rebuild the integrated application and preview.
4. `python tools/verify_gemma_research.py` — verify every present source file against its original digest.

`tools/build_gemma_receipts.py --source-dir /path/to/full/source/export` can rebuild the entire reference snapshot from a full batch. A mismatched source file is never ingested.

## Source, copyright, limitations

Source attribution: **Dmitrii Gluzdov**, *Gemma 4 Serving and LoRA Verification Kit*, Kaggle, public research (2026-10). https://www.kaggle.com/datasets/dmitriigluzdov/gemma-4-serving-and-lora-verification-kit. See `references/README.md`, `references/TECHNICAL_NOTES.md`, `references/provenance.json`, and original `references/lora_teacher_licence.txt` for further attribution and obligations. Original measurements, documentation and native trajectories are CC BY 4.0; reference utilities are Apache 2.0; third-party model/repo data may impose additional requirements. **Do not use these debugging measurements as proof of SOC threat detection accuracy or benchmark improvement.**
