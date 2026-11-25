#!/bin/sh
# Turn on branch protection for main with the GitHub CLI.
#   tools/protect_main.sh OWNER/REPO            apply
#   tools/protect_main.sh OWNER/REPO --dry-run  print the rule and change nothing
#
# Needs: `gh auth login` as a repo admin. On a private repo, branch protection needs a paid
# GitHub plan (Pro, Team or Enterprise). Free private repos will get an error from GitHub.
set -eu
REPO="${1:?usage: protect_main.sh OWNER/REPO [--dry-run]}"
MODE="${2:-apply}"
BRANCH="${BRANCH:-main}"
CHECKS="${CHECKS:-lint api-tests smoke}"   # job names in .github/workflows

cd "$(dirname "$0")/.."
if grep -q "your-org" .github/CODEOWNERS; then
  echo "Refusing: .github/CODEOWNERS still contains the placeholder @your-org/soc-leads." >&2
  echo "Put real reviewers in it, commit, then run this again. Otherwise 'require code owner review'" >&2
  echo "would be satisfied by nobody, or by anyone." >&2
  exit 2
fi

CONTEXTS=$(python3 - "$CHECKS" <<'PY'
import json, sys
print(json.dumps(sys.argv[1].split()))
PY
)
RULE=$(cat <<JSON
{
  "required_status_checks": {"strict": true, "contexts": $CONTEXTS},
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
)
if [ "$MODE" = "--dry-run" ]; then echo "$RULE"; exit 0; fi
echo "$RULE" | gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" --input - >/dev/null
echo "Protected $REPO:$BRANCH. Verify:"
gh api "repos/$REPO/branches/$BRANCH/protection" --jq '{checks: .required_status_checks.contexts, reviews: .required_pull_request_reviews.required_approving_review_count, codeowners: .required_pull_request_reviews.require_code_owner_reviews, admins: .enforce_admins.enabled}'
