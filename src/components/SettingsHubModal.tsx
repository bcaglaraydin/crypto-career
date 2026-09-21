'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Key,
  Calendar,
  UploadCloud,
  Smartphone,
  Database,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  saveStoredTrades,
  saveStoredTransfers,
  getStoredTrades,
  getStoredTransfers,
  getStoredBalances,
  getStoredFutures,
  setCachedPortfolio,
  clearClientStorage,
  exportClientBackup,
  restoreClientBackup,
} from '@/lib/client-storage';

interface SettingsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

type TabType = 'api' | 'lookback' | 'csv' | 'mobile' | 'database';

export default function SettingsHubModal({ isOpen, onClose, onDataChanged }: SettingsHubModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('api');

  // Settings State
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiSource, setApiSource] = useState<string>('none');
  const [maskedKey, setMaskedKey] = useState('');
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [port, setPort] = useState('3000');
  const [dbStats, setDbStats] = useState<{
    tradesCount: number;
    transfersCount: number;
    spotBalancesCount: number;
    futuresCount: number;
    lastSyncedAt: string | null;
  }>({
    tradesCount: 0,
    transfersCount: 0,
    spotBalancesCount: 0,
    futuresCount: 0,
    lastSyncedAt: null,
  });

  // API Form State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; accountType?: string } | null>(null);

  // Lookback State
  const [selectedLookback, setSelectedLookback] = useState('all');
  const [customLookbackInput, setCustomLookbackInput] = useState('');
  const [lookbackLabel, setLookbackLabel] = useState('All-Time');
  const [savingLookback, setSavingLookback] = useState(false);
  const [lookbackSuccessMsg, setLookbackSuccessMsg] = useState<string | null>(null);

  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ trades: number; transfers: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mobile Copy State
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Database Action State
  const [clearingDb, setClearingDb] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [dbSuccessMsg, setDbSuccessMsg] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setHasApiKey(data.hasApiKey);
        setApiSource(data.source);
        setMaskedKey(data.maskedApiKey || '');
        setSelectedLookback(data.lookback || 'all');
        setLookbackLabel(data.lookbackLabel || 'All-Time');
        setLocalIps(data.localIps || []);
        setPort(data.port || '3000');
        if (data.dbStats) setDbStats(data.dbStats);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Test Connection
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          apiKey: apiKeyInput.trim() || undefined,
          apiSecret: apiSecretInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connected successfully!' : 'Connection failed.'),
        accountType: data.accountType,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult({ success: false, message: error.message || 'Network request failed.' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle Save API Keys
  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim() || !apiSecretInput.trim()) return;

    try {
      setSavingKeys(true);
      setTestResult(null);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_keys',
          apiKey: apiKeyInput.trim(),
          apiSecret: apiSecretInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        setApiKeyInput('');
        setApiSecretInput('');
        fetchSettings();
        if (onDataChanged) onDataChanged();
      } else {
        setTestResult({ success: false, message: data.message || 'Failed to save credentials.' });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult({ success: false, message: error.message });
    } finally {
      setSavingKeys(false);
    }
  };

  // Handle Clear API Keys
  const handleClearKeys = async () => {
    if (!confirm('Remove API keys stored in local database?')) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_keys' }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        fetchSettings();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Save Lookback
  const handleSaveLookback = async (lookbackValue: string) => {
    try {
      setSavingLookback(true);
      setLookbackSuccessMsg(null);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_lookback',
          lookback: lookbackValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLookback(data.lookback);
        setLookbackLabel(data.lookbackLabel);
        setLookbackSuccessMsg(`Saved! Full sync will look back to: ${data.lookbackLabel} (${data.lookbackStartDate})`);
        setTimeout(() => setLookbackSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLookback(false);
    }
  };

  // Handle CSV Upload
  const handleCsvUpload = async () => {
    if (!csvFile) return;
    try {
      setCsvUploading(true);
      setCsvResult(null);
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.result) {
        if (data.result.trades && data.result.trades.length > 0) {
          await saveStoredTrades(data.result.trades);
        }
        if (data.result.transfers && data.result.transfers.length > 0) {
          await saveStoredTransfers(data.result.transfers);
        }

        try {
          const trades = await getStoredTrades();
          if (trades.length > 0) {
            const transfers = await getStoredTransfers();
            const balances = await getStoredBalances();
            const futures = await getStoredFutures();
            const calcRes = await fetch('/api/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dataset: { trades, transfers, balances, futures } }),
            });
            const calcData = await calcRes.json();
            if (calcData.success && calcData.portfolio) {
              await setCachedPortfolio(calcData.portfolio);
            }
          }
        } catch {}

        setCsvResult({
          trades: data.result.tradesImported,
          transfers: data.result.transfersImported,
          skipped: data.result.tradesSkipped,
          errors: data.result.errors || [],
        });
        setCsvFile(null);
        fetchSettings();
        if (onDataChanged) onDataChanged();
      } else {
        setCsvResult({ trades: 0, transfers: 0, skipped: 0, errors: [data.error || 'Upload failed.'] });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setCsvResult({ trades: 0, transfers: 0, skipped: 0, errors: [error.message] });
    } finally {
      setCsvUploading(false);
    }
  };

  // Handle Load Demo Data
  const handleLoadDemo = async () => {
    try {
      setLoadingDemo(true);
      setDbSuccessMsg(null);
      const res = await fetch('/api/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDbSuccessMsg(data.message || 'Demo data loaded successfully!');
        fetchSettings();
        if (onDataChanged) onDataChanged();
        setTimeout(() => setDbSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDemo(false);
    }
  };

  // Handle Clear Database
  const handleClearDatabase = async () => {
    if (!confirm('Are you sure you want to delete ALL local trades, transfers, and balances? This cannot be undone.')) {
      return;
    }
    try {
      setClearingDb(true);
      setDbSuccessMsg(null);
      await clearClientStorage();
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_database' }),
      });
      const data = await res.json();
      if (data.success) {
        setDbSuccessMsg(data.message);
        fetchSettings();
        if (onDataChanged) onDataChanged();
        setTimeout(() => setDbSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClearingDb(false);
    }
  };

  // Handle Export Data Backup
  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      let backupData: any = null;

      // 1. Try server-side backup first (e.g. localhost SQLite)
      try {
        const res = await fetch('/api/backup');
        const data = await res.json();
        if (
          data.success &&
          data.backup?.dataset &&
          (data.backup.dataset.trades?.length > 0 || data.backup.dataset.transfers?.length > 0)
        ) {
          backupData = data.backup;
        }
      } catch (e) {
        console.warn('Server backup endpoint failed, checking client IndexedDB:', e);
      }

      // 2. If server had no data or failed, export from client IndexedDB
      if (!backupData || (!backupData.dataset?.trades?.length && !backupData.dataset?.transfers?.length)) {
        backupData = await exportClientBackup();
      }

      const totalTrades = backupData.dataset?.trades?.length || 0;
      const totalTransfers = backupData.dataset?.transfers?.length || 0;

      if (totalTrades === 0 && totalTransfers === 0) {
        alert('No transactions or transfers found to export. Sync your account or import a CSV first.');
        return;
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `cryptotrack_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDbSuccessMsg(`Backup exported! (${totalTrades} trades, ${totalTransfers} cash transfers)`);
      setTimeout(() => setDbSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Export failed.');
    } finally {
      setExportingBackup(false);
    }
  };

  // Handle Restore Data Backup
  const handleRestoreBackup = async (file: File) => {
    try {
      setRestoringBackup(true);
      setDbSuccessMsg(null);
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || !parsed.dataset) {
        throw new Error('Invalid backup file. Please select a valid CryptoTrack .json backup.');
      }

      await restoreClientBackup(parsed);

      if (parsed.cachedPortfolio && parsed.cachedPortfolio.totalPortfolioValueUSD > 10) {
        await setCachedPortfolio(parsed.cachedPortfolio);
      }

      // Extract existing ticker prices from dataset or cachedPortfolio
      const tickerPrices: Record<string, number> = { ...(parsed.dataset.tickerPrices || {}) };
      if (parsed.cachedPortfolio?.coinSummaries) {
        for (const c of parsed.cachedPortfolio.coinSummaries) {
          if (c.currentPriceUSD > 0 && !tickerPrices[`${c.asset}USDT`]) {
            tickerPrices[`${c.asset}USDT`] = c.currentPriceUSD;
          }
        }
      }
      if (parsed.cachedPortfolio?.currentUsdtTryRate && !tickerPrices['USDTTRY']) {
        tickerPrices['USDTTRY'] = parsed.cachedPortfolio.currentUsdtTryRate;
      }

      // Trigger recalculation with normalized dataset and tickerPrices
      try {
        const spotBalances = parsed.dataset.spotBalances || parsed.dataset.balances || [];
        const futuresPositions = parsed.dataset.futuresPositions || parsed.dataset.futures || [];
        const walletBalances = parsed.dataset.walletBalances || parsed.dataset.wallets || [];
        const calcRes = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataset: {
              ...parsed.dataset,
              spotBalances,
              balances: spotBalances,
              futuresPositions,
              futures: futuresPositions,
              walletBalances,
              wallets: walletBalances,
              tickerPrices,
            },
          }),
        });
        const calcData = await calcRes.json();
        if (calcData.success && calcData.portfolio && calcData.portfolio.totalPortfolioValueUSD > 10) {
          await setCachedPortfolio(calcData.portfolio);
        }
      } catch (calcErr) {
        console.warn('Stateless recalculation error, retaining cachedPortfolio:', calcErr);
      }

      const tradesCount = parsed.dataset.trades?.length || 0;
      const transfersCount = parsed.dataset.transfers?.length || 0;
      const spotCount = (parsed.dataset.spotBalances || parsed.dataset.balances || []).length;
      setDbSuccessMsg(`Restore successful! Loaded ${tradesCount} trades, ${transfersCount} cash transfers, and ${spotCount} wallet balances.`);
      fetchSettings();
      if (onDataChanged) onDataChanged();
      setTimeout(() => setDbSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Failed to restore backup.');
    } finally {
      setRestoringBackup(false);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = '';
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(id);
    setTimeout(() => setCopiedIp(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#121722] border border-[#1e2738] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2738] bg-[#0e131d]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Terminal Settings & Data Hub
              </h2>
              <p className="text-xs text-slate-400">
                Manage Binance API keys, history lookback range, CSV exports, and mobile network access.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#18202f] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-[#1e2738] bg-[#0e131d]/60 px-4 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-lg transition-all border-t border-x ${
              activeTab === 'api'
                ? 'bg-[#121722] text-sky-400 border-[#1e2738] border-b-[#121722] font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#18202f]/40'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Credentials</span>
            {hasApiKey && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('lookback')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-lg transition-all border-t border-x ${
              activeTab === 'lookback'
                ? 'bg-[#121722] text-sky-400 border-[#1e2738] border-b-[#121722] font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#18202f]/40'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>History Lookback</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">
              {lookbackLabel}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-lg transition-all border-t border-x ${
              activeTab === 'csv'
                ? 'bg-[#121722] text-sky-400 border-[#1e2738] border-b-[#121722] font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#18202f]/40'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Import</span>
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-lg transition-all border-t border-x ${
              activeTab === 'mobile'
                ? 'bg-[#121722] text-sky-400 border-[#1e2738] border-b-[#121722] font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#18202f]/40'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Access</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-lg transition-all border-t border-x ${
              activeTab === 'database'
                ? 'bg-[#121722] text-sky-400 border-[#1e2738] border-b-[#121722] font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#18202f]/40'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Backup & Database</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {/* ============================================================ */}
          {/* TAB 1: API CREDENTIALS & STEP-BY-STEP CREATION GUIDE */}
          {/* ============================================================ */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* Current Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  hasApiKey
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}
              >
                {hasApiKey ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-100">
                      {hasApiKey ? 'Binance API Connected' : 'API Credentials Not Configured'}
                    </h4>
                    {hasApiKey && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active ({apiSource === 'env' ? '.env.local' : 'SQLite DB'})
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 text-slate-400">
                    {hasApiKey
                      ? `Key: ${maskedKey || 'Configured'}. Terminal can sync spot trades, transfers, balances, and futures income.`
                      : 'Provide your read-only Binance API credentials below to enable automated lifetime synchronization.'}
                  </p>
                  {hasApiKey && (
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Test Active Connection
                      </button>
                      {apiSource === 'database' && (
                        <button
                          onClick={handleClearKeys}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition-colors"
                        >
                          Remove from DB
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Step-by-Step Tutorial Box */}
              <div className="bg-[#0e131d] border border-[#1e2738] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    How to generate a secure Binance API Key
                  </h4>
                  <a
                    href="https://www.binance.com/en/my/settings/api-management"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                  >
                    Open Binance API Management <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="space-y-2 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
                  <li>
                    Log in to <strong className="text-slate-200">Binance.com</strong>, click your Profile icon in the top right, and select <strong className="text-slate-200">API Management</strong>.
                  </li>
                  <li>
                    Click <strong className="text-slate-200">Create API</strong> &gt; Select <strong className="text-slate-200">System Generated</strong>.
                  </li>
                  <li>
                    Give it a label (e.g. <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">CryptoTracker</code>) and complete 2FA verification.
                  </li>
                  <li className="text-amber-300/90 font-medium">
                    <span className="text-amber-400 font-bold uppercase tracking-wide">Security Rule:</span> Select <strong className="text-amber-200">&quot;Can Read&quot; (Read-Only) ONLY</strong>. Leave &quot;Enable Spot &amp; Margin Trading&quot;, &quot;Enable Futures&quot;, and &quot;Enable Withdrawals&quot; <strong className="text-rose-400">UNCHECKED</strong>.
                  </li>
                  <li>
                    Copy your <strong className="text-slate-200">API Key</strong> and <strong className="text-slate-200">Secret Key</strong> and paste them into the form below.
                  </li>
                </ol>

                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 leading-snug">
                  🔒 <strong>Privacy Guarantee:</strong> Keys entered here are saved exclusively into your local SQLite database (<code className="text-sky-200">crypto_tracker.db</code>) on your own device. They are NEVER transmitted to any external server or third party.
                </div>
              </div>

              {/* API Key Form */}
              <form onSubmit={handleSaveKeys} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Binance API Key
                  </label>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={hasApiKey ? '•••••••••••••••••••••••••••• (Leave blank to keep existing)' : 'Paste your Binance API Key here'}
                    className="w-full bg-[#0e131d] border border-[#1e2738] focus:border-sky-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 font-mono outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Binance API Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={apiSecretInput}
                      onChange={(e) => setApiSecretInput(e.target.value)}
                      placeholder={hasApiKey ? '•••••••••••••••••••••••••••• (Leave blank to keep existing)' : 'Paste your Binance API Secret Key here'}
                      className="w-full bg-[#0e131d] border border-[#1e2738] focus:border-sky-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 font-mono outline-none transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Feedback result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingKeys || !apiKeyInput.trim() || !apiSecretInput.trim()}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors shadow-sm"
                  >
                    {savingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Verify &amp; Save to Database
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || (!hasApiKey && (!apiKeyInput || !apiSecretInput))}
                    className="px-3.5 py-2 rounded-lg bg-[#18202f] hover:bg-[#202b3f] disabled:opacity-40 disabled:pointer-events-none text-slate-300 border border-[#1e2738] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Test Credentials
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: HISTORY LOOKBACK & SCAN RANGE */}
          {/* ============================================================ */}
          {activeTab === 'lookback' && (
            <div className="space-y-6">
              <div className="bg-[#0e131d] border border-[#1e2738] rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  Full Sync Historical Lookback Range
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Controls how far back the terminal scans your trading and deposit history when you trigger a <strong>Full Sync</strong>. Subsequent <strong>Delta Syncs</strong> automatically scan only missing data since your last sync timestamp.
                </p>
              </div>

              {lookbackSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{lookbackSuccessMsg}</span>
                </div>
              )}

              {/* Lookback Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'all',
                    title: 'All-Time (Account Genesis)',
                    badge: 'Recommended',
                    desc: 'Scans all history since Binance inception (2017). Ensures accounts of any age capture 100% of trades.',
                  },
                  {
                    id: '10y',
                    title: '10 Years',
                    badge: 'Full Decade',
                    desc: 'Scans up to 10 years of trading, deposits, withdrawals, and futures income.',
                  },
                  {
                    id: '8y',
                    title: '8 Years',
                    badge: 'Legacy Default',
                    desc: 'Scans 8 years back from today (original terminal lookback setting).',
                  },
                  {
                    id: '5y',
                    title: '5 Years',
                    badge: 'Bull 2021 Cycle',
                    desc: 'Focuses on trades from 2021 bull run to present day.',
                  },
                  {
                    id: '3y',
                    title: '3 Years',
                    badge: 'Recent Cycle',
                    desc: 'Faster sync focusing on the recent 36-month market cycle.',
                  },
                  {
                    id: '1y',
                    title: '1 Year',
                    badge: 'High Speed',
                    desc: 'Quick scan of active trades and transfers over the past 12 months.',
                  },
                ].map((preset) => {
                  const isSelected = selectedLookback === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSaveLookback(preset.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                          : 'bg-[#0e131d] border-[#1e2738] hover:border-slate-700 hover:bg-[#151c2a]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold text-xs ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                          {preset.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{preset.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Custom Date / Year option */}
              <div className="bg-[#0e131d] border border-[#1e2738] rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-semibold text-slate-200">
                  Custom Historical Start Date or Year
                </h5>
                <p className="text-[11px] text-slate-400">
                  Have trades or account history predating 2017 (e.g. from 2014, 2015, or external imports)? Enter an exact start year or date below:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customLookbackInput}
                    onChange={(e) => setCustomLookbackInput(e.target.value)}
                    placeholder="e.g. 2016 or 2015-08-01"
                    className="bg-[#121722] border border-[#1e2738] focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none w-48"
                  />
                  <button
                    onClick={() => {
                      if (customLookbackInput.trim()) {
                        handleSaveLookback(customLookbackInput.trim());
                      }
                    }}
                    disabled={savingLookback || !customLookbackInput.trim()}
                    className="px-3 py-2 rounded-lg bg-[#18202f] hover:bg-[#202b3f] disabled:opacity-40 text-slate-200 border border-[#1e2738] text-xs font-semibold transition-colors"
                  >
                    Set Custom Start
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: CSV EXPORT GUIDE & DIRECT FILE UPLOAD */}
          {/* ============================================================ */}
          {activeTab === 'csv' && (
            <div className="space-y-6">
              {/* Step-by-Step Instructions */}
              <div className="bg-[#0e131d] border border-[#1e2738] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                    How to Export Binance CSV History
                  </h4>
                  <a
                    href="https://www.binance.com/en/my/orders/exchange/usertrade"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
                  >
                    Open Binance Trade History <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-3 text-xs text-slate-400">
                  <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <strong className="text-slate-200 block mb-1">1. Spot Trade History:</strong>
                    Go to <strong className="text-slate-300">Orders &gt; Spot Order &gt; Trade History</strong>. Click <strong className="text-sky-300">Export</strong> in the top right corner. Choose <strong className="text-slate-300">&quot;Beyond 6 months&quot;</strong> or Custom Date, click Export, and download the generated zip/csv.
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <strong className="text-slate-200 block mb-1">2. Deposits &amp; Withdrawals (Transfers):</strong>
                    Go to <strong className="text-slate-300">Wallet &gt; Transaction History</strong>. Under Deposit/Withdraw, click <strong className="text-sky-300">Export</strong>.
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <strong className="text-slate-200 block mb-1">3. Buy Crypto (Fiat/Card Purchases):</strong>
                    Go to <strong className="text-slate-300">Orders &gt; Buy Crypto History</strong>, select your date range, and click <strong className="text-sky-300">Export</strong>.
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1e2738] hover:border-sky-500/50 bg-[#0e131d]/60 hover:bg-[#0e131d] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCsvFile(e.target.files[0]);
                      setCsvResult(null);
                    }
                  }}
                />
                <div className="p-3 rounded-full bg-sky-500/10 text-sky-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {csvFile ? csvFile.name : 'Click or tap to choose Binance CSV file'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Supports Binance Spot Trade History, Buy Crypto Fiat, and Deposit/Withdrawal CSVs.
                </div>
              </div>

              {/* Upload Action */}
              {csvFile && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0e131d] border border-[#1e2738]">
                  <div className="flex items-center gap-2 text-xs text-slate-200 font-mono">
                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                    <span>{csvFile.name}</span>
                    <span className="text-slate-500">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={handleCsvUpload}
                    disabled={csvUploading}
                    className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {csvUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    Import CSV Now
                  </button>
                </div>
              )}

              {/* Result Summary */}
              {csvResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    csvResult.errors.length === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {csvResult.errors.length === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {csvResult.errors.length === 0 ? 'CSV Imported Successfully' : 'Import Finished with Warnings'}
                  </div>
                  <div className="text-slate-300 text-[11px] space-y-0.5">
                    <div>• New Trades Imported: <strong>{csvResult.trades}</strong></div>
                    <div>• New Transfers (Deposits/Withdrawals) Imported: <strong>{csvResult.transfers}</strong></div>
                    <div>• Duplicates Skipped: <strong>{csvResult.skipped}</strong></div>
                  </div>
                  {csvResult.errors.length > 0 && (
                    <div className="pt-2 text-[11px] text-rose-300 border-t border-rose-500/20">
                      {csvResult.errors.join(' | ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: MOBILE & LOCAL NETWORK (LAN) ACCESS */}
          {/* ============================================================ */}
          {activeTab === 'mobile' && (
            <div className="space-y-6">
              <div className="bg-[#0e131d] border border-[#1e2738] rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  Connect from your Smartphone or Tablet
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No cloud deployment required! Your server binds to your local Wi-Fi network (<code className="text-sky-300 font-mono">0.0.0.0</code>). As long as your phone is on the same Wi-Fi, you can access the full terminal and manage everything from your phone&apos;s browser.
                </p>
              </div>

              {/* Local IP Address Cards */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Your Local Network URLs (Open on your phone&apos;s browser):
                </label>

                {localIps.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#0e131d] border border-[#1e2738] text-xs text-slate-400">
                    No active Wi-Fi/Ethernet IPv4 address detected. Ensure this computer is connected to your local network.
                  </div>
                ) : (
                  localIps.map((ip) => {
                    const fullUrl = `http://${ip}:${port}`;
                    const isCopied = copiedIp === ip;
                    return (
                      <div
                        key={ip}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e131d] border border-[#1e2738] hover:border-sky-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-xs">
                            Wi-Fi
                          </div>
                          <div>
                            <div className="text-xs font-mono font-bold text-slate-100">{fullUrl}</div>
                            <div className="text-[10px] text-slate-500">Local Area Network address</div>
                          </div>
                        </div>

                        <button
                          onClick={() => copyToClipboard(fullUrl, ip)}
                          className="px-3 py-1.5 rounded-lg bg-[#18202f] hover:bg-[#202b3f] text-slate-300 border border-[#1e2738] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mobile Best Practices */}
              <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2738] space-y-2 text-xs text-slate-400">
                <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Mobile App Tip (Install to Home Screen):
                </h5>
                <p className="leading-relaxed">
                  On <strong>iOS Safari</strong>: Tap the Share button &gt; Select <strong>&quot;Add to Home Screen&quot;</strong>.<br />
                  On <strong>Android Chrome</strong>: Tap the three dots menu &gt; Select <strong>&quot;Install App&quot;</strong> or &quot;Add to Home Screen&quot;.<br />
                  The terminal will run as a native-feeling, standalone mobile app without browser address bars!
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: DATABASE & DEMO DATA CONTROLS */}
          {/* ============================================================ */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* Database Record Statistics */}
              <div className="bg-[#0e131d] border border-[#1e2738] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  Local SQLite Database Statistics (<code className="text-slate-300">crypto_tracker.db</code>)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <div className="text-[11px] text-slate-400">Total Trades</div>
                    <div className="text-lg font-bold font-mono text-slate-100">{dbStats.tradesCount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <div className="text-[11px] text-slate-400">Cash Transfers</div>
                    <div className="text-lg font-bold font-mono text-slate-100">{dbStats.transfersCount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <div className="text-[11px] text-slate-400">Active Spot Assets</div>
                    <div className="text-lg font-bold font-mono text-slate-100">{dbStats.spotBalancesCount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121722] border border-[#1e2738]">
                    <div className="text-[11px] text-slate-400">Futures Positions</div>
                    <div className="text-lg font-bold font-mono text-slate-100">{dbStats.futuresCount}</div>
                  </div>
                </div>

                {dbStats.lastSyncedAt && (
                  <div className="text-[11px] text-slate-500 pt-1">
                    Last sync completed at: <strong className="text-slate-400">{dbStats.lastSyncedAt}</strong>
                  </div>
                )}
              </div>

              {dbSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{dbSuccessMsg}</span>
                </div>
              )}

              {/* 1-Click Backup & Data Transfer Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Export Backup Card */}
                <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2738] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Download className="w-4 h-4" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-100">Export Backup (JSON)</h5>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Download your entire transaction history, balances, and calculated portfolio to migrate to mobile or web deployment without re-syncing.
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    disabled={exportingBackup}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {exportingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Export Backup (JSON)
                  </button>
                </div>

                {/* 2. Restore Backup Card */}
                <div className="p-4 rounded-xl bg-[#0e131d] border border-[#1e2738] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <h5 className="text-xs font-bold text-slate-100">Restore Backup (JSON)</h5>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Upload your previously exported backup file to instantly load your lifetime history, 87 coins, and calculations in 1 second.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    ref={backupFileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleRestoreBackup(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    disabled={restoringBackup}
                    className="w-full py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {restoringBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    Restore Backup (JSON)
                  </button>
                </div>
              </div>

              {/* Load Demo Data */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0e131d] border border-[#1e2738]">
                <div>
                  <h5 className="text-xs font-semibold text-slate-200">Load Demo Portfolio Data</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Load mock trades, transfers, and futures positions to showcase and test the terminal without connecting an API.
                  </p>
                </div>
                <button
                  onClick={handleLoadDemo}
                  disabled={loadingDemo}
                  className="px-3.5 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {loadingDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Load Demo Data
                </button>
              </div>

              {/* Wipe / Reset Database */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div>
                  <h5 className="text-xs font-semibold text-rose-300">Clear Local Database</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Deletes all cached trades, cash flows, and spot/futures balances. Your API keys will remain saved.
                  </p>
                </div>
                <button
                  onClick={handleClearDatabase}
                  disabled={clearingDb}
                  className="px-3.5 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {clearingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Reset Database
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-[#1e2738] bg-[#0e131d] flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            CryptoTrack Local v0.1.0 • 100% Private SQLite Terminal
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#18202f] hover:bg-[#202b3f] text-slate-200 border border-[#1e2738] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
