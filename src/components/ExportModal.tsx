import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Check, Layers, Calendar, CheckSquare, Square, Info } from 'lucide-react';
import { DebtTransaction, SummaryMetrics, FilterOptions } from '../types';
import { exportTransactionsToExcel } from '../utils/exportExcel';
import { formatRupiah } from '../utils/formatters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: DebtTransaction[];
  filteredTransactions: DebtTransaction[];
  metrics: SummaryMetrics;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  filteredTransactions,
  metrics
}) => {
  if (!isOpen) return null;

  const [scope, setScope] = useState<'all' | 'piutang' | 'hutang' | 'filtered'>('all');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includePayments, setIncludePayments] = useState(true);
  const dateStr = new Date().toISOString().slice(0, 10);
  const [fileName, setFileName] = useState(`Laporan_Hutang_Piutang_${dateStr}.xlsx`);
  const [isExporting, setIsExporting] = useState(false);

  // Compute stats based on current selected scope
  let activeData = transactions;
  if (scope === 'piutang') {
    activeData = transactions.filter(t => t.type === 'piutang');
  } else if (scope === 'hutang') {
    activeData = transactions.filter(t => t.type === 'hutang');
  } else if (scope === 'filtered') {
    activeData = filteredTransactions;
  }

  const totalPaymentsCount = activeData.reduce((acc, curr) => acc + curr.payments.length, 0);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportTransactionsToExcel(activeData, metrics, {
        fileName: fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
        scope: scope === 'filtered' ? 'filtered' : scope,
        includePaymentsSheet: includePayments,
        includeSummarySheet: includeSummary
      });
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Export error:', err);
      alert('Terjadi kesalahan saat mengekspor data ke Excel.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Export Data ke Excel (.XLSX)
              </h3>
              <p className="text-xs text-slate-500">
                Download laporan rapi lengkap dengan multi-sheet dan ringkasan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Cakupan Data yang Diexport
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              <label 
                onClick={() => setScope('all')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  scope === 'all'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={scope === 'all'} 
                  onChange={() => setScope('all')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                />
                <div>
                  <div className="font-bold">Semua Data ({transactions.length})</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Seluruh catatan hutang & piutang</div>
                </div>
              </label>

              <label 
                onClick={() => setScope('filtered')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  scope === 'filtered'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={scope === 'filtered'} 
                  onChange={() => setScope('filtered')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                />
                <div>
                  <div className="font-bold">Data Terfilter ({filteredTransactions.length})</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Sesuai kata kunci & filter aktif</div>
                </div>
              </label>

              <label 
                onClick={() => setScope('piutang')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  scope === 'piutang'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={scope === 'piutang'} 
                  onChange={() => setScope('piutang')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                />
                <div>
                  <div className="font-bold">Hanya Piutang ({transactions.filter(t => t.type === 'piutang').length})</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Hak tagih / uang di luar</div>
                </div>
              </label>

              <label 
                onClick={() => setScope('hutang')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  scope === 'hutang'
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input 
                  type="radio" 
                  name="exportScope" 
                  checked={scope === 'hutang'} 
                  onChange={() => setScope('hutang')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                />
                <div>
                  <div className="font-bold">Hanya Hutang ({transactions.filter(t => t.type === 'hutang').length})</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Kewajiban pembayaran saya</div>
                </div>
              </label>

            </div>
          </div>

          {/* Worksheet Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Struktur Lembar Kerja (Worksheet)
            </label>
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-800">
                  Sertakan Sheet <strong>Ringkasan Keuangan</strong> (Statistik Kas & Net Balance)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={includePayments}
                  onChange={(e) => setIncludePayments(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-800">
                  Sertakan Sheet <strong>Riwayat Cicilan</strong> ({totalPaymentsCount} catatan pembayaran)
                </span>
              </label>
            </div>
          </div>

          {/* File Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama File Dokumen (.xlsx)
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Export Info Box */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">File Excel Siap Diunduh</div>
              <div className="text-emerald-800 text-[11px] mt-0.5">
                File .XLSX ini dapat dibuka di Microsoft Excel, Google Sheets, LibreOffice Calc, atau aplikasi spreadsheet ponsel tanpa perlu konversi tambahan.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-confirm-download-xlsx"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Membuat File Excel...' : 'Download File .XLSX'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
