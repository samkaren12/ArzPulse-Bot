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
}

type UpdatingSection = 'settings' | 'rates' | 'ssl' | 'tickets' | 'board' | 'broadcast' | null;

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
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginUser, setLoginUser] = useState<string>(adminUsername);
  const [loginPass, setLoginPass] = useState<string>(adminPassword);
  const [loginError, setLoginError] = useState<string>('');
  const [botUsernameInput, setBotUsernameInput] = useState<string>('ArzPulseProBot');
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [targetChannelId, setTargetChannelId] = useState<string>('@my_crypto_channel');

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

  // SSL Wizard state
  const [sslHost, setSslHost] = useState<string>('panel.arzpulse.io');
  const [sslEmail, setSslEmail] = useState<string>('admin@arzpulse.io');
  const [sslStatus, setSslStatus] = useState<{
    active: boolean;
    host: string;
    mode: string;
    expires: string;
  }>({
    active: true,
    host: 'panel.arzpulse.io',
    mode: "Let's Encrypt TLS 1.3 (Auto-Renew)",
    expires: '2027-01-15',
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
    if (!sslHost.trim() || isUpdating) return;
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(sslHost.trim());
    runWithLoadingState(
      'ssl',
      `در حال صدور و پیکربندی گواهی SSL برای ${sslHost.trim()}...`,
      `گواهی امنیتی SSL برای ${sslHost.trim()} با موفقیت صادر و روی وب‌پنل فعال شد.`,
      () => {
        setSslStatus({
          active: true,
          host: sslHost.trim(),
          mode: isIp
            ? 'OpenSSL High-Security Self-Signed IP Certificate (Nginx 443)'
            : "Let's Encrypt Certbot Official SSL (Domain / Subdomain)",
          expires: '2027-04-17',
        });
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
      <div className="max-w-md mx-auto my-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              ورود به وب‌پنل مدیریت مالک (Owner Admin)
            </h2>
            <p className="text-xs text-slate-400">
              نام کاربری و رمز عبور در دکمه «مدیریت مالک» داخل ربات نمایش داده شده است
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs" dir="ltr">
          <div className="text-slate-400 font-medium">Current Owner Bot Credentials:</div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400">Username:</span>
            <span className="text-emerald-400 font-bold">{adminUsername}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-400">Password:</span>
            <span className="text-amber-400 font-bold">{adminPassword}</span>
          </div>
        </div>

        {loginError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1.5">نام کاربری (Username)</label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder={adminUsername}
              aria-label="Admin Username"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1.5">رمز عبور (Password)</label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="••••••••••••"
              aria-label="Admin Password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              ورود به پنل مدیریت
            </button>
            <button
              type="button"
              onClick={handleAutoFillAndLogin}
              className="w-full py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>ورود سریع با مشخصات مالک ربات (One-Click Owner Login)</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={isUpdating}>
      {/* Top Admin Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            {isUpdating ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-100">
                کنسول مدیریت اختصاصی مالک ربات (Owner Web Admin Panel)
              </h2>
              {isUpdating && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-[11px] font-semibold text-blue-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>در حال بروزرسانی...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Logged in as: {adminUsername} · Feed: ArzDigital.com · SSL: https://{sslStatus.host}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>پیام‌های پشتیبانی ({tickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'rates' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updatingSection === 'rates' || isSyncingArzDigital ? 'animate-spin' : ''}`} />
            <span>مدیریت نرخ ارزها (ArzDigital)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ssl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'ssl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GlobeLock className="w-3.5 h-3.5" />
            <span>دامنه، آی‌پی و SSL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${updatingSection === 'settings' ? 'animate-spin' : ''}`} />
            <span>تنظیمات ولت‌ها و رمز</span>
          </button>
        </div>
      </div>

      {isUpdating && (
        <div
          role="status"
          aria-live="polite"
          data-testid="admin-loading-banner"
          className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-xs text-blue-200 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <span className="font-medium">
              {updatingMessage ||
                (isSyncingArzDigital
                  ? 'در حال دریافت و همگام‌سازی نرخ‌های زنده از ArzDigital.com...'
                  : 'در حال پردازش و اعمال تغییرات در تنظیمات مدیریت...')}
            </span>
          </div>
          <span className="text-[11px] font-mono text-blue-300/80 shrink-0">Processing Update...</span>
        </div>
      )}

      {savedBanner && !isUpdating && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Quick Owner Bot Control Bar: Group/Channel Addition + Broadcast + Board Sender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-emerald-400">
              ➕ افزودن مستقیم ربات به گروه و کانال تلگرام + ارسال تابلو
            </h3>
            <span className="text-[11px] font-mono text-slate-400">startgroup &amp; startchannel</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" dir="ltr">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Bot Username (without @):</label>
              <input
                type="text"
                value={botUsernameInput}
                onChange={(e) => setBotUsernameInput(e.target.value.replace(/^@/, '').trim())}
                placeholder="YourBotUsername"
                disabled={isUpdating}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Channel / Group ID:</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={targetChannelId}
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  placeholder="@mychannel"
                  disabled={isUpdating}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-blue-400 disabled:opacity-60"
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

        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-400">
              📢 ارسال پیام همگانی به تمام کاربران ربات (Owner Broadcast)
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">Active Users: Online</span>
          </div>
          <textarea
            rows={2}
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            disabled={isUpdating}
            placeholder="متن اطلاعیه یا پیام همگانی خود را برای ارسال به تمام کاربران ربات بنویسید..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 disabled:opacity-60"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              نام کاربری ادمین: <code className="text-emerald-400 font-mono">{adminUsername}</code> · رمز: <code className="text-amber-400 font-mono">{adminPassword}</code>
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

      {/* Tab 1: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">
              صندوق پیام‌های پشتیبانی کاربران ربات و مینی‌اپ
            </h3>
            <span className="text-xs text-slate-400">
              پاسخ شما بلافاصله در چت تلگرام کاربر نمایش داده می‌شود
            </span>
          </div>

          <div className="space-y-3">
            {tickets.map((tk) => (
              <div
                key={tk.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{tk.userName}</span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-slate-400">ID: {tk.userId}</span>
                  </div>
                  <span
                    className={`font-mono font-semibold ${
                      tk.status === 'answered' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {tk.status === 'answered' ? 'پاسخ داده شده (Answered)' : 'در انتظار پاسخ (Open)'}
                  </span>
                </div>

                <div className="text-sm text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-800/80">
                  {tk.message}
                </div>

                {tk.reply && (
                  <div className="text-xs text-emerald-300 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30">
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
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-60"
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                مدیریت نرخ ارزها و همگام‌سازی مستقیم با ArzDigital.com
              </h3>
              <a
                href={ARZDIGITAL_USD_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline font-mono inline-flex items-center gap-1 mt-1"
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
              <label className="block text-xs text-slate-400 mb-1">انتخاب ارز</label>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 disabled:opacity-60"
              >
                {assets.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.names.fa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">نرخ تومانی (IRT)</label>
              <input
                type="number"
                step="any"
                value={editTomanVal}
                disabled={isUpdating}
                onChange={(e) => setEditTomanVal(e.target.value)}
                aria-label="New Price Toman"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">قیمت به دلار (USD)</label>
              <input
                type="number"
                step="any"
                value={editPriceVal}
                disabled={isUpdating}
                onChange={(e) => setEditPriceVal(e.target.value)}
                aria-label="New Price USD"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">درصد سود/زیان ۲۴ ساعته (%)</label>
              <input
                type="number"
                step="any"
                value={editPnlVal}
                disabled={isUpdating}
                onChange={(e) => setEditPnlVal(e.target.value)}
                aria-label="New 24h PnL Percentage"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
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
              <div key={a.code} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{a.code}</span>
                  <span className={a.change24h >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                    {a.change24h >= 0 ? '+' : ''}
                    {a.change24h}%
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                  {formatCurrencyValue(getAssetTomanPrice(a, assets))} تومان
                </div>
                <div className="font-mono text-xs text-slate-400 tabular-nums">
                  ${formatCurrencyValue(a.priceUsd)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: SSL Manager for Domain / Subdomain / IP */}
      {activeTab === 'ssl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              دریافت و مدیریت گواهی SSL روی دامنه، ساب‌دامنه یا آی‌پی (IP)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              معادل گزینه ۵ در دستور <code className="font-mono text-blue-400">sudo arz</code> روی سرور لینوکس
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs font-mono" dir="ltr">
            <div className="text-emerald-400 font-bold">ACTIVE SSL CERTIFICATE STATUS:</div>
            <div>Target Host / IP: {sslStatus.host}</div>
            <div>Provider Mode: {sslStatus.mode}</div>
            <div>Valid Until: {sslStatus.expires}</div>
          </div>

          <form
            onSubmit={handleIssueSsl}
            aria-busy={updatingSection === 'ssl'}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                دامنه، ساب‌دامنه یا آی‌پی سرور (Domain / Subdomain / IP)
              </label>
              <input
                type="text"
                value={sslHost}
                disabled={isUpdating}
                onChange={(e) => setSslHost(e.target.value)}
                placeholder="bot.yourdomain.com or 185.x.x.x"
                aria-label="SSL Target Domain or IP"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">ایمیل جهت Let's Encrypt</label>
              <input
                type="email"
                value={sslEmail}
                disabled={isUpdating}
                onChange={(e) => setSslEmail(e.target.value)}
                aria-label="SSL Email"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {updatingSection === 'ssl' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span>
                {updatingSection === 'ssl' ? 'در حال صدور گواهی SSL...' : 'صدور و فعال‌سازی خودکار SSL'}
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
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <h3 className="text-base font-bold text-slate-100">
            تنظیمات نام کاربری/رمز وب‌پنل، لینک گیت‌هاب و ولت‌های ترون و تون
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                نام کاربری وب‌پنل (نمایش در بخش مدیریت ربات)
              </label>
              <input
                type="text"
                value={newUser}
                disabled={isUpdating}
                onChange={(e) => setNewUser(e.target.value)}
                aria-label="New Admin Username"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                رمز عبور وب‌پنل (نمایش در بخش مدیریت ربات)
              </label>
              <input
                type="text"
                value={newPass}
                disabled={isUpdating}
                onChange={(e) => setNewPass(e.target.value)}
                aria-label="New Admin Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-300 mb-1">لینک گیت‌هاب سازنده (GitHub URL)</label>
              <input
                type="text"
                value={newGithub}
                disabled={isUpdating}
                onChange={(e) => setNewGithub(e.target.value)}
                aria-label="Creator GitHub URL"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">آدرس ولت تون کوین (TON Wallet)</label>
              <input
                type="text"
                value={newTon}
                disabled={isUpdating}
                onChange={(e) => setNewTon(e.target.value)}
                aria-label="TON Wallet Address"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">آدرس ولت ترون (TRON TRX Wallet)</label>
              <input
                type="text"
                value={newTron}
                disabled={isUpdating}
                onChange={(e) => setNewTron(e.target.value)}
                aria-label="TRON Wallet Address"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 disabled:opacity-60"
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
