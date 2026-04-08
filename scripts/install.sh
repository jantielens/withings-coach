#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Withings Coach — Install Script (Proxmox LXC)
#
# Usage (run as root on a fresh Debian/Ubuntu LXC):
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/scripts/install.sh)"
#
# What it does:
#   1. Installs Node.js 20 (via NodeSource) if not present
#   2. Installs pm2 globally if not present
#   3. Clones the repo to /opt/withings-coach
#   4. Runs npm ci + npm run build
#   5. Generates a .env template
#   6. Sets up pm2 to run the app
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/withings-coach"
REPO_URL="${REPO_URL:-https://github.com/jantielens/withings-coach.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR=20

# ── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Pre-flight ───────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root."
fi

info "Starting Withings Coach installation..."

# ── 0. Base dependencies ─────────────────────────────────────────────
info "Installing base dependencies..."
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git >/dev/null
ok "Base dependencies ready"

# ── 1. Node.js ───────────────────────────────────────────────────────
if command -v node &>/dev/null && node -v | grep -q "v${NODE_MAJOR}"; then
  ok "Node.js $(node -v) already installed"
else
  info "Installing Node.js ${NODE_MAJOR}..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs >/dev/null
  ok "Node.js $(node -v) installed"
fi

# ── 2. pm2 ───────────────────────────────────────────────────────────
if command -v pm2 &>/dev/null; then
  ok "pm2 already installed"
else
  info "Installing pm2..."
  npm install -g pm2 --silent
  ok "pm2 installed"
fi

# ── 3. Clone or update repo ─────────────────────────────────────────
if [[ -d "${APP_DIR}/.git" ]]; then
  warn "${APP_DIR} already exists — pulling latest..."
  cd "${APP_DIR}"
  git pull origin "${BRANCH}"
else
  info "Cloning repository to ${APP_DIR}..."
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

ok "Source code ready at ${APP_DIR}"

# ── 5. Install dependencies + build ─────────────────────────────────
info "Installing dependencies..."
npm ci --silent

info "Building Next.js app..."
npm run build

ok "Build complete"

# ── 6. Generate .env template ────────────────────────────────────────
ENV_FILE="${APP_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  warn ".env already exists — not overwriting. Check DEPLOY.md for required variables."
else
  info "Generating .env template..."
  cat > "${ENV_FILE}" <<'ENVEOF'
# ─── Withings Coach — Production Environment ─────────────────────────
# Fill in ALL values below. See DEPLOY.md for step-by-step instructions.
#
# After editing, run:
#   cd /opt/withings-coach && npm run build && pm2 restart withings-coach

NODE_ENV=production

# ━━━ REQUIRED: App URL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# The URL where you access the app. Used for Withings OAuth redirects.
# Examples:
#   http://192.168.1.50:3000          (local network, no TLS)
#   https://coach.example.com         (custom domain with TLS)
#   https://mybox.tail1234.ts.net     (Tailscale)
#
# ⚠️  BUILD-TIME variable — you MUST run "npm run build" after changing this.
#     The Withings callback URL in your Withings dashboard must match:
#     <this-value>/api/auth/withings/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ━━━ REQUIRED: Iron Session ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Encryption key for auth cookies (32+ characters)
# Generate with: openssl rand -base64 32
IRON_SESSION_PASSWORD=

# ━━━ REQUIRED: Withings OAuth ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Get from https://developer.withings.com/dashboard/
WITHINGS_CLIENT_ID=
WITHINGS_CLIENT_SECRET=

# ━━━ REQUIRED: Azure AI Foundry ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Your AI Foundry resource name (e.g. "my-ai-foundry")
AZURE_OPENAI_RESOURCE_NAME=
# Model deployment name (e.g. "gpt-4o")
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# ━━━ REQUIRED: Azure AI Auth (pick ONE option) ━━━━━━━━━━━━━━━━━━━━━
#
# Option A: API Key (simplest)
# Get from: Azure Portal → your AI Foundry resource → Keys and Endpoint
AZURE_OPENAI_API_KEY=
#
# Option B: Service Principal (if you prefer managed credentials)
# See DEPLOY.md Step 3. Leave AZURE_OPENAI_API_KEY empty to use this.
# AZURE_CLIENT_ID=
# AZURE_CLIENT_SECRET=
# AZURE_TENANT_ID=
ENVEOF

  ok ".env template created at ${ENV_FILE}"
fi

# ── 7. Create data directory for SQLite ──────────────────────────────
mkdir -p "${APP_DIR}/data"

# ── 8. Set up pm2 ───────────────────────────────────────────────────
PM2_NAME="withings-coach"

# Stop existing instance if running
pm2 describe "${PM2_NAME}" &>/dev/null && pm2 delete "${PM2_NAME}" 2>/dev/null || true

info "Starting app with pm2..."
cd "${APP_DIR}"
pm2 start npm --name "${PM2_NAME}" -- run start
pm2 save

# Set up pm2 to start on boot
pm2 startup systemd -u root --hp /root 2>/dev/null || true

ok "App running as pm2 process '${PM2_NAME}'"

# ── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Withings Coach installed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}App directory:${NC}  ${APP_DIR}"
echo -e "  ${CYAN}Config file:${NC}    ${APP_DIR}/.env"
echo -e "  ${CYAN}App URL:${NC}        http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Edit ${APP_DIR}/.env and fill in all values"
echo -e "  2. Run: cd ${APP_DIR} && pm2 restart withings-coach"
echo -e "  3. See ${APP_DIR}/DEPLOY.md for the full setup guide"
echo ""
echo -e "  ${CYAN}To update later:${NC}  cd ${APP_DIR} && ./scripts/update.sh"
echo ""
