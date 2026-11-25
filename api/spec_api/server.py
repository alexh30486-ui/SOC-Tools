"""HTTP layer. Stdlib server for dev/tests; the same routes map 1:1 onto FastAPI in production."""
import json, os, pathlib, re, sys, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from . import core
from .db import Store
from .soc_backend import SOCBackend, BackendUnavailable
from . import net_diagnostics

MAX_BODY = 1_000_000
MAX_DOC = 512_000
KINDS = ("prd", "soc-case", "soc-library")
MAX_TEAM_PAYLOAD = 64_000
METRICS = {"requests": 0, "errors_5xx": 0, "rate_limited": 0}


class HTTPError(Exception):
    def __init__(self, status, message, extra=None):
        super().__init__(message)
        self.status, self.message, self.extra = status, message, extra or {}


def log(**fields):
    sys.stderr.write(json.dumps({"ts": int(time.time() * 1000), **fields}) + "\n")


def now_ms():
    return int(time.time() * 1000)


class App:
    def __init__(self, database_url, secret, cors_origins=(), auth_per_minute=10, api_per_minute=300, static_dir=None):
        if not secret or len(secret) < 32:
            raise RuntimeError("SPEC_SECRET must be set and at least 32 characters")
        self.store = Store(database_url)
        self.soc = SOCBackend(self.store)
        self.soc.migrate()
        self.secret = secret
        self.cors = set(cors_origins)
        self.static_dir = pathlib.Path(static_dir) if static_dir else None
        self.auth_limit = core.TokenBucket(auth_per_minute)
        self.api_limit = core.TokenBucket(api_per_minute)
        self.net_limit = core.TokenBucket(6)
        self.net_config = net_diagnostics.from_env()

    # ---- helpers -------------------------------------------------------
    def user_from(self, token):
        uid = core.read_token(self.secret, token)
        if not uid:
            raise HTTPError(401, "missing or invalid token")
        user = self.store.one("SELECT id, email, name FROM users WHERE id = ?", (uid,))
        if not user:
            raise HTTPError(401, "missing or invalid token")
        return user

    def role_in(self, user_id, org_id):
        row = self.store.one("SELECT role FROM memberships WHERE org_id = ? AND user_id = ?", (org_id, user_id))
        return row["role"] if row else None

    def require(self, user, org_id, action):
        role = self.role_in(user["id"], org_id)
        if role is None:
            raise HTTPError(404, "not found")  # do not reveal that the org exists
        if not core.can(role, action):
            raise HTTPError(403, f"your role ({role}) cannot {action} here")
        return role

    def audit(self, org_id, actor_id, action, target):
        self.store.write(
            "INSERT INTO audit_log (id, org_id, actor_id, action, target, created_at) VALUES (?,?,?,?,?,?)",
            (uuid.uuid4().hex, org_id, actor_id, action, target, now_ms()),
        )

    def soc_principal(self, header):
        if not header.startswith('Bearer '):
            raise HTTPError(401, 'sign in before saving or viewing SOC runs')
        token = header[7:]
        if self.soc.mode == 'supabase':
            try:
                return self.soc.adapter.verify_user_workspace(token)
            except PermissionError as exc:
                raise HTTPError(401, str(exc)) from exc
            except BackendUnavailable as exc:
                raise HTTPError(503, str(exc)) from exc
        user = self.user_from(token)
        oid = self.default_org(user['id'])
        self.require(user,oid,'read')
        return {'id':user['id'],'org_id':oid,'auth':'local'}

    # ---- handlers ------------------------------------------------------
    def signup(self, body):
        email = str(body.get("email", "")).strip().lower()
        name = str(body.get("name", "")).strip()[:120]
        pw = body.get("password", "")
        if not core.valid_email(email):
            raise HTTPError(422, "enter a valid email")
        if not core.valid_password(pw):
            raise HTTPError(422, "password must be 10 to 256 characters")
        if self.store.one("SELECT id FROM users WHERE email = ?", (email,)):
            raise HTTPError(409, "an account with this email already exists")
        uid, oid = uuid.uuid4().hex, uuid.uuid4().hex
        with self.store.lock:
            self.store.write("INSERT INTO users (id, email, name, pw_hash, created_at) VALUES (?,?,?,?,?)",
                             (uid, email, name, core.hash_password(pw), now_ms()))
            self.store.write("INSERT INTO orgs (id, name, created_at) VALUES (?,?,?)",
                             (oid, (name or email.split("@")[0]) + "'s workspace", now_ms()))
            self.store.write("INSERT INTO memberships (org_id, user_id, role) VALUES (?,?,?)", (oid, uid, "owner"))
        return 201, {"token": core.issue_token(self.secret, uid), "user": {"id": uid, "email": email, "name": name}}

    def login(self, body):
        email = str(body.get("email", "")).strip().lower()
        user = self.store.one("SELECT id, email, name, pw_hash FROM users WHERE email = ?", (email,))
        ok = bool(user) and core.verify_password(str(body.get("password", "")), user["pw_hash"])
        if not ok:
            raise HTTPError(401, "invalid email or password")
        return 200, {"token": core.issue_token(self.secret, user["id"]),
                     "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

    def me(self, user):
        orgs = self.store.all(
            "SELECT o.id, o.name, m.role FROM memberships m JOIN orgs o ON o.id = m.org_id WHERE m.user_id = ?",
            (user["id"],))
        return 200, {"user": user, "orgs": orgs}

    def create_project(self, user, body):
        org_id = body.get("org_id") or self.default_org(user["id"])
        name = str(body.get("name", "")).strip()[:120]
        if not name:
            raise HTTPError(422, "project name is required")
        kind = body.get("kind", "prd")
        if kind not in KINDS:
            raise HTTPError(422, "kind must be one of: " + ", ".join(KINDS))
        self.require(user, org_id, "write")
        pid = uuid.uuid4().hex
        self.store.write("INSERT INTO projects (id, org_id, name, doc, kind, version, created_by, created_at, updated_at)"
                         " VALUES (?,?,?,?,?,?,?,?,?)", (pid, org_id, name, "{}", kind, 1, user["id"], now_ms(), now_ms()))
        self.audit(org_id, user["id"], "project.create", pid)
        return 201, {"id": pid, "org_id": org_id, "name": name, "kind": kind, "version": 1}

    def default_org(self, user_id):
        row = self.store.one("SELECT org_id FROM memberships WHERE user_id = ? ORDER BY org_id LIMIT 1", (user_id,))
        if not row:
            raise HTTPError(404, "no workspace")
        return row["org_id"]

    def list_projects(self, user, query):
        org_id = (query.get("org") or [None])[0] or self.default_org(user["id"])
        self.require(user, org_id, "read")
        # Explicit kind filter. With no ?kind= you get only plain PRD projects, so an app that
        # predates the kind column can never be handed a SOC row.
        kind = (query.get("kind") or ["prd"])[0]
        if kind not in KINDS:
            raise HTTPError(422, "kind must be one of: " + ", ".join(KINDS))
        rows = self.store.all("SELECT id, name, kind, version, updated_at FROM projects WHERE org_id = ? AND kind = ?"
                              " ORDER BY updated_at DESC LIMIT 100", (org_id, kind))
        return 200, {"org_id": org_id, "kind": kind, "projects": rows}

    def get_project(self, user, pid):
        p = self.store.one("SELECT * FROM projects WHERE id = ?", (pid,))
        if not p:
            raise HTTPError(404, "not found")
        self.require(user, p["org_id"], "read")
        return 200, {"id": p["id"], "org_id": p["org_id"], "name": p["name"], "kind": p["kind"],
                     "version": p["version"], "doc": json.loads(p["doc"])}

    def save_project(self, user, pid, body):
        p = self.store.one("SELECT * FROM projects WHERE id = ?", (pid,))
        if not p:
            raise HTTPError(404, "not found")
        self.require(user, p["org_id"], "write")
        doc = body.get("doc")
        if not isinstance(doc, dict):
            raise HTTPError(422, "doc must be an object")
        # A document must agree with the row it is saved to, in both directions.
        dk = doc.get("kind")
        if p["kind"] == "prd" and dk in ("soc-case", "soc-library"):
            raise HTTPError(422, "this is a PRD project; a SOC document cannot be saved to it")
        if p["kind"] != "prd" and dk != p["kind"]:
            raise HTTPError(422, "document kind must be " + p["kind"])
        text = json.dumps(doc, separators=(",", ":"))
        if len(text.encode()) > MAX_DOC:
            raise HTTPError(413, "document is too large (512 KB limit)")
        expected = body.get("version")
        # Optimistic concurrency: the write only lands if nobody saved since the client read it.
        changed = self.store.write("UPDATE projects SET doc = ?, version = version + 1, updated_at = ?"
                                   " WHERE id = ? AND version = ?", (text, now_ms(), pid, expected))
        if changed != 1:
            current = self.store.one("SELECT version FROM projects WHERE id = ?", (pid,))
            raise HTTPError(409, "this project changed since you loaded it", {"current_version": current["version"]})
        self.audit(p["org_id"], user["id"], "project.save", pid)
        return 200, {"id": pid, "version": expected + 1}

    def delete_project(self, user, pid):
        p = self.store.one("SELECT * FROM projects WHERE id = ?", (pid,))
        if not p:
            raise HTTPError(404, "not found")
        self.require(user, p["org_id"], "admin")
        self.store.write("DELETE FROM projects WHERE id = ?", (pid,))
        self.audit(p["org_id"], user["id"], "project.delete", pid)
        return 200, {"deleted": pid}

    def post_team(self, user, body):
        org_id = body.get("org_id") or self.default_org(user["id"])
        self.require(user, org_id, "write")
        payload = body.get("payload")
        if not isinstance(payload, dict):
            raise HTTPError(422, "payload must be an object")
        text = json.dumps(payload, separators=(",", ":"))
        if len(text.encode()) > MAX_TEAM_PAYLOAD:
            raise HTTPError(413, "snapshot is too large")
        iid = uuid.uuid4().hex
        self.store.write("INSERT INTO team_items (id, org_id, author_id, payload, created_at) VALUES (?,?,?,?,?)",
                         (iid, org_id, user["id"], text, now_ms()))
        return 201, {"id": iid}

    def list_team(self, user, query):
        org_id = (query.get("org") or [None])[0] or self.default_org(user["id"])
        self.require(user, org_id, "read")
        rows = self.store.all("SELECT id, author_id, payload, created_at FROM team_items WHERE org_id = ?"
                              " ORDER BY created_at DESC LIMIT 20", (org_id,))
        return 200, {"items": [{"id": r["id"], "author_id": r["author_id"], "created_at": r["created_at"],
                                "payload": json.loads(r["payload"])} for r in rows]}

    def delete_team(self, user, iid):
        row = self.store.one("SELECT * FROM team_items WHERE id = ?", (iid,))
        if not row:
            raise HTTPError(404, "not found")
        role = self.role_in(user["id"], row["org_id"])
        if role is None:
            raise HTTPError(404, "not found")
        if row["author_id"] != user["id"] and not core.can(role, "admin"):
            raise HTTPError(403, "only the author or an owner can remove this")
        self.store.write("DELETE FROM team_items WHERE id = ?", (iid,))
        self.audit(row["org_id"], user["id"], "team.delete", iid)
        return 200, {"deleted": iid}

    def track(self, user, body):
        name = str(body.get("name", ""))[:64]
        if not re.fullmatch(r"[a-z0-9_.-]{1,64}", name):
            raise HTTPError(422, "event name must be lowercase letters, digits, dots, dashes or underscores")
        self.store.write("INSERT INTO events (id, org_id, actor_id, name, created_at) VALUES (?,?,?,?,?)",
                         (uuid.uuid4().hex, None, user["id"], name, now_ms()))
        return 202, {"accepted": True}


ROUTES = []


def route(method, pattern, auth=True, limiter="api"):
    def deco(fn):
        ROUTES.append((method, re.compile("^" + pattern + "$"), fn, auth, limiter))
        return fn
    return deco


@route("GET", "/v1/health", auth=False)
def _health(app, h, m, q, body, user):
    return 200, {"ok": True, "db": app.store.ping()}


@route("GET", "/v1/metrics", auth=False)
def _metrics(app, h, m, q, body, user):
    return 200, dict(METRICS)


@route("POST", "/v1/auth/signup", auth=False, limiter="auth")
def _signup(app, h, m, q, body, user):
    return app.signup(body)


@route("POST", "/v1/auth/login", auth=False, limiter="auth")
def _login(app, h, m, q, body, user):
    return app.login(body)


@route("GET", "/v1/me")
def _me(app, h, m, q, body, user):
    return app.me(user)


@route("POST", "/v1/projects")
def _create(app, h, m, q, body, user):
    return app.create_project(user, body)


@route("GET", "/v1/projects")
def _list(app, h, m, q, body, user):
    return app.list_projects(user, q)


@route("GET", r"/v1/projects/([a-f0-9]{32})")
def _get(app, h, m, q, body, user, pid=None):
    return app.get_project(user, pid)


@route("PUT", r"/v1/projects/([a-f0-9]{32})")
def _save(app, h, m, q, body, user, pid=None):
    return app.save_project(user, pid, body)


@route("DELETE", r"/v1/projects/([a-f0-9]{32})")
def _delete(app, h, m, q, body, user, pid=None):
    return app.delete_project(user, pid)


@route("POST", "/v1/team")
def _team_post(app, h, m, q, body, user):
    return app.post_team(user, body)


@route("GET", "/v1/team")
def _team_list(app, h, m, q, body, user):
    return app.list_team(user, q)


@route("DELETE", r"/v1/team/([a-f0-9]{32})")
def _team_del(app, h, m, q, body, user, iid=None):
    return app.delete_team(user, iid)


@route("POST", "/v1/events")
def _events(app, h, m, q, body, user):
    return app.track(user, body)


@route("GET", "/v1/soc/status", auth=False)
def _soc_status(app, h, m, q, body, user):
    return 200, {"storage": app.soc.mode, "queue": app.soc.queue_mode,
                 "live_siem": False, "scoring": "deterministic_heuristic_not_calibrated_probability"}


@route("GET", "/v1/soc/demo", auth=False)
def _soc_demo(app, h, m, q, body, user):
    return 200, {"mode":"synthetic_fixture", "report":app.soc.demo()}


@route("GET", "/v1/soc/summary", auth=False)
def _soc_summary(app, h, m, q, body, user):
    who=app.soc_principal(h.headers.get('Authorization',''))
    try: return 200, app.soc.summary(who['org_id'])
    except BackendUnavailable as exc: raise HTTPError(503,str(exc)) from exc


@route("GET", "/v1/soc/runs", auth=False)
def _soc_runs(app, h, m, q, body, user):
    who=app.soc_principal(h.headers.get('Authorization',''))
    try: return 200, {"runs":app.soc.rows(who['org_id'], 30)}
    except BackendUnavailable as exc: raise HTTPError(503,str(exc)) from exc


@route("GET", "/v1/soc/triage", auth=False)
def _soc_triage_list(app, h, m, q, body, user):
    who=app.soc_principal(h.headers.get('Authorization',''))
    try: return 200, app.soc.triage_actions(who['org_id'])
    except BackendUnavailable as exc: raise HTTPError(503,str(exc)) from exc


@route("POST", "/v1/soc/triage", auth=False)
def _soc_triage_post(app, h, m, q, body, user):
    who=app.soc_principal(h.headers.get('Authorization',''))
    if who['auth']=='supabase' and who.get('role') not in ('owner','contributor'):
        raise HTTPError(403,'workspace role cannot write findings')
    if who['auth']=='local':
        app.require(app.user_from(h.headers['Authorization'][7:]),who['org_id'],'write')
    if not isinstance(body,dict): raise HTTPError(422,'JSON object required')
    try:
        action=app.soc.triage(who['org_id'],who['id'],body.get('run_id'),body.get('finding_id'),
                               body.get('status'),body.get('note',''))
    except ValueError as exc: raise HTTPError(422,str(exc)) from exc
    except LookupError as exc: raise HTTPError(404,str(exc)) from exc
    except BackendUnavailable as exc: raise HTTPError(503,str(exc)) from exc
    return 201,action


@route("POST", "/v1/soc/sample", auth=False)
def _soc_sample(app, h, m, q, body, user):
    who=app.soc_principal(h.headers.get('Authorization',''))
    if who['auth']=='supabase' and who.get('role') not in ('owner','contributor'):
        raise HTTPError(403,'workspace role cannot write findings')
    if who['auth']=='local':
        app.require(app.user_from(h.headers['Authorization'][7:]), who['org_id'], 'write')
    source=__import__('pathlib').Path(__file__).resolve().parents[2] / 'samples' / 'kyle_security_events.jsonl'
    try:
        report=app.soc.submit(who['org_id'],who['id'],source.name,source.read_text('utf8'))
    except BackendUnavailable as exc: raise HTTPError(503,str(exc)) from exc
    return (202 if report['status']=='queued' else 200), report


@route("POST", "/v1/soc/ingest", auth=False)
def _soc_ingest(app, h, m, q, body, user):
    who=app.soc_principal(h.headers.get('Authorization',''))
    if who['auth']=='supabase' and who.get('role') not in ('owner','contributor'):
        raise HTTPError(403,'workspace role cannot write findings')
    try:
        content=body.get('content')
        filename=body.get('filename')
        if not isinstance(content,str) or not isinstance(filename,str):
            raise HTTPError(422,'filename and UTF-8 text content are required')
        # Authorization and write permissions are checked before reading attacker-supplied content.
        if who['auth']=='local':
            local=app.user_from(h.headers['Authorization'][7:])
            app.require(local, who['org_id'], 'write')
        report=app.soc.submit(who['org_id'],who['id'],filename,content)
    except ValueError as exc: raise HTTPError(422,str(exc)) from exc
    except BackendUnavailable as exc: raise HTTPError(503,str(exc)) from exc
    return (202 if report['status']=='queued' else 200), report



@route("GET", "/v1/network/status", auth=False)
def _network_status(app, h, m, q, body, user):
    who = app.soc_principal(h.headers.get('Authorization', ''))
    return 200, {'enabled': app.net_config.enabled, 'origin': 'server',
                 'targets': list(app.net_config.allowed_targets),
                 'ports': sorted(app.net_config.allowed_ports),
                 'read_only': who.get('role') == 'viewer',
                 'protocols': ['ICMP', 'DNS lookup', 'TCP connect', 'UDP datagram'],
                 'websocket': False}


@route("POST", "/v1/network/execute", auth=False)
def _network_execute(app, h, m, q, body, user):
    who = app.soc_principal(h.headers.get('Authorization', ''))
    if who.get('role') == 'viewer':
        raise HTTPError(403, 'read-only workspace members cannot issue network probes')
    if who['auth'] == 'local':
        app.require(app.user_from(h.headers['Authorization'][7:]), who['org_id'], 'write')
    if not app.net_limit.allow(f"{who['org_id']}:{who['id']}"):
        raise HTTPError(429, 'network diagnostic rate limit (six probes/minute)', {'Retry-After': '60'})
    command = body.get('command')
    if not isinstance(command, str):
        raise HTTPError(422, 'command must be a string')
    try:
        result = net_diagnostics.run(command, app.net_config)
    except net_diagnostics.DiagnosticError as exc:
        raise HTTPError(422, str(exc)) from exc
    # An analyst must be able to trace live probes to the person and workspace
    # that initiated them. The audit records metadata only, never credentials.
    if who['auth'] == 'local':
        audit_target = f"{result['kind']}:{result['address'] or '-'}:{result['port'] or '-'}:{result['status']}"
        app.audit(who['org_id'], who['id'], 'network.probe', audit_target[:200])
    return 200, {'result': result}


def make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *args):
            pass

        def _send(self, status, obj, rid, extra=None):
            data = json.dumps(obj).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Request-ID", rid)
            if self.close_connection:
                self.send_header("Connection", "close")
            origin = self.headers.get("Origin")
            if origin and origin in app.cors:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            for k, v in (extra or {}).items():
                self.send_header(k, str(v))
            self.end_headers()
            self.wfile.write(data)

        def _static(self, rid):
            """Serve the single-page app (index.html) for any non-API GET. Nothing else on disk is reachable."""
            page = app.static_dir / "index.html"
            data = page.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-cache")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("X-Request-ID", rid)
            self.end_headers()
            self.wfile.write(data)

        def _handle(self, method):
            started = time.monotonic()
            self._body_read = False
            rid = self.headers.get("X-Request-ID") or uuid.uuid4().hex
            METRICS["requests"] += 1
            url = urlparse(self.path)
            status, payload, extra = 500, {"error": "internal error"}, {}
            try:
                if method == "OPTIONS":
                    status, payload = 204, {}
                    return self._send(status, payload, rid)
                client = self.client_address[0]
                if (method == "GET" and app.static_dir and not url.path.startswith("/v1")
                        and (app.static_dir / "index.html").is_file()):
                    self._static(rid)
                    log(level="info", rid=rid, method=method, path=url.path, status=200,
                        ms=round((time.monotonic() - started) * 1000, 1))
                    return
                for m_, pattern, fn, auth, limiter in ROUTES:
                    if m_ != method:
                        continue
                    match = pattern.match(url.path)
                    if not match:
                        continue
                    bucket = app.auth_limit if limiter == "auth" else app.api_limit
                    if not bucket.allow(f"{limiter}:{client}"):
                        METRICS["rate_limited"] += 1
                        raise HTTPError(429, "too many requests, slow down", {"Retry-After": "60"})
                    length = int(self.headers.get("Content-Length") or 0)
                    if length > MAX_BODY:
                        raise HTTPError(413, "request body too large")
                    body = {}
                    if length:
                        try:
                            raw = self.rfile.read(length)
                            self._body_read = True
                            body = json.loads(raw or b"{}")
                        except json.JSONDecodeError:
                            raise HTTPError(400, "body must be valid JSON")
                        if not isinstance(body, dict):
                            raise HTTPError(400, "body must be a JSON object")
                    user = None
                    if auth:
                        header = self.headers.get("Authorization", "")
                        if not header.startswith("Bearer "):
                            raise HTTPError(401, "missing or invalid token")
                        user = app.user_from(header[7:])
                    status, payload = fn(app, self, method, parse_qs(url.query), body, user, *match.groups())
                    break
                else:
                    raise HTTPError(404, "no such route")
            except HTTPError as e:
                status, payload, extra = e.status, {"error": e.message, **e.extra}, e.extra
            except Exception as e:  # never leak internals to clients
                METRICS["errors_5xx"] += 1
                log(level="error", rid=rid, path=url.path, err=type(e).__name__, detail=str(e)[:200])
            if not self._body_read and int(self.headers.get("Content-Length") or 0) > 0:
                self.close_connection = True  # unread body would corrupt the next keep-alive request
            if status == 204:
                self._send(204, {}, rid)
            else:
                self._send(status, payload, rid, extra)
            log(level="info", rid=rid, method=method, path=url.path, status=status,
                ms=round((time.monotonic() - started) * 1000, 1))

        def do_GET(self):
            self._handle("GET")

        def do_POST(self):
            self._handle("POST")

        def do_PUT(self):
            self._handle("PUT")

        def do_DELETE(self):
            self._handle("DELETE")

        def do_OPTIONS(self):
            self._handle("OPTIONS")

    return Handler


def default_static_dir():
    """SPEC_STATIC_DIR, else ../web next to the api folder (repo layout), else /app/web (container)."""
    env = os.environ.get("SPEC_STATIC_DIR")
    if env:
        return env
    for cand in (pathlib.Path(__file__).resolve().parents[2] / "web", pathlib.Path("/app/web")):
        if (cand / "index.html").is_file():
            return str(cand)
    return None


def serve(host="0.0.0.0", port=8080):
    app = App(
        database_url=os.environ.get("SPEC_DATABASE_URL", "sqlite:///spec-dev.db"),
        secret=os.environ.get("SPEC_SECRET", ""),
        cors_origins=[o for o in os.environ.get("SPEC_CORS_ORIGINS", "").split(",") if o],
        auth_per_minute=int(os.environ.get("SPEC_AUTH_RATE_PER_MIN", "10")),
        api_per_minute=int(os.environ.get("SPEC_API_RATE_PER_MIN", "300")),
        static_dir=default_static_dir(),
    )
    app.store.migrate()
    httpd = ThreadingHTTPServer((host, port), make_handler(app))
    log(level="info", msg="listening", host=host, port=port)
    httpd.serve_forever()


if __name__ == "__main__":
    serve(port=int(os.environ.get("PORT", "8080")))
