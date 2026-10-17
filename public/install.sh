#!/usr/bin/env bash
# ==============================================================================
# ArzPulse Pro — One-Line Automated Server Installer & 'sudo arz' CLI
# Run directly on Ubuntu / Debian via:
#   bash <(curl -Ls https://raw.githubusercontent.com/samkaren/ArzPulse-Bot/main/install.sh)
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/arzpulse"
CLI_PATH="/usr/local/bin/arz"
REPO_URL="https://github.com/samkaren/ArzPulse-Bot.git"

if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[INFO] Elevating privileges with sudo...${NC}"
  exec sudo bash "$0" "$@"
fi

clear
echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}   🚀 ArzPulse Pro — Automatic One-Line Server Installer        ${NC}"
echo -e "${CYAN}================================================================${NC}"

read -rp "1) Enter your Telegram Bot Token (from @BotFather): " INPUT_BOT_TOKEN </dev/tty || true
read -rp "2) Enter your Telegram Numeric Owner ID (e.g. 123456789): " INPUT_OWNER_ID </dev/tty || true
read -rp "3) Enter Domain, Subdomain, or Server IP (leave blank for IP auto-detect): " INPUT_HOST </dev/tty || true

BOT_TOKEN="${INPUT_BOT_TOKEN:-YOUR_TELEGRAM_BOT_TOKEN}"
OWNER_ID="${INPUT_OWNER_ID:-123456789}"
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
TARGET_HOST="${INPUT_HOST:-$SERVER_IP}"

apt-get update -y
apt-get install -y python3 python3-venv python3-pip curl wget git nginx certbot python3-certbot-nginx openssl jq

mkdir -p "$INSTALL_DIR"
chmod +x "$CLI_PATH" 2>/dev/null || true
echo -e "${GREEN}✅ ArzPulse Pro Installed! Run 'sudo arz' to manage.${NC}"
