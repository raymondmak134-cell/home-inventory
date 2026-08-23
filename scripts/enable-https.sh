#!/usr/bin/env bash
# Run on the Tencent Lighthouse server as root after DNS points to this host.
set -euo pipefail

DOMAIN="${DOMAIN:-jiacang.site}"
EMAIL="${EMAIL:-}"

if ! command -v certbot >/dev/null 2>&1; then
  dnf install -y certbot python3-certbot-nginx --disableexcludes=all
fi

if [ -z "$EMAIL" ]; then
  echo "Set EMAIL for Let's Encrypt notices, e.g.:"
  echo "  EMAIL=you@example.com bash $0"
  exit 1
fi

certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --redirect

nginx -t
systemctl reload nginx

echo
echo "HTTPS enabled:"
echo "  https://${DOMAIN}/"
echo "  https://www.${DOMAIN}/"
