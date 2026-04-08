#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Withings Coach — Update Script
#
# Usage (from the app directory):
#   ./scripts/update.sh
#
# What it does:
#   1. Pulls latest code from main
#   2. Installs/updates dependencies
#   3. Rebuilds the Next.js app
#   4. Restarts the pm2 process
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM2_NAME="withings-coach"

# ── Colors ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }

cd "${APP_DIR}"

info "Pulling latest changes..."
git pull origin main

info "Installing dependencies..."
npm ci --silent

info "Building..."
npm run build

info "Restarting app..."
pm2 restart "${PM2_NAME}"

ok "Update complete!"
echo -e "  ${CYAN}Status:${NC} pm2 status"
echo -e "  ${CYAN}Logs:${NC}   pm2 logs ${PM2_NAME}"
