import React, { useState } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Calculator,
  Copy,
  Check,
  Search,
  Send,
  Wallet,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  AssetInfo,
  LanguageCode,
  TRANSLATIONS,
  convertCurrency,
  formatCurrencyValue,
  getAssetTomanPrice,
  ARZDIGITAL_USD_URL,
} from '../utils/currencyEngine';
import { PnLChartCanvas } from './PnLChartCanvas';

interface MiniAppViewProps {
  lang: LanguageCode;
  onChangeLang: (lang: LanguageCode) => void;
  assets: AssetInfo[];
  tonWallet: string;
  tronWallet: string;
  githubUrl: string;
  onAddTicket: (msg: string) => void;
  onSyncArzDigital?: () => void;
  isSyncingArzDigital?: boolean;
  lastArzSyncTime?: string;
}

export const MiniAppView: React.FC<MiniAppViewProps> = ({
  lang,
  onChangeLang,
  assets,
  tonWallet,
  tronWallet,
  githubUrl,
  onAddTicket,
  onSyncArzDigital,
  isSyncingArzDigital = false,
  lastArzSyncTime = 'Live',
}) => {
  const t = TRANSLATIONS[lang];
  const [selectedAssetCode, setSelectedAssetCode] = useState<string>('USD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'crypto' | 'fiat'>('all');

  // Converter state
  const [fromCode, setFromCode] = useState<string>('USD');
  const [toCode, setToCode] = useState<string>('TRX');
  const [amountStr, setAmountStr] = useState<string>('1');

  // Investment PnL Simulator state
  const [investUsd, setInvestUsd] = useState<string>('100');

  // Support state
  const [supportMsg, setSupportMsg] = useState<string>('');
  const [supportSent, setSupportSent] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedAsset = assets.find((a) => a.code === selectedAssetCode) || assets[0];
  const numericAmount = parseFloat(amountStr) || 0;
  const conversion = convertCurrency(numericAmount > 0 ? numericAmount : 1, fromCode, toCode, assets);

  const filteredAssets = assets.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.code.toLowerCase().includes(q) ||
      a.names[lang].toLowerCase().includes(q) ||
      a.aliases.some((al) => al.toLowerCase().includes(q))
    );
  });

  const handleSwapCurrencies = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    onAddTicket(supportMsg.trim());
    setSupportMsg('');
    setSupportSent(true);
    setTimeout(() => setSupportSent(false), 3500);
  };

  const investAmount = parseFloat(investUsd) || 100;
  const pnl24hDollar = (investAmount * selectedAsset.change24h) / 100;
  const pnl7dDollar = (investAmount * selectedAsset.change7d) / 100;

  return (
    <div className="space-y-6" dir={t.dir}>
      {/* Mini App Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-medium mb-1">
            <span>Telegram WebApp Mini App</span>
            <span>·</span>
            <a
              href={ARZDIGITAL_USD_URL}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>منبع نرخ: ArzDigital.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>·</span>
            <span className="font-mono text-slate-400">Sync: {lastArzSyncTime}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {t.btnMiniApp} — پنل پیشرفته نرخ، نمودار سود/زیان و تبدیل ارز
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSyncArzDigital && (
            <button
              type="button"
              onClick={onSyncArzDigital}
              className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingArzDigital ? 'animate-spin' : ''}`} />
              <span>بروزرسانی از ArzDigital</span>
            </button>
          )}

          {/* 6-Language Segmented Switcher inside Mini App */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            {(['fa', 'en', 'ru', 'ar', 'zh', 'tr'] as LanguageCode[]).map((lCode) => (
              <button
                key={lCode}
                type="button"
                onClick={() => onChangeLang(lCode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  lang === lCode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {TRANSLATIONS[lCode].langName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Converter + PnL Chart & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Advanced Multi-Currency & Crypto Converter */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>{t.btnConvert}</span>
            </h3>
            <span className="text-xs text-emerald-400 font-mono">ArzDigital Live ({assets.length} Assets)</span>
          </div>

          <div className="space-y-3.5">
            {/* Amount Input */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                مقدار مورد نظر برای تبدیل (Amount)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  aria-label="Conversion Amount"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-slate-100 tabular-nums focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {['1', '10', '50', '100', '500', '1000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmountStr(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      amountStr === preset
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* From & To Selectors */}
            <div className="grid grid-cols-11 gap-2 items-end">
              <div className="col-span-5">
                <label className="block text-xs text-slate-400 mb-1.5">از واحد پول / ارز (From)</label>
                <select
                  value={fromCode}
                  onChange={(e) => setFromCode(e.target.value)}
                  aria-label="From Currency"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {assets.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.names[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapCurrencies}
                  aria-label="Swap Currencies"
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-blue-600 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="col-span-5">
                <label className="block text-xs text-slate-400 mb-1.5">به واحد پول / ارز (To)</label>
                <select
                  value={toCode}
                  onChange={(e) => setToCode(e.target.value)}
                  aria-label="To Currency"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {assets.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.names[lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instant Conversion Result Box */}
            {conversion && (
              <div
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                data-testid="miniapp-conversion-result"
              >
                <div className="text-xs text-slate-400">
                  {formatCurrencyValue(conversion.amount)} {conversion.fromAsset.names[lang]} ({conversion.fromAsset.code}) =
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                  {formatCurrencyValue(conversion.convertedAmount)} {conversion.toAsset.code}
                </div>
                <div className="text-xs font-mono text-slate-300 tabular-nums">
                  🇮🇷 معادل تومانی (ArzDigital):{' '}
                  <span className="text-amber-400 font-bold">
                    {formatCurrencyValue(conversion.tomanValue)} تومان
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 tabular-nums">
                  <span>
                    1 {conversion.fromAsset.code} = {formatCurrencyValue(conversion.unitRate)}{' '}
                    {conversion.toAsset.code}
                  </span>
                  <span>
                    1 {conversion.toAsset.code} = {formatCurrencyValue(conversion.reverseRate)}{' '}
                    {conversion.fromAsset.code}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Interactive PnL Chart + Profit/Loss Calculator */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {t.priceCardTitle} — {selectedAsset.names[lang]} ({selectedAsset.code})
              </h3>
              <p className="text-xs text-slate-400">
                نرخ تومانی از ArzDigital:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrencyValue(getAssetTomanPrice(selectedAsset, assets))} تومان
                </strong>
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['USD', 'TRX', 'TON', 'BTC', 'ETH', 'EUR', 'AED', 'TRY'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedAssetCode(code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    selectedAssetCode === code
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <PnLChartCanvas asset={selectedAsset} lang={lang} />

          {/* Profit / Loss Investment Simulator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                محاسبه سود و زیان سرمایه شما (USD)
              </label>
              <input
                type="number"
                value={investUsd}
                onChange={(e) => setInvestUsd(e.target.value)}
                aria-label="Investment Amount USD"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-100 tabular-nums"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">{t.pnl24hLabel}</div>
              <div
                className={`text-sm font-mono font-bold tabular-nums ${
                  pnl24hDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pnl24hDollar >= 0 ? '+' : ''}${pnl24hDollar.toFixed(2)} ({selectedAsset.change24h >= 0 ? '+' : ''}
                {selectedAsset.change24h}%)
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
              <div className="text-[11px] text-slate-400">{t.pnl7dLabel}</div>
              <div
                className={`text-sm font-mono font-bold tabular-nums ${
                  pnl7dDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pnl7dDollar >= 0 ? '+' : ''}${pnl7dDollar.toFixed(2)} ({selectedAsset.change7d >= 0 ? '+' : ''}
                {selectedAsset.change7d}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Market Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100">
              جدول لحظه‌ای قیمت ارزها و کریپتو (منبع: ArzDigital.com)
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['all', 'crypto', 'fiat'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filterType === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'all' ? 'همه (All)' : tab === 'crypto' ? 'رمزارز (Crypto)' : 'ارز دولتی (Fiat)'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا نماد ارز..."
                aria-label="Search Asset"
                className="bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-2.5 px-3 text-right">ارز / واحد پول</th>
                <th className="py-2.5 px-3 text-right">نرخ تومانی (ArzDigital)</th>
                <th className="py-2.5 px-3 text-right">قیمت دلاری (USD)</th>
                <th className="py-2.5 px-3 text-right">سود/زیان ۲۴ ساعته</th>
                <th className="py-2.5 px-3 text-right">سود/زیان ۷ روزه</th>
                <th className="py-2.5 px-3 text-right">عملیات / منبع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filteredAssets.map((a) => {
                const up24 = a.change24h >= 0;
                const up7 = a.change7d >= 0;
                const tomanVal = getAssetTomanPrice(a, assets);
                return (
                  <tr
                    key={a.code}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      selectedAssetCode === a.code ? 'bg-blue-950/25' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold text-slate-100">{a.names[lang]}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {a.code} · {a.type.toUpperCase()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-emerald-400">
                      {formatCurrencyValue(tomanVal)} تومان
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-100">
                      ${formatCurrencyValue(a.priceUsd)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          up24 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {up24 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {up24 ? '+' : ''}
                        {a.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                        up7 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {up7 ? '+' : ''}
                      {a.change7d.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAssetCode(a.code)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap"
                        >
                          نمودار
                        </button>
                        <a
                          href={a.arzdigitalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-blue-400 font-mono flex items-center gap-1 whitespace-nowrap"
                          title="مشاهده در ArzDigital.com"
                        >
                          <span>ArzDigital</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Mini App Support & Creator Donate Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
          <h3 className="text-base font-bold text-slate-100">{t.btnSupport}</h3>
          <p className="text-xs text-slate-400">
            پیام شما مستقیماً در بخش پشتیبانی وب‌پنل مالک ثبت می‌شود:
          </p>
          <form onSubmit={handleSupportSubmit} className="space-y-3">
            <textarea
              rows={3}
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              placeholder="سوال یا درخواست راهنمایی خود را بنویسید..."
              aria-label="Support Ticket Message"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center justify-between">
              {supportSent ? (
                <span className="text-xs text-emerald-400 font-medium">{t.supportReceived}</span>
              ) : (
                <span className="text-xs text-slate-500">پاسخگویی سریع توسط مالک</span>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال به پشتیبانی</span>
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5" dir="ltr">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Creator GitHub & Official Wallets</span>
            </h3>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:underline font-mono"
            >
              GitHub Profile ↗
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400">TON Wallet (Toncoin)</span>
              <button
                type="button"
                onClick={() => handleCopy(tonWallet, 'mini-ton')}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
              >
                {copiedId === 'mini-ton' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-200 break-all select-all">{tonWallet}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400">TRON Wallet (TRX - TRC20)</span>
              <button
                type="button"
                onClick={() => handleCopy(tronWallet, 'mini-trx')}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded"
              >
                {copiedId === 'mini-trx' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-200 break-all select-all">{tronWallet}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
