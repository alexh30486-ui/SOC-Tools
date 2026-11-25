"""Pure logic: validation, passwords, signed tokens, roles, scoring, rate limiting. No I/O."""
import base64, hashlib, hmac, json, os, re, secrets, threading, time

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ROLE_RANK = {"viewer": 1, "contributor": 2, "owner": 3}
ACTION_RANK = {"read": 1, "write": 2, "admin": 3}
CTRL_WEIGHT = {"full": 1.0, "partial": 0.6, "locked": 0.2}
PBKDF2_ITER = int(os.environ.get("SPEC_PBKDF2_ITER", "210000"))


def valid_email(e):
    return isinstance(e, str) and len(e) <= 254 and bool(EMAIL_RE.match(e))


def valid_password(p):
    return isinstance(p, str) and 10 <= len(p) <= 256


def hash_password(pw, salt=None, iterations=PBKDF2_ITER):
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${dk.hex()}"


def verify_password(pw, stored):
    try:
        _, iters, salt_hex, dk_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(dk.hex(), dk_hex)
    except Exception:
        return False


def _b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def issue_token(secret, sub, ttl=12 * 3600, now=None):
    now = int(now if now is not None else time.time())
    body = _b64(json.dumps({"sub": sub, "iat": now, "exp": now + ttl}, separators=(",", ":")).encode())
    sig = _b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{sig}"


def read_token(secret, token, now=None):
    """Return the subject if the token is authentic and unexpired, else None."""
    try:
        body, sig = token.split(".")
        expected = _b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        claims = json.loads(_unb64(body))
        if claims["exp"] < int(now if now is not None else time.time()):
            return None
        return claims["sub"]
    except Exception:
        return None


def can(role, action):
    return ROLE_RANK.get(role, 0) >= ACTION_RANK[action]


def pain_score(p):
    """Same formula as the front end: severity x age reach x control weight, one decimal."""
    reach = max(1, len(p.get("a", [])))
    return round(p["s"] * reach * CTRL_WEIGHT[p["c"]], 1)


class TokenBucket:
    """Per-key token bucket. Single-process only; swap for Redis when running several replicas."""

    def __init__(self, per_minute, burst=None):
        self.rate = per_minute / 60.0
        self.burst = float(burst or per_minute)
        self.state = {}
        self.lock = threading.Lock()

    def allow(self, key, now=None):
        now = now if now is not None else time.monotonic()
        with self.lock:
            tokens, last = self.state.get(key, (self.burst, now))
            tokens = min(self.burst, tokens + (now - last) * self.rate)
            if tokens < 1:
                self.state[key] = (tokens, now)
                return False
            self.state[key] = (tokens - 1, now)
            return True
