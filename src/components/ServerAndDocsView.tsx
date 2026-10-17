import React, { useState } from 'react';
import {
  Terminal,
  FileCode2,
  BookOpen,
  Copy,
  Check,
  Download,
  FolderGit2,
  ShieldCheck,
} from 'lucide-react';
import {
  generateAiogramBotCode,
  generateInstallBashScript,
  generateMultilangReadme,
} from '../utils/codeGenerators';
import { RECOMMENDED_REPO_NAMES } from '../utils/currencyEngine';

interface ServerAndDocsViewProps {
  adminUsername: string;
  adminPassword: string;
  githubUrl: string;
  tonWallet: string;
  tronWallet: string;
}

export const ServerAndDocsView: React.FC<ServerAndDocsViewProps> = ({
  adminUsername,
  adminPassword,
  githubUrl,
  tonWallet,
  tronWallet,
}) => {
  const [activeFile, setActiveFile] = useState<'cli' | 'install' | 'bot' | 'readme'>('cli');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive 'sudo arz' simulator state
  const [sslHostInput, setSslHostInput] = useState<string>('bot.yourdomain.com');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'root@ubuntu-vps:~# sudo arz',
    '================================================================',
    '         👑 ArzPulse Pro Server Manager (sudo arz)              ',
    '================================================================',
    '  1) 📊 Show Service Status & Live Logs',
    '  2) 🔄 Update Bot & Web Panel (Git Pull & Pip/NPM Update)',
    '  3) ♻️  Restart Bot & Web Panel Services',
    '  4) 🛑 Stop Bot & Web Panel Services',
    '  5) 🔒 Issue SSL Certificate (Domain / Subdomain / Public IP)',
    '  6) 🔑 Show / Reset Owner Web Admin Panel Credentials',
    '  7) 🗑️  Uninstall ArzPulse Pro Completely',
    '================================================================',
    'Select an option [1-7] using the buttons below to test sudo arz:',
  ]);

  const botCode = generateAiogramBotCode({
    githubUrl,
    tonWallet,
    tronWallet,
    adminUsername,
    adminPassword,
  });
  const installCode = generateInstallBashScript({ githubUrl });
  const readmeCode = generateMultilangReadme();

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard?.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runArzOption = (opt: number) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    if (opt === 1) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 1 (Status)`,
        '● arzpulse-bot.service - Aiogram 3.x Telegram Bot (Active: running)',
        '● arzpulse-web.service - Web Admin & Mini App Server (Active: running on port 3000)',
        '● nginx.service - Reverse Proxy & TLS 1.3 Termination (Active: running)',
      ]);
    } else if (opt === 2) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 2 (Update Script & Bot)`,
        'Fetching latest commits from origin/main...',
        'Updating Python requirements (aiogram, aiohttp, matplotlib)...',
        '✅ ArzPulse Pro updated to latest version and services restarted!',
      ]);
    } else if (opt === 3) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 3 (Restart)`,
        'systemctl restart arzpulse-bot arzpulse-web',
        '✅ Both Telegram Bot and Web Panel restarted cleanly.',
      ]);
    } else if (opt === 4) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 4 (Stop)`,
        'systemctl stop arzpulse-bot arzpulse-web',
        '🛑 Services stopped. Run Option 3 to start again.',
      ]);
    } else if (opt === 5) {
      const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(sslHostInput.trim());
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 5 (SSL Setup for ${sslHostInput})`,
        isIp
          ? `Detected Public IP (${sslHostInput}). Generating 2048-bit RSA Self-Signed TLS Certificate in /etc/nginx/ssl/...`
          : `Detected Domain/Subdomain (${sslHostInput}). Running: certbot --nginx -d ${sslHostInput} --non-interactive --agree-tos --redirect`,
        `✅ HTTPS SSL successfully configured! Web Panel & Mini App live at: https://${sslHostInput}`,
      ]);
    } else if (opt === 6) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 6 (Owner Credentials)`,
        `ADMIN_USERNAME=${adminUsername}`,
        `ADMIN_PASSWORD=${adminPassword}`,
        `TON_WALLET=${tonWallet}`,
        `TRON_WALLET=${tronWallet}`,
      ]);
    } else if (opt === 7) {
      setTerminalLogs((prev) => [
        ...prev,
        `[${ts}] root@vps:~# sudo arz -> Option 7 (Uninstall Simulation)`,
        'Stopping services, removing /opt/arzpulse and /usr/local/bin/arz...',
        '🗑️ Uninstalled cleanly (Simulation Mode).',
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recommended GitHub Repository Names Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100">
              پیشنهاد نام ریپازیتوری گیت‌هاب (Recommended GitHub Repository Names)
            </h2>
          </div>
          <span className="text-xs text-slate-400">با یک کلیک نام ریپازیتوری را کپی کنید</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RECOMMENDED_REPO_NAMES.map((repo) => (
            <div
              key={repo.name}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-2" dir="ltr">
                <span className="font-mono text-sm font-bold text-emerald-400">{repo.name}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(repo.name, `repo-${repo.name}`)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
                >
                  {copiedId === `repo-${repo.name}` ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{repo.tagline}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-navigation for CLI, install.sh, bot.py, README.md */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFile('cli')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeFile === 'cli'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>تست زنده دستور sudo arz و SSL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFile('install')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeFile === 'install'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>اسکریپت نصب سرور (install.sh + sudo arz)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFile('bot')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeFile === 'bot'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>سورس ربات پایتون (bot.py - aiogram 3)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFile('readme')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeFile === 'readme'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>فایل README.md (۶ زبانه + جدول و نمودار)</span>
            </button>
          </div>
        </div>

        {/* View 1: Interactive sudo arz CLI Simulator */}
        {activeFile === 'cli' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  شبیه‌ساز منوی مدیریت سرور <code className="text-emerald-400 font-mono">sudo arz</code>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  شامل آپدیت، ریستارت، توقف، حذف و دریافت گواهی SSL روی دامنه، ساب‌دامنه یا آی‌پی (IP)
                </p>
              </div>
              <div className="flex items-center gap-2" dir="ltr">
                <input
                  type="text"
                  value={sslHostInput}
                  onChange={(e) => setSslHostInput(e.target.value)}
                  placeholder="Domain, Subdomain, or IP"
                  aria-label="Domain or IP for sudo arz SSL"
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => runArzOption(5)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap"
                >
                  5) Issue SSL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" dir="ltr">
              {[
                { num: 1, label: '1) Status' },
                { num: 2, label: '2) Update' },
                { num: 3, label: '3) Restart' },
                { num: 4, label: '4) Stop' },
                { num: 5, label: '5) Get SSL' },
                { num: 6, label: '6) Admin Pass' },
                { num: 7, label: '7) Uninstall' },
              ].map((item) => (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => runArzOption(item.num)}
                  className="py-2 px-3 rounded-xl bg-slate-950 hover:bg-blue-600 border border-slate-800 text-xs font-mono font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1.5 max-h-80 overflow-y-auto"
              dir="ltr"
            >
              {terminalLogs.map((line, i) => (
                <div key={i} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View 2: install.sh */}
        {activeFile === 'install' && (
          <div className="space-y-3" dir="ltr">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                File: install.sh (Installs Bot, Web Panel & /usr/local/bin/arz)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(installCode, 'copy-install')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {copiedId === 'copy-install' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy install.sh</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadFile('install.sh', installCode)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download install.sh</span>
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-[460px]">
              {installCode}
            </pre>
          </div>
        )}

        {/* View 3: bot.py */}
        {activeFile === 'bot' && (
          <div className="space-y-3" dir="ltr">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                File: bot.py (Python aiogram 3.x with Colored ReplyKeyboardMarkup & PnL Chart Generator)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(botCode, 'copy-bot')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {copiedId === 'copy-bot' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy bot.py</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadFile('bot.py', botCode)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download bot.py</span>
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-[460px]">
              {botCode}
            </pre>
          </div>
        )}

        {/* View 4: README.md */}
        {activeFile === 'readme' && (
          <div className="space-y-3" dir="ltr">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                File: README.md (6 Languages: FA, EN, ZH, TR, AR, RU + Badges + Mermaid Diagram + Wallets)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(readmeCode, 'copy-readme')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {copiedId === 'copy-readme' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy README.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadFile('README.md', readmeCode)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download README.md</span>
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-[460px]">
              {readmeCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
