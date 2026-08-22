#!/usr/bin/env bash
# Run on the Tencent Lighthouse server (root), e.g. via 免密登录 web terminal.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/raymondmak134-cell/home-inventory.git}"
REPO_BRANCH="${REPO_BRANCH:-cursor/home-inventory-scaffold-f1ec}"
APP_DIR="${APP_DIR:-/opt/jiawucang}"
WEB_ROOT="${WEB_ROOT:-/var/www/jiawucang}"
DATA_DIR="${DATA_DIR:-/var/lib/jiawucang}"
API_PORT="${API_PORT:-3000}"
SERVICE_NAME="${SERVICE_NAME:-jiawucang-api}"

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

ensure_session_secret() {
  mkdir -p "$DATA_DIR"
  if [ ! -f "$DATA_DIR/session.secret" ]; then
    openssl rand -hex 32 >"$DATA_DIR/session.secret"
    chmod 600 "$DATA_DIR/session.secret"
  fi
}

configure_api_service() {
  local session_secret
  session_secret="$(cat "$DATA_DIR/session.secret")"

  cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Jiawucang auth API
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/server
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=${API_PORT}
Environment=DATABASE_PATH=${DATA_DIR}/jiawucang.sqlite
Environment=SESSION_SECRET=${session_secret}
Environment=SECURE_COOKIES=false
ExecStart=$(command -v pnpm) start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
  systemctl restart "$SERVICE_NAME"
}

configure_nginx() {
  local conf_body
  conf_body=$(cat <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${WEB_ROOT};
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
)

  if [ -d /etc/nginx/sites-available ]; then
    printf '%s\n' "$conf_body" >/etc/nginx/sites-available/jiawucang
    mkdir -p /etc/nginx/sites-enabled
    ln -sfn /etc/nginx/sites-available/jiawucang /etc/nginx/sites-enabled/jiawucang
    rm -f /etc/nginx/sites-enabled/default
  elif [ -d /etc/nginx/conf.d ]; then
    printf '%s\n' "$conf_body" >/etc/nginx/conf.d/jiawucang.conf
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

echo "==> Preparing data directory"
ensure_session_secret

echo "==> Fetching source (${REPO_BRANCH})"
rm -rf "$APP_DIR"
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Building frontend"
pnpm build

echo "==> Publishing static files"
mkdir -p "$WEB_ROOT"
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a dist/. "$WEB_ROOT/"

echo "==> Configuring API service"
configure_api_service

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
echo "API health: http://127.0.0.1:${API_PORT}/api/health"
