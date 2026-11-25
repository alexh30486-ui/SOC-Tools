# Version 5: analyst review and write authorization

- Apply `supabase/soc_triage_v5.sql` **after** `soc_pipeline.sql` on a test Supabase branch. It requires `workspace_members.role` with `owner`, `contributor`, or `viewer` values. No role column or unrecognized role means Supabase access fails closed (no automatic migration of existing membership data).
- Server-side write routes `/v1/soc/sample`, `/v1/soc/ingest`, and `/v1/soc/triage` require `owner` or `contributor`; viewers can inspect, not change. Existing local accounts retain the built-in `require(write)` check.
- `/v1/soc/triage` GET provides latest reviews and a capped action history; POST appends an analyst decision to an existing finding in the same workspace, after verifying run ownership. Decisions are not calibrated probabilities and do not isolate hosts.
- New idempotency guard skips duplicate submissions while a job is already queued or completed, reducing Redis duplicate-job churn.
- Cloud Supabase and Redis connectivity are **not verified**; local SQLite and fake Redis were used for unit/HTTP tests. Migration requires separate validation and authorization review on your actual schema.

# Supabase + Redis SOC ingestion (v4)

## Modes and contract

- `SOC_STORAGE=local` (default): SQLite persistence, separated by the existing authenticated org ID. **Real local writes**, not Supabase.
- `SOC_STORAGE=supabase`: Writes `soc_ingestions` to Supabase PostgREST with a **server-only secret**. API first validates the caller's access token against Supabase Auth and reads their membership in `workspace_members` with their user JWT. Do not expose the secret in browser code.
- `SOC_QUEUE=inline` (default): backend analyzes and stores in the request; handy for small sample files and tests.
- `SOC_QUEUE=redis`: API writes a queued job and adds raw log content to a Redis Stream. Run `soc_worker` separately. Worker acknowledges only after the result is persisted. Stale unacknowledged messages are reclaimed after 60 seconds by `XAUTOCLAIM`; idempotent upsert permits redelivery.

**Security limitation:** Redis Streams temporarily hold source log content (even though workers `XDEL` entries after processing), so use a private Redis deployment with TLS/ACLs and set operational retention and backups. Never ingest secrets or regulated data into this demo deployment. Results redact basic credential patterns, not arbitrary sensitive information.

## Run locally (no cloud credentials needed)

```bash
./run.sh
# open http://localhost:8080
```

The command center loads `GET /v1/soc/demo` to display the 21-event Kyle fixture. This does not persist anything. Select **View my workspace**, sign in under Reports, and click **Run Kyle test fixture** to persist a run. To import your own logs use **Upload a log file**.

```bash
# API endpoints:
GET /v1/soc/status      # public; deployment mode only
GET /v1/soc/demo        # public; fixed synthetic sample
GET /v1/soc/summary     # signed-in org only
GET /v1/soc/runs        # signed-in org only
POST /v1/soc/sample     # signed-in org contributor/owner; persist sample
POST /v1/soc/ingest     # signed-in org contributor/owner; {"filename":"events.jsonl","content":"..."}
```

## Cloud setup

1. Create a Supabase **test branch**; backup your project before changing it.
2. Run `supabase/soc_pipeline.sql` in your Supabase SQL editor. Verify RLS, permissions, schema, and workspace memberships.
3. Set `SOC_STORAGE=supabase`, `SOC_SUPABASE_URL`, `SOC_SUPABASE_PUBLISHABLE_KEY`, and **server-only** `SOC_SUPABASE_SECRET_KEY`. The app's browser already uses your Supabase Auth session; the backend uses that user JWT for verification.
4. Use Redis 7+ if needed, set `SOC_QUEUE=redis`, `SOC_REDIS_URL=redis://...` (private network) or `rediss://...`, install `pip install -r api/requirements.txt`, and start `python3 -m spec_api.soc_worker` inside `api/`.
5. The Docker compose sample `api/docker-compose.soc.yml` starts separate API and worker containers. It has **not** been run in this environment. Use managed PostgreSQL for `SPEC_DATABASE_URL` when scaling local app accounts.
6. Ensure your Supabase `workspace_members` RLS permits an authenticated user to see their own memberships. Review `supabase/hardening.sql` preflight: the project schema must use `workspace_id` and `user_id`.

**Do not use a different project by mistake.** The browser Supabase project URL and `SOC_SUPABASE_URL` must match. This build doesn't migrate your existing production workspace or invent cloud credentials.

## Dataset and deterministic detection

See `samples/kyle_security_events.jsonl` and `samples/kyle_readme.md`. Fixtures use only reserved documentation IP addresses. Output includes source event references and explicit rationale. Confidence scores are rules-based priorities, **not calibrated probabilities**, so `96` does not mean a 96% chance of a breach.

A detection may be a false positive. The operational 5xx burst is explicitly not a cybersecurity intrusion. No automatic host isolation or email alerts run.

## Sources reviewed (Nov 2026)

- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JWT verification: https://supabase.com/docs/guides/auth/jwts
- Redis Streams with redis-py: https://redis.io/docs/latest/develop/use-cases/streaming/redis-py/
- Redis XAUTOCLAIM: https://redis.io/docs/latest/commands/xautoclaim/
- Windows Event 4625: https://learn.microsoft.com/windows/security/threat-protection/auditing/event-4625
- MITRE password spraying: https://attack.mitre.org/techniques/T1110/003/
- MITRE PowerShell: https://attack.mitre.org/techniques/T1059/001/
- OWASP Logging: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet

## Test

```bash
PYTHONPATH=api python3 -m unittest discover -s tests/integration -v
(cd api && python3 -m unittest discover -s tests -v)
python3 tests/e2e/dashboard_v4_test.py
```

Real Supabase and Redis were not available in the authoring environment. Automated tests use SQLite and a fake Redis stream to verify queue state, idempotent writes and org isolation; they are not proof of connectivity to the user's cloud infrastructure.
