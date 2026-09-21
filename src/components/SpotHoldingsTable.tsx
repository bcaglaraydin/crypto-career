'use client';

import React, { useState, useMemo } from 'react';
import { CoinPnLSummary } from '@/lib/pnl-calculator';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpDown,
  Edit3,
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SpotHoldingsTableProps {
  coins: CoinPnLSummary[];
  currency: 'USD' | 'TRY';
  rate: number;
  onCostUpdated?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type SortField = 'currentValue' | 'currentQty' | 'currentPrice' | 'unrealizedPnL' | 'roiPercentage' | 'asset';
type SortOrder = 'asc' | 'desc';
type FilterMode = 'ALL' | 'MAJOR' | 'PROFIT' | 'LOSS';

export const SpotHoldingsTable: React.FC<SpotHoldingsTableProps> = ({
  coins,
  currency,
  rate,
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

  // Inline custom cost editing
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [inputCost, setInputCost] = useState('');
  const [savingCost, setSavingCost] = useState(false);

  // Only consider coins currently held with positive balance
  const activeHoldings = useMemo(() => {
    return coins.filter((c) => c.currentQty > 0.0000001);
  }, [coins]);

  const totalSpotValueUSD = useMemo(() => {
    return activeHoldings.reduce((sum, c) => sum + c.currentValueUSD, 0);
  }, [activeHoldings]);

  const totalSpotValue = isUSD ? totalSpotValueUSD : totalSpotValueUSD * rate;

  const totalSpotUnrealizedUSD = useMemo(() => {
    return activeHoldings.reduce((sum, c) => sum + c.unrealizedPnL_USD, 0);
  }, [activeHoldings]);

  const totalSpotUnrealized = isUSD ? totalSpotUnrealizedUSD : totalSpotUnrealizedUSD * rate;

  const formatPrice = (valUSD: number) => {
    const val = isUSD ? valUSD : valUSD * rate;
    const decimals = val < 0.01 ? 6 : val < 1 ? 4 : val < 100 ? 3 : 2;
    return `${prefix}${val.toLocaleString('en-US', {
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
    let result = activeHoldings.filter((coin) => {
      const matchesSearch = coin.asset.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (filterMode === 'MAJOR') return coin.currentValueUSD >= 1.0;
      if (filterMode === 'PROFIT') return coin.unrealizedPnL_USD > 0;
      if (filterMode === 'LOSS') return coin.unrealizedPnL_USD < 0;
      return true;
    });

    result.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      if (sortField === 'currentValue') {
        aVal = a.currentValueUSD;
        bVal = b.currentValueUSD;
      } else if (sortField === 'currentQty') {
        aVal = a.currentQty;
        bVal = b.currentQty;
      } else if (sortField === 'currentPrice') {
        aVal = a.currentPriceUSD;
        bVal = b.currentPriceUSD;
      } else if (sortField === 'unrealizedPnL') {
        aVal = a.unrealizedPnL_USD;
        bVal = b.unrealizedPnL_USD;
      } else if (sortField === 'roiPercentage') {
        aVal = a.roiPercentage;
        bVal = b.roiPercentage;
      } else if (sortField === 'asset') {
        return sortOrder === 'asc' ? a.asset.localeCompare(b.asset) : b.asset.localeCompare(a.asset);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [activeHoldings, search, filterMode, sortField, sortOrder]);

  if (activeHoldings.length === 0) {
    return (
      <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-6 sm:p-8 text-center backdrop-blur-sm">
        <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">No Active Spot Holdings</p>
        <p className="text-xs text-slate-500 mt-1">No positive coin balances found in your Binance spot wallet.</p>
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                  Active Spot Wallet (Current Holdings)
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{activeHoldings.length} ACTIVE SPOT COINS</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Currently held spot assets, live prices, and unrealized profit/loss
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
              Total Spot Value
            </div>
            <div className="text-xs sm:text-base font-bold font-mono text-slate-100 tabular-nums">
              {formatMoney(totalSpotValue)}
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
              {isUSD ? `₺${(totalSpotValueUSD * rate).toLocaleString('en-US', { maximumFractionDigits: 2 })} TRY` : `$${totalSpotValueUSD.toFixed(2)} USD`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Spot Unrealized PnL
            </div>
            <div
              className={`text-xs sm:text-base font-bold font-mono tabular-nums ${
                totalSpotUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(totalSpotUnrealized, true)}
            </div>
            <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
              Cost vs. Value
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
          {/* Filter and Search Bar */}
          <div className="p-3 sm:p-4 border-b border-[#1e2738] bg-[#0f131c]/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search wallet assets (BTC, ETH, SOL)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#121722] border border-[#1e2738] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                  filterMode === 'ALL'
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18202f]'
                }`}
              >
                All ({activeHoldings.length})
              </button>
              <button
                onClick={() => setFilterMode('MAJOR')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                  filterMode === 'MAJOR'
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18202f]'
                }`}
              >
                Major (&gt; $1)
              </button>
              <button
                onClick={() => setFilterMode('PROFIT')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                  filterMode === 'PROFIT'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18202f]'
                }`}
              >
                In Profit
              </button>
              <button
                onClick={() => setFilterMode('LOSS')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium whitespace-nowrap ${
                  filterMode === 'LOSS'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#18202f]'
                }`}
              >
                In Loss
              </button>
            </div>
          </div>

          {/* MOBILE VIEW (< 640px): Touch-friendly Expandable Cards */}
          <div className="sm:hidden p-2.5 space-y-2.5 bg-[#0e121a]">
            {filteredAndSortedCoins.map((coin) => {
              const currentVal = isUSD ? coin.currentValueUSD : coin.currentValueTRY;
              const unrealized = isUSD ? coin.unrealizedPnL_USD : coin.unrealizedPnL_TRY;
              const isProfit = coin.unrealizedPnL_USD >= 0;
              const allocationPct = totalSpotValueUSD > 0 ? (coin.currentValueUSD / totalSpotValueUSD) * 100 : 0;
              const isCardExpanded = !!expandedCards[coin.asset];
              const isEditing = editingAsset === coin.asset;

              return (
                <div
                  key={coin.asset}
                  className="bg-[#141924] border border-[#1e2738] rounded-xl p-3 shadow-md transition-all duration-200"
                >
                  {/* Top line: Coin + Avatar + Allocation badge + Value */}
                  <div
                    onClick={() => toggleCard(coin.asset)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-xs font-mono text-slate-200 shadow-sm">
                        {coin.asset.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 font-mono text-sm">
                            {coin.asset}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300">
                            {allocationPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {coin.currentQty < 0.001
                            ? coin.currentQty.toFixed(6)
                            : coin.currentQty < 1
                            ? coin.currentQty.toFixed(4)
                            : coin.currentQty.toLocaleString('en-US', { maximumFractionDigits: 3 })}{' '}
                          {coin.asset}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono tabular-nums">
                        <div className="font-bold text-slate-100 text-sm">
                          {formatMoney(currentVal)}
                        </div>
                        <div
                          className={`text-xs font-semibold flex items-center justify-end gap-1 ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {formatMoney(unrealized, true)}
                        </div>
                      </div>
                      <div className="text-slate-500">
                        {isCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Allocation Mini Bar */}
                  <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-sky-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(allocationPct, 100)}%` }}
                    />
                  </div>

                  {/* Expandable Details Drawer */}
                  {isCardExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#1e2738] bg-[#0b0e14]/50 p-2.5 rounded-lg space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Live Price:</span>
                        <span className="text-sky-300 font-semibold">{formatPrice(coin.currentPriceUSD)}</span>
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
                            {coin.avgBuyPriceUSD > 0 ? (
                              <span className="text-slate-200">{formatPrice(coin.avgBuyPriceUSD)}</span>
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

                      <div className="flex items-center justify-between pt-1 border-t border-[#1e2738]/50">
                        <span className="text-slate-400">Cost Basis Source:</span>
                        <div>
                          {coin.costSource === 'CUSTOM' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-sans">
                              Custom
                            </span>
                          )}
                          {coin.costSource === 'DEPOSIT_MATCH' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans">
                              Deposit Matched
                            </span>
                          )}
                          {!coin.costSource && (
                            <span className="text-[10px] text-slate-500">Trade History</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Return (ROI):</span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                            coin.roiPercentage >= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {coin.roiPercentage >= 0 ? `+${coin.roiPercentage.toFixed(1)}%` : `${coin.roiPercentage.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 640px): Full High-Density Table */}
          <div className="hidden sm:block overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#121722]/95 backdrop-blur z-10 border-b border-[#1e2738] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th
                    onClick={() => handleSort('asset')}
                    className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Asset / Coin</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentQty')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Wallet Balance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentPrice')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Current Price</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentValue')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Market Value</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <span>Portfolio Share</span>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>Average Cost</span>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('unrealizedPnL')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Unrealized PnL</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('roiPercentage')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-200 select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Return (ROI)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2738]">
                {filteredAndSortedCoins.map((coin) => {
                  const currentVal = isUSD ? coin.currentValueUSD : coin.currentValueTRY;
                  const unrealized = isUSD ? coin.unrealizedPnL_USD : coin.unrealizedPnL_TRY;
                  const isProfit = coin.unrealizedPnL_USD >= 0;
                  const allocationPct = totalSpotValueUSD > 0 ? (coin.currentValueUSD / totalSpotValueUSD) * 100 : 0;

                  return (
                    <tr
                      key={coin.asset}
                      className="hover:bg-[#18202f]/70 transition-colors group"
                    >
                      {/* Asset */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-xs font-mono text-slate-200 shadow-sm">
                            {coin.asset.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 font-mono text-sm">
                              {coin.asset}
                            </div>
                            {coin.hasMissingBuyHistory && (
                              <span
                                title="This coin was transferred or trade history is missing in Binance API. You can set a custom cost basis."
                                className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-medium"
                              >
                                <HelpCircle className="w-2.5 h-2.5" /> Deposit / External
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                        {coin.currentQty < 0.001
                          ? coin.currentQty.toFixed(8)
                          : coin.currentQty < 1
                          ? coin.currentQty.toFixed(6)
                          : coin.currentQty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>

                      {/* Current Price */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-sky-300 font-medium">
                        {formatPrice(coin.currentPriceUSD)}
                      </td>

                      {/* Total Value */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-100">
                        {formatMoney(currentVal)}
                      </td>

                      {/* Allocation % & Mini Bar */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-slate-800 rounded-full h-1.5 hidden sm:block overflow-hidden">
                            <div
                              className="bg-sky-400 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(allocationPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-300">
                            {allocationPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Average Buy Price */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-300">
                        {editingAsset === coin.asset ? (
                          <div className="flex items-center justify-end gap-1">
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
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingAsset(null)}
                              className="p-1 hover:bg-rose-500/20 text-rose-400 rounded"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {coin.avgBuyPriceUSD > 0 ? (
                              <div className="flex flex-col items-end">
                                <span>{formatPrice(coin.avgBuyPriceUSD)}</span>
                                {coin.costSource === 'CUSTOM' && (
                                  <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300">Custom</span>
                                )}
                                {coin.costSource === 'DEPOSIT_MATCH' && (
                                  <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">Deposit</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingAsset(coin.asset);
                                setInputCost(coin.avgBuyPriceUSD > 0 ? coin.avgBuyPriceUSD.toString() : '');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-sky-400 transition-opacity"
                              title="Edit Cost"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
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

                      {/* ROI % */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            coin.roiPercentage >= 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {coin.roiPercentage >= 0
                            ? `+${coin.roiPercentage.toFixed(1)}%`
                            : `${coin.roiPercentage.toFixed(1)}%`}
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

