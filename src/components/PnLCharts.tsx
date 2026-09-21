'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
} from 'recharts';
import { PortfolioOverview } from '@/lib/pnl-calculator';
import {
  TrendingUp,
  Activity,
  Wallet,
  Zap,
  Clock,
  Compass,
  Award,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  LineChart as LucideLineChart,
} from 'lucide-react';

interface PnLChartsProps {
  portfolio: PortfolioOverview;
  currency: 'USD' | 'TRY';
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type Resolution = '1D' | '1W' | '1M';

function resampleTimeSeries<T extends { date: string }>(data: T[], resolution: Resolution): T[] {
  if (resolution === '1D' || !data || data.length <= 2) return data;

  const grouped = new Map<string, T[]>();

  for (const item of data) {
    let key: string;
    if (resolution === '1M') {
      key = item.date.slice(0, 7); // YYYY-MM
    } else {
      // 1W: Group by Year and ISO Week number
      const parts = item.date.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }
      const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      key = `${parts[0]}-W${String(weekNumber).padStart(2, '0')}`;
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  const result: T[] = [];
  for (const [key, items] of Array.from(grouped.entries())) {
    const lastItem = items[items.length - 1];
    result.push({
      ...lastItem,
      date: resolution === '1M' ? key : lastItem.date,
    });
  }

  return result;
}

const PIE_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f43f5e', '#a855f7', '#fb923c', '#4ade80'];

export const PnLCharts: React.FC<PnLChartsProps> = ({
  portfolio,
  currency,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const isUSD = currency === 'USD';
  const prefix = isUSD ? '$' : '₺';

  // Section collapse state
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const [activeTimelineTab, setActiveTimelineTab] = useState<'NET_WORTH' | 'MARK_TO_MARKET' | 'CUMULATIVE_PNL' | 'ACTIVITY'>('NET_WORTH');
  const [resolution, setResolution] = useState<Resolution>('1D');

  // Format data for Coin PnL Bar Chart (Top impactful coins, up to 14 for widescreen)
  const barData = portfolio.coinSummaries
    .slice()
    .sort((a, b) => Math.abs(b.totalPnL_USD) - Math.abs(a.totalPnL_USD))
    .slice(0, 14)
    .map((c) => ({
      asset: c.asset,
      pnl: isUSD ? Number(c.totalPnL_USD.toFixed(2)) : Number(c.totalPnL_TRY.toFixed(2)),
      pnlUSD: c.totalPnL_USD,
      roi: c.roiPercentage,
    }));

  // Format data for Cumulative PnL Timeline
  const timelineData = portfolio.pnlTimeline.map((item) => ({
    date: item.date,
    pnl: isUSD ? item.cumulativePnL_USD : item.cumulativePnL_TRY,
  }));

  // Format data for Net Worth Timeline
  const netWorthData = (portfolio.netWorthTimeline || []).map((item) => ({
    date: item.date,
    value: isUSD ? item.netWorthUSD : item.netWorthTRY,
    deposits: isUSD ? item.netDepositsUSD : item.netDepositsTRY,
    pnl: isUSD ? item.cumulativePnL_USD : item.cumulativePnL_TRY,
  }));

  // Format data for Mark-to-Market Timeline ("If Sold / Unsold ATH")
  const markToMarketData = (portfolio.markToMarketTimeline || []).map((item) => ({
    date: item.date,
    value: isUSD ? item.marketValueUSD : item.marketValueTRY,
    usdt: isUSD ? item.usdtCashUSD : item.usdtCashTRY,
    coins: isUSD ? item.coinsValueUSD : item.coinsValueTRY,
  }));

  const displayedTimelineData = useMemo(() => {
    return resampleTimeSeries(timelineData, resolution);
  }, [timelineData, resolution]);

  const displayedNetWorthData = useMemo(() => {
    return resampleTimeSeries(netWorthData, resolution);
  }, [netWorthData, resolution]);

  const displayedMarkToMarketData = useMemo(() => {
    return resampleTimeSeries(markToMarketData, resolution);
  }, [markToMarketData, resolution]);

  const ath = portfolio.markToMarketATH;

  // Format data for Monthly Trade Activity
  const activityData = (portfolio.monthlyActivity || []).map((item) => ({
    month: item.month,
    trades: item.tradeCount,
    volume: isUSD ? item.volumeUSD : item.volumeTRY,
    pnl: isUSD ? item.realizedPnL_USD : item.realizedPnL_TRY,
    buys: item.buyCount,
    sells: item.sellCount,
  }));

  // Format Asset Allocation
  const pieData = portfolio.assetAllocation.slice(0, 8);
  const otherValue = portfolio.assetAllocation
    .slice(8)
    .reduce((sum, item) => sum + item.value, 0);

  if (otherValue > 0) {
    pieData.push({
      name: 'Other',
      value: Number(otherValue.toFixed(2)),
      percentage: Number(((otherValue / (portfolio.totalPortfolioValueUSD || 1)) * 100).toFixed(2)),
    });
  }

  const behavior = portfolio.tradingBehavior;

  return (
    <div className="space-y-4">
      {/* Collapsible Header Bar */}
      <div
        onClick={toggleCollapse}
        className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-[#18202f]/80 transition-colors shadow-lg backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
            <LucideLineChart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Portfolio Analytics &amp; Timeline Charts
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold hidden sm:inline">
                4 CHARTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Net Worth, Mark-to-Market Peak (ATH) Simulation, Cumulative PnL &amp; Trade Intensity
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

      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 2xl:gap-6">
          {/* 1. Coin PnL Distribution */}
          <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-5 2xl:p-6 lg:col-span-8 shadow-lg backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm 2xl:text-base font-semibold text-slate-200">Asset PnL Distribution</h3>
                <p className="text-xs 2xl:text-sm text-slate-400">Net profit/loss contribution of top assets</p>
              </div>

          <div className="flex items-center gap-3 text-xs 2xl:text-sm">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Gain
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span> Loss
            </span>
          </div>
        </div>

        {barData.length === 0 ? (
          <div className="h-64 2xl:h-80 flex items-center justify-center text-slate-500 text-sm">
            No trade data found.
          </div>
        ) : (
          <div className="h-64 sm:h-72 2xl:h-80 3xl:h-92 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" vertical={false} />
                <XAxis dataKey="asset" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isGain = data.pnl >= 0;
                      return (
                        <div className="bg-[#18202f] border border-[#2d3748] rounded-xl shadow-2xl p-3 text-xs 2xl:text-sm">
                          <div className="font-semibold text-slate-100 mb-1">{data.asset}</div>
                          <div className={`font-mono font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isGain ? '+' : ''}{prefix}{Math.abs(data.pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-slate-400 mt-1 font-mono">
                            ROI: {data.roi >= 0 ? `+${data.roi.toFixed(1)}%` : `${data.roi.toFixed(1)}%`}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Asset Allocation (Pie Chart) */}
      <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-5 2xl:p-6 lg:col-span-4 shadow-lg backdrop-blur-sm flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="text-sm 2xl:text-base font-semibold text-slate-200">Asset Allocation</h3>
          <p className="text-xs 2xl:text-sm text-slate-400">Percentage breakdown of current wallet balance</p>
        </div>

        {pieData.length === 0 ? (
          <div className="h-64 2xl:h-80 flex items-center justify-center text-slate-500 text-sm">
            No active holdings in wallet.
          </div>
        ) : (
          <div className="h-64 sm:h-72 2xl:h-80 3xl:h-92 w-full flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18202f] border border-[#2d3748] rounded-xl shadow-2xl p-2.5 text-xs 2xl:text-sm">
                          <div className="font-semibold text-slate-100">{data.name}</div>
                          <div className="font-mono text-sky-400 font-bold mt-0.5">
                            ${data.value.toLocaleString('en-US')} ({data.percentage}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 2xl:grid-cols-2 gap-2 mt-3 text-xs 2xl:text-sm">
              {pieData.slice(0, 6).map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-slate-400 truncate pr-2 bg-[#18202f]/40 px-2 py-1 rounded-lg border border-[#1e2738]/50">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    ></span>
                    <span className="truncate font-medium text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-200 font-semibold tabular-nums ml-1">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Dynamic Timeline: Net Worth | Mark to Market | Cumulative PnL | Trade Activity */}
      <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-5 2xl:p-6 lg:col-span-12 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#1e2738]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base 2xl:text-lg font-semibold text-slate-100">
                {activeTimelineTab === 'NET_WORTH' && 'Historical Net Worth & Balance Timeline'}
                {activeTimelineTab === 'MARK_TO_MARKET' && 'Mark to Market: Peak Simulation & If Sold Value'}
                {activeTimelineTab === 'CUMULATIVE_PNL' && 'Cumulative Lifetime PnL Trend'}
                {activeTimelineTab === 'ACTIVITY' && 'Trade Activity & Volume Intensity'}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                {currency}
              </span>
            </div>
            <p className="text-xs 2xl:text-sm text-slate-400 mt-0.5">
              {activeTimelineTab === 'NET_WORTH' && 'Evolution of total equity (net principal + realized profits) over your account lifetime'}
              {activeTimelineTab === 'MARK_TO_MARKET' && 'Simulated total portfolio value if all held assets were liquidated at contemporary daily prices'}
              {activeTimelineTab === 'CUMULATIVE_PNL' && 'Lifetime cumulative net PnL progression over time'}
              {activeTimelineTab === 'ACTIVITY' && 'Monthly trade count and trading volume distribution over active market cycles'}
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1">
            {/* Resolution Switcher (1D / 1W / 1M) */}
            {activeTimelineTab !== 'ACTIVITY' && (
              <div className="flex items-center flex-shrink-0 bg-[#18202f] border border-[#1e2738] rounded-lg p-1 text-xs font-mono font-semibold">
                <button
                  onClick={() => setResolution('1D')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    resolution === '1D'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Daily snapshot view"
                >
                  1D
                </button>
                <button
                  onClick={() => setResolution('1W')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    resolution === '1W'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Weekly view"
                >
                  1W
                </button>
                <button
                  onClick={() => setResolution('1M')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    resolution === '1M'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Monthly macro view"
                >
                  1M
                </button>
              </div>
            )}

            {/* Timeline View Tabs */}
            <div className="flex items-center flex-shrink-0 gap-1 bg-[#18202f] border border-[#1e2738] rounded-lg p-1 text-xs font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                onClick={() => setActiveTimelineTab('NET_WORTH')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTimelineTab === 'NET_WORTH'
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Net Worth</span>
              </button>
              <button
                onClick={() => setActiveTimelineTab('MARK_TO_MARKET')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTimelineTab === 'MARK_TO_MARKET'
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ATH Peak (If Sold)</span>
              </button>
              <button
                onClick={() => setActiveTimelineTab('CUMULATIVE_PNL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTimelineTab === 'CUMULATIVE_PNL'
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Cumulative PnL</span>
              </button>
              <button
                onClick={() => setActiveTimelineTab('ACTIVITY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTimelineTab === 'ACTIVITY'
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Trade Activity</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3.A: Net Worth Area Chart */}
        {activeTimelineTab === 'NET_WORTH' && (
          <div className="h-64 sm:h-72 2xl:h-84 3xl:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedNetWorthData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18202f] border border-[#2d3748] rounded-xl shadow-2xl p-3 text-xs 2xl:text-sm">
                          <div className="text-slate-400 mb-1 font-mono">{data.date}</div>
                          <div className="font-semibold text-slate-200">
                            Net Worth: <span className="font-mono font-bold text-sky-400">{prefix}{data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 font-mono">
                            Net Principal: {prefix}{data.deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className={`text-[11px] font-mono mt-0.5 ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Cumulative PnL: {data.pnl >= 0 ? '+' : ''}{prefix}{data.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#netWorthGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3.B: Mark-to-Market / ATH Simulation Area Chart */}
        {activeTimelineTab === 'MARK_TO_MARKET' && (
          <div className="flex flex-col gap-4">
            <div className="h-64 sm:h-72 2xl:h-84 3xl:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayedMarkToMarketData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mtmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#18202f] border border-[#2d3748] rounded-xl shadow-2xl p-3 text-xs 2xl:text-sm">
                            <div className="text-slate-400 mb-1 font-mono">{data.date}</div>
                            <div className="font-semibold text-slate-200">
                              Market Value (If Sold): <span className="font-mono font-bold text-amber-400">{prefix}{data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              Uninvested Cash (USDT): {prefix}{data.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-emerald-400 mt-0.5 font-mono font-semibold">
                              Altcoin Market Value: {prefix}{data.coins.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#mtmGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bull Market ATH Simulation Panel */}
            {ath && (
              <div className="bg-[#18202f]/70 border border-amber-500/20 rounded-xl p-4 2xl:p-5 mt-2 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#1e2738]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm 2xl:text-base font-bold text-slate-100">
                        Bull Market Peak (ATH): {ath.peakDate}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Maximum portfolio value if liquidated at the peak of the market cycle
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Peak Value (ATH)</div>
                      <div className="text-lg 2xl:text-xl font-bold font-mono text-amber-400 tabular-nums">
                        {prefix}{(isUSD ? ath.peakMarketValueUSD : ath.peakMarketValueTRY).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l border-[#1e2738]">
                      <div className="text-xs text-slate-400">Drawdown from Peak</div>
                      <div className="text-sm 2xl:text-base font-bold font-mono text-rose-400 tabular-nums">
                        -{ath.drawdownPercentage}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Top Contributing Assets at ATH Peak:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ath.topPeakCoins.map((c) => (
                      <span
                        key={c.coin}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121722] border border-[#1e2738] text-xs font-mono"
                      >
                        <span className="text-slate-200 font-bold">{c.coin}</span>
                        <span className="text-slate-400">({c.qty})</span>
                        <span className="text-amber-400 font-semibold">${c.valueUSD.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                  💡 <span className="font-semibold text-amber-300">Strategic Takeaway:</span> If your entire altcoin portfolio had been liquidated at the bull cycle peak on <strong>{ath.peakDate}</strong>, your cash balance would have reached <strong>${ath.peakMarketValueUSD.toLocaleString('en-US')}</strong> (equivalent to <strong>₺{(ath.peakMarketValueUSD * portfolio.currentUsdtTryRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong> at current FX rates). Because these positions were held unrealized, gains retracted during the subsequent market downturn.
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3.C: Cumulative PnL Line */}
        {activeTimelineTab === 'CUMULATIVE_PNL' && (
          <div className="h-64 sm:h-72 2xl:h-84 3xl:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayedTimelineData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isGain = data.pnl >= 0;
                      return (
                        <div className="bg-[#18202f] border border-[#2d3748] rounded-xl shadow-2xl p-3 text-xs 2xl:text-sm">
                          <div className="text-slate-400 mb-0.5">{data.date}</div>
                          <div className={`font-mono font-bold text-sm 2xl:text-base ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isGain ? '+' : ''}{prefix}{Math.abs(data.pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#0b0e14', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3.D: Monthly Trade Activity & Volume Intensity */}
        {activeTimelineTab === 'ACTIVITY' && (
          <div className="h-64 sm:h-72 2xl:h-84 3xl:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 15, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2738" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18202f] border border-[#2d3748] rounded-xl shadow-2xl p-3 text-xs 2xl:text-sm">
                          <div className="font-semibold text-slate-100 mb-1">{data.month}</div>
                          <div className="font-mono text-sky-400 font-bold">
                            Total Trades: {data.trades} ({data.buys} Buys / {data.sells} Sells)
                          </div>
                          <div className="text-slate-300 mt-1 font-mono">
                            Trading Volume: {prefix}{data.volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </div>
                          <div className={`mt-1 font-mono font-semibold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Monthly Net PnL: {data.pnl >= 0 ? '+' : ''}{prefix}{data.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="trades" radius={[4, 4, 0, 0]}>
                  {activityData.map((entry, index) => (
                    <Cell
                      key={`activity-${index}`}
                      fill={entry.trades >= 60 ? '#38bdf8' : entry.trades >= 20 ? '#818cf8' : '#334155'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Strategy & Behavioral Analysis: Active Trading vs. Holding (HODL) */}
      {behavior && (
        <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl p-5 2xl:p-6 lg:col-span-12 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base 2xl:text-lg font-bold text-slate-100">
                  Strategy Analysis: Active Trading vs. Holding (HODL)
                </h3>
                <p className="text-xs 2xl:text-sm text-slate-400">
                  Behavioral finance and return analysis across your 8-year transaction history
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* A. Active Trading Cycles */}
            <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Active Trading Cycles
                </span>
                <span className="text-[11px] font-mono bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded">
                  ≥ 20 Trades/Mo
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl 2xl:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                  {formatMoney(behavior.activeMonthsSummary.totalPnL_USD, prefix)}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Monthly Average: {formatMoney(behavior.activeMonthsSummary.avgMonthlyPnL_USD, prefix)}
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-[#1e2738]/60">
                <span>{behavior.activeMonthsSummary.monthsCount} Mos ({behavior.activeMonthsSummary.totalTrades} Trades)</span>
                <span className="text-emerald-400 font-semibold font-mono">{behavior.activeMonthsSummary.winRate}% Win Rate</span>
              </div>
            </div>

            {/* B. Holding / HODL Cycles */}
            <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Holding (HODL) Cycles
                </span>
                <span className="text-[11px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded">
                  &lt; 10 Trades/Mo
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl 2xl:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                  {formatMoney(behavior.holdingMonthsSummary.totalPnL_USD, prefix)}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Monthly Average: {formatMoney(behavior.holdingMonthsSummary.avgMonthlyPnL_USD, prefix)}
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-[#1e2738]/60">
                <span>{behavior.holdingMonthsSummary.monthsCount} Mos ({behavior.holdingMonthsSummary.totalTrades} Trades)</span>
                <span className="text-indigo-400 font-semibold font-mono">Capital Preservation</span>
              </div>
            </div>

            {/* C. Peak Activity Month */}
            <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Peak Activity Month
                </span>
                <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                  Peak
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl 2xl:text-2xl font-bold font-mono text-slate-100">
                  {behavior.peakTradingMonth.month}
                </div>
                <div className="text-xs text-amber-400 font-mono mt-0.5 font-semibold">
                  {behavior.peakTradingMonth.tradeCount} Trades (${behavior.peakTradingMonth.volumeUSD.toLocaleString('en-US')} Vol)
                </div>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t border-[#1e2738]/60">
                2021 Bull Run Peak Period
              </div>
            </div>

            {/* D. Best & Worst Months */}
            <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Extreme Outliers
                </span>
              </div>
              <div className="my-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" /> Best Month ({behavior.bestPnLMonth.month}):
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{prefix}{behavior.bestPnLMonth.pnlUSD.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Worst Month ({behavior.worstPnLMonth.month}):
                  </span>
                  <span className="font-mono font-bold text-rose-400">
                    {prefix}{behavior.worstPnLMonth.pnlUSD.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-1.5 border-t border-[#1e2738]/60">
                Bear market / volatility impact
              </div>
            </div>
          </div>

          {/* Strategic Verdict & Behavioral Analysis Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-900/60 border border-sky-500/20 text-xs 2xl:text-sm text-slate-300 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-100 block mb-1">Strategic Verdict &amp; Behavioral Analysis:</span>
              <p className="leading-relaxed text-slate-300">
                {behavior.behaviorVerdict}
              </p>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};



function formatMoney(val: number, prefix: string) {
  const abs = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  return `${sign}${prefix}${abs}`;
}
