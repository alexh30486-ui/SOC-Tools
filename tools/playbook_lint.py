#!/usr/bin/env python3
"""Lint SOC playbooks with the same rules as the Spectacle SOC app. Stdlib only.

  python3 tools/playbook_lint.py                      # lint every playbooks/**/*.md
  python3 tools/playbook_lint.py --base origin/main   # also require version = base version + 1 for changed files

Exit code 1 if any playbook fails, so it can gate a pull request.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

SECTIONS = ["1. Purpose", "2. At a glance", "3. Before you start", "4. Triage",
            "5. Investigation steps", "6. Containment", "7. Eradication and recovery",
            "8. Escalation", "9. Evidence to collect", "10. Report card", "11. Settings"]
SECRET = [re.compile(p, re.I if i == 2 else 0) for i, p in enumerate([
    r"AKIA[0-9A-Z]{16}",
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*\S{6,}",
    r"\bghp_[A-Za-z0-9]{20,}",
    r"\bxox[baprs]-[A-Za-z0-9-]{10,}",
])]


def version(body):
    m = re.search(r"^\s*-?\s*version:\s*(\d+)", body, re.M | re.I)
    return int(m.group(1)) if m else 0


def section(body, title):
    m = re.search(r"## " + re.escape(title) + r"\n(.*?)(?=\n## |\s*\Z)", body, re.S)
    return m.group(1) if m else None


def steps(body):
    sec = section(body, "5. Investigation steps")
    out = []
    for line in (sec or "").split("\n"):
        m = re.match(r"^\s*(\d+)\.\s+(.*\S)\s*$", line)
        if m:
            out.append(int(m.group(1)))
    return out


def lint(body, base_version=None):
    heads = [l[3:].strip() for l in body.split("\n") if l.startswith("## ")]
    missing = [s for s in SECTIONS if s not in heads]
    idx = [heads.index(s) if s in heads else -1 for s in SECTIONS]
    ordered = all(i == 0 or idx[i] > idx[i - 1] for i in range(len(idx)))
    st = steps(body)
    esc = section(body, "8. Escalation")
    v = version(body)
    checks = [
        ("All 11 sections present, in order", not missing and ordered,
         ("missing: " + ", ".join(missing)) if missing else ("" if ordered else "sections are out of order")),
        ("No secrets or credentials", not any(r.search(body) for r in SECRET), "looks like a key, token or password"),
        ("Steps are numbered 1, 2, 3...", len(st) >= 3 and st == list(range(1, len(st) + 1)), f"{len(st)} steps found"),
        ("Escalation path stated", bool(esc and re.sub(r"[-\s]", "", esc)), "section 8 is empty"),
        ("Has a version", v >= 1, f"version: {v}"),
    ]
    if base_version is not None:
        checks.append(("Version bumped by one", v == base_version + 1, f"version: {v}, base is {base_version}"))
    return checks


def git_show(ref, path):
    r = subprocess.run(["git", "show", f"{ref}:{path}"], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", help="git ref to compare against, e.g. origin/main")
    ap.add_argument("--dir", default="playbooks")
    a = ap.parse_args()
    files = sorted(Path(a.dir).rglob("*.md"))
    if not files:
        print(f"no playbooks found under {a.dir}/")
        return 1
    failed = 0
    for f in files:
        body = f.read_text(encoding="utf-8")
        bv = None
        if a.base:
            old = git_show(a.base, f.as_posix())
            if old is not None and old != body:
                bv = version(old)
            elif old is not None:
                bv = None  # unchanged, no bump needed
        for name, ok, detail in lint(body, bv):
            if not ok:
                failed += 1
                print(f"FAIL {f}: {name} ({detail})")
        else:
            pass
    print(f"{len(files)} playbooks checked, {failed} problems")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
