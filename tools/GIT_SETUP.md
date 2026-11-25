# Playbooks in git

1. Commit the `playbooks/` folder, `tools/playbook_lint.py` and `.github/` to a repository.
2. In GitHub: Settings, Branches, add a rule for `main`:
   - Require a pull request before merging
   - Require approvals (1 or more) and **Require review from Code Owners**
   - Require status checks to pass: `lint`
   - Dismiss stale approvals when new commits are pushed
3. Edit `.github/CODEOWNERS` so it names your real reviewers.

Now a playbook change needs a second person and passing checks. The lint is the same
rule set as the app (`11 sections in order, no secrets, numbered steps, escalation path,
version bumped by one`).

Round trip: export from the app's Playbooks page, commit, review in a pull request, then
import the merged `.md` files back with "import .md files" (they arrive as drafts, so the
app's checks run again).

## Automatic setup

`tools/protect_main.sh OWNER/REPO --dry-run` prints the rule; without `--dry-run` it applies it with the GitHub CLI (`gh auth login` first, as a repo admin). Put real reviewers in `.github/CODEOWNERS` first. The script refuses otherwise.
