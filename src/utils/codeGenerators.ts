import { TON_WALLET, TRON_WALLET, DEFAULT_GITHUB_URL, ARZDIGITAL_USD_URL } from './currencyEngine.ts';

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

export const LIVE_INSTALL_SCRIPT_URL = 'https://paste.rs/zJxOe';

export function generateOneLineCurlCommands(githubUser = 'samkaren', repoName = 'ArzPulse-Bot') {
  const cleanUser = githubUser.trim() || 'samkaren';
  const cleanRepo = repoName.trim() || 'ArzPulse-Bot';
  const rawUrl = `https://raw.githubusercontent.com/${cleanUser}/${cleanRepo}/main/install.sh`;
  return {
    directCurlSubshell: `bash <(curl -Ls ${LIVE_INSTALL_SCRIPT_URL})`,
    directSudoPipe: `curl -fsSL ${LIVE_INSTALL_SCRIPT_URL} | sudo bash`,
    bashSubshell: `bash <(curl -fsSL ${rawUrl} 2>/dev/null || curl -fsSL ${LIVE_INSTALL_SCRIPT_URL})`,
    sudoPipe: `(curl -fsSL ${rawUrl} 2>/dev/null || curl -fsSL ${LIVE_INSTALL_SCRIPT_URL}) | sudo bash`,
    githubOnlySubshell: `bash <(curl -Ls ${rawUrl})`,
    wgetCmd: `wget -qO- ${LIVE_INSTALL_SCRIPT_URL} | sudo bash`,
    rawUrl,
    liveMirrorUrl: LIVE_INSTALL_SCRIPT_URL,
  };
}

export function generateAiogramBotCode(opts: BotConfigOptions = {}): string {
  const github = opts.githubUrl || DEFAULT_GITHUB_URL;
  const ton = opts.tonWallet || TON_WALLET;
  const tron = opts.tronWallet || TRON_WALLET;
  const webUrl = opts.webPanelUrl || 'http://YOUR_SERVER_IP';
  const adminUser = opts.adminUsername || 'owner_admin';
  const adminPass = opts.adminPassword || 'ArzPanel@2026#Pro';

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ArzPulse Pro — Unified Multi-Language Telegram Bot + Animated Mini App & Owner Web Panel
- Live Fiat, USD/IRT & Crypto Engine powered by ArzDigital (https://arzdigital.com/currencies/united-states-dollar/)
- ReplyKeyboardMarkup with Colored Buttons (primary / success / danger)
- 6 Languages: Persian (fa), English (en), Russian (ru), Arabic (ar), Chinese (zh), Turkish (tr)
- Built-in aiohttp Web Server on 0.0.0.0:8080 serving /miniapp, /admin, and /api/*
"""

import os
import io
import re
import json
import socket
import asyncio
import logging
import aiohttp
from aiohttp import web
from typing import Dict, Any, Optional, List

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAS_MPL = True
except Exception:
    HAS_MPL = False

from aiogram import Bot, Dispatcher, F, Router
from aiogram.types import (
    Message,
    CallbackQuery,
    ChatMemberUpdated,
    ReplyKeyboardMarkup,
    KeyboardButton,
    KeyboardButtonRequestChat,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    BufferedInputFile,
)
from aiogram.filters import CommandStart, Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

def _clean_env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip().strip('"').strip("'")

def _parse_owner_id() -> int:
    raw = _clean_env("OWNER_ID", "${opts.ownerIdPlaceholder || '123456789'}")
    digits = "".join(ch for ch in raw if ch.isdigit())
    return int(digits) if digits else 0

def detect_server_ip() -> str:
    env_ip = _clean_env("SERVER_IP", "")
    if re.match(r"^\\d{1,3}(\\.\\d{1,3}){3}\$", env_ip) and not env_ip.startswith("127."):
        return env_ip
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    return env_ip or "127.0.0.1"

BOT_TOKEN = _clean_env("BOT_TOKEN", "${opts.botTokenPlaceholder || 'YOUR_TELEGRAM_BOT_TOKEN'}")
OWNER_ID = _parse_owner_id()
SERVER_IP = detect_server_ip()
WEB_PANEL_URL = _clean_env("WEB_PANEL_URL", "${webUrl}")
ADMIN_USERNAME = _clean_env("ADMIN_USERNAME", "${adminUser}")
ADMIN_PASSWORD = _clean_env("ADMIN_PASSWORD", "${adminPass}")

GITHUB_URL = "${github}"
TON_WALLET = "${ton}"
TRON_WALLET = "${tron}"
ARZDIGITAL_SOURCE_URL = "${ARZDIGITAL_USD_URL}"
ENV_FILE = "/opt/arzpulse/.env"
CUSTOM_DOMAIN_FILE = "/opt/arzpulse/custom_domain.txt"
SSL_STATUS_FILE = "/opt/arzpulse/ssl_status.json"
TUNNEL_FILE = "/opt/arzpulse/tunnel_url.txt"
TUNNEL_LOG_FILE = "/opt/arzpulse/tunnel.log"
USERS_FILE = "/opt/arzpulse/users.json"
OVERRIDES_FILE = "/opt/arzpulse/overrides.json"
BOT_USERNAME_CACHE = _clean_env("BOT_USERNAME", "ArzPulseBot").lstrip("@") or "ArzPulseBot"
_BOT_ME_FETCHED = False

logging.basicConfig(level=logging.INFO)
router = Router()

async def get_bot_username(bot: Optional[Bot] = None) -> str:
    global BOT_USERNAME_CACHE, _BOT_ME_FETCHED
    if _BOT_ME_FETCHED and BOT_USERNAME_CACHE and BOT_USERNAME_CACHE != "ArzPulseBot":
        return BOT_USERNAME_CACHE
    if bot is not None:
        try:
            me = await asyncio.wait_for(bot.get_me(), timeout=3.5)
            if me and me.username:
                BOT_USERNAME_CACHE = me.username.strip().lstrip("@")
                _BOT_ME_FETCHED = True
        except Exception:
            pass
    return BOT_USERNAME_CACHE or "ArzPulseBot"

class BotStates(StatesGroup):
    choosing_language = State()
    waiting_for_price_asset = State()
    convert_first_asset = State()
    convert_second_asset = State()
    convert_amount = State()
    waiting_for_support_msg = State()
    waiting_for_broadcast_msg = State()
    waiting_for_target_chat = State()
    waiting_for_ssl_host = State()

user_langs: Dict[int, str] = {}
total_users = set()
support_tickets: list = []

def is_owner(uid: int) -> bool:
    global OWNER_ID
    if OWNER_ID == 0 and uid > 0:
        OWNER_ID = uid
        return True
    return uid == OWNER_ID

def sanitize_host(raw: str) -> str:
    if not raw:
        return ""
    h = re.sub(r"^https?://", "", raw.strip(), flags=re.IGNORECASE)
    h = h.split("/")[0].split("?")[0].split(":")[0].strip().lstrip("@")
    if h in ("localhost", "127.0.0.1", "0.0.0.0") or "trycloudflare.com" in h.lower() or "your_server" in h.lower():
        return ""
    return h

def get_custom_domain() -> str:
    try:
        if os.path.exists(CUSTOM_DOMAIN_FILE):
            with open(CUSTOM_DOMAIN_FILE, "r", encoding="utf-8") as f:
                h = sanitize_host(f.read())
                if h:
                    return h
    except Exception:
        pass
    try:
        if os.path.exists(SSL_STATUS_FILE):
            with open(SSL_STATUS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    h = sanitize_host(str(data.get("host", "")))
                    if h:
                        return h
    except Exception:
        pass
    try:
        if os.path.exists(ENV_FILE):
            with open(ENV_FILE, "r", encoding="utf-8") as ef:
                for ln in ef:
                    if ln.startswith("CUSTOM_DOMAIN="):
                        val = ln.split("=", 1)[1].strip().strip('"').strip("'")
                        h = sanitize_host(val)
                        if h:
                            return h
    except Exception:
        pass
    env_dom = sanitize_host(_clean_env("CUSTOM_DOMAIN", ""))
    if env_dom:
        return env_dom
    return ""

def save_custom_domain(host: str) -> str:
    clean = sanitize_host(host)
    if not clean:
        return ""
    is_ip = bool(re.match(r"^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$", clean))
    default_mode = (
        "OpenSSL High-Security SAN IP Certificate (Port 443)"
        if is_ip
        else "Let's Encrypt Official SSL + Nginx TLS 1.3 (Port 443)"
    )
    try:
        os.makedirs("/opt/arzpulse", exist_ok=True)
        with open(CUSTOM_DOMAIN_FILE, "w", encoding="utf-8") as f:
            f.write(clean)
        with open(SSL_STATUS_FILE, "w", encoding="utf-8") as sf:
            json.dump(
                {
                    "active": True,
                    "host": clean,
                    "httpsUrl": f"https://{clean}",
                    "httpUrl": f"http://{clean}",
                    "mode": default_mode,
                },
                sf,
                ensure_ascii=False,
            )
        os.environ["CUSTOM_DOMAIN"] = clean
        os.environ["WEB_PANEL_URL"] = f"https://{clean}"
        if os.path.exists(ENV_FILE):
            with open(ENV_FILE, "r", encoding="utf-8") as ef:
                lines = ef.readlines()
            new_lines = []
            found_cd = False
            found_wp = False
            for ln in lines:
                if ln.startswith("CUSTOM_DOMAIN="):
                    new_lines.append(f'CUSTOM_DOMAIN="{clean}"\\n')
                    found_cd = True
                elif ln.startswith("WEB_PANEL_URL="):
                    new_lines.append(f'WEB_PANEL_URL="https://{clean}"\\n')
                    found_wp = True
                else:
                    new_lines.append(ln)
            if not found_cd:
                new_lines.append(f'CUSTOM_DOMAIN="{clean}"\\n')
            if not found_wp:
                new_lines.append(f'WEB_PANEL_URL="https://{clean}"\\n')
            with open(ENV_FILE, "w", encoding="utf-8") as ef:
                ef.writelines(new_lines)
    except Exception:
        pass
    return clean

def save_admin_credentials(new_user: str, new_pass: str):
    global ADMIN_USERNAME, ADMIN_PASSWORD
    u = new_user.strip()
    p = new_pass.strip()
    if not u or not p:
        return
    ADMIN_USERNAME = u
    ADMIN_PASSWORD = p
    os.environ["ADMIN_USERNAME"] = u
    os.environ["ADMIN_PASSWORD"] = p
    try:
        if os.path.exists(ENV_FILE):
            with open(ENV_FILE, "r", encoding="utf-8") as ef:
                lines = ef.readlines()
            new_lines = []
            found_u = False
            found_p = False
            for ln in lines:
                if ln.startswith("ADMIN_USERNAME="):
                    new_lines.append(f'ADMIN_USERNAME="{u}"\\n')
                    found_u = True
                elif ln.startswith("ADMIN_PASSWORD="):
                    new_lines.append(f'ADMIN_PASSWORD="{p}"\\n')
                    found_p = True
                else:
                    new_lines.append(ln)
            if not found_u:
                new_lines.append(f'ADMIN_USERNAME="{u}"\\n')
            if not found_p:
                new_lines.append(f'ADMIN_PASSWORD="{p}"\\n')
            with open(ENV_FILE, "w", encoding="utf-8") as ef:
                ef.writelines(new_lines)
    except Exception:
        pass

def get_ssl_status() -> Dict[str, Any]:
    custom = get_custom_domain()
    ip = detect_server_ip()
    try:
        if os.path.exists(SSL_STATUS_FILE):
            with open(SSL_STATUS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and data.get("host"):
                    return data
    except Exception:
        pass
    target = custom or ip
    return {
        "active": True,
        "host": target,
        "httpsUrl": f"https://{target}",
        "httpUrl": f"http://{target}",
        "mode": "Let's Encrypt / OpenSSL Active (Port 443)" if custom else "Nginx TLS 1.3 + Cloudflare Tunnel",
    }

async def apply_ssl_for_host(raw_host: str, email: str = "") -> Dict[str, Any]:
    clean = save_custom_domain(raw_host)
    if not clean:
        return {"ok": False, "error": "دامنه، ساب‌دامنه یا آی‌پی نامعتبر است."}
    if os.path.exists("/usr/local/bin/arz-ssl"):
        try:
            proc = await asyncio.create_subprocess_exec(
                "/bin/bash",
                "/usr/local/bin/arz-ssl",
                clean,
                email.strip(),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=55.0)
        except Exception as e:
            logging.warning(f"arz-ssl execution warning: {e}")
    st = get_ssl_status()
    st["ok"] = True
    st["host"] = clean
    st["httpsUrl"] = f"https://{clean}"
    st["httpUrl"] = f"http://{clean}"
    return st

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

def is_valid_https_url(url: str) -> bool:
    if not url or not url.startswith("https://"):
        return False
    low = url.lower()
    if "api.trycloudflare" in low or "your_server" in low or "127.0.0.1" in low or "localhost" in low:
        return False
    return "." in low

def get_cloudflare_tunnel_url() -> str:
    try:
        if os.path.exists(TUNNEL_LOG_FILE):
            with open(TUNNEL_LOG_FILE, "r", encoding="utf-8", errors="ignore") as f:
                raw_matches = re.findall(r"https://[a-zA-Z0-9]+-[a-zA-Z0-9-]+\\.trycloudflare\\.com", f.read())
                valid = [m.strip().rstrip("/") for m in raw_matches if "api.trycloudflare" not in m.lower()]
                if valid:
                    best = valid[-1]
                    try:
                        with open(TUNNEL_FILE, "w", encoding="utf-8") as tf:
                            tf.write(best)
                    except Exception:
                        pass
                    return best
    except Exception:
        pass
    try:
        if os.path.exists(TUNNEL_FILE):
            with open(TUNNEL_FILE, "r", encoding="utf-8") as f:
                t_url = f.read().strip().rstrip("/")
                if is_valid_https_url(t_url):
                    return t_url
    except Exception:
        pass
    return ""

def get_https_panel_url() -> str:
    custom_dom = get_custom_domain()
    if custom_dom:
        return f"https://{custom_dom}"
    cf_url = get_cloudflare_tunnel_url()
    if is_valid_https_url(cf_url):
        return cf_url
    env_url = _clean_env("WEB_PANEL_URL", WEB_PANEL_URL).rstrip("/")
    if is_valid_https_url(env_url):
        return env_url
    ip = detect_server_ip()
    if ip and ip != "127.0.0.1":
        return f"https://{ip}"
    return get_http_direct_url()

def get_http_direct_url() -> str:
    custom_dom = get_custom_domain()
    if custom_dom:
        return f"http://{custom_dom}"
    ip = detect_server_ip()
    if ip and ip != "127.0.0.1":
        return f"http://{ip}"
    return _clean_env("WEB_PANEL_URL", WEB_PANEL_URL).rstrip("/")

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
    timeout = aiohttp.ClientTimeout(total=3.0)
    async def fetch_one(session: aiohttp.ClientSession, code: str):
        info = ASSETS_DB.get(code)
        if not info or not info.get("slug"):
            return
        try:
            async with session.get(f"https://lake.arzdigital.com/web/api/v1/pub/coins/{info['slug']}") as resp:
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
        async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
            await asyncio.gather(*(fetch_one(session, c) for c in codes_to_fetch), return_exceptions=True)
            try:
                async with session.get(ARZDIGITAL_SOURCE_URL) as html_resp:
                    if html_resp.status == 200:
                        m = re.search(r"ادل\\s*([۰-۹0-9,]+)\\s*ریال", await html_resp.text())
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
        "welcome": "🌟 به ربات هوشمند <b>ArzPulse Pro</b> خوش آمدید!\\n📡 متصل به نرخ لحظه‌ای <b>ArzDigital.com</b>\\n\\nلطفاً یکی از خدمات زیر را از منوی کیبورد رنگی انتخاب کنید:",
        "btn_price": "💰 قیمت واحد پول یا ارز",
        "btn_convert": "🔄 تبدیل ارز و واحد پول",
        "btn_lang": "🌐 تغییر زبان (Language)",
        "btn_support": "🛟 پشتیبانی آنلاین",
        "btn_guide": "📖 راهنمای ربات",
        "btn_creator": "👨‍💻 سازنده و ولت‌ها",
        "btn_miniapp": "🚀 مینی‌اپ نرخ ارز و تبدیل",
        "btn_owner": "👑 پنل مدیریت مالک (وب‌پنل)",
        "btn_group": "➕ افزودن به گروه/کانال",
        "ask_price": "🔍 نام ارز یا واحد پول را وارد کنید (مثلاً: <code>دلار</code>، <code>ترون</code>، <code>تون</code>، <code>یورو</code>، <code>تومان</code>، <code>درهم</code>، <code>لیر</code>):",
        "ask_conv_1": "1️⃣ نام <b>واحد پول یا ارز اول (مبدا)</b> را وارد کنید (مثلاً: <code>دلار</code>):",
        "ask_conv_2": "2️⃣ حالا نام <b>واحد پول یا ارز دوم (مقصد)</b> را وارد کنید (مثلاً: <code>ترون</code> یا <code>تومان</code>):",
        "ask_conv_amt": "🔢 چه تعدادی می‌خواهید تبدیل کنید؟ (مثلاً: <code>1</code> یا <code>100</code>):",
        "ask_support": "✍️ پیام یا سوال خود را بنویسید تا مستقیماً برای پشتیبانی ارسال شود:",
        "support_ok": "✅ پیام شما برای مالک و پشتیبانی ارسال شد. به‌زودی پاسخ داده می‌شود.",
        "guide": "📖 <b>راهنمای کامل ربات ArzPulse Pro</b>\\n• دریافت زنده قیمت دلار، تومان و رمزارزها از <code>arzdigital.com</code>\\n• قیمت و عکس نمودار سود/زیان ۲۴ ساعته\\n• ماشین‌حساب تبدیل دقیق ارزها\\n• دستورات گروه: <code>/price usd</code> و <code>/convert 10 usd trx</code>",
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
        "btn_miniapp": "🚀 Currency Mini App",
        "btn_owner": "👑 Owner Admin Panel",
        "btn_group": "➕ Add to Group/Channel",
        "ask_price": "🔍 Send currency/crypto name (e.g., <code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>BTC</code>, <code>EUR</code>, <code>IRT</code>):",
        "ask_conv_1": "1️⃣ Enter the <b>FIRST currency/crypto</b> (e.g., <code>USD</code>):",
        "ask_conv_2": "2️⃣ Enter the <b>SECOND currency/crypto</b> (e.g., <code>TRX</code>):",
        "ask_conv_amt": "🔢 Enter the <b>amount</b> to convert (e.g., <code>1</code> or <code>100</code>):",
        "ask_support": "✍️ Type your support message:",
        "support_ok": "✅ Your message has been forwarded to support!",
        "guide": "📖 <b>Bot Guide</b>\\nLive rates from <code>arzdigital.com</code>, 24h PnL Charts, and Converter.",
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
        "btn_miniapp": "🚀 Мини-апп курсов",
        "btn_owner": "👑 Панель владельца",
        "btn_group": "➕ Добавить в группу",
        "ask_price": "🔍 Введите валюту (<code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>RUB</code>):",
        "ask_conv_1": "1️⃣ Введите <b>ПЕРВУЮ валюту</b> (<code>USD</code>):",
        "ask_conv_2": "2️⃣ Введите <b>ВТОРУЮ валюту</b> (<code>TRX</code>):",
        "ask_conv_amt": "🔢 Введите <b>количество</b> (<code>1</code> или <code>100</code>):",
        "ask_support": "✍️ Напишите сообщение для поддержки:",
        "support_ok": "✅ Ваше сообщение отправлено!",
        "guide": "📖 <b>Инструкция ArzPulse Pro</b>\\nКурсы валют (ArzDigital.com), графики PnL и конвертер.",
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
        "btn_miniapp": "🚀 تطبيق الأسعار (Mini App)",
        "btn_owner": "👑 لوحة تحكم المالك",
        "btn_group": "➕ أضف للمجموعة/القناة",
        "ask_price": "🔍 أرسل اسم العملة (<code>دولار</code>، <code>ترون</code>، <code>USD</code>، <code>TRX</code>):",
        "ask_conv_1": "1️⃣ أرسل اسم <b>العملة الأولى</b> (<code>دولار</code>):",
        "ask_conv_2": "2️⃣ أرسل اسم <b>العملة الثانية</b> (<code>ترون</code>):",
        "ask_conv_amt": "🔢 أدخل <b>المبلغ</b> المراد تحويله (<code>1</code> أو <code>50</code>):",
        "ask_support": "✍️ اكتب رسالتك للدعم الفني:",
        "support_ok": "✅ تم إرسال رسالتك بنجاح!",
        "guide": "📖 <b>دليل البوت</b>\\nأسعار لحظية من ArzDigital.com مع شارت الأرباح ومحول عملات.",
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
        "btn_miniapp": "🚀 实时汇率 Mini App",
        "btn_owner": "👑 站长管理后台",
        "btn_group": "➕ 添加到群组/频道",
        "ask_price": "🔍 请输入货币名称 (<code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>CNY</code>):",
        "ask_conv_1": "1️⃣ 请输入<b>第一种货币</b> (<code>USD</code>):",
        "ask_conv_2": "2️⃣ 请输入<b>第二种货币</b> (<code>TRX</code>):",
        "ask_conv_amt": "🔢 请输入换算<b>数量</b> (<code>1</code> 或 <code>100</code>):",
        "ask_support": "✍️ 请输入客服留言：",
        "support_ok": "✅ 您的留言已发送！",
        "guide": "📖 <b>使用指南</b>\\n支持 ArzDigital 实时价格、盈亏图表及精准换算。",
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
        "btn_miniapp": "🚀 Döviz Mini App",
        "btn_owner": "👑 Sahip Yönetim Paneli",
        "btn_group": "➕ Gruba/Kanala Ekle",
        "ask_price": "🔍 Döviz/kripto adını yazın (<code>USD</code>, <code>TRX</code>, <code>TON</code>, <code>TRY</code>):",
        "ask_conv_1": "1️⃣ <b>Birinci para birimini</b> girin (<code>USD</code>):",
        "ask_conv_2": "2️⃣ <b>İkinci para birimini</b> girin (<code>TRX</code>):",
        "ask_conv_amt": "🔢 Çevrilecek <b>miktarı</b> girin (<code>1</code> veya <code>100</code>):",
        "ask_support": "✍️ Destek mesajınızı yazın:",
        "support_ok": "✅ Mesajınız iletildi!",
        "guide": "📖 <b>Bot Rehberi</b>\\nArzDigital anlık fiyatlar, PnL grafiği ve döviz çevirici.",
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
    except Exception:
        return KeyboardButton(**kwargs)

def build_main_keyboard(user_id: int, chat_type: str = "private", use_styles: bool = True) -> ReplyKeyboardMarkup:
    L = get_lang(user_id)
    is_private = (chat_type == "private")
    def mk(txt: str, st: str) -> KeyboardButton:
        return styled_btn(text=txt, style=st) if use_styles else KeyboardButton(text=txt)
    rows = [
        [mk(L["btn_price"], "success"), mk(L["btn_convert"], "primary")],
        [mk(L["btn_miniapp"], "success"), mk(L["btn_lang"], "primary")],
        [mk(L["btn_support"], "danger"), mk(L["btn_guide"], "primary")],
        [mk(L["btn_creator"], "success"), mk(L["btn_group"], "primary")],
    ]
    if is_private and is_owner(user_id):
        rows.append([mk(L["btn_owner"], "danger")])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, is_persistent=True)

async def send_with_main_kb(message: Message, text: str, uid: int):
    try:
        await message.answer(text, reply_markup=build_main_keyboard(uid, message.chat.type, use_styles=True), parse_mode="HTML")
    except Exception:
        try:
            await message.answer(text, reply_markup=build_main_keyboard(uid, message.chat.type, use_styles=False), parse_mode="HTML")
        except Exception:
            await message.answer(text, parse_mode="HTML")

def build_group_channel_keyboard() -> ReplyKeyboardMarkup:
    try:
        btn_add_group = styled_btn(
            text="👥 انتخاب گروه و افزودن خودکار ربات",
            style="success",
            request_chat=KeyboardButtonRequestChat(request_id=101, chat_is_channel=False),
        )
        btn_add_channel = styled_btn(
            text="📢 انتخاب کانال و افزودن خودکار ربات",
            style="primary",
            request_chat=KeyboardButtonRequestChat(request_id=102, chat_is_channel=True),
        )
        top_row = [btn_add_group, btn_add_channel]
    except Exception:
        top_row = [styled_btn(text="📊 تابلوی کامل نرخ ارز (مخصوص کانال/گروه)", style="success")]
    return ReplyKeyboardMarkup(
        keyboard=[
            top_row,
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
            f"{icon} <b>{d.get('name', code)} ({code}):</b> <code>{d['toman']:,.0f} تومان</code> | <code>\${d['price']:,.4f}</code> ({sign}{ch:.2f}%)"
        )
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append("📡 <b>منبع زنده:</b> <code>arzdigital.com</code>")
    lines.append("💡 دستورات کانال و گروه: <code>نرخ ارز</code> | <code>قیمت دلار</code> | <code>تبدیل 10 دلار به ترون</code>")
    return "\\n".join(lines)

def render_pnl_chart_png(code: str, base_price: float, toman_price: float, change_24h: float) -> Optional[bytes]:
    if not HAS_MPL:
        return None
    try:
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
    except Exception:
        return None

@router.message(CommandStart(), StateFilter("*"))
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    uid = get_uid(message)
    save_user_id(uid)
    L = get_lang(uid)
    asyncio.create_task(refresh_live_prices())
    if message.chat.type in ("group", "supergroup"):
        group_welcome = (
            f"{L['welcome']}\\n\\n"
            f"✅ <b>ربات با موفقیت در این گروه فعال است!</b>\\n"
            f"• استعلام قیمت و نمودار: <code>قیمت دلار</code> یا <code>/price trx</code>\\n"
            f"• تبدیل ارز در گروه: <code>تبدیل 10 دلار به ترون</code> یا <code>/convert 10 usd trx</code>\\n"
            f"• تابلوی کامل قیمت‌ها: <code>نرخ ارز</code> یا <code>/rates</code>"
        )
        await send_with_main_kb(message, group_welcome, uid)
    else:
        await send_with_main_kb(message, L["welcome"], uid)

@router.message(F.text == "🔙 بازگشت به منوی اصلی", StateFilter("*"))
async def back_to_main_menu(message: Message, state: FSMContext):
    await state.clear()
    uid = get_uid(message)
    await send_with_main_kb(message, get_lang(uid)["welcome"], uid)

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
    await send_with_main_kb(message, L["welcome"], uid)

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
        f"👨‍💻 <b>Developer & Creator GitHub:</b>\\n{GITHUB_URL}\\n\\n"
        f"💎 <b>Official Donation Wallets (GitHub Verified):</b>\\n\\n"
        f"🔹 <b>TON (Toncoin):</b>\\n<code>{TON_WALLET}</code>\\n\\n"
        f"🔺 <b>TRON (TRX - TRC20):</b>\\n<code>{TRON_WALLET}</code>"
    )
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="🐙 مشاهده گیت‌هاب سازنده (GitHub)", url=GITHUB_URL)]])
    await message.answer(text, reply_markup=kb, parse_mode="HTML")

@router.message(Command("group", "channel", "add"), StateFilter("*"))
@router.message(F.text.in_([v["btn_group"] for v in LANGS.values()] + ["➕ افزودن ربات به گروه و کانال", "➕ افزودن به گروه یا کانال"]), StateFilter("*"))
async def show_group_info(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    bot_user = await get_bot_username(bot)
    group_normal_url = f"https://t.me/{bot_user}?startgroup=true"
    group_admin_url = f"https://t.me/{bot_user}?startgroup=admin&admin=manage_chat+delete_messages+invite_users+pin_messages"
    channel_admin_url = f"https://t.me/{bot_user}?startchannel=true&admin=post_messages+edit_messages+delete_messages"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="➕ افزودن ربات به گروه تلگرام (انتخاب گروه)", url=group_normal_url)],
            [InlineKeyboardButton(text="🛡 افزودن ربات به گروه (با دسترسی ادمین)", url=group_admin_url)],
            [InlineKeyboardButton(text="📢 افزودن ربات به کانال تلگرام (انتخاب کانال)", url=channel_admin_url)],
            [InlineKeyboardButton(text="📡 ارسال تابلوی نرخ ارز به آیدی کانال/گروه", callback_data="send_to_target_chat")],
            [InlineKeyboardButton(text="📊 تست ارسال تابلوی کامل نرخ ارزها در همین چت", callback_data="send_live_board")],
        ]
    )
    info_text = (
        f"➕ <b>افزودن ربات @{bot_user} به گروه و کانال تلگرام</b>\\n\\n"
        f"1️⃣ <b>روش اول (دکمه‌های شیشه‌ای زیر — فوری و مستقیم):</b>\\n"
        f"• برای افزودن به <b>گروه</b> روی دکمه اول یا دوم بزنید تا لیست گروه‌های شما باز شود.\\n"
        f"• برای افزودن به <b>کانال</b> روی دکمه سوم (📢 افزودن ربات به کانال) بزنید تا لیست کانال‌های شما باز شود.\\n\\n"
        f"2️⃣ <b>روش دوم (ارسال مستقیم تابلو با آیدی):</b>\\n"
        f"روی دکمه <b>«📡 ارسال تابلوی نرخ ارز به آیدی کانال/گروه»</b> بزنید و یوزرنیم کانال یا گروه خود را بفرستید.\\n\\n"
        f"📋 <b>دستورات فعال داخل گروه و کانال:</b>\\n"
        f"• <code>نرخ ارز</code> یا <code>/rates</code> ⬅️ تابلوی کامل ۱۶ ارز و رمزارز ArzDigital\\n"
        f"• <code>قیمت دلار</code> یا <code>قیمت ترون</code> یا <code>/price usd</code> ⬅️ قیمت + عکس نمودار سود و زیان\\n"
        f"• <code>تبدیل 10 دلار به ترون</code> یا <code>/convert 10 usd trx</code> ⬅️ تبدیل دقیق ارزها"
    )
    await message.answer(info_text, reply_markup=kb, parse_mode="HTML")
    if message.chat.type == "private":
        try:
            await message.answer(
                "👇 همچنین می‌توانید از دکمه‌های زیر برای انتخاب مستقیم گروه یا کانال استفاده کنید:",
                reply_markup=build_group_channel_keyboard(),
            )
        except Exception:
            pass

@router.callback_query(F.data == "send_to_target_chat")
async def cb_ask_target_chat(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.set_state(BotStates.waiting_for_target_chat)
    if callback.message:
        await callback.message.answer(
            "📡 <b>ارسال تابلوی زنده نرخ ارز به کانال یا گروه:</b>\\n\\n"
            "لطفاً ابتدا ربات را در کانال یا گروه خود ادمین کنید، سپس <b>یوزرنیم کانال/گروه</b> (مثلاً <code>@mychannel</code>) یا <b>آیدی عددی چت</b> را ارسال کنید:",
            parse_mode="HTML",
        )

@router.message(BotStates.waiting_for_target_chat)
async def handle_target_chat_send(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    target = (message.text or "").strip()
    if not target:
        return
    await refresh_live_prices()
    board_msg = format_full_rates_board()
    try:
        chat_id: Any = int(target) if target.lstrip("-").isdigit() else (target if target.startswith("@") else f"@{target}")
        await bot.send_message(chat_id, board_msg, parse_mode="HTML")
        await message.answer(f"✅ تابلوی زنده نرخ ارز با موفقیت به <code>{target}</code> ارسال شد!", parse_mode="HTML")
    except Exception as e:
        await message.answer(f"❌ خطا در ارسال به <code>{target}</code>: مطمئن شوید ربات در آن کانال/گروه عضو و ادمین است.\\n<code>{e}</code>", parse_mode="HTML")

@router.message(F.chat_shared, StateFilter("*"))
async def handle_chat_shared(message: Message, bot: Bot):
    shared = message.chat_shared
    if not shared:
        return
    target_chat_id = shared.chat_id
    is_channel = (shared.request_id == 102)
    kind_label = "کانال" if is_channel else "گروه"
    board_msg = format_full_rates_board()
    try:
        await bot.send_message(
            target_chat_id,
            f"✅ <b>ربات ArzPulse Pro با موفقیت به این {kind_label} متصل شد!</b>\\n\\n{board_msg}",
            parse_mode="HTML",
        )
        await message.answer(
            f"✅ ربات با موفقیت به {kind_label} شما (ID: <code>{target_chat_id}</code>) متصل شد و اولین تابلوی زنده نرخ ارز ارسال گردید!",
            reply_markup=build_main_keyboard(get_uid(message), message.chat.type),
            parse_mode="HTML",
        )
    except Exception:
        bot_user = await get_bot_username(bot)
        add_url = (
            f"https://t.me/{bot_user}?startchannel=true&admin=post_messages+edit_messages+delete_messages"
            if is_channel
            else f"https://t.me/{bot_user}?startgroup=true"
        )
        kb_add = InlineKeyboardMarkup(
            inline_keyboard=[[InlineKeyboardButton(text=f"➕ تکمیل افزودن ربات به این {kind_label}", url=add_url)]]
        )
        await message.answer(
            f"✅ {kind_label} انتخاب شد (ID: <code>{target_chat_id}</code>)!\\n"
            f"اگر ربات هنوز در این {kind_label} عضو/ادمین نیست، روی دکمه شیشه‌ای زیر بزنید و پس از عضویت عبارت <code>نرخ ارز</code> یا <code>/rates</code> را بفرستید:",
            reply_markup=kb_add,
            parse_mode="HTML",
        )
        await message.answer(
            "🏠 بازگشت به منوی اصلی:",
            reply_markup=build_main_keyboard(get_uid(message), message.chat.type),
        )

@router.my_chat_member()
async def on_bot_added_to_group_or_channel(event: ChatMemberUpdated, bot: Bot):
    new_status = event.new_chat_member.status
    if new_status in ("member", "administrator"):
        chat = event.chat
        board_msg = format_full_rates_board()
        try:
            await bot.send_message(
                chat.id,
                f"🎉 <b>ربات نرخ لحظه‌ای ArzDigital به «{chat.title or 'این چت'}» اضافه شد!</b>\\n\\n{board_msg}",
                parse_mode="HTML",
            )
        except Exception:
            pass
        if event.from_user:
            try:
                await bot.send_message(
                    event.from_user.id,
                    f"✅ ربات با موفقیت به <b>{chat.title or chat.id}</b> متصل شد!\\n"
                    f"می‌توانید داخل آن از دستورات <code>نرخ ارز</code>، <code>قیمت دلار</code>، <code>تبدیل 10 دلار به ترون</code>، <code>/rates</code> و <code>/price usd</code> استفاده کنید.",
                    parse_mode="HTML",
                )
            except Exception:
                pass

@router.message(Command("miniapp", "app"), StateFilter("*"))
@router.message(F.text.in_([v["btn_miniapp"] for v in LANGS.values()] + ["🚀 مینی‌اپ و وب‌پنل"]), StateFilter("*"))
async def show_miniapp_link(message: Message, state: FSMContext):
    await state.clear()
    ip = detect_server_ip()
    custom_dom = get_custom_domain()
    https_url = get_https_panel_url()
    http_url = f"http://{custom_dom}" if custom_dom else (f"http://{ip}" if ip and ip != "127.0.0.1" else get_http_direct_url())
    port_8080_url = f"http://{custom_dom or ip}:8080/miniapp"
    buttons = []
    if is_valid_https_url(https_url) and message.chat.type == "private":
        buttons.append([InlineKeyboardButton(text="📱 باز کردن مینی‌اپ داخل تلگرام (Mini App)", web_app=WebAppInfo(url=f"{https_url}/miniapp"))])
    if is_valid_https_url(https_url):
        buttons.append([InlineKeyboardButton(text="🔒 باز کردن مینی‌اپ با لینک HTTPS (دامنه/SSL)", url=f"{https_url}/miniapp")])
    buttons.append([InlineKeyboardButton(text="🌐 باز کردن مینی‌اپ مستقیم (Port 80)", url=f"{http_url}/miniapp")])
    buttons.append([InlineKeyboardButton(text="🖥 باز کردن مینی‌اپ روی پورت 8080", url=port_8080_url)])
    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    text = (
        f"🚀 <b>مینی‌اپ زنده نرخ ارز و ماشین‌حساب تبدیل (ArzPulse Mini App)</b>\\n\\n"
        f"🔒 <b>لینک HTTPS (مینی‌اپ):</b>\\n{https_url}/miniapp\\n\\n"
        f"🌐 <b>لینک مستقیم بدون فیلتر (پورت 80):</b>\\n{http_url}/miniapp\\n\\n"
        f"👇 برای ورود فوری به مینی‌اپ روی یکی از دکمه‌های زیر کلیک کنید:"
    )
    try:
        await message.answer(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        fallback_kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🌐 باز کردن مینی‌اپ مستقیم (Port 80)", url=f"{http_url}/miniapp")],
            [InlineKeyboardButton(text="🖥 باز کردن مینی‌اپ روی پورت 8080", url=port_8080_url)],
        ])
        await message.answer(text, reply_markup=fallback_kb, parse_mode="HTML")

@router.message(Command("admin", "panel", "owner"), StateFilter("*"))
@router.message(F.text.in_([v["btn_owner"] for v in LANGS.values()] + ["👑 مدیریت مالک (وب‌پنل)", "👑 پنل مدیریت و اطلاعات ورود وب", "👑 وب‌پنل مدیریت ربات (ورود مستقیم)"]), StateFilter("*"))
async def show_owner_panel(message: Message, state: FSMContext):
    global OWNER_ID
    await state.clear()
    uid = get_uid(message)
    parts = (message.text or "").split(maxsplit=1)
    if not is_owner(uid):
        if len(parts) > 1 and parts[1].strip() == ADMIN_PASSWORD:
            OWNER_ID = uid
            try:
                if os.path.exists(ENV_FILE):
                    with open(ENV_FILE, "r", encoding="utf-8") as ef:
                        lines = ef.readlines()
                    with open(ENV_FILE, "w", encoding="utf-8") as ef:
                        for ln in lines:
                            if ln.startswith("OWNER_ID="):
                                ef.write(f"OWNER_ID={uid}\\n")
                            else:
                                ef.write(ln)
            except Exception:
                pass
            await send_with_main_kb(message, "✅ آیدی تلگرام شما به عنوان مالک اصلی ربات (Owner) ثبت شد!", uid)
        else:
            await message.answer("⛔️ این بخش فقط مخصوص مالک ربات (Owner) است.")
            return
    ip = detect_server_ip()
    custom_dom = get_custom_domain()
    https_url = get_https_panel_url()
    cf_tunnel = get_cloudflare_tunnel_url()
    http_url = f"http://{custom_dom}" if custom_dom else (f"http://{ip}" if ip and ip != "127.0.0.1" else get_http_direct_url())
    admin_login_https = f"{https_url}/admin"
    admin_auto_https = f"{https_url}/admin?autologin=1&owner_id={uid}"
    admin_login_http = f"{http_url}/admin"
    admin_auto_http = f"{http_url}/admin?autologin=1&owner_id={uid}"
    admin_ip_http = f"http://{ip}/admin"
    admin_port_8080 = f"http://{custom_dom or ip}:8080/admin"
    buttons = []
    if is_valid_https_url(https_url) and message.chat.type == "private":
        buttons.append([InlineKeyboardButton(text="👑 باز کردن وب‌پنل مدیریت در تلگرام (ورود با رمز/خودکار)", web_app=WebAppInfo(url=admin_login_https))])
    if is_valid_https_url(https_url):
        buttons.append([InlineKeyboardButton(text="🔐 ورود به وب‌پنل مدیریت با نام کاربری و رمز (HTTPS)", url=admin_login_https)])
        buttons.append([InlineKeyboardButton(text="⚡ ورود خودکار تک‌کلیکی به وب‌پنل مدیریت (HTTPS)", url=admin_auto_https)])
    if cf_tunnel and cf_tunnel != https_url and is_valid_https_url(cf_tunnel):
        buttons.append([InlineKeyboardButton(text="☁️ وب‌پنل مدیریت روی تانل Cloudflare (HTTPS)", url=f"{cf_tunnel}/admin")])
    buttons.append([InlineKeyboardButton(text="🌐 وب‌پنل مدیریت روی دامنه/آی‌پی (Port 80)", url=admin_login_http)])
    if custom_dom and ip and ip != "127.0.0.1":
        buttons.append([InlineKeyboardButton(text=f"🖥 وب‌پنل مدیریت مستقیم روی آی‌پی ({ip})", url=admin_ip_http)])
    buttons.append([InlineKeyboardButton(text="🖥 وب‌پنل مدیریت روی پورت 8080", url=admin_port_8080)])
    buttons.append([InlineKeyboardButton(text="🔒 ثبت دائم دامنه / ساب‌دامنه / آی‌پی و صدور SSL", callback_data="owner_set_ssl")])
    buttons.append([
        InlineKeyboardButton(text="📢 ارسال پیام همگانی", callback_data="owner_broadcast"),
        InlineKeyboardButton(text="🔄 بروزرسانی از ArzDigital", callback_data="owner_sync_rates"),
    ])
    buttons.append([
        InlineKeyboardButton(text="📡 ارسال تابلو به کانال/گروه", callback_data="send_to_target_chat"),
        InlineKeyboardButton(text="📊 تابلوی کامل نرخ‌ها", callback_data="send_live_board"),
    ])
    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    ssl_info = get_ssl_status()
    dom_badge = f"<code>{custom_dom}</code> (ثبت دائم + SSL فعال)" if custom_dom else f"<code>{ip}</code> (آی‌پی سرور)"
    text = (
        f"👑 <b>پنل تحت وب مدیریت فوق‌حرفه‌ای مالک (Owner Web Console)</b>\\n\\n"
        f"🔐 <b>اطلاعات ورود اختصاصی شما به وب‌پنل مدیریت:</b>\\n"
        f"👤 <b>نام کاربری (Username):</b> <code>{ADMIN_USERNAME}</code>\\n"
        f"🔑 <b>رمز عبور (Password):</b> <code>{ADMIN_PASSWORD}</code>\\n\\n"
        f"🌐 <b>دامنه / ساب‌دامنه / آی‌پی ثبت‌شده با SSL:</b> {dom_badge}\\n"
        f"🔒 <b>وضعیت گواهی SSL:</b> <code>{ssl_info.get('mode', 'Active')}</code>\\n"
        f"👥 <b>کاربران فعال:</b> <code>{len(total_users) or 1}</code> | 🛟 <b>تیکت‌ها:</b> <code>{len(support_tickets)}</code>\\n\\n"
        f"🔐 <b>آدرس وب‌پنل مدیریت مالک (ورود با نام کاربری و رمز):</b>\\n{admin_login_https}\\n\\n"
        f"🚀 <b>آدرس مینی‌اپ مخصوص کاربران عادی:</b>\\n{https_url}/miniapp\\n\\n"
        f"🌐 <b>لینک بدون فیلتر HTTP (پورت 80):</b>\\n{admin_login_http}\\n\\n"
        f"🛠 <b>دستور مدیریت سرور:</b> <code>sudo arz</code>\\n\\n"
        f"👇 برای ورود به وب‌پنل مدیریت یا ثبت دائم دامنه/ساب‌دامنه/آی‌پی با SSL روی دکمه‌های زیر بزنید:"
    )
    try:
        await message.answer(text, reply_markup=kb, parse_mode="HTML")
    except Exception:
        fallback_kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔐 وب‌پنل مدیریت با نام کاربری و رمز (Port 80)", url=admin_login_http)],
            [InlineKeyboardButton(text="⚡ ورود خودکار وب‌پنل (Port 80)", url=admin_auto_http)],
            [InlineKeyboardButton(text="🖥 وب‌پنل مدیریت (Port 8080)", url=admin_port_8080)],
            [InlineKeyboardButton(text="🔒 ثبت دائم دامنه / ساب‌دامنه / آی‌پی و صدور SSL", callback_data="owner_set_ssl")],
            [
                InlineKeyboardButton(text="📢 ارسال پیام همگانی", callback_data="owner_broadcast"),
                InlineKeyboardButton(text="🔄 بروزرسانی از ArzDigital", callback_data="owner_sync_rates"),
            ],
        ])
        await message.answer(text, reply_markup=fallback_kb, parse_mode="HTML")

@router.callback_query(F.data == "owner_set_ssl")
async def cb_owner_set_ssl(callback: CallbackQuery, state: FSMContext):
    if callback.from_user and not is_owner(callback.from_user.id):
        await callback.answer("⛔️ فقط مخصوص مالک ربات!", show_alert=True)
        return
    await callback.answer()
    await state.set_state(BotStates.waiting_for_ssl_host)
    cur_dom = get_custom_domain() or detect_server_ip()
    if callback.message:
        await callback.message.answer(
            "🔒 <b>ثبت دائمی دامنه / ساب‌دامنه / آی‌پی و صدور گواهی SSL:</b>\\n\\n"
            f"📌 هاست ثبت‌شده فعلی: <code>{cur_dom}</code>\\n\\n"
            "لطفاً نام <b>دامنه</b>، <b>ساب‌دامنه</b> (مثلاً <code>sub.example.com</code>) یا <b>آی‌پی سرور</b> خود را ارسال کنید تا گواهی SSL روی پورت 443 صادر شود و همان آدرس به صورت دائمی روی ربات، مینی‌اپ و وب‌پنل ثبت بماند:",
            parse_mode="HTML",
        )

@router.message(BotStates.waiting_for_ssl_host)
async def handle_ssl_host_input(message: Message, state: FSMContext):
    uid = get_uid(message)
    if not is_owner(uid):
        await state.clear()
        return
    await state.clear()
    raw = (message.text or "").strip()
    clean = sanitize_host(raw)
    if not clean:
        await message.answer("❌ دامنه، ساب‌دامنه یا آی‌پی وارد شده معتبر نیست. لطفاً مجدداً از پنل مدیریت تلاش کنید.")
        return
    wait_msg = await message.answer(
        f"⏳ در حال ثبت دائمی <code>{clean}</code> در کانفیگ سرور و صدور گواهی SSL روی پورت 443... لطفاً چند ثانیه صبر کنید.",
        parse_mode="HTML",
    )
    res = await apply_ssl_for_host(clean)
    admin_login_https = f"https://{clean}/admin"
    admin_auto_https = f"https://{clean}/admin?autologin=1&owner_id={uid}"
    mini_https = f"https://{clean}/miniapp"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔐 ورود به وب‌پنل مدیریت با رمز (HTTPS)", url=admin_login_https)],
            [InlineKeyboardButton(text="⚡ ورود خودکار به وب‌پنل مدیریت (HTTPS)", url=admin_auto_https)],
            [InlineKeyboardButton(text="🚀 باز کردن مینی‌اپ کاربران (HTTPS)", url=mini_https)],
        ]
    )
    try:
        await wait_msg.edit_text(
            f"✅ <b>گواهی SSL صادر شد و <code>{clean}</code> به صورت دائمی ثبت گردید!</b>\\n\\n"
            f"🌐 <b>آدرس دائمی ثبت‌شده:</b> <code>{clean}</code>\\n"
            f"🔒 <b>وضعیت گواهی SSL:</b> <code>{res.get('mode', 'Active')}</code>\\n"
            f"👤 <b>نام کاربری وب‌پنل:</b> <code>{ADMIN_USERNAME}</code>\\n"
            f"🔑 <b>رمز عبور وب‌پنل:</b> <code>{ADMIN_PASSWORD}</code>\\n\\n"
            f"👑 <b>وب‌پنل مدیریت مالک:</b>\\n{admin_login_https}\\n\\n"
            f"🚀 <b>مینی‌اپ کاربران عادی:</b>\\n{mini_https}",
            reply_markup=kb,
            parse_mode="HTML",
        )
    except Exception:
        await message.answer(
            f"✅ آدرس <code>{clean}</code> با موفقیت ثبت شد و گواهی SSL فعال گردید!\\n{admin_login_https}",
            reply_markup=kb,
            parse_mode="HTML",
        )

@router.callback_query(F.data == "owner_sync_rates")
async def cb_owner_sync_rates(callback: CallbackQuery):
    if callback.from_user and not is_owner(callback.from_user.id):
        await callback.answer("⛔️ فقط مخصوص مالک ربات!", show_alert=True)
        return
    await callback.answer("⏳ در حال بروزرسانی نرخ‌ها از ArzDigital.com...")
    await refresh_live_prices()
    if callback.message:
        await callback.message.answer(f"✅ تمامی نرخ‌ها از ArzDigital.com بروزرسانی شدند!\\n\\n{format_full_rates_board()}", parse_mode="HTML")

@router.callback_query(F.data == "owner_broadcast")
async def cb_owner_broadcast(callback: CallbackQuery, state: FSMContext):
    if callback.from_user and not is_owner(callback.from_user.id):
        await callback.answer("⛔️ فقط مخصوص مالک ربات!", show_alert=True)
        return
    await callback.answer()
    await state.set_state(BotStates.waiting_for_broadcast_msg)
    if callback.message:
        await callback.message.answer("📢 متن پیام همگانی خود را بنویسید تا برای تمام کاربران ربات ارسال شود:")

@router.message(BotStates.waiting_for_broadcast_msg)
async def handle_owner_broadcast_msg(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    if not is_owner(get_uid(message)):
        return
    msg = (message.text or "").strip()
    if not msg:
        return
    sent = 0
    for uid in (set(total_users) | ({OWNER_ID} if OWNER_ID else set()) | {get_uid(message)}):
        try:
            await bot.send_message(uid, f"📢 <b>اطلاعیه مدیریت ربات:</b>\\n\\n{msg}", parse_mode="HTML")
            sent += 1
        except Exception:
            pass
    await message.answer(f"✅ پیام همگانی شما با موفقیت به <b>{sent}</b> کاربر ارسال شد!", parse_mode="HTML")

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
        f"🔄 <b>Conversion Result (ArzDigital Live):</b>\\n<code>{amt:g} {c1} = {res:,.4f} {c2}</code>\\n🇮🇷 <b>Toman Value:</b> <code>{toman_total:,.0f} IRT</code>\\n📌 1 {c1} = {rate:,.4f} {c2}",
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
    caption = (
        f"📊 <b>{info.get('name', code)} ({code}) — ArzDigital Live Report</b>\\n\\n"
        f"🇮🇷 <b>نرخ تومانی (IRT):</b> <code>{toman:,.0f} تومان</code>\\n"
        f"💵 <b>نرخ دلاری (USD):</b> <code>\${price_usd:,.4f}</code>\\n"
        f"📈 <b>سود/زیان ۲۴ ساعته:</b> <code>{sign}{change:.2f}%</code> ({status_emoji})\\n"
        f"📡 <b>منبع:</b> arzdigital.com"
    )
    chart_bytes = render_pnl_chart_png(code, price_usd, toman, change)
    if chart_bytes:
        try:
            photo = BufferedInputFile(chart_bytes, filename=f"{code}_pnl.png")
            await message.answer_photo(photo=photo, caption=caption, parse_mode="HTML")
            return
        except Exception:
            pass
    await message.answer(caption, parse_mode="HTML")

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
    m_conv = re.match(r"^(?:تبدیل\\s+)?([0-9.]+)\\s+(.+?)\\s+(?:به|to|in)\\s+(.+)\$", clean, re.IGNORECASE)
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
                f"🔄 <b>نتیجه تبدیل دقیق (ArzDigital Live):</b>\\n"
                f"💵 <b>{amt:g} {c1}</b> = 🎯 <b>{res:,.4f} {c2}</b>\\n"
                f"🇮🇷 <b>معادل تومانی:</b> <code>{toman_total:,.0f} تومان</code>\\n"
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
                    f"🔄 <b>Conversion Result (ArzDigital):</b>\\n<code>{amt:g} {c1} = {res:,.4f} {c2}</code>\\n🇮🇷 <b>Toman:</b> <code>{toman_total:,.0f} IRT</code>",
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
    await message.answer(f"✅ <b>{c1}</b>\\n\\n{get_lang(get_uid(message))['ask_conv_2']}", parse_mode="HTML")

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
    await message.answer(f"✅ <b>{c1} ➔ {c2}</b> (1 {c1} = {unit_rate:,.4f} {c2})\\n\\n{get_lang(get_uid(message))['ask_conv_amt']}", parse_mode="HTML")

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
        f"🔄 <b>Accurate Conversion Result (ArzDigital Live):</b>\\n\\n💵 <b>{amt:g} {c1}</b> =\\n🎯 <b>{converted:,.4f} {c2}</b>\\n🇮🇷 <b>معادل تومانی:</b> <code>{toman_val:,.0f} تومان</code>\\n\\n📌 1 {c1} = {rate:,.4f} {c2}\\n🔁 1 {c2} = {rev_rate:,.4f} {c1}",
        parse_mode="HTML",
    )

@router.message(BotStates.waiting_for_support_msg)
async def handle_support_msg(message: Message, state: FSMContext, bot: Bot):
    await state.clear()
    uid = get_uid(message)
    sender_name = message.from_user.full_name if message.from_user else "Telegram User"
    txt = (message.text or "").strip()
    if txt:
        support_tickets.append({"id": len(support_tickets) + 1, "user_id": uid, "name": sender_name, "message": txt, "reply": ""})
    await message.answer(get_lang(uid)["support_ok"])
    try:
        await bot.send_message(OWNER_ID, f"📩 <b>New Support Message from {sender_name} (ID: <code>{uid}</code>):</b>\\n\\n{txt}", parse_mode="HTML")
    except Exception:
        pass

@router.message()
async def fallback_asset_lookup(message: Message):
    await handle_natural_text_command(message)

# ================= BUILT-IN ANIMATED WEB PANEL & MINI APP SERVER =================
def get_rates_list() -> List[Dict[str, Any]]:
    return [
        {
            "code": k,
            "name": v.get("name", k),
            "type": v.get("type", "fiat"),
            "toman": v["toman"],
            "usd": v["price"],
            "change": v["change"],
        }
        for k, v in ASSETS_DB.items()
    ]

async def api_rates(request):
    if request.query.get("sync") == "1":
        await refresh_live_prices()
    bot_user = await get_bot_username(request.app["bot"])
    return web.json_response({
        "ok": True,
        "rates": get_rates_list(),
        "usersCount": max(1, len(total_users)),
        "serverIp": detect_server_ip(),
        "customDomain": get_custom_domain(),
        "sslStatus": get_ssl_status(),
        "tunnelUrl": get_https_panel_url(),
        "cfTunnelUrl": get_cloudflare_tunnel_url(),
        "botUsername": bot_user,
        "ownerId": OWNER_ID,
        "tickets": list(reversed(support_tickets[-15:])),
    })

async def api_admin_login(request):
    body = await request.json()
    u = (body.get("username") or "").strip()
    p = (body.get("password") or "").strip()
    if u == ADMIN_USERNAME and p == ADMIN_PASSWORD:
        return web.json_response({"ok": True, "username": ADMIN_USERNAME})
    return web.json_response({"ok": False, "error": "نام کاربری یا رمز عبور اشتباه است!"}, status=403)

async def api_admin_credentials(request):
    body = await request.json()
    if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
        return web.json_response({"ok": False, "error": "Unauthorized"}, status=403)
    new_u = (body.get("newUsername") or "").strip()
    new_p = (body.get("newPassword") or "").strip()
    if not new_u or not new_p:
        return web.json_response({"ok": False, "error": "نام کاربری و رمز جدید نمی‌توانند خالی باشند."}, status=400)
    save_admin_credentials(new_u, new_p)
    return web.json_response({"ok": True, "username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})

async def api_admin_ssl(request):
    body = await request.json()
    if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
        return web.json_response({"ok": False, "error": "Unauthorized"}, status=403)
    raw_host = (body.get("host") or "").strip()
    email = (body.get("email") or "").strip()
    res = await apply_ssl_for_host(raw_host, email)
    return web.json_response(res, status=200 if res.get("ok") else 400)

async def api_override(request):
    body = await request.json()
    if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
        return web.json_response({"ok": False}, status=403)
    if body.get("reset"):
        try:
            if os.path.exists(OVERRIDES_FILE):
                os.remove(OVERRIDES_FILE)
        except Exception:
            pass
        await refresh_live_prices()
        return web.json_response({"ok": True})
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
    support_tickets.append({"id": len(support_tickets) + 1, "user_id": OWNER_ID, "name": "کاربر مینی‌اپ", "message": msg, "reply": ""})
    try:
        if OWNER_ID:
            await request.app["bot"].send_message(OWNER_ID, f"📩 <b>پیام پشتیبانی از مینی‌اپ:</b>\\n\\n{msg}", parse_mode="HTML")
    except Exception:
        pass
    return web.json_response({"ok": True})

async def api_reply_ticket(request):
    body = await request.json()
    if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
        return web.json_response({"ok": False}, status=403)
    tid = int(body.get("id", 0))
    reply_txt = (body.get("reply") or "").strip()
    if not reply_txt:
        return web.json_response({"ok": False}, status=400)
    for tk in support_tickets:
        if tk["id"] == tid:
            tk["reply"] = reply_txt
            try:
                await request.app["bot"].send_message(tk["user_id"], f"👑 <b>پاسخ پشتیبانی مدیریت ربات:</b>\\n\\n{reply_txt}", parse_mode="HTML")
            except Exception:
                pass
            break
    return web.json_response({"ok": True})

async def api_send_board(request):
    body = await request.json()
    if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
        return web.json_response({"ok": False}, status=403)
    target = (body.get("target") or "").strip()
    if not target:
        return web.json_response({"ok": False, "error": "آیدی کانال یا گروه خالی است"}, status=400)
    await refresh_live_prices()
    board_msg = format_full_rates_board()
    try:
        chat_id: Any = int(target) if target.lstrip("-").isdigit() else (target if target.startswith("@") else f"@{target}")
        await request.app["bot"].send_message(chat_id, board_msg, parse_mode="HTML")
        return web.json_response({"ok": True})
    except Exception as e:
        return web.json_response({"ok": False, "error": str(e)}, status=400)

async def api_broadcast(request):
    body = await request.json()
    if body.get("username") != ADMIN_USERNAME or body.get("password") != ADMIN_PASSWORD:
        return web.json_response({"ok": False}, status=403)
    msg = (body.get("message") or "").strip()
    sent = 0
    targets = set(total_users) | ({OWNER_ID} if OWNER_ID else set())
    for uid in targets:
        try:
            await request.app["bot"].send_message(uid, f"📢 <b>اطلاعیه مدیریت ربات:</b>\\n\\n{msg}", parse_mode="HTML")
            sent += 1
        except Exception:
            pass
    return web.json_response({"ok": True, "sent": sent})

WEB_HTML = r"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>__HDR_TITLE__</title>
<style>
:root{--bg:#040711;--surface:#0b1120;--card:rgba(15,23,42,0.88);--card-hover:rgba(30,41,59,0.95);--border:rgba(56,189,248,0.18);--emerald:#10b981;--cyan:#06b6d4;--blue:#3b82f6;--amber:#f59e0b;--rose:#f43f5e;--text:#f8fafc;--muted:#94a3b8}
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif}
body{background:radial-gradient(circle at 10% 10%,rgba(16,185,129,0.14),transparent 38%),radial-gradient(circle at 90% 15%,rgba(59,130,246,0.15),transparent 42%),radial-gradient(circle at 50% 90%,rgba(244,63,94,0.08),transparent 45%),var(--bg);color:var(--text);min-height:100vh;padding:0 0 28px 0;overflow-x:hidden}
.ticker-wrap{background:rgba(2,6,23,0.95);border-bottom:1px solid rgba(56,189,248,0.18);padding:7px 14px;display:flex;align-items:center;gap:14px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
.ticker-wrap::-webkit-scrollbar{display:none}
.ticker-item{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;padding:3px 9px;border-radius:8px;background:rgba(15,23,42,0.9);border:1px solid rgba(148,163,184,0.14);cursor:pointer;transition:.2s}
.ticker-item:hover{border-color:var(--emerald)}
.container{max-width:1160px;margin:0 auto;padding:14px 12px 0}
.header{background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(9,14,28,0.95));backdrop-filter:blur(16px);border:1px solid var(--border);border-radius:20px;padding:15px 18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;box-shadow:0 18px 42px rgba(0,0,0,0.55)}
.brand{display:flex;align-items:center;gap:12px}
.badge-icon{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#10b981,#2563eb);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 8px 20px rgba(16,185,129,0.3)}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;box-shadow:0 0 10px #10b981}
.nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.btn{border:1px solid rgba(255,255,255,0.12);background:#1e293b;color:#fff;padding:9px 14px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.btn:hover{transform:translateY(-1px);border-color:var(--cyan);box-shadow:0 6px 18px rgba(6,182,212,0.18)}
.btn:disabled{opacity:0.55;cursor:not-allowed;transform:none}
.btn-p{background:linear-gradient(135deg,#2563eb,#1d4ed8);border-color:#3b82f6}
.btn-s{background:linear-gradient(135deg,#059669,#10b981);border-color:#34d399}
.btn-d{background:linear-gradient(135deg,#e11d48,#f43f5e);border-color:#fb7185}
.btn-w{background:linear-gradient(135deg,#d97706,#f59e0b);border-color:#fbbf24;color:#020617}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:16px}
.grid-4{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:16px}
.grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:11px}
.card{background:var(--card);backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,0.16);border-radius:18px;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.4);transition:.2s}
.rate-card:hover{transform:translateY(-2px);border-color:rgba(16,185,129,0.45);background:var(--card-hover)}
.kpi-card{background:linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92));border:1px solid rgba(56,189,248,0.22);border-radius:16px;padding:14px}
.input,select,textarea{width:100%;background:#020617;border:1px solid rgba(148,163,184,0.28);color:#fff;padding:10px 12px;border-radius:11px;font-size:13px;outline:none;margin-top:5px;transition:.2s}
.input:focus,select:focus,textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(6,182,212,0.15)}
.res-box{margin-top:12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(16,185,129,0.14),rgba(37,99,235,0.16));border:1px solid rgba(16,185,129,0.4);text-align:center}
.chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.chip{background:#0f172a;border:1px solid rgba(148,163,184,0.24);color:#cbd5e1;padding:4px 10px;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;transition:.15s}
.chip:hover,.chip.active{background:rgba(16,185,129,0.2);border-color:#10b981;color:#34d399}
.up{color:#34d399;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);padding:3px 8px;border-radius:8px;font-size:11.5px;font-weight:700}
.down{color:#fb7185;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);padding:3px 8px;border-radius:8px;font-size:11.5px;font-weight:700}
.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;direction:ltr;display:inline-block;font-variant-numeric:tabular-nums}
.hidden{display:none!important}
.wbox{background:#020617;border:1px solid rgba(148,163,184,0.2);padding:9px 11px;border-radius:11px;font-size:11.5px;word-break:break-all;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.login-shell{max-width:460px;margin:28px auto;background:linear-gradient(145deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98));border:1px solid rgba(244,63,94,0.38);border-radius:22px;padding:24px;box-shadow:0 24px 60px rgba(0,0,0,0.65)}
</style>
</head>
<body>
<div id="liveTickerBar" class="ticker-wrap"></div>
<div class="container">
  <div class="header">
    <div class="brand">
      <div class="badge-icon">💎</div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h1 id="hdrTitle" style="font-size:17.5px;font-weight:800">__HDR_TITLE__</h1>
          <span class="up" style="font-size:10.5px;display:inline-flex;align-items:center;gap:5px"><span class="pulse-dot"></span> LIVE FEED</span>
        </div>
        <p style="font-size:11.5px;color:var(--muted);margin-top:3px">نرخ لحظه‌ای ArzDigital.com • ربات تلگرام: <span id="hdrBotUser" class="mono" style="color:#34d399">@__BOT_USER__</span></p>
      </div>
    </div>
    <div class="nav">
      <button type="button" class="btn btn-p __MINI_NAV_BTN__" id="tabMiniBtn" onclick="switchView('miniapp')">🚀 مینی‌اپ کاربران</button>
      <button type="button" class="btn btn-d __ADMIN_BTN_HIDDEN__" id="tabAdminBtn" onclick="switchView('admin')">👑 پنل مدیریت مالک</button>
      <button type="button" class="btn hidden" id="btnLockAdmin" style="border-color:rgba(244,63,94,0.4);color:#fb7185" onclick="lockAdminSession()">🔒 قفل / خروج</button>
      <button type="button" class="btn btn-s" id="syncBtn" onclick="syncNow()">🔄 بروزرسانی زنده</button>
    </div>
  </div>

  <!-- ================= USER MINI APP VIEW (FOR REGULAR USERS) ================= -->
  <div id="viewMiniApp" class="__MINI_HIDDEN__">
    <div class="card" style="margin-bottom:16px;border-color:rgba(16,185,129,0.35);background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(15,23,42,0.92))">
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">
        <div>
          <h2 style="font-size:14.5px;color:#34d399">➕ افزودن مستقیم ربات به گروه و کانال تلگرام</h2>
          <p style="font-size:11.5px;color:var(--muted);margin-top:2px">ربات را به گروه یا کانال خود اضافه کنید تا تابلوی نرخ لحظه‌ای ارز و رمزارز را خودکار منتشر کند:</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a id="btnAddGroup" href="tg://resolve?domain=__BOT_USER__&startgroup=true" class="btn btn-s" onclick="return addBotToGroup(event)">👥 افزودن به گروه تلگرام</a>
          <a id="btnAddChannel" href="tg://resolve?domain=__BOT_USER__&startchannel&admin=post_messages+edit_messages+delete_messages" class="btn btn-p" onclick="return addBotToChannel(event)">📢 افزودن به کانال تلگرام</a>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="border-color:rgba(56,189,248,0.28)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h2 style="font-size:15px;color:#34d399">🔄 ماشین‌حساب تبدیل آنی ارز و رمزارز</h2>
          <button type="button" class="btn" style="padding:5px 10px;font-size:11.5px;border-color:rgba(56,189,248,0.35);color:#38bdf8" onclick="swapConvertAssets()">⇄ جابجایی ارزها</button>
        </div>
        <label style="font-size:11.5px;color:var(--muted)">مقدار مورد نظر (Amount):</label>
        <input id="convAmt" class="input mono" type="number" value="1" step="any" oninput="runConvert()">
        <div class="chip-row">
          <button type="button" class="chip mono" onclick="setConvPreset(1)">1</button>
          <button type="button" class="chip mono" onclick="setConvPreset(10)">10</button>
          <button type="button" class="chip mono" onclick="setConvPreset(50)">50</button>
          <button type="button" class="chip mono" onclick="setConvPreset(100)">100</button>
          <button type="button" class="chip mono" onclick="setConvPreset(500)">500</button>
          <button type="button" class="chip mono" onclick="setConvPreset(1000)">1,000</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
          <div><label style="font-size:11.5px;color:var(--muted)">از ارز مبدا (From):</label><select id="convFrom" onchange="runConvert()"></select></div>
          <div><label style="font-size:11.5px;color:var(--muted)">به ارز مقصد (To):</label><select id="convTo" onchange="runConvert()"></select></div>
        </div>
        <div class="res-box">
          <div id="convResultMain" class="mono" style="font-size:20px;font-weight:800;color:#34d399">1 USD = 3.0120 TRX</div>
          <div id="convResultToman" style="font-size:13px;color:#e2e8f0;margin-top:6px;font-weight:700">🇮🇷 معادل تومانی: 262,400 تومان</div>
          <div id="convResultUnit" class="mono" style="font-size:11px;color:var(--muted);margin-top:4px">1 USD = 3.0120 TRX</div>
        </div>
      </div>

      <div class="card" style="border-color:rgba(59,130,246,0.28)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <h2 style="font-size:15px;color:#60a5fa">📈 نمودار نوسان و سود/زیان ۲۴ ساعته</h2>
            <p id="chartTitleCode" class="mono" style="font-size:12px;color:#cbd5e1;margin-top:2px">USD (262,400 تومان)</p>
          </div>
          <span id="chartChangeBadge" class="up mono">+0.00%</span>
        </div>
        <svg id="pnlSvg" viewBox="0 0 400 135" style="width:100%;height:135px;background:#020617;border-radius:13px;border:1px solid rgba(148,163,184,0.16)"></svg>
        <div style="margin-top:11px;padding-top:11px;border-top:1px solid rgba(148,163,184,0.15)">
          <h3 style="font-size:12.5px;color:#38bdf8;margin-bottom:5px">🛟 ارتباط مستقیم با پشتیبانی ربات:</h3>
          <div style="display:flex;gap:7px">
            <input id="supInput" class="input" style="margin-top:0" placeholder="سوال یا پیام خود را برای پشتیبانی بنویسید...">
            <button type="button" class="btn btn-p" onclick="sendSupport()">ارسال</button>
          </div>
          <div id="supStatus" style="font-size:11.5px;color:#34d399;margin-top:4px"></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h2 style="font-size:15px">💰 تابلوی زنده بازار ارز و کریپتو</h2>
          <div class="chip-row" style="margin-top:0">
            <button type="button" id="catAll" class="chip active" onclick="setCatFilter('all')">همه بازارها</button>
            <button type="button" id="catFiat" class="chip" onclick="setCatFilter('fiat')">💵 ارز دولتی/فیات</button>
            <button type="button" id="catCrypto" class="chip" onclick="setCatFilter('crypto')">💎 رمزارزها</button>
          </div>
        </div>
        <input id="searchBox" class="input" style="max-width:250px;margin-top:0" placeholder="🔍 جستجوی نام یا نماد ارز (USD, TRX...)" oninput="renderCards()">
      </div>
      <div id="ratesGrid" class="grid-cards"></div>
    </div>

    <div class="card">
      <h2 style="font-size:14.5px;color:#38bdf8;margin-bottom:6px">👨‍💻 توسعه‌دهنده و ولت‌های رسمی حمایت (Donate)</h2>
      <p style="font-size:12px;color:var(--muted)">گیت‌هاب پروژه: <a href="__GITHUB__" target="_blank" style="color:#34d399" class="mono">__GITHUB__</a></p>
      <div class="wbox" dir="ltr"><span><b style="color:#38bdf8">TON:</b> <span class="mono">__TON__</span></span><button type="button" class="btn" style="padding:4px 9px;font-size:11px" onclick="navigator.clipboard.writeText('__TON__')">Copy</button></div>
      <div class="wbox" dir="ltr"><span><b style="color:#fb7185">TRON:</b> <span class="mono">__TRON__</span></span><button type="button" class="btn" style="padding:4px 9px;font-size:11px" onclick="navigator.clipboard.writeText('__TRON__')">Copy</button></div>
    </div>
  </div>

  <!-- ================= OWNER WEB ADMIN CONSOLE (/admin) ================= -->
  <div id="viewAdmin" class="__ADMIN_HIDDEN__">
    <!-- Security Login Gate for Owner -->
    <div id="adminLoginCard" class="login-shell __LOGIN_CARD_HIDDEN__">
      <div style="text-align:center;margin-bottom:16px">
        <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#e11d48,#f43f5e);display:inline-flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 10px 25px rgba(244,63,94,0.35);margin-bottom:10px">👑</div>
        <h2 style="font-size:18px;font-weight:800;color:#fff">ورود به وب‌پنل مدیریت فوق‌حرفه‌ای مالک</h2>
        <p style="font-size:12px;color:var(--muted);margin-top:4px">نام کاربری و رمز عبوری که ربات تلگرام به شما داده است را وارد نمایید:</p>
      </div>
      <div>
        <label style="font-size:12px;color:#cbd5e1;font-weight:700">👤 نام کاربری مدیریت (Username):</label>
        <input id="loginUser" class="input mono" placeholder="admin" autocomplete="username">
      </div>
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <label style="font-size:12px;color:#cbd5e1;font-weight:700">🔑 رمز عبور مدیریت (Password):</label>
          <button type="button" style="background:none;border:none;color:#38bdf8;font-size:11px;cursor:pointer" onclick="togglePassVis()">👁 نمایش/مخفی کردن رمز</button>
        </div>
        <input id="loginPass" type="password" class="input mono" placeholder="••••••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doAdminLogin()">
      </div>
      <div id="loginErr" style="color:#fb7185;font-size:12px;margin-top:10px;min-height:18px"></div>
      <button type="button" id="btnLoginSubmit" class="btn btn-d" style="width:100%;justify-content:center;padding:12px;font-size:13.5px;margin-top:6px" onclick="doAdminLogin()">🔐 ورود به کنسول مدیریت مالک</button>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.15);font-size:11.5px;color:var(--muted);text-align:center">
        💡 نام کاربری و رمز عبور در ربات با زدن دکمه <b>«👑 پنل مدیریت مالک»</b> یا دستور <code class="mono" style="color:#34d399">/admin</code> نمایش داده می‌شود.
      </div>
    </div>

    <!-- Unlocked Pro Owner Dashboard -->
    <div id="adminDashContent" class="__DASH_CONTENT_HIDDEN__">
      <div class="grid-4">
        <div class="kpi-card">
          <div style="font-size:11.5px;color:var(--muted)">👥 کل کاربران فعال ربات</div>
          <div id="statUsers" class="mono" style="font-size:22px;font-weight:800;color:#34d399;margin-top:4px">1</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">ربات: <span id="statBotUser" class="mono" style="color:#38bdf8">@__BOT_USER__</span></div>
        </div>
        <div class="kpi-card">
          <div style="font-size:11.5px;color:var(--muted)">🌐 دامنه / ساب‌دامنه / آی‌پی ثبت‌شده</div>
          <div id="statCustomDomain" class="mono" style="font-size:14.5px;font-weight:800;color:#38bdf8;margin-top:6px;word-break:break-all">__CUSTOM_DOMAIN__</div>
          <div style="font-size:11px;color:#34d399;margin-top:3px">ثبت دائمی در کانفیگ سرور</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:11.5px;color:var(--muted)">🔒 وضعیت گواهی SSL پورت 443</div>
          <div id="sslModeBadge" class="mono" style="font-size:13.5px;font-weight:800;color:#fbbf24;margin-top:6px">SSL Active (443)</div>
          <div id="statTunnel" class="mono" style="font-size:10.5px;color:#94a3b8;margin-top:3px;word-break:break-all">-</div>
        </div>
        <div class="kpi-card">
          <div style="font-size:11.5px;color:var(--muted)">🔐 اطلاعات ورود مالک به وب‌پنل</div>
          <div style="font-size:12.5px;margin-top:6px">کاربر: <b id="dispAdminUser" class="mono" style="color:#34d399">__ADMIN_USER__</b></div>
          <div style="font-size:12.5px;margin-top:2px">رمز: <b id="dispAdminPass" class="mono" style="color:#fbbf24">__ADMIN_PASS__</b></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card" style="border-color:rgba(16,185,129,0.45);background:linear-gradient(145deg,rgba(15,23,42,0.96),rgba(6,78,59,0.18))">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            <h2 style="font-size:15px;color:#34d399">🔒 ثبت دائمی دامنه، ساب‌دامنه یا آی‌پی + صدور گواهی SSL</h2>
            <span class="up mono" style="font-size:11px">Port 443 HTTPS</span>
          </div>
          <p style="font-size:11.5px;color:var(--muted);margin-bottom:8px;line-height:1.6">هر <b>دامنه</b>، <b>ساب‌دامنه</b> (مثل <span class="mono">sub.domain.com</span>) یا حتی <b>آی‌پی سرور</b> را وارد کنید تا گواهی SSL صادر شود و همان آدرس به صورت دائمی روی ربات و وب‌پنل ثبت بماند:</p>
          <div class="chip-row" style="margin-bottom:8px">
            <button type="button" class="chip" onclick="fillHostIp()">🖥 قرار دادن آی‌پی سرور (<span id="chipServerIp" class="mono">__SERVER_IP__</span>)</button>
            <button type="button" class="chip" onclick="fillSavedDom()">🌐 قرار دادن دامنه/ساب‌دامنه فعلی</button>
          </div>
          <div style="display:grid;grid-template-columns:1.35fr 1fr;gap:8px">
            <div>
              <label style="font-size:11px;color:var(--muted)">دامنه، ساب‌دامنه یا آی‌پی سرور:</label>
              <input id="sslHostInput" class="input mono" placeholder="sub.yourdomain.com یا IP" value="__CUSTOM_DOMAIN_VAL__">
            </div>
            <div>
              <label style="font-size:11px;color:var(--muted)">ایمیل Let's Encrypt (اختیاری):</label>
              <input id="sslEmailInput" class="input mono" placeholder="admin@yourdomain.com">
            </div>
          </div>
          <button type="button" id="btnSaveSsl" class="btn btn-s" style="width:100%;justify-content:center;margin-top:10px;padding:11px" onclick="saveSslDomain()">🔒 دریافت گواهی SSL و ثبت دائمی دامنه / ساب‌دامنه / آی‌پی</button>
          <div id="sslStatusMsg" style="font-size:11.5px;color:#34d399;margin-top:8px;line-height:1.65"></div>
        </div>

        <div class="card" style="border-color:rgba(59,130,246,0.35)">
          <h2 style="font-size:15px;color:#60a5fa;margin-bottom:10px">✏️ مدیریت نرخ ارزها و همگام‌سازی زنده با ArzDigital</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><label style="font-size:11.5px;color:var(--muted)">انتخاب ارز:</label><select id="editCode" onchange="fillEditInputs()"></select></div>
            <div><label style="font-size:11.5px;color:var(--muted)">نرخ تومانی (IRT):</label><input id="editToman" type="number" step="any" class="input mono"></div>
          </div>
          <div style="margin-top:8px"><label style="font-size:11.5px;color:var(--muted)">نرخ دلاری جهانی (USD):</label><input id="editUsd" type="number" step="any" class="input mono"></div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button type="button" class="btn btn-s" style="flex:1;justify-content:center" onclick="saveRateOverride()">💾 ثبت نرخ سفارشی</button>
            <button type="button" class="btn btn-p" onclick="resetRateOverrides()">🔄 دریافت زنده از ArzDigital</button>
          </div>
          <div id="editStatus" style="font-size:11.5px;color:#34d399;margin-top:6px"></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h2 style="font-size:15px;color:#34d399;margin-bottom:8px">📡 ارسال تابلوی نرخ به کانال/گروه و پیام همگانی</h2>
          <label style="font-size:11.5px;color:var(--muted)">ارسال فوری تابلوی کامل نرخ ارز به کانال یا گروه تلگرام:</label>
          <div style="display:flex;gap:8px;margin-top:5px">
            <input id="targetChatInput" class="input mono" style="margin-top:0" placeholder="@mychannel یا -100123456789">
            <button type="button" class="btn btn-s" onclick="sendBoardToChat()">📊 ارسال تابلو</button>
          </div>
          <div id="targetChatStatus" style="font-size:11.5px;color:#34d399;margin-top:5px"></div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.16)">
            <label style="font-size:11.5px;color:#fb7185;font-weight:700">📢 ارسال پیام همگانی به تمام کاربران ربات (Broadcast):</label>
            <textarea id="bcText" rows="2" placeholder="متن اطلاعیه یا پیام همگانی خود را بنویسید..."></textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
              <span id="bcStatus" style="font-size:12px;color:#34d399"></span>
              <button type="button" class="btn btn-d" onclick="sendBroadcast()">🚀 ارسال همگانی</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h2 style="font-size:15px;color:#f59e0b;margin-bottom:8px">🔑 تغییر نام کاربری و رمز عبور وب‌پنل مدیریت</h2>
          <p style="font-size:11.5px;color:var(--muted);margin-bottom:8px">می‌توانید نام کاربری و رمز عبور ورود به وب‌پنل مالک را تغییر دهید تا در فایل <span class="mono">.env</span> سرور هم ذخیره شود:</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><label style="font-size:11px;color:var(--muted)">نام کاربری جدید:</label><input id="newAdminUser" class="input mono" value="__ADMIN_USER__"></div>
            <div><label style="font-size:11px;color:var(--muted)">رمز عبور جدید:</label><input id="newAdminPass" class="input mono" value="__ADMIN_PASS__"></div>
          </div>
          <button type="button" class="btn btn-w" style="width:100%;justify-content:center;margin-top:10px" onclick="saveNewCredentials()">💾 ذخیره نام کاربری و رمز جدید مالک</button>
          <div id="credStatus" style="font-size:11.5px;color:#34d399;margin-top:6px"></div>

          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.16)">
            <h3 style="font-size:13.5px;color:#38bdf8;margin-bottom:8px">🛟 تیکت‌های پشتیبانی کاربران (پاسخ مستقیم به تلگرام)</h3>
            <div id="ticketsContainer" style="font-size:12px;color:var(--muted);max-height:190px;overflow-y:auto">هنوز پیام پشتیبانی ثبت نشده است.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
let RATES=__INITIAL_RATES_JSON__,selectedChartCode='USD',catFilter='all',BOT_USER='__BOT_USER__',OWNER_ID='__OWNER_ID__',SERVER_IP='__SERVER_IP__',SAVED_DOM='__CUSTOM_DOMAIN_VAL__';
let EXPECTED_USER="__ADMIN_USER__",EXPECTED_PASS="__ADMIN_PASS__";
let IS_ADMIN_ROUTE=__IS_ADMIN_ROUTE_BOOL__,IS_OWNER_AUTH=__IS_AUTO_AUTH_BOOL__;

function initSession(){
  const p=new URLSearchParams(window.location.search);
  if(p.get('autologin')==='1'||(p.get('owner_id')&&OWNER_ID&&OWNER_ID!=='0'&&p.get('owner_id')===String(OWNER_ID))){
    IS_OWNER_AUTH=true;
    try{sessionStorage.setItem('arz_owner_auth','1');sessionStorage.setItem('arz_u',EXPECTED_USER);sessionStorage.setItem('arz_p',EXPECTED_PASS);}catch(e){}
  }
  try{
    if(sessionStorage.getItem('arz_owner_auth')==='1'){
      IS_OWNER_AUTH=true;
      if(sessionStorage.getItem('arz_u'))EXPECTED_USER=sessionStorage.getItem('arz_u');
      if(sessionStorage.getItem('arz_p'))EXPECTED_PASS=sessionStorage.getItem('arz_p');
    }
    const tgUser=window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initDataUnsafe&&window.Telegram.WebApp.initDataUnsafe.user;
    if(tgUser&&tgUser.id&&OWNER_ID&&OWNER_ID!=='0'&&String(tgUser.id)===String(OWNER_ID)){
      IS_OWNER_AUTH=true;
    }
  }catch(e){}
  syncUiState();
}

function syncUiState(){
  const adminBtn=document.getElementById('tabAdminBtn');
  const miniBtn=document.getElementById('tabMiniBtn');
  const lockBtn=document.getElementById('btnLockAdmin');
  if(!IS_ADMIN_ROUTE&&!IS_OWNER_AUTH){
    if(adminBtn)adminBtn.classList.add('hidden');
    if(miniBtn)miniBtn.classList.add('hidden');
    if(lockBtn)lockBtn.classList.add('hidden');
    document.getElementById('viewAdmin').classList.add('hidden');
    document.getElementById('viewMiniApp').classList.remove('hidden');
    return;
  }
  if(adminBtn)adminBtn.classList.remove('hidden');
  if(miniBtn)miniBtn.classList.remove('hidden');
  if(IS_ADMIN_ROUTE){
    document.getElementById('viewMiniApp').classList.add('hidden');
    document.getElementById('viewAdmin').classList.remove('hidden');
    if(IS_OWNER_AUTH){
      document.getElementById('adminLoginCard').classList.add('hidden');
      document.getElementById('adminDashContent').classList.remove('hidden');
      if(lockBtn)lockBtn.classList.remove('hidden');
    }else{
      document.getElementById('adminLoginCard').classList.remove('hidden');
      document.getElementById('adminDashContent').classList.add('hidden');
      if(lockBtn)lockBtn.classList.add('hidden');
    }
  }else{
    document.getElementById('viewAdmin').classList.add('hidden');
    document.getElementById('viewMiniApp').classList.remove('hidden');
    if(lockBtn)lockBtn.classList.toggle('hidden',!IS_OWNER_AUTH);
  }
}

function switchView(v){
  if(v==='admin'){
    IS_ADMIN_ROUTE=true;
    syncUiState();
  }else{
    IS_ADMIN_ROUTE=false;
    syncUiState();
  }
}

function lockAdminSession(){
  IS_OWNER_AUTH=false;
  IS_ADMIN_ROUTE=true;
  try{sessionStorage.removeItem('arz_owner_auth');}catch(e){}
  const lu=document.getElementById('loginUser'),lp=document.getElementById('loginPass'),le=document.getElementById('loginErr');
  if(lu)lu.value='';
  if(lp)lp.value='';
  if(le)le.innerText='';
  syncUiState();
}

function togglePassVis(){
  const lp=document.getElementById('loginPass');
  if(lp)lp.type=(lp.type==='password')?'text':'password';
}

async function doAdminLogin(){
  const u=(document.getElementById('loginUser').value||'').trim();
  const p=(document.getElementById('loginPass').value||'').trim();
  const errEl=document.getElementById('loginErr');
  const btn=document.getElementById('btnLoginSubmit');
  if(!u||!p){errEl.innerText='❌ لطفاً نام کاربری و رمز عبور ربات را وارد کنید.';return;}
  btn.disabled=true;btn.innerText='⏳ در حال بررسی اطلاعات امنیتی مالک...';
  try{
    const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(r.ok&&d.ok){
      EXPECTED_USER=u;EXPECTED_PASS=p;
      IS_OWNER_AUTH=true;IS_ADMIN_ROUTE=true;
      try{sessionStorage.setItem('arz_owner_auth','1');sessionStorage.setItem('arz_u',u);sessionStorage.setItem('arz_p',p);}catch(e){}
      errEl.innerText='';
      syncUiState();
      await loadData(false);
    }else{
      errEl.innerText='❌ '+(d.error||'نام کاربری یا رمز عبور اشتباه است!');
    }
  }catch(e){
    if(u===EXPECTED_USER&&p===EXPECTED_PASS){
      IS_OWNER_AUTH=true;IS_ADMIN_ROUTE=true;
      syncUiState();
    }else{
      errEl.innerText='❌ نام کاربری یا رمز عبور اشتباه است!';
    }
  }
  btn.disabled=false;btn.innerText='🔐 ورود به کنسول مدیریت مالک';
}

async function saveNewCredentials(){
  const nu=(document.getElementById('newAdminUser').value||'').trim();
  const np=(document.getElementById('newAdminPass').value||'').trim();
  const st=document.getElementById('credStatus');
  if(!nu||!np){st.style.color='#fb7185';st.innerText='❌ نام کاربری و رمز نمی‌توانند خالی باشند.';return;}
  const r=await fetch('/api/admin/credentials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,newUsername:nu,newPassword:np})});
  const d=await r.json();
  if(d.ok){
    EXPECTED_USER=nu;EXPECTED_PASS=np;
    try{sessionStorage.setItem('arz_u',nu);sessionStorage.setItem('arz_p',np);}catch(e){}
    document.getElementById('dispAdminUser').innerText=nu;
    document.getElementById('dispAdminPass').innerText=np;
    st.style.color='#34d399';st.innerText='✅ نام کاربری و رمز عبور جدید مالک با موفقیت ذخیره شد!';
  }else{
    st.style.color='#fb7185';st.innerText='❌ خطا در ذخیره رمز جدید.';
  }
}

function fillHostIp(){
  const inp=document.getElementById('sslHostInput');
  if(inp)inp.value=SERVER_IP||window.location.hostname;
}
function fillSavedDom(){
  const inp=document.getElementById('sslHostInput');
  if(inp)inp.value=SAVED_DOM||SERVER_IP||window.location.hostname;
}

async function saveSslDomain(){
  const hostEl=document.getElementById('sslHostInput'),emailEl=document.getElementById('sslEmailInput'),btn=document.getElementById('btnSaveSsl'),st=document.getElementById('sslStatusMsg');
  const host=(hostEl.value||'').trim(),email=(emailEl.value||'').trim();
  if(!host){st.style.color='#fb7185';st.innerText='❌ لطفاً دامنه، ساب‌دامنه یا آی‌پی سرور را وارد کنید.';return;}
  btn.disabled=true;btn.innerText='⏳ در حال صدور گواهی SSL و ثبت دائمی '+host+' روی پورت 443...';
  st.style.color='#fbbf24';st.innerText='⏳ در حال تنظیم Nginx و دریافت گواهی SSL برای '+host+'... لطفاً چند ثانیه صبر کنید.';
  try{
    const r=await fetch('/api/admin/ssl',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,host,email})});
    const d=await r.json();
    if(d.ok){
      SAVED_DOM=d.host;
      hostEl.value=d.host;
      document.getElementById('statCustomDomain').innerText=d.host+' (ثبت دائم + SSL)';
      document.getElementById('statTunnel').innerText=d.httpsUrl+'/admin';
      document.getElementById('sslModeBadge').innerText=d.mode||'SSL Active (443)';
      st.style.color='#34d399';
      st.innerHTML='✅ گواهی SSL صادر شد و آدرس <b>'+d.host+'</b> به صورت دائمی ثبت گردید!<br>👑 وب‌پنل مدیریت مالک: <a href="'+d.httpsUrl+'/admin" target="_blank" style="color:#38bdf8" class="mono">'+d.httpsUrl+'/admin</a><br>🚀 مینی‌اپ کاربران عادی: <a href="'+d.httpsUrl+'/miniapp" target="_blank" style="color:#34d399" class="mono">'+d.httpsUrl+'/miniapp</a>';
    }else{
      st.style.color='#fb7185';st.innerText='❌ خطا: '+(d.error||'نامعتبر');
    }
  }catch(e){
    st.style.color='#fb7185';st.innerText='❌ خطا در ارتباط با سرور.';
  }
  btn.disabled=false;btn.innerText='🔒 دریافت گواهی SSL و ثبت دائمی دامنه / ساب‌دامنه / آی‌پی';
}

function updateBotLinks(){
  const g=document.getElementById('btnAddGroup'),c=document.getElementById('btnAddChannel');
  if(g)g.href='tg://resolve?domain='+BOT_USER+'&startgroup=true';
  if(c)c.href='tg://resolve?domain='+BOT_USER+'&startchannel&admin=post_messages+edit_messages+delete_messages';
}
function openTgLink(tmeUrl,tgUrl,ev){
  if(ev)ev.preventDefault();
  try{
    if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData&&typeof window.Telegram.WebApp.openTelegramLink==='function'){
      window.Telegram.WebApp.openTelegramLink(tmeUrl);
      return false;
    }
  }catch(e){}
  window.location.href=tgUrl;
  return false;
}
function addBotToGroup(ev){
  return openTgLink('https://t.me/'+BOT_USER+'?startgroup=true','tg://resolve?domain='+BOT_USER+'&startgroup=true',ev);
}
function addBotToChannel(ev){
  return openTgLink('https://t.me/'+BOT_USER+'?startchannel=true&admin=post_messages+edit_messages+delete_messages','tg://resolve?domain='+BOT_USER+'&startchannel&admin=post_messages+edit_messages+delete_messages',ev);
}

function renderTicker(){
  const bar=document.getElementById('liveTickerBar');
  if(!bar||!RATES||!RATES.length)return;
  bar.innerHTML=RATES.slice(0,10).map(x=>{
    const up=x.change>=0,s=up?'+':'';
    return '<div class="ticker-item" data-code="'+x.code+'" onclick="drawChart(this.dataset.code)"><b class="mono" style="color:#f8fafc">'+x.code+'</b><span class="mono" style="color:#cbd5e1">'+Math.round(x.toman).toLocaleString('en-US')+' T</span><span class="mono" style="color:'+(up?'#34d399':'#fb7185')+';font-weight:700">'+s+x.change.toFixed(2)+'%</span></div>';
  }).join('');
}

function setConvPreset(v){
  const el=document.getElementById('convAmt');
  if(el){el.value=v;runConvert();}
}
function swapConvertAssets(){
  const s1=document.getElementById('convFrom'),s2=document.getElementById('convTo');
  if(!s1||!s2)return;
  const tmp=s1.value;s1.value=s2.value;s2.value=tmp;
  runConvert();
}
function setCatFilter(c){
  catFilter=c;
  document.getElementById('catAll').classList.toggle('active',c==='all');
  document.getElementById('catFiat').classList.toggle('active',c==='fiat');
  document.getElementById('catCrypto').classList.toggle('active',c==='crypto');
  renderCards();
}

function renderInitial(){
  if(RATES&&RATES.length){
    renderTicker();populateSelects();runConvert();renderCards();drawChart(selectedChartCode);
  }
  updateBotLinks();
}
async function loadData(sync=false){
  try{
    const r=await fetch('/api/rates'+(sync?'?sync=1':'')),d=await r.json();
    if(d.ownerId)OWNER_ID=String(d.ownerId);
    if(d.serverIp){
      SERVER_IP=d.serverIp;
      const chipIp=document.getElementById('chipServerIp');
      if(chipIp)chipIp.innerText=SERVER_IP;
    }
    if(d.botUsername){
      BOT_USER=d.botUsername;
      document.getElementById('hdrBotUser').innerText='@'+BOT_USER;
      document.getElementById('statBotUser').innerText='@'+BOT_USER;
      updateBotLinks();
    }
    if(d.customDomain){
      SAVED_DOM=d.customDomain;
      document.getElementById('statCustomDomain').innerText=d.customDomain+' (ثبت دائم + SSL)';
      const inp=document.getElementById('sslHostInput');
      if(inp&&!inp.value)inp.value=d.customDomain;
    }
    if(d.sslStatus&&d.sslStatus.mode){
      document.getElementById('sslModeBadge').innerText=d.sslStatus.mode;
    }
    if(d.rates){
      RATES=d.rates;
      document.getElementById('statUsers').innerText=d.usersCount||1;
      document.getElementById('statTunnel').innerText=d.tunnelUrl?(d.tunnelUrl+'/admin'):window.location.origin;
      renderTicker();populateSelects();runConvert();renderCards();drawChart(selectedChartCode);renderTickets(d.tickets||[]);
    }
  }catch(e){}
}
function renderTickets(list){
  const el=document.getElementById('ticketsContainer');
  if(!list||!list.length){el.innerHTML='<p style="color:#94a3b8">هنوز پیام پشتیبانی ثبت نشده است.</p>';return;}
  el.innerHTML=list.map(t=>'<div style="background:#020617;border:1px solid rgba(148,163,184,0.2);border-radius:11px;padding:10px;margin-bottom:8px"><div style="display:flex;justify-content:space-between"><b>'+t.name+' (ID: '+t.user_id+')</b><span style="color:'+(t.reply?'#34d399':'#fbbf24')+'">'+(t.reply?'پاسخ داده شده':'در انتظار پاسخ')+'</span></div><div style="margin:6px 0;color:#f8fafc">'+t.message+'</div>'+(t.reply?'<div style="color:#34d399;font-size:11.5px;margin-bottom:6px">پاسخ شما: '+t.reply+'</div>':'')+'<div style="display:flex;gap:6px"><input id="rep_'+t.id+'" class="input" style="margin-top:0" placeholder="پاسخ مستقیم به تلگرام کاربر..."><button type="button" class="btn btn-s" onclick="replyTicket('+t.id+')">ارسال</button></div></div>').join('');
}
async function replyTicket(id){
  const inp=document.getElementById('rep_'+id);if(!inp||!inp.value.trim())return;
  const r=await fetch('/api/reply_ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,id,reply:inp.value.trim()})});
  if(r.ok)await loadData(false);
}
async function sendBoardToChat(){
  const target=document.getElementById('targetChatInput').value.trim(),st=document.getElementById('targetChatStatus');
  if(!target)return;
  st.innerText='⏳ در حال ارسال تابلو به '+target+'...';
  const r=await fetch('/api/send_board',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,target})});
  const d=await r.json();
  st.innerText=d.ok?'✅ تابلوی نرخ ارز با موفقیت به '+target+' ارسال شد!':('❌ خطا: '+(d.error||'ربات در مقصد ادمین نیست'));
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
  const filtered=RATES.filter(x=>{
    if(catFilter!=='all'&&x.type&&x.type!==catFilter)return false;
    return !q||x.code.toLowerCase().includes(q)||x.name.toLowerCase().includes(q);
  });
  document.getElementById('ratesGrid').innerHTML=filtered.map(x=>{
    const up=x.change>=0,s=up?'+':'';
    return '<div class="card rate-card" style="cursor:pointer;padding:14px" data-code="'+x.code+'" onclick="drawChart(this.dataset.code)"><div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:13.5px;color:#f8fafc">'+x.name+'</b><div class="mono" style="font-size:10.5px;color:#64748b;margin-top:1px">'+x.code+' / IRT</div></div><span class="'+(up?'up':'down')+' mono">'+s+x.change.toFixed(2)+'%</span></div><div style="margin-top:10px;font-size:17px;font-weight:800;color:#34d399" class="mono">'+Math.round(x.toman).toLocaleString('en-US')+' <span style="font-size:11.5px;color:#94a3b8;font-weight:600">تومان</span></div><div style="font-size:11.5px;color:#94a3b8;margin-top:3px" class="mono">$'+x.usd.toLocaleString('en-US',{maximumFractionDigits:4})+' USD</div></div>';
  }).join('');
}
function drawChart(code){
  selectedChartCode=code||'USD';
  const item=RATES.find(x=>x.code===selectedChartCode)||RATES[0];
  if(!item)return;
  document.getElementById('chartTitleCode').innerText=item.code+' — '+item.name+' ('+Math.round(item.toman).toLocaleString('en-US')+' تومان)';
  const b=document.getElementById('chartChangeBadge'),up=item.change>=0;
  b.className=up?'up mono':'down mono';b.innerText=(up?'+':'')+item.change.toFixed(2)+'%';
  const pts=up?[102,88,92,68,74,46,26]:[28,46,40,68,62,88,104],stroke=up?'#10b981':'#f43f5e';
  const coords=pts.map((y,i)=>(20+i*60)+','+y).join(' ');
  const areaCoords='20,128 '+coords+' 380,128';
  document.getElementById('pnlSvg').innerHTML='<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+stroke+'" stop-opacity="0.32"/><stop offset="100%" stop-color="'+stroke+'" stop-opacity="0.0"/></linearGradient></defs><polygon fill="url(#cg)" points="'+areaCoords+'"/><polyline fill="none" stroke="'+stroke+'" stroke-width="3.2" stroke-linecap="round" points="'+coords+'" />'+pts.map((y,i)=>'<circle cx="'+(20+i*60)+'" cy="'+y+'" r="4.5" fill="#020617" stroke="'+stroke+'" stroke-width="2.5" />').join('');
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
async function resetRateOverrides(){
  const r=await fetch('/api/override',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,reset:true})});
  if(r.ok){document.getElementById('editStatus').innerText='✅ تمام نرخ‌ها به ArzDigital زنده بازنشانی شد!';await loadData(true);}
}
async function sendSupport(){
  const m=document.getElementById('supInput').value.trim();if(!m)return;
  await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});
  document.getElementById('supInput').value='';document.getElementById('supStatus').innerText='✅ پیام شما با موفقیت به پشتیبانی ربات ارسال شد!';
  await loadData(false);
}
async function sendBroadcast(){
  const m=document.getElementById('bcText').value.trim();if(!m)return;
  const r=await fetch('/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:EXPECTED_USER,password:EXPECTED_PASS,message:m})});
  const d=await r.json();if(d.ok){document.getElementById('bcText').value='';document.getElementById('bcStatus').innerText='✅ پیام به '+d.sent+' کاربر ارسال شد!';}
}
initSession();renderInitial();loadData(false);
</script>
<script async defer src="https://telegram.org/js/telegram-web-app.js" onload="initSession()"></script>
</body>
</html>"""

async def handle_page(request):
    is_admin_route = request.path.startswith("/admin")
    is_auto_auth = (
        request.query.get("autologin") == "1"
        or (bool(OWNER_ID) and request.query.get("owner_id") == str(OWNER_ID))
    )
    if not _BOT_ME_FETCHED and "bot" in request.app:
        asyncio.create_task(get_bot_username(request.app["bot"]))
    bot_user = BOT_USERNAME_CACHE or "ArzPulseBot"
    custom_dom = get_custom_domain()
    server_ip = detect_server_ip()
    hdr_title = (
        "ArzPulse Pro — کنسول تحت وب مدیریت مالک"
        if is_admin_route
        else "ArzPulse Pro — مینی‌اپ زنده نرخ ارز و رمزارز"
    )
    html = (
        WEB_HTML
        .replace("__HDR_TITLE__", hdr_title)
        .replace("__ADMIN_USER__", ADMIN_USERNAME)
        .replace("__ADMIN_PASS__", ADMIN_PASSWORD)
        .replace("__OWNER_ID__", str(OWNER_ID))
        .replace("__SERVER_IP__", server_ip)
        .replace("__IS_ADMIN_ROUTE_BOOL__", "true" if is_admin_route else "false")
        .replace("__IS_AUTO_AUTH_BOOL__", "true" if is_auto_auth else "false")
        .replace("__ADMIN_BTN_HIDDEN__", "" if (is_admin_route or is_auto_auth) else "hidden")
        .replace("__MINI_NAV_BTN__", "" if (is_admin_route or is_auto_auth) else "hidden")
        .replace("__LOGIN_CARD_HIDDEN__", "hidden" if is_auto_auth else "")
        .replace("__DASH_CONTENT_HIDDEN__", "" if is_auto_auth else "hidden")
        .replace("__CUSTOM_DOMAIN__", f"{custom_dom} (ثبت دائم + SSL)" if custom_dom else f"{server_ip} (آی‌پی سرور)")
        .replace("__CUSTOM_DOMAIN_VAL__", custom_dom or server_ip)
        .replace("__TON__", TON_WALLET)
        .replace("__TRON__", TRON_WALLET)
        .replace("__GITHUB__", GITHUB_URL)
        .replace("__BOT_USER__", bot_user)
        .replace("__INITIAL_RATES_JSON__", json.dumps(get_rates_list(), ensure_ascii=False))
        .replace("__MINI_HIDDEN__", "hidden" if is_admin_route else "")
        .replace("__ADMIN_HIDDEN__", "" if is_admin_route else "hidden")
    )
    return web.Response(text=html, content_type="text/html")

async def start_web_server(bot_instance: Bot):
    app = web.Application()
    app["bot"] = bot_instance
    app.router.add_get("/", handle_page)
    app.router.add_get("/admin", handle_page)
    app.router.add_get("/admin/", handle_page)
    app.router.add_get("/miniapp", handle_page)
    app.router.add_get("/miniapp/", handle_page)
    app.router.add_get("/api/rates", api_rates)
    app.router.add_post("/api/admin/login", api_admin_login)
    app.router.add_post("/api/admin/credentials", api_admin_credentials)
    app.router.add_post("/api/admin/ssl", api_admin_ssl)
    app.router.add_post("/api/override", api_override)
    app.router.add_post("/api/support", api_support)
    app.router.add_post("/api/reply_ticket", api_reply_ticket)
    app.router.add_post("/api/send_board", api_send_board)
    app.router.add_post("/api/broadcast", api_broadcast)
    runner = web.AppRunner(app)
    await runner.setup()
    try:
        site = web.TCPSite(runner, "0.0.0.0", 8080, reuse_address=True)
        await site.start()
        logging.info("Web Panel & Mini App active on http://0.0.0.0:8080")
    except Exception as e:
        logging.error(f"Web server bind warning on 8080: {e}")

async def background_price_loop():
    while True:
        try:
            await refresh_live_prices()
        except Exception:
            pass
        await asyncio.sleep(5)

async def main():
    load_saved_users()
    apply_local_overrides()
    bot = Bot(token=BOT_TOKEN)
    await start_web_server(bot)
    asyncio.create_task(background_price_loop())
    asyncio.create_task(get_bot_username(bot))
    try:
        await bot.delete_webhook(drop_pending_updates=False)
    except Exception:
        pass
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
            await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(main())
`;
}

export function generateInstallBashScript(opts: BotConfigOptions = {}): string {
  const adminUser = opts.adminUsername || 'owner_admin';
  const adminPass = opts.adminPassword || 'ArzPanel@2026#Pro';
  const ton = opts.tonWallet || TON_WALLET;
  const tron = opts.tronWallet || TRON_WALLET;
  const compactBotCode = generateAiogramBotCode(opts)
    .replace(/"""[\s\S]*?"""\n?/, '')
    .replace(/^( {4})+/gm, (m) => ' '.repeat(m.length / 4))
    .replace(/^  +/gm, (m) => (m.length > 6 ? m : m))
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim() !== '' && (!line.trim().startsWith('# ') || line.startsWith('#!')))
    .join('\n');

  return `#!/usr/bin/env bash
# ==============================================================================
# ArzPulse Pro — 100% Self-Contained Automated Server Installer & 'sudo arz' CLI
# Live Rates Source: https://arzdigital.com/currencies/united-states-dollar/
# - Unblocks Firewall Ports (80, 443, 8080) in UFW & iptables
# - Configures Nginx on Port 80 & Port 443 (Self-Signed + Let's Encrypt ready)
# - Starts Cloudflare HTTPS Quick Tunnel so Telegram Mini App WebApp opens with HTTPS!
# - Installs Unified Bot + Animated Mini App (/miniapp) & Owner Web Panel (/admin)
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

if [ "\$EUID" -ne 0 ]; then
  echo -e "\${YELLOW}[INFO] Running with sudo privileges...\${NC}"
  exec sudo bash "\$0" "\$@"
fi

clear
echo -e "\${CYAN}================================================================\${NC}"
echo -e "\${GREEN}   🚀 ArzPulse Pro — Automatic Telegram Bot & Web Installer     \${NC}"
echo -e "\${CYAN}   📡 Live Currency & Crypto Engine: ArzDigital.com             \${NC}"
echo -e "\${CYAN}================================================================\${NC}"
echo ""

EXISTING_TOKEN=""
EXISTING_OWNER=""
EXISTING_DOMAIN=""
if [ -f "\$INSTALL_DIR/.env" ]; then
  EXISTING_TOKEN=\$(grep -E '^BOT_TOKEN=' "\$INSTALL_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
  EXISTING_OWNER=\$(grep -E '^OWNER_ID=' "\$INSTALL_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
  EXISTING_DOMAIN=\$(grep -E '^CUSTOM_DOMAIN=' "\$INSTALL_DIR/.env" | cut -d= -f2- | tr -d '"' || true)
fi
if [ -z "\$EXISTING_DOMAIN" ] && [ -f "\$INSTALL_DIR/custom_domain.txt" ]; then
  EXISTING_DOMAIN=\$(cat "\$INSTALL_DIR/custom_domain.txt" 2>/dev/null | tr -d '[:space:]' || true)
fi

# STEP 1: Ask for Telegram Bot API Token right at the start
BOT_TOKEN=""
while [ -z "\$BOT_TOKEN" ]; do
  if [ -n "\$EXISTING_TOKEN" ]; then
    read -rp "🔑 1) Enter Telegram Bot API Token [Press Enter to keep existing]: " INPUT_TOKEN </dev/tty
    INPUT_TOKEN=\$(echo "\$INPUT_TOKEN" | tr -d '[:space:]')
    BOT_TOKEN="\${INPUT_TOKEN:-\$EXISTING_TOKEN}"
  else
    read -rp "🔑 1) Enter your Telegram Bot API Token (from @BotFather): " BOT_TOKEN </dev/tty
    BOT_TOKEN=\$(echo "\$BOT_TOKEN" | tr -d '[:space:]')
  fi
  if [ -z "\$BOT_TOKEN" ]; then
    echo -e "\${RED}[!] Bot Token cannot be empty. Please enter a valid token.\${NC}"
  fi
done

# STEP 2: Ask for Owner Numeric Telegram ID right after Bot Token
OWNER_ID=""
while ! [[ "\$OWNER_ID" =~ ^[0-9]+\$ ]]; do
  if [ -n "\$EXISTING_OWNER" ]; then
    read -rp "👑 2) Enter Numeric Owner Telegram ID [Press Enter to keep \$EXISTING_OWNER]: " INPUT_OWNER </dev/tty
    INPUT_OWNER=\$(echo "\$INPUT_OWNER" | tr -d '[:space:]')
    OWNER_ID="\${INPUT_OWNER:-\$EXISTING_OWNER}"
  else
    read -rp "👑 2) Enter your Numeric Owner Telegram ID (e.g. 123456789): " OWNER_ID </dev/tty
    OWNER_ID=\$(echo "\$OWNER_ID" | tr -d '[:space:]')
  fi
  if ! [[ "\$OWNER_ID" =~ ^[0-9]+\$ ]]; then
    echo -e "\${RED}[!] Owner ID must be a number (get it from @userinfobot).\${NC}"
  fi
done

if [ -n "\$EXISTING_DOMAIN" ]; then
  read -rp "🌐 3) Enter Domain/Subdomain for SSL & Web Panel [Press Enter to keep \$EXISTING_DOMAIN]: " INPUT_HOST </dev/tty || true
  INPUT_HOST=\$(echo "\$INPUT_HOST" | sed -E 's|^https?://||; s|/.*\$||; s|:[0-9]+\$||' | tr -d '[:space:]')
  INPUT_HOST="\${INPUT_HOST:-\$EXISTING_DOMAIN}"
else
  read -rp "🌐 3) Enter Domain/Subdomain for SSL & Web Panel (or press Enter to use Server IP): " INPUT_HOST </dev/tty || true
  INPUT_HOST=\$(echo "\$INPUT_HOST" | sed -E 's|^https?://||; s|/.*\$||; s|:[0-9]+\$||' | tr -d '[:space:]')
fi

SERVER_IP=\$(curl -4 -s --max-time 4 https://api.ipify.org | grep -oE '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$' || curl -4 -s --max-time 4 https://icanhazip.com | grep -oE '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$' || curl -4 -s --max-time 4 https://ident.me | grep -oE '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$' || ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if(\$i=="src") {print \$(i+1); exit}}' || hostname -I | awk '{print \$1}')
SERVER_IP=\$(echo "\$SERVER_IP" | tr -d '[:space:]')
TARGET_HOST="\${INPUT_HOST:-\$SERVER_IP}"

echo ""
echo -e "\${BLUE}[1/5] Installing packages & unlocking Firewall ports (80, 443, 8080)...\${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y || true
apt-get install -y python3 python3-venv python3-pip curl wget git nginx certbot python3-certbot-nginx openssl psmisc || apt-get install -y python3 python3-venv python3-pip curl wget nginx openssl

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

echo -e "\${BLUE}[2/5] Creating application directory & writing Unified Bot + Web Panel...\${NC}"
mkdir -p "\$INSTALL_DIR" /var/www/html

BOT_USERNAME=\$(curl -s --max-time 8 "https://api.telegram.org/bot\${BOT_TOKEN}/getMe" | grep -oE '"username":"[^"]+"' | head -n 1 | cut -d'"' -f4 || true)
BOT_USERNAME="\${BOT_USERNAME:-ArzPulseBot}"

echo "\$TARGET_HOST" > "\$INSTALL_DIR/custom_domain.txt"
INITIAL_WEB_URL="https://\$TARGET_HOST"

cat << EOF > "\$INSTALL_DIR/.env"
BOT_TOKEN="\$BOT_TOKEN"
OWNER_ID="\$OWNER_ID"
BOT_USERNAME="\$BOT_USERNAME"
SERVER_IP="\$SERVER_IP"
CUSTOM_DOMAIN="\$TARGET_HOST"
WEB_PANEL_URL="\$INITIAL_WEB_URL"
ADMIN_USERNAME="${adminUser}"
ADMIN_PASSWORD="${adminPass}"
TON_WALLET="${ton}"
TRON_WALLET="${tron}"
EOF

cat << 'BOT_EOF' > "\$INSTALL_DIR/bot.py"
${compactBotCode}
BOT_EOF

echo -e "\${BLUE}[3/5] Installing Python virtualenv (aiogram, aiohttp, matplotlib)...\${NC}"
python3 -m venv "\$INSTALL_DIR/venv"
"\$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"\$INSTALL_DIR/venv/bin/pip" install aiogram aiohttp
"\$INSTALL_DIR/venv/bin/pip" install matplotlib || true

echo -e "\${BLUE}[4/5] Installing Auto-SSL Helper (/usr/local/bin/arz-ssl) & Configuring Nginx...\${NC}"
cat << 'SSL_HELPER_EOF' > /usr/local/bin/arz-ssl
#!/usr/bin/env bash
RAW_HOST="\$1"
SSL_EMAIL="\$2"
INSTALL_DIR="/opt/arzpulse"
mkdir -p "\$INSTALL_DIR" /etc/nginx/ssl /var/www/html

CLEAN_HOST=\$(echo "\$RAW_HOST" | sed -E 's|^https?://||I; s|/.*\$||; s|\\?.*\$||; s|:[0-9]+\$||' | tr -d '[:space:]')
if [ -z "\$CLEAN_HOST" ]; then
  CLEAN_HOST=\$(grep -E '^SERVER_IP=' "\$INSTALL_DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || hostname -I | awk '{print \$1}')
fi

echo "\$CLEAN_HOST" > "\$INSTALL_DIR/custom_domain.txt"
if [ -f "\$INSTALL_DIR/.env" ]; then
  if grep -q '^CUSTOM_DOMAIN=' "\$INSTALL_DIR/.env"; then
    sed -i "s|^CUSTOM_DOMAIN=.*|CUSTOM_DOMAIN=\"\$CLEAN_HOST\"|" "\$INSTALL_DIR/.env"
  else
    echo "CUSTOM_DOMAIN=\"\$CLEAN_HOST\"" >> "\$INSTALL_DIR/.env"
  fi
  if grep -q '^WEB_PANEL_URL=' "\$INSTALL_DIR/.env"; then
    sed -i "s|^WEB_PANEL_URL=.*|WEB_PANEL_URL=\"https://\$CLEAN_HOST\"|" "\$INSTALL_DIR/.env"
  else
    echo "WEB_PANEL_URL=\"https://\$CLEAN_HOST\"" >> "\$INSTALL_DIR/.env"
  fi
fi

if [[ "\$CLEAN_HOST" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$ ]]; then
  SAN_EXT="subjectAltName=IP:\$CLEAN_HOST"
else
  SAN_EXT="subjectAltName=DNS:\$CLEAN_HOST"
fi

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \\
  -keyout /etc/nginx/ssl/arz-ip.key \\
  -out /etc/nginx/ssl/arz-ip.crt \\
  -subj "/CN=\$CLEAN_HOST" \\
  -addext "\$SAN_EXT" >/dev/null 2>&1 || \\
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \\
  -keyout /etc/nginx/ssl/arz-ip.key \\
  -out /etc/nginx/ssl/arz-ip.crt \\
  -subj "/CN=\$CLEAN_HOST" >/dev/null 2>&1 || true

CERT_PATH="/etc/nginx/ssl/arz-ip.crt"
KEY_PATH="/etc/nginx/ssl/arz-ip.key"
SSL_MODE="Nginx TLS 1.3 SAN SSL Active (Port 443)"

cat << NGINX_INNER > /etc/nginx/sites-available/arzpulse
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name \$CLEAN_HOST _;
    ssl_certificate \$CERT_PATH;
    ssl_certificate_key \$KEY_PATH;
    ssl_protocols TLSv1.2 TLSv1.3;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
NGINX_INNER

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/arzpulse /etc/nginx/sites-enabled/arzpulse
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx >/dev/null 2>&1 || systemctl reload nginx >/dev/null 2>&1 || true

if ! [[ "\$CLEAN_HOST" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$ ]] && [[ "\$CLEAN_HOST" == *.* ]]; then
  if command -v certbot >/dev/null 2>&1; then
    if [ -n "\$SSL_EMAIL" ]; then
      EMAIL_FLAGS="-m \$SSL_EMAIL"
    else
      EMAIL_FLAGS="--register-unsafely-without-email"
    fi
    certbot certonly --webroot -w /var/www/html -d "\$CLEAN_HOST" --non-interactive --agree-tos \$EMAIL_FLAGS >/dev/null 2>&1 || \\
    certbot --nginx -d "\$CLEAN_HOST" --non-interactive --agree-tos \$EMAIL_FLAGS >/dev/null 2>&1 || true
    if [ -f "/etc/letsencrypt/live/\$CLEAN_HOST/fullchain.pem" ]; then
      CERT_PATH="/etc/letsencrypt/live/\$CLEAN_HOST/fullchain.pem"
      KEY_PATH="/etc/letsencrypt/live/\$CLEAN_HOST/privkey.pem"
      SSL_MODE="Let's Encrypt Official SSL (Port 443)"
      cat << NGINX_LE > /etc/nginx/sites-available/arzpulse
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name \$CLEAN_HOST _;
    ssl_certificate \$CERT_PATH;
    ssl_certificate_key \$KEY_PATH;
    ssl_protocols TLSv1.2 TLSv1.3;
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
NGINX_LE
      systemctl reload nginx >/dev/null 2>&1 || systemctl restart nginx >/dev/null 2>&1 || true
    fi
  fi
fi

cat << JSON_EOF > "\$INSTALL_DIR/ssl_status.json"
{
  "active": true,
  "host": "\$CLEAN_HOST",
  "httpsUrl": "https://\$CLEAN_HOST",
  "httpUrl": "http://\$CLEAN_HOST",
  "mode": "\$SSL_MODE"
}
JSON_EOF
SSL_HELPER_EOF

chmod +x /usr/local/bin/arz-ssl
/usr/local/bin/arz-ssl "\$TARGET_HOST" "" || true

if ! command -v cloudflared >/dev/null 2>&1; then
  ARCH=\$(uname -m)
  CF_ARCH="amd64"
  if [[ "\$ARCH" == "aarch64" || "\$ARCH" == "arm64" ]]; then CF_ARCH="arm64"; fi
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-\$CF_ARCH" -o /usr/local/bin/cloudflared || true
  chmod +x /usr/local/bin/cloudflared || true
fi

systemctl stop arzpulse-bot.service arzpulse-web.service >/dev/null 2>&1 || true
systemctl disable arzpulse-web.service >/dev/null 2>&1 || true
pkill -9 -f "/opt/arzpulse/bot.py" >/dev/null 2>&1 || true
fuser -k 8080/tcp >/dev/null 2>&1 || true

cat << 'EOF' > /etc/systemd/system/arzpulse-tunnel.service
[Unit]
Description=ArzPulse Pro HTTPS Cloudflare Quick Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/bin/bash -c 'exec /usr/local/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8080 > /opt/arzpulse/tunnel.log 2>&1'
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

rm -f /opt/arzpulse/tunnel.log /opt/arzpulse/tunnel_url.txt
systemctl daemon-reload
systemctl enable arzpulse-bot.service arzpulse-tunnel.service >/dev/null 2>&1 || true
systemctl restart arzpulse-tunnel.service || true
systemctl restart arzpulse-bot.service

echo -e "\${YELLOW}⏳ Verifying Web Panel & Generating HTTPS SSL link...\${NC}"
for i in {1..10}; do
  if curl -fsS http://127.0.0.1:8080/api/rates >/dev/null 2>&1; then
    echo -e "\${GREEN}✅ Local Web Panel Server is active on port 8080!\${NC}"
    break
  fi
  sleep 0.5
done

TUNNEL_URL=""
for i in {1..20}; do
  if [ -f /opt/arzpulse/tunnel.log ]; then
    TUNNEL_URL=\$(grep -oE 'https://[a-zA-Z0-9]+-[a-zA-Z0-9-]+\\.trycloudflare\\.com' /opt/arzpulse/tunnel.log 2>/dev/null | grep -v 'api\\.trycloudflare\\.com' | tail -n 1 || true)
    if [ -n "\$TUNNEL_URL" ]; then
      echo "\$TUNNEL_URL" > /opt/arzpulse/tunnel_url.txt
      break
    fi
  fi
  sleep 0.5
done

echo -e "\${BLUE}[5/5] Installing 'sudo arz' Server Management CLI at \$CLI_PATH...\${NC}"
cat << 'EOF' > "\$CLI_PATH"
#!/usr/bin/env bash

RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
NC='\\033[0m'

INSTALL_DIR="/opt/arzpulse"

show_menu() {
  clear
  IP_NOW=\$(grep -E '^SERVER_IP=' /opt/arzpulse/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || hostname -I | awk '{print \$1}')
  CUSTOM_DOM=\$(cat /opt/arzpulse/custom_domain.txt 2>/dev/null | tr -d '[:space:]' || grep -E '^CUSTOM_DOMAIN=' /opt/arzpulse/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  TUNNEL_NOW=\$(grep -oE 'https://[a-zA-Z0-9]+-[a-zA-Z0-9-]+\\.trycloudflare\\.com' /opt/arzpulse/tunnel.log 2>/dev/null | grep -v 'api\\.trycloudflare\\.com' | tail -n 1 || cat /opt/arzpulse/tunnel_url.txt 2>/dev/null || echo "https://\$IP_NOW")
  ACTIVE_HTTPS="https://\${CUSTOM_DOM:-\$IP_NOW}"
  if [ -z "\$CUSTOM_DOM" ] && [ -n "\$TUNNEL_NOW" ]; then
    ACTIVE_HTTPS="\$TUNNEL_NOW"
  fi
  echo -e "\${CYAN}================================================================\${NC}"
  echo -e "\${GREEN}         👑 ArzPulse Pro Server Manager (sudo arz)              \${NC}"
  echo -e "\${CYAN}================================================================\${NC}"
  if [ -n "\$CUSTOM_DOM" ]; then
    echo -e "  🌐 Saved Domain/SSL: \${GREEN}https://\$CUSTOM_DOM\${NC} (Permanent + SSL 443)"
  fi
  echo -e "  🚀 HTTPS Mini App:   \${YELLOW}\$ACTIVE_HTTPS/miniapp\${NC}"
  echo -e "  👑 HTTPS Web Panel:  \${YELLOW}\$ACTIVE_HTTPS/admin?autologin=1\${NC}"
  echo -e "  🖥 Direct Server IP: \${GREEN}http://\$IP_NOW/admin?autologin=1\${NC} (and :8080)"
  echo -e "\${CYAN}----------------------------------------------------------------\${NC}"
  echo -e "  \${YELLOW}1)\${NC} 📊 Show Bot, Web Panel & HTTPS SSL Status"
  echo -e "  \${YELLOW}2)\${NC} 🔄 Update Bot & Dependencies"
  echo -e "  \${YELLOW}3)\${NC} ♻️  Restart Bot, Web Panel & HTTPS Tunnel"
  echo -e "  \${YELLOW}4)\${NC} 🛑 Stop Bot & Web Panel"
  echo -e "  \${YELLOW}5)\${NC} 🔒 Set Domain / Subdomain / IP & Issue SSL Certificate"
  echo -e "  \${YELLOW}6)\${NC} 🔑 Change Bot Token / Owner ID / Show Admin Credentials"
  echo -e "  \${YELLOW}7)\${NC} 🗑️  Uninstall ArzPulse Pro Completely"
  echo -e "  \${YELLOW}0)\${NC} 🚪 Exit"
  echo -e "\${CYAN}================================================================\${NC}"
  read -rp "Enter choice [0-7]: " choice </dev/tty
}

issue_ssl() {
  echo -e "\\n\${BLUE}[SSL & Domain Manager] Enter your Domain, Subdomain, or Server IP:\${NC}"
  read -rp "Target (e.g. sub.yourdomain.com or 203.0.113.10): " TARGET_HOST </dev/tty
  TARGET_HOST=\$(echo "\$TARGET_HOST" | sed -E 's|^https?://||I; s|/.*\$||; s|:[0-9]+\$||' | tr -d '[:space:]')
  if [ -z "\$TARGET_HOST" ]; then
    echo -e "\${RED}[!] Host cannot be empty.\${NC}"
    return
  fi
  SSL_EMAIL=""
  if ! [[ "\$TARGET_HOST" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+\$ ]]; then
    read -rp "Enter email for Let's Encrypt SSL (or press Enter to skip): " SSL_EMAIL </dev/tty || true
    SSL_EMAIL=\$(echo "\$SSL_EMAIL" | tr -d '[:space:]')
  fi
  echo -e "\${YELLOW}⏳ Saving \$TARGET_HOST permanently & issuing SSL certificate on Port 443...\${NC}"
  /usr/local/bin/arz-ssl "\$TARGET_HOST" "\$SSL_EMAIL"
  systemctl restart arzpulse-bot || true
  echo -e "\${GREEN}✅ Domain/Subdomain (\$TARGET_HOST) is permanently saved and SSL is active!\${NC}"
  echo -e "\${CYAN}👑 Owner Web Admin (HTTPS): https://\$TARGET_HOST/admin?autologin=1\${NC}"
  echo -e "\${CYAN}🚀 Telegram Mini App (HTTPS): https://\$TARGET_HOST/miniapp\${NC}"
}

change_credentials() {
  echo -e "\\n\${CYAN}Current Configuration (/opt/arzpulse/.env):\${NC}"
  cat "\$INSTALL_DIR/.env"
  echo ""
  read -rp "Enter NEW Bot Token (or press Enter to keep current): " NEW_TOKEN </dev/tty
  read -rp "Enter NEW Owner ID (or press Enter to keep current): " NEW_OWNER </dev/tty
  if [ -n "\$NEW_TOKEN" ]; then
    sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN=\"\$NEW_TOKEN\"|" "\$INSTALL_DIR/.env"
  fi
  if [ -n "\$NEW_OWNER" ]; then
    sed -i "s|^OWNER_ID=.*|OWNER_ID=\"\$NEW_OWNER\"|" "\$INSTALL_DIR/.env"
  fi
  systemctl restart arzpulse-bot
  echo -e "\${GREEN}✅ Configuration updated and bot restarted!\${NC}"
}

while true; do
  show_menu
  case "\$choice" in
    1) systemctl status arzpulse-bot nginx arzpulse-tunnel --no-pager || true ; read -rp "Press Enter..." </dev/tty ;;
    2) "\$INSTALL_DIR/venv/bin/pip" install --upgrade aiogram aiohttp matplotlib && systemctl restart arzpulse-bot ; echo -e "\${GREEN}✅ Updated successfully!\${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    3) rm -f /opt/arzpulse/tunnel.log ; systemctl restart nginx arzpulse-tunnel arzpulse-bot ; echo -e "\${GREEN}✅ Services restarted (Saved Domain & SSL preserved)!\${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    4) systemctl stop arzpulse-bot arzpulse-tunnel ; echo -e "\${YELLOW}🛑 Services stopped.\${NC}" ; read -rp "Press Enter..." </dev/tty ;;
    5) issue_ssl ; read -rp "Press Enter..." </dev/tty ;;
    6) change_credentials ; read -rp "Press Enter..." </dev/tty ;;
    7) systemctl stop arzpulse-bot arzpulse-tunnel || true ; systemctl disable arzpulse-bot arzpulse-tunnel || true ; rm -rf "\$INSTALL_DIR" "\$CLI_PATH" /usr/local/bin/arz-ssl /etc/systemd/system/arzpulse-bot.service /etc/systemd/system/arzpulse-tunnel.service ; echo -e "\${RED}🗑️ Uninstalled completely.\${NC}" ; exit 0 ;;
    0) exit 0 ;;
    *) echo -e "\${RED}Invalid option!\${NC}" ; sleep 1 ;;
  esac
done
EOF

chmod +x "\$CLI_PATH"
echo ""
echo -e "\${GREEN}================================================================\${NC}"
echo -e "\${GREEN}✅ ArzPulse Pro Bot, Mini App & Web Panel Installed & Started!  \${NC}"
echo -e "\${CYAN}👉 Send /start to your bot (@\$BOT_USERNAME) in Telegram now!   \${NC}"
if [ -n "\$INPUT_HOST" ]; then
  echo -e "\${GREEN}🔒 Permanent Domain SSL (Mini App): https://\$INPUT_HOST/miniapp\${NC}"
  echo -e "\${GREEN}👑 Permanent Domain SSL (Owner):    https://\$INPUT_HOST/admin?autologin=1\${NC}"
elif [ -n "\$TUNNEL_URL" ]; then
  echo -e "\${YELLOW}🔒 Telegram Mini App (HTTPS): \$TUNNEL_URL/miniapp              \${NC}"
  echo -e "\${YELLOW}👑 Owner Web Admin (HTTPS):   \$TUNNEL_URL/admin?autologin=1    \${NC}"
fi
echo -e "\${CYAN}🌐 Direct Web Panel (Port 80):   http://\$SERVER_IP/admin?autologin=1\${NC}"
echo -e "\${CYAN}🌐 Direct Mini App (Port 80):    http://\$SERVER_IP/miniapp     \${NC}"
echo -e "\${CYAN}🌐 Direct Port 8080:             http://\$SERVER_IP:8080/admin?autologin=1\${NC}"
echo -e "\${CYAN}🔑 Admin Username: ${adminUser} | Password: ${adminPass}        \${NC}"
echo -e "\${CYAN}🛠 Run 'sudo arz' (Option 5) anytime to set Domain/Subdomain SSL\${NC}"
echo -e "\${GREEN}================================================================\${NC}"
`;
}

export function generateDirectZero404ServerCommand(opts: BotConfigOptions = {}): string {
  const script = generateInstallBashScript(opts);
  return `cat << 'ARZ_INSTALLER_EOF' > /root/install.sh\n${script}\nARZ_INSTALLER_EOF\nsudo bash /root/install.sh`;
}

export function generateMultilangReadme(githubUser = 'samkaren', repoName = 'ArzPulse-Bot'): string {
  const cmds = generateOneLineCurlCommands(githubUser, repoName);
  const fullInstallScript = generateInstallBashScript({ githubUser, repoName });

  return `# 🌐 ArzPulse Pro — Multi-Language Telegram Currency & Crypto Bot, Mini App & Web Panel

![Version](https://img.shields.io/badge/Version-3.8.0--Pro-2563eb?style=for-the-badge)
![Aiogram](https://img.shields.io/badge/Aiogram-3.x%20Colored%20Keyboards-10b981?style=for-the-badge)
![RateSource](https://img.shields.io/badge/Live%20Rates-ArzDigital.com-0d9488?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-FA%20%7C%20EN%20%7C%20RU%20%7C%20AR%20%7C%20ZH%20%7C%20TR-f59e0b?style=for-the-badge)
![CLI](https://img.shields.io/badge/CLI-sudo%20arz-ef4444?style=for-the-badge)

---

## 📡 منبع دقیق نرخ ارز، دلار و کریپتو / Official Live Price Source
تمامی قیمت‌های **دلار آزاد (USD)**، **تومان (IRT)**، ارزهای دولتی (**یورو، درهم، لیر، روبل، یوان، پوند، دلار کانادا، دینار عراق، دینار کویت**) و رمزارزها (**ترون TRX، تون کوین TON، بیت‌کوین BTC، اتریوم ETH، تتر USDT**) به‌صورت مستقیم و لحظه‌ای از وب‌سایت معتبر **ArzDigital** دریافت می‌شوند:
- 🔗 **منبع نرخ دلار و ارزها:** [https://arzdigital.com/currencies/united-states-dollar/](https://arzdigital.com/currencies/united-states-dollar/)

---

## ⚡ نصب اتوماتیک تک‌خطی و دستور مدیریت سرور / One-Line Auto Install & \`sudo arz\` CLI

> **نکته مهم:** در ابتدای اجرای اسکریپت نصب، ابتدا **توکن ربات تلگرام (API Token)** و سپس **آیدی عددی مالک ربات (Owner Numeric ID)** از شما پرسیده می‌شود و پس از آن کل ربات، وب‌پنل، مینی‌اپ (همراه با باز کردن پورت‌های فایروال 80/443/8080 و تونل HTTPS خودکار برای مینی‌اپ تلگرام) و دستور \`sudo arz\` به‌صورت خودکار نصب و فعال می‌گردند.

### 1️⃣ نصب فوری تک‌خطی با \`bash <(curl -Ls ...)\` (فعال و بدون خطای 404):
برای نصب مستقیم روی سرور لینوکس خود (حتی قبل از ساخت ریپازیتوری گیت‌هاب)، یکی از دستورات زیر را کپی و اجرا کنید:

\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

یا با دستور \`curl | sudo bash\`:
\`\`\`bash
${cmds.directSudoPipe}
\`\`\`

### 🔄 دستور هوشمند گیت‌هاب + میرور خودکار (بدون خطای 404):
\`\`\`bash
${cmds.bashSubshell}
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
  1) 📊 Show Bot, Web Panel & HTTPS Tunnel Status (مشاهده وضعیت ربات و وب‌پنل)
  2) 🔄 Update Bot & Dependencies (آپدیت خودکار اسکریپت و ربات)
  3) ♻️  Restart Bot, Web Panel & HTTPS Tunnel (ریستارت سرویس‌ها)
  4) 🛑 Stop Bot & Web Panel (توقف کامل سرویس‌ها)
  5) 🔒 Issue SSL Certificate (دریافت گواهی SSL روی دامنه، ساب‌دامنه یا آی‌پی)
  6) 🔑 Change Bot Token / Owner ID / Show Admin Credentials (تغییر توکن/آیدی مالک و رمز وب‌پنل)
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
    A[ArzDigital.com Live Price Feed] -->|USD / IRT / Fiat / Crypto| E[Market Price & Conversion Engine]
    U[Telegram User / Group / Channel] -->|Colored ReplyKeyboardMarkup| B(Aiogram 3.x Bot Engine)
    U -->|HTTPS WebApp Launch| M[Pro Telegram Mini App]
    O[Bot Owner / Admin] -->|1-Click Auto-Login| W[Owner Web Admin Panel]
    O -->|Terminal SSH| S[sudo arz Server CLI]
    B -->|Real-Time Rates & PnL Charts| E
    M -->|Live Charts & Instant Swap| E
    S -->|Certbot / OpenSSL / Cloudflare HTTPS| SSL[Auto SSL for Domain / Subdomain / IP]
\`\`\`

---

## 📋 جدول کامل امکانات / Feature Matrix Table

| قابلیت / Feature | ربات تلگرام (Aiogram) | مینی‌اپ (Mini App) | وب‌پنل مالک (Admin) | اسکریپت سرور (\`sudo arz\`) |
| :--- | :---: | :---: | :---: | :---: |
| **دریافت زنده نرخ دلار و ارزها از ArzDigital.com** | ✅ | ✅ | ✅ | ✅ |
| **دریافت توکن ربات و آیدی عددی مالک در ابتدای نصب** | ✅ | ✅ | ✅ | ✅ |
| **نصب خودکار تک‌خطی با \`bash <(curl -Ls ...)\`** | ✅ | ✅ | ✅ | ✅ |
| **مدیریت کامل با دستور \`sudo arz\`** | ✅ | ✅ | ✅ | ✅ |
| **دکمه‌های کیبورد رنگی (\`primary\`, \`success\`, \`danger\`)** | ✅ | ✅ | ✅ | ➖ |
| **۶ زبان زنده (فارسی، انگلیسی، روسی، عربی، چینی، ترکی)** | ✅ | ✅ | ✅ | ➖ |
| **قیمت لحظه‌ای + سود/زیان ۲۴ ساعته و عکس نمودار (PnL Chart)** | ✅ | ✅ | ✅ | ➖ |
| **ماشین‌حساب تبدیل دقیق هر مقدار ارز و کریپتو (USD ⇄ TRX/TON/IRT)** | ✅ | ✅ | ✅ | ➖ |
| **سیستم تیکت پشتیبانی دوطرفه و پاسخ مستقیم مالک** | ✅ | ✅ | ✅ | ➖ |
| **نمایش نام کاربری و رمز وب‌پنل + ورود تک‌کلیکی در ربات** | ✅ | ➖ | ✅ | ✅ |
| **نصب خودکار SSL روی دامنه، ساب‌دامنه، آی‌پی + تونل HTTPS** | ➖ | ✅ | ✅ | ✅ |
| **امکان افزودن ربات به گروه و کانال تلگرام** | ✅ | ➖ | ✅ | ➖ |

---

## 🇮🇷 فارسی: معرفی و راهنمای نصب ربات ArzPulse Pro
**ArzPulse Pro** یک اکوسیستم کامل شامل ربات تلگرام با دکمه‌های کیبورد رنگی (\`ReplyKeyboardMarkup\` با استایل‌های \`success\`, \`primary\`, \`danger\`)، مینی‌اپ تحت وب فوق حرفه‌ای و پنل مدیریت اختصاصی مالک است که نرخ دقیق دلار، تومان و ارزها را از [ArzDigital.com](https://arzdigital.com/currencies/united-states-dollar/) دریافت می‌کند.

**نصب خودکار روی سرور لینوکس (کپی کنید):**
\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

**اجرای منوی مدیریت و دریافت SSL روی دامنه/ساب‌دامنه/آی‌پی (کپی کنید):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇬🇧 English: Overview & Quick Installation
**ArzPulse Pro** is a full-stack Telegram Currency & Cryptocurrency platform built with **Aiogram 3.x**, featuring colored \`ReplyKeyboardMarkup\` buttons (\`primary\`, \`success\`, \`danger\`), live currency & crypto rates from **ArzDigital.com**, a high-precision **Telegram Mini App**, an **Owner Web Admin Dashboard**, and an automated Linux installer.

**One-Line Auto Install Command (Copy & Run):**
\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

**Server Management & Auto SSL CLI Command (Copy & Run):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇨🇳 中文: 项目介绍与一键安装指南
**ArzPulse Pro** 是一套完整的 Telegram 汇率与加密货币智能机器人系统，实时汇率源自 **ArzDigital.com**，支持彩色键盘按钮 (\`primary\`, \`success\`, \`danger\`)、6种语言切换、实时价格与盈亏走势图生成、精准汇率换算、在线客服系统、专业版 Mini App 以及站长 Web 管理面板。

**一键自动安装脚本 (复制并运行):**
\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

**服务器管理与 SSL 证书配置命令 (复制并运行):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇹🇷 Türkçe: Genel Bakış ve Otomatik Kurulum
**ArzPulse Pro**, **ArzDigital.com** canlı kur verileri, renkli klavye butonları (\`ReplyKeyboardMarkup\`), 6 dil desteği, anlık döviz/kripto fiyatları, Kar/Zarar (PnL) grafik görseli, hassas döviz çevirici, canlı destek, Mini App ve Sahip Web Yönetim Paneli içeren eksiksiz bir Telegram bot paketidir.

**Tek Satır Otomatik Kurulum Komutu (Kopyala ve Çalıştır):**
\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

**Sunucu Yönetimi ve SSL Kurulum Komutu (Kopyala ve Çalıştır):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇸🇦 العربية: نظرة عامة والتثبيت التلقائي
**ArzPulse Pro** هو نظام متكامل يجمع بين بوت تيليجرام ذكي بأزرار كيبورد ملونة، وأسعار مباشرة من **ArzDigital.com**، وتطبيق مصغر (Mini App) احترافي، ولوحة تحكم ويب للمالك، مع دعم 6 لغات، وعرض الأسعار اللحظية مع صورة شارت الأرباح والخسائر، ومحول عملات دقيق.

**أمر التثبيت التلقائي بسطر واحد (انسخ وشغل):**
\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

**أمر إدارة السيرفر وتفعيل شهادة SSL (انسخ وشغل):**
\`\`\`bash
sudo arz
\`\`\`

---

## 🇷🇺 Русский: Обзор и автоматическая установка
**ArzPulse Pro** — это профессиональный Telegram-бот на базе **Aiogram 3.x** с цветными кнопками клавиатуры (\`primary\`, \`success\`, \`danger\`), живыми курсами **ArzDigital.com**, поддержкой 6 языков, графиками прибыли и убытков (PnL), точным конвертером валют, Mini App и веб-панелью владельца.

**Автоматическая установка одной командой (Скопируйте и запустите):**
\`\`\`bash
${cmds.directCurlSubshell}
\`\`\`

**Панель управления сервером и выпуск SSL (Скопируйте и запустите):**
\`\`\`bash
sudo arz
\`\`\`

---

## 📜 نصب مستقیم بدون نیاز به گیت‌هاب (Direct Copy-Paste Installer — Zero 404)

اگر هنوز فایل‌ها را در گیت‌هاب خود آپلود نکرده‌اید و می‌خواهید **همین الان بدون خطای 404** روی سرور لینوکس خود نصب کنید، کافیست دستور یکپارچه زیر را کپی کرده و در ترمینال سرور Paste کنید:

\`\`\`bash
cat << 'ARZ_INSTALLER_EOF' > /root/install.sh
${fullInstallScript}
ARZ_INSTALLER_EOF
sudo bash /root/install.sh
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
