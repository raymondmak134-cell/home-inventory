#!/usr/bin/env bash
# Run on the Tencent Lighthouse server (root), e.g. via 免密登录 web terminal.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/raymondmak134-cell/home-inventory.git}"
REPO_BRANCH="${REPO_BRANCH:-cursor/home-inventory-scaffold-f1ec}"
APP_DIR="${APP_DIR:-/opt/jiawucang}"
WEB_ROOT="${WEB_ROOT:-/var/www/jiawucang}"

install_base_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y nginx git curl ca-certificates gnupg
  elif command -v dnf >/dev/null 2>&1; then
    # OpenCloudOS + BT Panel often excludes nginx/httpd from default dnf matches.
    dnf install -y git curl ca-certificates
    dnf install -y nginx --disableexcludes=all
  elif command -v yum >/dev/null 2>&1; then
    yum install -y git curl ca-certificates
    yum install -y nginx --disableexcludes=all
  else
    echo "Unsupported package manager" >&2
    exit 1
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    echo "Node already installed: $(node -v)"
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    if command -v dnf >/dev/null 2>&1; then
      dnf install -y nodejs
    else
      yum install -y nodejs
    fi
  else
    echo "Cannot install Node.js automatically on this OS." >&2
    exit 1
  fi
}

configure_nginx() {
  if [ -d /etc/nginx/sites-available ]; then
    cat >/etc/nginx/sites-available/jiawucang <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${WEB_ROOT};
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    mkdir -p /etc/nginx/sites-enabled
    ln -sfn /etc/nginx/sites-available/jiawucang /etc/nginx/sites-enabled/jiawucang
    rm -f /etc/nginx/sites-enabled/default
  elif [ -d /etc/nginx/conf.d ]; then
    cat >/etc/nginx/conf.d/jiawucang.conf <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${WEB_ROOT};
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
  else
    echo "nginx config directory not found" >&2
    exit 1
  fi

  nginx -t
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl restart nginx
}

echo "==> Installing base packages"
install_base_packages

echo "==> Installing Node.js 22"
install_node

echo "==> Enabling pnpm"
corepack enable
corepack prepare pnpm@10.12.1 --activate

echo "==> Fetching source (${REPO_BRANCH})"
rm -rf "$APP_DIR"
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo "==> Building frontend"
pnpm install --frozen-lockfile
pnpm build

echo "==> Publishing static files"
mkdir -p "$WEB_ROOT"
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a dist/. "$WEB_ROOT/"

echo "==> Configuring nginx"
configure_nginx

PUBLIC_IP="$(curl -fsS --max-time 3 ifconfig.me 2>/dev/null || true)"
echo
echo "Deploy finished."
if [ -n "$PUBLIC_IP" ]; then
  echo "Open: http://${PUBLIC_IP}/"
else
  echo "Open: http://YOUR_PUBLIC_IP/"
fi
