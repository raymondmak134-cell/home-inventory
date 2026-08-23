#!/usr/bin/env bash
# Run once on the Lighthouse server (root) to store the Tanshu API key for production.
# The key is kept on the server only — never commit it to Git.
set -euo pipefail

DATA_DIR="${DATA_DIR:-/var/lib/jiawucang}"
KEY_FILE="${DATA_DIR}/tanshu.api_key"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<EOF
Usage:
  TANSHU_API_KEY=your-key bash $0
  bash $0 your-key

Writes the key to: ${KEY_FILE}
Then restart API: systemctl restart jiawucang-api
EOF
  exit 0
fi

key="${TANSHU_API_KEY:-${1:-}}"
if [ -z "$key" ]; then
  echo "Paste your Tanshu API key and press Enter:"
  read -rs key
  echo
fi

if [ -z "$key" ]; then
  echo "No API key provided." >&2
  exit 1
fi

mkdir -p "$DATA_DIR"
printf '%s' "$key" >"$KEY_FILE"
chmod 600 "$KEY_FILE"

echo "Saved TANSHU_API_KEY to ${KEY_FILE}"
echo "Restart API to apply:"
echo "  systemctl restart jiawucang-api"
