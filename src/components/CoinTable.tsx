'use client';

import React, { useState, useMemo } from 'react';
import { CoinPnLSummary } from '@/lib/pnl-calculator';
import {
  Search,
  ArrowUpDown,
  Award,
  AlertTriangle,
  Edit3,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Coins,
} from 'lucide-react';

interface CoinTableProps {
  coins: CoinPnLSummary[];
  currency: 'USD' | 'TRY';
  onCostUpdated?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type SortField = 'totalPnL' | 'realizedPnL' | 'unrealizedPnL' | 'roiPercentage' | 'currentValue' | 'asset';
type SortOrder = 'asc' | 'desc';
type FilterMode = 'ALL' | 'PROFIT' | 'LOSS' | 'HOLDING';

export const CoinTable: React.FC<CoinTableProps> = ({
  coins,
  currency,
  onCostUpdated,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const isUSD = currency === 'USD';
  const prefix = isUSD ? '$' : '₺';

  // Section collapse state
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  // Expanded card tracking on mobile
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (asset: string) => {
    setExpandedCards((prev) => ({ ...prev, [asset]: !prev[asset] }));
  };

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Inline cost editing state
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [inputCost, setInputCost] = useState('');
  const [savingCost, setSavingCost] = useState(false);

  const topGainer = useMemo(() => {
    return coins.reduce<CoinPnLSummary | null>((max, c) => (!max || c.totalPnL_USD > max.totalPnL_USD ? c : max), null);
  }, [coins]);

  const topLoser = useMemo(() => {
    return coins.reduce<CoinPnLSummary | null>((min, c) => (!min || c.totalPnL_USD < min.totalPnL_USD ? c : min), null);
  }, [coins]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSaveCost = async (asset: string) => {
    setSavingCost(true);
    try {
      const res = await fetch('/api/custom-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, costUSD: inputCost }),
      });
      if (res.ok) {
        setEditingAsset(null);
        setInputCost('');
        if (onCostUpdated) onCostUpdated();
      }
    } catch (e) {
      console.error('Failed to save custom cost:', e);
    } finally {
      setSavingCost(false);
    }
  };

  const filteredAndSortedCoins = useMemo(() => {
    let result = coins.filter((coin) => {
      const matchesSearch = coin.asset.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'PROFIT') return coin.totalPnL_USD > 0;
      if (filterMode === 'LOSS') return coin.totalPnL_USD < 0;
      if (filterMode === 'HOLDING') return coin.currentQty > 0.000001;
      return true;
    });

    result.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortField === 'totalPnL') {
        aVal = isUSD ? a.totalPnL_USD : a.totalPnL_TRY;
        bVal = isUSD ? b.totalPnL_USD : b.totalPnL_TRY;
      } else if (sortField === 'realizedPnL') {
        aVal = isUSD ? a.realizedPnL_USD : a.realizedPnL_TRY;
        bVal = isUSD ? b.realizedPnL_USD : b.realizedPnL_TRY;
      } else if (sortField === 'unrealizedPnL') {
        aVal = isUSD ? a.unrealizedPnL_USD : a.unrealizedPnL_TRY;
        bVal = isUSD ? b.unrealizedPnL_USD : b.unrealizedPnL_TRY;
      } else if (sortField === 'roiPercentage') {
        aVal = a.roiPercentage;
        bVal = b.roiPercentage;
      } else if (sortField === 'currentValue') {
        aVal = isUSD ? a.currentValueUSD : a.currentValueTRY;
        bVal = isUSD ? b.currentValueUSD : b.currentValueTRY;
      } else if (sortField === 'asset') {
        return sortOrder === 'asc' ? a.asset.localeCompare(b.asset) : b.asset.localeCompare(a.asset);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [coins, search, filterMode, sortField, sortOrder, isUSD]);

  const formatCoinQty = (val: number) => {
    if (val === 0) return '0';
    if (val < 0.001) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    return val.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  const formatPrice = (val: number) => {
    if (val === 0) return '-';
    if (val < 0.01) return `${prefix}${val.toFixed(6)}`;
    if (val < 1) return `${prefix}${val.toFixed(4)}`;
    return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMoney = (val: number, showSign = true) => {
    const abs = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    return showSign ? `${sign}${prefix}${abs}` : `${prefix}${abs}`;
  };

  return (
    <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl shadow-lg backdrop-blur-sm overflow-hidden transition-all duration-300">
      {/* Table Toolbar & Collapsible Header */}
      <div
        onClick={toggleCollapse}
        className="p-3.5 sm:p-4 2xl:p-5 border-b border-[#1e2738] flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none hover:bg-[#18202f]/60 transition-colors"
      >
        <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base 2xl:text-lg font-semibold text-slate-100">
                  Lifetime Coin PnL Breakdown
                </h3>
                <span className="text-[10px] sm:text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                  {coins.length} assets
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Realized and unrealized PnL breakdown for every coin traded over the 8-year history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isCollapsed ? (
              <span className="flex items-center gap-1 text-sky-400 font-medium">
                Expand <ChevronDown className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 font-medium">
                Collapse <ChevronUp className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>

        {/* Search & Filter pills when not collapsed on desktop */}
        {!isCollapsed && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center gap-2.5"
          >
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search coin (BTC, SOL, ADA)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#18202f] border border-[#1e2738] focus:border-sky-500 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none w-44 sm:w-56 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-[#18202f] border border-[#1e2738] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2 py-1 rounded-md transition-colors ${filterMode === 'ALL' ? 'bg-sky-500/20 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('PROFIT')}
                className={`px-2 py-1 rounded-md transition-colors ${filterMode === 'PROFIT' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                In Profit (+)
              </button>
              <button
                onClick={() => setFilterMode('LOSS')}
                className={`px-2 py-1 rounded-md transition-colors ${filterMode === 'LOSS' ? 'bg-rose-500/20 text-rose-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                In Loss (-)
              </button>
              <button
                onClick={() => setFilterMode('HOLDING')}
                className={`px-2 py-1 rounded-md transition-colors ${filterMode === 'HOLDING' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Holding
              </button>
            </div>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* MOBILE VIEW (< 640px): Touch-friendly Expandable Cards */}
          <div className="sm:hidden p-2.5 space-y-2.5 bg-[#0e121a]">
            {filteredAndSortedCoins.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No assets match your search or filter.
              </div>
            ) : (
              filteredAndSortedCoins.map((coin) => {
                const totalPnL = isUSD ? coin.totalPnL_USD : coin.totalPnL_TRY;
                const realizedPnL = isUSD ? coin.realizedPnL_USD : coin.realizedPnL_TRY;
                const unrealizedPnL = isUSD ? coin.unrealizedPnL_USD : coin.unrealizedPnL_TRY;
                const avgBuyPrice = isUSD ? coin.avgBuyPriceUSD : coin.avgBuyPriceTRY;
                const currentPrice = isUSD ? coin.currentPriceUSD : coin.currentPriceTRY;
                const currentValue = isUSD ? coin.currentValueUSD : coin.currentValueTRY;
                const isProfit = totalPnL >= 0;
                const isCardExpanded = !!expandedCards[coin.asset];
                const isEditing = editingAsset === coin.asset;

                return (
                  <div
                    key={coin.asset}
                    className="bg-[#141924] border border-[#1e2738] rounded-xl p-3 shadow-md transition-all duration-200"
                  >
                    {/* Top Row: Symbol, Holding Pill, Total PnL, Expand Chevron */}
                    <div
                      onClick={() => toggleCard(coin.asset)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-xs font-mono text-slate-200 shadow-sm">
                          {coin.asset.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 font-mono text-sm flex items-center gap-1.5">
                            {coin.asset}
                            {coin.currentQty > 0.00001 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-sans">
                                Holding
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {coin.currentQty > 0
                              ? `${formatCoinQty(coin.currentQty)} units (${formatMoney(currentValue, false)})`
                              : `${formatCoinQty(coin.totalSoldQty)} units sold`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right font-mono tabular-nums">
                          <div
                            className={`font-bold text-sm ${
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatMoney(totalPnL)}
                          </div>
                          <div className="text-[10px]">
                            <span
                              className={`px-1 py-0.2 rounded font-semibold ${
                                coin.roiPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {coin.roiPercentage >= 0 ? `+${coin.roiPercentage.toFixed(1)}%` : `${coin.roiPercentage.toFixed(1)}%`} ROI
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-500">
                          {isCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Drilldown Drawer */}
                    {isCardExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#1e2738] bg-[#0b0e14]/50 p-2.5 rounded-lg space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Realized PnL:</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatMoney(realizedPnL)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Unrealized (Holding) PnL:</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatMoney(unrealizedPnL)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Current Price:</span>
                          <span className="text-sky-300 font-semibold">{formatPrice(currentPrice)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Average Buy Cost:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                value={inputCost}
                                onChange={(e) => setInputCost(e.target.value)}
                                placeholder="Cost ($)"
                                className="w-20 px-1.5 py-0.5 bg-[#0b0e14] border border-sky-500 rounded text-xs text-white font-mono"
                                autoFocus
                              />
                              <button
                                disabled={savingCost}
                                onClick={() => handleSaveCost(coin.asset)}
                                className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingAsset(null)}
                                className="p-1 hover:bg-rose-500/20 text-rose-400 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {avgBuyPrice > 0 ? (
                                <span className="text-slate-200">{formatPrice(avgBuyPrice)}</span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingAsset(coin.asset);
                                  setInputCost(coin.avgBuyPriceUSD > 0 ? coin.avgBuyPriceUSD.toString() : '');
                                }}
                                className="p-1 text-slate-400 hover:text-sky-400"
                                title="Edit Cost"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP VIEW (>= 640px): High-Density Sortable Table */}
          <div className="hidden sm:block overflow-x-auto max-h-[640px] 2xl:max-h-[780px] overflow-y-auto">
            <table className="w-full text-left text-xs 2xl:text-sm text-slate-300">
              <thead className="sticky top-0 z-20 bg-[#121722] border-b border-[#1e2738] text-slate-400 uppercase tracking-wider font-semibold text-[11px] 2xl:text-xs shadow-md">
                <tr>
                  <th className="py-3.5 px-4 2xl:px-6 cursor-pointer select-none bg-[#121722]" onClick={() => handleSort('asset')}>
                    <div className="flex items-center gap-1.5">
                      Asset / Coin
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right cursor-pointer select-none bg-[#121722]" onClick={() => handleSort('currentValue')}>
                    <div className="flex items-center justify-end gap-1.5">
                      Wallet Balance
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right cursor-pointer select-none bg-[#121722]" onClick={() => handleSort('totalPnL')}>
                    <div className="flex items-center justify-end gap-1.5">
                      Total Lifetime PnL
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right cursor-pointer select-none bg-[#121722]" onClick={() => handleSort('roiPercentage')}>
                    <div className="flex items-center justify-end gap-1.5">
                      Return (% ROI)
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right cursor-pointer select-none hidden xl:table-cell bg-[#121722]">
                    Total Invested
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right cursor-pointer select-none bg-[#121722]" onClick={() => handleSort('realizedPnL')}>
                    <div className="flex items-center justify-end gap-1.5">
                      Realized
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right cursor-pointer select-none bg-[#121722]" onClick={() => handleSort('unrealizedPnL')}>
                    <div className="flex items-center justify-end gap-1.5">
                      Unrealized PnL
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right bg-[#121722]">Avg. Buy Cost</th>
                  <th className="py-3.5 px-4 2xl:px-6 text-right bg-[#121722]">Current Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2738]">
                {filteredAndSortedCoins.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No assets match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedCoins.map((coin) => {
                    const totalPnL = isUSD ? coin.totalPnL_USD : coin.totalPnL_TRY;
                    const realizedPnL = isUSD ? coin.realizedPnL_USD : coin.realizedPnL_TRY;
                    const unrealizedPnL = isUSD ? coin.unrealizedPnL_USD : coin.unrealizedPnL_TRY;
                    const avgBuyPrice = isUSD ? coin.avgBuyPriceUSD : coin.avgBuyPriceTRY;
                    const currentPrice = isUSD ? coin.currentPriceUSD : coin.currentPriceTRY;
                    const currentValue = isUSD ? coin.currentValueUSD : coin.currentValueTRY;
                    const totalInvested = isUSD ? coin.totalInvestedUSD : coin.totalInvestedTRY;

                    const isProfit = totalPnL >= 0;
                    const isRealizedProfit = realizedPnL >= 0;
                    const isUnrealizedProfit = unrealizedPnL >= 0;

                    const isTopGainer = topGainer && topGainer.asset === coin.asset && topGainer.totalPnL_USD > 20;
                    const isTopLoser = topLoser && topLoser.asset === coin.asset && topLoser.totalPnL_USD < -20;

                    const isEditing = editingAsset === coin.asset;

                    return (
                      <tr key={coin.asset} className="hover:bg-[#18202f]/70 transition-colors">
                        {/* Coin Asset Badge */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full bg-slate-800 border border-[#1e2738] flex items-center justify-center font-bold text-slate-200 text-xs 2xl:text-sm">
                              {coin.asset.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs 2xl:text-sm">
                                {coin.asset}
                                {isTopGainer && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] 2xl:text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <Award className="w-2.5 h-2.5" /> Top Gainer
                                  </span>
                                )}
                                {isTopLoser && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] 2xl:text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Top Loser
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] 2xl:text-xs text-slate-400 font-mono">
                                {coin.totalSoldQty > 0
                                  ? `${formatCoinQty(coin.totalSoldQty)} ${coin.asset} sold ($${coin.totalSoldProceedsUSD.toFixed(1)})`
                                  : 'Not sold yet'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Wallet Balance & Value */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">
                          <div className="font-mono text-slate-100 font-semibold tabular-nums text-sm 2xl:text-base">
                            {currentValue > 0 ? formatMoney(currentValue, false) : '-'}
                          </div>
                          <div className="text-[11px] 2xl:text-xs text-slate-400 font-mono tabular-nums">
                            {coin.currentQty > 0 ? `${formatCoinQty(coin.currentQty)} ${coin.asset}` : '0'}
                          </div>
                        </td>

                        {/* Total PnL */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">
                          <div className={`font-mono font-bold text-sm 2xl:text-base tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(totalPnL)}
                          </div>
                          <div className="text-[11px] 2xl:text-xs text-slate-500 font-mono">
                            {isUSD
                              ? `₺${Math.abs(coin.totalPnL_TRY).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                              : `$${Math.abs(coin.totalPnL_USD).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                          </div>
                        </td>

                        {/* ROI % */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">
                          <span className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-xs 2xl:text-sm tabular-nums ${coin.roiPercentage >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                            {coin.roiPercentage >= 0 ? `+${coin.roiPercentage.toFixed(1)}%` : `${coin.roiPercentage.toFixed(1)}%`}
                          </span>
                        </td>

                        {/* Total Invested (Ultrawide / XL) */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right font-mono tabular-nums hidden xl:table-cell">
                          <div className="font-semibold text-slate-200 text-xs 2xl:text-sm">
                            {totalInvested > 0 ? formatMoney(totalInvested, false) : '-'}
                          </div>
                          <div className="text-[10px] 2xl:text-[11px] text-slate-500">
                            {coin.totalBoughtQty > 0 ? `${formatCoinQty(coin.totalBoughtQty)} bought` : 'Transfer'}
                          </div>
                        </td>

                        {/* Realized PnL */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">
                          <div className={`font-mono font-medium text-xs 2xl:text-sm tabular-nums ${realizedPnL === 0 ? 'text-slate-500' : isRealizedProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(realizedPnL)}
                          </div>
                          <div className="text-[10px] 2xl:text-[11px] text-slate-500">from sales</div>
                        </td>

                        {/* Unrealized PnL */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">
                          <div className={`font-mono font-medium text-xs 2xl:text-sm tabular-nums ${unrealizedPnL === 0 ? 'text-slate-500' : isUnrealizedProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(unrealizedPnL)}
                          </div>
                          <div className="text-[10px] 2xl:text-[11px] text-slate-500">from holdings</div>
                        </td>

                        {/* Avg Buy Cost with Inline Edit */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right font-mono tabular-nums">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                placeholder="Cost ($)"
                                value={inputCost}
                                onChange={(e) => setInputCost(e.target.value)}
                                className="w-20 2xl:w-24 bg-[#18202f] border border-sky-500 rounded px-1.5 py-0.5 text-xs 2xl:text-sm text-right font-mono focus:outline-none"
                                autoFocus
                              />
                              <button
                                disabled={savingCost}
                                onClick={() => handleSaveCost(coin.asset)}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                title="Save"
                              >
                                <Check className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingAsset(null)}
                                className="p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                title="Cancel"
                              >
                                <X className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={`text-xs 2xl:text-sm ${coin.isCustomCost ? 'text-sky-400 font-semibold' : 'text-slate-200'}`}>
                                  {avgBuyPrice > 0 ? formatPrice(avgBuyPrice) : '-'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingAsset(coin.asset);
                                    setInputCost(coin.avgBuyPriceUSD > 0 ? String(coin.avgBuyPriceUSD) : '');
                                  }}
                                  className="p-1 text-slate-500 hover:text-sky-400 transition-colors"
                                  title="Edit buy cost"
                                >
                                  <Edit3 className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                                </button>
                              </div>
                              {coin.costSource === 'DEPOSIT_MATCH' && (
                                <span className="text-[10px] 2xl:text-[11px] text-sky-400 font-medium font-sans mt-0.5 px-1 rounded bg-sky-500/10">
                                  Deposit Matched FX
                                </span>
                              )}
                              {coin.costSource === 'CUSTOM' && (
                                <span className="text-[10px] 2xl:text-[11px] text-emerald-400 font-medium font-sans mt-0.5 px-1 rounded bg-emerald-500/10">
                                  Custom Cost
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Current Price */}
                        <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right font-mono tabular-nums text-slate-200 font-semibold text-xs 2xl:text-sm">
                          {formatPrice(currentPrice)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

