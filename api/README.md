## New in v4 — analyst log pipeline

`/v1/soc/demo`, `/v1/soc/status`, `/v1/soc/sample`, `/v1/soc/ingest`, `/v1/soc/runs`, `/v1/soc/summary` are provided by `spec_api.soc_backend`. Configure `SOC_STORAGE=local|supabase` and `SOC_QUEUE=inline|redis`; see `../INTEGRATION.md`. The old service and its authentication are retained. In Supabase mode, SOC routes validate Supabase Auth tokens and workspace membership. The fixed Kyle sample is not a real breach or a live feed.

# Spectacle API

A stdlib-only HTTP service with the data model, security rules and routes the production build needs.
It runs and is tested here (18 tests). It is written so the same SQL and routes move to
FastAPI + PostgreSQL + a managed host without changing the contract.

## What is built and tested
| Area | Implementation | Test coverage |
|---|---|---|
| Accounts | email + PBKDF2-SHA256 (210k iterations), generic login errors | signup, duplicates, validation, wrong password |
| Sessions | HMAC-SHA256 signed tokens, 12h expiry | tampered token, expired token, no token |
| Tenancy | every project, team item and audit row belongs to an org | cross-tenant access returns 404 |
| Roles | owner > contributor > viewer | viewer read-only, contributor cannot admin |
| Concurrency | optimistic locking on project saves (`version`) | stale save returns 409 with current version |
| Validation | body size (1 MB), doc size (512 KB), team payload (64 KB), event-name pattern | 413 / 422 cases |
| Abuse | token bucket per IP for auth routes and per IP for the API | 429 after the limit |
| Audit | `audit_log` row for project create/save/delete and team moderation | row presence |
| Observability | JSON request logs with request IDs, `/v1/metrics` counters, `/v1/health` with DB ping | health and metrics responses |
| Data | portable schema (`schema.sql`) for SQLite and PostgreSQL | migration runs on SQLite in tests |

## Not built or not verified in this environment
- **PostgreSQL path (`psycopg`)**: the code exists, but no Postgres was available to run it. Run `docker compose up` once and the health check will show it.
- **Docker image and compose file**: written, not built. No Docker here.
- **FastAPI**: not used, because it could not be installed. The routes are a direct port, which makes swapping it in mechanical.
- **Load testing, failover, backups, TLS, CDN, secrets management**: see the roadmap below.

## Run the tests
    cd api
    python3 -m unittest discover -s tests -v   # 18 tests

## Run locally
    SPEC_DATABASE_URL=sqlite:///spec-dev.db SPEC_SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))") python3 -m spec_api.server

The server also returns `web/index.html` for any non-`/v1` GET (set `SPEC_STATIC_DIR` to change the folder).

## Endpoints
| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /v1/health | no | — | DB ping |
| GET | /v1/metrics | no | — | counters; restrict at the proxy in production |
| POST | /v1/auth/signup | no | — | creates user and personal workspace |
| POST | /v1/auth/login | no | — | returns token |
| GET | /v1/me | yes | any | user and workspaces |
| POST | /v1/projects | yes | write | `{name, org_id?}` |
| GET | /v1/projects | yes | read | `?org=` |
| GET / PUT / DELETE | /v1/projects/{id} | yes | read / write / admin | PUT needs `{doc, version}` |
| POST / GET | /v1/team | yes | write / read | shared snapshots, newest 20 |
| DELETE | /v1/team/{id} | yes | author or owner | |
| POST | /v1/events | yes | any | product analytics, validated names |

## Deploy (when you have accounts)
1. Create a managed PostgreSQL (Neon, Supabase Postgres, RDS). Take the connection URL.
2. Set `SPEC_DATABASE_URL`, `SPEC_SECRET` (64+ random characters, stored in the host's secret manager) and `SPEC_CORS_ORIGINS`.
3. Run the container (`docker compose up` locally, or any container host: Render, Fly.io, Cloud Run, ECS).
4. Put TLS in front (the host usually does this). Never expose `/v1/metrics` publicly.

## Scaling roadmap (ordered by what breaks first)
1. **Connection pooling**: PgBouncer or the host's pooler in transaction mode. Required before more than one replica.
2. **Shared rate limits**: move `TokenBucket` to Redis. Right now each replica counts separately.
3. **Multiple replicas behind a load balancer**: the API is stateless apart from the database, so this is a configuration change once 1 and 2 are done.
4. **Migrations tool**: Alembic (or the migration folder) with a version table, run as a deploy step, never on startup.
5. **JSONB for documents**: move `doc`, `payload` to JSONB once you query inside them.
6. **Read replicas** for dashboard and team-feed reads; writes stay on the primary.
7. **Async jobs** (exports, email, notifications) on a queue; the API only enqueues.
8. **Object storage** for exports and attachments; never store files in the database.
9. **Observability**: ship the JSON logs to a log store, add traces (OpenTelemetry), alert on 5xx and p95 latency.
10. **Backups and restore drills**: point-in-time recovery on the managed database, and a tested restore at least quarterly.
11. **Billing**: a provider (Stripe) webhook writes plan changes to the org; the API checks the plan on writes.
12. **Infrastructure as code**: the compose file becomes Terraform or the host's manifest, versioned in the repo.
