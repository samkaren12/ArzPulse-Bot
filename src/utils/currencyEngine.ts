export type LanguageCode = 'fa' | 'en' | 'ru' | 'ar' | 'zh' | 'tr';

export interface AssetInfo {
  code: string;
  symbol: string;
  type: 'crypto' | 'fiat';
  priceUsd: number;
  change24h: number;
  change7d: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  names: Record<LanguageCode, string>;
  aliases: string[];
  sparkline: number[];
}

export const TON_WALLET = 'UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-';
export const TRON_WALLET = 'TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy';
export const DEFAULT_GITHUB_URL = 'https://github.com/samkaren/ArzPulse-Telegram-Suite';

export const RECOMMENDED_REPO_NAMES = [
  {
    name: 'ArzPulse-Bot',
    tagline: ' کوتاه، بین‌المللی و بسیار حرفه‌ای برای ربات و وب‌پنل ارز و کریپتو',
  },
  {
    name: 'TeleRateX-Pro',
    tagline: 'مناسب برای پروژه‌های چندزبانه بین‌المللی با مینی‌اپ و پنل مدیریت',
  },
  {
    name: 'ArzYar-Aiogram-Suite',
    tagline: 'ترکیب نام فارسی/بین‌المللی با اشاره به فریم‌ورک قدرتمند Aiogram 3',
  },
  {
    name: 'CryptoFiat-MiniApp-Bot',
    tagline: 'بهینه‌شده برای سئو و سرچ گیت‌هاب (GitHub Topics SEO)',
  },
];

export const INITIAL_ASSETS: AssetInfo[] = [
  {
    code: 'USD',
    symbol: '$',
    type: 'fiat',
    priceUsd: 1.0,
    change24h: 0.12,
    change7d: 0.45,
    high24h: 1.002,
    low24h: 0.998,
    volume24h: '$94.2B',
    names: {
      fa: 'دلار آمریکا',
      en: 'US Dollar',
      ru: 'Доллар США',
      ar: 'الدولار الأمريكي',
      zh: '美元',
      tr: 'ABD Doları',
    },
    aliases: ['usd', 'dollar', 'دلار', 'دلار امریکا', 'دلار آمریکا', 'доллар', 'دولار', '美元', 'dolar', '$'],
    sparkline: [68100, 68450, 68300, 68900, 69100, 69350, 69500],
  },
  {
    code: 'TRX',
    symbol: 'TRX',
    type: 'crypto',
    priceUsd: 0.2485,
    change24h: 4.82,
    change7d: 12.34,
    high24h: 0.254,
    low24h: 0.236,
    volume24h: '$1.42B',
    names: {
      fa: 'ترون (TRX)',
      en: 'TRON (TRX)',
      ru: 'Трон (TRX)',
      ar: 'ترون (TRX)',
      zh: '波场 (TRX)',
      tr: 'TRON (TRX)',
    },
    aliases: ['trx', 'tron', 'ترون', 'ارز ترون', 'трон', '波场'],
    sparkline: [0.228, 0.231, 0.235, 0.233, 0.241, 0.245, 0.2485],
  },
  {
    code: 'TON',
    symbol: 'TON',
    type: 'crypto',
    priceUsd: 5.42,
    change24h: 6.18,
    change7d: 15.9,
    high24h: 5.58,
    low24h: 5.09,
    volume24h: '$840M',
    names: {
      fa: 'تون کوین (TON)',
      en: 'Toncoin (TON)',
      ru: 'Тонкоин (TON)',
      ar: 'تون كوين (TON)',
      zh: '吨币 (TON)',
      tr: 'Toncoin (TON)',
    },
    aliases: ['ton', 'toncoin', 'تون', 'تون کوین', 'تونکوین', 'тон', 'тонкоин', '吨币'],
    sparkline: [4.88, 4.95, 5.12, 5.08, 5.25, 5.34, 5.42],
  },
  {
    code: 'BTC',
    symbol: '₿',
    type: 'crypto',
    priceUsd: 94280.0,
    change24h: 3.45,
    change7d: 8.72,
    high24h: 95100.0,
    low24h: 91200.0,
    volume24h: '$42.8B',
    names: {
      fa: 'بیت‌کوین (BTC)',
      en: 'Bitcoin (BTC)',
      ru: 'Биткоин (BTC)',
      ar: 'بيتكوين (BTC)',
      zh: '比特币 (BTC)',
      tr: 'Bitcoin (BTC)',
    },
    aliases: ['btc', 'bitcoin', 'بیت کوین', 'بیتکوین', 'بیت‌کوین', 'биткоин', 'بيتكوين', '比特币'],
    sparkline: [88400, 89900, 91200, 90600, 92400, 93800, 94280],
  },
  {
    code: 'ETH',
    symbol: 'Ξ',
    type: 'crypto',
    priceUsd: 3185.5,
    change24h: -1.24,
    change7d: 4.15,
    high24h: 3260.0,
    low24h: 3140.0,
    volume24h: '$18.6B',
    names: {
      fa: 'اتریوم (ETH)',
      en: 'Ethereum (ETH)',
      ru: 'Эфириум (ETH)',
      ar: 'إيثريوم (ETH)',
      zh: '以太坊 (ETH)',
      tr: 'Ethereum (ETH)',
    },
    aliases: ['eth', 'ethereum', 'اتریوم', 'اتر', 'эфириум', 'إيثريوم', '以太坊'],
    sparkline: [3240, 3225, 3210, 3195, 3205, 3190, 3185.5],
  },
  {
    code: 'USDT',
    symbol: '₮',
    type: 'crypto',
    priceUsd: 1.0004,
    change24h: 0.04,
    change7d: 0.09,
    high24h: 1.001,
    low24h: 0.9995,
    volume24h: '$68.5B',
    names: {
      fa: 'تتر (USDT)',
      en: 'Tether (USDT)',
      ru: 'Тезер (USDT)',
      ar: 'تيثر (USDT)',
      zh: '泰达币 (USDT)',
      tr: 'Tether (USDT)',
    },
    aliases: ['usdt', 'tether', 'تتر', 'دلار تتر', 'тезер', 'تيثر', '泰达币'],
    sparkline: [0.9998, 1.0001, 1.0, 1.0002, 1.0001, 1.0003, 1.0004],
  },
  {
    code: 'IRT',
    symbol: 'تومان',
    type: 'fiat',
    priceUsd: 1 / 69500, // 1 USD = 69,500 Toman
    change24h: -0.85,
    change7d: -2.1,
    high24h: 1 / 68900,
    low24h: 1 / 69800,
    volume24h: '$410M',
    names: {
      fa: 'تومان ایران (IRT)',
      en: 'Iranian Toman (IRT)',
      ru: 'Иранский туман (IRT)',
      ar: 'التومان الإيراني (IRT)',
      zh: '伊朗土曼 (IRT)',
      tr: 'İran Tümeni (IRT)',
    },
    aliases: ['irt', 'irr', 'toman', 'rial', 'تومان', 'ریال', 'ایران', 'پول ایران', 'туман', 'تومان إيراني', '土曼', 'tümen'],
    sparkline: [68200, 68500, 68900, 68750, 69100, 69300, 69500],
  },
  {
    code: 'EUR',
    symbol: '€',
    type: 'fiat',
    priceUsd: 1.084,
    change24h: 0.38,
    change7d: 1.12,
    high24h: 1.089,
    low24h: 1.079,
    volume24h: '$31.2B',
    names: {
      fa: 'یورو اروپا (EUR)',
      en: 'Euro (EUR)',
      ru: 'Евро (EUR)',
      ar: 'اليورو (EUR)',
      zh: '欧元 (EUR)',
      tr: 'Euro (EUR)',
    },
    aliases: ['eur', 'euro', 'یورو', 'евро', 'يورو', '欧元', '€'],
    sparkline: [1.072, 1.075, 1.078, 1.076, 1.08, 1.082, 1.084],
  },
  {
    code: 'RUB',
    symbol: '₽',
    type: 'fiat',
    priceUsd: 1 / 96.4,
    change24h: -0.42,
    change7d: -1.15,
    high24h: 1 / 95.8,
    low24h: 1 / 97.1,
    volume24h: '$4.8B',
    names: {
      fa: 'روبل روسیه (RUB)',
      en: 'Russian Ruble (RUB)',
      ru: 'Российский рубль (RUB)',
      ar: 'الروبل الروسي (RUB)',
      zh: '俄罗斯卢布 (RUB)',
      tr: 'Rus Rublesi (RUB)',
    },
    aliases: ['rub', 'ruble', 'روبل', 'روبل روسیه', 'рубль', 'روبل روسي', '卢布', 'ruble'],
    sparkline: [95.2, 95.6, 95.9, 96.1, 95.8, 96.2, 96.4],
  },
  {
    code: 'TRY',
    symbol: '₺',
    type: 'fiat',
    priceUsd: 1 / 34.25,
    change24h: -0.31,
    change7d: -0.88,
    high24h: 1 / 34.05,
    low24h: 1 / 34.4,
    volume24h: '$5.9B',
    names: {
      fa: 'لیر ترکیه (TRY)',
      en: 'Turkish Lira (TRY)',
      ru: 'Турецкая лира (TRY)',
      ar: 'الليرة التركية (TRY)',
      zh: '土耳其里拉 (TRY)',
      tr: 'Türk Lirası (TRY)',
    },
    aliases: ['try', 'lira', 'لیر', 'لیر ترکیه', 'лира', 'ليرة تركية', '里拉', 'tl', 'türk lirası'],
    sparkline: [33.95, 34.02, 34.08, 34.12, 34.18, 34.21, 34.25],
  },
  {
    code: 'CNY',
    symbol: '¥',
    type: 'fiat',
    priceUsd: 1 / 7.12,
    change24h: 0.19,
    change7d: 0.54,
    high24h: 1 / 7.09,
    low24h: 1 / 7.14,
    volume24h: '$19.4B',
    names: {
      fa: 'یوان چین (CNY)',
      en: 'Chinese Yuan (CNY)',
      ru: 'Китайский юань (CNY)',
      ar: 'اليوان الصيني (CNY)',
      zh: '人民币 (CNY)',
      tr: 'Çin Yuanı (CNY)',
    },
    aliases: ['cny', 'rmb', 'yuan', 'یوان', 'یوان چین', 'юань', 'يوان', '人民币', '元'],
    sparkline: [7.15, 7.14, 7.135, 7.13, 7.128, 7.124, 7.12],
  },
  {
    code: 'AED',
    symbol: 'د.إ',
    type: 'fiat',
    priceUsd: 1 / 3.6725,
    change24h: 0.02,
    change7d: 0.05,
    high24h: 1 / 3.671,
    low24h: 1 / 3.674,
    volume24h: '$6.2B',
    names: {
      fa: 'درهم امارات (AED)',
      en: 'UAE Dirham (AED)',
      ru: 'Дирхам ОАЭ (AED)',
      ar: 'الدرهم الإماراتي (AED)',
      zh: '阿联酋迪拉姆 (AED)',
      tr: 'BAE Dirhemi (AED)',
    },
    aliases: ['aed', 'dirham', 'درهم', 'درهم امارات', 'дирхам', 'درهم إماراتي', '迪拉姆'],
    sparkline: [3.6725, 3.6725, 3.6724, 3.6726, 3.6725, 3.6725, 3.6725],
  },
];

export function normalizeDigits(input: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

export function findAssetByQuery(query: string, assets: AssetInfo[] = INITIAL_ASSETS): AssetInfo | undefined {
  const clean = normalizeDigits(query).trim().toLowerCase();
  if (!clean) return undefined;

  // Exact code or alias match first
  const exact = assets.find(
    (a) =>
      a.code.toLowerCase() === clean ||
      a.aliases.some((al) => al.toLowerCase() === clean) ||
      Object.values(a.names).some((n) => n.toLowerCase() === clean)
  );
  if (exact) return exact;

  // Substring match
  return assets.find(
    (a) =>
      clean.includes(a.code.toLowerCase()) ||
      a.aliases.some((al) => clean.includes(al.toLowerCase()) || al.toLowerCase().includes(clean))
  );
}

export interface ConversionResult {
  amount: number;
  fromAsset: AssetInfo;
  toAsset: AssetInfo;
  unitRate: number; // 1 fromAsset in toAsset
  reverseRate: number; // 1 toAsset in fromAsset
  convertedAmount: number;
  usdValue: number;
}

export function convertCurrency(
  amount: number,
  fromQuery: string,
  toQuery: string,
  assets: AssetInfo[] = INITIAL_ASSETS
): ConversionResult | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const fromAsset = findAssetByQuery(fromQuery, assets);
  const toAsset = findAssetByQuery(toQuery, assets);
  if (!fromAsset || !toAsset) return null;

  const usdValue = amount * fromAsset.priceUsd;
  const unitRate = fromAsset.priceUsd / toAsset.priceUsd;
  const reverseRate = toAsset.priceUsd / fromAsset.priceUsd;
  const convertedAmount = amount * unitRate;

  return {
    amount,
    fromAsset,
    toAsset,
    unitRate,
    reverseRate,
    convertedAmount,
    usdValue,
  };
}

export function formatCurrencyValue(val: number): string {
  if (!Number.isFinite(val)) return '0';
  if (val >= 1000) {
    return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (val >= 1) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export interface TranslationSchema {
  dir: 'rtl' | 'ltr';
  langName: string;
  welcomeTitle: string;
  welcomeSub: string;
  btnPrice: string;
  btnConvert: string;
  btnLanguage: string;
  btnSupport: string;
  btnGuide: string;
  btnCreator: string;
  btnMiniApp: string;
  btnOwnerPanel: string;
  btnAddToGroup: string;
  askPriceAsset: string;
  askConvertFirst: string;
  askConvertSecond: string;
  askConvertAmount: string;
  askSupportMsg: string;
  supportReceived: string;
  notFoundAsset: string;
  priceCardTitle: string;
  pnl24hLabel: string;
  pnl7dLabel: string;
  tomanEquivalent: string;
  conversionResultTitle: string;
  unitRateLabel: string;
  guideText: string;
  creatorText: string;
  ownerCredentialsText: string;
}

export const TRANSLATIONS: Record<LanguageCode, TranslationSchema> = {
  fa: {
    dir: 'rtl',
    langName: 'فارسی 🇮🇷',
    welcomeTitle: 'به ربات هوشمند نرخ ارز و کریپتو ArzPulse خوش آمدید!',
    welcomeSub: 'لطفاً یکی از خدمات زیر را از منوی کیبورد رنگی انتخاب کنید:',
    btnPrice: '📊 قیمت واحد پول یا ارز',
    btnConvert: '🔄 تبدیل ارز و واحد پول',
    btnLanguage: '🌐 تغییر زبان (Language)',
    btnSupport: '🎧 پشتیبانی آنلاین',
    btnGuide: '📖 راهنمای ربات',
    btnCreator: '👨‍💻 سازنده و دونیت',
    btnMiniApp: '🚀 مینی‌اپ فوق حرفه‌ای',
    btnOwnerPanel: '👑 مدیریت مالک (وب‌پنل)',
    btnAddToGroup: '➕ افزودن به گروه یا کانال',
    askPriceAsset: '🔍 لطفاً نام ارز دیجیتال یا واحد پول مورد نظر را وارد کنید (مثلاً: ترون، دلار، بیت کوین، تون، یورو، TRX، USD):',
    askConvertFirst: '1️⃣ لطفاً نام **ارز یا واحد پول مبدا** را وارد کنید (مثلاً: دلار یا USD):',
    askConvertSecond: '2️⃣ عالی! حالا نام **ارز یا واحد پول مقصد** را وارد کنید (مثلاً: ترون یا TRX):',
    askConvertAmount: '🔢 چه تعداد می‌خواهید تبدیل کنید؟ (مثلاً عدد 1 یا 100 را بفرستید):',
    askSupportMsg: '💬 پیام، سوال یا درخواست خود را بنویسید؛ مستقیماً برای مالک ربات ارسال می‌شود و در همین‌جا پاسخ دریافت خواهید کرد:',
    supportReceived: '✅ پیام شما با موفقیت ثبت شد و به پنل مدیریت مالک ارسال گردید. به‌زودی پاسخ داده می‌شود.',
    notFoundAsset: '⚠️ ارز یا واحد پول وارد شده یافت نشد! لطفاً نامی مثل دلار، ترون، تون، بیت کوین، تتر، یورو، لیر یا روبل وارد کنید.',
    priceCardTitle: 'گزارش لحظه‌ای قیمت و نمودار سود و زیان',
    pnl24hLabel: 'سود/زیان ۲۴ ساعته',
    pnl7dLabel: 'سود/زیان ۷ روزه',
    tomanEquivalent: 'معادل تومانی',
    conversionResultTitle: 'نتیجه دقیق تبدیل ارز',
    unitRateLabel: 'نرخ واحد (۱ واحد)',
    guideText:
      '📖 **راهنمای کامل ربات ArzPulse Pro:**\n\n' +
      '1️⃣ **قیمت و نمودار سود/زیان:** دکمه «قیمت واحد پول یا ارز» را بزنید و نام ارز (مثل دلار، ترون، بیت‌کوین) را بفرستید تا قیمت دقیق + درصد سود/زیان + تصویر نمودار اختصاصی برایتان ارسال شود.\n' +
      '2️⃣ **تبدیل دقیق ارزها:** دکمه «تبدیل ارز» را بزنید، ارز اول (مثلاً دلار)، سپس ارز دوم (مثلاً ترون) و مقدار را وارد کنید.\n' +
      '3️⃣ **استفاده در گروه و کانال:** ربات را به گروه یا کانال خود اضافه کنید و از دستورات `/price trx` یا `/convert 10 usd trx` استفاده نمایید.\n' +
      '4️⃣ **مینی‌اپ و وب‌پنل:** از دکمه مینی‌اپ برای دسترسی به پنل گرافیکی پیشرفته استفاده کنید.',
    creatorText:
      '👨‍💻 **طراحی و توسعه توسط سازنده (Owner & Developer)**\n\n' +
      '🔗 گیت‌هاب سازنده و ولت‌های رسمی جهت حمایت (Donate):',
    ownerCredentialsText:
      '👑 **پنل مدیریت اختصاصی مالک ربات**\n\n' +
      'مشخصات ورود مستقیم شما به وب‌پنل مدیریت پیشرفته:',
  },
  en: {
    dir: 'ltr',
    langName: 'English 🇬🇧',
    welcomeTitle: 'Welcome to ArzPulse Pro Currency & Crypto Bot!',
    welcomeSub: 'Please select a service from the colored interactive keyboard menu below:',
    btnPrice: '📊 Currency & Crypto Price',
    btnConvert: '🔄 Currency Converter',
    btnLanguage: '🌐 Change Language',
    btnSupport: '🎧 Live Support',
    btnGuide: '📖 Bot Guide',
    btnCreator: '👨‍💻 Creator & Donate',
    btnMiniApp: '🚀 Launch Pro Mini App',
    btnOwnerPanel: '👑 Owner Admin Panel',
    btnAddToGroup: '➕ Add to Group / Channel',
    askPriceAsset: '🔍 Please enter the name or ticker of the currency/crypto (e.g., USD, TRX, TON, BTC, EUR, IRT):',
    askConvertFirst: '1️⃣ Enter the **Source Currency / Crypto** (e.g., USD or Dollar):',
    askConvertSecond: '2️⃣ Great! Now enter the **Target Currency / Crypto** (e.g., TRX or TRON):',
    askConvertAmount: '🔢 Enter the **Amount** to convert (e.g., 1, 10, 250):',
    askSupportMsg: '💬 Type your message for support. The owner will reply directly to your chat:',
    supportReceived: '✅ Your support ticket has been delivered to the Owner Web Panel.',
    notFoundAsset: '⚠️ Currency or crypto not found! Try USD, TRX, TON, BTC, ETH, USDT, EUR, RUB, TRY, CNY, IRT.',
    priceCardTitle: 'Live Market Price & PnL Chart',
    pnl24hLabel: '24h Profit/Loss',
    pnl7dLabel: '7d Profit/Loss',
    tomanEquivalent: 'IRT (Toman) Rate',
    conversionResultTitle: 'Accurate Conversion Result',
    unitRateLabel: 'Unit Rate (1 Unit)',
    guideText:
      '📖 **ArzPulse Pro Complete Guide:**\n\n' +
      '• **Price & PnL Chart:** Tap "Currency & Crypto Price", send any symbol (e.g. TRX, BTC, USD) to receive real-time pricing + 24h/7d PnL + generated chart image.\n' +
      '• **Converter:** Tap "Currency Converter", enter currency 1 (e.g. USD), currency 2 (e.g. TRX), and any amount.\n' +
      '• **Groups & Channels:** Add the bot to any group/channel and run `/price ton` or `/convert 50 usd trx`.',
    creatorText: '👨‍💻 **Developer & Official Crypto Wallets (GitHub Verified):**',
    ownerCredentialsText: '👑 **Owner Management Console & Web Panel Credentials:**',
  },
  ru: {
    dir: 'ltr',
    langName: 'Русский 🇷🇺',
    welcomeTitle: 'Добро пожаловать в ArzPulse Pro — бот валют и криптовалют!',
    welcomeSub: 'Выберите нужную услугу на цветной клавиатуре ниже:',
    btnPrice: '📊 Курс валют и крипто',
    btnConvert: '🔄 Конвертер валют',
    btnLanguage: '🌐 Язык (Language)',
    btnSupport: '🎧 Поддержка',
    btnGuide: '📖 Инструкция',
    btnCreator: '👨‍💻 Создатель и Донат',
    btnMiniApp: '🚀 Открыть Mini App',
    btnOwnerPanel: '👑 Панель Владельца',
    btnAddToGroup: '➕ Добавить в группу/канал',
    askPriceAsset: '🔍 Введите название или тикер валюты/криптовалюты (например: USD, TRX, TON, BTC, RUB):',
    askConvertFirst: '1️⃣ Введите **исходную валюту** (например: USD или Доллар):',
    askConvertSecond: '2️⃣ Отлично! Теперь введите **целевую валюту** (например: TRX или Трон):',
    askConvertAmount: '🔢 Введите **сумму** для конвертации (например: 1 или 100):',
    askSupportMsg: '💬 Напишите ваше сообщение в поддержку, и владелец ответит вам:',
    supportReceived: '✅ Ваше сообщение отправлено в веб-панель владельца.',
    notFoundAsset: '⚠️ Валюта не найдена! Попробуйте USD, TRX, TON, BTC, ETH, RUB, EUR, TRY, CNY.',
    priceCardTitle: 'Текущий курс и график PnL (Прибыль/Убыток)',
    pnl24hLabel: 'Прибыль/Убыток 24ч',
    pnl7dLabel: 'Прибыль/Убыток 7д',
    tomanEquivalent: 'Курс в туманах (IRT)',
    conversionResultTitle: 'Точный результат конвертации',
    unitRateLabel: 'Курс за 1 единицу',
    guideText:
      '📖 **Руководство ArzPulse Pro:**\n\n' +
      '• Нажмите «Курс валют», чтобы получить точный курс и график прибыли/убытка.\n' +
      '• Нажмите «Конвертер валют» для перевода любой суммы (например USD в TRX).\n' +
      '• Добавляйте бота в группы и каналы (`/price ton`, `/convert 10 usd trx`).',
    creatorText: '👨‍💻 **Разработчик, GitHub и кошельки TON / TRON:**',
    ownerCredentialsText: '👑 **Панель управления владельца (Логин и пароль веб-панели):**',
  },
  ar: {
    dir: 'rtl',
    langName: 'العربية 🇸🇦',
    welcomeTitle: 'مرحباً بك في بوت ArzPulse Pro للعملات والكريبتو!',
    welcomeSub: 'يرجى اختيار الخدمة المطلوبة من لوحة المفاتيح الملونة أدناه:',
    btnPrice: '📊 أسعار العملات والكريبتو',
    btnConvert: '🔄 محول العملات الدقيق',
    btnLanguage: '🌐 تغيير اللغة',
    btnSupport: '🎧 الدعم الفني',
    btnGuide: '📖 دليل البوت',
    btnCreator: '👨‍💻 المطور والتبرع',
    btnMiniApp: '🚀 تطبيق Mini App الاحترافي',
    btnOwnerPanel: '👑 لوحة تحكم المالك',
    btnAddToGroup: '➕ أضف إلى مجموعة أو قناة',
    askPriceAsset: '🔍 أرسل اسم العملة أو الرمز (مثل: دولار، ترون، تون، بيتكوين، USD، TRX):',
    askConvertFirst: '1️⃣ أرسل اسم **العملة الأولى** (مثل: دولار أو USD):',
    askConvertSecond: '2️⃣ ممتاز! الآن أرسل اسم **العملة الثانية** (مثل: ترون أو TRX):',
    askConvertAmount: '🔢 أرسل **المبلغ** المراد تحويله (مثلاً: 1 أو 50):',
    askSupportMsg: '💬 اكتب رسالتك لفريق الدعم وسيتم الرد عليك مباشرة:',
    supportReceived: '✅ تم إرسال رسالتك إلى لوحة تحكم المالك بنجاح.',
    notFoundAsset: '⚠️ لم يتم العثور على العملة! جرب USD أو TRX أو TON أو BTC أو AED أو EUR.',
    priceCardTitle: 'السعر المباشر وشارت الأرباح والخسائر',
    pnl24hLabel: 'الربح/الخسارة 24 ساعة',
    pnl7dLabel: 'الربح/الخسارة 7 أيام',
    tomanEquivalent: 'المعادل بالتومان الإيراني',
    conversionResultTitle: 'نتيجة التحويل الدقيقة',
    unitRateLabel: 'سعر الوحدة الواحدة',
    guideText:
      '📖 **دليل استخدام البوت:**\n\n' +
      '• اضغط على أسعار العملات لمعرفة السعر الفوري مع رسم بياني للأرباح والخسائر.\n' +
      '• اضغط على محول العملات لتحويل أي مبلغ بين العملات الرقمية والعالمية.\n' +
      '• يمكنك إضافة البوت لمجموعتك أو قناتك.',
    creatorText: '👨‍💻 **حساب GitHub للمطور ومحافظ TON و TRON الرسمية:**',
    ownerCredentialsText: '👑 **بيانات الدخول إلى لوحة التحكم الويب للمالك:**',
  },
  zh: {
    dir: 'ltr',
    langName: 'Chinese (ZH) 🇨🇳',
    welcomeTitle: 'Welcome to ArzPulse Pro (ZH / Chinese Mode)!',
    welcomeSub: '请从下方彩色键盘菜单中选择一项服务：',
    btnPrice: '📊 货币与加密币价格',
    btnConvert: '🔄 汇率精准换算',
    btnLanguage: '🌐 切换语言 (Language)',
    btnSupport: '🎧 在线客服支持',
    btnGuide: '📖 机器人使用指南',
    btnCreator: '👨‍💻 开发者与捐赠',
    btnMiniApp: '🚀 启动专业版 Mini App',
    btnOwnerPanel: '👑 站长管理后台',
    btnAddToGroup: '➕ 添加到群组或频道',
    askPriceAsset: '🔍 请输入货币或加密货币名称/代码（例如：USD, TRX, TON, BTC, CNY）：',
    askConvertFirst: '1️⃣ 请输入**源货币/加密货币**名称（例如：USD 或 美元）：',
    askConvertSecond: '2️⃣ 很好！现在请输入**目标货币/加密货币**（例如：TRX 或 波场）：',
    askConvertAmount: '🔢 请输入要换算的**数量**（例如：1 或 100）：',
    askSupportMsg: '💬 请输入您的客服留言，站长将直接回复您：',
    supportReceived: '✅ 您的留言已成功发送至站长管理面板。',
    notFoundAsset: '⚠️ 未找到该货币！请尝试输入 USD, TRX, TON, BTC, ETH, USDT, CNY, EUR。',
    priceCardTitle: '实时价格与盈亏走势图 (PnL)',
    pnl24hLabel: '24小时盈亏',
    pnl7dLabel: '7天盈亏',
    tomanEquivalent: '伊朗土曼 (IRT) 折算',
    conversionResultTitle: '精准汇率换算结果',
    unitRateLabel: '单价汇率 (1单位)',
    guideText:
      '📖 **ArzPulse Pro 使用指南：**\n\n' +
      '• 点击“货币与加密币价格”查看实时汇率、涨跌幅及盈亏走势图。\n' +
      '• 点击“汇率精准换算”进行任意金额互转（如美元转波场 TRX）。\n' +
      '• 支持添加到 Telegram 群组与频道使用。',
    creatorText: '👨‍💻 **开发者 GitHub 与官方 TON / TRON 钱包地址：**',
    ownerCredentialsText: '👑 **所有者专属 Web 管理后台账号与密码：**',
  },
  tr: {
    dir: 'ltr',
    langName: 'Türkçe 🇹🇷',
    welcomeTitle: 'ArzPulse Pro Döviz ve Kripto Botuna Hoş Geldiniz!',
    welcomeSub: 'Lütfen aşağıdaki renkli klavye menüsünden bir işlem seçin:',
    btnPrice: '📊 Döviz ve Kripto Fiyatı',
    btnConvert: '🔄 Döviz ve Kripto Çevirici',
    btnLanguage: '🌐 Dil Değiştir (Language)',
    btnSupport: '🎧 Canlı Destek',
    btnGuide: '📖 Bot Rehberi',
    btnCreator: '👨‍💻 Yapımcı ve Bağış',
    btnMiniApp: '🚀 Profesyonel Mini App',
    btnOwnerPanel: '👑 Sahip Yönetim Paneli',
    btnAddToGroup: '➕ Gruba / Kanala Ekle',
    askPriceAsset: '🔍 Lütfen para birimi veya kripto adını girin (Örn: USD, TRX, TON, BTC, TRY):',
    askConvertFirst: '1️⃣ Lütfen **Kaynak Para Birimini** girin (Örn: USD veya Dolar):',
    askConvertSecond: '2️⃣ Harika! Şimdi **Hedef Para Birimini** girin (Örn: TRX veya TRON):',
    askConvertAmount: '🔢 Çevirmek istediğiniz **Miktarı** girin (Örn: 1 veya 100):',
    askSupportMsg: '💬 Destek mesajınızı yazın, bot sahibi size doğrudan yanıt verecektir:',
    supportReceived: '✅ Mesajınız Sahip Web Paneline başarıyla iletildi.',
    notFoundAsset: '⚠️ Para birimi bulunamadı! Lütfen USD, TRX, TON, BTC, TRY, EUR deneyin.',
    priceCardTitle: 'Canlı Fiyat ve Kar/Zarar (PnL) Grafiği',
    pnl24hLabel: '24s Kar/Zarar',
    pnl7dLabel: '7g Kar/Zarar',
    tomanEquivalent: 'İran Tümeni (IRT) Karşılığı',
    conversionResultTitle: 'Kesin Dönüşüm Sonucu',
    unitRateLabel: 'Birim Kur (1 Birim)',
    guideText:
      '📖 **ArzPulse Pro Kullanım Rehberi:**\n\n' +
      '• Anlık fiyat ve Kar/Zarar grafiği için "Döviz ve Kripto Fiyatı" butonuna tıklayın.\n' +
      '• İki para birimi arasında dönüşüm için "Döviz Çevirici" butonunu kullanın.\n' +
      '• Botu grup ve kanallarınıza ekleyebilirsiniz.',
    creatorText: '👨‍💻 **Geliştirici GitHub ve Resmi TON / TRON Cüzdanları:**',
    ownerCredentialsText: '👑 **Bot Sahibi Web Yönetim Paneli Giriş Bilgileri:**',
  },
};
