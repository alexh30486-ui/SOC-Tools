"""Pull-request simulation for the playbook lint, with real git. Run: python3 -m unittest discover -s tests"""
import pathlib, re, shutil, subprocess, tempfile, unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
PB = "playbooks/investigation/agent-offline.md"


def git(cwd, *a):
    subprocess.run(["git", *a], cwd=cwd, check=True, capture_output=True, env={
        "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t",
        "PATH": "/usr/bin:/bin:/usr/local/bin", "HOME": str(cwd)})


class PullRequestLint(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.r = pathlib.Path(self.tmp.name)
        shutil.copytree(ROOT / "playbooks", self.r / "playbooks")
        shutil.copytree(ROOT / "tools", self.r / "tools")
        git(self.r, "init", "-q", "-b", "main")
        git(self.r, "add", "-A")
        git(self.r, "commit", "-qm", "base")
        git(self.r, "checkout", "-qb", "feature")

    def tearDown(self):
        self.tmp.cleanup()

    def lint(self, base=True):
        cmd = ["python3", "tools/playbook_lint.py"] + (["--base", "main"] if base else [])
        p = subprocess.run(cmd, cwd=self.r, capture_output=True, text=True)
        return p.returncode, p.stdout + p.stderr

    def edit(self, fn):
        f = self.r / PB
        f.write_text(fn(f.read_text()))

    @staticmethod
    def bump(t):
        return re.sub(r"version: (\d+)", lambda m: "version: %d" % (int(m.group(1)) + 1), t, count=1)

    def test_untouched_branch_passes(self):
        self.assertEqual(self.lint()[0], 0)

    def test_good_change_with_version_bump_passes(self):
        self.edit(lambda t: self.bump(t) + "\n- one more thing to check\n")
        self.assertEqual(self.lint()[0], 0)

    def test_missing_section_4_blocks(self):
        self.edit(lambda t: self.bump(re.sub(r"## 4\. Triage.*?(?=## 5\.)", "", t, flags=re.S)))
        code, out = self.lint()
        self.assertEqual(code, 1)
        self.assertIn("missing: 4. Triage", out)

    def test_unmasked_api_key_blocks(self):
        for secret in ["api_key: abcd1234efgh5678", "password: hunter2hunter2", "AKIA" + "ABCDEFGHIJKLMNOP",
                       "-----BEGIN RSA PRIVATE KEY-----", "ghp_" + "a" * 36]:
            with self.subTest(secret=secret[:12]):
                git(self.r, "checkout", "-q", "--", ".")
                self.edit(lambda t: self.bump(t) + "\n" + secret + "\n")
                code, out = self.lint()
                self.assertEqual(code, 1, out)
                self.assertIn("No secrets", out)

    def test_change_without_version_bump_blocks(self):
        self.edit(lambda t: t + "\n- sneaky edit\n")
        code, out = self.lint()
        self.assertEqual(code, 1)
        self.assertIn("Version bumped by one", out)

    def test_version_skip_blocks(self):
        self.edit(lambda t: re.sub(r"version: (\d+)", lambda m: "version: %d" % (int(m.group(1)) + 5), t, count=1) + "\n- x\n")
        self.assertEqual(self.lint()[0], 1)

    def test_removed_escalation_blocks(self):
        self.edit(lambda t: self.bump(re.sub(r"## 8\. Escalation.*?(?=## 9\.)", "## 8. Escalation\n\n", t, flags=re.S)))
        code, out = self.lint()
        self.assertEqual(code, 1)
        self.assertIn("Escalation", out)

    def test_too_few_steps_blocks(self):
        def cut(t):
            sec = re.search(r"## 5\. Investigation steps\n(.*?)(?=## 6\.)", t, re.S).group(1)
            return t.replace(sec, "\n1. **Only step** do something.\n\n")
        self.edit(lambda t: self.bump(cut(t)))
        self.assertEqual(self.lint()[0], 1)


if __name__ == "__main__":
    unittest.main()
