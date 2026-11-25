"""Data access. One SQL dialect for SQLite and PostgreSQL; only the placeholder style differs."""
import sqlite3, threading, pathlib


class Store:
    def __init__(self, url):
        self.lock = threading.RLock()  # one writer at a time per process
        if url.startswith("sqlite:///"):
            self.conn = sqlite3.connect(url[len("sqlite:///"):], check_same_thread=False)
            self.ph = "?"
        elif url.startswith(("postgres://", "postgresql://")):
            try:
                import psycopg  # production dependency; not installed in the test sandbox
            except ImportError as exc:
                raise RuntimeError("PostgreSQL URL given but psycopg is not installed") from exc
            self.conn = psycopg.connect(url, autocommit=False)
            self.ph = "%s"
        else:
            raise ValueError("unsupported SPEC_DATABASE_URL")

    def _sql(self, sql):
        return sql if self.ph == "?" else sql.replace("?", self.ph)

    def migrate(self, schema_path=None):
        path = pathlib.Path(schema_path or pathlib.Path(__file__).resolve().parent.parent / "schema.sql")
        text = "\n".join(l for l in path.read_text().splitlines() if not l.strip().startswith("--"))
        statements = [s.strip() for s in text.split(";") if s.strip()]
        with self.lock:
            cur = self.conn.cursor()
            for stmt in statements:
                cur.execute(stmt)
            self.conn.commit()
        self._upgrade_kind()

    def _upgrade_kind(self):
        """Databases created before the kind column existed: add it, then tag rows from their document."""
        with self.lock:
            cur = self.conn.cursor()
            try:
                cur.execute("SELECT kind FROM projects LIMIT 1")
                self.conn.commit()
                has = True
            except Exception:
                self.conn.rollback()
                has = False
            if not has:
                cur.execute("ALTER TABLE projects ADD COLUMN kind TEXT NOT NULL DEFAULT 'prd'"
                            " CHECK (kind IN ('prd','soc-case','soc-library'))")
                import json as _json
                cur.execute("SELECT id, doc FROM projects")
                for pid, doc in cur.fetchall():
                    try:
                        k = _json.loads(doc).get("kind")
                    except Exception:
                        k = None
                    if k in ("soc-case", "soc-library"):
                        cur.execute(self._sql("UPDATE projects SET kind = ? WHERE id = ?"), (k, pid))
            cur.execute("CREATE INDEX IF NOT EXISTS idx_projects_org_kind ON projects (org_id, kind, updated_at)")
            self.conn.commit()

    def one(self, sql, params=()):
        with self.lock:
            cur = self.conn.cursor()
            cur.execute(self._sql(sql), params)
            cols = [d[0] for d in cur.description]
            row = cur.fetchone()
            return dict(zip(cols, row)) if row else None

    def all(self, sql, params=()):
        with self.lock:
            cur = self.conn.cursor()
            cur.execute(self._sql(sql), params)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]

    def write(self, sql, params=()):
        """Run one statement in a transaction; returns affected row count."""
        with self.lock:
            cur = self.conn.cursor()
            try:
                cur.execute(self._sql(sql), params)
                self.conn.commit()
                return cur.rowcount
            except Exception:
                self.conn.rollback()
                raise

    def ping(self):
        return self.one("SELECT 1 AS ok") is not None
