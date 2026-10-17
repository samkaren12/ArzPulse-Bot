import { TON_WALLET, TRON_WALLET, DEFAULT_GITHUB_URL } from './currencyEngine.ts';

export interface BotConfigOptions {
  botTokenPlaceholder?: string;
  ownerIdPlaceholder?: string;
  githubUrl?: string;
  githubUser?: string;
  repoName?: string;
  tonWallet?: string;
  tronWallet?: string;
  webPanelUrl?: string;
  adminUsername?: string;
  adminPassword?: string;
}

export function generateOneLineCurlCommands(githubUser = 'samkaren', repoName = 'ArzPulse-Bot') {
  const cleanUser = githubUser.trim() || 'samkaren';
  const cleanRepo = repoName.trim() || 'ArzPulse-Bot';
  const rawUrl = `https://raw.githubusercontent.com/${cleanUser}/${cleanRepo}/main/install.sh`;
  return {
    bashSubshell: `bash <(curl -Ls ${rawUrl})`,
    sudoPipe: `curl -fsSL ${rawUrl} | sudo bash`,
    wgetCmd: `wget -qO- ${rawUrl} | sudo bash`,
    rawUrl,
  };
}

export function generateAiogramBotCode(opts: BotConfigOptions = {}): string {
  const github = opts.githubUrl || DEFAULT_GITHUB_URL;
  const ton = opts.tonWallet || TON_WALLET;
  const tron = opts.tronWallet || TRON_WALLET;
  const webUrl = opts.webPanelUrl || 'https://panel.yourdomain.com';
  const adminUser = opts.adminUsername || 'owner_admin';
  const adminPass = opts.adminPassword || 'ArzPanel@2026#Pro';

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ArzPulse Pro — Multi-Language Telegram Currency & Crypto Bot (aiogram 3.x)
Features:
- Colored ReplyKeyboardMarkup buttons (primary / success / danger styles)
- 6 Languages: Persian (fa), English (en), Russian (ru), Arabic (ar), Chinese (zh), Turkish (tr)
- Live Currency & Crypto Price + 24h/7d Profit & Loss (PnL) + Matplotlib Chart Image
- Interactive Multi-Step Currency & Crypto Converter (any amount)
- Live Support Ticket System (User <-> Owner)
- Owner Management Console inside Bot (Displays Web Admin Panel Username & Password)
- Group & Channel Support (/price, /convert, inline & group triggers)
- Integrated Telegram Mini App WebAppInfo button
"""

import os
import io
import asyncio
import logging
import aiohttp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict

from aiogram import Bot, Dispatcher, F, Router
from aiogram.types import (
    Message,
    ReplyKeyboardMarkup,
    KeyboardButton,
    WebAppInfo,
    BufferedInputFile,
)
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

# ==================== CONFIGURATION ====================
BOT_TOKEN = os.getenv("BOT_TOKEN", "${opts.botTokenPlaceholder || 'YOUR_TELEGRAM_BOT_TOKEN'}")
OWNER_ID = int(os.getenv("OWNER_ID", "${opts.ownerIdPlaceholder || '123456789'}"))
WEB_PANEL_URL = os.getenv("WEB_PANEL_URL", "${webUrl}")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "${adminUser}")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "${adminPass}")

GITHUB_URL = "${github}"
TON_WALLET = "${ton}"
TRON_WALLET = "${tron}"

logging.basicConfig(level=logging.INFO)
router = Router()

# ==================== FSM STATES ====================
class BotStates(StatesGroup):
    choosing_language = State()
    waiting_for_price_asset = State()
    convert_first_asset = State()
    convert_second_asset = State()
    convert_amount = State()
    waiting_for_support_msg = State()
    owner_broadcast = State()

user_langs: Dict[int, str] = {}

# ==================== 6-LANGUAGE DICTIONARY ====================
LANGS: Dict[str, Dict[str, str]] = {
    "fa": {
        "welcome": "👋 به ربات هوشمند نرخ ارز و کریپتو **ArzPulse Pro** خوش آمدید!\\nاز منوی کیبورد رنگی زیر خدمت مورد نظر را انتخاب کنید:",
        "btn_price": "📊 قیمت واحد پول یا ارز",
        "btn_convert": "🔄 تبدیل ارز و واحد پول",
        "btn_lang": "🌐 تغییر زبان (Language)",
        "btn_support": "🎧 پشتیبانی آنلاین",
        "btn_guide": "📖 راهنمای ربات",
        "btn_creator": "👨‍💻 سازنده و دونیت",
        "btn_miniapp": "🚀 مینی‌اپ فوق حرفه‌ای",
        "btn_owner": "👑 مدیریت مالک (وب‌پنل)",
        "btn_group": "➕ افزودن به گروه یا کانال",
        "ask_price": "🔍 لطفاً نام ارز یا واحد پول را بفرستید (مثلاً: دلار، ترون، بیت کوین، تون، USD، TRX):",
        "ask_conv_1": "1️⃣ لطفاً نام **واحد پول یا ارز اول** را وارد کنید (مثلاً: دلار یا USD):",
        "ask_conv_2": "2️⃣ حالا نام **واحد پول یا ارز دوم** را وارد کنید (مثلاً: ترون یا TRX):",
        "ask_conv_amt": "🔢 چه تعداد می‌خواهید تبدیل کنید؟ (مثلاً عدد 1 یا 100 را وارد کنید):",
        "ask_support": "💬 پیام خود را برای پشتیبانی بنویسید تا مستقیماً برای مالک ارسال شود:",
        "support_ok": "✅ پیام شما ثبت شد و به پنل مدیریت مالک ارسال گردید.",
    },
    "en": {
        "welcome": "👋 Welcome to **ArzPulse Pro** Currency & Crypto Bot!\\nSelect a service from the colored keyboard menu below:",
        "btn_price": "📊 Currency & Crypto Price",
        "btn_convert": "🔄 Currency Converter",
        "btn_lang": "🌐 Change Language",
        "btn_support": "🎧 Live Support",
        "btn_guide": "📖 Bot Guide",
        "btn_creator": "👨‍💻 Creator & Donate",
        "btn_miniapp": "🚀 Pro Mini App",
        "btn_owner": "👑 Owner Admin Panel",
        "btn_group": "➕ Add to Group / Channel",
        "ask_price": "🔍 Send the currency or crypto name/ticker (e.g., USD, TRX, TON, BTC, EUR):",
        "ask_conv_1": "1️⃣ Enter the **First Currency / Crypto** (e.g., USD):",
        "ask_conv_2": "2️⃣ Now enter the **Second Currency / Crypto** (e.g., TRX):",
        "ask_conv_amt": "🔢 Enter the **Amount** to convert (e.g., 1 or 100):",
        "ask_support": "💬 Write your support message for the bot owner:",
        "support_ok": "✅ Your message has been sent to the Owner Web Panel.",
    },
    "ru": {
        "welcome": "👋 Добро пожаловать в **ArzPulse Pro**! Выберите услугу в меню:",
        "btn_price": "📊 Курс валют и крипто",
        "btn_convert": "🔄 Конвертер валют",
        "btn_lang": "🌐 Язык (Language)",
        "btn_support": "🎧 Поддержка",
        "btn_guide": "📖 Инструкция",
        "btn_creator": "👨‍💻 Создатель и Донат",
        "btn_miniapp": "🚀 Открыть Mini App",
        "btn_owner": "👑 Панель Владельца",
        "btn_group": "➕ В группу / канал",
        "ask_price": "🔍 Введите название или тикер валюты (USD, TRX, TON, BTC, RUB):",
        "ask_conv_1": "1️⃣ Введите **первую валюту** (например: USD):",
        "ask_conv_2": "2️⃣ Введите **вторую валюту** (например: TRX):",
        "ask_conv_amt": "🔢 Введите **количество** для конвертации (например: 1):",
        "ask_support": "💬 Напишите сообщение в поддержку:",
        "support_ok": "✅ Сообщение отправлено владельцу.",
    },
    "ar": {
        "welcome": "👋 مرحباً بك في بوت **ArzPulse Pro** للعملات والكريبتو!",
        "btn_price": "📊 أسعار العملات والكريبتو",
        "btn_convert": "🔄 محول العملات",
        "btn_lang": "🌐 تغيير اللغة",
        "btn_support": "🎧 الدعم الفني",
        "btn_guide": "📖 دليل البوت",
        "btn_creator": "👨‍💻 المطور والتبرع",
        "btn_miniapp": "🚀 تطبيق Mini App",
        "btn_owner": "👑 لوحة تحكم المالك",
        "btn_group": "➕ أضف لمجموعة أو قناة",
        "ask_price": "🔍 أرسل اسم العملة أو الرمز (مثل: دولار، ترون، USD، TRX):",
        "ask_conv_1": "1️⃣ أرسل اسم **العملة الأولى** (مثل: USD):",
        "ask_conv_2": "2️⃣ أرسل اسم **العملة الثانية** (مثل: TRX):",
        "ask_conv_amt": "🔢 أرسل **المبلغ** المراد تحويله (مثل: 1):",
        "ask_support": "💬 اكتب رسالتك لفريق الدعم:",
        "support_ok": "✅ تم إرسال رسالتك إلى لوحة تحكم المالك.",
    },
    "zh": {
        "welcome": "👋 欢迎使用 **ArzPulse Pro** 汇率与加密货币机器人！",
        "btn_price": "📊 货币与加密币价格",
        "btn_convert": "🔄 汇率精准换算",
        "btn_lang": "🌐 切换语言 (Language)",
        "btn_support": "🎧 在线客服支持",
        "btn_guide": "📖 机器人使用指南",
        "btn_creator": "👨‍💻 开发者与捐赠",
        "btn_miniapp": "🚀 启动专业版 Mini App",
        "btn_owner": "👑 站长管理后台",
        "btn_group": "➕ 添加到群组或频道",
        "ask_price": "🔍 请输入货币或加密货币代码 (例如: USD, TRX, TON, BTC, CNY):",
        "ask_conv_1": "1️⃣ 请输入**第一种货币** (例如: USD):",
        "ask_conv_2": "2️⃣ 请输入**第二种货币** (例如: TRX):",
        "ask_conv_amt": "🔢 请输入换算**数量** (例如: 1 或 100):",
        "ask_support": "💬 请输入您的客服留言：",
        "support_ok": "✅ 您的留言已发送至站长后台。",
    },
    "tr": {
        "welcome": "👋 **ArzPulse Pro** Döviz ve Kripto Botuna Hoş Geldiniz!",
        "btn_price": "📊 Döviz ve Kripto Fiyatı",
        "btn_convert": "🔄 Döviz Çevirici",
        "btn_lang": "🌐 Dil Değiştir",
        "btn_support": "🎧 Canlı Destek",
        "btn_guide": "📖 Bot Rehberi",
        "btn_creator": "👨‍💻 Yapımcı ve Bağış",
        "btn_miniapp": "🚀 Profesyonel Mini App",
        "btn_owner": "👑 Sahip Yönetim Paneli",
        "btn_group": "➕ Gruba / Kanala Ekle",
        "ask_price": "🔍 Lütfen para birimi veya kripto adını girin (USD, TRX, TON, BTC, TRY):",
        "ask_conv_1": "1️⃣ Lütfen **Birinci Para Birimini** girin (Örn: USD):",
        "ask_conv_2": "2️⃣ Şimdi **İkinci Para Birimini** girin (Örn: TRX):",
        "ask_conv_amt": "🔢 Çevrilecek **Miktarı** girin (Örn: 1 veya 100):",
        "ask_support": "💬 Destek mesajınızı yazın:",
        "support_ok": "✅ Mesajınız Sahip Paneline iletildi.",
    },
}

def get_lang(user_id: int) -> Dict[str, str]:
    code = user_langs.get(user_id, "fa")
    return LANGS.get(code, LANGS["fa"])

def build_colored_main_keyboard(user_id: int) -> ReplyKeyboardMarkup:
    """
    Builds ReplyKeyboardMarkup (NOT InlineKeyboardMarkup) with colored styles:
    - primary (Blue)
    - success (Green)
    - danger (Red)
    """
    L = get_lang(user_id)
    rows = [
        [
            KeyboardButton(text=L["btn_price"], style="success"),
            KeyboardButton(text=L["btn_convert"], style="primary"),
        ],
        [
            KeyboardButton(
                text=L["btn_miniapp"],
                web_app=WebAppInfo(url=f"{WEB_PANEL_URL}?mode=miniapp"),
                style="success",
            ),
            KeyboardButton(text=L["btn_lang"], style="primary"),
        ],
        [
            KeyboardButton(text=L["btn_support"], style="danger"),
            KeyboardButton(text=L["btn_guide"], style="primary"),
        ],
        [
            KeyboardButton(text=L["btn_creator"], style="success"),
            KeyboardButton(text=L["btn_group"], style="primary"),
        ],
    ]
    if user_id == OWNER_ID:
        rows.append([KeyboardButton(text=L["btn_owner"], style="danger")])

    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, is_persistent=True)

def render_pnl_chart_png(code: str, prices: list[float], change_24h: float) -> bytes:
    fig, ax = plt.subplots(figsize=(7, 3.6), dpi=160)
    fig.patch.set_facecolor("#0f172a")
    ax.set_facecolor("#0f172a")

    color = "#10b981" if change_24h >= 0 else "#ef4444"
    x = list(range(len(prices)))
    ax.plot(x, prices, color=color, linewidth=2.8, marker="o")
    ax.fill_between(x, prices, min(prices) * 0.995, color=color, alpha=0.18)

    sign = "+" if change_24h >= 0 else ""
    ax.set_title(f"{code}/USD  •  24h PnL: {sign}{change_24h:.2f}%", color="#f8fafc", fontsize=13, fontweight="bold")
    ax.tick_params(colors="#94a3b8")
    for spine in ax.spines.values():
        spine.set_color("#1e293b")
    ax.grid(True, linestyle="--", alpha=0.2, color="#475569")

    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return buf.read()

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    L = get_lang(message.from_user.id)
    await message.answer(
        L["welcome"],
        reply_markup=build_colored_main_keyboard(message.from_user.id),
        parse_mode="Markdown",
    )

@router.message(F.text.in_([v["btn_creator"] for v in LANGS.values()]))
async def show_creator(message: Message):
    text = (
        f"👨‍💻 **Developer & Creator GitHub:**\\n{GITHUB_URL}\\n\\n"
        f"💎 **Official Donation Wallets (GitHub Verified):**\\n\\n"
        f"🔹 **TON (Toncoin):**\\n\`{TON_WALLET}\`\\n\\n"
        f"🔺 **TRON (TRX - TRC20):**\\n\`{TRON_WALLET}\`"
    )
    await message.answer(text, parse_mode="Markdown")

@router.message(F.text.in_([v["btn_owner"] for v in LANGS.values()]))
async def show_owner_panel(message: Message):
    if message.from_user.id != OWNER_ID:
        return
    text = (
        f"👑 **Owner Management & Web Panel Credentials**\\n\\n"
        f"🌐 **Web Admin Panel URL:** {WEB_PANEL_URL}/admin\\n"
        f"👤 **Admin Username:** \`{ADMIN_USERNAME}\`\\n"
        f"🔑 **Admin Password:** \`{ADMIN_PASSWORD}\`\\n\\n"
        f"🖥 **Server CLI Command:** \`sudo arz\`"
    )
    await message.answer(text, parse_mode="Markdown")

async def main():
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
`;
}

export function generateInstallBashScript(opts: BotConfigOptions = {}): string {
  const githubUser = opts.githubUser || 'samkaren';
  const repoName = opts.repoName || 'ArzPulse-Bot';
  const adminUser = opts.adminUsername || 'owner_admin';
  const adminPass = opts.adminPassword || 'ArzPanel@2026#Pro';
  const ton = opts.tonWallet || TON_WALLET;
  const tron = opts.tronWallet || TRON_WALLET;

  return `#!/usr/bin/env bash
# ==============================================================================
# ArzPulse Pro — One-Line Automated Server Installer & 'sudo arz' CLI
# Run directly on Ubuntu / Debian via:
#   bash <(curl -Ls https://raw.githubusercontent.com/${githubUser}/${repoName}/main/install.sh)
# ==============================================================================

set -e

RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
NC='\\033[0m'

INSTALL_DIR="/opt/arzpulse"
CLI_PATH="/usr/local/bin/arz"
REPO_URL="https://github.com/${githubUser}/${repoName}.git"

if [ "$EUID" -ne 0 ]; then
  echo -e "\${YELLOW}[INFO] Elevating privileges with sudo...\${NC}"
  exec sudo bash "$0" "$@"
fi

clear
echo -e "\${CYAN}================================================================\${NC}"
echo -e "\${GREEN}   🚀 ArzPulse Pro — Automatic One-Line Server Installer        \${NC}"
echo -e "\${CYAN}================================================================\${NC}"

read -rp "1) Enter your Telegram Bot Token (from @BotFather): " INPUT_BOT_TOKEN </dev/tty || true
read -rp "2) Enter your Telegram Numeric Owner ID (e.g. 123456789): " INPUT_OWNER_ID </dev/tty || true
read -rp "3) Enter Domain, Subdomain, or Server IP (leave blank for IP auto-detect): " INPUT_HOST </dev/tty || true

BOT_TOKEN="\${INPUT_BOT_TOKEN:-YOUR_TELEGRAM_BOT_TOKEN}"
OWNER_ID="\${INPUT_OWNER_ID:-123456789}"
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
TARGET_HOST="\${INPUT_HOST:-\$SERVER_IP}"

echo -e "\\n\${BLUE}[1/5] Updating apt packages & installing Python, Node.js, Nginx, Certbot...\${NC}"
apt-get update -y
apt-get install -y python3 python3-venv python3-pip curl wget git nginx certbot python3-certbot-nginx openssl jq

echo -e "\${BLUE}[2/5] Setting up $INSTALL_DIR and cloning/creating project files...\${NC}"
mkdir -p "$INSTALL_DIR"
if git ls-remote "$REPO_URL" &>/dev/null; then
  git clone "$REPO_URL" "$INSTALL_DIR/repo" 2>/dev/null || true
  cp -r "$INSTALL_DIR/repo/"* "$INSTALL_DIR/" 2>/dev/null || true
fi

cat << EOF > "$INSTALL_DIR/.env"
BOT_TOKEN="$BOT_TOKEN"
OWNER_ID="$OWNER_ID"
WEB_PANEL_URL="https://$TARGET_HOST"
ADMIN_USERNAME="${adminUser}"
ADMIN_PASSWORD="${adminPass}"
TON_WALLET="${ton}"
TRON_WALLET="${tron}"
EOF

echo -e "\${BLUE}[3/5] Creating Python virtual environment & installing aiogram 3.x + matplotlib...\${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install aiogram aiohttp matplotlib python-dotenv

echo -e "\${BLUE}[4/5] Configuring systemd services (arzpulse-bot & arzpulse-web)...\${NC}"
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

echo -e "\${BLUE}[5/5] Installing 'sudo arz' Server Management CLI at $CLI_PATH...\${NC}"
cat << 'EOF' > "$CLI_PATH"
#!/usr/bin/env bash
set -e

RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
NC='\\033[0m'

INSTALL_DIR="/opt/arzpulse"

show_menu() {
  clear
  echo -e "\${CYAN}================================================================\${NC}"
  echo -e "\${GREEN}         👑 ArzPulse Pro Server Manager (sudo arz)              \${NC}"
  echo -e "\${CYAN}================================================================\${NC}"
  echo -e "  \${YELLOW}1)\${NC} 📊 Show Service Status & Live Logs"
  echo -e "  \${YELLOW}2)\${NC} 🔄 Update Bot & Web Panel (Git Pull & Dependencies)"
  echo -e "  \${YELLOW}3)\${NC} ♻️  Restart Bot & Web Panel Services"
  echo -e "  \${YELLOW}4)\${NC} 🛑 Stop Bot & Web Panel Services"
  echo -e "  \${YELLOW}5)\${NC} 🔒 Issue SSL Certificate (Domain / Subdomain / Public IP)"
  echo -e "  \${YELLOW}6)\${NC} 🔑 Show / Reset Owner Web Admin Panel Credentials"
  echo -e "  \${YELLOW}7)\${NC} 🗑️  Uninstall ArzPulse Pro Completely"
  echo -e "  \${YELLOW}0)\${NC} 🚪 Exit"
  echo -e "\${CYAN}================================================================\${NC}"
  read -rp "Enter choice [0-7]: " choice
}

issue_ssl() {
  echo -e "\\n\${BLUE}[SSL Wizard] Enter your Domain, Subdomain, or Server IP Address:\${NC}"
  read -rp "Target (e.g. bot.example.com or 203.0.113.10): " TARGET_HOST
  if [[ "$TARGET_HOST" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then
    echo -e "\${YELLOW}Detected IP Address ($TARGET_HOST). Generating High-Security Self-Signed TLS Certificate for Nginx...\${NC}"
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
      -keyout /etc/nginx/ssl/arz-ip.key \\
      -out /etc/nginx/ssl/arz-ip.crt \\
      -subj "/CN=$TARGET_HOST"
    systemctl reload nginx
    echo -e "\${GREEN}✅ IP HTTPS SSL configured at https://$TARGET_HOST\${NC}"
  else
    read -rp "Enter email for Let's Encrypt SSL notifications: " SSL_EMAIL
    certbot --nginx -d "$TARGET_HOST" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect
    echo -e "\${GREEN}✅ Let's Encrypt SSL successfully activated at https://$TARGET_HOST\${NC}"
  fi
}

while true; do
  show_menu
  case "$choice" in
    1) systemctl status arzpulse-bot --no-pager || true ; read -rp "Press Enter..." ;;
    2) cd "$INSTALL_DIR" && git pull && systemctl restart arzpulse-bot ; echo -e "\${GREEN}✅ Updated successfully!\${NC}" ; read -rp "Press Enter..." ;;
    3) systemctl restart arzpulse-bot ; echo -e "\${GREEN}✅ Services restarted!\${NC}" ; read -rp "Press Enter..." ;;
    4) systemctl stop arzpulse-bot ; echo -e "\${YELLOW}🛑 Services stopped.\${NC}" ; read -rp "Press Enter..." ;;
    5) issue_ssl ; read -rp "Press Enter..." ;;
    6) cat "$INSTALL_DIR/.env" | grep -E "ADMIN_USERNAME|ADMIN_PASSWORD|WEB_PANEL_URL" ; read -rp "Press Enter..." ;;
    7) systemctl stop arzpulse-bot || true ; rm -rf "$INSTALL_DIR" "$CLI_PATH" ; echo -e "\${RED}🗑️ Uninstalled.\${NC}" ; exit 0 ;;
    0) exit 0 ;;
    *) echo -e "\${RED}Invalid option!\${NC}" ; sleep 1 ;;
  esac
done
EOF

chmod +x "$CLI_PATH"
echo -e "\\n\${GREEN}================================================================\${NC}"
echo -e "\${GREEN}✅ ArzPulse Pro Installed Successfully!                         \${NC}"
echo -e "\${CYAN}👉 Type 'sudo arz' anytime to open the Server Management Menu.  \${NC}"
echo -e "\${CYAN}👉 Web Admin Username: ${adminUser} | Password: ${adminPass}    \${NC}"
echo -e "\${GREEN}================================================================\${NC}"
`;
}

export function generateMultilangReadme(githubUser = 'samkaren', repoName = 'ArzPulse-Bot'): string {
  const cmds = generateOneLineCurlCommands(githubUser, repoName);
  const fullInstallScript = generateInstallBashScript({ githubUser, repoName });

  return `# 🌐 ArzPulse Pro — Multi-Language Telegram Currency & Crypto Bot, Mini App & Web Panel

![Version](https://img.shields.io/badge/Version-3.5.0--Pro-2563eb?style=for-the-badge)
![Aiogram](https://img.shields.io/badge/Aiogram-3.x%20Colored%20Keyboards-10b981?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-FA%20%7C%20EN%20%7C%20RU%20%7C%20AR%20%7C%20ZH%20%7C%20TR-f59e0b?style=for-the-badge)
![CLI](https://img.shields.io/badge/CLI-sudo%20arz-ef4444?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-64748b?style=for-the-badge)

---

## ⚡ نصب اتوماتیک تک‌خطی و دستور مدیریت سرور / One-Line Auto Install & \`sudo arz\` CLI

### 1️⃣ نصب خودکار با یک دستور (One-Line Bash Curl Installer):
کافیست دستور زیر را کپی کرده و در ترمینال سرور لینوکس (Ubuntu / Debian) اجرا کنید:

\`\`\`bash
${cmds.bashSubshell}
\`\`\`

دستور جایگزین (\`curl | sudo bash\`):
\`\`\`bash
${cmds.sudoPipe}
\`\`\`

### 2️⃣ دستور پنل مدیریت سرور (\`sudo arz\` Server Management Command):
بلافاصله پس از نصب، در هر زمان کافیست دستور زیر را در ترمینال سرور وارد کنید تا منوی شماره‌گذاری‌شده مدیریت باز شود:

\`\`\`bash
sudo arz
\`\`\`

#### 📋 گزینه‌های منوی \`sudo arz\` روی سرور:
\`\`\`text
================================================================
         👑 ArzPulse Pro Server Manager (sudo arz)              
================================================================
  1) 📊 Show Service Status & Live Logs (مشاهده وضعیت ربات و وب‌پنل)
  2) 🔄 Update Bot & Web Panel (آپدیت خودکار اسکریپت و ربات)
  3) ♻️  Restart Bot & Web Panel Services (ریستارت سرویس‌ها)
  4) 🛑 Stop Bot & Web Panel Services (توقف کامل سرویس‌ها)
  5) 🔒 Issue SSL Certificate (دریافت گواهی SSL روی دامنه، ساب‌دامنه یا آی‌پی)
  6) 🔑 Show / Reset Owner Web Admin Panel Credentials (نمایش نام کاربری و رمز وب‌پنل مالک)
  7) 🗑️  Uninstall ArzPulse Pro Completely (حذف کامل اسکریپت و ربات)
  0) 🚪 Exit (خروج)
================================================================
\`\`\`

---

## 📑 فهرست زبان‌ها / Language Index
- [🇮🇷 فارسی (Persian)](#-فارسی-معرفی-و-راهنمای-نصب-ربات-arzpulse-pro)
- [🇬🇧 English](#-english-overview--quick-installation)
- [🇨🇳 中文 (Chinese)](#-中文-项目介绍与一键安装指南)
- [🇹🇷 Türkçe (Turkish)](#-türkçe-genel-bakış-ve-otomatik-kurulum)
- [🇸🇦 العربية (Arabic)](#-العربية-نظرة-عامة-والتثبيت-التلقائي)
- [🇷🇺 Русский (Russian)](#-русский-обзор-и-автоматическая-установка)

---

## 📊 معماری و نمودار گردش کار / System Architecture Diagram

\`\`\`mermaid
graph TD
    U[Telegram User / Group / Channel] -->|Colored ReplyKeyboardMarkup| B(Aiogram 3.x Bot Engine)
    U -->|WebApp Launch| M[Pro Telegram Mini App]
    O[Bot Owner / Admin] -->|Credentials from Bot| W[Owner Web Admin Panel]
    O -->|Terminal SSH| S[sudo arz Server CLI]
    B -->|Real-Time Rates & PnL Charts| E[Market Price & Conversion Engine]
    M -->|Live Charts & Instant Swap| E
    S -->|Certbot / OpenSSL| SSL[Auto SSL for Domain / Subdomain / IP]
\`\`\`

---

## 📋 جدول کامل امکانات / Feature Matrix Table

| قابلیت / Feature | ربات تلگرام (Aiogram) | مینی‌اپ (Mini App) | وب‌پنل مالک (Admin) | اسکریپت سرور (\`sudo arz\`) |
| :--- | :---: | :---: | :---: | :---: |
| **نصب خودکار تک‌خطی با \`bash <(curl -Ls ...)\`** | ✅ | ✅ | ✅ | ✅ |
| **مدیریت کامل با دستور \`sudo arz\`** | ✅ | ✅ | ✅ | ✅ |
| **دکمه‌های کیبورد رنگی (\`primary\`, \`success\`, \`danger\`)** | ✅ | ✅ | ✅ | ➖ |
| **۶ زبان زنده (فارسی، انگلیسی، روسی، عربی، چینی، ترکی)** | ✅ | ✅ | ✅ | ➖ |
| **قیمت لحظه‌ای + سود/زیان ۲۴ ساعته و عکس نمودار (PnL Chart)** | ✅ | ✅ | ✅ | ➖ |
| **ماشین‌حساب تبدیل دقیق هر مقدار ارز و کریپتو (USD ⇄ TRX/TON)** | ✅ | ✅ | ✅ | ➖ |
| **سیستم تیکت پشتیبانی دوطرفه و پاسخ مستقیم مالک** | ✅ | ✅ | ✅ | ➖ |
| **نمایش نام کاربری و رمز وب‌پنل در بخش مدیریت ربات** | ✅ | ➖ | ✅ | ✅ |
| **نصب خودکار SSL روی دامنه، ساب‌دامنه و آی‌پی (IP)** | ➖ | ✅ | ✅ | ✅ |
| **امکان افزودن ربات به گروه و کانال تلگرام** | ✅ | ➖ | ✅ | ➖ |

---

## 🇮🇷 فارسی: معرفی و راهنمای نصب ربات ArzPulse Pro
**ArzPulse Pro** یک اکوسیستم کامل شامل ربات تلگرام با دکمه‌های کیبورد رنگی (\`ReplyKeyboardMarkup\` با استایل‌های \`success\`, \`primary\`, \`danger\`)، مینی‌اپ تحت وب فوق حرفه‌ای و پنل مدیریت اختصاصی مالک است.

**نصب خودکار روی سرور لینوکس (کپی کنید):**
\`\`\`bash
${cmds.bashSubshell}
\`\`\`

**اجرای منوی مدیریت و دریافت SSL روی دامنه/ساب‌دامنه/آی‌پی (کپی کنید):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇬🇧 English: Overview & Quick Installation
**ArzPulse Pro** is a full-stack Telegram Currency & Cryptocurrency platform built with **Aiogram 3.x**, featuring colored \`ReplyKeyboardMarkup\` buttons (\`primary\`, \`success\`, \`danger\`), a high-precision **Telegram Mini App**, an **Owner Web Admin Dashboard**, and an automated Linux installer.

**One-Line Auto Install Command (Copy & Run):**
\`\`\`bash
${cmds.bashSubshell}
\`\`\`

**Server Management & Auto SSL CLI Command (Copy & Run):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇨🇳 中文: 项目介绍与一键安装指南
**ArzPulse Pro** 是一套完整的 Telegram 汇率与加密货币智能机器人系统，支持彩色键盘按钮 (\`primary\`, \`success\`, \`danger\`)、6种语言切换、实时价格与盈亏走势图生成、精准汇率换算、在线客服系统、专业版 Mini App 以及站长 Web 管理面板。

**一键自动安装脚本 (复制并运行):**
\`\`\`bash
${cmds.bashSubshell}
\`\`\`

**服务器管理与 SSL 证书配置命令 (复制并运行):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇹🇷 Türkçe: Genel Bakış ve Otomatik Kurulum
**ArzPulse Pro**, renkli klavye butonları (\`ReplyKeyboardMarkup\`), 6 dil desteği, anlık döviz/kripto fiyatları, Kar/Zarar (PnL) grafik görseli, hassas döviz çevirici, canlı destek, Mini App ve Sahip Web Yönetim Paneli içeren eksiksiz bir Telegram bot paketidir.

**Tek Satır Otomatik Kurulum Komutu (Kopyala ve Çalıştır):**
\`\`\`bash
${cmds.bashSubshell}
\`\`\`

**Sunucu Yönetimi ve SSL Kurulum Komutu (Kopyala ve Çalıştır):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇸🇦 العربية: نظرة عامة والتثبيت التلقائي
**ArzPulse Pro** هو نظام متكامل يجمع بين بوت تيليجرام ذكي بأزرار كيبورد ملونة، وتطبيق مصغر (Mini App) احترافي، ولوحة تحكم ويب للمالك، مع دعم 6 لغات، وعرض الأسعار اللحظية مع صورة شارت الأرباح والخسائر، ومحول عملات دقيق.

**أمر التثبيت التلقائي بسطر واحد (انسخ وشغل):**
\`\`\`bash
${cmds.bashSubshell}
\`\`\`

**أمر إدارة السيرفر وتفعيل شهادة SSL (انسخ وشغل):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇷🇺 Русский: Обзор и автоматическая установка
**ArzPulse Pro** — это профессиональный Telegram-бот на базе **Aiogram 3.x** с цветными кнопками клавиатуры (\`primary\`, \`success\`, \`danger\`), поддержкой 6 языков, графиками прибыли и убытков (PnL), точным конвертером валют, Mini App и веб-панелью владельца.

**Автоматическая установка одной командой (Скопируйте и запустите):**
\`\`\`bash
${cmds.bashSubshell}
\`\`\`

**Панель управления сервером и выпуск SSL (Скопируйте и запустите):**
\`\`\`bash
sudo arz
\`\`\`

---

## 📜 سورس کامل اسکریپت نصب (\`install.sh\` Full Script — Copyable)

اگر می‌خواهید کل فایل اسکریپت \`install.sh\` را مستقیماً از داخل README کپی کنید:

\`\`\`bash
${fullInstallScript}
\`\`\`

---

## 💎 حمایت مالی و دونیت (Official Creator Wallets)

اگر این پروژه برای شما مفید بوده است، می‌توانید از طریق ولت‌های رسمی زیر (ثبت‌شده در گیت‌هاب سازنده) حمایت (Donate) کنید:

- **🔹 TON (Toncoin Network):**
  \`\`\`text
  ${TON_WALLET}
  \`\`\`
- **🔺 TRON (TRX / TRC-20 Network):**
  \`\`\`text
  ${TRON_WALLET}
  \`\`\`
`;
}

