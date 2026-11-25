#!/bin/sh
# First publication only. No GitHub CLI required. Refuses nonempty remotes.
set -eu
cd "$(dirname "$0")"
url='https://github.com/alexh30486-ui/SOC-Tools.git'

if ! command -v git >/dev/null 2>&1; then
  echo 'Git is missing. On macOS run: xcode-select --install' >&2
  exit 1
fi
if [ -z "$(git config user.name || :)" ] || [ -z "$(git config user.email || :)" ]; then
  cat >&2 <<'HELP'
Configure your Git commit identity, then rerun this script:
  git config --global user.name "Your GitHub display name"
  git config --global user.email "Your GitHub commit email (or noreply email)"
HELP
  exit 1
fi
if [ -d .git ] && [ -n "$(git log -1 --pretty=%H 2>/dev/null || :)" ]; then
  echo 'This folder already has commits. Use git push for an existing repository.' >&2
  exit 1
fi
# Avoid uploading to a repository with an existing initial README/commit.
# A private repository may require authentication even to check its refs.
if ! refs=$(git ls-remote "$url" 2>/dev/null); then
  cat >&2 <<'HELP'
Could not reach the GitHub repository. Ensure an EMPTY repo exists at:
  https://github.com/alexh30486-ui/SOC-Tools
Then authenticate Git over HTTPS (with a credential manager or token) and rerun.
HELP
  exit 1
fi
if [ -n "$refs" ]; then
  echo 'Remote repository is NOT empty. Refusing to overwrite its history.' >&2
  echo 'Recreate an empty repository, or use the normal clone/merge process.' >&2
  exit 1
fi
if [ ! -d .git ]; then git init -b main; fi
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$url"
else
  git remote add origin "$url"
fi
# Do not stage local secrets even if somebody created .env etc.
git add .
if git ls-files | grep -E '(^|/)(\.env$|\.secret$|node_modules/|\.venv/|[^/]+\.db$)' >/dev/null; then
  echo 'Safety check: a secret/runtime file was staged. Aborting.' >&2
  git reset >/dev/null 2>&1 || :
  exit 1
fi
if git diff --cached --quiet; then
  echo 'No files staged; nothing to publish.' >&2
  exit 1
fi
git commit -m 'Initial Spectacle SOC v12 release'
git branch -M main
printf '\nPublishing to %s ...\n' "$url"
git push -u origin main
printf '\nPublished! Visit https://github.com/alexh30486-ui/SOC-Tools\n'
