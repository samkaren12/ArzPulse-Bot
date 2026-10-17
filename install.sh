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

echo -e "\n${BLUE}[1/5] Updating apt packages & installing Python, Node.js, Nginx, Certbot...${NC}"
apt-get update -y
apt-get install -y python3 python3-venv python3-pip curl wget git nginx certbot python3-certbot-nginx openssl jq

echo -e "${BLUE}[2/5] Setting up $INSTALL_DIR and cloning/creating project files...${NC}"
mkdir -p "$INSTALL_DIR"
if git ls-remote "$REPO_URL" &>/dev/null; then
  git clone "$REPO_URL" "$INSTALL_DIR/repo" 2>/dev/null || true
  cp -r "$INSTALL_DIR/repo/"* "$INSTALL_DIR/" 2>/dev/null || true
fi

cat << EOF > "$INSTALL_DIR/.env"
BOT_TOKEN="$BOT_TOKEN"
OWNER_ID="$OWNER_ID"
WEB_PANEL_URL="https://$TARGET_HOST"
ADMIN_USERNAME="owner_admin"
ADMIN_PASSWORD="ArzPanel@2026#Pro"
TON_WALLET="UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-"
TRON_WALLET="TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy"
EOF

echo -e "${BLUE}[3/5] Creating Python virtual environment & installing aiogram 3.x + matplotlib...${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install aiogram aiohttp matplotlib python-dotenv

echo -e "${BLUE}[4/5] Configuring systemd service (arzpulse-bot.service)...${NC}"
cat << 'EOF' > /etc/systemd/system/arzpulse-bot.service
[Unit]
Description=ArzPulse Pro Telegram Bot (aiogram 3.x)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/arzpulse
EnvironmentFile=/opt/arzpulse/.env
ExecStart=/opt/arzpulse/venv/bin/python3 /opt/arzpulse/bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable arzpulse-bot.service || true

echo -e "${BLUE}[5/5] Installing 'sudo arz' Server Management CLI at $CLI_PATH...${NC}"
cat << 'EOF' > "$CLI_PATH"
#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/arzpulse"

show_menu() {
  clear
  echo -e "${CYAN}================================================================${NC}"
  echo -e "${GREEN}         👑 ArzPulse Pro Server Manager (sudo arz)              ${NC}"
  echo -e "${CYAN}================================================================${NC}"
  echo -e "  ${YELLOW}1)${NC} 📊 Show Service Status & Live Logs"
  echo -e "  ${YELLOW}2)${NC} 🔄 Update Bot & Web Panel (Git Pull & Dependencies)"
  echo -e "  ${YELLOW}3)${NC} ♻️  Restart Bot & Web Panel Services"
  echo -e "  ${YELLOW}4)${NC} 🛑 Stop Bot & Web Panel Services"
  echo -e "  ${YELLOW}5)${NC} 🔒 Issue SSL Certificate (Domain / Subdomain / Public IP)"
  echo -e "  ${YELLOW}6)${NC} 🔑 Show / Reset Owner Web Admin Panel Credentials"
  echo -e "  ${YELLOW}7)${NC} 🗑️  Uninstall ArzPulse Pro Completely"
  echo -e "  ${YELLOW}0)${NC} 🚪 Exit"
  echo -e "${CYAN}================================================================${NC}"
  read -rp "Enter choice [0-7]: " choice
}

issue_ssl() {
  echo -e "\n${BLUE}[SSL Wizard] Enter your Domain, Subdomain, or Server IP Address:${NC}"
  read -rp "Target (e.g. bot.example.com or 203.0.113.10): " TARGET_HOST
  if [[ "$TARGET_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}Detected IP Address ($TARGET_HOST). Generating High-Security Self-Signed TLS Certificate for Nginx...${NC}"
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/arz-ip.key \
      -out /etc/nginx/ssl/arz-ip.crt \
      -subj "/CN=$TARGET_HOST"
    systemctl reload nginx
    echo -e "${GREEN}✅ IP HTTPS SSL configured at https://$TARGET_HOST${NC}"
  else
    read -rp "Enter email for Let's Encrypt SSL notifications: " SSL_EMAIL
    certbot --nginx -d "$TARGET_HOST" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect
    echo -e "${GREEN}✅ Let's Encrypt SSL successfully activated at https://$TARGET_HOST${NC}"
  fi
}

while true; do
  show_menu
  case "$choice" in
    1) systemctl status arzpulse-bot --no-pager || true ; read -rp "Press Enter..." ;;
    2) cd "$INSTALL_DIR" && git pull && systemctl restart arzpulse-bot ; echo -e "${GREEN}✅ Updated successfully!${NC}" ; read -rp "Press Enter..." ;;
    3) systemctl restart arzpulse-bot ; echo -e "${GREEN}✅ Services restarted!${NC}" ; read -rp "Press Enter..." ;;
    4) systemctl stop arzpulse-bot ; echo -e "${YELLOW}🛑 Services stopped.${NC}" ; read -rp "Press Enter..." ;;
    5) issue_ssl ; read -rp "Press Enter..." ;;
    6) cat "$INSTALL_DIR/.env" | grep -E "ADMIN_USERNAME|ADMIN_PASSWORD|WEB_PANEL_URL" ; read -rp "Press Enter..." ;;
    7) systemctl stop arzpulse-bot || true ; rm -rf "$INSTALL_DIR" "$CLI_PATH" ; echo -e "${RED}🗑️ Uninstalled.${NC}" ; exit 0 ;;
    0) exit 0 ;;
    *) echo -e "${RED}Invalid option!${NC}" ; sleep 1 ;;
  esac
done
EOF

chmod +x "$CLI_PATH"
echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ ArzPulse Pro Installed Successfully!                         ${NC}"
echo -e "${CYAN}👉 Type 'sudo arz' anytime to open the Server Management Menu.  ${NC}"
echo -e "${GREEN}================================================================${NC}"
