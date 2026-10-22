import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';
import {
  INITIAL_ASSETS,
  AssetInfo,
  LanguageCode,
  TON_WALLET,
  TRON_WALLET,
  DEFAULT_GITHUB_URL,
  TRANSLATIONS,
  fetchArzDigitalLiveRates,
} from './utils/currencyEngine';
import { BotSimulatorView, SupportTicket } from './components/BotSimulatorView';
import { MiniAppView } from './components/MiniAppView';
import { AdminPanelView } from './components/AdminPanelView';
import { ServerAndDocsView } from './components/ServerAndDocsView';

type ActiveWorkspace = 'bot' | 'miniapp' | 'admin' | 'server';
export type ThemeMode = 'dark' | 'light';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveWorkspace>('bot');
  const [lang, setLang] = useState<LanguageCode>('fa');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('arz_global_theme_v1');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore storage errors
    }
    return 'dark';
  });
  const [assets, setAssets] = useState<AssetInfo[]>(INITIAL_ASSETS);
  const [isSyncingArzDigital, setIsSyncingArzDigital] = useState<boolean>(false);
  const [lastArzSyncTime, setLastArzSyncTime] = useState<string>('ArzDigital Live');

  // Synchronize Tailwind's class strategy (.dark / .light) on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('arz_global_theme_v1', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Owner & Bot Credentials State
  const [adminUsername, setAdminUsername] = useState<string>('owner_admin');
  const [adminPassword, setAdminPassword] = useState<string>('ArzPanel@2026#Pro');
  const [githubUrl, setGithubUrl] = useState<string>(DEFAULT_GITHUB_URL);
  const [tonWallet, setTonWallet] = useState<string>(TON_WALLET);
  const [tronWallet, setTronWallet] = useState<string>(TRON_WALLET);

  // Support Tickets State shared between Bot, Mini App, and Owner Web Admin Panel
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'tk-101',
      userName: 'کاربر تلگرام (@ali_crypto)',
      userId: '59812041',
      lang: 'fa',
      message: 'سلام، چطور می‌تونم ربات رو به گروه تلگرامی خودم اضافه کنم تا قیمت ترون و دلار ArzDigital رو نشون بده؟',
      reply: 'سلام! از دکمه «افزودن به گروه یا کانال» استفاده کنید و دستور /price usd یا /price trx را بزنید.',
      status: 'answered',
      createdAt: '10:15',
    },
  ]);

  const handleSyncArzDigital = useCallback(async () => {
    setIsSyncingArzDigital(true);
    try {
      const result = await fetchArzDigitalLiveRates(INITIAL_ASSETS);
      if (result.updatedCount > 0) {
        setAssets(result.assets);
        const nowStr = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        setLastArzSyncTime(nowStr);
      }
    } catch {
      // Keep deterministic ArzDigital rates on offline fallback
    } finally {
      setIsSyncingArzDigital(false);
    }
  }, []);

  // Fetch live USD, Fiat & Crypto prices from ArzDigital on mount and update periodically
  useEffect(() => {
    handleSyncArzDigital();
    const intervalId = setInterval(() => {
      handleSyncArzDigital();
    }, 45000); // 45 seconds

    return () => clearInterval(intervalId);
  }, [handleSyncArzDigital]);

  const handleAddTicket = (message: string) => {
    const newTk: SupportTicket = {
      id: `tk-${Date.now()}`,
      userName: 'کاربر آنلاین تلگرام',
      userId: String(Math.floor(10000000 + Math.random() * 89999999)),
      lang,
      message,
      status: 'open',
      createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setTickets((prev) => [newTk, ...prev]);
  };

  const handleReplyTicket = (ticketId: string, replyText: string) => {
    setTickets((prev) =>
      prev.map((tk) =>
        tk.id === ticketId ? { ...tk, reply: replyText, status: 'answered' } : tk
      )
    );
  };

  const handleUpdateAssetPrice = (
    code: string,
    newPriceUsd: number,
    newChange24h: number,
    newPriceToman?: number
  ) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.code === code
          ? {
              ...a,
              priceUsd: newPriceUsd,
              priceToman: newPriceToman && newPriceToman > 0 ? newPriceToman : a.priceToman,
              change24h: newChange24h,
              sparkline: [
                ...a.sparkline.slice(1),
                a.code === 'USD' && newPriceToman ? newPriceToman : newPriceUsd,
              ],
            }
          : a
      )
    );
  };

  const currentDir = TRANSLATIONS[lang].dir;

  return (
    <div
      className={`${
        theme === 'dark' ? 'dark' : 'light'
      } min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200`}
      dir={currentDir}
      data-theme={theme}
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 sticky top-0 z-30 backdrop-blur-md transition-colors duration-200">
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('bot');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          ArzPulse Pro
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveView('bot')}
            className={`hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
              activeView === 'bot' ? 'border-blue-500 text-slate-950 dark:text-white font-semibold' : 'border-transparent'
            }`}
          >
            ربات تلگرام (Bot)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('miniapp')}
            className={`hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
              activeView === 'miniapp' ? 'border-emerald-500 text-slate-950 dark:text-white font-semibold' : 'border-transparent'
            }`}
          >
            مینی‌اپ (Mini App)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className={`hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
              activeView === 'admin' ? 'border-rose-500 text-slate-950 dark:text-white font-semibold' : 'border-transparent'
            }`}
          >
            وب‌پنل مالک (Admin)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('server')}
            className={`hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
              activeView === 'server' ? 'border-amber-500 text-slate-950 dark:text-white font-semibold' : 'border-transparent'
            }`}
          >
            نصب سرور (sudo arz)
          </button>
        </nav>

        {/* Zone 3: Global Theme Toggle & Primary Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleTheme}
            data-testid="global-theme-toggle"
            aria-label={theme === 'dark' ? 'Switch to Professional Light Mode' : 'Switch to Dark Mode'}
            aria-pressed={theme === 'light'}
            className="px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Professional Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView(activeView === 'miniapp' ? 'server' : 'miniapp')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {activeView === 'miniapp' ? 'دریافت اسکریپت نصب' : 'اجرای مینی‌اپ پیشرفته'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Mobile Workspace Navigation Bar (Visible on < md) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:hidden bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <button
            type="button"
            onClick={() => setActiveView('bot')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeView === 'bot' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            ربات تلگرام (Bot)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('miniapp')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeView === 'miniapp' ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            مینی‌اپ (Mini App)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeView === 'admin' ? 'bg-rose-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            وب‌پنل مالک (Admin)
          </button>
          <button
            type="button"
            onClick={() => setActiveView('server')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
              activeView === 'server' ? 'bg-amber-600 text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            نصب سرور (sudo arz)
          </button>
        </div>

        {/* Contextual Workspace Switcher & Language Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              مجموعه کامل ربات تلگرام نرخ ارز و کریپتو (متصل به ArzDigital.com)، مینی‌اپ، وب‌پنل مالک و <code className="text-blue-600 dark:text-blue-400 font-mono text-lg">sudo arz</code>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              نرخ لحظه‌ای دلار و ارزها از <span className="text-emerald-600 dark:text-emerald-400 font-mono">arzdigital.com/currencies/united-states-dollar/</span> · کیبورد رنگی Aiogram · ۶ زبان زنده · نمودار سود و زیان
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(['fa', 'en', 'ru', 'ar', 'zh', 'tr'] as LanguageCode[]).map((lCode) => (
              <button
                key={lCode}
                type="button"
                onClick={() => setLang(lCode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  lang === lCode
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-bold'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800'
                }`}
              >
                {TRANSLATIONS[lCode].langName}
              </button>
            ))}
          </div>
        </div>

        {/* Active View Render */}
        {activeView === 'bot' && (
          <BotSimulatorView
            lang={lang}
            onChangeLang={setLang}
            assets={assets}
            onOpenMiniApp={() => setActiveView('miniapp')}
            onOpenAdminPanel={() => setActiveView('admin')}
            adminUsername={adminUsername}
            adminPassword={adminPassword}
            githubUrl={githubUrl}
            tonWallet={tonWallet}
            tronWallet={tronWallet}
            tickets={tickets}
            onAddTicket={handleAddTicket}
            onSyncArzDigital={handleSyncArzDigital}
            isSyncingArzDigital={isSyncingArzDigital}
            lastArzSyncTime={lastArzSyncTime}
          />
        )}

        {activeView === 'miniapp' && (
          <MiniAppView
            lang={lang}
            onChangeLang={setLang}
            assets={assets}
            tonWallet={tonWallet}
            tronWallet={tronWallet}
            githubUrl={githubUrl}
            onAddTicket={handleAddTicket}
            onSyncArzDigital={handleSyncArzDigital}
            isSyncingArzDigital={isSyncingArzDigital}
            lastArzSyncTime={lastArzSyncTime}
          />
        )}

        {activeView === 'admin' && (
          <AdminPanelView
            adminUsername={adminUsername}
            adminPassword={adminPassword}
            onUpdateCredentials={(u, p) => {
              setAdminUsername(u);
              setAdminPassword(p);
            }}
            githubUrl={githubUrl}
            onUpdateGithubUrl={setGithubUrl}
            tonWallet={tonWallet}
            tronWallet={tronWallet}
            onUpdateWallets={(ton, tron) => {
              setTonWallet(ton);
              setTronWallet(tron);
            }}
            assets={assets}
            onUpdateAssetPrice={handleUpdateAssetPrice}
            tickets={tickets}
            onReplyTicket={handleReplyTicket}
            onSyncArzDigital={handleSyncArzDigital}
            isSyncingArzDigital={isSyncingArzDigital}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        )}

        {activeView === 'server' && (
          <ServerAndDocsView
            adminUsername={adminUsername}
            adminPassword={adminPassword}
            githubUrl={githubUrl}
            tonWallet={tonWallet}
            tronWallet={tronWallet}
          />
        )}
      </main>

      {/* Quiet Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1360px] w-full mx-auto">
        <div>ArzPulse Pro — Live Rates by ArzDigital.com · Aiogram 3.x Bot, Mini App &amp; Server CLI Suite</div>
        <div className="font-mono" dir="ltr">
          TON: {tonWallet.slice(0, 10)}...{tonWallet.slice(-6)} · TRX: {tronWallet.slice(0, 10)}...{tronWallet.slice(-6)}
        </div>
      </footer>
    </div>
  );
}
