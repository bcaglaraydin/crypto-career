'use client';

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';

interface TransferItem {
  id: string;
  asset: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAW';
  fiat_or_crypto: string;
  time: number;
  amountUSD: number;
  amountTRY: number;
}

interface TransfersTableProps {
  transfers: TransferItem[];
  currency: 'USD' | 'TRY';
}

export const TransfersTable: React.FC<TransfersTableProps> = ({ transfers, currency }) => {
  const isUSD = currency === 'USD';
  const prefix = isUSD ? '$' : '₺';

  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  const [search, setSearch] = useState('');

  const filteredTransfers = transfers.filter((t) => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (search && !t.asset.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-[#121722]/90 border border-[#1e2738] rounded-xl shadow-lg backdrop-blur-sm overflow-hidden">
      <div className="p-4 2xl:p-5 border-b border-[#1e2738] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base 2xl:text-lg font-semibold text-slate-100">Cash Flow (Deposits &amp; Withdrawals)</h3>
          <p className="text-xs 2xl:text-sm text-slate-400">All crypto and fiat deposits and withdrawals processed on your account</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search asset (USDT, BTC, ETH)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#18202f] border border-[#1e2738] focus:border-sky-500 text-slate-200 placeholder-slate-500 text-xs 2xl:text-sm rounded-lg pl-9 pr-3 py-1.5 2xl:py-2 focus:outline-none w-48 sm:w-64 2xl:w-80 transition-all"
            />
          </div>

          <div className="flex items-center bg-[#18202f] border border-[#1e2738] rounded-lg p-0.5 text-xs 2xl:text-sm">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 2xl:px-3.5 py-1 rounded-md transition-colors ${filterType === 'ALL' ? 'bg-sky-500/20 text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('DEPOSIT')}
              className={`px-2.5 2xl:px-3.5 py-1 rounded-md transition-colors ${filterType === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Deposits
            </button>
            <button
              onClick={() => setFilterType('WITHDRAW')}
              className={`px-2.5 2xl:px-3.5 py-1 rounded-md transition-colors ${filterType === 'WITHDRAW' ? 'bg-amber-500/20 text-amber-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Withdrawals
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs 2xl:text-sm text-slate-300">
          <thead className="bg-[#121722]/95 border-b border-[#1e2738] text-slate-400 uppercase tracking-wider font-semibold text-[11px] 2xl:text-xs">
            <tr>
              <th className="py-3.5 px-4 2xl:px-6">Date</th>
              <th className="py-3.5 px-4 2xl:px-6">Action</th>
              <th className="py-3.5 px-4 2xl:px-6">Asset</th>
              <th className="py-3.5 px-4 2xl:px-6 text-right">Amount</th>
              <th className="py-3.5 px-4 2xl:px-6 text-right">Value at Event ({currency})</th>
              <th className="py-3.5 px-4 2xl:px-6 text-right">Asset Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2738]">
            {filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No deposit or withdrawal history found.
                </td>
              </tr>
            ) : (
              filteredTransfers.map((t) => {
                const isDeposit = t.type === 'DEPOSIT';
                const dateStr = new Date(t.time).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const amountPrimary = isUSD ? t.amountUSD : t.amountTRY;
                const amountSec = !isUSD ? t.amountUSD : t.amountTRY;

                return (
                  <tr key={t.id} className="hover:bg-[#18202f]/70 transition-colors">
                    <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 font-mono text-slate-400 whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="py-3.5 2xl:py-4 px-4 2xl:px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] 2xl:text-xs font-semibold ${isDeposit ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                        {isDeposit ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isDeposit ? 'Deposit' : 'Withdrawal'}
                      </span>
                    </td>
                    <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 font-bold text-slate-200">
                      {t.asset}
                    </td>
                    <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right font-mono font-medium text-slate-100 tabular-nums">
                      {isDeposit ? '+' : '-'}{t.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {t.asset}
                    </td>
                    <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-100 text-sm 2xl:text-base">
                        {prefix}{amountPrimary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] 2xl:text-[11px] text-slate-500">
                        {!isUSD ? '$' : '₺'}{amountSec.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="py-3.5 2xl:py-4 px-4 2xl:px-6 text-right">
                      <span className="text-[10px] 2xl:text-[11px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {t.fiat_or_crypto}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
