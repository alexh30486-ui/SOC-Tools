# Spectacle SOC v11 — Unified release and acceptance evidence

## Included modules

- **Frontend**: `web/src/` React/TypeScript and Tailwind-styled dashboard; compiled `web/index.html`, standalone `web/preview-offline.html`, source and build scripts. The standalone preview bundles its offline runtime and displays synthetic data, not a live SIEM feed.
- **Investigations**: log Hunt, case intake, event timeline, evidence export, triage and analyst history, structured reporting, Threat Intel, and guided help.
- **Playbooks**: versioned SOC response procedures, guided runs, linter and policy checks.
- **Network Diagnostics**: `web/src/soc-network-lab.tsx` + `api/spec_api/net_diagnostics.py`, authenticated `/v1/network/status` and `/v1/network/execute`; synthetic mode, allowlisted live server probes, ICMP/DNS/TCP/UDP, bounded timeout, limited commands, audit logging, and structured evidence receipt. A silent UDP probe is inconclusive. No general-purpose shell or WebSocket endpoint is implemented.
- **AI/model evidence**: `web/src/soc-model-lab.tsx`, generated `web/src/gemma-research.ts`, 30 SHA-256-verified files under `research/gemma4/references/`, baseline/adapter historical gate and readiness indicators. The uploaded adaptation evaluation has verdict **NO-GO (base 4 resolved vs adapter 2 in a 32-run-per-route mini evaluation)**. Do not deploy an adapter based solely on this evidence.
- **Backend**: local SQLite mode by default; optional Supabase storage and Redis work queue when separately configured; workspace authorization, synthetic Kyle dataset, role-aware triage, API audit events.
- **Build/tests**: `run.sh`, `.env.example`, `tools/`, API and browser checks, `release/` acceptance logs, screenshots, source SHA-256 manifest and Ronnie backlog.

## Measured checks in this release

| Suite | Actual result | Evidence | Notes |
| --- | --- | --- | --- |
| Chromium frontend | **20/20 PASS** | `release/FRONTEND_SMOKE_20.json` | Dashboard, navigation, terminal, command rejection, demo evidence export, model safety gate, mobile 390px |
| Network backend | **40/40 PASS** | `release/BACKEND_SMOKE_40.txt` | 37 existing network cases + 3 new cases; includes actual localhost TCP handshake and UDP echo/timeout, and HTTP API route checks |
| HTTP-over-TCP socket suite | **90/90 PASS**, plus one suite-size assertion | `release/TCP_SOCKET_90.txt` | Pytest reports 91 passed; **not WebSocket testing** |
| Full Python regression | **197 PASS + 5 subtests** | `release/FULL_REGRESSION.txt` | The suites overlap: do not add counts together |
| Release research integrity | **30/85 files SHA-256 matched**, zero mismatches | `release/RESEARCH_VERIFY.json` | Remaining 55 files are missing, not passed tests |

The reported results were executed on the local packaged source using Python, pytest, Chromium and Playwright. These checks do not prove production readiness, live cloud credentials, outside-network scanning, or model generalization.

## Verify after extraction

```bash
cd spectacle-soc
./run.sh
# In another terminal, with test dependencies installed:
PYTHONPATH=api python3 -m pytest -q tests/test_network_diagnostics_v10.py tests/test_network_smoke_extension_v11.py
PYTHONPATH=api python3 -m pytest -q tests/test_socket_release_v9.py
python3 tests/smoke_frontend_v11.py   # needs Playwright and Chromium
python3 tools/verify_gemma_research.py
```

To rebuild the browser application after editing source: `cd web && python3 build.py index.html && python3 ../tools/build_offline_preview.py`. The prebuilt files work without a TypeScript compiler, but standard `web/index.html` loads React/Three.js from public CDNs. The standalone preview bundles an offline test runtime.

## Security and evidence limitations

All live network probes are **disabled by default**. Allow only specific targets and ports in the server environment; use a sandbox or an authorized lab. A TCP handshake checks connectability, not identity or safety. DNS resolution does not imply host reachability. UDP silence does **not** prove a port is closed; ICMP silence does not establish that a host is unreachable. The browser does not open arbitrary sockets or sniff traffic; live probes represent the server network vantage point.

A check of a structured AI claim is not semantic validation of arbitrary pasted model text. The file research receipts and benchmark metrics are historical. The model settings do **not** connect or serve a Gemma model. The published synthetic adapter is explicitly untrained; the historical LoRA evaluation is **NO-GO**. Full JSONL training trajectories, adapter weights and model weights are not included.

Supabase/Redis integration code is shipped but the cloud services were **not** validated with production credentials. The first deployment must be staged, with RLS, Redis TLS/isolation, event retention and threat intel data governance reviewed.

## Data-source and licensing attribution

Research files are distributed only if their byte counts and SHA-256 match `research/gemma4/references/release_manifest.csv`. The accompanying files retain third-party author attributions, the Apache-2.0 licenses and notices, plus the original README/technical notes describing the CC BY 4.0 measurements. Repository source licensing should be evaluated separately before public distribution.
