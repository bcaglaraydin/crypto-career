'use client';

import React, { useState } from 'react';
import { FuturesPosition } from '@/lib/pnl-calculator';
import { TrendingUp, TrendingDown, ShieldAlert, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface FuturesPositionsTableProps {
  positions: FuturesPosition[];
  currency: 'USD' | 'TRY';
  rate: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const FuturesPositionsTable: React.FC<FuturesPositionsTableProps> = ({
  positions,
  currency,
  rate,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const isUSD = currency === 'USD';
  const prefix = isUSD ? '$' : '₺';

  // Internal collapse state fallback if not controlled
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  // Expanded card tracking on mobile
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (symbol: string) => {
    setExpandedCards((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const formatPrice = (val: number) => {
    const converted = isUSD ? val : val * rate;
    const decimals = converted < 1 ? 4 : converted < 10 ? 3 : 2;
    return `${prefix}${converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  const formatMoney = (val: number, showSign = false) => {
    const abs = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    return showSign ? `${sign}${prefix}${abs}` : `${prefix}${abs}`;
  };

  const totalUnrealizedUSD = positions.reduce((sum, p) => sum + p.unrealizedProfitUSD, 0);
  const totalUnrealized = isUSD ? totalUnrealizedUSD : totalUnrealizedUSD * rate;
  const totalNotionalUSD = positions.reduce((sum, p) => sum + p.notionalUSD, 0);
  const totalNotional = isUSD ? totalNotionalUSD : totalNotionalUSD * rate;

  if (positions.length === 0) {
    return (
      <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-6 sm:p-8 text-center backdrop-blur-sm">
        <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">No Active Futures Positions</p>
        <p className="text-xs text-slate-500 mt-1">You currently have no open contract positions on your Binance Futures account.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl overflow-hidden shadow-xl backdrop-blur-sm transition-all duration-300">
      {/* Top Banner / Summary (Clickable to Collapse/Expand) */}
      <div
        onClick={toggleCollapse}
        className="p-3.5 sm:p-5 border-b border-[#1e2738] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141a27]/60 cursor-pointer select-none hover:bg-[#18202f]/80 transition-colors"
      >
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  Active Futures Positions
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{positions.length} LIVE CONTRACTS</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Real-time open contracts and live unrealized PnL from your Binance USDⓈ-M Futures account
              </p>
            </div>
          </div>

          {/* Mobile Chevron */}
          <div className="sm:hidden text-slate-400 p-1">
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#1e2738]/50">
          <div className="text-left sm:text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Notional Value
            </div>
            <div className="text-xs sm:text-base font-bold font-mono text-slate-200 tabular-nums">
              {formatMoney(totalNotional)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Futures Unrealized PnL
            </div>
            <div
              className={`text-xs sm:text-base font-bold font-mono tabular-nums ${
                totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(totalUnrealized, true)}
            </div>
          </div>

          {/* Desktop Chevron button */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 font-medium pl-2 border-l border-[#1e2738]">
            {isCollapsed ? (
              <span className="flex items-center gap-1 text-sky-400">
                Expand <ChevronDown className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                Collapse <ChevronUp className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* MOBILE VIEW (< 640px): Touch-friendly Expandable Cards */}
          <div className="sm:hidden p-2.5 space-y-2.5 bg-[#0e121a]">
            {positions.map((p) => {
              const unrealized = isUSD ? p.unrealizedProfitUSD : p.unrealizedProfitTRY;
              const notional = isUSD ? p.notionalUSD : p.notionalTRY;
              const isProfit = p.unrealizedProfitUSD >= 0;
              const isCardExpanded = !!expandedCards[p.symbol];

              return (
                <div
                  key={p.symbol}
                  className="bg-[#141924] border border-[#1e2738] rounded-xl p-3 shadow-md transition-all duration-200"
                >
                  {/* Card Header (Tap to expand) */}
                  <div
                    onClick={() => toggleCard(p.symbol)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-100 font-mono text-sm tracking-tight">
                        {p.symbol}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.side === 'LONG'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.side}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {p.leverage}x
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono tabular-nums">
                        <div
                          className={`font-bold text-xs flex items-center justify-end gap-1 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatMoney(unrealized, true)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.roePercentage >= 0 ? `+${p.roePercentage.toFixed(1)}%` : `${p.roePercentage.toFixed(1)}%`} ROE
                        </div>
                      </div>
                      <div className="text-slate-500">
                        {isCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="mt-2 pt-2 border-t border-[#1e2738]/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      Size: <strong className="text-slate-200">{formatMoney(notional)}</strong> ({p.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} units)
                    </span>
                    <span className="text-sky-300">
                      Mark: {formatPrice(p.markPrice)}
                    </span>
                  </div>

                  {/* Expandable Drilldown Details */}
                  {isCardExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#1e2738] grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#0b0e14]/50 p-2 rounded-lg">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Entry Price</span>
                        <span className="text-slate-300 font-semibold">{formatPrice(p.entryPrice)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Mark Price</span>
                        <span className="text-sky-300 font-semibold">{formatPrice(p.markPrice)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Liquidation Price</span>
                        {p.liquidationPrice > 0 ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                            {formatPrice(p.liquidationPrice)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Margin Mode</span>
                        <span className="text-slate-300 font-semibold uppercase">{p.marginType}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 640px): High-Density Table */}
          <div className="hidden sm:block overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#121722]/95 backdrop-blur z-10 border-b border-[#1e2738] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contract / Pair</th>
                  <th className="py-3 px-4 text-right">Position Size</th>
                  <th className="py-3 px-4 text-right">Notional Value</th>
                  <th className="py-3 px-4 text-right">Entry Price</th>
                  <th className="py-3 px-4 text-right">Mark Price</th>
                  <th className="py-3 px-4 text-right">Liquidation Price</th>
                  <th className="py-3 px-4 text-right">Unrealized PnL</th>
                  <th className="py-3 px-4 text-right">ROE (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2738]">
                {positions.map((p) => {
                  const unrealized = isUSD ? p.unrealizedProfitUSD : p.unrealizedProfitTRY;
                  const notional = isUSD ? p.notionalUSD : p.notionalTRY;
                  const isProfit = p.unrealizedProfitUSD >= 0;

                  return (
                    <tr
                      key={p.symbol}
                      className="hover:bg-[#18202f]/70 transition-colors group"
                    >
                      {/* Symbol & Direction Badges */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-100 font-mono text-xs sm:text-sm">
                            {p.symbol}
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              p.side === 'LONG'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {p.side}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {p.leverage}x
                          </span>
                          <span className="text-[10px] font-mono uppercase text-slate-500">
                            {p.marginType}
                          </span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                        {p.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>

                      {/* Notional Value */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300 font-medium">
                        {formatMoney(notional)}
                      </td>

                      {/* Entry Price */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-400">
                        {formatPrice(p.entryPrice)}
                      </td>

                      {/* Mark Price */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-sky-300 font-medium">
                        {formatPrice(p.markPrice)}
                      </td>

                      {/* Liquidation Price */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {p.liquidationPrice > 0 ? (
                          <span className="text-amber-400/90 flex items-center justify-end gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                            {formatPrice(p.liquidationPrice)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Unrealized PnL */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? (
                            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          {formatMoney(unrealized, true)}
                        </span>
                      </td>

                      {/* ROE % */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            p.roePercentage >= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {p.roePercentage >= 0 ? `+${p.roePercentage.toFixed(1)}%` : `${p.roePercentage.toFixed(1)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

