'use client';

import React, { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { saveStoredTrades, saveStoredTransfers } from '@/lib/client-storage';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ trades: number; transfers: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        if (data.result?.trades && data.result.trades.length > 0) {
          await saveStoredTrades(data.result.trades);
        }
        if (data.result?.transfers && data.result.transfers.length > 0) {
          await saveStoredTransfers(data.result.transfers);
        }

        setResult({
          trades: data.result.tradesImported,
          transfers: data.result.transfersImported,
        });
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError(data.error || 'Error processing file.');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#121722] border border-[#1e2738] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-[#18202f]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Import Binance Historical CSV</h3>
            <p className="text-xs text-slate-400">Upload archived trade and transfer history dating back up to 8 years</p>
          </div>
        </div>

        <div className="bg-[#18202f]/60 border border-[#1e2738] rounded-xl p-4 text-xs text-slate-300 mb-4 space-y-1.5">
          <div className="font-semibold text-sky-400">Where to Download This File?</div>
          <p>
            On Binance Web: Go to <strong className="text-slate-100">Orders &gt; Spot Order &gt; Trade History</strong>, then click the <strong className="text-slate-100">"Export"</strong> button in the top right to download your CSV export for your desired date range.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-[#1e2738] hover:border-sky-500/50 rounded-xl p-6 text-center transition-colors bg-[#0b0e14]/50">
          <input
            type="file"
            accept=".csv"
            id="csv-file-input"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }}
          />
          <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
            <FileText className="w-8 h-8 text-slate-500 mb-2" />
            <span className="text-sm font-medium text-slate-200">
              {file ? file.name : 'Choose a CSV file or drag and drop here'}
            </span>
            <span className="text-xs text-slate-500 mt-1">Binance trade history in .csv format</span>
          </label>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Successfully imported {result.trades} trades and {result.transfers} transfers!
          </div>
        )}

        <div className="flex justify-end gap-2.5 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#18202f] hover:bg-[#202b3f] rounded-lg border border-[#1e2738]"
          >
            Close
          </button>
          <button
            disabled={!file || uploading}
            onClick={handleUpload}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {uploading ? 'Processing...' : 'Import and Calculate'}
          </button>
        </div>
      </div>
    </div>
  );
};
