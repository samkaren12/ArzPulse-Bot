import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  MessageSquare,
  Settings,
  RefreshCw,
  CheckCircle2,
  Send,
  GlobeLock,
  ExternalLink,
  Loader2,
  Sun,
  Moon,
  Bell,
  BellOff,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { AssetInfo, formatCurrencyValue, getAssetTomanPrice, ARZDIGITAL_USD_URL } from '../utils/currencyEngine';
import { SupportTicket } from './BotSimulatorView';

interface AdminPanelViewProps {
  adminUsername: string;
  adminPassword: string;
  onUpdateCredentials: (user: string, pass: string) => void;
  githubUrl: string;
  onUpdateGithubUrl: (url: string) => void;
  tonWallet: string;
  tronWallet: string;
  onUpdateWallets: (ton: string, tron: string) => void;
  assets: AssetInfo[];
  onUpdateAssetPrice: (code: string, newPriceUsd: number, newChange24h: number, newPriceToman?: number) => void;
  tickets: SupportTicket[];
  onReplyTicket: (ticketId: string, replyText: string) => void;
  onSyncArzDigital?: () => void;
  isSyncingArzDigital?: boolean;
  isUpdating?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

type UpdatingSection = 'settings' | 'rates' | 'ssl' | 'tickets' | 'board' | 'broadcast' | 'alerts' | null;

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  adminUsername,
  adminPassword,
  onUpdateCredentials,
  githubUrl,
  onUpdateGithubUrl,
  tonWallet,
  tronWallet,
  onUpdateWallets,
  assets,
  onUpdateAssetPrice,
  tickets,
  onReplyTicket,
  onSyncArzDigital,
  isSyncingArzDigital = false,
  isUpdating: externalIsUpdating = false,
  theme: externalTheme,
  onToggleTheme,
}) => {
  const [internalTheme, setInternalTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('arz_global_theme_v1');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
      return 'light';
    }
    return 'dark';
  });

  const activeTheme = externalTheme ?? internalTheme;

  useEffect(() => {
    if (externalTheme !== undefined) return;
    const root = document.documentElement;
    if (internalTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.setAttribute('data-theme', internalTheme);
    try {
      localStorage.setItem('arz_global_theme_v1', internalTheme);
    } catch {
      // ignore
    }
  }, [internalTheme, externalTheme]);

  const handleThemeToggle = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setInternalTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginUser, setLoginUser] = useState<string>(adminUsername);
  const [loginPass, setLoginPass] = useState<string>(adminPassword);
  const [loginError, setLoginError] = useState<string>('');
  const [botUsernameInput, setBotUsernameInput] = useState<string>('ArzPulseProBot');
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [targetChannelId, setTargetChannelId] = useState<string>('@my_crypto_channel');

  // Critical System Health Alerts State (Telegram Bot -> Chat ID)
  const [healthAlertsEnabled, setHealthAlertsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('arz_health_alerts_enabled_v1');
      if (saved !== null) return saved === 'true';
    } catch {
      // ignore
    }
    return true;
  });
  const [alertChatId, setAlertChatId] = useState<string>(() => {
    try {
      return localStorage.getItem('arz_health_alert_chat_id_v1') || '59812041';
    } catch {
      return '59812041';
    }
  });
  const [notifyDowntime, setNotifyDowntime] = useState<boolean>(true);
  const [notifySslExpiry, setNotifySslExpiry] = useState<boolean>(true);
  const [notifyHighMemory, setNotifyHighMemory] = useState<boolean>(true);
  const [lastDispatchedAlert, setLastDispatchedAlert] = useState<{
    chatId: string;
    type: string;
    timestamp: string;
    summary: string;
  } | null>(null);

  // Admin sub-tabs
  const [activeTab, setActiveTab] = useState<'tickets' | 'rates' | 'settings' | 'ssl'>('rates');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Settings edit states
  const [newUser, setNewUser] = useState<string>(adminUsername);
  const [newPass, setNewPass] = useState<string>(adminPassword);
  const [newGithub, setNewGithub] = useState<string>(githubUrl);
  const [newTon, setNewTon] = useState<string>(tonWallet);
  const [newTron, setNewTron] = useState<string>(tronWallet);
  const [savedBanner, setSavedBanner] = useState<string>('');

  // Loading state for admin updates
  const [isUpdatingInternal, setIsUpdatingInternal] = useState<boolean>(false);
  const [updatingSection, setUpdatingSection] = useState<UpdatingSection>(null);
  const [updatingMessage, setUpdatingMessage] = useState<string>('');
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUpdating = isUpdatingInternal || externalIsUpdating || isSyncingArzDigital;

  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const runWithLoadingState = (
    section: UpdatingSection,
    loadingText: string,
    successText: string,
    callback?: () => void
  ) => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);

    setSavedBanner('');
    setIsUpdatingInternal(true);
    setUpdatingSection(section);
    setUpdatingMessage(loadingText);

    if (callback) {
      callback();
    }

    updateTimerRef.current = setTimeout(() => {
      setIsUpdatingInternal(false);
      setUpdatingSection(null);
      setUpdatingMessage('');
      setSavedBanner(successText);
      bannerTimerRef.current = setTimeout(() => {
        setSavedBanner('');
      }, 3500);
    }, 550);
  };

  // SSL Wizard state (persisted in localStorage so custom domain/subdomain stays set)
  const [sslHost, setSslHost] = useState<string>(() => {
    try {
      return localStorage.getItem('arz_ssl_host_v1') || 'panel.arzpulse.io';
    } catch {
      return 'panel.arzpulse.io';
    }
  });
  const [sslEmail, setSslEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('arz_ssl_email_v1') || 'admin@arzpulse.io';
    } catch {
      return 'admin@arzpulse.io';
    }
  });
  const [sslStatus, setSslStatus] = useState<{
    active: boolean;
    host: string;
    mode: string;
    expires: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('arz_ssl_status_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.host) return parsed;
      }
    } catch {
      // ignore
    }
    return {
      active: true,
      host: 'panel.arzpulse.io',
      mode: "Let's Encrypt TLS 1.3 + Nginx SAN (Auto-Renew)",
      expires: '2027-04-17',
    };
  });

  // Price edit state
  const [editingCode, setEditingCode] = useState<string>('USD');
  const [editPriceVal, setEditPriceVal] = useState<string>('1');
  const [editTomanVal, setEditTomanVal] = useState<string>('262400');
  const [editPnlVal, setEditPnlVal] = useState<string>('-0.46');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError('لطفاً نام کاربری و رمز عبور پنل مدیریت را وارد کنید.');
      return;
    }
    if (loginUser.trim() === adminUsername && loginPass.trim() === adminPassword) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است! (می‌توانید از دکمه ورود خودکار مالک استفاده کنید)');
    }
  };

  const handleAutoFillAndLogin = () => {
    setLoginUser(adminUsername);
    setLoginPass(adminPassword);
    setLoginError('');
    setIsAuthenticated(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;
    runWithLoadingState(
      'settings',
      'در حال پردازش و ذخیره تنظیمات امنیتی، گیت‌هاب و ولت‌ها...',
      'تنظیمات مالک و رمز عبور وب‌پنل با موفقیت ذخیره و در ربات به‌روزرسانی شد.',
      () => {
        if (newUser.trim() && newPass.trim()) {
          onUpdateCredentials(newUser.trim(), newPass.trim());
        }
        if (newGithub.trim()) {
          onUpdateGithubUrl(newGithub.trim());
        }
        if (newTon.trim() && newTron.trim()) {
          onUpdateWallets(newTon.trim(), newTron.trim());
        }
      }
    );
  };

  const handleIssueSsl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHost = sslHost
      .trim()
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .split('?')[0]
      .split(':')[0]
      .trim();
    if (!cleanHost || isUpdating) return;
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost);
    runWithLoadingState(
      'ssl',
      `در حال ثبت دائمی ${cleanHost} و صدور گواهی SSL روی پورت 443...`,
      `دامنه/ساب‌دامنه ${cleanHost} به صورت دائمی ثبت شد و گواهی امنیتی SSL روی وب‌پنل و مینی‌اپ فعال گردید.`,
      () => {
        setSslHost(cleanHost);
        const nextStatus = {
          active: true,
          host: cleanHost,
          mode: isIp
            ? 'OpenSSL High-Security SAN IP Certificate (Nginx 443)'
            : "Let's Encrypt Official SSL + Nginx TLS 1.3 (Permanent Domain/Subdomain)",
          expires: '2027-04-17',
        };
        setSslStatus(nextStatus);
        try {
          localStorage.setItem('arz_ssl_host_v1', cleanHost);
          localStorage.setItem('arz_ssl_email_v1', sslEmail.trim());
          localStorage.setItem('arz_ssl_status_v1', JSON.stringify(nextStatus));
        } catch {
          // ignore
        }
      }
    );
  };

  const handlePriceUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;
    const p = parseFloat(editPriceVal);
    const toman = parseFloat(editTomanVal);
    const c = parseFloat(editPnlVal);
    if (!Number.isFinite(p) || p <= 0) return;
    runWithLoadingState(
      'rates',
      `در حال بروزرسانی نرخ لحظه‌ای ${editingCode} در ربات و مینی‌اپ...`,
      `قیمت لحظه‌ای ${editingCode} در ربات و مینی‌اپ به‌روزرسانی شد.`,
      () => {
        onUpdateAssetPrice(
          editingCode,
          p,
          Number.isFinite(c) ? c : 0,
          Number.isFinite(toman) && toman > 0 ? toman : undefined
        );
      }
    );
  };

  if (!isAuthenticated) {
    return (
      <div
        data-testid="admin-panel-root"
        data-theme={activeTheme}
        className={`${
          activeTheme === 'dark' ? 'dark' : 'light'
        } max-w-md mx-auto my-6 bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-rose-500/40 rounded-2xl p-6 space-y-5 shadow-xl dark:shadow-2xl text-slate-900 dark:text-slate-100 transition-colors duration-200`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                ورود به وب‌پنل مدیریت فوق‌حرفه‌ای مالک
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                نام کاربری و رمز عبوری که ربات تلگرام به شما (مالک) داده است را وارد کنید
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleThemeToggle}
            data-testid="admin-theme-toggle"
            aria-label={activeTheme === 'dark' ? 'Switch to Professional Light Mode' : 'Switch to Dark Mode'}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {activeTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Professional Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 space-y-1.5 text-xs" dir="ltr">
          <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-between">
            <span>🤖 Bot Provided Owner Credentials:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[10px]">SSL: https://{sslStatus.host}</span>
          </div>
          <div className="flex items-center justify-between font-mono pt-1">
            <span className="text-slate-600 dark:text-slate-400">Username:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{adminUsername}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-600 dark:text-slate-400">Password:</span>
            <span className="text-amber-700 dark:text-amber-400 font-bold">{adminPassword}</span>
          </div>
        </div>

        {loginError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-800 dark:text-rose-200">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">👤 نام کاربری مدیریت (Username)</label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder={adminUsername}
              aria-label="Admin Username"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">🔑 رمز عبور مدیریت (Password)</label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="••••••••••••"
              aria-label="Admin Password"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-600/25"
            >
              🔐 ورود به پنل مدیریت مالک
            </button>
            <button
              type="button"
              onClick={handleAutoFillAndLogin}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>⚡ جایگذاری خودکار رمز ربات و ورود فوری (One-Click Owner Login)</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      data-testid="admin-panel-root"
      data-theme={activeTheme}
      className={`${
        activeTheme === 'dark' ? 'dark' : 'light'
      } space-y-5 text-slate-900 dark:text-slate-100 transition-colors duration-200`}
      aria-busy={isUpdating}
    >
      {/* Top Admin Header */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-cyan-500/25 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm dark:shadow-xl transition-colors duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            {isUpdating ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                کنسول تحت وب مدیریت فوق‌حرفه‌ای مالک (Owner Web Console)
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                فقط مخصوص مالک ربات
              </span>
              <span
                data-testid="active-theme-badge"
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300"
              >
                {activeTheme === 'light' ? 'Theme: Professional Light' : 'Theme: Dark Mode'}
              </span>
              {isUpdating && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>در حال بروزرسانی...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5" dir="ltr">
              Owner: {adminUsername} · Permanent SSL Host: https://{sslStatus.host}/admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 dark:bg-slate-950/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleThemeToggle}
            data-testid="admin-theme-toggle"
            aria-label={activeTheme === 'dark' ? 'Switch to Professional Light Mode' : 'Switch to Dark Mode'}
            aria-pressed={activeTheme === 'light'}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {activeTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Professional Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'rates'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updatingSection === 'rates' || isSyncingArzDigital ? 'animate-spin' : ''}`} />
            <span>مدیریت نرخ ارزها</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ssl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'ssl'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <GlobeLock className="w-3.5 h-3.5" />
            <span>ثبت دامنه / ساب‌دامنه / آی‌پی + SSL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>تیکت‌ها ({tickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${updatingSection === 'settings' ? 'animate-spin' : ''}`} />
            <span>تنظیمات رمز و ولت‌ها</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginUser('');
              setLoginPass('');
              setLoginError('');
              setIsAuthenticated(false);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-600/20 dark:hover:bg-rose-600/30 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 transition-colors flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>قفل پنل (تست ورود با رمز)</span>
          </button>
        </div>
      </div>

      {/* 4 Institutional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 shadow-xs dark:shadow-none">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">🌐 آدرس ثبت‌شده دائمی (دامنه/ساب‌دامنه/IP)</div>
          <div className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-400 mt-1.5 truncate" dir="ltr">
            https://{sslStatus.host}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-300/80 mt-1">ثبت دائم در کانفیگ Nginx و ربات</div>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl p-4 shadow-xs dark:shadow-none">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">🔒 وضعیت گواهی امنیتی SSL پورت 443</div>
          <div className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-300 mt-1.5 truncate" dir="ltr">
            {sslStatus.mode}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono" dir="ltr">
            MiniApp: https://{sslStatus.host}/miniapp
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 shadow-xs dark:shadow-none">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">🔐 نام کاربری و رمز ورود وب‌پنل (از ربات)</div>
          <div className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-1.5" dir="ltr">
            User: <b className="text-emerald-700 dark:text-emerald-400">{adminUsername}</b> · Pass: <b className="text-amber-700 dark:text-amber-400">{adminPassword}</b>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">قابل تغییر در تب تنظیمات رمز</div>
        </div>
        <div className="bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-4 shadow-xs dark:shadow-none">
          <div className="text-[11px] text-slate-600 dark:text-slate-400">📊 وضعیت فید زنده و تیکت‌ها</div>
          <div className="font-mono text-sm font-extrabold text-blue-700 dark:text-blue-400 mt-1.5">
            {assets.length} ارز زنده · {tickets.length} تیکت
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">متصل به هسته ArzDigital.com</div>
        </div>
      </div>

      {isUpdating && (
        <div
          role="status"
          aria-live="polite"
          data-testid="admin-loading-banner"
          className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-500/40 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <span className="font-medium">
              {updatingMessage ||
                (isSyncingArzDigital
                  ? 'در حال دریافت و همگام‌سازی نرخ‌های زنده از ArzDigital.com...'
                  : 'در حال پردازش و اعمال تغییرات در تنظیمات مدیریت...')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300/80 shrink-0">Processing Update...</span>
        </div>
      )}

      {savedBanner && !isUpdating && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-500/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Quick Owner Bot Control Bar: Group/Channel Addition + Broadcast + Board Sender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/30 rounded-2xl p-5 space-y-3.5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              ➕ افزودن مستقیم ربات به گروه و کانال تلگرام + ارسال تابلو
            </h3>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">startgroup &amp; startchannel</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" dir="ltr">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Bot Username (without @):</label>
              <input
                type="text"
                value={botUsernameInput}
                onChange={(e) => setBotUsernameInput(e.target.value.replace(/^@/, '').trim())}
                placeholder="YourBotUsername"
                disabled={isUpdating}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-400 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Target Channel / Group ID:</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={targetChannelId}
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  placeholder="@mychannel"
                  disabled={isUpdating}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-blue-700 dark:text-blue-400 disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    runWithLoadingState(
                      'board',
                      `در حال ارسال تابلوی زنده ۱۶ ارز به ${targetChannelId || 'کانال/گروه'}...`,
                      `تابلوی زنده ۱۶ ارز ArzDigital با موفقیت به ${targetChannelId || 'کانال/گروه'} ارسال شد.`
                    );
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5"
                >
                  {updatingSection === 'board' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{updatingSection === 'board' ? 'در حال ارسال...' : 'ارسال تابلو'}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => {
                const cleanBot = (botUsernameInput || 'ArzPulseProBot').replace(/^@/, '').trim();
                setSavedBanner(`درخواست افزودن ربات @${cleanBot} به گروه تلگرام فعال شد (tg://resolve?domain=${cleanBot}&startgroup=true).`);
                setTimeout(() => setSavedBanner(''), 4000);
                window.location.href = `tg://resolve?domain=${cleanBot}&startgroup=true`;
              }}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>👥 افزودن ربات به گروه تلگرام</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => {
                const cleanBot = (botUsernameInput || 'ArzPulseProBot').replace(/^@/, '').trim();
                setSavedBanner(`درخواست افزودن ربات @${cleanBot} به کانال تلگرام فعال شد (tg://resolve?domain=${cleanBot}&startchannel).`);
                setTimeout(() => setSavedBanner(''), 4000);
                window.location.href = `tg://resolve?domain=${cleanBot}&startchannel&admin=post_messages+edit_messages+delete_messages`;
              }}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>📢 افزودن ربات به کانال تلگرام</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-rose-500/30 rounded-2xl p-5 space-y-3 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">
              📢 ارسال پیام همگانی به تمام کاربران ربات (Owner Broadcast)
            </h3>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">Active Users: Online</span>
          </div>
          <textarea
            rows={2}
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            disabled={isUpdating}
            placeholder="متن اطلاعیه یا پیام همگانی خود را برای ارسال به تمام کاربران ربات بنویسید..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600 dark:text-slate-400">
              نام کاربری ادمین: <code className="text-emerald-700 dark:text-emerald-400 font-mono">{adminUsername}</code> · رمز: <code className="text-amber-700 dark:text-amber-400 font-mono">{adminPassword}</code>
            </span>
            <button
              type="button"
              disabled={isUpdating || !broadcastText.trim()}
              onClick={() => {
                const msg = broadcastText.trim();
                if (!msg) return;
                runWithLoadingState(
                  'broadcast',
                  'در حال ارسال پیام همگانی به تمام کاربران فعال ربات...',
                  `پیام همگانی «${msg}» با موفقیت برای تمام کاربران ربات ارسال شد.`,
                  () => {
                    setBroadcastText('');
                  }
                );
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
            >
              {updatingSection === 'broadcast' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{updatingSection === 'broadcast' ? 'در حال ارسال پیام...' : 'ارسال به تمام کاربران'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical System Health Alerts Notification Toggle (Downtime & SSL Expiration -> Telegram Chat ID) */}
      <div
        data-testid="critical-health-alerts-card"
        className="bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xs dark:shadow-none transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                healthAlertsEnabled
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
              }`}
            >
              {healthAlertsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  هشدارهای حیاتی سلامت سرور و انقضای SSL در تلگرام (Critical System Health Alerts)
                </h3>
                <span
                  data-testid="health-alerts-status-badge"
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    healthAlertsEnabled
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {healthAlertsEnabled ? 'ACTIVE · ارسال خودکار فعال' : 'MUTED · غیرفعال'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                ارسال مستقیم هشدارهای قطعی سرور (Downtime)، خطای سرویس Nginx/PM2 و هشدار انقضای گواهی SSL به Chat ID تلگرام مشخص‌شده توسط ربات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={healthAlertsEnabled}
              aria-label="Toggle Critical System Health Alerts"
              data-testid="health-alerts-toggle"
              disabled={isUpdating}
              onClick={() => {
                const nextState = !healthAlertsEnabled;
                runWithLoadingState(
                  'alerts',
                  nextState
                    ? `در حال فعال‌سازی ارسال خودکار هشدارهای سلامت سرور و SSL به Chat ID (${alertChatId || 'تلگرام'})...`
                    : 'در حال غیرفعال‌سازی موقت هشدارهای خودکار سلامت سیستم...',
                  nextState
                    ? `ارسال خودکار هشدارهای حیاتی سلامت سرور و انقضای SSL به Chat ID (${alertChatId || 'تلگرام'}) فعال شد.`
                    : 'ارسال خودکار هشدارهای سلامت سیستم در تلگرام غیرفعال شد.',
                  () => {
                    setHealthAlertsEnabled(nextState);
                    try {
                      localStorage.setItem('arz_health_alerts_enabled_v1', String(nextState));
                    } catch {
                      // ignore
                    }
                  }
                );
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 ${
                healthAlertsEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  healthAlertsEnabled ? 'bg-white animate-pulse' : 'bg-slate-400 dark:bg-slate-500'
                }`}
              />
              <span>
                {healthAlertsEnabled
                  ? 'هشدار تلگرام: فعال (Enabled)'
                  : 'هشدار تلگرام: غیرفعال (Disabled)'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Target Telegram Chat ID Input */}
          <div className="lg:col-span-5" dir="ltr">
            <label
              htmlFor="health-alert-chat-id-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Telegram Target Chat ID (Numeric ID or @channel):
            </label>
            <div className="flex items-center gap-2">
              <input
                id="health-alert-chat-id-input"
                type="text"
                value={alertChatId}
                disabled={isUpdating}
                onChange={(e) => setAlertChatId(e.target.value)}
                placeholder="e.g. 59812041 or -100192837465"
                aria-label="Telegram Chat ID for Critical Alerts"
                data-testid="health-alert-chat-id-input"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={isUpdating || !alertChatId.trim()}
                data-testid="save-health-alert-config-btn"
                onClick={() => {
                  const cleanId = alertChatId.trim();
                  if (!cleanId) return;
                  runWithLoadingState(
                    'alerts',
                    `در حال ذخیره Chat ID مقصد (${cleanId}) در سرویس مانیتورینگ ربات...`,
                    `مقصد هشدارهای حیاتی سلامت سرور و SSL روی Chat ID (${cleanId}) ثبت شد.`,
                    () => {
                      setAlertChatId(cleanId);
                      try {
                        localStorage.setItem('arz_health_alert_chat_id_v1', cleanId);
                      } catch {
                        // ignore
                      }
                    }
                  );
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors disabled:opacity-60 cursor-pointer"
              >
                ذخیره Chat ID
              </button>
            </div>
          </div>

          {/* Alert Trigger Checkboxes */}
          <div className="lg:col-span-4 flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={notifyDowntime}
                disabled={!healthAlertsEnabled || isUpdating}
                onChange={(e) => setNotifyDowntime(e.target.checked)}
                data-testid="alert-type-downtime"
                className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
              />
              <span>قطعی سرور / توقف PM2 (Downtime)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={notifySslExpiry}
                disabled={!healthAlertsEnabled || isUpdating}
                onChange={(e) => setNotifySslExpiry(e.target.checked)}
                data-testid="alert-type-ssl"
                className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
              />
              <span>انقضای گواهی SSL (&lt; 14 روز)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={notifyHighMemory}
                disabled={!healthAlertsEnabled || isUpdating}
                onChange={(e) => setNotifyHighMemory(e.target.checked)}
                data-testid="alert-type-memory"
                className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500"
              />
              <span>پر شدن رم/CPU (&gt; 85%)</span>
            </label>
          </div>

          {/* Dispatch Immediate Test Critical Alert Button */}
          <div className="lg:col-span-3 flex justify-end">
            <button
              type="button"
              disabled={isUpdating || !healthAlertsEnabled || !alertChatId.trim()}
              data-testid="send-test-health-alert-btn"
              onClick={() => {
                const cleanId = alertChatId.trim();
                if (!cleanId || !healthAlertsEnabled) return;
                const activeTypes = [
                  notifyDowntime ? 'Downtime Watchdog' : null,
                  notifySslExpiry ? 'SSL Expiry Monitor' : null,
                  notifyHighMemory ? 'Memory/CPU Guard' : null,
                ]
                  .filter(Boolean)
                  .join(' + ') || 'System Health Check';

                const timeNow = new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                });

                runWithLoadingState(
                  'alerts',
                  `در حال ارسال هشدار تست سلامت سرور و وضعیت گواهی SSL به تلگرام (${cleanId})...`,
                  `هشدار حیاتی سلامت سیستم و گواهی SSL با موفقیت توسط ربات به Chat ID (${cleanId}) ارسال شد.`,
                  () => {
                    setLastDispatchedAlert({
                      chatId: cleanId,
                      type: activeTypes,
                      timestamp: timeNow,
                      summary: `🚨 [ArzPulse Watchdog Alert] Host: https://${sslStatus.host} · SSL Valid Until: ${sslStatus.expires} (Auto-Renew Active) · Uptime: 99.98% · Triggers: ${activeTypes}`,
                    });
                  }
                );
              }}
              className="w-full py-2.5 px-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {updatingSection === 'alerts' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {updatingSection === 'alerts'
                  ? 'در حال ارسال هشدار...'
                  : 'ارسال هشدار تست به Chat ID'}
              </span>
            </button>
          </div>
        </div>

        {lastDispatchedAlert && (
          <div
            data-testid="dispatched-health-alert-preview"
            dir="ltr"
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 text-xs font-mono space-y-1.5"
          >
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>TELEGRAM BOT API HEALTH ALERT DISPATCHED</span>
              </span>
              <span>
                chat_id: {lastDispatchedAlert.chatId} · {lastDispatchedAlert.timestamp}
              </span>
            </div>
            <div className="text-slate-700 dark:text-slate-300 break-all">
              {lastDispatchedAlert.summary}
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              صندوق پیام‌های پشتیبانی کاربران ربات و مینی‌اپ
            </h3>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              پاسخ شما بلافاصله در چت تلگرام کاربر نمایش داده می‌شود
            </span>
          </div>

          <div className="space-y-3">
            {tickets.map((tk) => (
              <div
                key={tk.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{tk.userName}</span>
                    <span className="text-slate-400 dark:text-slate-500">·</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">ID: {tk.userId}</span>
                  </div>
                  <span
                    className={`font-mono font-semibold ${
                      tk.status === 'answered' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {tk.status === 'answered' ? 'پاسخ داده شده (Answered)' : 'در انتظار پاسخ (Open)'}
                  </span>
                </div>

                <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                  {tk.message}
                </div>

                {tk.reply && (
                  <div className="text-xs text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                    <strong>پاسخ ارسال‌شده شما:</strong> {tk.reply}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyDrafts[tk.id] || ''}
                    disabled={isUpdating}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [tk.id]: e.target.value }))
                    }
                    placeholder="پاسخ راهنمایی خود را برای این کاربر بنویسید..."
                    aria-label={`Reply to ticket ${tk.id}`}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => {
                      const txt = (replyDrafts[tk.id] || '').trim();
                      if (!txt) return;
                      runWithLoadingState(
                        'tickets',
                        `در حال ثبت و ارسال پاسخ به کاربر ${tk.userName}...`,
                        `پاسخ پشتیبانی با موفقیت به تلگرام کاربر (${tk.userName}) ارسال شد.`,
                        () => {
                          onReplyTicket(tk.id, txt);
                          setReplyDrafts((prev) => ({ ...prev, [tk.id]: '' }));
                        }
                      );
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    {updatingSection === 'tickets' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {updatingSection === 'tickets'
                        ? 'در حال ارسال پاسخ...'
                        : 'ارسال پاسخ به تلگرام کاربر'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Live Market Rates Editor */}
      {activeTab === 'rates' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                مدیریت نرخ ارزها و همگام‌سازی مستقیم با ArzDigital.com
              </h3>
              <a
                href={ARZDIGITAL_USD_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono inline-flex items-center gap-1 mt-1"
              >
                <span>{ARZDIGITAL_USD_URL}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {onSyncArzDigital && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={onSyncArzDigital}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingArzDigital ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncingArzDigital
                    ? 'در حال همگام‌سازی با ArzDigital...'
                    : 'دریافت آنی تمام نرخ‌ها از ArzDigital.com'}
                </span>
              </button>
            )}
          </div>

          <form
            onSubmit={handlePriceUpdateSubmit}
            aria-busy={updatingSection === 'rates'}
            className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">انتخاب ارز</label>
              <select
                value={editingCode}
                disabled={isUpdating}
                onChange={(e) => {
                  const code = e.target.value;
                  setEditingCode(code);
                  const found = assets.find((a) => a.code === code);
                  if (found) {
                    setEditPriceVal(String(found.priceUsd));
                    setEditTomanVal(String(found.priceToman));
                    setEditPnlVal(String(found.change24h));
                  }
                }}
                aria-label="Select Asset to Edit"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 disabled:opacity-60"
              >
                {assets.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.names.fa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">نرخ تومانی (IRT)</label>
              <input
                type="number"
                step="any"
                value={editTomanVal}
                disabled={isUpdating}
                onChange={(e) => setEditTomanVal(e.target.value)}
                aria-label="New Price Toman"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">قیمت به دلار (USD)</label>
              <input
                type="number"
                step="any"
                value={editPriceVal}
                disabled={isUpdating}
                onChange={(e) => setEditPriceVal(e.target.value)}
                aria-label="New Price USD"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">درصد سود/زیان ۲۴ ساعته (%)</label>
              <input
                type="number"
                step="any"
                value={editPnlVal}
                disabled={isUpdating}
                onChange={(e) => setEditPnlVal(e.target.value)}
                aria-label="New 24h PnL Percentage"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {updatingSection === 'rates' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span>
                {updatingSection === 'rates' ? 'در حال اعمال نرخ...' : 'اعمال فوری در ربات و مینی‌اپ'}
              </span>
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {assets.map((a) => (
              <div key={a.code} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{a.code}</span>
                  <span className={a.change24h >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                    {a.change24h >= 0 ? '+' : ''}
                    {a.change24h}%
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatCurrencyValue(getAssetTomanPrice(a, assets))} تومان
                </div>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                  ${formatCurrencyValue(a.priceUsd)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: SSL Manager for Domain / Subdomain / IP */}
      {activeTab === 'ssl' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/30 rounded-2xl p-5 space-y-5 shadow-xs dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ثبت دائمی دامنه، ساب‌دامنه یا آی‌پی سرور و صدور خودکار گواهی SSL
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                وقتی روی هر دامنه، ساب‌دامنه یا حتی آی‌پی گواهی SSL می‌گیرید، همان آدرس به صورت دائمی در <code className="font-mono text-emerald-700 dark:text-emerald-400">custom_domain.txt</code> و <code className="font-mono text-emerald-700 dark:text-emerald-400">.env</code> ثبت می‌ماند
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setSslHost('sub.arzpulse.io')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-[11px] font-mono text-slate-700 dark:text-slate-300"
              >
                🌐 تست ساب‌دامنه (sub.arzpulse.io)
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setSslHost('arzpulse.io')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-cyan-500 text-[11px] font-mono text-slate-700 dark:text-slate-300"
              >
                🌐 تست دامنه اصلی (arzpulse.io)
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setSslHost('185.141.212.44')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-[11px] font-mono text-slate-700 dark:text-slate-300"
              >
                🖥 تست آی‌پی سرور (185.141.212.44)
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-500/30 space-y-2 text-xs font-mono text-slate-700 dark:text-slate-200" dir="ltr">
            <div className="text-emerald-700 dark:text-emerald-400 font-bold">✅ REGISTERED PERMANENT HOST &amp; ACTIVE SSL CERTIFICATE:</div>
            <div>Registered Host (Domain / Subdomain / IP): <span className="text-slate-900 dark:text-slate-100 font-bold">{sslStatus.host}</span></div>
            <div>SSL Certificate Mode: <span className="text-emerald-700 dark:text-emerald-300">{sslStatus.mode}</span></div>
            <div>👑 Owner Web Console (Login with User/Pass): <span className="text-rose-600 dark:text-rose-400">https://{sslStatus.host}/admin</span></div>
            <div>⚡ Owner Web Console (1-Click Auto-Login): <span className="text-blue-600 dark:text-blue-400">https://{sslStatus.host}/admin?autologin=1</span></div>
            <div>🚀 Regular Users Mini App (HTTPS): <span className="text-emerald-700 dark:text-emerald-400">https://{sslStatus.host}/miniapp</span></div>
            <div>Server Auto-SSL CLI: <span className="text-amber-700 dark:text-amber-300">sudo /usr/local/bin/arz-ssl {sslStatus.host} {sslEmail}</span></div>
            <div>Valid Until: {sslStatus.expires}</div>
          </div>

          <form
            onSubmit={handleIssueSsl}
            aria-busy={updatingSection === 'ssl'}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">
                دامنه، ساب‌دامنه یا آی‌پی سرور (Domain / Subdomain / IP)
              </label>
              <input
                type="text"
                value={sslHost}
                disabled={isUpdating}
                onChange={(e) => setSslHost(e.target.value)}
                placeholder="sub.yourdomain.com or 185.x.x.x"
                aria-label="SSL Target Domain or IP"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">ایمیل جهت Let&apos;s Encrypt</label>
              <input
                type="email"
                value={sslEmail}
                disabled={isUpdating}
                onChange={(e) => setSslEmail(e.target.value)}
                aria-label="SSL Email"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              {updatingSection === 'ssl' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span>
                {updatingSection === 'ssl' ? 'در حال ثبت و صدور گواهی SSL...' : '🔒 صدور SSL و ثبت دائمی دامنه/ساب‌دامنه/آی‌پی'}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Owner Credentials, GitHub & Wallets Settings */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          aria-busy={updatingSection === 'settings'}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs dark:shadow-none"
        >
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            تنظیمات نام کاربری/رمز وب‌پنل، لینک گیت‌هاب و ولت‌های ترون و تون
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">
                نام کاربری وب‌پنل (نمایش در بخش مدیریت ربات)
              </label>
              <input
                type="text"
                value={newUser}
                disabled={isUpdating}
                onChange={(e) => setNewUser(e.target.value)}
                aria-label="New Admin Username"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">
                رمز عبور وب‌پنل (نمایش در بخش مدیریت ربات)
              </label>
              <input
                type="text"
                value={newPass}
                disabled={isUpdating}
                onChange={(e) => setNewPass(e.target.value)}
                aria-label="New Admin Password"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">لینک گیت‌هاب سازنده (GitHub URL)</label>
              <input
                type="text"
                value={newGithub}
                disabled={isUpdating}
                onChange={(e) => setNewGithub(e.target.value)}
                aria-label="Creator GitHub URL"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">آدرس ولت تون کوین (TON Wallet)</label>
              <input
                type="text"
                value={newTon}
                disabled={isUpdating}
                onChange={(e) => setNewTon(e.target.value)}
                aria-label="TON Wallet Address"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">آدرس ولت ترون (TRON TRX Wallet)</label>
              <input
                type="text"
                value={newTron}
                disabled={isUpdating}
                onChange={(e) => setNewTron(e.target.value)}
                aria-label="TRON Wallet Address"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-2"
          >
            {updatingSection === 'settings' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>
              {updatingSection === 'settings'
                ? 'در حال ذخیره و اعمال تغییرات...'
                : 'ذخیره تغییرات در کل سیستم'}
            </span>
          </button>
        </form>
      )}
    </div>
  );
};
