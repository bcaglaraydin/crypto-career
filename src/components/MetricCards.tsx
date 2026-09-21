'use client';

import React, { useState } from 'react';
import { PortfolioOverview } from '@/lib/pnl-calculator';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowDownRight,
  Scale,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MetricCardsProps {
  portfolio: PortfolioOverview;
  currency: 'USD' | 'TRY';
}

export const MetricCards: React.FC<MetricCardsProps> = ({ portfolio, currency }) => {
  const isUSD = currency === 'USD';
  const prefix = isUSD ? '$' : '₺';

  // Mobile tap-to-expand card details state
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleExpand = (cardKey: string) => {
    setExpandedCard((prev) => (prev === cardKey ? null : cardKey));
  };

  const formatMoney = (val: number, showSign = false) => {
    const abs = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    return showSign ? `${sign}${prefix}${abs}` : `${prefix}${abs}`;
  };

  const totalPnL = isUSD ? portfolio.totalPnL_USD : portfolio.totalPnL_TRY;
  const realizedPnL = isUSD ? portfolio.realizedPnL_USD : portfolio.realizedPnL_TRY;
  const unrealizedPnL = isUSD ? portfolio.unrealizedPnL_USD : portfolio.unrealizedPnL_TRY;
  const portfolioValue = isUSD ? portfolio.totalPortfolioValueUSD : portfolio.totalPortfolioValueTRY;
  const netDeposits = isUSD ? portfolio.totalNetDepositsUSD : portfolio.totalNetDepositsTRY;

  // Secondary currency values
  const totalPnL_Sec = !isUSD ? portfolio.totalPnL_USD : portfolio.totalPnL_TRY;
  const secPrefix = !isUSD ? '$' : '₺';

  // Overall ROI based on net deposits or buy volume
  const overallROI = portfolio.totalDepositedUSD > 0
    ? (portfolio.totalPnL_USD / portfolio.totalDepositedUSD) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 2xl:gap-5">
      {/* 1. Total PnL */}
      <div
        onClick={() => toggleExpand('totalPnL')}
        className="bg-[#121722]/90 border border-[#1e2738] hover:border-slate-700/80 rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Lifetime PnL
          </span>
          <div
            className={`p-1 sm:p-1.5 rounded-lg ${
              totalPnL >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {totalPnL >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>

        <div className="my-1.5 sm:my-2">
          <div
            className={`text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums ${
              totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(totalPnL, true)}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5 truncate">
            {secPrefix}
            {Math.abs(totalPnL_Sec).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {isUSD ? 'TRY' : 'USD'}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs">
          <span
            className={`px-1.5 py-0.2 rounded font-mono font-semibold ${
              overallROI >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {overallROI >= 0 ? `+${overallROI.toFixed(1)}%` : `${overallROI.toFixed(1)}%`}
          </span>
          <span className="text-slate-500">all-time ROI</span>
        </div>

        {expandedCard === 'totalPnL' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Realized:</span>
              <strong className={realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatMoney(realizedPnL, true)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Unrealized:</span>
              <strong className={unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatMoney(unrealizedPnL, true)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Portfolio Value */}
      <div
        onClick={() => toggleExpand('portfolioValue')}
        className="bg-[#121722]/90 border border-[#1e2738] hover:border-slate-700/80 rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Portfolio Value
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="my-1.5 sm:my-2">
          <div className="text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-100">
            {formatMoney(portfolioValue)}
          </div>
          <div className="text-[10px] sm:text-xs text-sky-400 font-mono mt-0.5 truncate">
            Spot: {formatMoney(isUSD ? portfolio.spotValueUSD : portfolio.spotValueUSD * portfolio.currentUsdtTryRate)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs text-slate-400 font-mono">
          <span>1 USDT = {portfolio.currentUsdtTryRate.toFixed(2)} ₺</span>
          <span className="text-slate-500 hidden sm:inline">Live Rate</span>
        </div>

        {expandedCard === 'portfolioValue' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Spot Balance:</span>
              <strong className="text-slate-200">
                {formatMoney(isUSD ? portfolio.spotValueUSD : portfolio.spotValueUSD * portfolio.currentUsdtTryRate)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Futures Margin:</span>
              <strong className="text-slate-200">
                {formatMoney(isUSD ? portfolio.futuresValueUSD : portfolio.futuresValueUSD * portfolio.currentUsdtTryRate)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 3. Unrealized PnL */}
      <div
        onClick={() => toggleExpand('unrealizedPnL')}
        className="bg-[#121722]/90 border border-[#1e2738] hover:border-slate-700/80 rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Unrealized PnL
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="my-1.5 sm:my-2">
          <div
            className={`text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums ${
              unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(unrealizedPnL, true)}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5 truncate">
            Futures: <strong className={portfolio.futuresUnrealizedPnL_USD >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatMoney(isUSD ? portfolio.futuresUnrealizedPnL_USD : portfolio.futuresUnrealizedPnL_TRY, true)}</strong>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs text-slate-400">
          <span>Active Positions</span>
          <span className="text-slate-500">{expandedCard === 'unrealizedPnL' ? '▲' : '▼'}</span>
        </div>

        {expandedCard === 'unrealizedPnL' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Spot Unrealized:</span>
              <strong className={portfolio.spotUnrealizedPnL_USD >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatMoney(isUSD ? portfolio.spotUnrealizedPnL_USD : portfolio.spotUnrealizedPnL_TRY, true)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Futures Unrealized:</span>
              <strong className={portfolio.futuresUnrealizedPnL_USD >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatMoney(isUSD ? portfolio.futuresUnrealizedPnL_USD : portfolio.futuresUnrealizedPnL_TRY, true)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 4. Realized PnL */}
      <div
        onClick={() => toggleExpand('realizedPnL')}
        className="bg-[#121722]/90 border border-[#1e2738] hover:border-slate-700/80 rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Realized PnL
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-slate-800/60 text-slate-400 border border-slate-700/40">
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="my-1.5 sm:my-2">
          <div
            className={`text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums ${
              realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(realizedPnL, true)}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
            Closed trades
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs text-slate-400">
          <span>Settled net profit</span>
          <span className="text-slate-500">{expandedCard === 'realizedPnL' ? '▲' : '▼'}</span>
        </div>

        {expandedCard === 'realizedPnL' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Sales Proceeds:</span>
              <strong className="text-slate-200">
                {formatMoney(portfolio.coinSummaries.reduce((sum, c) => sum + (isUSD ? c.totalSoldProceedsUSD : c.totalSoldProceedsTRY), 0))}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 5. Net Deposits */}
      <div
        onClick={() => toggleExpand('netDeposits')}
        className="col-span-2 sm:col-span-2 lg:col-span-1 bg-[#121722]/90 border border-[#1e2738] hover:border-slate-700/80 rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Deposits (Principal)
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="my-1.5 sm:my-2 flex sm:flex-col items-baseline justify-between sm:justify-start gap-2">
          <div className="text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-100">
            {formatMoney(netDeposits)}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-400 font-mono">
            Deposits: {formatMoney(isUSD ? portfolio.totalDepositedUSD : portfolio.totalDepositedTRY)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs text-slate-500 font-mono">
          <span>Withdrawals: {formatMoney(isUSD ? portfolio.totalWithdrawnUSD : portfolio.totalWithdrawnTRY)}</span>
          <span className="text-slate-500">{expandedCard === 'netDeposits' ? '▲' : '▼'}</span>
        </div>

        {expandedCard === 'netDeposits' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Inflow:</span>
              <strong className="text-emerald-400">
                +{formatMoney(isUSD ? portfolio.totalDepositedUSD : portfolio.totalDepositedTRY)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Total Outflow:</span>
              <strong className="text-rose-400">
                -{formatMoney(isUSD ? portfolio.totalWithdrawnUSD : portfolio.totalWithdrawnTRY)}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

