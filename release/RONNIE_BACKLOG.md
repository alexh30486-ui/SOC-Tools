# Ronnie backlog — next verified release blockers

These issues distinguish missing prerequisites from actual regressions. All 20 frontend and 40 backend smoke checks pass in this release. No failing test is being hidden as a "production ready" claim.

## SOC-001 — Gemma/LoRA runtime not connected (P1 / functional gap)

- **Actual:** Models & adapters shows verified historical measurements and **NO-GO** for the supplied adaptation experiment. The app serves no trained adapter or model weights.
- **Expected:** A controlled model service provides task suggestions in shadow mode and passes a SOC-specific benchmark before its recommendations can reach analysts.
- **Reproduce:** Open Workspace → Models & adapters → Agent safety gate / Runtime settings; runtime remains offline. Historical adaptation_evaluation.json reports 4 base resolved vs 2 adapter resolved.
- **Root cause:** No trained adapter weights, compatible model files, tokenizer, inference endpoint or proven SOC investigation trajectories were uploaded. The developer-agent dataset specializes in software repair, not security response.
- **Inputs required:** Versioned model/adapter artifacts and license, tokenizer/template, endpoint URL and auth strategy, SOC-labeled evaluation cases, expected tool schema, latency/GPU budget, approval policy.
- **Exit criteria:** Adapter digest validated; 0 unsafe tool executions; evidence IDs preserved; paired base-vs-adapter SOC evaluation passes a predeclared gate; shadow-mode audit complete. Do not auto-enable destructive actions.

## SOC-002 — Research manifest incomplete: 55/85 files missing (P2 / data completeness)

- **Actual:** 30 of 85 listed reference assets are SHA-256 matched and bundled; 55 not supplied. Zero hash mismatches in those present.
- **Expected:** Every requested research asset present and verified, or scoped-out with explicit provenance.
- **Reproduce:** `python3 tools/verify_gemma_research.py`.
- **Inputs required:** Remaining files from the manifest, including any intended tokenizer and multi-GB trajectory assets provided through a secure/appropriate distribution path; do not embed gigabytes or model weights in a public frontend.
- **Exit criteria:** 85/85 matched if all are required, with licensing/redistribution review; otherwise record exception list.

## SOC-003 — Browser cannot send arbitrary raw UDP/ICMP (P2 / platform boundary)

- **Actual:** Terminal demo is synthetic. Authenticated live requests are routed through an allowlisted API server; WebSocket push is not present. Live probes are disabled by default.
- **Expected:** Authenticated analysts may run authorized server-vantage network diagnostics; a future streaming interface can display progressive status without exposing a shell.
- **Reproduce:** Open Network terminal → Live server probes without admin configuration. UI shows `SERVER DISABLED` and refuses execution. For UDP, no response returns `inconclusive`.
- **Cause:** Browser socket restrictions and deliberate SSRF/network-scan safeguards. This is not a bug to bypass.
- **Inputs required:** Lab network/target allowlists, approved ports, DNS policy, worker topology, authorization roles, traffic auditing and rate policy, any intended WebSocket contract.
- **Exit criteria:** Dedicated authorized staging service; red-team review; login and role tests; no ability to query disallowed networks, run shell operators or export unauthenticated raw traffic.

## SOC-004 — Real Supabase and Redis not acceptance-tested (P1 for production / integration gap)

- **Actual:** Local SQLite/inline runs are verified; optional adapters exist but no live cloud connection was tested in this environment.
- **Expected:** Staged database migrations, tenant isolation, RLS policies, Redis duplicate-job recovery, retries and audit trail verified against dedicated test infrastructure.
- **Inputs required:** Staging-only Supabase URL and server-side secret provisioning (not pasted into public UI), Redis TLS URL, organizational tenancy model, retention policy.
- **Exit criteria:** Containerized integration suite passes, cross-tenant requests denied, reconnect and restart tested, provider data never leaks to browser.

## SOC-005 — Offline preview / static hosting performance (P3 / environment)

- **Actual:** Standalone HTML contains an embedded offline runtime and may load slowly through restricted mobile `file://` browser harnesses. Chromium render via isolated document injection passes 20/20 and 390px overflow check.
- **Expected:** Repeatable direct-file and HTTP-hosted performance on Safari/iPhone, Chromium/desktop, and staging production builds.
- **Inputs required:** Target device/browser versions, performance budgets, realistic large event fixture, CI browser infrastructure.
- **Exit criteria:** Test direct-file, localhost HTTP and deployment; document first-contentful-render and JS errors with screenshots.

## Release rule

Do not count manifest asset verification as executable test cases. Do not count model-output change as accuracy or a LoRA promotion pass. Keep synthetic network results distinct from server-observed results. The explicit test criteria are **20/20 frontend**, **at least 30/40 backend** (achieved 40/40), and **at least 85/90 TCP scenarios** (achieved 90/90). CI should rerun the three suites at every release and block packaging when thresholds regress.
