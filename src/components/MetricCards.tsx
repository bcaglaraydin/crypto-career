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

  // Real cash return: "How much did I actually put in vs. what do I have now?"
  // This is the most honest measure of profit/loss — pure cash in vs. current market value.
  const netCashReturn = portfolioValue - netDeposits;
  const cashROI = netDeposits > 0 ? (netCashReturn / netDeposits) * 100 : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 2xl:gap-5">
      {/* 1. Net Cash Return — the honest "am I winning or losing?" answer */}
      <div
        onClick={() => toggleExpand('netCashReturn')}
        className={`bg-[#121722]/90 border rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none ${
          netCashReturn >= 0
            ? 'border-emerald-500/30 hover:border-emerald-500/50'
            : 'border-rose-500/30 hover:border-rose-500/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Cash Return
          </span>
          <div
            className={`p-1 sm:p-1.5 rounded-lg ${
              netCashReturn >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {netCashReturn >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>

        <div className="my-1.5 sm:my-2">
          <div
            className={`text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums ${
              netCashReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(netCashReturn, true)}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5 truncate">
            {formatMoney(netDeposits)} in → {formatMoney(portfolioValue)} now
          </div>
        </div>

        {/* Footer badge: Cash ROI % — the one number that answers everything */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs">
          <span
            className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
              cashROI >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {cashROI >= 0 ? `+${cashROI.toFixed(1)}%` : `${cashROI.toFixed(1)}%`}
          </span>
          <span className="text-slate-500">{expandedCard === 'netCashReturn' ? '▲' : '▼'} on cash</span>
        </div>

        {expandedCard === 'netCashReturn' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Net Cash In:</span>
              <strong className="text-amber-400">{formatMoney(netDeposits)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Portfolio Now:</span>
              <strong className="text-slate-200">{formatMoney(portfolioValue)}</strong>
            </div>
            <div className={`flex justify-between border-t border-[#1e2738]/60 pt-1 mt-1 font-semibold ${netCashReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>Net Return:</span>
              <strong>{formatMoney(netCashReturn, true)} ({cashROI >= 0 ? '+' : ''}{cashROI.toFixed(1)}%)</strong>
            </div>
            <div className="flex justify-between border-t border-[#1e2738]/40 pt-1 mt-1 text-slate-500">
              <span>Trading PnL:</span>
              <span className={totalPnL >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}>{formatMoney(totalPnL, true)}</span>
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
            Trade performance score
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs text-slate-400">
          <span className="text-slate-500 text-[9px] sm:text-[10px]">Includes recycled capital</span>
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
            <div className="text-[9px] sm:text-[10px] text-slate-500 pt-1 border-t border-[#1e2738]/40 leading-relaxed">
              ⓘ This counts profit on every trade cycle. When gains are reinvested, they inflate this number. For your real cash gain/loss, see &quot;Net Cash Return&quot;.
            </div>
          </div>
        )}
      </div>

      {/* 5. Net Deposits & Cash Return */}
      <div
        onClick={() => toggleExpand('netDeposits')}
        className="col-span-2 sm:col-span-2 lg:col-span-1 bg-[#121722]/90 border border-[#1e2738] hover:border-slate-700/80 rounded-xl p-3 sm:p-4 2xl:p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-all cursor-pointer select-none"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Cash Invested
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div className="my-1.5 sm:my-2 flex sm:flex-col items-baseline justify-between sm:justify-start gap-2">
          <div className="text-lg sm:text-2xl 2xl:text-3xl font-bold font-mono tracking-tight tabular-nums text-slate-100">
            {formatMoney(netDeposits)}
          </div>
          <div className={`text-[10px] sm:text-xs font-mono font-semibold tabular-nums ${netCashReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(netCashReturn, true)} now
          </div>
        </div>

        {/* Footer: Cash ROI badge — always visible, the key "am I up or down?" answer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50 text-[10px] sm:text-xs">
          <span className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
            cashROI >= 0
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-rose-500/15 text-rose-400'
          }`}>
            {cashROI >= 0 ? `+${cashROI.toFixed(1)}%` : `${cashROI.toFixed(1)}%`}
          </span>
          <span className="text-slate-500 text-[9px] sm:text-[10px]">cash ROI {expandedCard === 'netDeposits' ? '▲' : '▼'}</span>
        </div>

        {/* Expand drawer: full breakdown */}
        {expandedCard === 'netDeposits' && (
          <div className="mt-2 pt-2 border-t border-dashed border-[#1e2738] text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Deposited:</span>
              <strong className="text-slate-200">
                {formatMoney(isUSD ? portfolio.totalDepositedUSD : portfolio.totalDepositedTRY)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Withdrawn:</span>
              <strong className="text-slate-400">
                -{formatMoney(isUSD ? portfolio.totalWithdrawnUSD : portfolio.totalWithdrawnTRY)}
              </strong>
            </div>
            <div className="flex justify-between border-t border-[#1e2738]/60 pt-1 mt-1">
              <span>Net Cash In:</span>
              <strong className="text-amber-400">{formatMoney(netDeposits)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Portfolio Now:</span>
              <strong className="text-slate-200">{formatMoney(portfolioValue)}</strong>
            </div>
            <div className={`flex justify-between border-t border-[#1e2738]/60 pt-1 mt-1 ${netCashReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className="font-semibold">Net Return:</span>
              <strong>
                {formatMoney(netCashReturn, true)} ({cashROI >= 0 ? '+' : ''}{cashROI.toFixed(1)}%)
              </strong>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

