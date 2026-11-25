# Spectacle SOC v5 — Investigation refinements

The v4 Command Center remains intact. v5 introduces analyst disposition and review evidence tracing, aiming at fewer false positives and more accountable case handling.

## Included

- **Finding detail:** select any detection to inspect the exact rule, explanation, ATT&CK mapping, dataset, timestamps, matched source-event IDs and sanitized events.
- **Triage lifecycle:** choose `needs_review`, `investigating`, `confirmed`, `false_positive`, or `escalated`, optionally attach a <=1,000-character analyst note. No host is automatically changed.
- **Append-only decision history:** each review writes a distinct server record. A detected alert and source-event report are preserved when its review changes; latest status appears in dashboard finding queue.
- **Workspace isolation:** the HTTP API confirms the user token, workspace membership, writer permissions and that the finding belongs to the named completed run before accepting a review. User-supplied notes receive best-effort basic secret masking and control-character stripping; don't paste sensitive contents.
- **Supabase parity:** `supabase/soc_triage_v5.sql` creates an access-restricted review action table. **Requires `workspace_members.role` (`owner`,`contributor`,`viewer`).** No such role column? The preflight intentionally stops; migrate and test your membership schema separately first. Service credentials remain server-only.
- **Redis duplicate protection:** repeat submission of an already queued/completed file returns the current job/report rather than putting another copy in Redis.
- **Clearer data provenance:** when signed in, the log-analysis panel shows only real saved workspace results and not the public fixture. Guests can explore the clearly labeled synthetic example. Rule scores are heuristic priorities, not calibrated probabilities.

## Run

From the extracted `spectacle-soc` folder:

```bash
./run.sh
```

Open `http://localhost:8080`. For a full review: sign in through Reports -> Dashboard -> Run Kyle fixture -> select a finding -> expand matched events -> choose a disposition -> save. No Supabase or Redis credentials are needed for the local SQLite/inline mode. Offline preview (`web/preview-offline.html`) is read-only for backend review actions.

### New API endpoints

- `GET /v1/soc/triage`: latest review actions and bounded action history, for the signed-in workspace only.
- `POST /v1/soc/triage`: `{ "run_id":"<UUID>", "finding_id":"DET-XXXXXXXXXXXX", "status":"investigating", "note":"..." }`. Requires a writer; returns 201 on append. Invalid payloads return 422; cross-workspace/missing findings return 404.

### Database migrations

Local SQLite migration runs from the application. For Supabase: **do not run migrations on the production project without checking schema, testing on a branch, and taking backups.** First apply `supabase/soc_pipeline.sql` if not present; then apply `supabase/soc_triage_v5.sql`. Confirm that users have correctly assigned roles and cannot read/write the action table directly.

### Verification

- Existing API suite: 23 passing.
- Existing playbook suite: 8 passing.
- Integration suite: 20 passing (including v5 triage, tenancy, input safety, Redis idempotency and real HTTP handler tests).
- Browser: separate desktop/mobile smoke checks inspected the synthetic fixture, expanded linked evidence, changed selected finding, and checked no page overflow or JS runtime exceptions. A combined process timed out in this environment; no claim of a fully green combined browser suite.
- **Not verified:** cloud Supabase, a real Redis instance, production rate limiting, operational log provenance, tamper-evident storage, or an actual threat investigation.

### Reference material

- NIST SP 800-61r3 (Apr 2025): https://csrc.nist.gov/pubs/sp/800/61/r3/final
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- MITRE ATT&CK T1110.003: https://attack.mitre.org/techniques/T1110/003/

The implementation is a **local prototype/workbench**, not a certified incident-response platform.
