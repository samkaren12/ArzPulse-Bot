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
} from 'lucide-react';
import {
  AssetInfo,
  LanguageCode,
  TRANSLATIONS,
  findAssetByQuery,
  convertCurrency,
  formatCurrencyValue,
  normalizeDigits,
} from '../utils/currencyEngine';
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
}) => {
  const t = TRANSLATIONS[lang];
  const [chatMode, setChatMode] = useState<'private' | 'group'>('private');
  const [fsmState, setFsmState] = useState<BotFSMState>('idle');
  const [convFrom, setConvFrom] = useState<string>('USD');
  const [convTo, setConvTo] = useState<string>('TRX');
  const [inputText, setInputText] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [messages, setMessages] = useState<BotMessage[]>(() => {
    const trxAsset = assets.find((a) => a.code === 'TRX') || assets[1];
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
          `💵 Price (USD): $${formatCurrencyValue(trxAsset.priceUsd)}\n` +
          `🇮🇷 ${TRANSLATIONS[lang].tomanEquivalent}: ${formatCurrencyValue(trxAsset.priceUsd * 69500)} IRT\n` +
          `📈 ${TRANSLATIONS[lang].pnl24hLabel}: +${trxAsset.change24h}% (Profit)\n` +
          `📊 ${TRANSLATIONS[lang].pnl7dLabel}: +${trxAsset.change7d}%`,
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
    const tomanPrice = found.code === 'IRT' ? 1 : found.priceUsd * 69500;

    const replyMsg: BotMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'bot',
      text:
        `📊 **${t.priceCardTitle}**\n` +
        `🏷 **${found.names[lang]} (${found.code})**\n\n` +
        `💵 **USD Price:** $${formatCurrencyValue(found.priceUsd)}\n` +
        `🇮🇷 **${t.tomanEquivalent}:** ${formatCurrencyValue(tomanPrice)} IRT\n` +
        `${isProfit ? '🟢' : '🔴'} **${t.pnl24hLabel}:** ${pnlSign}${found.change24h.toFixed(2)}%\n` +
        `📈 **${t.pnl7dLabel}:** ${found.change7d >= 0 ? '+' : ''}${found.change7d.toFixed(2)}%`,
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
          '👥 **Group & Channel Mode Activated!**\n' +
          'ربات با موفقیت در حالت گروه و کانال قرار گرفت. در گروه‌ها می‌توانید دستوراتی مثل `/price ton` یا `/convert 10 usd trx` یا `قیمت ترون` را ارسال کنید.',
        timestamp: nowTime(),
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

    // Check group/slash commands like /start, /price trx, /convert 10 usd trx
    if (clean.toLowerCase() === '/start') {
      handleKeyboardButtonClick('start', '/start');
      return;
    }

    if (clean.toLowerCase().startsWith('/price ')) {
      const symbol = clean.slice(7).trim();
      handlePriceQuery(symbol, raw);
      return;
    }

    if (clean.toLowerCase().startsWith('/convert ')) {
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
                `✅ **${formatCurrencyValue(res.convertedAmount)} ${res.toAsset.names[lang]} (${res.toAsset.code})**\n\n` +
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
            `🎯 **${formatCurrencyValue(res.convertedAmount)} ${res.toAsset.names[lang]} (${res.toAsset.code})**\n\n` +
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
                <span className="text-[11px] text-emerald-400 font-mono">bot · aiogram 3.x</span>
              </div>
              <p className="text-xs text-slate-400">
                {chatMode === 'private'
                  ? 'ReplyKeyboardMarkup (success / primary / danger colored buttons)'
                  : 'Group & Channel Mode Active — Commands: /price trx · /convert 10 usd trx'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
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
                ['دلار', 'ترون', 'تون کوین', 'بیت کوین', 'تومان', 'یورو'].map((item) => (
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
                ? 'نام ارز را بنویسید (مثلاً ترون، دلار، BTC)...'
                : fsmState === 'convert_step1_from'
                ? 'ارز اول را بنویسید (مثلاً دلار)...'
                : fsmState === 'convert_step2_to'
                ? 'ارز دوم را بنویسید (مثلاً ترون)...'
                : fsmState === 'convert_step3_amount'
                ? 'تعداد را وارد کنید (مثلاً 1 یا 100)...'
                : 'پیام یا نام ارز (مثلاً دلار، ترون، /price ton)...'
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

      {/* Right Column: One-Line Bash Curl Installer, Quick Test & Creator Wallets */}
      <div className="lg:col-span-5 space-y-5">
        {/* One-Click Bash Curl Auto-Installer Box on Main Screen */}
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>دستور نصب اتوماتیک روی سرور (One-Line Bash Curl)</span>
            </h3>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  'bash <(curl -Ls https://raw.githubusercontent.com/samkaren/ArzPulse-Bot/main/install.sh)',
                  'main-bash-curl'
                )
              }
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              {copiedKey === 'main-bash-curl' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'main-bash-curl' ? 'کپی شد!' : 'کپی دستور نصب'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            با کپی و اجرای این دستور در ترمینال سرور، کل ربات، وب‌پنل و دستور <code className="text-emerald-400 font-mono">sudo arz</code> خودکار نصب می‌شوند:
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto select-all" dir="ltr">
            bash &lt;(curl -Ls https://raw.githubusercontent.com/samkaren/ArzPulse-Bot/main/install.sh)
          </div>
        </div>

        {/* Quick Instant Test Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">
              تست سریع امکانات ربات (One-Click Demo)
            </h3>
            <span className="text-xs text-slate-400">6 زبان زنده</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            می‌توانید از کیبورد رنگی پایین چت استفاده کنید یا با کلیک روی دکمه‌های زیر، سناریوهای اصلی که خواستید (تبدیل ۱ دلار به ترون، نمودار سود و زیان، دریافت رمز پنل مالک و...) را در لحظه در ربات ببینید:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePriceQuery('TRX', '📊 قیمت ترون (TRX) + نمودار')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-emerald-400 text-right transition-colors flex items-center justify-between"
            >
              <span>نمودار سود/زیان ترون (TRX)</span>
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
                        `🇮🇷 معادل تومانی: 69,500 تومان`,
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
