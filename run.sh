#!/bin/sh
# One command: rebuild the web app (if node is available), then serve app + API on http://localhost:8080
set -e
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1 && [ -f web/src/app.tsx ]; then
  (cd web && python3 build.py index.html >/dev/null 2>&1) && echo "web rebuilt" || echo "web not rebuilt (TypeScript not installed); serving the existing web/index.html. This is fine unless you edited web/src."
fi
if [ -z "$SPEC_SECRET" ]; then
  [ -f api/.secret ] || python3 -c "import secrets;print(secrets.token_urlsafe(48))" > api/.secret
  SPEC_SECRET=$(cat api/.secret); export SPEC_SECRET
fi
export SPEC_DATABASE_URL="${SPEC_DATABASE_URL:-sqlite:///$(pwd)/api/spec-dev.db}"
cd api
echo "Spectacle running at http://localhost:${PORT:-8080}"
exec python3 -m spec_api.server
