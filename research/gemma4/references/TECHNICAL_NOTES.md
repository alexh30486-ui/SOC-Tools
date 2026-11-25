# Technical notes

The complete earlier description of this dataset, kept for definitions, provenance and limitations. The short card on the dataset page summarizes it.

## Scope

Aggregate evidence and reference utilities for serving fidelity and low-rank adaptation (LoRA) in a Python issue-repair agent. The historical diagnostics distinguish adapter loading, measurable inference effects, prompt-token fidelity and task-level repair outcomes. A short adaptation experiment reduced target-token loss without passing its task-quality gate.

## Data dictionary

matched and total describe aggregate checks; prompt-length equality is weaker than token identity. Adapter-effect values use natural-log probability units (nats). relative_change_pct is the percentage change in token-mean negative log-likelihood; lower loss does not imply better repair quality. Full per-column definitions appear in `data_dictionary.json` and each file description.

## Provenance

The tables are derived from completed local measurements and attributed public observations. `provenance.json` records source dataset snapshots and SHA-256 hashes; `manifest.json` verifies the published files. The historical diagnostic tables omit issue texts and traces. The current results release includes validation issue texts and reference/test patches; the current kit includes native and external training trajectories. Model weights are not included.

## Limitations

The serving measurements use a recorded historical software stack and one A100 with tensor parallelism 1. They do not establish current private-scorer behavior. Synthetic adapters are untrained controls. The adaptation mini-evaluation is a small regression check on a previously inspected repository.

## Related research

[Companion notebook](https://www.kaggle.com/code/dmitriigluzdov/gemma-4-task-soundness-serving-and-evaluation).

## License

Original measurements and documentation: Creative Commons Attribution 4.0 (CC BY 4.0). Reference Python utilities: Apache License 2.0. The three notebook-built agent archives are Apache-2.0; original notebook authors and contributions are recorded in `credits.json`.

## Public catalogue and archives

The public bundle catalogue is a score/licence snapshot checked October 13, 2026, with exact scored-source links. The 187-notebook idea catalogue is dated October 14, 2026. Catalogue entries are links only. In the October 13, 2026 notebook snapshot, the reduced-thinking archive halved the Budget-Fit thinking ceiling. Its CPU compiler receipt is structural evidence only. That snapshot also built reference and issue-contract archives. Later notebook revisions select the Budget-Fit archive.


## Public idea map and fresh paired screen — October 15

Added a 187-notebook public metadata catalogue, 74 mechanism descriptions, and the Apache-2.0 budget-aware bundle with member bytes matching its public v10 snapshot with full credits and licence. Counts describe source presence, not proven tool use or causal score effects.

Full new-column definitions and provenance accompany the additions. At the October 15, 2026 release, the earlier files were unchanged. [Idea-map notebook](https://www.kaggle.com/code/dmitriigluzdov/gemma-4-public-agent-ideas-and-evidence).

## Archive check — October 19

`check_submission.py` reads a submission archive without extracting it and applies the published harness rules: the exact file name, one root configuration at the archive root, accepted file extensions, no links or path traversal, an unpacked size below 3 GiB, one permitted base model across all agents, adapter structure with LoRA rank up to 128, packaged adapters for every reference, and the output and thinking token ceilings. It also prints the per-task budget and the worst-case sequential time. Runtime figures are planning arithmetic: a passing check does not show that a run finishes in time, and the official compiler remains the authority. PyYAML is the only dependency.

## Catalogue availability — October 20, 2026

Three catalogue links were unavailable on October 20, 2026: `lavinwins/gemma-4-ultimatum-machine`, `magicsword001/robust-edit-reliable-edits-for-gemma-4-agents` and `segamega/chronos-completion-authority-separated-agent-harn`. The dated catalogue values are retained.
