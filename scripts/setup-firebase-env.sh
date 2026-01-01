#!/usr/bin/env bash
# Usage: ./scripts/setup-firebase-env.sh /path/to/serviceAccountKey.json
# Requires: jq
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/serviceAccountKey.json"
  exit 2
fi
SA_FILE="$1"
if [ ! -f "$SA_FILE" ]; then
  echo "Service account file not found: $SA_FILE"
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "This script requires 'jq'. Install it with 'brew install jq' (macOS) or your package manager."
  exit 2
fi
PROJECT_ID=$(jq -r '.project_id' "$SA_FILE")
CLIENT_EMAIL=$(jq -r '.client_email' "$SA_FILE")
# private_key may contain newlines; we need to escape them for env file
PRIVATE_KEY_RAW=$(jq -r '.private_key' "$SA_FILE")
# Replace literal newlines with \n for storing in .env
PRIVATE_KEY_ESCAPED=$(printf "%s" "$PRIVATE_KEY_RAW" | python3 -c 'import sys,urllib.parse; s=sys.stdin.read(); print(s.replace("\n","\\n"))')
ENV_FILE=".env.development"
# Backup
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
# Write or replace keys (use sed/printf to avoid embedding large values in python heredoc)
set_or_replace() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*$|${key}=\"${value}\"|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    printf "\n%s=\"%s\"\n" "$key" "$value" >> "$ENV_FILE"
  fi
}

set_or_replace "FIREBASE_PRIVATE_KEY" "$PRIVATE_KEY_ESCAPED"
set_or_replace "FIREBASE_CLIENT_EMAIL" "$CLIENT_EMAIL"
set_or_replace "FIREBASE_PROJECT_ID" "$PROJECT_ID"
set_or_replace "FIREBASE_DATABASE_URL" "https://$PROJECT_ID.firebaseio.com"

echo "Updated $ENV_FILE (backup saved as ${ENV_FILE}.bak.<timestamp> before modifications)."

echo "Done. A backup was saved to ${ENV_FILE}.bak.$(date +%s)"

echo "Next: start your dev server after installing deps:"
echo "  npm install --legacy-peer-deps"
echo "  npx next dev -p 3000"
