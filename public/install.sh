#!/usr/bin/env bash
# ==============================================================================
# ArzPulse Pro — 100% Self-Contained Automated Server Installer & 'sudo arz' CLI
# Live Rates Source: https://arzdigital.com/currencies/united-states-dollar/
# - Unblocks Firewall Ports (80, 443, 8080) in UFW & iptables
# - Configures Nginx on Port 80 & Port 443 (Self-Signed + Let's Encrypt ready)
# - Starts Cloudflare HTTPS Quick Tunnel so Telegram Mini App WebApp opens with HTTPS!
# - Installs Unified Bot + Animated Mini App (/miniapp) & Owner Web Panel (/admin)
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

if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}[INFO] Running with sudo privileges...${NC}"
  exec sudo bash "$0" "$@"
fi

clear
echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}   🚀 ArzPulse Pro — Automatic Telegram Bot & Web Installer     ${NC}"
echo -e "${CYAN}   📡 Live Currency & Crypto Engine: ArzDigital.com             ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

EXISTING_TOKEN=""
EXISTING_OWNER=""
if [ -f "$INSTALL_DIR/.env" ]; then
  EXISTING_TOKEN=$(grep -E '^BOT_TOKEN=' "$INSTALL_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
  EXISTING_OWNER=$(grep -E '^OWNER_ID=' "$INSTALL_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
fi

# STEP 1: Ask for Telegram Bot API Token right at the start
BOT_TOKEN=""
while [ -z "$BOT_TOKEN" ]; do
  if [ -n "$EXISTING_TOKEN" ]; then
    read -rp "🔑 1) Enter Telegram Bot API Token [Press Enter to keep existing]: " INPUT_TOKEN </dev/tty
    INPUT_TOKEN=$(echo "$INPUT_TOKEN" | tr -d '[:space:]')
    BOT_TOKEN="${INPUT_TOKEN:-$EXISTING_TOKEN}"
  else
    read -rp "🔑 1) Enter your Telegram Bot API Token (from @BotFather): " BOT_TOKEN </dev/tty
    BOT_TOKEN=$(echo "$BOT_TOKEN" | tr -d '[:space:]')
  fi
  if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}[!] Bot Token cannot be empty. Please enter a valid token.${NC}"
  fi
done

# STEP 2: Ask for Owner Numeric Telegram ID right after Bot Token
OWNER_ID=""
while ! [[ "$OWNER_ID" =~ ^[0-9]+$ ]]; do
  if [ -n "$EXISTING_OWNER" ]; then
    read -rp "👑 2) Enter Numeric Owner Telegram ID [Press Enter to keep $EXISTING_OWNER]: " INPUT_OWNER </dev/tty
    INPUT_OWNER=$(echo "$INPUT_OWNER" | tr -d '[:space:]')
    OWNER_ID="${INPUT_OWNER:-$EXISTING_OWNER}"
  else
    read -rp "👑 2) Enter your Numeric Owner Telegram ID (e.g. 123456789): " OWNER_ID </dev/tty
    OWNER_ID=$(echo "$OWNER_ID" | tr -d '[:space:]')
  fi
  if ! [[ "$OWNER_ID" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}[!] Owner ID must be a number (get it from @userinfobot).${NC}"
  fi
done

read -rp "🌐 3) Enter Domain/Subdomain for Web Panel (or press Enter to use Server IP): " INPUT_HOST </dev/tty || true
INPUT_HOST=$(echo "$INPUT_HOST" | sed -E 's|^https?://||; s|/.*$||; s|:[0-9]+$||' | tr -d '[:space:]')

SERVER_IP=$(curl -4 -s --max-time 4 https://api.ipify.org || curl -4 -s --max-time 4 https://icanhazip.com || hostname -I | awk '{print $1}')
SERVER_IP=$(echo "$SERVER_IP" | tr -d '[:space:]')
TARGET_HOST="${INPUT_HOST:-$SERVER_IP}"

echo ""
echo -e "${BLUE}[1/5] Installing packages & unlocking Firewall ports (80, 443, 8080)...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y || true
apt-get install -y python3 python3-venv python3-pip curl wget git nginx certbot python3-certbot-nginx openssl || apt-get install -y python3 python3-venv python3-pip curl wget nginx openssl

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow 8080/tcp >/dev/null 2>&1 || true
fi
if command -v iptables >/dev/null 2>&1; then
  iptables -I INPUT -p tcp --dport 80 -j ACCEPT >/dev/null 2>&1 || true
  iptables -I INPUT -p tcp --dport 443 -j ACCEPT >/dev/null 2>&1 || true
  iptables -I INPUT -p tcp --dport 8080 -j ACCEPT >/dev/null 2>&1 || true
fi

echo -e "${BLUE}[2/5] Creating application directory & writing Unified Bot + Web Panel...${NC}"
mkdir -p "$INSTALL_DIR"

cat << EOF > "$INSTALL_DIR/.env"
BOT_TOKEN="$BOT_TOKEN"
OWNER_ID="$OWNER_ID"
SERVER_IP="$SERVER_IP"
WEB_PANEL_URL="http://$TARGET_HOST"
ADMIN_USERNAME="owner_admin"
ADMIN_PASSWORD="ArzPanel@2026#Pro"
TON_WALLET="UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-"
TRON_WALLET="TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy"
EOF

cat << 'BOT_EOF' > "$INSTALL_DIR/bot.py"
#!/usr/bin/env python3
import os
import io
import re
import json
import asyncio
import logging
import aiohttp
from aiohttp import web
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, Any, Optional
from aiogram import Bot, Dispatcher, F, Router
from aiogram.types import (
 Message,
 CallbackQuery,
 ChatMemberUpdated,
 ReplyKeyboardMarkup,
 KeyboardButton,
 KeyboardButtonRequestChat,
 ChatAdministratorRights,
 InlineKeyboardMarkup,
 InlineKeyboardButton,
 WebAppInfo,
 BufferedInputFile,
)
from aiogram.filters import CommandStart, Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")
OWNER_ID = int(os.getenv("OWNER_ID", "123456789"))
SERVER_IP = os.getenv("SERVER_IP", "127.0.0.1")
WEB_PANEL_URL = os.getenv("WEB_PANEL_URL", "http://YOUR_SERVER_IP")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "owner_admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ArzPanel@2026#Pro")
GITHUB_URL = "https://github.com/samkaren/ArzPulse-Telegram-Suite"
TON_WALLET = "UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-"
TRON_WALLET = "TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy"
ARZDIGITAL_SOURCE_URL = "https://arzdigital.com/currencies/united-states-dollar/"
TUNNEL_FILE = "/opt/arzpulse/tunnel_url.txt"
USERS_FILE = "/opt/arzpulse/users.json"
OVERRIDES_FILE = "/opt/arzpulse/overrides.json"
logging.basicConfig(level=logging.INFO)
router = Router()
class BotStates(StatesGroup):
 choosing_language = State()
 waiting_for_price_asset = State()
 convert_first_asset = State()
 convert_second_asset = State()
 convert_amount = State()
 waiting_for_support_msg = State()
user_langs: Dict[int, str] = {}
total_users = set()
def load_saved_users():
 global total_users
 try:
  if os.path.exists(USERS_FILE):
   with open(USERS_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)
    if isinstance(data, list):
     total_users = set(int(x) for x in data)
 except Exception:
  pass
def save_user_id(uid: int):
 total_users.add(uid)
 try:
  os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
  with open(USERS_FILE, "w", encoding="utf-8") as f:
   json.dump(list(total_users), f)
 except Exception:
  pass
def get_https_panel_url() -> str:
 try:
  if os.path.exists(TUNNEL_FILE):
   with open(TUNNEL_FILE, "r", encoding="utf-8") as f:
    t_url = f.read().strip().rstrip("/")
    if t_url.startswith("https://"):
     return t_url
 except Exception:
  pass
 return os.getenv("WEB_PANEL_URL", WEB_PANEL_URL).strip().rstrip("/")
def get_http_direct_url() -> str:
 ip = os.getenv("SERVER_IP", SERVER_IP).strip()
 if ip and ip != "127.0.0.1":
  return f"http://{ip}"
 return os.getenv("WEB_PANEL_URL", WEB_PANEL_URL).strip().rstrip("/")
ASSETS_DB: Dict[str, Dict[str, Any]] = {
 "USD": {"name": "دلار آمریکا (USD)", "price": 1.0, "toman": 262400.0, "change": -0.46, "slug": "united-states-dollar", "aliases": ["usd", "dollar", "دلار", "دلار امریکا", "دلار آمریکا", "دلار آزاد", "доллар", "دولار", "美元", "dolar"]},
 "IRT": {"name": "تومان ایران (IRT)", "price": 0.00000381, "toman": 1.0, "change": 0.0, "slug": "", "aliases": ["irt", "irr", "toman", "تومان", "ریال", "تومن", "туман", "تومان ايراني", "土曼", "tümen"]},
 "EUR": {"name": "یورو اروپا (EUR)", "price": 1.1237, "toman": 294860.0, "change": 0.12, "slug": "euro", "aliases": ["eur", "euro", "یورو", "евро", "يورو", "欧元"]},
 "AED": {"name": "درهم امارات (AED)", "price": 0.2749, "toman": 72130.0, "change": -0.35, "slug": "united-arab-emirates-dirham", "aliases": ["aed", "dirham", "درهم", "درهم امارات", "дирхам", "迪拉姆"]},
 "TRY": {"name": "لیر ترکیه (TRY)", "price": 0.0202, "toman": 5300.0, "change": -0.45, "slug": "turkish-lira", "aliases": ["try", "lira", "لیر", "لیر ترکیه", "лира", "ليرة", "里拉", "türk lirası"]},
 "RUB": {"name": "روبل روسیه (RUB)", "price": 0.01105, "toman": 2900.0, "change": -0.31, "slug": "russian-ruble", "aliases": ["rub", "ruble", "روبل", "روبل روسیه", "рубль", "روبل روسي", "卢布", "ruble"]},
 "CNY": {"name": "یوان چین (CNY)", "price": 0.1419, "toman": 37240.0, "change": 0.08, "slug": "chinese-yuan", "aliases": ["cny", "yuan", "یوان", "یوان چین", "юань", "يوان", "人民币", "yuan"]},
 "GBP": {"name": "پوند انگلیس (GBP)", "price": 1.2981, "toman": 340620.0, "change": 0.19, "slug": "pound-sterling", "aliases": ["gbp", "pound", "پوند", "پوند انگلیس", "фунт", "جنيه", "英镑", "sterlin"]},
 "CAD": {"name": "دلار کانادا (CAD)", "price": 0.7285, "toman": 191160.0, "change": -0.15, "slug": "canadian-dollar", "aliases": ["cad", "دلار کانادا", "канадский доллар", "دولار كندي", "加元", "kanada doları"]},
 "IQD": {"name": "دینار عراق (IQD)", "price": 0.000684, "toman": 179.4, "change": 0.0, "slug": "iraqi-dinar", "aliases": ["iqd", "dinar", "دینار", "دینار عراق", "динар", "دينار عراقي", "伊拉克第纳尔", "ırak dinarı"]},
 "KWD": {"name": "دینار کویت (KWD)", "price": 3.265, "toman": 856740.0, "change": 0.11, "slug": "kuwaiti-dinar", "aliases": ["kwd", "دینار کویت", "кувейтский динар", "دينار كويتي", "科威特第纳尔", "kuveyt dinarı"]},
 "TRX": {"name": "ترون (Tron / TRX)", "price": 0.332, "toman": 87118.0, "change": 0.56, "slug": "tron", "aliases": ["trx", "tron", "ترون", "трон", "波场"]},
 "TON": {"name": "تون کوین (Toncoin)", "price": 1.3284, "toman": 348578.0, "change": 0.90, "slug": "gram", "aliases": ["ton", "toncoin", "تون", "تون کوین", "тон", "тонкоин", "تون كوين"]},
 "BTC": {"name": "بیت‌کوین (Bitcoin)", "price": 75617.0, "toman": 19841900800.0, "change": 1.07, "slug": "bitcoin", "aliases": ["btc", "bitcoin", "بیت کوین", "بیتکوین", "биткоин", "بيتكوين", "比特币"]},
 "ETH": {"name": "اتریوم (Ethereum)", "price": 2368.18, "toman": 621410432.0, "change": 1.98, "slug": "ethereum", "aliases": ["eth", "ethereum", "اتریوم", "эфириум", "إيثريوم", "以太坊"]},
 "USDT": {"name": "تتر (Tether USDT)", "price": 1.0005, "toman": 262531.0, "change": 0.02, "slug": "tether", "aliases": ["usdt", "tether", "تتر", "тезер", "تيثر", "泰达币"]},
}
PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
def normalize_num_str(val: str) -> str:
 return val.translate(PERSIAN_DIGITS).replace(",", "").strip()
def apply_local_overrides():
 try:
  if os.path.exists(OVERRIDES_FILE):
   with open(OVERRIDES_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)
    for k, v in data.items():
     if k in ASSETS_DB and isinstance(v, dict):
      if "toman" in v:
       ASSETS_DB[k]["toman"] = float(v["toman"])
      if "price" in v:
       ASSETS_DB[k]["price"] = float(v["price"])
 except Exception:
  pass
async def refresh_live_prices(target_codes: Optional[list] = None):
 codes_to_fetch = target_codes or ["USD", "EUR", "AED", "TRY", "RUB", "TRX", "TON", "BTC", "ETH", "USDT"]
 headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json, text/html", "Referer": "https://arzdigital.com/"}
 try:
  async with aiohttp.ClientSession(headers=headers) as session:
   for code in codes_to_fetch:
    info = ASSETS_DB.get(code)
    if not info or not info.get("slug"):
     continue
    try:
     async with session.get(f"https://lake.arzdigital.com/web/api/v1/pub/coins/{info['slug']}", timeout=4) as resp:
      if resp.status == 200:
       d = (await resp.json()).get("data", {})
       if d.get("toman"):
        info["toman"] = float(d["toman"])
       if d.get("dollar"):
        info["price"] = float(d["dollar"])
       if d.get("p24h") is not None:
        info["change"] = float(d["p24h"])
    except Exception:
     pass
   try:
    async with session.get(ARZDIGITAL_SOURCE_URL, timeout=5) as html_resp:
     if html_resp.status == 200:
      m = re.search(r"ادل\s*([۰-۹0-9,]+)\s*ریال", await html_resp.text())
      if m:
       rial = float(normalize_num_str(m.group(1)))
       if rial > 100000:
        ASSETS_DB["USD"]["toman"] = round(rial / 10.0)
   except Exception:
    pass
   usd_toman = ASSETS_DB["USD"]["toman"]
   if usd_toman > 0:
    ASSETS_DB["IRT"]["price"] = 1.0 / usd_toman
 except Exception as e:
  logging.warning(f"Refresh warning: {e}")
 apply_local_overrides()
LANGS: Dict[str, Dict[str, str]] = {
 "fa": {
  "welcome": "🌟 به ربات هوشمند <b>ArzPulse Pro</b> خوش آمدید!\n📡 متصل به نرخ لحظه‌ای <b>ArzDigital.com</b>\n\nلطفاً یکی از خدمات زیر را از منوی کیبورد رنگی انتخاب کنید:",
  "btn_price": "💰 قیمت واحد پول یا ارز",
  "btn_convert": "🔄 تبدیل ارز و واحد پول",
  "btn_lang": "🌐 تغییر زبان (Language)",
  "btn_support": "🛟 پشتیبانی آنلاین",
  "btn_guide": "📖 راهنمای ربات",
  "btn_creator": "👨‍💻 سازنده و ولت‌ها",
  "btn_miniapp": "🚀 مینی‌اپ و وب‌پنل",
  "btn_owner": "👑 مدیریت مالک (وب‌پنل)",
  "btn_group": "➕ افزودن به گروه/کانال",
  "ask_price": "🔍 نام ارز یا واحد پول را وارد کنید (مثلاً: <code>دلار</code>، <code>ترون</code>، <code>تون</code>، <code>یورو</code>، <code>تومان</code>، <code>درهم</code>، <code>لیر</code>):",
  "ask_conv_1": "1️⃣ نام <b>واحد پول یا ارز اول (مبدا)</b> را وارد کنید (مثلاً: <code>دلار</code>):",
  "ask_conv_2": "2️⃣ حالا نام <b>واحد پول یا ارز دوم (مقصد)</b> را وارد کنید (مثلاً: <code>ترون</code> یا <code>تومان</code>):",
  "ask_conv_amt": "🔢 چه تعدادی می‌خواهید تبدیل کنید؟ (مثلاً: <code>1</code> یا <code>100</code>):",
  "ask_support": "✍️ پیام یا سوال خود را بنویسید تا مستقیماً برای پشتیبانی ارسال شود:",
  "support_ok": "✅ پیام شما برای مالک و پشتیبانی ارسال شد. به‌زودی پاسخ داده می‌شود.",
  "guide": "📖 <b>راهنمای کامل ربات ArzPulse Pro</b>\n• دریافت زنده قیمت دلار، تومان و رمزارزها از <code>arzdigital.com</code>\n• قیمت و عکس نمودار سود/زیان ۲۴ ساعته\n• ماشین‌حساب تبدیل دقیق ارزها\n• دستورات گروه: <code>/price usd</code> و <code>/convert 10 usd trx</code>",
  "not_found": "❌ ارز مورد نظر یافت نشد. لطفاً نام یا نماد معتبر (مثل دلار، ترون، USD، TRX، TON، EUR، AED) وارد کنید.",
 },
 "en": {
  "welcome": "🌟 Welcome to <b>ArzPulse Pro</b> Bot (Powered by <b>ArzDigital.com</b>)! Choose a service below:",
  "btn_price": "💰 Currency / Crypto Price",
  "btn_convert": "🔄 Currency Converter",
  "btn_lang": "🌐 Language (تغییر زبان)",
  "btn_support": "🛟 Live Support",
  "btn_guide": "📖 Bot Guide",
  "btn_creator": "👨‍💻 Creator & Wallets",
  "btn_miniapp": "🚀 Mini App & Web Panel",
  "btn_owner": "👑 Owner Admin Panel",
  "btn_group": "➕ Add to Group/Channel",
  "ask_price": "🔍 Send currency/crypto name (e.g., <code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>BTC</code>, <code>EUR</code>, <code>IRT</code>):",
  "ask_conv_1": "1️⃣ Enter the <b>FIRST currency/crypto</b> (e.g., <code>USD</code>):",
  "ask_conv_2": "2️⃣ Enter the <b>SECOND currency/crypto</b> (e.g., <code>TRX</code>):",
  "ask_conv_amt": "🔢 Enter the <b>amount</b> to convert (e.g., <code>1</code> or <code>100</code>):",
  "ask_support": "✍️ Type your support message:",
  "support_ok": "✅ Your message has been forwarded to support!",
  "guide": "📖 <b>Bot Guide</b>\nLive rates from <code>arzdigital.com</code>, 24h PnL Charts, and Converter.",
  "not_found": "❌ Currency not found. Try USD, TRX, TON, BTC, EUR, RUB, TRY, CNY, AED, or IRT.",
 },
 "ru": {
  "welcome": "🌟 Добро пожаловать в <b>ArzPulse Pro</b> (Курсы <b>ArzDigital.com</b>)!",
  "btn_price": "💰 Курс валют и крипто",
  "btn_convert": "🔄 Конвертер валют",
  "btn_lang": "🌐 Язык (Language)",
  "btn_support": "🛟 Поддержка",
  "btn_guide": "📖 Инструкция",
  "btn_creator": "👨‍💻 Создатель и кошельки",
  "btn_miniapp": "🚀 Мини-апп и Веб-панель",
  "btn_owner": "👑 Панель владельца",
  "btn_group": "➕ Добавить в группу",
  "ask_price": "🔍 Введите валюту (<code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>RUB</code>):",
  "ask_conv_1": "1️⃣ Введите <b>ПЕРВУЮ валюту</b> (<code>USD</code>):",
  "ask_conv_2": "2️⃣ Введите <b>ВТОРУЮ валюту</b> (<code>TRX</code>):",
  "ask_conv_amt": "🔢 Введите <b>количество</b> (<code>1</code> или <code>100</code>):",
  "ask_support": "✍️ Напишите сообщение для поддержки:",
  "support_ok": "✅ Ваше сообщение отправлено!",
  "guide": "📖 <b>Инструкция ArzPulse Pro</b>\nКурсы валют (ArzDigital.com), графики PnL и конвертер.",
  "not_found": "❌ Валюта не найдена.",
 },
 "ar": {
  "welcome": "🌟 مرحباً بك في بوت <b>ArzPulse Pro</b> (الأسعار من <b>ArzDigital.com</b>)!",
  "btn_price": "💰 أسعار العملات والكريبتو",
  "btn_convert": "🔄 محول العملات الدقيق",
  "btn_lang": "🌐 اللغة (Language)",
  "btn_support": "🛟 الدعم الفني",
  "btn_guide": "📖 دليل البوت",
  "btn_creator": "👨‍💻 المطور والمحافظ",
  "btn_miniapp": "🚀 تطبيق الويب (Mini App)",
  "btn_owner": "👑 لوحة تحكم المالك",
  "btn_group": "➕ أضف للمجموعة/القناة",
  "ask_price": "🔍 أرسل اسم العملة (<code>دولار</code>، <code>ترون</code>، <code>USD</code>، <code>TRX</code>):",
  "ask_conv_1": "1️⃣ أرسل اسم <b>العملة الأولى</b> (<code>دولار</code>):",
  "ask_conv_2": "2️⃣ أرسل اسم <b>العملة الثانية</b> (<code>ترون</code>):",
  "ask_conv_amt": "🔢 أدخل <b>المبلغ</b> المراد تحويله (<code>1</code> أو <code>50</code>):",
  "ask_support": "✍️ اكتب رسالتك للدعم الفني:",
  "support_ok": "✅ تم إرسال رسالتك بنجاح!",
  "guide": "📖 <b>دليل البوت</b>\nأسعار لحظية من ArzDigital.com مع شارت الأرباح ومحول عملات.",
  "not_found": "❌ لم يتم العثور على العملة.",
 },
 "zh": {
  "welcome": "🌟 欢迎使用 <b>ArzPulse Pro</b> 智能汇率与加密货币机器人 (ArzDigital.com)！",
  "btn_price": "💰 货币与加密货币价格",
  "btn_convert": "🔄 汇率换算器",
  "btn_lang": "🌐 切换语言 (Language)",
  "btn_support": "🛟 在线客服",
  "btn_guide": "📖 使用指南",
  "btn_creator": "👨‍💻 开发者与钱包",
  "btn_miniapp": "🚀 专业版 Mini App",
  "btn_owner": "👑 站长管理后台",
  "btn_group": "➕ 添加到群组/频道",
  "ask_price": "🔍 请输入货币名称 (<code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>CNY</code>):",
  "ask_conv_1": "1️⃣ 请输入<b>第一种货币</b> (<code>USD</code>):",
  "ask_conv_2": "2️⃣ 请输入<b>第二种货币</b> (<code>TRX</code>):",
  "ask_conv_amt": "🔢 请输入换算<b>数量</b> (<code>1</code> 或 <code>100</code>):",
  "ask_support": "✍️ 请输入客服留言：",
  "support_ok": "✅ 您的留言已发送！",
  "guide": "📖 <b>使用指南</b>\n支持 ArzDigital 实时价格、盈亏图表及精准换算。",
  "not_found": "❌ 未找到该货币。",
 },
 "tr": {
  "welcome": "🌟 <b>ArzPulse Pro</b> Döviz ve Kripto Botuna Hoş Geldiniz (<b>ArzDigital.com</b>)!",
  "btn_price": "💰 Döviz ve Kripto Fiyatı",
  "btn_convert": "🔄 Döviz Çevirici",
  "btn_lang": "🌐 Dil Seçimi (Language)",
  "btn_support": "🛟 Canlı Destek",
  "btn_guide": "📖 Bot Rehberi",
  "btn_creator": "👨‍💻 Geliştirici ve Cüzdanlar",
  "btn_miniapp": "🚀 Mini App ve Web Paneli",
  "btn_owner": "👑 Sahip Yönetim Paneli",
  "btn_group": "➕ Gruba/Kanala Ekle",
  "ask_price": "🔍 Döviz/kripto adını yazın (<code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>TRY</code>):",
  "ask_conv_1": "1️⃣ <b>Birinci para birimini</b> girin (<code>USD</code>):",
  "ask_conv_2": "2️⃣ <b>İkinci para birimini</b> girin (<code>TRX</code>):",
  "ask_conv_amt": "🔢 Çevrilecek <b>miktarı</b> girin (<code>1</code> veya <code>100</code>):",
  "ask_support": "✍️ Destek mesajınızı yazın:",
  "support_ok": "✅ Mesajınız iletildi!",
  "guide": "📖 <b>Bot Rehberi</b>\nArzDigital anlık fiyatlar, PnL grafiği ve döviz çevirici.",
  "not_found": "❌ Para birimi bulunamadı.",
 },
}
def get_lang(user_id: int) -> Dict[str, str]:
 return LANGS.get(user_langs.get(user_id, "fa"), LANGS["fa"])
def resolve_asset(query: str) -> Optional[str]:
 q = query.strip().lower()
 for code, data in ASSETS_DB.items():
  if code.lower() == q or q in [a.lower() for a in data["aliases"]]:
   return code
 return None
def get_uid(message: Message) -> int:
 return message.from_user.id if message.from_user else OWNER_ID
def styled_btn(
 text: str,
 style: str = "primary",
 web_app: Optional[WebAppInfo] = None,
 request_chat: Optional[KeyboardButtonRequestChat] = None,
) -> KeyboardButton:
 kwargs: Dict[str, Any] = {"text": text}
 if web_app is not None:
  kwargs["web_app"] = web_app
 if request_chat is not None:
  kwargs["request_chat"] = request_chat
 try:
  return KeyboardButton(**kwargs, style=style)
 except TypeError:
  return KeyboardButton(**kwargs)
def build_main_keyboard(user_id: int, chat_type: str = "private") -> ReplyKeyboardMarkup:
 L = get_lang(user_id)
 panel_url = get_https_panel_url()
 is_private = (chat_type == "private")
 rows = [
  [styled_btn(text=L["btn_price"], style="success"), styled_btn(text=L["btn_convert"], style="primary")],
  [
   styled_btn(text=L["btn_miniapp"], style="success", web_app=WebAppInfo(url=f"{panel_url}/miniapp"))
   if (is_private and panel_url.startswith("https://"))
   else styled_btn(text=L["btn_miniapp"], style="success"),
   styled_btn(text=L["btn_lang"], style="primary"),
  ],
  [styled_btn(text=L["btn_support"], style="danger"), styled_btn(text=L["btn_guide"], style="primary")],
  [styled_btn(text=L["btn_creator"], style="success"), styled_btn(text=L["btn_group"], style="primary")],
 ]
 if is_private and user_id == OWNER_ID:
  rows.append([styled_btn(text=L["btn_owner"], style="danger")])
 return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, is_persistent=True)
def build_group_channel_keyboard() -> ReplyKeyboardMarkup:
 group_rights = ChatAdministratorRights(
  is_anonymous=False,
  can_manage_chat=True,
  can_delete_messages=True,
  can_manage_video_chats=False,
  can_restrict_members=False,
  can_promote_members=False,
  can_change_info=False,
  can_invite_users=True,
 )
 channel_rights = ChatAdministratorRights(
  is_anonymous=False,
  can_manage_chat=True,
  can_post_messages=True,
  can_edit_messages=True,
  can_delete_messages=True,
  can_manage_video_chats=False,
  can_restrict_members=False,
  can_promote_members=False,
  can_change_info=False,
  can_invite_users=True,
 )
 btn_add_group = styled_btn(
  text="👥 انتخاب گروه و افزودن خودکار ربات",
  style="success",
  request_chat=KeyboardButtonRequestChat(
   request_id=101,
   chat_is_channel=False,
   user_administrator_rights=group_rights,
   bot_administrator_rights=group_rights,
   bot_is_member=True,
  ),
 )
 btn_add_channel = styled_btn(
  text="📢 انتخاب کانال و افزودن خودکار ربات",
  style="primary",
  request_chat=KeyboardButtonRequestChat(
   request_id=102,
   chat_is_channel=True,
   user_administrator_rights=channel_rights,
   bot_administrator_rights=channel_rights,
   bot_is_member=True,
  ),
 )
 return ReplyKeyboardMarkup(
  keyboard=[
   [btn_add_group, btn_add_channel],
   [
    styled_btn(text="📊 تابلوی کامل نرخ ارز (مخصوص کانال/گروه)", style="success"),
    styled_btn(text="🔙 بازگشت به منوی اصلی", style="danger"),
   ],
  ],
  resize_keyboard=True,
 )
def build_lang_keyboard() -> ReplyKeyboardMarkup:
 return ReplyKeyboardMarkup(
  keyboard=[
   [styled_btn(text="فارسی 🇮🇷", style="success"), styled_btn(text="English 🇬🇧", style="primary")],
   [styled_btn(text="Русский 🇷🇺", style="primary"), styled_btn(text="العربية 🇸🇦", style="success")],
   [styled_btn(text="中文 🇨🇳", style="danger"), styled_btn(text="Türkçe 🇹🇷", style="primary")],
   [styled_btn(text="🔙 بازگشت به منوی اصلی", style="danger")],
  ],
  resize_keyboard=True,
 )
def format_full_rates_board() -> str:
 lines = [
  "📊 <b>تابلوی لحظه‌ای نرخ ارز و کریپتو (ArzDigital Live)</b>",
  "━━━━━━━━━━━━━━━━━━━━",
 ]
 order = ["USD", "EUR", "AED", "GBP", "TRY", "CAD", "CNY", "RUB", "IQD", "KWD", "TRX", "TON", "BTC", "ETH", "USDT"]
 for code in order:
  if code not in ASSETS_DB:
   continue
  d = ASSETS_DB[code]
  ch = d["change"]
  icon = "🟢" if ch >= 0 else "🔴"
  sign = "+" if ch >= 0 else ""
  lines.append(
   f"{icon} <b>{d.get('name', code)} ({code}):</b> <code>{d['toman']:,.0f} تومان</code> | <code>${d['price']:,.4f}</code> ({sign}{ch:.2f}%)"
  )
 lines.append("━━━━━━━━━━━━━━━━━━━━")
 lines.append("📡 <b>منبع زنده:</b> <code>arzdigital.com</code>")
 lines.append("💡 دستورات کانال و گروه: <code>نرخ ارز</code> | <code>قیمت دلار</code> | <code>تبدیل 10 دلار به ترون</code>")
 return "\n".join(lines)
def render_pnl_chart_png(code: str, base_price: float, toman_price: float, change_24h: float) -> bytes:
 fig, ax = plt.subplots(figsize=(7, 3.6), dpi=150)
 fig.patch.set_facecolor("#0f172a")
 ax.set_facecolor("#0f172a")
 target_base = toman_price if code == "USD" else base_price
 factors = [0.95, 0.965, 0.96, 0.98, 0.975, 0.99, 1.0] if change_24h >= 0 else [1.04, 1.03, 1.035, 1.015, 1.02, 1.005, 1.0]
 prices = [target_base * f for f in factors]
 color = "#10b981" if change_24h >= 0 else "#ef4444"
 x = list(range(len(prices)))
 ax.plot(x, prices, color=color, linewidth=2.8, marker="o")
 ax.fill_between(x, prices, min(prices) * 0.99, color=color, alpha=0.18)
 sign = "+" if change_24h >= 0 else ""
 unit_label = "IRT (Toman)" if code == "USD" else "USD"
 ax.set_title(f"{code}/{unit_label} (ArzDigital) • 24h PnL: {sign}{change_24h:.2f}%", color="#f8fafc", fontsize=12, fontweight="bold")
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
@router.message(CommandStart(), StateFilter("*"))
async def cmd_start(message: Message, state: FSMContext):
 await state.clear()
 uid = get_uid(message)
 save_user_id(uid)
 L = get_lang(uid)
 if message.chat.type in ("group", "supergroup"):
  await refresh_live_prices()
  group_welcome = (
   f"{L['welcome']}\n\n"
   f"✅ <b>ربات با موفقیت در این گروه فعال است!</b>\n"
   f"• استعلام قیمت و نمودار: <code>قیمت دلار</code> یا <code>/price trx</code>\n"
   f"• تبدیل ارز در گروه: <code>تبدیل 10 دلار به ترون</code> یا <code>/convert 10 usd trx</code>\n"
   f"• تابلوی کامل قیمت‌ها: <code>نرخ ارز</code> یا <code>/rates</code>"
  )
  await message.answer(group_welcome, reply_markup=build_main_keyboard(uid, message.chat.type), parse_mode="HTML")
 else:
  await message.answer(L["welcome"], reply_markup=build_main_keyboard(uid, message.chat.type), parse_mode="HTML")
@router.message(F.text == "🔙 بازگشت به منوی اصلی", StateFilter("*"))
async def back_to_main_menu(message: Message, state: FSMContext):
 await state.clear()
 uid = get_uid(message)
 await message.answer(get_lang(uid)["welcome"], reply_markup=build_main_keyboard(uid, message.chat.type), parse_mode="HTML")
@router.message(F.text == "📊 تابلوی کامل نرخ ارز (مخصوص کانال/گروه)", StateFilter("*"))
@router.message(Command("rates"), StateFilter("*"))
async def cmd_send_full_board(message: Message, state: FSMContext):
 await state.clear()
 await refresh_live_prices()
 await message.answer(format_full_rates_board(), parse_mode="HTML")
@router.callback_query(F.data == "send_live_board")
async def cb_send_live_board(callback: CallbackQuery):
 await callback.answer("⏳ در حال دریافت آخرین نرخ‌های ArzDigital...")
 await refresh_live_prices()
 if callback.message:
  await callback.message.answer(format_full_rates_board(), parse_mode="HTML")
@router.message(F.text.in_({"فارسی 🇮🇷", "English 🇬🇧", "Русский 🇷🇺", "العربية 🇸🇦", "中文 🇨🇳", "Türkçe 🇹🇷"}), StateFilter("*"))
async def set_language_handler(message: Message, state: FSMContext):
 mapping = {"فارسی 🇮🇷": "fa", "English 🇬🇧": "en", "Русский 🇷🇺": "ru", "العربية 🇸🇦": "ar", "中文 🇨🇳": "zh", "Türkçe 🇹🇷": "tr"}
 uid = get_uid(message)
 user_langs[uid] = mapping.get(message.text, "fa")
 await state.clear()
 L = get_lang(uid)
 await message.answer(L["welcome"], reply_markup=build_main_keyboard(uid, message.chat.type), parse_mode="HTML")
@router.message(F.text.in_([v["btn_lang"] for v in LANGS.values()]), StateFilter("*"))
async def ask_language(message: Message, state: FSMContext):
 await state.set_state(BotStates.choosing_language)
 await message.answer("🌐 Select Language / زبان را انتخاب کنید:", reply_markup=build_lang_keyboard())
@router.message(F.text.in_([v["btn_price"] for v in LANGS.values()]), StateFilter("*"))
async def ask_price(message: Message, state: FSMContext):
 await state.set_state(BotStates.waiting_for_price_asset)
 await message.answer(get_lang(get_uid(message))["ask_price"], parse_mode="HTML")
@router.message(F.text.in_([v["btn_convert"] for v in LANGS.values()]), StateFilter("*"))
async def ask_convert_1(message: Message, state: FSMContext):
 await state.set_state(BotStates.convert_first_asset)
 await message.answer(get_lang(get_uid(message))["ask_conv_1"], parse_mode="HTML")
@router.message(F.text.in_([v["btn_support"] for v in LANGS.values()]), StateFilter("*"))
async def ask_support(message: Message, state: FSMContext):
 await state.set_state(BotStates.waiting_for_support_msg)
 await message.answer(get_lang(get_uid(message))["ask_support"])
@router.message(F.text.in_([v["btn_guide"] for v in LANGS.values()]), StateFilter("*"))
async def show_guide(message: Message, state: FSMContext):
 await state.clear()
 await message.answer(get_lang(get_uid(message))["guide"], parse_mode="HTML")
@router.message(F.text.in_([v["btn_creator"] for v in LANGS.values()]), StateFilter("*"))
async def show_creator(message: Message, state: FSMContext):
 await state.clear()
 text = (
  f"👨‍💻 <b>Developer & Creator GitHub:</b>\n{GITHUB_URL}\n\n"
  f"💎 <b>Official Donation Wallets (GitHub Verified):</b>\n\n"
  f"🔹 <b>TON (Toncoin):</b>\n<code>{TON_WALLET}</code>\n\n"
  f"🔺 <b>TRON (TRX - TRC20):</b>\n<code>{TRON_WALLET}</code>"
 )
 kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="🐙 مشاهده گیت‌هاب سازنده (GitHub)", url=GITHUB_URL)]])
 await message.answer(text, reply_markup=kb, parse_mode="HTML")
@router.message(F.text.in_([v["btn_group"] for v in LANGS.values()]), StateFilter("*"))
async def show_group_info(message: Message, state: FSMContext, bot: Bot):
 await state.clear()
 me = await bot.get_me()
 bot_user = me.username or "ArzPulseBot"
 group_admin_url = f"https://t.me/{bot_user}?startgroup=true&admin=manage_chat+delete_messages+pin_messages+invite_users"
 group_normal_url = f"https://t.me/{bot_user}?startgroup=true"
 channel_admin_url = f"https://t.me/{bot_user}?startchannel=true&admin=post_messages+edit_messages+delete_messages"
 kb = InlineKeyboardMarkup(
  inline_keyboard=[
   [InlineKeyboardButton(text="➕ افزودن ربات به گروه (Add to Group - Admin)", url=group_admin_url)],
   [InlineKeyboardButton(text="📢 افزودن ربات به کانال (Add to Channel - Admin)", url=channel_admin_url)],
   [InlineKeyboardButton(text="👥 افزودن معمولی به گروه (Member Mode)", url=group_normal_url)],
   [InlineKeyboardButton(text="📊 تست ارسال تابلوی کامل نرخ ارزها", callback_data="send_live_board")],
  ]
 )
 info_text = (
  f"➕ <b>افزودن ربات @{bot_user} به گروه یا کانال تلگرام</b>\n\n"
  f"✅ <b>روش ۱ (از طریق کیبورد رنگی پایین صفحه):</b>\n"
  f"کافیست روی دکمه سبز <b>«👥 انتخاب گروه و افزودن خودکار ربات»</b> یا دکمه آبی <b>«📢 انتخاب کانال و افزودن خودکار ربات»</b> در کیبورد پایین صفحه بزنید تا لیست گروه‌ها یا کانال‌های شما باز شود و ربات خودکار اضافه گردد!\n\n"
  f"✅ <b>روش ۲ (از طریق دکمه‌های شیشه‌ای زیر):</b>\n"
  f"• <b>لینک مستقیم گروه:</b>\n{group_admin_url}\n"
  f"• <b>لینک مستقیم کانال:</b>\n{channel_admin_url}\n\n"
  f"📋 <b>دستورات قابل استفاده داخل گروه و کانال:</b>\n"
  f"• <code>نرخ ارز</code> یا <code>/rates</code> ⬅️ ارسال تابلوی کامل ۱۶ ارز و رمزارز ArzDigital\n"
  f"• <code>قیمت دلار</code> یا <code>قیمت ترون</code> یا <code>/price usd</code> ⬅️ قیمت + عکس نمودار سود و زیان\n"
  f"• <code>تبدیل 10 دلار به ترون</code> یا <code>/convert 10 usd trx</code> ⬅️ تبدیل دقیق ارزها"
 )
 if message.chat.type == "private":
  await message.answer(
   "👇 از کیبورد رنگی پایین صفحه، گروه یا کانال خود را انتخاب کنید:",
   reply_markup=build_group_channel_keyboard(),
  )
 await message.answer(info_text, reply_markup=kb, parse_mode="HTML")
@router.message(F.chat_shared, StateFilter("*"))
async def handle_chat_shared(message: Message, bot: Bot):
 shared = message.chat_shared
 if not shared:
  return
 target_chat_id = shared.chat_id
 is_channel = (shared.request_id == 102)
 kind_label = "کانال" if is_channel else "گروه"
 await refresh_live_prices()
 board_msg = format_full_rates_board()
 try:
  await bot.send_message(
   target_chat_id,
   f"✅ <b>ربات ArzPulse Pro با موفقیت به این {kind_label} متصل شد!</b>\n\n{board_msg}",
   parse_mode="HTML",
  )
  await message.answer(
   f"✅ ربات با موفقیت به {kind_label} شما (ID: <code>{target_chat_id}</code>) اضافه شد و اولین تابلوی زنده نرخ ارز ارسال گردید!",
   reply_markup=build_main_keyboard(get_uid(message), message.chat.type),
   parse_mode="HTML",
  )
 except Exception:
  await message.answer(
   f"✅ {kind_label} انتخاب شد! اکنون در {kind_label} خود عبارت <code>نرخ ارز</code> یا <code>قیمت دلار</code> یا <code>/rates</code> را ارسال کنید.",
   reply_markup=build_main_keyboard(get_uid(message), message.chat.type),
   parse_mode="HTML",
  )
@router.my_chat_member()
async def on_bot_added_to_group_or_channel(event: ChatMemberUpdated, bot: Bot):
 new_status = event.new_chat_member.status
 if new_status in ("member", "administrator"):
  chat = event.chat
  await refresh_live_prices()
  board_msg = format_full_rates_board()
  try:
   await bot.send_message(
    chat.id,
    f"🎉 <b>ربات نرخ لحظه‌ای ArzDigital به «{chat.title or 'این چت'}» اضافه شد!</b>\n\n{board_msg}",
    parse_mode="HTML",
   )
  except Exception:
   pass
  if event.from_user:
   try:
    await bot.send_message(
     event.from_user.id,
     f"✅ ربات با موفقیت به <b>{chat.title or chat.id}</b> متصل شد!\n"
     f"می‌توانید داخل آن از دستورات <code>نرخ ارز</code>، <code>قیمت دلار</code>، <code>تبدیل 10 دلار به ترون</code>، <code>/rates</code> و <code>/price usd</code> استفاده کنید.",
     parse_mode="HTML",
    )
   except Exception:
    pass
@router.message(F.text.in_([v["btn_miniapp"] for v in LANGS.values()]), StateFilter("*"))
async def show_miniapp_link(message: Message, state: FSMContext):
 await state.clear()
 https_url = get_https_panel_url()
 http_url = get_http_direct_url()
 buttons = []
 if https_url.startswith("https://") and message.chat.type == "private":
  buttons.append([InlineKeyboardButton(text="📱 باز کردن مینی‌اپ داخل تلگرام (Mini App)", web_app=WebAppInfo(url=f"{https_url}/miniapp"))])
 if https_url.startswith("https://"):
  buttons.append([InlineKeyboardButton(text="🌐 باز کردن مینی‌اپ در مرورگر (HTTPS)", url=f"{https_url}/miniapp")])
 buttons.append([InlineKeyboardButton(text="🖥 باز کردن مینی‌اپ (لینک مستقیم سرور Port 80)", url=f"{http_url}/miniapp")])
 buttons.append([InlineKeyboardButton(text="⚡ باز کردن مینی‌اپ (Port 8080)", url=f"{http_url}:8080/miniapp")])
 kb = InlineKeyboardMarkup(inline_keyboard=buttons)
 text = (
  f"🚀 <b>مینی‌اپ و پنل پیشرفته ارزدیجیتال (ArzPulse Mini App)</b>\n\n"
  f"🔹 <b>لینک HTTPS (مخصوص مینی‌اپ تلگرام):</b>\n{https_url}/miniapp\n\n"
  f"🔹 <b>لینک مستقیم سرور (Port 80):</b>\n{http_url}/miniapp\n\n"
  f"🔹 <b>لینک پورت 8080:</b>\n{http_url}:8080/miniapp\n\n"
  f"👇 برای ورود فوری روی یکی از دکمه‌های زیر کلیک کنید:"
 )
 await message.answer(text, reply_markup=kb, parse_mode="HTML")
@router.message(F.text.in_([v["btn_owner"] for v in LANGS.values()]), StateFilter("*"))
async def show_owner_panel(message: Message, state: FSMContext):
 await state.clear()
 if get_uid(message) != OWNER_ID:
  return
 https_url = get_https_panel_url()
 http_url = get_http_direct_url()
 buttons = []
 if https_url.startswith("https://") and message.chat.type == "private":
  buttons.append([InlineKeyboardButton(text="👑 ورود مستقیم به وب‌پنل مدیریت (HTTPS Auto-Login)", web_app=WebAppInfo(url=f"{https_url}/admin?u={ADMIN_USERNAME}&p={ADMIN_PASSWORD}"))])
 if https_url.startswith("https://"):
  buttons.append([InlineKeyboardButton(text="🌐 باز کردن وب‌پنل در مرورگر (HTTPS)", url=f"{https_url}/admin?u={ADMIN_USERNAME}&p={ADMIN_PASSWORD}")])
 buttons.append([InlineKeyboardButton(text="🖥 ورود به وب‌پنل مدیریت (سرور Port 80)", url=f"{http_url}/admin?u={ADMIN_USERNAME}&p={ADMIN_PASSWORD}")])
 buttons.append([InlineKeyboardButton(text="⚡ ورود به وب‌پنل مدیریت (Port 8080)", url=f"{http_url}:8080/admin?u={ADMIN_USERNAME}&p={ADMIN_PASSWORD}")])
 kb = InlineKeyboardMarkup(inline_keyboard=buttons)
 text = (
  f"👑 <b>پنل مدیریت اختصاصی مالک (Owner Web Admin Console)</b>\n\n"
  f"👥 <b>کاربران فعال ربات:</b> <code>{len(total_users) or 1}</code>\n"
  f"👤 <b>نام کاربری پنل (Username):</b> <code>{ADMIN_USERNAME}</code>\n"
  f"🔑 <b>رمز عبور پنل (Password):</b> <code>{ADMIN_PASSWORD}</code>\n\n"
  f"🌐 <b>آدرس HTTPS وب‌پنل:</b>\n{https_url}/admin\n\n"
  f"🖥 <b>آدرس مستقیم آی‌پی سرور:</b>\n{http_url}/admin\n{http_url}:8080/admin\n\n"
  f"🛠 <b>دستور مدیریت سرور:</b> <code>sudo arz</code>\n\n"
  f"👇 با کلیک روی دکمه‌های زیر مستقیماً وارد پنل مدیریت شوید:"
 )
 await message.answer(text, reply_markup=kb, parse_mode="HTML")
def compute_pair_rate(c1: str, c2: str) -> float:
 if c1 == "IRT" or c2 == "IRT":
  return ASSETS_DB[c1]["toman"] / ASSETS_DB[c2]["toman"]
 return ASSETS_DB[c1]["price"] / ASSETS_DB[c2]["price"]
@router.message(Command("price"), StateFilter("*"))
async def cmd_group_price(message: Message, state: FSMContext):
 await state.clear()
 parts = (message.text or "").split(maxsplit=1)
 await send_price_response(message, parts[1] if len(parts) > 1 else "USD")
@router.message(Command("convert"), StateFilter("*"))
async def cmd_group_convert(message: Message, state: FSMContext):
 await state.clear()
 parts = (message.text or "").split()
 if len(parts) < 4:
  await message.answer("Usage: <code>/convert 10 usd trx</code>", parse_mode="HTML")
  return
 try:
  amt = float(normalize_num_str(parts[1]))
 except ValueError:
  amt = 1.0
 c1, c2 = resolve_asset(parts[2]), resolve_asset(parts[3])
 if not c1 or not c2:
  await message.answer(get_lang(get_uid(message))["not_found"])
  return
 await refresh_live_prices([c1, c2, "USD"])
 rate = compute_pair_rate(c1, c2)
 res = amt * rate
 toman_total = amt * ASSETS_DB[c1]["toman"]
 await message.answer(
  f"🔄 <b>Conversion Result (ArzDigital Live):</b>\n<code>{amt:g} {c1} = {res:,.4f} {c2}</code>\n🇮🇷 <b>Toman Value:</b> <code>{toman_total:,.0f} IRT</code>\n📌 1 {c1} = {rate:,.4f} {c2}",
  parse_mode="HTML",
 )
async def send_price_response(message: Message, query: str):
 code = resolve_asset(query)
 if not code:
  await message.answer(get_lang(get_uid(message))["not_found"])
  return
 await refresh_live_prices([code, "USD"])
 info = ASSETS_DB[code]
 price_usd, toman, change = info["price"], info["toman"], info["change"]
 sign = "+" if change >= 0 else ""
 status_emoji = "🟢 Profit" if change >= 0 else "🔴 Loss"
 chart_bytes = render_pnl_chart_png(code, price_usd, toman, change)
 photo = BufferedInputFile(chart_bytes, filename=f"{code}_pnl.png")
 caption = (
  f"📊 <b>{info.get('name', code)} ({code}) — ArzDigital Live Report</b>\n\n"
  f"🇮🇷 <b>نرخ تومانی (IRT):</b> <code>{toman:,.0f} تومان</code>\n"
  f"💵 <b>نرخ دلاری (USD):</b> <code>${price_usd:,.4f}</code>\n"
  f"📈 <b>سود/زیان ۲۴ ساعته:</b> <code>{sign}{change:.2f}%</code> ({status_emoji})\n"
  f"📡 <b>منبع:</b> arzdigital.com"
 )
 await message.answer_photo(photo=photo, caption=caption, parse_mode="HTML")
async def handle_natural_text_command(message: Message) -> bool:
 raw = (message.text or "").strip()
 if not raw:
  return False
 clean = normalize_num_str(raw)
 low = clean.lower()
 if low in ("نرخ ارز", "لیست قیمت", "قیمت ارزها", "تابلو ارز", "ارزها", "/rates", "rates"):
  await refresh_live_prices()
  await message.answer(format_full_rates_board(), parse_mode="HTML")
  return True
 for prefix in ("قیمت ", "نرخ ", "price "):
  if low.startswith(prefix):
   q = clean[len(prefix):].strip()
   if resolve_asset(q):
    await send_price_response(message, q)
    return True
 m_conv = re.match(r"^(?:تبدیل\s+)?([0-9.]+)\s+(.+?)\s+(?:به|to|in)\s+(.+)$", clean, re.IGNORECASE)
 if m_conv:
  try:
   amt = float(m_conv.group(1))
  except ValueError:
   amt = 1.0
  c1, c2 = resolve_asset(m_conv.group(2)), resolve_asset(m_conv.group(3))
  if c1 and c2:
   await refresh_live_prices([c1, c2, "USD"])
   rate = compute_pair_rate(c1, c2)
   res = amt * rate
   toman_total = amt * ASSETS_DB[c1]["toman"]
   await message.answer(
    f"🔄 <b>نتیجه تبدیل دقیق (ArzDigital Live):</b>\n"
    f"💵 <b>{amt:g} {c1}</b> = 🎯 <b>{res:,.4f} {c2}</b>\n"
    f"🇮🇷 <b>معادل تومانی:</b> <code>{toman_total:,.0f} تومان</code>\n"
    f"📌 1 {c1} = {rate:,.4f} {c2}",
    parse_mode="HTML",
   )
   return True
 if resolve_asset(clean):
  await send_price_response(message, clean)
  return True
 return False
@router.channel_post()
async def handle_channel_posts(message: Message):
 text = (message.text or "").strip()
 if not text:
  return
 if text.startswith("/start") or text.startswith("/rates"):
  await refresh_live_prices()
  await message.answer(format_full_rates_board(), parse_mode="HTML")
  return
 if text.startswith("/price"):
  parts = text.split(maxsplit=1)
  await send_price_response(message, parts[1] if len(parts) > 1 else "USD")
  return
 if text.startswith("/convert"):
  parts = text.split()
  if len(parts) >= 4:
   try:
    amt = float(normalize_num_str(parts[1]))
   except ValueError:
    amt = 1.0
   c1, c2 = resolve_asset(parts[2]), resolve_asset(parts[3])
   if c1 and c2:
    await refresh_live_prices([c1, c2, "USD"])
    rate = compute_pair_rate(c1, c2)
    res = amt * rate
    toman_total = amt * ASSETS_DB[c1]["toman"]
    await message.answer(
     f"🔄 <b>Conversion Result (ArzDigital):</b>\n<code>{amt:g} {c1} = {res:,.4f} {c2}</code>\n🇮🇷 <b>Toman:</b> <code>{toman_total:,.0f} IRT</code>",
     parse_mode="HTML",
    )
  return
 await handle_natural_text_command(message)
@router.message(BotStates.waiting_for_price_asset)
async def handle_price_state(message: Message, state: FSMContext):
 await state.clear()
 if not await handle_natural_text_command(message):
  await send_price_response(message, message.text or "")
@router.message(BotStates.convert_first_asset)
async def handle_conv_1(message: Message, state: FSMContext):
 c1 = resolve_asset(message.text or "")
 if not c1:
  await message.answer(get_lang(get_uid(message))["not_found"])
  return
 await state.update_data(c1=c1)
 await state.set_state(BotStates.convert_second_asset)
 await message.answer(f"✅ <b>{c1}</b>\n\n{get_lang(get_uid(message))['ask_conv_2']}", parse_mode="HTML")
@router.message(BotStates.convert_second_asset)
async def handle_conv_2(message: Message, state: FSMContext):
 c2 = resolve_asset(message.text or "")
 if not c2:
  await message.answer(get_lang(get_uid(message))["not_found"])
  return
 data = await state.get_data()
 c1 = data["c1"]
 await refresh_live_prices([c1, c2, "USD"])
 unit_rate = compute_pair_rate(c1, c2)
 await state.update_data(c2=c2)
 await state.set_state(BotStates.convert_amount)
 await message.answer(f"✅ <b>{c1} ➔ {c2}</b> (1 {c1} = {unit_rate:,.4f} {c2})\n\n{get_lang(get_uid(message))['ask_conv_amt']}", parse_mode="HTML")
@router.message(BotStates.convert_amount)
async def handle_conv_amount(message: Message, state: FSMContext):
 data = await state.get_data()
 await state.clear()
 c1, c2 = data.get("c1", "USD"), data.get("c2", "TRX")
 try:
  amt = float(normalize_num_str(message.text or "1"))
 except ValueError:
  amt = 1.0
 await refresh_live_prices([c1, c2, "USD"])
 rate = compute_pair_rate(c1, c2)
 rev_rate = 1.0 / rate if rate else 0.0
 converted = amt * rate
 toman_val = amt * ASSETS_DB[c1]["toman"]
 await message.answer(
  f"🔄 <b>Accurate Conversion Result (ArzDigital Live):</b>\n\n💵 <b>{amt:g} {c1}</b> =\n🎯 <b>{converted:,.4f} {c2}</b>\n🇮🇷 <b>معادل تومانی:</b> <code>{toman_val:,.0f} تومان</code>\n\n📌 1 {c1} = {rate:,.4f} {c2}\n🔁 1 {c2} = {rev_rate:,.4f} {c1}",
  parse_mode="HTML",
 )
@router.message(BotStates.waiting_for_support_msg)
async def handle_support_msg(message: Message, state: FSMContext, bot: Bot):
 await state.clear()
 uid = get_uid(message)
 await message.answer(get_lang(uid)["support_ok"])
 try:
  sender_name = message.from_user.full_name if message.from_user else "User"
  await bot.send_message(OWNER_ID, f"📩 <b>New Support Message from {sender_name} (ID: <code>{uid}</code>):</b>\n\n{message.text}", parse_mode="HTML")
 except Exception:
  pass
@router.message()
async def fallback_asset_lookup(message: Message):
 await handle_natural_text_command(message)
async def api_rates(request):
 if request.query.get("sync") == "1":
  await refresh_live_prices()
 rates_list = [
  {"code": k, "name": v.get("name", k), "toman": v["toman"], "usd": v["price"], "change": v["change"]}
  for k, v in ASSETS_DB.items()
 ]
 return web.json_response({
  "ok": True,
  "rates": rates_list,
  "usersCount": max(1, len(total_users)),
  "serverIp": SERVER_IP,
  "tunnelUrl": get_https_panel_url(),
 })
async def api_override(request):
 body = await request.json()
 if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
  return web.json_response({"ok": False}, status=403)
 code = body.get("code", "USD")
 toman, usd = float(body.get("toman", 262400)), float(body.get("usd", 1.0))
 ov = {}
 try:
  if os.path.exists(OVERRIDES_FILE):
   with open(OVERRIDES_FILE, "r", encoding="utf-8") as f:
    ov = json.load(f)
 except Exception:
  pass
 ov[code] = {"toman": toman, "price": usd}
 with open(OVERRIDES_FILE, "w", encoding="utf-8") as f:
  json.dump(ov, f)
 if code in ASSETS_DB:
  ASSETS_DB[code]["toman"] = toman
  ASSETS_DB[code]["price"] = usd
 return web.json_response({"ok": True})
async def api_support(request):
 body = await request.json()
 msg = (body.get("message") or "").strip()
 if not msg:
  return web.json_response({"ok": False}, status=400)
 try:
  await request.app["bot"].send_message(OWNER_ID, f"📩 <b>پیام پشتیبانی از مینی‌اپ:</b>\n\n{msg}", parse_mode="HTML")
 except Exception:
  pass
 return web.json_response({"ok": True})
async def api_broadcast(request):
 body = await request.json()
 if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
  return web.json_response({"ok": False}, status=403)
 msg = (body.get("message") or "").strip()
 sent = 0
 targets = set(total_users) | {OWNER_ID}
 for uid in targets:
  try:
   await request.app["bot"].send_message(uid, f"📢 <b>اطلاعیه مدیریت ربات:</b>\n\n{msg}", parse_mode="HTML")
   sent += 1
  except Exception:
   pass
 return web.json_response({"ok": True, "sent": sent})
WEB_HTML = """<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>ArzPulse Pro — مینی‌اپ و وب‌پنل مدیریت (ArzDigital Live)</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
:root{--bg:#050816;--card:rgba(15,23,42,0.9);--border:rgba(56,189,248,0.24);--emerald:#10b981;--blue:#3b82f6;--rose:#f43f5e;--text:#f8fafc;--muted:#94a3b8}
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Tahoma,sans-serif}
body{background:radial-gradient(circle at 15% 15%,rgba(16,185,129,0.16),transparent 40%),radial-gradient(circle at 85% 20%,rgba(59,130,246,0.16),transparent 45%),var(--bg);color:var(--text);min-height:100vh;padding:14px}
.container{max-width:1100px;margin:0 auto}
.header{background:var(--card);backdrop-filter:blur(14px);border:1px solid var(--border);border-radius:18px;padding:16px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;box-shadow:0 14px 36px rgba(0,0,0,0.45)}
.brand{display:flex;align-items:center;gap:12px}
.badge-icon{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#10b981,#2563eb);display:flex;align-items:center;justify-content:center;font-size:21px;box-shadow:0 0 20px rgba(16,185,129,0.4)}
.nav{display:flex;gap:8px;flex-wrap:wrap}
.btn{border:1px solid rgba(255,255,255,0.14);background:#1e293b;color:#fff;padding:9px 14px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:6px}
.btn:hover{transform:translateY(-2px);border-color:var(--blue)}
.btn-p{background:linear-gradient(135deg,#2563eb,#1d4ed8);border-color:#3b82f6}
.btn-s{background:linear-gradient(135deg,#059669,#10b981);border-color:#34d399}
.btn-d{background:linear-gradient(135deg,#e11d48,#f43f5e);border-color:#fb7185}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;margin-bottom:18px}
.grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:12px}
.card{background:var(--card);border:1px solid rgba(148,163,184,0.18);border-radius:16px;padding:16px;box-shadow:0 10px 28px rgba(0,0,0,0.35);transition:.2s}
.card:hover{border-color:rgba(56,189,248,0.42)}
.input,select,textarea{width:100%;background:#020617;border:1px solid rgba(148,163,184,0.28);color:#fff;padding:10px 12px;border-radius:11px;font-size:13.5px;outline:none;margin-top:5px}
.res-box{margin-top:12px;padding:14px;border-radius:13px;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(37,99,235,0.15));border:1px solid rgba(16,185,129,0.4);text-align:center}
.up{color:#34d399;background:rgba(16,185,129,0.15);padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:700}
.down{color:#fb7185;background:rgba(244,63,94,0.15);padding:3px 8px;border-radius:7px;font-size:11.5px;font-weight:700}
.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;direction:ltr;display:inline-block}
.hidden{display:none!important}
.wbox{background:#020617;border:1px solid rgba(148,163,184,0.2);padding:9px 11px;border-radius:10px;font-size:11.5px;word-break:break-all;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
 <div class="brand">
   <div class="badge-icon">💎</div>
   <div>
  <h1 style="font-size:18px;font-weight:800">ArzPulse Pro — مینی‌اپ و وب‌پنل زنده ارزدیجیتال</h1>
  <p style="font-size:11.5px;color:var(--muted);margin-top:2px">متصل به نرخ لحظه‌ای ArzDigital.com • مدیریت سرور: <span class="mono" style="color:#34d399">sudo arz</span></p>
   </div>
 </div>
 <div class="nav">
   <button class="btn btn-p" onclick="switchView('miniapp')">🚀 مینی‌اپ و تبدیل ارز</button>
   <button class="btn btn-d" onclick="switchView('admin')">👑 پنل مدیریت مالک</button>
   <button class="btn btn-s" id="syncBtn" onclick="syncNow()">🔄 بروزرسانی زنده</button>
 </div>
  </div>
  <div id="viewMiniApp">
 <div class="grid-2">
   <div class="card">
  <h2 style="font-size:15px;color:#34d399;margin-bottom:10px">🔄 ماشین‌حساب تبدیل دقیق ارز و کریپتو (ArzDigital)</h2>
  <label style="font-size:11.5px;color:var(--muted)">مقدار (Amount):</label>
  <input id="convAmt" class="input mono" type="number" value="1" step="any" oninput="runConvert()">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
    <div><label style="font-size:11.5px;color:var(--muted)">از ارز مبدا:</label><select id="convFrom" onchange="runConvert()"></select></div>
    <div><label style="font-size:11.5px;color:var(--muted)">به ارز مقصد:</label><select id="convTo" onchange="runConvert()"></select></div>
  </div>
  <div class="res-box">
    <div id="convResultMain" class="mono" style="font-size:20px;font-weight:800;color:#34d399">1 USD = 3.0120 TRX</div>
    <div id="convResultToman" style="font-size:12.5px;color:#cbd5e1;margin-top:5px">معادل تومانی: 262,400 تومان</div>
    <div id="convResultUnit" class="mono" style="font-size:11px;color:var(--muted);margin-top:3px">1 USD = 3.0120 TRX</div>
  </div>
   </div>
   <div class="card">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <h2 style="font-size:15px;color:#60a5fa">📈 نمودار سود و زیان ۲۴ ساعته (<span id="chartTitleCode">USD</span>)</h2>
    <span id="chartChangeBadge" class="up">+0.00%</span>
  </div>
  <svg id="pnlSvg" viewBox="0 0 400 125" style="width:100%;height:125px;background:#020617;border-radius:11px;border:1px solid rgba(148,163,184,0.16)"></svg>
  <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,0.15)">
    <h3 style="font-size:12.5px;margin-bottom:5px">🛟 ارسال پیام مستقیم به پشتیبانی ربات:</h3>
    <div style="display:flex;gap:7px">
   <input id="supInput" class="input" style="margin-top:0" placeholder="پیام یا سوال خود را بنویسید...">
   <button class="btn btn-p" onclick="sendSupport()">ارسال</button>
    </div>
    <div id="supStatus" style="font-size:11.5px;color:#34d399;margin-top:4px"></div>
  </div>
   </div>
 </div>
 <div class="card" style="margin-bottom:18px">
   <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
  <h2 style="font-size:15px">💰 قیمت لحظه‌ای ارزها و رمزارزها (کلیک برای نمودار)</h2>
  <input id="searchBox" class="input" style="max-width:240px;margin-top:0" placeholder="🔍 جستجو (دلار، ترون، TON...)" oninput="renderCards()">
   </div>
   <div id="ratesGrid" class="grid-cards"></div>
 </div>
 <div class="card">
   <h2 style="font-size:14.5px;color:#38bdf8;margin-bottom:6px">👨‍💻 سازنده ربات و ولت‌های رسمی حمایت (Donate)</h2>
   <p style="font-size:12px;color:var(--muted)">گیت‌هاب: <a href="__GITHUB__" target="_blank" style="color:#34d399" class="mono">__GITHUB__</a></p>
   <div class="wbox" dir="ltr"><span><b style="color:#38bdf8">TON:</b> <span class="mono">__TON__</span></span><button class="btn" style="padding:4px 9px;font-size:11px" onclick="navigator.clipboard.writeText('__TON__')">Copy</button></div>
   <div class="wbox" dir="ltr"><span><b style="color:#fb7185">TRON:</b> <span class="mono">__TRON__</span></span><button class="btn" style="padding:4px 9px;font-size:11px" onclick="navigator.clipboard.writeText('__TRON__')">Copy</button></div>
 </div>
  </div>
  <div id="viewAdmin" class="hidden">
 <div id="adminLoginCard" class="card" style="max-width:440px;margin:24px auto">
   <h2 style="font-size:17px;color:#fb7185;margin-bottom:6px">🔐 ورود به وب‌پنل مدیریت مالک</h2>
   <p style="font-size:12px;color:var(--muted);margin-bottom:12px">نام کاربری و رمز عبور نمایش داده شده در دکمه «👑 مدیریت مالک» ربات را وارد کنید:</p>
   <label style="font-size:11.5px;color:var(--muted)">نام کاربری (Username):</label>
   <input id="loginUser" class="input mono" value="__ADMIN_USER__">
   <div style="margin-top:10px"><label style="font-size:11.5px;color:var(--muted)">رمز عبور (Password):</label><input id="loginPass" type="password" class="input mono" placeholder="••••••••••••"></div>
   <div id="loginErr" style="color:#fb7185;font-size:12px;margin:8px 0"></div>
   <button class="btn btn-d" style="width:100%;justify-content:center;padding:11px;margin-top:6px" onclick="doAdminLogin()">ورود به کنسول مدیریت مالک</button>
 </div>
 <div id="adminDashContent" class="hidden">
   <div class="grid-2">
  <div class="card">
    <h2 style="font-size:15px;color:#34d399;margin-bottom:10px">👑 وضعیت سرور و اطلاعات مالک</h2>
    <div style="font-size:12.5px;line-height:1.95">
   <div>👥 کاربران ثبت‌شده ربات: <b id="statUsers" class="mono" style="color:#34d399">1</b></div>
   <div>🖥 آدرس مستقیم سرور: <b id="statIp" class="mono" style="color:#60a5fa">-</b></div>
   <div>🔒 لینک HTTPS مینی‌اپ: <b id="statTunnel" class="mono" style="color:#f59e0b">-</b></div>
   <div>👤 نام کاربری ادمین: <b class="mono" style="color:#34d399">__ADMIN_USER__</b></div>
   <div>🔑 رمز عبور ادمین: <b class="mono" style="color:#fbbf24">__ADMIN_PASS__</b></div>
   <div>🛠 دستور مدیریت سرور: <code class="mono" style="color:#fb7185">sudo arz</code></div>
    </div>
  </div>
  <div class="card">
    <h2 style="font-size:15px;color:#60a5fa;margin-bottom:10px">✏️ ویرایش نرخ ارز یا همگام‌سازی با ArzDigital</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
   <div><label style="font-size:11.5px;color:var(--muted)">انتخاب ارز:</label><select id="editCode" onchange="fillEditInputs()"></select></div>
   <div><label style="font-size:11.5px;color:var(--muted)">نرخ تومانی (IRT):</label><input id="editToman" type="number" step="any" class="input mono"></div>
    </div>
    <div style="margin-top:8px"><label style="font-size:11.5px;color:var(--muted)">نرخ دلاری (USD):</label><input id="editUsd" type="number" step="any" class="input mono"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
   <button class="btn btn-s" style="flex:1;justify-content:center" onclick="saveRateOverride()">ذخیره نرخ جدید</button>
   <button class="btn btn-p" onclick="syncNow()">بروزرسانی از ArzDigital</button>
    </div>
    <div id="editStatus" style="font-size:11.5px;color:#34d399;margin-top:6px"></div>
  </div>
   </div>
   <div class="card">
  <h2 style="font-size:15px;color:#fb7185;margin-bottom:8px">📢 ارسال پیام همگانی به تمام کاربران ربات (Broadcast)</h2>
  <textarea id="bcText" rows="3" placeholder="متن اطلاعیه یا پیام همگانی خود را بنویسید..."></textarea>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
    <span id="bcStatus" style="font-size:12px;color:#34d399"></span>
    <button class="btn btn-d" onclick="sendBroadcast()">🚀 ارسال به تمام کاربران</button>
  </div>
   </div>
 </div>
  </div>
</div>
<script>
let RATES=[],selectedChartCode='USD';
const EXPECTED_USER="__ADMIN_USER__",EXPECTED_PASS="__ADMIN_PASS__";
function switchView(v){
  document.getElementById('viewMiniApp').classList.toggle('hidden',v!=='miniapp');
  document.getElementById('viewAdmin').classList.toggle('hidden',v!=='admin');
}
function checkAutoLogin(){
  const p=new URLSearchParams(window.location.search);
  if(window.location.pathname.includes('/admin'))switchView('admin');
  if(p.get('u')===EXPECTED_USER&&p.get('p')===EXPECTED_PASS){
 document.getElementById('loginPass').value=EXPECTED_PASS;
 document.getElementById('adminLoginCard').classList.add('hidden');
 document.getElementById('adminDashContent').classList.remove('hidden');
  }
}
function doAdminLogin(){
  const u=document.getElementById('loginUser').value.trim(),p=document.getElementById('loginPass').value.trim();
  if(u===EXPECTED_USER&&p===EXPECTED_PASS){
 document.getElementById('adminLoginCard').classList.add('hidden');
 document.getElementById('adminDashContent').classList.remove('hidden');
  }else document.getElementById('loginErr').innerText='❌ نام کاربری یا رمز عبور اشتباه است!';
}
async function loadData(sync=false){
  try{
 const r=await fetch('/api/rates'+(sync?'?sync=1':'')),d=await r.json();
 if(d.rates){
   RATES=d.rates;
   document.getElementById('statUsers').innerText=d.usersCount||1;
   document.getElementById('statIp').innerText='http://'+(d.serverIp||window.location.hostname)+'/admin';
   document.getElementById('statTunnel').innerText=d.tunnelUrl?(d.tunnelUrl+'/miniapp'):window.location.origin;
   populateSelects();runConvert();renderCards();drawChart(selectedChartCode);
 }
  }catch(e){}
}
function populateSelects(){
  const s1=document.getElementById('convFrom'),s2=document.getElementById('convTo'),se=document.getElementById('editCode');
  const p1=s1.value||'USD',p2=s2.value||'TRX',pe=se.value||'USD';
  const h=RATES.map(x=>'<option value="'+x.code+'">'+x.code+' — '+x.name+'</option>').join('');
  s1.innerHTML=h;s2.innerHTML=h;se.innerHTML=h;
  s1.value=p1;s2.value=p2;se.value=pe;fillEditInputs();
}
function runConvert(){
  const amt=parseFloat(document.getElementById('convAmt').value)||1;
  const c1=document.getElementById('convFrom').value||'USD',c2=document.getElementById('convTo').value||'TRX';
  const a1=RATES.find(x=>x.code===c1)||RATES[0],a2=RATES.find(x=>x.code===c2)||RATES[1];
  if(!a1||!a2)return;
  const unit=(c1==='IRT'||c2==='IRT')?(a1.toman/a2.toman):(a1.usd/a2.usd),res=amt*unit,toman=amt*a1.toman;
  document.getElementById('convResultMain').innerText=amt+' '+c1+' = '+res.toLocaleString('en-US',{maximumFractionDigits:4})+' '+c2;
  document.getElementById('convResultToman').innerText='🇮🇷 معادل تومانی: '+Math.round(toman).toLocaleString('en-US')+' تومان';
  document.getElementById('convResultUnit').innerText='1 '+c1+' = '+unit.toLocaleString('en-US',{maximumFractionDigits:4})+' '+c2;
}
function renderCards(){
  const q=(document.getElementById('searchBox').value||'').trim().toLowerCase();
  const filtered=RATES.filter(x=>!q||x.code.toLowerCase().includes(q)||x.name.toLowerCase().includes(q));
  document.getElementById('ratesGrid').innerHTML=filtered.map(x=>{
 const up=x.change>=0,s=up?'+':'';
 return '<div class="card" style="cursor:pointer;padding:13px" onclick="drawChart(\''+x.code+'\')"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13.5px">'+x.name+'</b><span class="'+(up?'up':'down')+' mono">'+s+x.change.toFixed(2)+'%</span></div><div style="margin-top:8px;font-size:16px;font-weight:800;color:#34d399" class="mono">'+Math.round(x.toman).toLocaleString('en-US')+' <span style="font-size:11.5px">تومان</span></div><div style="font-size:11.5px;color:#94a3b8;margin-top:2px" class="mono">$'+x.usd.toLocaleString('en-US',{maximumFractionDigits:4})+' USD</div></div>';
  }).join('');
}
function drawChart(code){
  selectedChartCode=code;
  const item=RATES.find(x=>x.code===code)||RATES[0];
  if(!item)return;
  document.getElementById('chartTitleCode').innerText=item.code+' ('+Math.round(item.toman).toLocaleString('en-US')+' تومان)';
  const b=document.getElementById('chartChangeBadge'),up=item.change>=0;
  b.className=up?'up mono':'down mono';b.innerText=(up?'+':'')+item.change.toFixed(2)+'%';
  const pts=up?[95,82,86,65,70,45,28]:[30,48,42,66,60,82,98],stroke=up?'#10b981':'#f43f5e';
  const coords=pts.map((y,i)=>(20+i*60)+','+y).join(' ');
  document.getElementById('pnlSvg').innerHTML='<polyline fill="none" stroke="'+stroke+'" stroke-width="3.5" points="'+coords+'" />'+pts.map((y,i)=>'<circle cx="'+(20+i*60)+'" cy="'+y+'" r="4.5" fill="'+stroke+'" />').join('');
}
function fillEditInputs(){
  const item=RATES.find(x=>x.code===(document.getElementById('editCode').value||'USD'));
  if(item){document.getElementById('editToman').value=item.toman;document.getElementById('editUsd').value=item.usd;}
}
async function syncNow(){
  const btn=document.getElementById('syncBtn');btn.innerText='⏳ در حال دریافت...';
  await loadData(true);btn.innerText='✅ بروز شد';
  setTimeout(()=>{btn.innerText='🔄 بروزرسانی زنده';},1800);
}
async function saveRateOverride(){
  const code=document.getElementById('editCode').value,toman=parseFloat(document.getElementById('editToman').value),usd=parseFloat(document.getElementById('editUsd').value);
  const r=await fetch('/api/override',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,code,toman,usd})});
  if(r.ok){document.getElementById('editStatus').innerText='✅ نرخ '+code+' ذخیره شد!';await loadData(false);}
}
async function sendSupport(){
  const m=document.getElementById('supInput').value.trim();if(!m)return;
  await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
  document.getElementById('supInput').value='';document.getElementById('supStatus').innerText='✅ پیام شما به تلگرام مالک ربات ارسال شد!';
}
async function sendBroadcast(){
  const m=document.getElementById('bcText').value.trim();if(!m)return;
  const r=await fetch('/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,message:m})});
  const d=await r.json();if(d.ok){document.getElementById('bcText').value='';document.getElementById('bcStatus').innerText='✅ پیام به '+d.sent+' کاربر ارسال شد!';}
}
checkAutoLogin();loadData(true);
</script>
</body>
</html>"""
async def handle_page(request):
 html = (
  WEB_HTML
  .replace("__ADMIN_USER__", ADMIN_USERNAME)
  .replace("__ADMIN_PASS__", ADMIN_PASSWORD)
  .replace("__TON__", TON_WALLET)
  .replace("__TRON__", TRON_WALLET)
  .replace("__GITHUB__", GITHUB_URL)
 )
 return web.Response(text=html, content_type="text/html")
async def start_web_server(bot_instance: Bot):
 app = web.Application()
 app["bot"] = bot_instance
 app.router.add_get("/", handle_page)
 app.router.add_get("/admin", handle_page)
 app.router.add_get("/miniapp", handle_page)
 app.router.add_get("/api/rates", api_rates)
 app.router.add_post("/api/override", api_override)
 app.router.add_post("/api/support", api_support)
 app.router.add_post("/api/broadcast", api_broadcast)
 runner = web.AppRunner(app)
 await runner.setup()
 site = web.TCPSite(runner, "0.0.0.0", 8080)
 await site.start()
 logging.info("Web Panel & Mini App active on http://0.0.0.0:8080")
async def main():
 load_saved_users()
 await refresh_live_prices()
 bot = Bot(token=BOT_TOKEN)
 await start_web_server(bot)
 dp = Dispatcher(storage=MemoryStorage())
 dp.include_router(router)
 while True:
  try:
   await dp.start_polling(
    bot,
    allowed_updates=["message", "callback_query", "channel_post", "edited_channel_post", "my_chat_member"],
   )
  except Exception as e:
   logging.error(f"Polling error: {e}")
   await asyncio.sleep(5)
if __name__ == "__main__":
 asyncio.run(main())
BOT_EOF

echo -e "${BLUE}[3/5] Installing Python virtualenv (aiogram, aiohttp, matplotlib)...${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install aiogram aiohttp matplotlib

echo -e "${BLUE}[4/5] Configuring Nginx Reverse Proxy (Port 80 & 443 -> 8080) & Free HTTPS Tunnel...${NC}"
mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/arz-ip.crt ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/arz-ip.key \
    -out /etc/nginx/ssl/arz-ip.crt \
    -subj "/CN=$TARGET_HOST" >/dev/null 2>&1 || true
fi

cat << NGINX_EOF > /etc/nginx/sites-available/arzpulse
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    ssl_certificate /etc/nginx/ssl/arz-ip.crt;
    ssl_certificate_key /etc/nginx/ssl/arz-ip.key;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX_EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/arzpulse /etc/nginx/sites-enabled/arzpulse
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx >/dev/null 2>&1 || true

if ! command -v cloudflared >/dev/null 2>&1; then
  ARCH=$(uname -m)
  CF_ARCH="amd64"
  if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then CF_ARCH="arm64"; fi
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$CF_ARCH" -o /usr/local/bin/cloudflared || true
  chmod +x /usr/local/bin/cloudflared || true
fi

systemctl stop arzpulse-web.service >/dev/null 2>&1 || true
systemctl disable arzpulse-web.service >/dev/null 2>&1 || true

cat << 'EOF' > /etc/systemd/system/arzpulse-tunnel.service
[Unit]
Description=ArzPulse Pro HTTPS Cloudflare Quick Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash -c '/usr/local/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8080 2>&1 | tee /opt/arzpulse/tunnel.log'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat << 'EOF' > /etc/systemd/system/arzpulse-bot.service
[Unit]
Description=ArzPulse Pro Telegram Bot & Web Panel Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/arzpulse
EnvironmentFile=/opt/arzpulse/.env
ExecStart=/opt/arzpulse/venv/bin/python3 /opt/arzpulse/bot.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

rm -f /opt/arzpulse/tunnel.log
systemctl daemon-reload
systemctl enable arzpulse-bot.service arzpulse-tunnel.service >/dev/null 2>&1 || true
systemctl restart arzpulse-tunnel.service

echo -e "${YELLOW}⏳ Generating instant HTTPS SSL link for Telegram Mini App...${NC}"
TUNNEL_URL=""
for i in {1..14}; do
  if [ -f /opt/arzpulse/tunnel.log ]; then
    TUNNEL_URL=$(grep -oE 'https://[-a-zA-Z0-9]+\.trycloudflare\.com' /opt/arzpulse/tunnel.log | head -n 1 || true)
    if [ -n "$TUNNEL_URL" ]; then
      echo "$TUNNEL_URL" > /opt/arzpulse/tunnel_url.txt
      sed -i "s|^WEB_PANEL_URL=.*|WEB_PANEL_URL="$TUNNEL_URL"|" "$INSTALL_DIR/.env"
      break
    fi
  fi
  sleep 0.5
done

systemctl restart arzpulse-bot.service

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
  TUNNEL_NOW=$(cat /opt/arzpulse/tunnel_url.txt 2>/dev/null || echo "http://$IP_NOW")
  IP_NOW=$(grep -E '^SERVER_IP=' /opt/arzpulse/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || hostname -I | awk '{print $1}')
  echo -e "${CYAN}================================================================${NC}"
  echo -e "${GREEN}         👑 ArzPulse Pro Server Manager (sudo arz)              ${NC}"
  echo -e "${CYAN}================================================================${NC}"
  echo -e "  🌐 Direct Mini App:  ${GREEN}http://$IP_NOW/miniapp${NC}  (and :8080)"
  echo -e "  👑 Direct Web Panel: ${GREEN}http://$IP_NOW/admin${NC}    (and :8080)"
  echo -e "  🔒 HTTPS Mini App:   ${YELLOW}$TUNNEL_NOW/miniapp${NC}"
  echo -e "${CYAN}----------------------------------------------------------------${NC}"
  echo -e "  ${YELLOW}1)${NC} 📊 Show Bot, Web Panel & HTTPS Tunnel Status"
  echo -e "  ${YELLOW}2)${NC} 🔄 Update Bot & Dependencies"
  echo -e "  ${YELLOW}3)${NC} ♻️  Restart Bot, Web Panel & HTTPS Tunnel"
  echo -e "  ${YELLOW}4)${NC} 🛑 Stop Bot & Web Panel"
  echo -e "  ${YELLOW}5)${NC} 🔒 Issue Custom SSL Certificate (Domain / Subdomain / IP)"
  echo -e "  ${YELLOW}6)${NC} 🔑 Change Bot Token / Owner ID / Show Admin Credentials"
  echo -e "  ${YELLOW}7)${NC} 🗑️  Uninstall ArzPulse Pro Completely"
  echo -e "  ${YELLOW}0)${NC} 🚪 Exit"
  echo -e "${CYAN}================================================================${NC}"
  read -rp "Enter choice [0-7]: " choice </dev/tty
}

issue_ssl() {
  echo -e "\n${BLUE}[SSL Wizard] Enter your Domain, Subdomain, or Server IP Address:${NC}"
  read -rp "Target (e.g. bot.example.com or 203.0.113.10): " TARGET_HOST </dev/tty
  TARGET_HOST=$(echo "$TARGET_HOST" | sed -E 's|^https?://||; s|/.*$||; s|:[0-9]+$||' | tr -d '[:space:]')
  if [[ "$TARGET_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/arz-ip.key \
      -out /etc/nginx/ssl/arz-ip.crt \
      -subj "/CN=$TARGET_HOST"
    systemctl restart nginx arzpulse-bot
    echo -e "${GREEN}✅ IP HTTP/HTTPS configured at http://$TARGET_HOST/admin and https://$TARGET_HOST/admin${NC}"
  else
    read -rp "Enter email for Let's Encrypt SSL notifications: " SSL_EMAIL </dev/tty
    cat << NGINX_EOF > /etc/nginx/sites-available/arzpulse
server {
    listen 80;
    server_name $TARGET_HOST;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_EOF
    ln -sf /etc/nginx/sites-available/arzpulse /etc/nginx/sites-enabled/arzpulse
    systemctl reload nginx
    certbot --nginx -d "$TARGET_HOST" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect
    echo "https://$TARGET_HOST" > /opt/arzpulse/tunnel_url.txt
    sed -i "s|^WEB_PANEL_URL=.*|WEB_PANEL_URL="https://$TARGET_HOST"|" "$INSTALL_DIR/.env"
    systemctl restart arzpulse-bot
    echo -e "${GREEN}✅ Let's Encrypt SSL activated at https://$TARGET_HOST/admin${NC}"
  fi
}

change_credentials() {
  echo -e "\n${CYAN}Current Configuration (/opt/arzpulse/.env):${NC}"
  cat "$INSTALL_DIR/.env"
  echo ""
  read -rp "Enter NEW Bot Token (or press Enter to keep current): " NEW_TOKEN </dev/tty
  read -rp "Enter NEW Owner ID (or press Enter to keep current): " NEW_OWNER </dev/tty
  if [ -n "$NEW_TOKEN" ]; then
    sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN="$NEW_TOKEN"|" "$INSTALL_DIR/.env"
  fi
  if [ -n "$NEW_OWNER" ]; then
    sed -i "s|^OWNER_ID=.*|OWNER_ID="$NEW_OWNER"|" "$INSTALL_DIR/.env"
  fi
  systemctl restart arzpulse-bot
  echo -e "${GREEN}✅ Configuration updated and bot restarted!${NC}"
}

while true; do
  show_menu
  case "$choice" in
    1) systemctl status arzpulse-bot arzpulse-tunnel --no-pager || true ; read -rp "Press Enter..." </dev/tty ;;
    2) "$INSTALL_DIR/venv/bin/pip" install --upgrade aiogram aiohttp matplotlib && systemctl restart arzpulse-bot ; echo -e "${GREEN}✅ Updated successfully!${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    3) rm -f /opt/arzpulse/tunnel.log ; systemctl restart arzpulse-tunnel ; sleep 3 ; grep -oE 'https://[-a-zA-Z0-9]+\.trycloudflare\.com' /opt/arzpulse/tunnel.log | head -n 1 > /opt/arzpulse/tunnel_url.txt || true ; systemctl restart arzpulse-bot ; echo -e "${GREEN}✅ Services restarted!${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    4) systemctl stop arzpulse-bot arzpulse-tunnel ; echo -e "${YELLOW}🛑 Services stopped.${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    5) issue_ssl ; read -rp "Press Enter..." </dev/tty ;;
    6) change_credentials ; read -rp "Press Enter..." </dev/tty ;;
    7) systemctl stop arzpulse-bot arzpulse-tunnel || true ; systemctl disable arzpulse-bot arzpulse-tunnel || true ; rm -rf "$INSTALL_DIR" "$CLI_PATH" /etc/systemd/system/arzpulse-bot.service /etc/systemd/system/arzpulse-tunnel.service ; echo -e "${RED}🗑️ Uninstalled completely.${NC}" ; exit 0 ;;
    0) exit 0 ;;
    *) echo -e "${RED}Invalid option!${NC}" ; sleep 1 ;;
  esac
done
EOF

chmod +x "$CLI_PATH"
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ ArzPulse Pro Bot, Mini App & Web Panel Installed & Started!  ${NC}"
echo -e "${CYAN}👉 Send /start to your bot in Telegram right now!               ${NC}"
if [ -n "$TUNNEL_URL" ]; then
  echo -e "${YELLOW}🔒 Telegram Mini App (HTTPS): $TUNNEL_URL/miniapp              ${NC}"
  echo -e "${YELLOW}👑 Owner Web Admin (HTTPS):   $TUNNEL_URL/admin                ${NC}"
fi
echo -e "${CYAN}🌐 Direct Web Panel (Port 80):   http://$SERVER_IP/admin       ${NC}"
echo -e "${CYAN}🌐 Direct Mini App (Port 80):    http://$SERVER_IP/miniapp     ${NC}"
echo -e "${CYAN}🌐 Direct Port 8080:             http://$SERVER_IP:8080/admin  ${NC}"
echo -e "${CYAN}🔑 Admin Username: owner_admin | Password: ArzPanel@2026#Pro        ${NC}"
echo -e "${CYAN}🛠 Run 'sudo arz' anytime to manage SSL, restart, or update.    ${NC}"
echo -e "${GREEN}================================================================${NC}"
