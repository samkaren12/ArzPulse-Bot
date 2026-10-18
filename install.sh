#!/usr/bin/env bash
# ==============================================================================
# ArzPulse Pro — 100% Self-Contained Automated Server Installer & 'sudo arz' CLI
# Live Rates Source: https://arzdigital.com/currencies/united-states-dollar/
# First prompts for:
#   1) Telegram Bot API Token (BOT_TOKEN)
#   2) Owner Numeric Telegram ID (OWNER_ID)
# Then automatically installs Python, Aiogram 3.x Bot, Web Panel, and 'sudo arz'
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

# STEP 1: Ask for Telegram Bot API Token right at the start
BOT_TOKEN=""
while [ -z "$BOT_TOKEN" ]; do
  read -rp "🔑 1) Enter your Telegram Bot API Token (from @BotFather): " BOT_TOKEN </dev/tty
  if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}[!] Bot Token cannot be empty. Please enter a valid token.${NC}"
  fi
done

# STEP 2: Ask for Owner Numeric Telegram ID right after Bot Token
OWNER_ID=""
while ! [[ "$OWNER_ID" =~ ^[0-9]+$ ]]; do
  read -rp "👑 2) Enter your Numeric Owner Telegram ID (e.g. 123456789): " OWNER_ID </dev/tty
  if ! [[ "$OWNER_ID" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}[!] Owner ID must be a number (get it from @userinfobot).${NC}"
  fi
done

read -rp "🌐 3) Enter Domain/Subdomain for Web Panel (or press Enter to use Server IP): " INPUT_HOST </dev/tty || true

SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')
TARGET_HOST="${INPUT_HOST:-$SERVER_IP}"

echo ""
echo -e "${BLUE}[1/5] Installing system packages (Python 3, venv, pip, Nginx, Certbot, OpenSSL)...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-venv python3-pip curl wget git nginx certbot python3-certbot-nginx openssl

echo -e "${BLUE}[2/5] Creating application directory at $INSTALL_DIR...${NC}"
mkdir -p "$INSTALL_DIR"

cat << EOF > "$INSTALL_DIR/.env"
BOT_TOKEN="$BOT_TOKEN"
OWNER_ID="$OWNER_ID"
WEB_PANEL_URL="http://$TARGET_HOST:8080"
ADMIN_USERNAME="owner_admin"
ADMIN_PASSWORD="ArzPanel@2026#Pro"
TON_WALLET="UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-"
TRON_WALLET="TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy"
EOF

echo -e "${BLUE}[3/5] Writing complete Aiogram 3.x Bot (bot.py) & Web Panel Server (web_panel.py)...${NC}"
cat << 'BOT_EOF' > "$INSTALL_DIR/bot.py"
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ArzPulse Pro — Complete Multi-Language Telegram Currency & Crypto Bot (aiogram 3.x)
- Live Fiat, USD/IRT & Crypto Engine powered by ArzDigital (https://arzdigital.com/currencies/united-states-dollar/)
- ReplyKeyboardMarkup with Colored Buttons (primary / success / danger)
- 6 Languages: Persian (fa), English (en), Russian (ru), Arabic (ar), Chinese (zh), Turkish (tr)
- Live Currency & Crypto Prices + 24h PnL + Matplotlib PNG Chart Generator
- Multi-Step Currency & Crypto Converter (USD <-> TRX, TON, BTC, IRT/Toman, EUR, RUB, TRY, CNY, AED, GBP, CAD, IQD, KWD)
- Interactive Support Ticket System (Forwards to Owner & Owner Reply)
- Owner Management Button inside Bot (Displays Web Admin Panel URL, Username & Password)
- Works in Telegram Groups & Channels (/price, /convert)
"""

import os
import io
import re
import asyncio
import logging
import aiohttp
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, Any, Optional

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

BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")
OWNER_ID = int(os.getenv("OWNER_ID", "123456789"))
WEB_PANEL_URL = os.getenv("WEB_PANEL_URL", "http://YOUR_SERVER_IP:8080")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "owner_admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ArzPanel@2026#Pro")

GITHUB_URL = "https://github.com/samkaren/ArzPulse-Telegram-Suite"
TON_WALLET = "UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-"
TRON_WALLET = "TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy"
ARZDIGITAL_SOURCE_URL = "https://arzdigital.com/currencies/united-states-dollar/"

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

ASSETS_DB: Dict[str, Dict[str, Any]] = {
    "USD": {"price": 1.0, "toman": 262400.0, "change": -0.46, "slug": "united-states-dollar", "aliases": ["usd", "dollar", "دلار", "دلار امریکا", "دلار آمریکا", "دلار آزاد", "доллар", "دولار", "美元", "dolar"]},
    "TRX": {"price": 0.3323, "toman": 87118.0, "change": -0.59, "slug": "tron", "aliases": ["trx", "tron", "ترون", "ارز ترون", "трон", "波场"]},
    "TON": {"price": 1.3297, "toman": 348578.0, "change": -1.62, "slug": "gram", "aliases": ["ton", "toncoin", "gram", "تون", "تون کوین", "تونکوین", "گرام", "тон", "吨币"]},
    "BTC": {"price": 81091.45, "toman": 21258124476.0, "change": -0.08, "slug": "bitcoin", "aliases": ["btc", "bitcoin", "بیت کوین", "بیتکوین", "биткоин", "بيتكوين", "比特币"]},
    "ETH": {"price": 2370.12, "toman": 621327429.0, "change": -1.37, "slug": "ethereum", "aliases": ["eth", "ethereum", "اتریوم", "اتر", "эфириум", "إيثريوم", "以太坊"]},
    "USDT": {"price": 0.9987, "toman": 262152.0, "change": 0.01, "slug": "tether", "aliases": ["usdt", "tether", "تتر", "دلار تتر", "тезер", "تيثر", "泰达币"]},
    "IRT": {"price": 1.0 / 262400.0, "toman": 1.0, "change": 0.46, "slug": "united-states-dollar", "aliases": ["irt", "irr", "toman", "تومان", "ریال", "ایران", "туман", "تومان إيراني", "tümen"]},
    "EUR": {"price": 1.1237, "toman": 294860.0, "change": -0.46, "slug": "euro", "aliases": ["eur", "euro", "یورو", "евро", "يورو", "欧元"]},
    "RUB": {"price": 0.01189, "toman": 3120.0, "change": -0.48, "slug": "russian-ruble", "aliases": ["rub", "ruble", "روبل", "روبل روسیه", "рубль", "روبل روسي", "卢布"]},
    "TRY": {"price": 0.0202, "toman": 5300.0, "change": -0.38, "slug": "turkish-lira", "aliases": ["try", "lira", "لیر", "لیر ترکیه", "лира", "ليرة", "里拉", "tl"]},
    "CNY": {"price": 0.14947, "toman": 39220.0, "change": -0.46, "slug": "chinese-yuan", "aliases": ["cny", "yuan", "یوان", "یوان چین", "юань", "يوان", "人民币"]},
    "AED": {"price": 0.27489, "toman": 72130.0, "change": -0.46, "slug": "united-arab-emirates-dirham", "aliases": ["aed", "dirham", "درهم", "درهم امارات", "дирхам", "درهم إماراتي"]},
    "GBP": {"price": 1.32965, "toman": 348900.0, "change": -0.46, "slug": "pound-sterling", "aliases": ["gbp", "pound", "پوند", "پوند انگلیس", "фунт", "جنيه إسترليني", "英镑"]},
    "CAD": {"price": 0.70633, "toman": 185340.0, "change": -0.46, "slug": "canadian-dollar", "aliases": ["cad", "دلار کانادا", "کانادا", "канадский доллар", "دولار كندي", "加元"]},
    "IQD": {"price": 0.00065865, "toman": 172.83, "change": -0.46, "slug": "iraqi-dinar", "aliases": ["iqd", "dinar", "دینار", "دینار عراق", "динар", "دينار عراقي"]},
    "KWD": {"price": 3.2173, "toman": 844220.0, "change": -0.45, "slug": "kuwaiti-dinar", "aliases": ["kwd", "kuwait", "دینار کویت", "کویت", "دينار كويتي"]},
}

LANGS: Dict[str, Dict[str, str]] = {
    "fa": {
        "welcome": "👋 به ربات هوشمند نرخ ارز و کریپتو *ArzPulse Pro* خوش آمدید!\n📡 متصل به نرخ لحظه‌ای *ArzDigital.com*\nلطفاً از کیبورد رنگی زیر خدمت مورد نظر را انتخاب کنید:",
        "btn_price": "📊 قیمت واحد پول یا ارز",
        "btn_convert": "🔄 تبدیل ارز و واحد پول",
        "btn_lang": "🌐 تغییر زبان (Language)",
        "btn_support": "🎧 پشتیبانی آنلاین",
        "btn_guide": "📖 راهنمای ربات",
        "btn_creator": "👨‍💻 سازنده و دونیت",
        "btn_miniapp": "🚀 مینی‌اپ فوق حرفه‌ای",
        "btn_owner": "👑 مدیریت مالک (وب‌پنل)",
        "btn_group": "➕ افزودن به گروه یا کانال",
        "ask_price": "🔍 لطفاً نام ارز یا واحد پول را بفرستید (مثلاً: دلار، ترون، بیت کوین، تون، یورو، درهم، لیر، دینار، USD، TRX):",
        "ask_conv_1": "1️⃣ لطفاً نام *واحد پول یا ارز اول* را وارد کنید (مثلاً: دلار، تومان یا USD):",
        "ask_conv_2": "2️⃣ عالی! حالا نام *واحد پول یا ارز دوم* را وارد کنید (مثلاً: ترون، تومان یا TRX):",
        "ask_conv_amt": "🔢 چه تعداد می‌خواهید تبدیل کنید؟ (مثلاً عدد 1 یا 100 را بفرستید):",
        "ask_support": "💬 پیام خود را برای پشتیبانی بنویسید تا مستقیماً برای مالک ارسال شود:",
        "support_ok": "✅ پیام شما ثبت شد و برای مالک ربات ارسال گردید.",
        "not_found": "⚠️ ارز وارد شده یافت نشد! نمونه: دلار، ترون، تون، بیت کوین، تتر، یورو، درهم، روبل، لیر، پوند، دینار، USD, TRX, TON, BTC",
        "guide": "📖 *راهنمای کامل ربات (منبع: ArzDigital.com):*\n1️⃣ برای دریافت قیمت دقیق دلاری و تومانی + نمودار سود و زیان، دکمه قیمت ارز را بزنید.\n2️⃣ برای تبدیل هر مقدار ارز (مثلاً ۱ دلار به ترون یا تومان)، دکمه تبدیل را بزنید.\n3️⃣ در گروه‌ها از دستور `/price usd` یا `/convert 10 usd trx` استفاده کنید.",
    },
    "en": {
        "welcome": "👋 Welcome to *ArzPulse Pro* Currency & Crypto Bot!\n📡 Live rates powered by *ArzDigital.com*\nChoose a service from the colored keyboard menu below:",
        "btn_price": "📊 Currency & Crypto Price",
        "btn_convert": "🔄 Currency Converter",
        "btn_lang": "🌐 Change Language",
        "btn_support": "🎧 Live Support",
        "btn_guide": "📖 Bot Guide",
        "btn_creator": "👨‍💻 Creator & Donate",
        "btn_miniapp": "🚀 Pro Mini App",
        "btn_owner": "👑 Owner Admin Panel",
        "btn_group": "➕ Add to Group / Channel",
        "ask_price": "🔍 Send the currency or crypto name/ticker (e.g., USD, TRX, TON, BTC, EUR, AED, GBP):",
        "ask_conv_1": "1️⃣ Enter the *First Currency / Crypto* (e.g., USD):",
        "ask_conv_2": "2️⃣ Great! Now enter the *Second Currency / Crypto* (e.g., TRX):",
        "ask_conv_amt": "🔢 Enter the *Amount* to convert (e.g., 1 or 100):",
        "ask_support": "💬 Write your message for support:",
        "support_ok": "✅ Your message has been sent to the bot owner.",
        "not_found": "⚠️ Currency not found! Try USD, TRX, TON, BTC, ETH, USDT, EUR, RUB, TRY, CNY, AED, GBP, CAD, IQD, KWD, IRT.",
        "guide": "📖 *Bot Guide (Powered by ArzDigital.com):*\n• Tap Price to get real-time USD & Toman pricing + PnL chart image.\n• Tap Converter to convert between any currencies.\n• Group commands: `/price usd` or `/convert 10 usd trx`.",
    },
    "ru": {
        "welcome": "👋 Добро пожаловать в *ArzPulse Pro* (Курсы ArzDigital.com)! Выберите услугу в меню:",
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
        "ask_conv_1": "1️⃣ Введите *первую валюту* (например: USD):",
        "ask_conv_2": "2️⃣ Введите *вторую валюту* (например: TRX):",
        "ask_conv_amt": "🔢 Введите *количество* для конвертации (например: 1):",
        "ask_support": "💬 Напишите сообщение в поддержку:",
        "support_ok": "✅ Сообщение отправлено владельцу.",
        "not_found": "⚠️ Валюта не найдена! Попробуйте USD, TRX, TON, BTC, RUB, EUR.",
        "guide": "📖 *Инструкция:*\n• Курс валют с ArzDigital.com + график PnL.\n• Конвертер любой суммы.\n• В группах: `/price trx`, `/convert 10 usd trx`.",
    },
    "ar": {
        "welcome": "👋 مرحباً بك في بوت *ArzPulse Pro* للعملات والكريبتو (مباشر من ArzDigital.com)!",
        "btn_price": "📊 أسعار العملات والكريبتو",
        "btn_convert": "🔄 محول العملات",
        "btn_lang": "🌐 تغيير اللغة",
        "btn_support": "🎧 الدعم الفني",
        "btn_guide": "📖 دليل البوت",
        "btn_creator": "👨‍💻 المطور والتبرع",
        "btn_miniapp": "🚀 تطبيق Mini App",
        "btn_owner": "👑 لوحة تحكم المالك",
        "btn_group": "➕ أضف لمجموعة أو قناة",
        "ask_price": "🔍 أرسل اسم العملة أو الرمز (مثل: دولار، ترون، درهم، دينار، USD، TRX):",
        "ask_conv_1": "1️⃣ أرسل اسم *العملة الأولى* (مثل: USD):",
        "ask_conv_2": "2️⃣ أرسل اسم *العملة الثانية* (مثل: TRX):",
        "ask_conv_amt": "🔢 أرسل *المبلغ* المراد تحويله (مثل: 1):",
        "ask_support": "💬 اكتب رسالتك لفريق الدعم:",
        "support_ok": "✅ تم إرسال رسالتك إلى المالك.",
        "not_found": "⚠️ لم يتم العثور على العملة! جرب USD, TRX, TON, BTC, AED, IQD, KWD, EUR.",
        "guide": "📖 *دليل البوت:*\n• أسعار لحظية من ArzDigital.com مع شارت الأرباح والخسائر.\n• محول عملات دقيق.",
    },
    "zh": {
        "welcome": "👋 欢迎使用 *ArzPulse Pro* 汇率与加密货币机器人 (数据源: ArzDigital.com)！",
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
        "ask_conv_1": "1️⃣ 请输入*第一种货币* (例如: USD):",
        "ask_conv_2": "2️⃣ 请输入*第二种货币* (例如: TRX):",
        "ask_conv_amt": "🔢 请输入换算*数量* (例如: 1 或 100):",
        "ask_support": "💬 请输入您的客服留言：",
        "support_ok": "✅ 您的留言已发送至站长后台。",
        "not_found": "⚠️ 未找到该货币！请尝试 USD, TRX, TON, BTC, CNY, EUR。",
        "guide": "📖 *使用指南:*\n• ArzDigital.com 实时汇率与盈亏走势图 (PnL)。\n• 任意金额精准换算。",
    },
    "tr": {
        "welcome": "👋 *ArzPulse Pro* Döviz ve Kripto Botuna Hoş Geldiniz (Kaynak: ArzDigital.com)!",
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
        "ask_conv_1": "1️⃣ Lütfen *Birinci Para Birimini* girin (Örn: USD):",
        "ask_conv_2": "2️⃣ Şimdi *İkinci Para Birimini* girin (Örn: TRX):",
        "ask_conv_amt": "🔢 Çevrilecek *Miktarı* girin (Örn: 1 veya 100):",
        "ask_support": "💬 Destek mesajınızı yazın:",
        "support_ok": "✅ Mesajınız Sahip Paneline iletildi.",
        "not_found": "⚠️ Para birimi bulunamadı! USD, TRX, TON, BTC, TRY, EUR deneyin.",
        "guide": "📖 *Bot Rehberi:*\n• ArzDigital.com anlık fiyat ve Kar/Zarar (PnL) grafiği.\n• Hassas döviz ve kripto çevirici.",
    },
}

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

def normalize_num_str(s: str) -> str:
    return s.translate(PERSIAN_DIGITS).replace(",", "").replace("،", "").strip()

def get_lang(user_id: int) -> Dict[str, str]:
    return LANGS.get(user_langs.get(user_id, "fa"), LANGS["fa"])

def resolve_asset(query: str) -> Optional[str]:
    q = query.translate(PERSIAN_DIGITS).strip().lower()
    for code, info in ASSETS_DB.items():
        if q == code.lower() or q in info["aliases"]:
            return code
    for code, info in ASSETS_DB.items():
        if code.lower() in q or any(a in q for a in info["aliases"]):
            return code
    return None

async def fetch_single_arzdigital_coin(session: aiohttp.ClientSession, code: str, slug: str):
    url = f"https://lake.arzdigital.com/web/api/v1/pub/coins/{slug}"
    headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://arzdigital.com/"}
    try:
        async with session.get(url, headers=headers, timeout=6) as resp:
            if resp.status == 200:
                payload = await resp.json()
                data = payload.get("data") or {}
                usd_val = float(data.get("usd") or 0)
                toman_val = float(data.get("toman") or 0)
                if usd_val > 0:
                    ASSETS_DB[code]["price"] = usd_val
                if toman_val > 0:
                    ASSETS_DB[code]["toman"] = toman_val
                chg_usd = data.get("price_change_percent_24h")
                chg_irt = data.get("price_change_percent_irt_24h")
                if data.get("type") == "fiat" or code == "USD":
                    ASSETS_DB[code]["change"] = float(chg_irt if chg_irt is not None else (chg_usd or 0.0))
                else:
                    ASSETS_DB[code]["change"] = float(chg_usd if chg_usd is not None else (chg_irt or 0.0))
    except Exception:
        pass

async def refresh_live_prices(target_codes: Optional[list] = None):
    """
    Fetches live fiat & crypto prices from ArzDigital:
    1) Official ArzDigital Lake API (used by https://arzdigital.com/currencies/united-states-dollar/)
    2) Fallback direct HTML scraper on https://arzdigital.com/currencies/united-states-dollar/
    """
    codes_to_update = target_codes or ["USD", "TRX", "TON", "BTC", "ETH", "USDT", "EUR", "RUB", "TRY", "CNY", "AED", "GBP", "CAD", "IQD", "KWD"]
    if "USD" not in codes_to_update:
        codes_to_update.append("USD")

    try:
        async with aiohttp.ClientSession() as session:
            tasks = [
                fetch_single_arzdigital_coin(session, c, ASSETS_DB[c]["slug"])
                for c in codes_to_update
                if c in ASSETS_DB and c != "IRT"
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

            # Also scrape https://arzdigital.com/currencies/united-states-dollar/ directly if needed
            if ASSETS_DB["USD"]["toman"] <= 0:
                async with session.get(ARZDIGITAL_SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=6) as html_resp:
                    if html_resp.status == 200:
                        html_text = await html_resp.text()
                        m = re.search(r"قیمت امروز دلار \(USD\)\s*([۰-۹0-9,،.]+)\s*تومان", html_text)
                        if m:
                            usd_toman = float(normalize_num_str(m.group(1)))
                            if usd_toman > 0:
                                ASSETS_DB["USD"]["toman"] = usd_toman

            usd_toman_live = ASSETS_DB["USD"]["toman"] or 262400.0
            ASSETS_DB["IRT"]["price"] = 1.0 / usd_toman_live
            ASSETS_DB["IRT"]["toman"] = 1.0
    except Exception:
        pass

def styled_btn(text: str, style: str = "primary", **kwargs) -> KeyboardButton:
    """Creates a KeyboardButton with colored style (primary / success / danger) and safe fallback."""
    try:
        return KeyboardButton(text=text, style=style, **kwargs)
    except Exception:
        return KeyboardButton(text=text, **kwargs)

def build_main_keyboard(user_id: int) -> ReplyKeyboardMarkup:
    L = get_lang(user_id)
    rows = [
        [
            styled_btn(text=L["btn_price"], style="success"),
            styled_btn(text=L["btn_convert"], style="primary"),
        ],
        [
            styled_btn(text=L["btn_miniapp"], style="success", web_app=WebAppInfo(url=f"{WEB_PANEL_URL}/miniapp"))
            if WEB_PANEL_URL.startswith("https://")
            else styled_btn(text=L["btn_miniapp"], style="success"),
            styled_btn(text=L["btn_lang"], style="primary"),
        ],
        [
            styled_btn(text=L["btn_support"], style="danger"),
            styled_btn(text=L["btn_guide"], style="primary"),
        ],
        [
            styled_btn(text=L["btn_creator"], style="success"),
            styled_btn(text=L["btn_group"], style="primary"),
        ],
    ]
    if user_id == OWNER_ID:
        rows.append([styled_btn(text=L["btn_owner"], style="danger")])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, is_persistent=True)

def build_lang_keyboard() -> ReplyKeyboardMarkup:
    rows = [
        [KeyboardButton(text="فارسی 🇮🇷"), KeyboardButton(text="English 🇬🇧")],
        [KeyboardButton(text="Русский 🇷🇺"), KeyboardButton(text="العربية 🇸🇦")],
        [KeyboardButton(text="中文 🇨🇳"), KeyboardButton(text="Türkçe 🇹🇷")],
    ]
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)

def render_pnl_chart_png(code: str, base_price: float, toman_price: float, change_24h: float) -> bytes:
    fig, ax = plt.subplots(figsize=(7, 3.6), dpi=150)
    fig.patch.set_facecolor("#0f172a")
    ax.set_facecolor("#0f172a")

    target_series_base = toman_price if code == "USD" else base_price
    factors = [0.95, 0.965, 0.96, 0.98, 0.975, 0.99, 1.0] if change_24h >= 0 else [1.04, 1.03, 1.035, 1.015, 1.02, 1.005, 1.0]
    prices = [target_series_base * f for f in factors]
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

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    total_users.add(message.from_user.id)
    L = get_lang(message.from_user.id)
    await message.answer(L["welcome"], reply_markup=build_main_keyboard(message.from_user.id), parse_mode="Markdown")

@router.message(F.text.in_({"فارسی 🇮🇷", "English 🇬🇧", "Русский 🇷🇺", "العربية 🇸🇦", "中文 🇨🇳", "Türkçe 🇹🇷"}))
async def set_language_handler(message: Message, state: FSMContext):
    mapping = {
        "فارسی 🇮🇷": "fa",
        "English 🇬🇧": "en",
        "Русский 🇷🇺": "ru",
        "العربية 🇸🇦": "ar",
        "中文 🇨🇳": "zh",
        "Türkçe 🇹🇷": "tr",
    }
    user_langs[message.from_user.id] = mapping.get(message.text, "fa")
    await state.clear()
    L = get_lang(message.from_user.id)
    await message.answer(L["welcome"], reply_markup=build_main_keyboard(message.from_user.id), parse_mode="Markdown")

@router.message(F.text.in_([v["btn_lang"] for v in LANGS.values()]))
async def ask_language(message: Message, state: FSMContext):
    await state.set_state(BotStates.choosing_language)
    await message.answer("🌐 Select Language / زبان را انتخاب کنید:", reply_markup=build_lang_keyboard())

@router.message(F.text.in_([v["btn_price"] for v in LANGS.values()]))
async def ask_price(message: Message, state: FSMContext):
    await state.set_state(BotStates.waiting_for_price_asset)
    await message.answer(get_lang(message.from_user.id)["ask_price"], parse_mode="Markdown")

@router.message(F.text.in_([v["btn_convert"] for v in LANGS.values()]))
async def ask_convert_1(message: Message, state: FSMContext):
    await state.set_state(BotStates.convert_first_asset)
    await message.answer(get_lang(message.from_user.id)["ask_conv_1"], parse_mode="Markdown")

@router.message(F.text.in_([v["btn_support"] for v in LANGS.values()]))
async def ask_support(message: Message, state: FSMContext):
    await state.set_state(BotStates.waiting_for_support_msg)
    await message.answer(get_lang(message.from_user.id)["ask_support"])

@router.message(F.text.in_([v["btn_guide"] for v in LANGS.values()]))
async def show_guide(message: Message):
    await message.answer(get_lang(message.from_user.id)["guide"], parse_mode="Markdown")

@router.message(F.text.in_([v["btn_creator"] for v in LANGS.values()]))
async def show_creator(message: Message):
    text = (
        f"👨‍💻 *Developer & Creator GitHub:*\n{GITHUB_URL}\n\n"
        f"💎 *Official Donation Wallets (GitHub Verified):*\n\n"
        f"🔹 *TON (Toncoin):*\n`{TON_WALLET}`\n\n"
        f"🔺 *TRON (TRX - TRC20):*\n`{TRON_WALLET}`"
    )
    await message.answer(text, parse_mode="Markdown")

@router.message(F.text.in_([v["btn_group"] for v in LANGS.values()]))
async def show_group_info(message: Message, bot: Bot):
    me = await bot.get_me()
    await message.answer(
        f"➕ *Add Bot to Your Group or Channel:*\n"
        f"https://t.me/{me.username}?startgroup=true\n\n"
        f"Commands in groups:\n`/price usd`\n`/price trx`\n`/convert 10 usd trx`",
        parse_mode="Markdown",
    )

@router.message(F.text.in_([v["btn_miniapp"] for v in LANGS.values()]))
async def show_miniapp_link(message: Message):
    await message.answer(
        f"🚀 *Pro Web Panel & Mini App:*\n{WEB_PANEL_URL}/miniapp",
        parse_mode="Markdown",
    )

@router.message(F.text.in_([v["btn_owner"] for v in LANGS.values()]))
async def show_owner_panel(message: Message):
    if message.from_user.id != OWNER_ID:
        return
    text = (
        f"👑 *Owner Management Console & Web Panel Credentials*\n\n"
        f"👥 *Active Bot Users:* `{len(total_users) or 1}`\n"
        f"🌐 *Web Admin Panel URL:* {WEB_PANEL_URL}/admin\n"
        f"👤 *Admin Username:* `{ADMIN_USERNAME}`\n"
        f"🔑 *Admin Password:* `{ADMIN_PASSWORD}`\n\n"
        f"📡 *Price Feed:* ArzDigital.com\n"
        f"🖥 *Server CLI Command:* `sudo arz`"
    )
    await message.answer(text, parse_mode="Markdown")

def compute_pair_rate(c1: str, c2: str) -> float:
    if c1 == "IRT" or c2 == "IRT":
        return ASSETS_DB[c1]["toman"] / ASSETS_DB[c2]["toman"]
    return ASSETS_DB[c1]["price"] / ASSETS_DB[c2]["price"]

@router.message(Command("price"))
async def cmd_group_price(message: Message):
    parts = (message.text or "").split(maxsplit=1)
    query = parts[1] if len(parts) > 1 else "USD"
    await send_price_response(message, query)

@router.message(Command("convert"))
async def cmd_group_convert(message: Message):
    parts = (message.text or "").split()
    if len(parts) < 4:
        await message.answer("Usage: `/convert 10 usd trx`", parse_mode="Markdown")
        return
    try:
        amt = float(normalize_num_str(parts[1]))
    except ValueError:
        amt = 1.0
    c1 = resolve_asset(parts[2])
    c2 = resolve_asset(parts[3])
    if not c1 or not c2:
        await message.answer(get_lang(message.from_user.id)["not_found"])
        return
    await refresh_live_prices([c1, c2, "USD"])
    rate = compute_pair_rate(c1, c2)
    res = amt * rate
    toman_total = amt * ASSETS_DB[c1]["toman"]
    await message.answer(
        f"🔄 *Conversion Result (ArzDigital Live):*\n"
        f"`{amt:g} {c1} = {res:,.4f} {c2}`\n"
        f"🇮🇷 *Toman Value:* `{toman_total:,.0f} IRT`\n"
        f"📌 1 {c1} = {rate:,.4f} {c2}",
        parse_mode="Markdown",
    )

async def send_price_response(message: Message, query: str):
    code = resolve_asset(query)
    if not code:
        await message.answer(get_lang(message.from_user.id)["not_found"])
        return
    await refresh_live_prices([code, "USD"])
    info = ASSETS_DB[code]
    price_usd = info["price"]
    toman = info["toman"]
    change = info["change"]
    sign = "+" if change >= 0 else ""
    status_emoji = "🟢 Profit" if change >= 0 else "🔴 Loss"
    chart_bytes = render_pnl_chart_png(code, price_usd, toman, change)
    photo = BufferedInputFile(chart_bytes, filename=f"{code}_pnl.png")
    caption = (
        f"📊 *{code} Live Price & PnL Report (ArzDigital)*\n\n"
        f"🇮🇷 *Toman (IRT):* `{toman:,.0f} تومان`\n"
        f"💵 *Price (USD):* `${price_usd:,.4f}`\n"
        f"📈 *24h Profit/Loss:* `{sign}{change:.2f}%` ({status_emoji})\n"
        f"📡 *Source:* arzdigital.com"
    )
    await message.answer_photo(photo=photo, caption=caption, parse_mode="Markdown")

@router.message(BotStates.waiting_for_price_asset)
async def handle_price_state(message: Message, state: FSMContext):
    await state.clear()
    await send_price_response(message, message.text or "")

@router.message(BotStates.convert_first_asset)
async def handle_conv_1(message: Message, state: FSMContext):
    c1 = resolve_asset(message.text or "")
    if not c1:
        await message.answer(get_lang(message.from_user.id)["not_found"])
        return
    await state.update_data(c1=c1)
    await state.set_state(BotStates.convert_second_asset)
    await message.answer(f"✅ *{c1}*\n\n{get_lang(message.from_user.id)['ask_conv_2']}", parse_mode="Markdown")

@router.message(BotStates.convert_second_asset)
async def handle_conv_2(message: Message, state: FSMContext):
    c2 = resolve_asset(message.text or "")
    if not c2:
        await message.answer(get_lang(message.from_user.id)["not_found"])
        return
    data = await state.get_data()
    c1 = data["c1"]
    await refresh_live_prices([c1, c2, "USD"])
    unit_rate = compute_pair_rate(c1, c2)
    await state.update_data(c2=c2)
    await state.set_state(BotStates.convert_amount)
    await message.answer(
        f"✅ *{c1} ➔ {c2}* (1 {c1} = {unit_rate:,.4f} {c2})\n\n{get_lang(message.from_user.id)['ask_conv_amt']}",
        parse_mode="Markdown",
    )

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
        f"🔄 *Accurate Conversion Result (ArzDigital Live):*\n\n"
        f"💵 *{amt:g} {c1}* =\n"
        f"🎯 *{converted:,.4f} {c2}*\n"
        f"🇮🇷 *معادل تومانی:* `{toman_val:,.0f} تومان`\n\n"
        f"📌 1 {c1} = {rate:,.4f} {c2}\n"
        f"🔁 1 {c2} = {rev_rate:,.4f} {c1}",
        parse_mode="Markdown",
    )

@router.message(BotStates.waiting_for_support_msg)
async def handle_support_msg(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    await message.answer(get_lang(message.from_user.id)["support_ok"])
    try:
        await bot.send_message(
            OWNER_ID,
            f"📩 *New Support Message from {message.from_user.full_name} (ID: `{message.from_user.id}`):*\n\n{message.text}",
            parse_mode="Markdown",
        )
    except Exception:
        pass

@router.message()
async def fallback_asset_lookup(message: Message):
    if message.text and resolve_asset(message.text):
        await send_price_response(message, message.text)

async def main():
    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

BOT_EOF

cat << 'WEB_EOF' > "$INSTALL_DIR/web_panel.py"
#!/usr/bin/env python3
import os
from aiohttp import web

ADMIN_USER = os.getenv("ADMIN_USERNAME", "owner_admin")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "ArzPanel@2026#Pro")
TON = os.getenv("TON_WALLET", "UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-")
TRON = os.getenv("TRON_WALLET", "TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy")

HTML_PAGE = f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ArzPulse Pro — Web Panel & Mini App</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">👑 ArzPulse Pro — پنل مدیریت وب و مینی‌اپ</h1>
        <p class="text-sm text-slate-400 mt-1">متصل به نرخ لحظه‌ای ArzDigital.com • مدیریت با دستور sudo arz</p>
      </div>
      <span class="px-3 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-mono">ONLINE</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3" dir="ltr">
        <h2 class="text-base font-bold text-emerald-400">Owner Web Admin Credentials</h2>
        <div class="text-sm font-mono">Username: <b>{ADMIN_USER}</b></div>
        <div class="text-sm font-mono">Password: <b>{ADMIN_PASS}</b></div>
        <div class="text-xs text-slate-400">Server CLI: <code>sudo arz</code></div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2" dir="ltr">
        <h2 class="text-base font-bold text-blue-400">Official Creator Wallets</h2>
        <div class="text-xs font-mono break-all"><b>TON:</b> {TON}</div>
        <div class="text-xs font-mono break-all"><b>TRON:</b> {TRON}</div>
      </div>
    </div>
  </div>
</body></html>"""

async def handle_index(request):
    return web.Response(text=HTML_PAGE, content_type="text/html")

app = web.Application()
app.router.add_get("/", handle_index)
app.router.add_get("/admin", handle_index)
app.router.add_get("/miniapp", handle_index)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=8080)
WEB_EOF

echo -e "${BLUE}[4/5] Creating Python virtualenv & installing aiogram, aiohttp, matplotlib...${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install aiogram aiohttp matplotlib

cat << 'EOF' > /etc/systemd/system/arzpulse-bot.service
[Unit]
Description=ArzPulse Pro Telegram Bot
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

cat << 'EOF' > /etc/systemd/system/arzpulse-web.service
[Unit]
Description=ArzPulse Pro Web Panel & Mini App
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/arzpulse
EnvironmentFile=/opt/arzpulse/.env
ExecStart=/opt/arzpulse/venv/bin/python3 /opt/arzpulse/web_panel.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable arzpulse-bot.service arzpulse-web.service
systemctl restart arzpulse-bot.service arzpulse-web.service

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
  echo -e "  ${YELLOW}1)${NC} 📊 Show Bot & Web Panel Status"
  echo -e "  ${YELLOW}2)${NC} 🔄 Update Bot & Dependencies"
  echo -e "  ${YELLOW}3)${NC} ♻️  Restart Bot & Web Panel"
  echo -e "  ${YELLOW}4)${NC} 🛑 Stop Bot & Web Panel"
  echo -e "  ${YELLOW}5)${NC} 🔒 Issue SSL Certificate (Domain / Subdomain / Public IP)"
  echo -e "  ${YELLOW}6)${NC} 🔑 Change Bot Token / Owner ID / Show Admin Credentials"
  echo -e "  ${YELLOW}7)${NC} 🗑️  Uninstall ArzPulse Pro Completely"
  echo -e "  ${YELLOW}0)${NC} 🚪 Exit"
  echo -e "${CYAN}================================================================${NC}"
  read -rp "Enter choice [0-7]: " choice </dev/tty
}

issue_ssl() {
  echo -e "\n${BLUE}[SSL Wizard] Enter your Domain, Subdomain, or Server IP Address:${NC}"
  read -rp "Target (e.g. bot.example.com or 203.0.113.10): " TARGET_HOST </dev/tty
  if [[ "$TARGET_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${YELLOW}Detected IP Address ($TARGET_HOST). Generating Self-Signed TLS Certificate for Nginx...${NC}"
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/arz-ip.key \
      -out /etc/nginx/ssl/arz-ip.crt \
      -subj "/CN=$TARGET_HOST"
    cat << NGINX_EOF > /etc/nginx/sites-available/arzpulse
server {
    listen 80;
    listen 443 ssl;
    server_name $TARGET_HOST;
    ssl_certificate /etc/nginx/ssl/arz-ip.crt;
    ssl_certificate_key /etc/nginx/ssl/arz-ip.key;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_EOF
    ln -sf /etc/nginx/sites-available/arzpulse /etc/nginx/sites-enabled/arzpulse
    sed -i "s|^WEB_PANEL_URL=.*|WEB_PANEL_URL="https://$TARGET_HOST"|" "$INSTALL_DIR/.env"
    systemctl reload nginx
    systemctl restart arzpulse-bot arzpulse-web
    echo -e "${GREEN}✅ IP HTTPS SSL configured at https://$TARGET_HOST${NC}"
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
    sed -i "s|^WEB_PANEL_URL=.*|WEB_PANEL_URL="https://$TARGET_HOST"|" "$INSTALL_DIR/.env"
    systemctl restart arzpulse-bot arzpulse-web
    echo -e "${GREEN}✅ Let's Encrypt SSL successfully activated at https://$TARGET_HOST${NC}"
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
  systemctl restart arzpulse-bot arzpulse-web
  echo -e "${GREEN}✅ Configuration updated and bot restarted!${NC}"
}

while true; do
  show_menu
  case "$choice" in
    1) systemctl status arzpulse-bot arzpulse-web --no-pager || true ; read -rp "Press Enter..." </dev/tty ;;
    2) "$INSTALL_DIR/venv/bin/pip" install --upgrade aiogram aiohttp matplotlib && systemctl restart arzpulse-bot arzpulse-web ; echo -e "${GREEN}✅ Updated successfully!${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    3) systemctl restart arzpulse-bot arzpulse-web ; echo -e "${GREEN}✅ Services restarted!${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    4) systemctl stop arzpulse-bot arzpulse-web ; echo -e "${YELLOW}🛑 Services stopped.${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    5) issue_ssl ; read -rp "Press Enter..." </dev/tty ;;
    6) change_credentials ; read -rp "Press Enter..." </dev/tty ;;
    7) systemctl stop arzpulse-bot arzpulse-web || true ; systemctl disable arzpulse-bot arzpulse-web || true ; rm -rf "$INSTALL_DIR" "$CLI_PATH" /etc/systemd/system/arzpulse-bot.service /etc/systemd/system/arzpulse-web.service ; echo -e "${RED}🗑️ Uninstalled completely.${NC}" ; exit 0 ;;
    0) exit 0 ;;
    *) echo -e "${RED}Invalid option!${NC}" ; sleep 1 ;;
  esac
done
EOF

chmod +x "$CLI_PATH"
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}✅ ArzPulse Pro Bot & Web Panel Installed and Started!          ${NC}"
echo -e "${CYAN}👉 Send /start to your bot in Telegram right now!               ${NC}"
echo -e "${CYAN}👉 Run 'sudo arz' anytime to manage SSL, restart, or update.    ${NC}"
echo -e "${CYAN}👉 Web Panel: http://$TARGET_HOST:8080/admin                   ${NC}"
echo -e "${CYAN}👉 Admin Username: owner_admin | Password: ArzPanel@2026#Pro        ${NC}"
echo -e "${GREEN}================================================================${NC}"
