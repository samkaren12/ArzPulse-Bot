export type LanguageCode = 'fa' | 'en' | 'ru' | 'ar' | 'zh' | 'tr';

export interface AssetInfo {
  code: string;
  symbol: string;
  type: 'crypto' | 'fiat';
  priceUsd: number;
  priceToman: number;
  change24h: number;
  change7d: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  arzdigitalSlug: string;
  arzdigitalUrl: string;
  names: Record<LanguageCode, string>;
  aliases: string[];
  sparkline: number[];
}

export const TON_WALLET = 'UQAozwWDvLXgp4XWS0t8Z9xYdmN5iJ76anD5XD3y74rdhQP-';
export const TRON_WALLET = 'TBgTK3Png5D467cvCnwfA3xdLvUgJbpAfy';
export const DEFAULT_GITHUB_URL = 'https://github.com/samkaren/ArzPulse-Telegram-Suite';
export const ARZDIGITAL_USD_URL = 'https://arzdigital.com/currencies/united-states-dollar/';

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
    priceToman: 262400,
    change24h: -0.46,
    change7d: -0.98,
    high24h: 263800,
    low24h: 261200,
    volume24h: '$94.2B',
    arzdigitalSlug: 'united-states-dollar',
    arzdigitalUrl: 'https://arzdigital.com/currencies/united-states-dollar/',
    names: {
      fa: 'دلار آمریکا (آزاد)',
      en: 'US Dollar (USD)',
      ru: 'Доллар США (USD)',
      ar: 'الدولار الأمريكي (USD)',
      zh: '美元 (USD)',
      tr: 'ABD Doları (USD)',
    },
    aliases: ['usd', 'dollar', 'دلار', 'دلار امریکا', 'دلار آمریکا', 'دلار آزاد', 'доллар', 'دولار', '美元', 'dolar', '$'],
    sparkline: [264900, 264100, 263500, 263900, 263100, 262800, 262400],
  },
  {
    code: 'TRX',
    symbol: 'TRX',
    type: 'crypto',
    priceUsd: 0.3323,
    priceToman: 87118,
    change24h: -0.59,
    change7d: 4.82,
    high24h: 0.3385,
    low24h: 0.327,
    volume24h: '$1.42B',
    arzdigitalSlug: 'tron',
    arzdigitalUrl: 'https://arzdigital.com/coins/tron/',
    names: {
      fa: 'ترون (TRX)',
      en: 'TRON (TRX)',
      ru: 'Трон (TRX)',
      ar: 'ترون (TRX)',
      zh: '波场 (TRX)',
      tr: 'TRON (TRX)',
    },
    aliases: ['trx', 'tron', 'ترون', 'ارز ترون', 'трон', '波场'],
    sparkline: [0.319, 0.324, 0.328, 0.331, 0.335, 0.334, 0.3323],
  },
  {
    code: 'TON',
    symbol: 'TON',
    type: 'crypto',
    priceUsd: 1.3297,
    priceToman: 348578,
    change24h: -1.62,
    change7d: -9.11,
    high24h: 1.365,
    low24h: 1.305,
    volume24h: '$369M',
    arzdigitalSlug: 'gram',
    arzdigitalUrl: 'https://arzdigital.com/coins/gram/',
    names: {
      fa: 'تون کوین (TON)',
      en: 'Toncoin (TON)',
      ru: 'Тонкоин (TON)',
      ar: 'تون كوين (TON)',
      zh: '吨币 (TON)',
      tr: 'Toncoin (TON)',
    },
    aliases: ['ton', 'toncoin', 'gram', 'تون', 'تون کوین', 'تونکوین', 'گرام', 'тон', 'тонкоин', '吨币'],
    sparkline: [1.45, 1.42, 1.39, 1.37, 1.35, 1.34, 1.3297],
  },
  {
    code: 'BTC',
    symbol: '₿',
    type: 'crypto',
    priceUsd: 81091.45,
    priceToman: 21258124476,
    change24h: -0.08,
    change7d: 3.45,
    high24h: 82400.0,
    low24h: 80150.0,
    volume24h: '$42.8B',
    arzdigitalSlug: 'bitcoin',
    arzdigitalUrl: 'https://arzdigital.com/coins/bitcoin/',
    names: {
      fa: 'بیت‌کوین (BTC)',
      en: 'Bitcoin (BTC)',
      ru: 'Биткоин (BTC)',
      ar: 'بيتكوين (BTC)',
      zh: '比特币 (BTC)',
      tr: 'Bitcoin (BTC)',
    },
    aliases: ['btc', 'bitcoin', 'بیت کوین', 'بیتکوین', 'بیت‌کوین', 'биткоин', 'بيتكوين', '比特币'],
    sparkline: [78500, 79200, 80100, 79800, 80900, 81200, 81091.45],
  },
  {
    code: 'ETH',
    symbol: 'Ξ',
    type: 'crypto',
    priceUsd: 2370.12,
    priceToman: 621327429,
    change24h: -1.37,
    change7d: 2.15,
    high24h: 2425.0,
    low24h: 2340.0,
    volume24h: '$18.6B',
    arzdigitalSlug: 'ethereum',
    arzdigitalUrl: 'https://arzdigital.com/coins/ethereum/',
    names: {
      fa: 'اتریوم (ETH)',
      en: 'Ethereum (ETH)',
      ru: 'Эфириум (ETH)',
      ar: 'إيثريوم (ETH)',
      zh: '以太坊 (ETH)',
      tr: 'Ethereum (ETH)',
    },
    aliases: ['eth', 'ethereum', 'اتریوم', 'اتر', 'эфириум', 'إيثريوم', '以太坊'],
    sparkline: [2410, 2402, 2395, 2388, 2382, 2375, 2370.12],
  },
  {
    code: 'USDT',
    symbol: '₮',
    type: 'crypto',
    priceUsd: 0.9987,
    priceToman: 262152,
    change24h: 0.01,
    change7d: -0.3,
    high24h: 1.0005,
    low24h: 0.998,
    volume24h: '$68.5B',
    arzdigitalSlug: 'tether',
    arzdigitalUrl: 'https://arzdigital.com/coins/tether/',
    names: {
      fa: 'تتر (USDT)',
      en: 'Tether (USDT)',
      ru: 'Тезер (USDT)',
      ar: 'تيثر (USDT)',
      zh: '泰达币 (USDT)',
      tr: 'Tether (USDT)',
    },
    aliases: ['usdt', 'tether', 'تتر', 'دلار تتر', 'тезер', 'تيثر', '泰达币'],
    sparkline: [263100, 262900, 262700, 262500, 262400, 262250, 262152],
  },
  {
    code: 'IRT',
    symbol: 'تومان',
    type: 'fiat',
    priceUsd: 1 / 262400,
    priceToman: 1,
    change24h: 0.46,
    change7d: 0.98,
    high24h: 1 / 261200,
    low24h: 1 / 263800,
    volume24h: '$410M',
    arzdigitalSlug: 'united-states-dollar',
    arzdigitalUrl: 'https://arzdigital.com/currencies/united-states-dollar/',
    names: {
      fa: 'تومان ایران (IRT)',
      en: 'Iranian Toman (IRT)',
      ru: 'Иранский туман (IRT)',
      ar: 'التومان الإيراني (IRT)',
      zh: '伊朗土曼 (IRT)',
      tr: 'İran Tümeni (IRT)',
    },
    aliases: ['irt', 'irr', 'toman', 'rial', 'تومان', 'ریال', 'ایران', 'پول ایران', 'туман', 'تومان إيراني', '土曼', 'tümen'],
    sparkline: [264900, 264100, 263500, 263900, 263100, 262800, 262400],
  },
  {
    code: 'EUR',
    symbol: '€',
    type: 'fiat',
    priceUsd: 1.1237,
    priceToman: 294860,
    change24h: -0.46,
    change7d: 0.85,
    high24h: 1.129,
    low24h: 1.118,
    volume24h: '$31.2B',
    arzdigitalSlug: 'euro',
    arzdigitalUrl: 'https://arzdigital.com/currencies/euro/',
    names: {
      fa: 'یورو اروپا (EUR)',
      en: 'Euro (EUR)',
      ru: 'Евро (EUR)',
      ar: 'اليورو (EUR)',
      zh: '欧元 (EUR)',
      tr: 'Euro (EUR)',
    },
    aliases: ['eur', 'euro', 'یورو', 'евро', 'يورو', '欧元', '€'],
    sparkline: [296200, 295900, 295500, 295300, 295100, 294950, 294860],
  },
  {
    code: 'RUB',
    symbol: '₽',
    type: 'fiat',
    priceUsd: 0.01189,
    priceToman: 3120,
    change24h: -0.48,
    change7d: -1.15,
    high24h: 0.01205,
    low24h: 0.01175,
    volume24h: '$4.8B',
    arzdigitalSlug: 'russian-ruble',
    arzdigitalUrl: 'https://arzdigital.com/currencies/russian-ruble/',
    names: {
      fa: 'روبل روسیه (RUB)',
      en: 'Russian Ruble (RUB)',
      ru: 'Российский рубль (RUB)',
      ar: 'الروبل الروسي (RUB)',
      zh: '俄罗斯卢布 (RUB)',
      tr: 'Rus Rublesi (RUB)',
    },
    aliases: ['rub', 'ruble', 'روبل', 'روبل روسیه', 'рубль', 'روبل روسي', '卢布'],
    sparkline: [3150, 3145, 3140, 3135, 3130, 3125, 3120],
  },
  {
    code: 'TRY',
    symbol: '₺',
    type: 'fiat',
    priceUsd: 0.0202,
    priceToman: 5300,
    change24h: -0.38,
    change7d: -0.88,
    high24h: 0.0204,
    low24h: 0.02,
    volume24h: '$5.9B',
    arzdigitalSlug: 'turkish-lira',
    arzdigitalUrl: 'https://arzdigital.com/currencies/turkish-lira/',
    names: {
      fa: 'لیر ترکیه (TRY)',
      en: 'Turkish Lira (TRY)',
      ru: 'Турецкая лира (TRY)',
      ar: 'الليرة التركية (TRY)',
      zh: '土耳其里拉 (TRY)',
      tr: 'Türk Lirası (TRY)',
    },
    aliases: ['try', 'lira', 'لیر', 'لیر ترکیه', 'лира', 'ليرة تركية', '里拉', 'tl', 'türk lirası'],
    sparkline: [5340, 5330, 5325, 5320, 5315, 5305, 5300],
  },
  {
    code: 'CNY',
    symbol: '¥',
    type: 'fiat',
    priceUsd: 0.14947,
    priceToman: 39220,
    change24h: -0.46,
    change7d: 0.54,
    high24h: 0.1505,
    low24h: 0.1485,
    volume24h: '$19.4B',
    arzdigitalSlug: 'chinese-yuan',
    arzdigitalUrl: 'https://arzdigital.com/currencies/chinese-yuan/',
    names: {
      fa: 'یوان چین (CNY)',
      en: 'Chinese Yuan (CNY)',
      ru: 'Китайский юань (CNY)',
      ar: 'اليوان الصيني (CNY)',
      zh: '人民币 (CNY)',
      tr: 'Çin Yuanı (CNY)',
    },
    aliases: ['cny', 'rmb', 'yuan', 'یوان', 'یوان چین', 'юань', 'يوان', '人民币', '元'],
    sparkline: [39450, 39400, 39360, 39320, 39280, 39250, 39220],
  },
  {
    code: 'AED',
    symbol: 'د.إ',
    type: 'fiat',
    priceUsd: 0.27489,
    priceToman: 72130,
    change24h: -0.46,
    change7d: -0.95,
    high24h: 0.276,
    low24h: 0.2735,
    volume24h: '$6.2B',
    arzdigitalSlug: 'united-arab-emirates-dirham',
    arzdigitalUrl: 'https://arzdigital.com/currencies/united-arab-emirates-dirham/',
    names: {
      fa: 'درهم امارات (AED)',
      en: 'UAE Dirham (AED)',
      ru: 'Дирхам ОАЭ (AED)',
      ar: 'الدرهم الإماراتي (AED)',
      zh: '阿联酋迪拉姆 (AED)',
      tr: 'BAE Dirhemi (AED)',
    },
    aliases: ['aed', 'dirham', 'درهم', 'درهم امارات', 'дирхам', 'درهم إماراتي', '迪拉姆'],
    sparkline: [72600, 72500, 72420, 72350, 72280, 72200, 72130],
  },
  {
    code: 'GBP',
    symbol: '£',
    type: 'fiat',
    priceUsd: 1.32965,
    priceToman: 348900,
    change24h: -0.46,
    change7d: 0.62,
    high24h: 1.336,
    low24h: 1.322,
    volume24h: '$14.1B',
    arzdigitalSlug: 'pound-sterling',
    arzdigitalUrl: 'https://arzdigital.com/currencies/pound-sterling/',
    names: {
      fa: 'پوند انگلیس (GBP)',
      en: 'British Pound (GBP)',
      ru: 'Фунт стерлингов (GBP)',
      ar: 'الجنيه الإسترليني (GBP)',
      zh: '英镑 (GBP)',
      tr: 'İngiliz Sterlini (GBP)',
    },
    aliases: ['gbp', 'pound', 'پوند', 'پوند انگلیس', 'фунт', 'جنيه إسترليني', '英镑', 'sterlin', '£'],
    sparkline: [350400, 350100, 349800, 349500, 349200, 349050, 348900],
  },
  {
    code: 'CAD',
    symbol: 'C$',
    type: 'fiat',
    priceUsd: 0.70633,
    priceToman: 185340,
    change24h: -0.46,
    change7d: -0.35,
    high24h: 0.71,
    low24h: 0.702,
    volume24h: '$8.4B',
    arzdigitalSlug: 'canadian-dollar',
    arzdigitalUrl: 'https://arzdigital.com/currencies/canadian-dollar/',
    names: {
      fa: 'دلار کانادا (CAD)',
      en: 'Canadian Dollar (CAD)',
      ru: 'Канадский доллар (CAD)',
      ar: 'الدولار الكندي (CAD)',
      zh: '加元 (CAD)',
      tr: 'Kanada Doları (CAD)',
    },
    aliases: ['cad', 'دلار کانادا', 'کانادا', 'канадский доллар', 'دولار كندي', '加元'],
    sparkline: [186200, 186000, 185850, 185700, 185550, 185420, 185340],
  },
  {
    code: 'IQD',
    symbol: 'ع.د',
    type: 'fiat',
    priceUsd: 0.00065865,
    priceToman: 172.83,
    change24h: -0.46,
    change7d: -0.9,
    high24h: 0.000665,
    low24h: 0.000652,
    volume24h: '$1.1B',
    arzdigitalSlug: 'iraqi-dinar',
    arzdigitalUrl: 'https://arzdigital.com/currencies/iraqi-dinar/',
    names: {
      fa: 'دینار عراق (IQD)',
      en: 'Iraqi Dinar (IQD)',
      ru: 'Иракский динар (IQD)',
      ar: 'الدينار العراقي (IQD)',
      zh: '伊拉克第纳尔 (IQD)',
      tr: 'Irak Dinarı (IQD)',
    },
    aliases: ['iqd', 'dinar', 'دینار', 'دینار عراق', 'динар', 'دينار عراقي', '第纳尔'],
    sparkline: [173.8, 173.6, 173.4, 173.2, 173.0, 172.9, 172.83],
  },
  {
    code: 'KWD',
    symbol: 'د.ك',
    type: 'fiat',
    priceUsd: 3.2173,
    priceToman: 844220,
    change24h: -0.45,
    change7d: -0.82,
    high24h: 3.23,
    low24h: 3.205,
    volume24h: '$1.9B',
    arzdigitalSlug: 'kuwaiti-dinar',
    arzdigitalUrl: 'https://arzdigital.com/currencies/kuwaiti-dinar/',
    names: {
      fa: 'دینار کویت (KWD)',
      en: 'Kuwaiti Dinar (KWD)',
      ru: 'Кувейтский динар (KWD)',
      ar: 'الدينار الكويتي (KWD)',
      zh: '科威特第纳尔 (KWD)',
      tr: 'Kuveyt Dinarı (KWD)',
    },
    aliases: ['kwd', 'kuwait', 'دینار کویت', 'کویت', 'دينار كويتي', '科威特第纳尔'],
    sparkline: [848000, 847200, 846500, 845900, 845200, 844700, 844220],
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

export function getAssetTomanPrice(asset: AssetInfo, assets: AssetInfo[] = INITIAL_ASSETS): number {
  if (asset.code === 'IRT') return 1;
  if (Number.isFinite(asset.priceToman) && asset.priceToman > 0) {
    return asset.priceToman;
  }
  const usdAsset = assets.find((a) => a.code === 'USD');
  const usdToman = usdAsset?.priceToman || 262400;
  return asset.priceUsd * usdToman;
}

export async function fetchArzDigitalLiveRates(
  currentAssets: AssetInfo[] = INITIAL_ASSETS
): Promise<{
  assets: AssetInfo[];
  usdToman: number;
  updatedCount: number;
  source: string;
}> {
  let updatedCount = 0;
  let liveUsdToman = currentAssets.find((a) => a.code === 'USD')?.priceToman || 262400;
  const slugMap = new Map<string, any>();

  const uniqueSlugs = Array.from(new Set(currentAssets.map((a) => a.arzdigitalSlug)));

  await Promise.allSettled(
    uniqueSlugs.map(async (slug) => {
      const res = await fetch(`https://lake.arzdigital.com/web/api/v1/pub/coins/${slug}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json?.status === 'success' && json?.data) {
        slugMap.set(slug, json.data);
        updatedCount++;
      }
    })
  );

  const usdData = slugMap.get('united-states-dollar');
  if (usdData?.toman && Number(usdData.toman) > 0) {
    liveUsdToman = Number(usdData.toman);
  }

  const nextAssets = currentAssets.map((item) => {
    if (item.code === 'IRT') {
      const chg24 = usdData?.price_change_percent_irt_24h
        ? -Number(Number(usdData.price_change_percent_irt_24h).toFixed(2))
        : item.change24h;
      return {
        ...item,
        priceUsd: 1 / liveUsdToman,
        priceToman: 1,
        change24h: chg24,
      };
    }

    const d = slugMap.get(item.arzdigitalSlug);
    if (!d) return item;

    const newUsd = Number(d.usd) > 0 ? Number(d.usd) : item.priceUsd;
    const newToman = Number(d.toman) > 0 ? Number(d.toman) : newUsd * liveUsdToman;

    const rawChange24 =
      d.type === 'fiat' || item.code === 'USD'
        ? d.price_change_percent_irt_24h ?? d.price_change_percent_24h
        : d.price_change_percent_24h ?? d.price_change_percent_irt_24h;

    const rawChange7d =
      d.type === 'fiat' || item.code === 'USD'
        ? d.price_change_percent_irt_7d ?? d.price_change_percent_7d
        : d.price_change_percent_7d ?? d.price_change_percent_irt_7d;

    const nextChange24 = Number.isFinite(Number(rawChange24))
      ? Number(Number(rawChange24).toFixed(2))
      : item.change24h;
    const nextChange7d = Number.isFinite(Number(rawChange7d))
      ? Number(Number(rawChange7d).toFixed(2))
      : item.change7d;

    return {
      ...item,
      priceUsd: newUsd,
      priceToman: newToman,
      change24h: nextChange24,
      change7d: nextChange7d,
    };
  });

  return {
    assets: nextAssets,
    usdToman: liveUsdToman,
    updatedCount,
    source: ARZDIGITAL_USD_URL,
  };
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
  tomanValue: number;
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

  const fromToman = getAssetTomanPrice(fromAsset, assets);
  const toToman = getAssetTomanPrice(toAsset, assets);

  let unitRate: number;
  if (fromAsset.code === 'IRT' || toAsset.code === 'IRT') {
    unitRate = fromToman / toToman;
  } else {
    unitRate = fromAsset.priceUsd / toAsset.priceUsd;
  }

  const reverseRate = 1 / unitRate;
  const convertedAmount = amount * unitRate;
  const usdValue = amount * fromAsset.priceUsd;
  const tomanValue = amount * fromToman;

  return {
    amount,
    fromAsset,
    toAsset,
    unitRate,
    reverseRate,
    convertedAmount,
    usdValue,
    tomanValue,
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
    welcomeSub: 'تمامی قیمت‌های دلار، ارزهای دولتی و کریپتو به‌صورت زنده از ArzDigital.com دریافت می‌شوند:',
    btnPrice: '📊 قیمت واحد پول یا ارز',
    btnConvert: '🔄 تبدیل ارز و واحد پول',
    btnLanguage: '🌐 تغییر زبان (Language)',
    btnSupport: '🎧 پشتیبانی آنلاین',
    btnGuide: '📖 راهنمای ربات',
    btnCreator: '👨‍💻 سازنده و دونیت',
    btnMiniApp: '🚀 مینی‌اپ فوق حرفه‌ای',
    btnOwnerPanel: '👑 مدیریت مالک (وب‌پنل)',
    btnAddToGroup: '➕ افزودن به گروه یا کانال',
    askPriceAsset: '🔍 لطفاً نام ارز دیجیتال یا واحد پول مورد نظر را وارد کنید (مثلاً: دلار، ترون، بیت کوین، تون، یورو، درهم، لیر، دینار، TRX، USD):',
    askConvertFirst: '1️⃣ لطفاً نام **ارز یا واحد پول مبدا** را وارد کنید (مثلاً: دلار، تومان، ترون، USD):',
    askConvertSecond: '2️⃣ عالی! حالا نام **ارز یا واحد پول مقصد** را وارد کنید (مثلاً: ترون، تومان، دلار، TRX):',
    askConvertAmount: '🔢 چه تعداد می‌خواهید تبدیل کنید؟ (مثلاً عدد 1 یا 100 را بفرستید):',
    askSupportMsg: '💬 پیام، سوال یا درخواست خود را بنویسید؛ مستقیماً برای مالک ربات ارسال می‌شود و در همین‌جا پاسخ دریافت خواهید کرد:',
    supportReceived: '✅ پیام شما با موفقیت ثبت شد و به پنل مدیریت مالک ارسال گردید. به‌زودی پاسخ داده می‌شود.',
    notFoundAsset: '⚠️ ارز یا واحد پول وارد شده یافت نشد! لطفاً نامی مثل دلار، ترون، تون، بیت کوین، تتر، یورو، درهم، لیر، پوند، دینار یا روبل وارد کنید.',
    priceCardTitle: 'گزارش لحظه‌ای قیمت و نمودار سود و زیان (ArzDigital)',
    pnl24hLabel: 'سود/زیان ۲۴ ساعته',
    pnl7dLabel: 'سود/زیان ۷ روزه',
    tomanEquivalent: 'نرخ دقیق تومانی (ArzDigital)',
    conversionResultTitle: 'نتیجه دقیق تبدیل ارز (نرخ لحظه‌ای ArzDigital)',
    unitRateLabel: 'نرخ واحد (۱ واحد)',
    guideText:
      '📖 **راهنمای کامل ربات ArzPulse Pro:**\n\n' +
      '1️⃣ **قیمت و نمودار سود/زیان (متصل به ArzDigital.com):** دکمه «قیمت واحد پول یا ارز» را بزنید و نام ارز (مثل دلار، ترون، بیت‌کوین، درهم، یورو) را بفرستید تا قیمت دقیق دلاری و تومانی + درصد سود/زیان + تصویر نمودار اختصاصی برایتان ارسال شود.\n' +
      '2️⃣ **تبدیل دقیق ارزها:** دکمه «تبدیل ارز» را بزنید، ارز اول (مثلاً دلار)، سپس ارز دوم (مثلاً ترون یا تومان) و مقدار را وارد کنید.\n' +
      '3️⃣ **استفاده در گروه و کانال:** ربات را به گروه یا کانال خود اضافه کنید و از دستورات `/price usd` یا `/convert 1 usd trx` استفاده نمایید.\n' +
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
    welcomeSub: 'Live Fiat, USD/IRT & Crypto prices powered by ArzDigital.com. Select a service below:',
    btnPrice: '📊 Currency & Crypto Price',
    btnConvert: '🔄 Currency Converter',
    btnLanguage: '🌐 Change Language',
    btnSupport: '🎧 Live Support',
    btnGuide: '📖 Bot Guide',
    btnCreator: '👨‍💻 Creator & Donate',
    btnMiniApp: '🚀 Launch Pro Mini App',
    btnOwnerPanel: '👑 Owner Admin Panel',
    btnAddToGroup: '➕ Add to Group / Channel',
    askPriceAsset: '🔍 Please enter the name or ticker of the currency/crypto (e.g., USD, TRX, TON, BTC, EUR, AED, GBP, IRT):',
    askConvertFirst: '1️⃣ Enter the **Source Currency / Crypto** (e.g., USD or Dollar):',
    askConvertSecond: '2️⃣ Great! Now enter the **Target Currency / Crypto** (e.g., TRX or TRON):',
    askConvertAmount: '🔢 Enter the **Amount** to convert (e.g., 1, 10, 250):',
    askSupportMsg: '💬 Type your message for support. The owner will reply directly to your chat:',
    supportReceived: '✅ Your support ticket has been delivered to the Owner Web Panel.',
    notFoundAsset: '⚠️ Currency or crypto not found! Try USD, TRX, TON, BTC, ETH, USDT, EUR, RUB, TRY, CNY, AED, GBP, CAD, IQD, KWD, IRT.',
    priceCardTitle: 'Live ArzDigital Market Price & PnL Chart',
    pnl24hLabel: '24h Profit/Loss',
    pnl7dLabel: '7d Profit/Loss',
    tomanEquivalent: 'ArzDigital Toman (IRT) Rate',
    conversionResultTitle: 'Accurate Conversion Result (ArzDigital Live)',
    unitRateLabel: 'Unit Rate (1 Unit)',
    guideText:
      '📖 **ArzPulse Pro Complete Guide:**\n\n' +
      '• **Price & PnL Chart:** Tap "Currency & Crypto Price", send any symbol (e.g. USD, TRX, BTC) to receive real-time pricing from ArzDigital.com + 24h/7d PnL + generated chart image.\n' +
      '• **Converter:** Tap "Currency Converter", enter currency 1 (e.g. USD), currency 2 (e.g. TRX), and any amount.\n' +
      '• **Groups & Channels:** Add the bot to any group/channel and run `/price usd` or `/convert 50 usd trx`.',
    creatorText: '👨‍💻 **Developer & Official Crypto Wallets (GitHub Verified):**',
    ownerCredentialsText: '👑 **Owner Management Console & Web Panel Credentials:**',
  },
  ru: {
    dir: 'ltr',
    langName: 'Русский 🇷🇺',
    welcomeTitle: 'Добро пожаловать в ArzPulse Pro — бот валют и криптовалют!',
    welcomeSub: 'Точные курсы валют и крипто с ArzDigital.com. Выберите услугу ниже:',
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
    priceCardTitle: 'Текущий курс ArzDigital и график PnL',
    pnl24hLabel: 'Прибыль/Убыток 24ч',
    pnl7dLabel: 'Прибыль/Убыток 7д',
    tomanEquivalent: 'Курс в туманах (IRT - ArzDigital)',
    conversionResultTitle: 'Точный результат конвертации',
    unitRateLabel: 'Курс за 1 единицу',
    guideText:
      '📖 **Руководство ArzPulse Pro:**\n\n' +
      '• Нажмите «Курс валют», чтобы получить точный курс с ArzDigital.com и график прибыли/убытка.\n' +
      '• Нажмите «Конвертер валют» для перевода любой суммы (например USD в TRX).\n' +
      '• Добавляйте бота в группы и каналы (`/price ton`, `/convert 10 usd trx`).',
    creatorText: '👨‍💻 **Разработчик, GitHub и кошельки TON / TRON:**',
    ownerCredentialsText: '👑 **Панель управления владельца (Логин и пароль веб-панели):**',
  },
  ar: {
    dir: 'rtl',
    langName: 'العربية 🇸🇦',
    welcomeTitle: 'مرحباً بك في بوت ArzPulse Pro للعملات والكريبتو!',
    welcomeSub: 'أسعار مباشرة ودقيقة من موقع ArzDigital.com. اختر الخدمة من لوحة المفاتيح الملونة:',
    btnPrice: '📊 أسعار العملات والكريبتو',
    btnConvert: '🔄 محول العملات الدقيق',
    btnLanguage: '🌐 تغيير اللغة',
    btnSupport: '🎧 الدعم الفني',
    btnGuide: '📖 دليل البوت',
    btnCreator: '👨‍💻 المطور والتبرع',
    btnMiniApp: '🚀 تطبيق Mini App الاحترافي',
    btnOwnerPanel: '👑 لوحة تحكم المالك',
    btnAddToGroup: '➕ أضف إلى مجموعة أو قناة',
    askPriceAsset: '🔍 أرسل اسم العملة أو الرمز (مثل: دولار، ترون، تون، بيتكوين، درهم، دينار، USD، TRX):',
    askConvertFirst: '1️⃣ أرسل اسم **العملة الأولى** (مثل: دولار أو USD):',
    askConvertSecond: '2️⃣ ممتاز! الآن أرسل اسم **العملة الثانية** (مثل: ترون أو TRX):',
    askConvertAmount: '🔢 أرسل **المبلغ** المراد تحويله (مثلاً: 1 أو 50):',
    askSupportMsg: '💬 اكتب رسالتك لفريق الدعم وسيتم الرد عليك مباشرة:',
    supportReceived: '✅ تم إرسال رسالتك إلى لوحة تحكم المالك بنجاح.',
    notFoundAsset: '⚠️ لم يتم العثور على العملة! جرب USD أو TRX أو TON أو BTC أو AED أو IQD أو KWD أو EUR.',
    priceCardTitle: 'السعر المباشر وشارت الأرباح والخسائر (ArzDigital)',
    pnl24hLabel: 'الربح/الخسارة 24 ساعة',
    pnl7dLabel: 'الربح/الخسارة 7 أيام',
    tomanEquivalent: 'المعادل بالتومان الإيراني (ArzDigital)',
    conversionResultTitle: 'نتيجة التحويل الدقيقة',
    unitRateLabel: 'سعر الوحدة الواحدة',
    guideText:
      '📖 **دليل استخدام البوت:**\n\n' +
      '• اضغط على أسعار العملات لمعرفة السعر الفوري من ArzDigital.com مع رسم بياني للأرباح والخسائر.\n' +
      '• اضغط على محول العملات لتحويل أي مبلغ بين العملات الرقمية والعالمية.\n' +
      '• يمكنك إضافة البوت لمجموعتك أو قناتك.',
    creatorText: '👨‍💻 **حساب GitHub للمطور ومحافظ TON و TRON الرسمية:**',
    ownerCredentialsText: '👑 **بيانات الدخول إلى لوحة التحكم الويب للمالك:**',
  },
  zh: {
    dir: 'ltr',
    langName: 'Chinese (ZH) 🇨🇳',
    welcomeTitle: 'Welcome to ArzPulse Pro (ZH / Chinese Mode)!',
    welcomeSub: '实时精准汇率与加密货币数据源自 ArzDigital.com，请从下方彩色键盘菜单中选择服务：',
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
    priceCardTitle: '实时价格与盈亏走势图 (ArzDigital PnL)',
    pnl24hLabel: '24小时盈亏',
    pnl7dLabel: '7天盈亏',
    tomanEquivalent: '伊朗土曼 (IRT - ArzDigital) 折算',
    conversionResultTitle: '精准汇率换算结果',
    unitRateLabel: '单价汇率 (1单位)',
    guideText:
      '📖 **ArzPulse Pro 使用指南：**\n\n' +
      '• 点击“货币与加密币价格”查看 ArzDigital.com 实时汇率、涨跌幅及盈亏走势图。\n' +
      '• 点击“汇率精准换算”进行任意金额互转（如美元转波场 TRX）。\n' +
      '• 支持添加到 Telegram 群组与频道使用。',
    creatorText: '👨‍💻 **开发者 GitHub 与官方 TON / TRON 钱包地址：**',
    ownerCredentialsText: '👑 **所有者专属 Web 管理后台账号与密码：**',
  },
  tr: {
    dir: 'ltr',
    langName: 'Türkçe 🇹🇷',
    welcomeTitle: 'ArzPulse Pro Döviz ve Kripto Botuna Hoş Geldiniz!',
    welcomeSub: 'ArzDigital.com üzerinden canlı döviz ve kripto kurları. Lütfen aşağıdaki renkli menüden seçin:',
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
    priceCardTitle: 'Canlı ArzDigital Fiyat ve Kar/Zarar (PnL) Grafiği',
    pnl24hLabel: '24s Kar/Zarar',
    pnl7dLabel: '7g Kar/Zarar',
    tomanEquivalent: 'İran Tümeni (IRT - ArzDigital) Karşılığı',
    conversionResultTitle: 'Kesin Dönüşüm Sonucu',
    unitRateLabel: 'Birim Kur (1 Birim)',
    guideText:
      '📖 **ArzPulse Pro Kullanım Rehberi:**\n\n' +
      '• ArzDigital.com anlık fiyat ve Kar/Zarar grafiği için "Döviz ve Kripto Fiyatı" butonuna tıklayın.\n' +
      '• İki para birimi arasında dönüşüm için "Döviz Çevirici" butonunu kullanın.\n' +
      '• Botu grup ve kanallarınıza ekleyebilirsiniz.',
    creatorText: '👨‍💻 **Geliştirici GitHub ve Resmi TON / TRON Cüzdanları:**',
    ownerCredentialsText: '👑 **Bot Sahibi Web Yönetim Paneli Giriş Bilgileri:**',
  },
};
