'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Upload, Database, CheckCircle2, AlertCircle, Coins, ChevronDown, Zap } from 'lucide-react';
import { SyncStatus } from '@/lib/sync-engine';

interface HeaderProps {
  currency: 'USD' | 'TRY';
  onCurrencyChange: (c: 'USD' | 'TRY') => void;
  syncStatus: SyncStatus;
  hasCredentials: boolean;
  onSyncClick: (fullSync?: boolean) => void;
  onOpenCsvModal: () => void;
  onSeedDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currency,
  onCurrencyChange,
  syncStatus,
  hasCredentials,
  onSyncClick,
  onOpenCsvModal,
  onSeedDemo,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-[#1e2738] bg-[#0b0e14]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="w-full max-w-[2400px] mx-auto px-3 sm:px-8 xl:px-12 2xl:px-16 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 flex-shrink-0">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-base font-bold text-slate-100 tracking-tight truncate">
                Binance PnL Terminal
              </h1>
              <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold flex-shrink-0">
                LIFETIME
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block truncate">
              Historical FX-adjusted lifetime PnL &amp; cash flow analytics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Last Synced Info (Desktop) */}
          {syncStatus.lastSyncedAt && (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121722]/60 border border-[#1e2738] text-[11px] text-slate-400 font-mono">
              <span className="text-slate-500">Last Synced:</span>
              <span className="text-slate-300 font-semibold">{syncStatus.lastSyncedAt}</span>
            </div>
          )}

          {/* API Key Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121722] border border-[#1e2738] text-xs">
            {hasCredentials ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 font-mono text-[11px]">API Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 font-mono text-[11px]">Awaiting .env.local</span>
              </>
            )}
          </div>

          {/* Currency Switcher (USD / TRY) */}
          <div className="flex items-center bg-[#121722] border border-[#1e2738] rounded-lg p-0.5 sm:p-1 text-xs font-semibold">
            <button
              onClick={() => onCurrencyChange('USD')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">$</span>
              <span className="hidden sm:inline">$ USD</span>
            </button>
            <button
              onClick={() => onCurrencyChange('TRY')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                currency === 'TRY'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">₺</span>
              <span className="hidden sm:inline">₺ TRY</span>
            </button>
          </div>

          {/* CSV Import Button */}
          <button
            onClick={onOpenCsvModal}
            title="Import Binance Historical CSV"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#121722] hover:bg-[#18202f] border border-[#1e2738] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Import CSV</span>
          </button>

          {/* Demo Seed Button */}
          <button
            onClick={onSeedDemo}
            title="Explore demo portfolio"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#121722] hover:bg-[#18202f] border border-[#1e2738] text-slate-400 hover:text-amber-400 rounded-lg text-xs font-medium transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Demo Data</span>
          </button>

          {/* Binance API Sync Button Group (Incremental by default + Full Sync option) */}
          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              disabled={syncStatus.inProgress}
              onClick={() => onSyncClick(false)}
              title={syncStatus.lastSyncedAt ? `Sync new trades since ${syncStatus.lastSyncedAt}` : 'Sync with Binance API'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-l-lg text-xs font-semibold transition-all ${
                syncStatus.inProgress
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.inProgress ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">
                {syncStatus.inProgress
                  ? 'Syncing...'
                  : syncStatus.lastSyncedAt
                  ? 'Sync Delta'
                  : 'Sync Now'}
              </span>
            </button>

            {/* Split Dropdown Trigger */}
            <button
              disabled={syncStatus.inProgress}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Sync options"
              aria-label="Sync options"
              className={`px-1.5 py-1.5 border-l border-sky-600/30 rounded-r-lg text-xs transition-all ${
                syncStatus.inProgress
                  ? 'bg-sky-500/20 text-sky-400 border-r border-t border-b border-sky-500/30 cursor-not-allowed'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#121722] border border-[#1e2738] rounded-xl shadow-2xl p-1.5 z-50 text-xs">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onSyncClick(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#18202f] text-slate-200 flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Sync Delta (Recommended)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Pulls only new trades and transfers since last sync. Fast (2-3 sec).
                  </span>
                </button>

                <div className="my-1 border-t border-[#1e2738]" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onSyncClick(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#18202f] text-slate-200 flex flex-col gap-0.5 transition-colors"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Full Sync (8-Year History)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Performs a complete rescan of all order and transfer history from 2017 to date.
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Banner when active */}
      {syncStatus.inProgress && (
        <div className="bg-sky-950/40 border-t border-sky-500/30 px-4 py-2 flex items-center justify-between text-xs text-sky-300">
          <div className="flex items-center gap-2 max-w-3xl truncate">
            <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {syncStatus.isIncremental ? 'DELTA SYNC' : 'FULL SCAN (8 YEARS)'}
            </span>
            <span className="truncate">{syncStatus.message}</span>
          </div>
          <div className="font-mono text-slate-400 flex-shrink-0">
            Stage {syncStatus.progress} / {syncStatus.totalStages}
          </div>
        </div>
      )}
    </header>
  );
};
