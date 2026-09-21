'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioOverview } from '@/lib/pnl-calculator';
import { SyncStatus } from '@/lib/sync-engine';
import { Header } from '@/components/Header';
import { MetricCards } from '@/components/MetricCards';
import { PnLCharts } from '@/components/PnLCharts';
import { CoinTable } from '@/components/CoinTable';
import { TransfersTable } from '@/components/TransfersTable';
import { FuturesPositionsTable } from '@/components/FuturesPositionsTable';
import { SpotHoldingsTable } from '@/components/SpotHoldingsTable';
import { CsvUploadModal } from '@/components/CsvUploadModal';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Zap,
  Wallet,
  Coins,
  KeyRound,
  FileSpreadsheet,
  Database,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ChevronsUpDown,
} from 'lucide-react';

export default function Home() {
  const [currency, setCurrency] = useState<'USD' | 'TRY'>('USD');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SPOT' | 'FUTURES' | 'TRANSFERS'>('OVERVIEW');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Section collapse states
  const [futuresCollapsed, setFuturesCollapsed] = useState(false);
  const [spotCollapsed, setSpotCollapsed] = useState(false);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);
  const [coinTableCollapsed, setCoinTableCollapsed] = useState(false);

  const areAllCollapsed = futuresCollapsed && spotCollapsed && chartsCollapsed && coinTableCollapsed;

  const toggleAllSections = () => {
    const nextState = !areAllCollapsed;
    setFuturesCollapsed(nextState);
    setSpotCollapsed(nextState);
    setChartsCollapsed(nextState);
    setCoinTableCollapsed(nextState);
  };

  const [loading, setLoading] = useState(true);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    inProgress: false,
    stage: 'IDLE',
    progress: 0,
    totalStages: 6,
    message: '',
    tradesCount: 0,
    transfersCount: 0,
  });

  const [portfolio, setPortfolio] = useState<PortfolioOverview | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio');
      const data = await res.json();
      if (data.success) {
        setHasCredentials(data.hasCredentials);
        setSyncStatus(data.syncStatus);
        setPortfolio(data.portfolio);
      }
    } catch (err) {
      console.error('Portfolio fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Polling sync status if sync is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (syncStatus.inProgress) {
      interval = setInterval(async () => {
        const res = await fetch('/api/sync');
        const data = await res.json();
        if (data.success && data.status) {
          setSyncStatus(data.status);
          if (!data.status.inProgress) {
            // Finished, refresh portfolio
            fetchPortfolio();
            if (data.status.message) {
              setNotification({
                type: data.status.stage === 'ERROR' ? 'error' : 'success',
                message: data.status.message,
              });
            }
          }
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [syncStatus.inProgress, fetchPortfolio]);

  const handleStartSync = async (fullSync: boolean = false) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(data.status);
        setNotification({
          type: 'success',
          message: fullSync
            ? 'Binance full sync (8-year history) initiated.'
            : 'Incremental (Delta) sync initiated.',
        });
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to start sync.' });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setNotification({ type: 'error', message: e.message || 'Failed to start sync.' });
    }
  };

  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Sample demo portfolio loaded successfully!' });
        await fetchPortfolio();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to load demo data.' });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setNotification({ type: 'error', message: e.message || 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const hasData = portfolio && (portfolio.coinSummaries.length > 0 || portfolio.recentTransfers.length > 0);

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      <Header
        currency={currency}
        onCurrencyChange={setCurrency}
        syncStatus={syncStatus}
        hasCredentials={hasCredentials}
        onSyncClick={handleStartSync}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onSeedDemo={handleSeedDemo}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="w-full max-w-[2400px] mx-auto px-4 sm:px-8 xl:px-12 2xl:px-16 mt-4">
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-lg ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[2400px] mx-auto px-4 sm:px-8 xl:px-12 2xl:px-16 py-6 space-y-6">
        {/* Navigation Tabs Bar with Touch Scrolling & Master Collapse/Expand */}
        <div className="flex items-center justify-between gap-3 border-b border-[#1e2738] pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap py-0.5">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === 'OVERVIEW'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121722]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('SPOT')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === 'SPOT'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121722]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Spot</span>
              {portfolio && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                  {portfolio.coinSummaries.filter((c) => c.currentQty > 0.0000001).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('FUTURES')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === 'FUTURES'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121722]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Futures</span>
              {portfolio && portfolio.futuresPositions && portfolio.futuresPositions.length > 0 && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-mono font-semibold animate-pulse">
                  {portfolio.futuresPositions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('TRANSFERS')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === 'TRANSFERS'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121722]'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Cash Flow</span>
              {portfolio && portfolio.recentTransfers.length > 0 && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full font-mono">
                  {portfolio.recentTransfers.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Global Collapse/Expand All Toggle */}
            {activeTab === 'OVERVIEW' && (
              <button
                onClick={toggleAllSections}
                title={areAllCollapsed ? 'Expand all sections' : 'Collapse all sections'}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121722] hover:bg-[#18202f] border border-[#1e2738] text-slate-300 hover:text-white transition-colors flex-shrink-0"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">
                  {areAllCollapsed ? 'Expand All' : 'Collapse All'}
                </span>
              </button>
            )}

            {syncStatus.lastSyncedAt && (
              <div className="text-[11px] text-slate-500 font-mono hidden xl:block">
                Last Synced: {syncStatus.lastSyncedAt}
              </div>
            )}
          </div>
        </div>


        {/* Loading Spinner */}
        {loading ? (
          <div className="h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Calculating portfolio and lifetime PnL...</p>
          </div>
        ) : !hasData ? (
          /* Empty State / Onboarding Guide */
          <div className="bg-[#121722]/80 border border-[#1e2738] rounded-2xl p-8 max-w-3xl mx-auto shadow-2xl backdrop-blur-md">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-sky-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Connect Your Binance Account</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Choose a method to track your lifetime Binance net PnL, coin breakdown, spot holdings, and cash flows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Option 1: .env API */}
              <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between hover:border-sky-500/40 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center mb-3">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">1. Connect via API Key</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Paste your Read-Only Binance API credentials into <code className="text-sky-400">.env.local</code> in the project directory.
                  </p>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Read-Only Permissions
                  </span>
                </div>
              </div>

              {/* Option 2: CSV Upload */}
              <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between hover:border-sky-500/40 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">2. Import CSV Export</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Upload your official Binance transaction history export downloaded from the Binance website.
                  </p>
                </div>
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="mt-4 w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Upload CSV File
                </button>
              </div>

              {/* Option 3: Demo Data */}
              <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between hover:border-sky-500/40 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">3. Explore Demo Data</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Instantly explore the dashboard with realistic 4-year trade history and historical exchange rates (BTC, ETH, SOL).
                  </p>
                </div>
                <button
                  onClick={handleSeedDemo}
                  className="mt-4 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Load Demo Data
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-[#1e2738] text-xs text-slate-400 flex items-center justify-between">
              <span>Read-only Binance API key setup guide:</span>
              <a
                href="https://www.binance.com/en/my/settings/api-management"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1 font-medium"
              >
                Binance API Management <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Main Dashboard Content */
          <>
            {activeTab === 'OVERVIEW' ? (
              <div className="space-y-6">
                {/* 1. Summary Cards */}
                <MetricCards portfolio={portfolio!} currency={currency} />

                {/* 2. Active Futures Positions */}
                {portfolio!.futuresPositions && portfolio!.futuresPositions.length > 0 && (
                  <FuturesPositionsTable
                    positions={portfolio!.futuresPositions}
                    currency={currency}
                    rate={portfolio!.currentUsdtTryRate}
                    isCollapsed={futuresCollapsed}
                    onToggleCollapse={() => setFuturesCollapsed(!futuresCollapsed)}
                  />
                )}

                {/* 3. Active Spot Wallet */}
                <SpotHoldingsTable
                  coins={portfolio!.coinSummaries}
                  currency={currency}
                  rate={portfolio!.currentUsdtTryRate}
                  onCostUpdated={fetchPortfolio}
                  isCollapsed={spotCollapsed}
                  onToggleCollapse={() => setSpotCollapsed(!spotCollapsed)}
                />

                {/* 4. Analytics & Timeline Charts (1D / 1W / 1M) */}
                <PnLCharts
                  portfolio={portfolio!}
                  currency={currency}
                  isCollapsed={chartsCollapsed}
                  onToggleCollapse={() => setChartsCollapsed(!chartsCollapsed)}
                />

                {/* 5. Lifetime Coin PnL Breakdown Table */}
                <CoinTable
                  coins={portfolio!.coinSummaries}
                  currency={currency}
                  onCostUpdated={fetchPortfolio}
                  isCollapsed={coinTableCollapsed}
                  onToggleCollapse={() => setCoinTableCollapsed(!coinTableCollapsed)}
                />
              </div>
            ) : activeTab === 'SPOT' ? (
              <div className="space-y-6">
                <MetricCards portfolio={portfolio!} currency={currency} />
                <SpotHoldingsTable
                  coins={portfolio!.coinSummaries}
                  currency={currency}
                  rate={portfolio!.currentUsdtTryRate}
                  onCostUpdated={fetchPortfolio}
                />
                <CoinTable
                  coins={portfolio!.coinSummaries}
                  currency={currency}
                  onCostUpdated={fetchPortfolio}
                />
              </div>
            ) : activeTab === 'FUTURES' ? (
              <div className="space-y-6">
                <MetricCards portfolio={portfolio!} currency={currency} />
                <FuturesPositionsTable
                  positions={portfolio!.futuresPositions || []}
                  currency={currency}
                  rate={portfolio!.currentUsdtTryRate}
                />
              </div>
            ) : (
              /* 5. Cash Flow (Deposits & Withdrawals) */
              <TransfersTable transfers={portfolio!.recentTransfers} currency={currency} />
            )}

          </>
        )}
      </main>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          setIsCsvModalOpen(false);
          fetchPortfolio();
          setNotification({ type: 'success', message: 'CSV imported successfully and PnL calculated!' });
        }}
      />
    </div>
  );
}
