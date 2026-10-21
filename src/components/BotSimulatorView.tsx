import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Globe,
  Users,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import {
  AssetInfo,
  LanguageCode,
  TRANSLATIONS,
  findAssetByQuery,
  convertCurrency,
  formatCurrencyValue,
  normalizeDigits,
  getAssetTomanPrice,
  ARZDIGITAL_USD_URL,
} from '../utils/currencyEngine';
import { LIVE_INSTALL_SCRIPT_URL } from '../utils/codeGenerators';
import { PnLChartCanvas } from './PnLChartCanvas';

export interface BotMessage {
  id: string;
  sender: 'bot' | 'user' | 'owner_reply';
  senderName?: string;
  text: string;
  timestamp: string;
  chartAsset?: AssetInfo;
  isCredentialsCard?: boolean;
  isCreatorCard?: boolean;
  isGroupCard?: boolean;
}

export interface SupportTicket {
  id: string;
  userName: string;
  userId: string;
  lang: LanguageCode;
  message: string;
  reply?: string;
  status: 'open' | 'answered';
  createdAt: string;
}

interface BotSimulatorViewProps {
  lang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  assets: AssetInfo[];
  onOpenMiniApp: () => void;
  onOpenAdminPanel: () => void;
  adminUsername: string;
  adminPassword: string;
  githubUrl: string;
  tonWallet: string;
  tronWallet: string;
  tickets: SupportTicket[];
  onAddTicket: (msg: string) => void;
  onSyncArzDigital?: () => void;
  isSyncingArzDigital?: boolean;
  lastArzSyncTime?: string;
}

type BotFSMState =
  | 'idle'
  | 'choosing_lang'
  | 'waiting_price_asset'
  | 'convert_step1_from'
  | 'convert_step2_to'
  | 'convert_step3_amount'
  | 'waiting_support';

export const BotSimulatorView: React.FC<BotSimulatorViewProps> = ({
  lang,
  onChangeLang,
  assets,
  onOpenMiniApp,
  onOpenAdminPanel,
  adminUsername,
  adminPassword,
  githubUrl,
  tonWallet,
  tronWallet,
  tickets,
  onAddTicket,
  onSyncArzDigital,
  isSyncingArzDigital = false,
  lastArzSyncTime = 'Live',
}) => {
  const t = TRANSLATIONS[lang];
  const [chatMode, setChatMode] = useState<'private' | 'group'>('private');
  const [fsmState, setFsmState] = useState<BotFSMState>('idle');
  const [convFrom, setConvFrom] = useState<string>('USD');
  const [convTo, setConvTo] = useState<string>('TRX');
  const [inputText, setInputText] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [simBotUsername, setSimBotUsername] = useState<string>('ArzPulseProBot');

  const usdAsset = assets.find((a) => a.code === 'USD') || assets[0];

  const formatFullRatesBoardText = () => {
    const lines = [
      '📊 **تابلوی لحظه‌ای نرخ ارز و کریپتو (ArzDigital Live)**',
      '━━━━━━━━━━━━━━━━━━━━',
    ];
    assets.slice(0, 12).forEach((a) => {
      const toman = getAssetTomanPrice(a, assets);
      const icon = a.change24h >= 0 ? '🟢' : '🔴';
      const sign = a.change24h >= 0 ? '+' : '';
      lines.push(
        `${icon} **${a.names[lang]} (${a.code}):** ${formatCurrencyValue(toman)} تومان | $${formatCurrencyValue(a.priceUsd)} (${sign}${a.change24h.toFixed(2)}%)`
      );
    });
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📡 **منبع زنده:** arzdigital.com');
    lines.push('💡 دستورات گروه و کانال: `نرخ ارز` | `قیمت دلار` | `تبدیل 10 دلار به ترون`');
    return lines.join('\n');
  };

  const [messages, setMessages] = useState<BotMessage[]>(() => {
    const trxAsset = assets.find((a) => a.code === 'TRX') || assets[1];
    const tomanVal = getAssetTomanPrice(trxAsset, assets);
    const isUp = trxAsset.change24h >= 0;
    return [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: `${TRANSLATIONS[lang].welcomeTitle}\n\n${TRANSLATIONS[lang].welcomeSub}`,
        timestamp: '10:00',
      },
      {
        id: 'sample-price',
        sender: 'bot',
        text:
          `📊 **${TRANSLATIONS[lang].priceCardTitle} — ${trxAsset.names[lang]}**\n` +
          `🇮🇷 ${TRANSLATIONS[lang].tomanEquivalent}: **${formatCurrencyValue(tomanVal)} تومان**\n` +
          `💵 Price (USD): **$${formatCurrencyValue(trxAsset.priceUsd)}**\n` +
          `📈 ${TRANSLATIONS[lang].pnl24hLabel}: ${isUp ? '+' : ''}${trxAsset.change24h}% (${isUp ? 'Profit' : 'Loss'})\n` +
          `📊 ${TRANSLATIONS[lang].pnl7dLabel}: ${trxAsset.change7d >= 0 ? '+' : ''}${trxAsset.change7d}%\n` +
          `📡 منبع: arzdigital.com`,
        timestamp: '10:01',
        chartAsset: trxAsset,
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const copyToClipboard = (val: string, key: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const appendMessages = (...newMsgs: BotMessage[]) => {
    setMessages((prev) => [...prev, ...newMsgs]);
  };

  const nowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handlePriceQuery = (query: string, userEcho?: string) => {
    const userMsg: BotMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userEcho || query,
      timestamp: nowTime(),
    };
    const found = findAssetByQuery(query, assets);
    if (!found) {
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.notFoundAsset,
        timestamp: nowTime(),
      });
      return;
    }

    const isProfit = found.change24h >= 0;
    const pnlSign = isProfit ? '+' : '';
    const tomanPrice = getAssetTomanPrice(found, assets);

    const replyMsg: BotMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      text:
        `📊 **${t.priceCardTitle}**\n` +
        `🏷 **${found.names[lang]} (${found.code})**\n\n` +
        `🇮🇷 **${t.tomanEquivalent}:** ${formatCurrencyValue(tomanPrice)} تومان\n` +
        `💵 **USD Price:** $${formatCurrencyValue(found.priceUsd)}\n` +
        `${isProfit ? '🟢' : '🔴'} **${t.pnl24hLabel}:** ${pnlSign}${found.change24h.toFixed(2)}%\n` +
        `📈 **${t.pnl7dLabel}:** ${found.change7d >= 0 ? '+' : ''}${found.change7d.toFixed(2)}%\n` +
        `📡 **Source:** arzdigital.com`,
      timestamp: nowTime(),
      chartAsset: found,
    };

    appendMessages(userMsg, replyMsg);
    setFsmState('idle');
  };

  const handleKeyboardButtonClick = (action: string, label: string) => {
    const userMsg: BotMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: label,
      timestamp: nowTime(),
    };

    if (action === 'start') {
      setFsmState('idle');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: `${t.welcomeTitle}\n\n${t.welcomeSub}`,
        timestamp: nowTime(),
      });
      return;
    }

    if (action === 'price') {
      setFsmState('waiting_price_asset');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.askPriceAsset,
        timestamp: nowTime(),
      });
      return;
    }

    if (action === 'convert') {
      setFsmState('convert_step1_from');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.askConvertFirst,
        timestamp: nowTime(),
      });
      return;
    }

    if (action === 'lang') {
      setFsmState('choosing_lang');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: '🌐 Select your preferred language / زبان مورد نظر خود را از کیبورد انتخاب کنید:',
        timestamp: nowTime(),
      });
      return;
    }

    if (action === 'support') {
      setFsmState('waiting_support');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.askSupportMsg,
        timestamp: nowTime(),
      });
      return;
    }

    if (action === 'guide') {
      setFsmState('idle');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.guideText,
        timestamp: nowTime(),
      });
      return;
    }

    if (action === 'creator') {
      setFsmState('idle');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.creatorText,
        timestamp: nowTime(),
        isCreatorCard: true,
      });
      return;
    }

    if (action === 'group') {
      setChatMode('group');
      setFsmState('idle');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text:
          '➕ **افزودن ربات به گروه و کانال تلگرام (Group & Channel Integration)**\n\n' +
          '✅ اکنون ربات هم از **گروه‌ها (`startgroup`)** و هم از **کانال‌ها (`startchannel` + `@router.channel_post`)** و انتخابگر بومی تلگرام (`KeyboardButtonRequestChat`) پشتیبانی کامل می‌کند.\n\n' +
          '📋 **دستورات فعال داخل گروه و کانال:**\n' +
          '• `نرخ ارز` یا `/rates` ⬅️ ارسال تابلوی کامل ۱۶ ارز و رمزارز ArzDigital\n' +
          '• `قیمت دلار` یا `قیمت ترون` یا `/price usd` ⬅️ قیمت لحظه‌ای + عکس نمودار سود و زیان\n' +
          '• `تبدیل 10 دلار به ترون` یا `/convert 10 usd trx` ⬅️ تبدیل دقیق ارزها',
        timestamp: nowTime(),
        isGroupCard: true,
      });
      return;
    }

    if (action === 'owner') {
      setFsmState('idle');
      appendMessages(userMsg, {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: t.ownerCredentialsText,
        timestamp: nowTime(),
        isCredentialsCard: true,
      });
      return;
    }

    if (action === 'miniapp') {
      onOpenMiniApp();
    }
  };

  const handleLanguageSelect = (newLang: LanguageCode) => {
    onChangeLang(newLang);
    setFsmState('idle');
    const newT = TRANSLATIONS[newLang];
    appendMessages(
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: newT.langName,
        timestamp: nowTime(),
      },
      {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: `✅ ${newT.langName}\n\n${newT.welcomeTitle}\n${newT.welcomeSub}`,
        timestamp: nowTime(),
      }
    );
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = inputText.trim();
    if (!raw) return;
    setInputText('');

    const clean = normalizeDigits(raw);

    // Check group/channel commands like /start, /rates, نرخ ارز, /price trx, قیمت دلار, /convert 10 usd trx, تبدیل 10 دلار به ترون
    const low = clean.toLowerCase();
    if (low === '/start') {
      handleKeyboardButtonClick('start', '/start');
      return;
    }

    if (['نرخ ارز', 'لیست قیمت', 'قیمت ارزها', 'تابلو ارز', '/rates', 'rates'].includes(low)) {
      appendMessages(
        { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
        {
          id: `b-${Date.now() + 1}`,
          sender: 'bot',
          text: formatFullRatesBoardText(),
          timestamp: nowTime(),
        }
      );
      return;
    }

    for (const prefix of ['/price ', 'قیمت ', 'نرخ ', 'price ']) {
      if (low.startsWith(prefix)) {
        const symbol = clean.slice(prefix.length).trim();
        handlePriceQuery(symbol, raw);
        return;
      }
    }

    const naturalConvMatch = clean.match(/^(?:تبدیل\s+)?([0-9.]+)\s+(.+?)\s+(?:به|to|in)\s+(.+)$/i);
    if (naturalConvMatch) {
      const amt = parseFloat(naturalConvMatch[1]) || 1;
      const res = convertCurrency(amt, naturalConvMatch[2].trim(), naturalConvMatch[3].trim(), assets);
      if (res) {
        appendMessages(
          { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
          {
            id: `b-${Date.now() + 1}`,
            sender: 'bot',
            text:
              `🔄 **${t.conversionResultTitle}**\n\n` +
              `🔢 **${formatCurrencyValue(res.amount)} ${res.fromAsset.names[lang]} (${res.fromAsset.code})** =\n` +
              `✅ **${formatCurrencyValue(res.convertedAmount)} ${res.toAsset.names[lang]} (${res.toAsset.code})**\n` +
              `🇮🇷 **${t.tomanEquivalent}:** ${formatCurrencyValue(res.tomanValue)} تومان\n\n` +
              `📌 ${t.unitRateLabel}: 1 ${res.fromAsset.code} = ${formatCurrencyValue(res.unitRate)} ${res.toAsset.code}`,
            timestamp: nowTime(),
          }
        );
        return;
      }
    }

    if (low.startsWith('/convert ')) {
      const parts = clean.slice(9).trim().split(/\s+/);
      if (parts.length >= 3) {
        const amt = parseFloat(parts[0]);
        const res = convertCurrency(amt, parts[1], parts[2], assets);
        if (res) {
          appendMessages(
            { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
            {
              id: `b-${Date.now() + 1}`,
              sender: 'bot',
              text:
                `🔄 **${t.conversionResultTitle}**\n\n` +
                `🔢 **${formatCurrencyValue(res.amount)} ${res.fromAsset.names[lang]} (${res.fromAsset.code})** =\n` +
                `✅ **${formatCurrencyValue(res.convertedAmount)} ${res.toAsset.names[lang]} (${res.toAsset.code})**\n` +
                `🇮🇷 **${t.tomanEquivalent}:** ${formatCurrencyValue(res.tomanValue)} تومان\n\n` +
                `📌 ${t.unitRateLabel}: 1 ${res.fromAsset.code} = ${formatCurrencyValue(res.unitRate)} ${res.toAsset.code}\n` +
                `🔁 1 ${res.toAsset.code} = ${formatCurrencyValue(res.reverseRate)} ${res.fromAsset.code}`,
              timestamp: nowTime(),
            }
          );
          return;
        }
      }
    }

    // Handle active FSM state
    if (fsmState === 'waiting_price_asset') {
      handlePriceQuery(clean, raw);
      return;
    }

    if (fsmState === 'convert_step1_from') {
      const asset1 = findAssetByQuery(clean, assets);
      if (!asset1) {
        appendMessages(
          { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
          { id: `b-${Date.now() + 1}`, sender: 'bot', text: t.notFoundAsset, timestamp: nowTime() }
        );
        return;
      }
      setConvFrom(asset1.code);
      setFsmState('convert_step2_to');
      appendMessages(
        { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
        {
          id: `b-${Date.now() + 1}`,
          sender: 'bot',
          text: `✅ ${asset1.names[lang]} (${asset1.code})\n\n${t.askConvertSecond}`,
          timestamp: nowTime(),
        }
      );
      return;
    }

    if (fsmState === 'convert_step2_to') {
      const asset2 = findAssetByQuery(clean, assets);
      if (!asset2) {
        appendMessages(
          { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
          { id: `b-${Date.now() + 1}`, sender: 'bot', text: t.notFoundAsset, timestamp: nowTime() }
        );
        return;
      }
      setConvTo(asset2.code);
      setFsmState('convert_step3_amount');
      const oneUnitPreview = convertCurrency(1, convFrom, asset2.code, assets);
      appendMessages(
        { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
        {
          id: `b-${Date.now() + 1}`,
          sender: 'bot',
          text:
            `✅ ${asset2.names[lang]} (${asset2.code})\n` +
            `💡 **1 ${convFrom} = ${oneUnitPreview ? formatCurrencyValue(oneUnitPreview.convertedAmount) : '...'} ${asset2.code}**\n\n` +
            `${t.askConvertAmount}`,
          timestamp: nowTime(),
        }
      );
      return;
    }

    if (fsmState === 'convert_step3_amount') {
      const num = parseFloat(clean.replace(/,/g, ''));
      const res = convertCurrency(Number.isFinite(num) && num > 0 ? num : 1, convFrom, convTo, assets);
      setFsmState('idle');
      if (!res) {
        appendMessages(
          { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
          { id: `b-${Date.now() + 1}`, sender: 'bot', text: t.notFoundAsset, timestamp: nowTime() }
        );
        return;
      }
      appendMessages(
        { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
        {
          id: `b-${Date.now() + 1}`,
          sender: 'bot',
          text:
            `🔄 **${t.conversionResultTitle}**\n\n` +
            `💵 **${formatCurrencyValue(res.amount)} ${res.fromAsset.names[lang]} (${res.fromAsset.code})** =\n` +
            `🎯 **${formatCurrencyValue(res.convertedAmount)} ${res.toAsset.names[lang]} (${res.toAsset.code})**\n` +
            `🇮🇷 **${t.tomanEquivalent}:** ${formatCurrencyValue(res.tomanValue)} تومان\n\n` +
            `📌 ${t.unitRateLabel}: 1 ${res.fromAsset.code} = ${formatCurrencyValue(res.unitRate)} ${res.toAsset.code}\n` +
            `🔁 1 ${res.toAsset.code} = ${formatCurrencyValue(res.reverseRate)} ${res.fromAsset.code}`,
          timestamp: nowTime(),
        }
      );
      return;
    }

    if (fsmState === 'waiting_support') {
      onAddTicket(raw);
      setFsmState('idle');
      appendMessages(
        { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
        { id: `b-${Date.now() + 1}`, sender: 'bot', text: t.supportReceived, timestamp: nowTime() }
      );
      return;
    }

    // Default fallback: try matching asset name directly for instant UX
    const directAsset = findAssetByQuery(clean, assets);
    if (directAsset) {
      handlePriceQuery(clean, raw);
      return;
    }

    appendMessages(
      { id: `u-${Date.now()}`, sender: 'user', text: raw, timestamp: nowTime() },
      {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: `${t.notFoundAsset}\n\n${t.welcomeSub}`,
        timestamp: nowTime(),
      }
    );
  };

  // Answered support tickets from Admin Panel
  const answeredTickets = tickets.filter((tk) => tk.status === 'answered' && tk.reply);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Interactive Telegram Client with Colored ReplyKeyboardMarkup */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
        {/* Telegram Client Header */}
        <div className="bg-slate-950 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
              AP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">
                  {chatMode === 'private' ? 'ArzPulse Pro Bot (@ArzPulseBot)' : 'گروه تریدرها و نرخ ارز (Telegram Group)'}
                </h2>
                <span className="text-[11px] text-emerald-400 font-mono">ArzDigital Live</span>
              </div>
              <p className="text-xs text-slate-400">
                {chatMode === 'private'
                  ? `دلار آزاد ArzDigital: ${formatCurrencyValue(usdAsset.priceToman)} تومان`
                  : 'Group & Channel Mode Active — Commands: /price usd · /convert 10 usd trx'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onSyncArzDigital && (
              <button
                type="button"
                onClick={onSyncArzDigital}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-medium text-emerald-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Sync Live from ArzDigital.com"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingArzDigital ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">بروزرسانی ArzDigital</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setChatMode(chatMode === 'private' ? 'group' : 'private')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Switch Private / Group Mode"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{chatMode === 'private' ? 'حالت گروه/کانال' : 'چت خصوصی ربات'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleKeyboardButtonClick('start', '/start')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Restart Bot (/start)"
              title="Restart /start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div
          className="p-4 space-y-3.5 overflow-y-auto max-h-[430px] min-h-[360px] bg-slate-950/60"
          dir={t.dir}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-line">
                  {m.text.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
                    part.startsWith('**') && part.endsWith('**') ? (
                      <strong key={idx} className="font-bold text-white">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <React.Fragment key={idx}>{part}</React.Fragment>
                    )
                  )}
                </div>

                {/* Rendered PnL Chart Image inside Bot Message */}
                {m.chartAsset && (
                  <div className="mt-3">
                    <PnLChartCanvas asset={m.chartAsset} lang={lang} compact />
                  </div>
                )}

                {/* Creator Info & Wallets Card */}
                {m.isCreatorCard && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-xs" dir="ltr">
                    <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 font-medium">GitHub Repository:</span>
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline font-mono flex items-center gap-1"
                      >
                        <span>GitHub Profile</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-400">🔹 TON Wallet (Toncoin):</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tonWallet, `ton-${m.id}`)}
                          className="text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
                        >
                          {copiedKey === `ton-${m.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-slate-200 break-all select-all">
                        {tonWallet}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-rose-400">🔺 TRON Wallet (TRX - TRC20):</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tronWallet, `trx-${m.id}`)}
                          className="text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
                        >
                          {copiedKey === `trx-${m.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-slate-200 break-all select-all">
                        {tronWallet}
                      </div>
                    </div>
                  </div>
                )}

                {/* Owner Credentials Card inside Bot */}
                {m.isCredentialsCard && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-xs" dir="ltr">
                    <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Web Admin Username:</span>
                        <code className="text-emerald-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded">
                          {adminUsername}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Web Admin Password:</span>
                        <code className="text-amber-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded">
                          {adminPassword}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Server CLI Command:</span>
                        <code className="text-blue-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded">
                          sudo arz
                        </code>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAdminPanel}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>ورود مستقیم به وب‌پنل مدیریت مالک (Open Web Admin)</span>
                    </button>
                  </div>
                )}

                {/* Group & Channel Addition Interactive Card */}
                {m.isGroupCard && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2" dir="ltr">
                      <label className="text-[11px] text-slate-400 block">
                        Enter your Telegram Bot Username (without @) to open Telegram Group/Channel picker:
                      </label>
                      <input
                        type="text"
                        value={simBotUsername}
                        onChange={(e) => setSimBotUsername(e.target.value.replace(/^@/, '').trim())}
                        placeholder="YourBotUsername"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-400"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cleanBot = (simBotUsername || 'ArzPulseProBot').replace(/^@/, '').trim();
                            setChatMode('group');
                            appendMessages(
                              {
                                id: `u-${Date.now()}`,
                                sender: 'user',
                                text: `👥 انتخاب گروه تلگرام برای @${cleanBot}`,
                                timestamp: nowTime(),
                              },
                              {
                                id: `b-${Date.now() + 1}`,
                                sender: 'bot',
                                text:
                                  `✅ **ربات @${cleanBot} با موفقیت به گروه تلگرام متصل شد!**\n\n` +
                                  formatFullRatesBoardText(),
                                timestamp: nowTime(),
                              }
                            );
                            window.location.href = `tg://resolve?domain=${cleanBot}&startgroup=true`;
                          }}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>➕ افزودن ربات به گروه تلگرام</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cleanBot = (simBotUsername || 'ArzPulseProBot').replace(/^@/, '').trim();
                            setChatMode('group');
                            appendMessages(
                              {
                                id: `u-${Date.now()}`,
                                sender: 'user',
                                text: `📢 انتخاب کانال تلگرام برای @${cleanBot}`,
                                timestamp: nowTime(),
                              },
                              {
                                id: `b-${Date.now() + 1}`,
                                sender: 'bot',
                                text:
                                  `✅ **ربات @${cleanBot} با موفقیت به کانال تلگرام متصل شد و اولین تابلوی نرخ ارز منتشر گردید!**\n\n` +
                                  formatFullRatesBoardText(),
                                timestamp: nowTime(),
                              }
                            );
                            window.location.href = `tg://resolve?domain=${cleanBot}&startchannel&admin=post_messages+edit_messages+delete_messages`;
                          }}
                          className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>📢 افزودن ربات به کانال تلگرام</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          appendMessages(
                            { id: `u-${Date.now()}`, sender: 'user', text: 'نرخ ارز', timestamp: nowTime() },
                            {
                              id: `b-${Date.now() + 1}`,
                              sender: 'bot',
                              text: formatFullRatesBoardText(),
                              timestamp: nowTime(),
                            }
                          );
                        }}
                        className="py-2 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-lg transition-colors text-center"
                      >
                        📊 تست «نرخ ارز» در کانال/گروه
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePriceQuery('USD', 'قیمت دلار')}
                        className="py-2 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold rounded-lg transition-colors text-center"
                      >
                        📈 تست «قیمت دلار» در گروه
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = convertCurrency(10, 'USD', 'TRX', assets);
                          if (res) {
                            appendMessages(
                              { id: `u-${Date.now()}`, sender: 'user', text: 'تبدیل 10 دلار به ترون', timestamp: nowTime() },
                              {
                                id: `b-${Date.now() + 1}`,
                                sender: 'bot',
                                text:
                                  `🔄 **نتیجه تبدیل دقیق (ArzDigital Live):**\n` +
                                  `💵 **10 USD** = 🎯 **${formatCurrencyValue(res.convertedAmount)} TRX**\n` +
                                  `🇮🇷 **معادل تومانی:** ${formatCurrencyValue(res.tomanValue)} تومان`,
                                timestamp: nowTime(),
                              }
                            );
                          }
                        }}
                        className="py-2 px-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold rounded-lg transition-colors text-center"
                      >
                        🔄 تست «تبدیل 10 دلار به ترون»
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-1 text-[10px] opacity-60 text-right font-mono">
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Display any admin replies to support tickets */}
          {answeredTickets.map((tk) => (
            <div key={tk.id} className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-emerald-950/60 border border-emerald-500/40 text-emerald-100">
                <div className="text-xs font-bold text-emerald-400 mb-1">
                  👑 پاسخ پشتیبانی مالک (Owner Support Reply):
                </div>
                <div>{tk.reply}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Context Helper Bar when Bot is waiting for input */}
        {fsmState !== 'idle' && fsmState !== 'choosing_lang' && (
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-amber-400 font-medium">
              {fsmState === 'waiting_price_asset' && 'پیشنهاد سریع ارز (کلیک کنید):'}
              {fsmState === 'convert_step1_from' && 'انتخاب سریع ارز اول (مبدا):'}
              {fsmState === 'convert_step2_to' && 'انتخاب سریع ارز دوم (مقصد):'}
              {fsmState === 'convert_step3_amount' && 'انتخاب سریع تعداد برای تبدیل:'}
              {fsmState === 'waiting_support' && 'در حال نوشتن پیام به پشتیبانی...'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(fsmState === 'waiting_price_asset' ||
                fsmState === 'convert_step1_from' ||
                fsmState === 'convert_step2_to') &&
                ['دلار', 'ترون', 'تون کوین', 'بیت کوین', 'تومان', 'یورو', 'درهم', 'لیر'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setInputText(item);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 text-xs text-slate-200 hover:text-white rounded-lg transition-colors"
                  >
                    {item}
                  </button>
                ))}
              {fsmState === 'convert_step3_amount' &&
                ['1', '10', '50', '100', '500'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInputText(amt)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-xs font-mono text-slate-200 hover:text-white rounded-lg transition-colors"
                  >
                    {amt}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Message Input Bar */}
        <form
          onSubmit={handleSendText}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              fsmState === 'waiting_price_asset'
                ? 'نام ارز را بنویسید (مثلاً دلار، ترون، درهم، BTC)...'
                : fsmState === 'convert_step1_from'
                ? 'ارز اول را بنویسید (مثلاً دلار)...'
                : fsmState === 'convert_step2_to'
                ? 'ارز دوم را بنویسید (مثلاً ترون یا تومان)...'
                : fsmState === 'convert_step3_amount'
                ? 'تعداد را وارد کنید (مثلاً 1 یا 100)...'
                : 'پیام یا نام ارز (مثلاً دلار، ترون، /price usd)...'
            }
            aria-label="Telegram Bot Message Input"
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>ارسال</span>
          </button>
        </form>

        {/* Colored ReplyKeyboardMarkup (NOT Inline Buttons — Authentic Bottom Keyboard!) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>ReplyKeyboardMarkup (aiogram 3.x Colored Keyboard Buttons)</span>
            <span className="font-mono text-slate-500">success · primary · danger</span>
          </div>

          {fsmState === 'choosing_lang' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['fa', 'en', 'ru', 'ar', 'zh', 'tr'] as LanguageCode[]).map((lCode, idx) => {
                const styles = [
                  'bg-emerald-600 hover:bg-emerald-500 border-emerald-500',
                  'bg-blue-600 hover:bg-blue-500 border-blue-500',
                  'bg-rose-600 hover:bg-rose-500 border-rose-500',
                ];
                return (
                  <button
                    key={lCode}
                    type="button"
                    onClick={() => handleLanguageSelect(lCode)}
                    className={`${styles[idx % 3]} border text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-transform active:scale-98 shadow-sm whitespace-nowrap truncate`}
                  >
                    {TRANSLATIONS[lCode].langName}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" dir={t.dir}>
              {/* Row 1: Price (success) & Convert (primary) */}
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('price', t.btnPrice)}
                className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnPrice}
              </button>
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('convert', t.btnConvert)}
                className="bg-blue-600 hover:bg-blue-500 border border-blue-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnConvert}
              </button>

              {/* Row 2: Pro Mini App (success) & Language (primary) */}
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('miniapp', t.btnMiniApp)}
                className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnMiniApp}
              </button>
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('lang', t.btnLanguage)}
                className="bg-blue-600 hover:bg-blue-500 border border-blue-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnLanguage}
              </button>

              {/* Row 3: Support (danger) & Bot Guide (primary) */}
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('support', t.btnSupport)}
                className="bg-rose-600 hover:bg-rose-500 border border-rose-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnSupport}
              </button>
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('guide', t.btnGuide)}
                className="bg-blue-600 hover:bg-blue-500 border border-blue-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnGuide}
              </button>

              {/* Row 4: Creator/Donate (success) & Add to Group/Channel (primary) */}
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('creator', t.btnCreator)}
                className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnCreator}
              </button>
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('group', t.btnAddToGroup)}
                className="bg-blue-600 hover:bg-blue-500 border border-blue-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnAddToGroup}
              </button>

              {/* Row 5: Owner Admin Panel (danger - spans 2 columns) */}
              <button
                type="button"
                onClick={() => handleKeyboardButtonClick('owner', t.btnOwnerPanel)}
                className="col-span-2 bg-rose-600 hover:bg-rose-500 border border-rose-500/80 text-white font-semibold py-2.5 px-3 rounded-xl text-xs transition-all shadow-sm whitespace-nowrap truncate"
              >
                {t.btnOwnerPanel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: ArzDigital Live Rate Banner, One-Line Bash Installer, Quick Test & Creator Wallets */}
      <div className="lg:col-span-5 space-y-5">
        {/* Live ArzDigital.com Feed Card */}
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                LIVE RATE SOURCE · ARZDIGITAL.COM
              </span>
              <h3 className="text-sm font-bold text-slate-100">
                نرخ لحظه‌ای دلار و ارزها از سایت ArzDigital
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold tabular-nums">
              1 USD = {formatCurrencyValue(usdAsset.priceToman)} تومان
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800" dir="ltr">
            <a
              href={ARZDIGITAL_USD_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline font-mono truncate flex items-center gap-1"
            >
              <span>arzdigital.com/currencies/united-states-dollar/</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
            <span className="text-[11px] text-slate-400 font-mono shrink-0">
              Sync: {lastArzSyncTime}
            </span>
          </div>
        </div>

        {/* One-Click Auto-Installer Box on Main Screen (Zero 404 + Prompts for Token & Owner ID) */}
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>نصب فوری روی سرور (متصل به ArzDigital + بدون ارور 404)</span>
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            با زدن دکمه سبز زیر، <strong className="text-white font-bold">دستور نصب مستقیم سرور (متصل به نرخ لحظه‌ای ArzDigital.com)</strong> کپی می‌شود؛ آن را در ترمینال سرور (<code className="font-mono text-emerald-400">root@...</code>) پیست کنید تا <strong className="text-emerald-400 font-bold">همان اول توکن ربات و آیدی عددی مالک را از شما بپرسد</strong> و خودکار نصب کند:
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 font-mono text-xs text-emerald-300 flex items-center justify-between gap-2" dir="ltr">
            <code className="truncate select-all">bash &lt;(curl -Ls {LIVE_INSTALL_SCRIPT_URL})</code>
            <button
              type="button"
              onClick={() => copyToClipboard(`bash <(curl -Ls ${LIVE_INSTALL_SCRIPT_URL})`, 'main-curl-subshell')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 flex items-center gap-1"
            >
              {copiedKey === 'main-curl-subshell' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'main-curl-subshell' ? 'Copied!' : 'Copy bash <(curl)'}</span>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                import('../utils/codeGenerators').then(({ generateDirectZero404ServerCommand }) => {
                  copyToClipboard(
                    generateDirectZero404ServerCommand({
                      adminUsername,
                      adminPassword,
                      githubUrl,
                      tonWallet,
                      tronWallet,
                    }),
                    'main-zero404-cmd'
                  );
                });
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {copiedKey === 'main-zero404-cmd' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>
                {copiedKey === 'main-zero404-cmd'
                  ? 'کپی شد! حالا در ترمینال سرور Paste کنید'
                  : 'کپی اسکریپت کامل آفلاین (بدون نیاز به دانلود)'}
              </span>
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1" dir="ltr">
            <div className="text-emerald-400"># Opens Firewall (80/443/8080) + HTTPS Mini App Tunnel + Web Panel:</div>
            <div>🔑 1) Enter your Telegram Bot API Token (from @BotFather):</div>
            <div>👑 2) Enter your Numeric Owner Telegram ID (e.g. 123456789):</div>
          </div>
        </div>

        {/* Quick Instant Test Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">
              تست سریع امکانات ربات (ArzDigital Live Demo)
            </h3>
            <span className="text-xs text-slate-400">16 ارز و رمزارز</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            با کلیک روی دکمه‌های زیر، استعلام نرخ لحظه‌ای دلار آزاد، ترون، تبدیل ۱ دلار به ترون و دریافت رمز پنل مالک را در لحظه در ربات ببینید:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePriceQuery('USD', '📊 قیمت دلار آمریکا (USD) از ArzDigital')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-emerald-400 text-right transition-colors flex items-center justify-between"
            >
              <span>قیمت دلار آزاد (ArzDigital)</span>
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                const res = convertCurrency(1, 'USD', 'TRX', assets);
                if (res) {
                  appendMessages(
                    {
                      id: `u-${Date.now()}`,
                      sender: 'user',
                      text: 'تبدیل ۱ دلار (USD) به ترون (TRX)',
                      timestamp: nowTime(),
                    },
                    {
                      id: `b-${Date.now() + 1}`,
                      sender: 'bot',
                      text:
                        `🔄 **${t.conversionResultTitle}**\n\n` +
                        `💵 **1 ${res.fromAsset.names[lang]} (USD)** =\n` +
                        `🎯 **${formatCurrencyValue(res.convertedAmount)} ${res.toAsset.names[lang]} (TRX)**\n\n` +
                        `📌 1 TRX = $${formatCurrencyValue(res.reverseRate)} USD\n` +
                        `🇮🇷 معادل تومانی (ArzDigital): ${formatCurrencyValue(res.tomanValue)} تومان`,
                      timestamp: nowTime(),
                    }
                  );
                }
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-blue-400 text-right transition-colors flex items-center justify-between"
            >
              <span>تبدیل ۱ دلار به ترون (1 USD ➔ TRX)</span>
              <Globe className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleKeyboardButtonClick('owner', t.btnOwnerPanel)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-rose-400 text-right transition-colors flex items-center justify-between"
            >
              <span>مشاهده رمز وب‌پنل مدیریت در ربات</span>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleKeyboardButtonClick('creator', t.btnCreator)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-amber-400 text-right transition-colors flex items-center justify-between"
            >
              <span>نمایش گیت‌هاب و ولت‌های سازنده</span>
              <Terminal className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Official Creator Wallets & GitHub Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">
              ولت‌های رسمی سازنده (TON & TRON Donate Wallets)
            </h3>
            <span className="text-xs text-emerald-400 font-mono">GitHub Verified</span>
          </div>

          <div className="space-y-2.5" dir="ltr">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-blue-400">TON (Toncoin Network)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(tonWallet, 'side-ton')}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md"
                >
                  {copiedKey === 'side-ton' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'side-ton' ? 'Copied' : 'Copy TON'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-slate-200 break-all select-all">{tonWallet}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-rose-400">TRON (TRX / TRC-20)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(tronWallet, 'side-trx')}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-md"
                >
                  {copiedKey === 'side-trx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'side-trx' ? 'Copied' : 'Copy TRX'}</span>
                </button>
              </div>
              <p className="font-mono text-xs text-slate-200 break-all select-all">{tronWallet}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
