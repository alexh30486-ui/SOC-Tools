import http.client, json, os, tempfile, threading, unittest
from http.server import ThreadingHTTPServer

os.environ.setdefault("SPEC_PBKDF2_ITER", "20000")  # fast tests; production uses the default
from spec_api import core
from spec_api import server as srv

SECRET = "test-secret-with-at-least-thirty-two-chars"


class Harness(unittest.TestCase):
    auth_limit = 10

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.app = srv.App(f"sqlite:///{cls.tmp.name}/t.db", SECRET, auth_per_minute=cls.auth_limit)
        cls.app.store.migrate()
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(cls.app))
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.tmp.cleanup()

    def call(self, method, path, body=None, token=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        data = json.dumps(body).encode() if body is not None else None
        conn.request(method, path, body=data, headers=headers)
        resp = conn.getresponse()
        raw = resp.read()
        conn.close()
        return resp.status, (json.loads(raw) if raw else {})

    def signup(self, email):
        status, out = self.call("POST", "/v1/auth/signup", {"email": email, "password": "correct-horse-battery", "name": "T"})
        self.assertEqual(status, 201, out)
        return out["token"], out["user"]["id"]


class AuthTests(Harness):
    def test_signup_login_and_me(self):
        token, uid = self.signup("alice@example.com")
        status, out = self.call("POST", "/v1/auth/login", {"email": "ALICE@example.com", "password": "correct-horse-battery"})
        self.assertEqual(status, 200)
        status, me = self.call("GET", "/v1/me", token=out["token"])
        self.assertEqual(status, 200)
        self.assertEqual(me["user"]["id"], uid)
        self.assertEqual(me["orgs"][0]["role"], "owner")

    def test_duplicate_email_and_validation(self):
        self.signup("dup@example.com")
        self.assertEqual(self.call("POST", "/v1/auth/signup", {"email": "dup@example.com", "password": "correct-horse-battery"})[0], 409)
        self.assertEqual(self.call("POST", "/v1/auth/signup", {"email": "not-an-email", "password": "correct-horse-battery"})[0], 422)
        self.assertEqual(self.call("POST", "/v1/auth/signup", {"email": "short@example.com", "password": "short"})[0], 422)

    def test_wrong_password_is_generic(self):
        self.signup("pw@example.com")
        status, out = self.call("POST", "/v1/auth/login", {"email": "pw@example.com", "password": "wrong-password-here"})
        self.assertEqual(status, 401)
        self.assertEqual(out["error"], "invalid email or password")

    def test_protected_routes_need_a_valid_token(self):
        self.assertEqual(self.call("GET", "/v1/me")[0], 401)
        self.assertEqual(self.call("GET", "/v1/me", token="garbage")[0], 401)

    def test_tampered_and_expired_tokens_are_rejected(self):
        token, uid = self.signup("tamper@example.com")
        body, sig = token.split(".")
        forged = core.issue_token("a-different-secret-that-is-also-long-enough", uid)
        self.assertEqual(self.call("GET", "/v1/me", token=forged)[0], 401)
        expired = core.issue_token(SECRET, uid, ttl=-10)
        self.assertEqual(self.call("GET", "/v1/me", token=expired)[0], 401)


class ProjectTests(Harness):
    def test_create_read_save_with_optimistic_locking(self):
        token, _ = self.signup("proj@example.com")
        status, created = self.call("POST", "/v1/projects", {"name": "Spark"}, token)
        self.assertEqual(status, 201)
        pid = created["id"]
        status, got = self.call("GET", f"/v1/projects/{pid}", token=token)
        self.assertEqual((status, got["version"], got["doc"]), (200, 1, {}))
        status, saved = self.call("PUT", f"/v1/projects/{pid}", {"doc": {"title": "v2"}, "version": 1}, token)
        self.assertEqual((status, saved["version"]), (200, 2))
        status, stale = self.call("PUT", f"/v1/projects/{pid}", {"doc": {"title": "stale"}, "version": 1}, token)
        self.assertEqual(status, 409)
        self.assertEqual(stale["current_version"], 2)
        status, listed = self.call("GET", "/v1/projects", token=token)
        self.assertTrue(any(p["id"] == pid for p in listed["projects"]))

    def test_validation_and_size_limits(self):
        token, _ = self.signup("limits@example.com")
        pid = self.call("POST", "/v1/projects", {"name": "P"}, token)[1]["id"]
        self.assertEqual(self.call("PUT", f"/v1/projects/{pid}", {"doc": [1], "version": 1}, token)[0], 422)
        big = {"blob": "x" * 600_000}
        self.assertEqual(self.call("PUT", f"/v1/projects/{pid}", {"doc": big, "version": 1}, token)[0], 413)
        self.assertEqual(self.call("POST", "/v1/projects", {"name": "   "}, token)[0], 422)

    def test_other_users_get_404_not_403(self):
        owner, _ = self.signup("owner2@example.com")
        pid = self.call("POST", "/v1/projects", {"name": "Private"}, owner)[1]["id"]
        stranger, _ = self.signup("stranger@example.com")
        self.assertEqual(self.call("GET", f"/v1/projects/{pid}", token=stranger)[0], 404)

    def test_viewer_can_read_but_not_write(self):
        owner, _ = self.signup("boss@example.com")
        org = self.call("GET", "/v1/me", token=owner)[1]["orgs"][0]["id"]
        pid = self.call("POST", "/v1/projects", {"name": "Shared"}, owner)[1]["id"]
        viewer_token, viewer_id = self.signup("viewer@example.com")
        self.app.store.write("INSERT INTO memberships (org_id, user_id, role) VALUES (?,?,?)", (org, viewer_id, "viewer"))
        self.assertEqual(self.call("GET", f"/v1/projects/{pid}", token=viewer_token)[0], 200)
        self.assertEqual(self.call("PUT", f"/v1/projects/{pid}", {"doc": {}, "version": 1}, viewer_token)[0], 403)
        self.assertEqual(self.call("DELETE", f"/v1/projects/{pid}", token=viewer_token)[0], 403)

    def test_audit_rows_are_written(self):
        token, _ = self.signup("audit@example.com")
        self.call("POST", "/v1/projects", {"name": "Audited"}, token)
        rows = self.app.store.all("SELECT action FROM audit_log WHERE action = 'project.create'")
        self.assertGreaterEqual(len(rows), 1)


class TeamAndEventTests(Harness):
    def test_team_author_rules(self):
        owner, owner_id = self.signup("team-owner@example.com")
        org = self.call("GET", "/v1/me", token=owner)[1]["orgs"][0]["id"]
        contrib_token, contrib_id = self.signup("team-contrib@example.com")
        self.app.store.write("INSERT INTO memberships (org_id, user_id, role) VALUES (?,?,?)", (org, contrib_id, "contributor"))
        item = self.call("POST", "/v1/team", {"org_id": org, "payload": {"name": "Spark", "pct": 40}}, contrib_token)
        self.assertEqual(item[0], 201)
        self.assertEqual(self.call("DELETE", f"/v1/team/{item[1]['id']}", token=owner)[0], 200)  # owners may moderate
        item2 = self.call("POST", "/v1/team", {"org_id": org, "payload": {"name": "Other"}}, owner)
        self.assertEqual(self.call("DELETE", f"/v1/team/{item2[1]['id']}", token=contrib_token)[0], 403)
        feed = self.call("GET", "/v1/team", token=owner)[1]["items"]
        self.assertTrue(any(i["id"] == item2[1]["id"] for i in feed))

    def test_events_are_validated(self):
        token, _ = self.signup("events@example.com")
        self.assertEqual(self.call("POST", "/v1/events", {"name": "prd.copied"}, token)[0], 202)
        self.assertEqual(self.call("POST", "/v1/events", {"name": "Bad Name!"}, token)[0], 422)


class RateLimitTests(unittest.TestCase):
    def test_auth_endpoints_are_rate_limited(self):
        # Configure only the dedicated rate-limit app; never mutate the shared Harness class.
        tmp = tempfile.TemporaryDirectory()
        app = srv.App(f"sqlite:///{tmp.name}/rl.db", SECRET, auth_per_minute=3)
        app.store.migrate()
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(app))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            statuses = []
            for _ in range(5):
                conn = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
                conn.request("POST", "/v1/auth/login", body=b'{"email":"x@y.com","password":"nope-nope-nope"}',
                             headers={"Content-Type": "application/json"})
                statuses.append(conn.getresponse().status)
                conn.close()
            self.assertEqual(statuses[:3], [401, 401, 401])
            self.assertEqual(statuses[3], 429)
        finally:
            httpd.shutdown()
            tmp.cleanup()


class StaticTests(unittest.TestCase):
    def test_app_page_is_served_and_api_still_404s_cleanly(self):
        tmp = tempfile.TemporaryDirectory()
        web = os.path.join(tmp.name, "web")
        os.mkdir(web)
        with open(os.path.join(web, "index.html"), "w") as f:
            f.write("<title>spectacle.</title>")
        with open(os.path.join(tmp.name, "secret.txt"), "w") as f:
            f.write("nope")
        app = srv.App(f"sqlite:///{tmp.name}/s.db", SECRET, static_dir=web)
        app.store.migrate()
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(app))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            def get(path):
                conn = http.client.HTTPConnection("127.0.0.1", httpd.server_address[1], timeout=10)
                conn.request("GET", path)
                r = conn.getresponse()
                body = r.read()
                conn.close()
                return r.status, r.getheader("X-Frame-Options"), body
            status, frame, body = get("/")
            self.assertEqual((status, frame), (200, "DENY"))
            self.assertIn(b"spectacle.", body)
            self.assertIn(b"spectacle.", get("/../secret.txt")[2])  # any path returns the app, never a file
            self.assertNotIn(b"nope", get("/../secret.txt")[2])
            self.assertEqual(get("/v1/nope")[0], 404)
        finally:
            httpd.shutdown()
            tmp.cleanup()


class KindIsolationTests(Harness):
    """Cross-app pollution: the PRD app and the SOC app share one projects table."""

    def mk(self, token, name, kind=None):
        body = {"name": name}
        if kind:
            body["kind"] = kind
        status, out = self.call("POST", "/v1/projects", body, token)
        self.assertEqual(status, 201, out)
        return out["id"]

    def test_unknown_kind_is_rejected(self):
        token, _ = self.signup("kind1@example.com")
        self.assertEqual(self.call("POST", "/v1/projects", {"name": "x", "kind": "evil"}, token)[0], 422)
        self.assertEqual(self.call("GET", "/v1/projects?kind=evil", token=token)[0], 422)

    def test_default_list_never_returns_soc_rows(self):
        token, _ = self.signup("kind2@example.com")
        prd = self.mk(token, "A PRD")
        case = self.mk(token, "A case", "soc-case")
        lib = self.mk(token, "SOC playbook library", "soc-library")
        self.assertEqual(self.call("PUT", f"/v1/projects/{case}", {"doc": {"kind": "soc-case"}, "version": 1}, token)[0], 200)
        # What the PRD app asks for (no kind) and its "load latest" picks the newest row of that list.
        ids = [p["id"] for p in self.call("GET", "/v1/projects", token=token)[1]["projects"]]
        self.assertEqual(ids, [prd])
        self.assertEqual([p["id"] for p in self.call("GET", "/v1/projects?kind=soc-case", token=token)[1]["projects"]], [case])
        self.assertEqual([p["id"] for p in self.call("GET", "/v1/projects?kind=soc-library", token=token)[1]["projects"]], [lib])

    def test_document_must_match_row_kind_both_ways(self):
        token, _ = self.signup("kind3@example.com")
        prd = self.mk(token, "PRD")
        case = self.mk(token, "Case", "soc-case")
        s, out = self.call("PUT", f"/v1/projects/{prd}", {"doc": {"kind": "soc-case"}, "version": 1}, token)
        self.assertEqual(s, 422, out)
        s, out = self.call("PUT", f"/v1/projects/{case}", {"doc": {"title": "no kind"}, "version": 1}, token)
        self.assertEqual(s, 422, out)
        s, out = self.call("PUT", f"/v1/projects/{case}", {"doc": {"kind": "soc-library"}, "version": 1}, token)
        self.assertEqual(s, 422, out)
        self.assertEqual(self.call("PUT", f"/v1/projects/{prd}", {"doc": {"goal": "plain"}, "version": 1}, token)[0], 200)
        self.assertEqual(self.call("GET", f"/v1/projects/{case}", token=token)[1]["kind"], "soc-case")

    def test_other_orgs_cannot_see_kinds_either(self):
        a, _ = self.signup("kind4a@example.com")
        b, _ = self.signup("kind4b@example.com")
        self.mk(a, "A case", "soc-case")
        self.assertEqual(self.call("GET", "/v1/projects?kind=soc-case", token=b)[1]["projects"], [])

    def test_legacy_database_is_upgraded_and_tagged(self):
        import sqlite3, pathlib
        with tempfile.TemporaryDirectory() as d:
            path = f"{d}/old.db"
            c = sqlite3.connect(path)
            old = (pathlib.Path(srv.__file__).resolve().parent.parent / "schema.sql").read_text()
            old = old.replace("  kind TEXT NOT NULL DEFAULT 'prd' CHECK (kind IN ('prd','soc-case','soc-library')),\n", "")
            old = "\n".join(l for l in old.splitlines() if "idx_projects_org_kind" not in l)
            c.executescript(old)
            c.execute("INSERT INTO users VALUES ('u','o@x.co','n','h',1)")
            c.execute("INSERT INTO orgs VALUES ('o','org',1)")
            c.execute("INSERT INTO projects (id,org_id,name,doc,version,created_by,created_at,updated_at) VALUES ('p1','o','prd','{\"goal\":1}',1,'u',1,1)")
            c.execute("INSERT INTO projects (id,org_id,name,doc,version,created_by,created_at,updated_at) VALUES ('p2','o','case','{\"kind\":\"soc-case\"}',1,'u',1,1)")
            c.commit()
            c.close()
            app = srv.App(f"sqlite:///{path}", SECRET)
            app.store.migrate()
            app.store.migrate()  # idempotent
            rows = {r["id"]: r["kind"] for r in app.store.all("SELECT id, kind FROM projects")}
            self.assertEqual(rows, {"p1": "prd", "p2": "soc-case"})
            with self.assertRaises(Exception):
                app.store.write("UPDATE projects SET kind = 'bogus' WHERE id = 'p1'")


class CoreTests(unittest.TestCase):
    def test_scoring_matches_front_end_formula(self):
        self.assertEqual(core.pain_score({"s": 5, "a": ["18-24", "25-34"], "c": "locked"}), 2.0)
        self.assertEqual(core.pain_score({"s": 4, "a": ["18-24"], "c": "partial"}), 2.4)
        self.assertEqual(core.pain_score({"s": 3, "a": [], "c": "full"}), 3.0)

    def test_roles(self):
        self.assertTrue(core.can("owner", "admin"))
        self.assertTrue(core.can("contributor", "write"))
        self.assertFalse(core.can("contributor", "admin"))
        self.assertFalse(core.can("viewer", "write"))
        self.assertFalse(core.can("nobody", "read"))

    def test_password_hash_roundtrip(self):
        h = core.hash_password("correct-horse-battery", iterations=1000)
        self.assertTrue(core.verify_password("correct-horse-battery", h))
        self.assertFalse(core.verify_password("wrong", h))

    def test_rate_bucket_refills(self):
        b = core.TokenBucket(60, burst=2)
        self.assertTrue(b.allow("k", now=0))
        self.assertTrue(b.allow("k", now=0))
        self.assertFalse(b.allow("k", now=0))
        self.assertTrue(b.allow("k", now=2))


if __name__ == "__main__":
    unittest.main()
