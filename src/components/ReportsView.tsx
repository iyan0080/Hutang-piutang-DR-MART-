import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck, 
  Users, 
  Layers, 
  PieChart, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Download,
  Building2
} from 'lucide-react';
import { DebtTransaction, SummaryMetrics, CustomCategoryItem, AUTHORIZED_TEAM_MEMBERS } from '../types';
import { formatRupiah, formatDate, formatDateTime } from '../utils/formatters';
import { getCustomerSummaries } from '../utils/customerHelper';
import { exportTransactionsToExcel } from '../utils/exportExcel';

interface ReportsViewProps {
  transactions: DebtTransaction[];
  metrics: SummaryMetrics;
  categories: CustomCategoryItem[];
  onOpenCustomerHistory: (customerName: string) => void;
  onOpenExportModal: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  metrics,
  categories,
  onOpenCustomerHistory,
  onOpenExportModal,
}) => {
  // Period filter
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeReportTab, setActiveReportTab] = useState<'ringkasan' | 'pelanggan' | 'kategori' | 'bulanan' | 'status'>('ringkasan');

  // Filter transactions based on report period & category
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return transactions.filter(t => {
      const txDate = new Date(t.transactionDate);

      // Period filter
      if (periodFilter === 'this_month') {
        if (txDate.getFullYear() !== currentYear || txDate.getMonth() !== currentMonth) return false;
      } else if (periodFilter === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        if (txDate.getFullYear() !== lastMonthDate.getFullYear() || txDate.getMonth() !== lastMonthDate.getMonth()) return false;
      } else if (periodFilter === 'this_year') {
        if (txDate.getFullYear() !== currentYear) return false;
      } else if (periodFilter === 'custom') {
        if (startDate && t.transactionDate < startDate) return false;
        if (endDate && t.transactionDate > endDate) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      return true;
    });
  }, [transactions, periodFilter, startDate, endDate, categoryFilter]);

  // Compute metrics for filtered subset
  const reportMetrics = useMemo(() => {
    let totalPiutang = 0;
    let totalPiutangTertagih = 0;
    let sisaPiutang = 0;
    let totalHutang = 0;
    let totalHutangTerbayar = 0;
    let sisaHutang = 0;
    let totalTransaksiPiutang = 0;
    let totalTransaksiHutang = 0;
    let piutangLunasCount = 0;
    let hutangLunasCount = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'piutang') {
        totalTransaksiPiutang++;
        totalPiutang += t.amount;
        totalPiutangTertagih += t.paidAmount;
        sisaPiutang += t.remainingAmount;
        if (t.status === 'lunas') piutangLunasCount++;
      } else {
        totalTransaksiHutang++;
        totalHutang += t.amount;
        totalHutangTerbayar += t.paidAmount;
        sisaHutang += t.remainingAmount;
        if (t.status === 'lunas') hutangLunasCount++;
      }
    });

    return {
      totalPiutang,
      totalPiutangTertagih,
      sisaPiutang,
      totalHutang,
      totalHutangTerbayar,
      sisaHutang,
      netBalance: sisaPiutang - sisaHutang,
      totalTransaksiPiutang,
      totalTransaksiHutang,
      piutangLunasCount,
      hutangLunasCount,
      totalTransactions: filteredTransactions.length,
      piutangCollectionRate: totalPiutang > 0 ? (totalPiutangTertagih / totalPiutang) * 100 : 0,
      hutangPaymentRate: totalHutang > 0 ? (totalHutangTerbayar / totalHutang) * 100 : 0,
    };
  }, [filteredTransactions]);

  // Recapitulation by Customer
  const customerRecap = useMemo(() => {
    return getCustomerSummaries(filteredTransactions).sort((a, b) => b.sisaPiutang - a.sisaPiutang);
  }, [filteredTransactions]);

  // Recapitulation by Category
  const categoryRecap = useMemo(() => {
    const map = new Map<string, {
      category: string;
      txCount: number;
      totalPiutang: number;
      paidPiutang: number;
      sisaPiutang: number;
      totalHutang: number;
      paidHutang: number;
      sisaHutang: number;
      net: number;
    }>();

    filteredTransactions.forEach(t => {
      const cat = t.category || 'Lainnya';
      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          txCount: 0,
          totalPiutang: 0,
          paidPiutang: 0,
          sisaPiutang: 0,
          totalHutang: 0,
          paidHutang: 0,
          sisaHutang: 0,
          net: 0,
        });
      }
      const item = map.get(cat)!;
      item.txCount++;
      if (t.type === 'piutang') {
        item.totalPiutang += t.amount;
        item.paidPiutang += t.paidAmount;
        item.sisaPiutang += t.remainingAmount;
      } else {
        item.totalHutang += t.amount;
        item.paidHutang += t.paidAmount;
        item.sisaHutang += t.remainingAmount;
      }
      item.net = item.sisaPiutang - item.sisaHutang;
    });

    return Array.from(map.values()).sort((a, b) => (b.totalPiutang + b.totalHutang) - (a.totalPiutang + a.totalHutang));
  }, [filteredTransactions]);

  // Recapitulation by Month
  const monthlyRecap = useMemo(() => {
    const map = new Map<string, {
      monthKey: string;
      label: string;
      txCount: number;
      piutangAmount: number;
      piutangPaid: number;
      piutangRemaining: number;
      hutangAmount: number;
      hutangPaid: number;
      hutangRemaining: number;
    }>();

    filteredTransactions.forEach(t => {
      const monthKey = t.transactionDate.slice(0, 7); // YYYY-MM
      if (!map.has(monthKey)) {
        const dateObj = new Date(t.transactionDate);
        const label = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
        map.set(monthKey, {
          monthKey,
          label,
          txCount: 0,
          piutangAmount: 0,
          piutangPaid: 0,
          piutangRemaining: 0,
          hutangAmount: 0,
          hutangPaid: 0,
          hutangRemaining: 0,
        });
      }

      const item = map.get(monthKey)!;
      item.txCount++;
      if (t.type === 'piutang') {
        item.piutangAmount += t.amount;
        item.piutangPaid += t.paidAmount;
        item.piutangRemaining += t.remainingAmount;
      } else {
        item.hutangAmount += t.amount;
        item.hutangPaid += t.paidAmount;
        item.hutangRemaining += t.remainingAmount;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredTransactions]);

  // Recapitulation by Payment Status
  const statusRecap = useMemo(() => {
    const lunas = filteredTransactions.filter(t => t.status === 'lunas');
    const cicilan = filteredTransactions.filter(t => t.status === 'sebagian');
    const belum = filteredTransactions.filter(t => t.status === 'belum_lunas');

    const sumRemaining = (list: DebtTransaction[]) => list.reduce((acc, t) => acc + t.remainingAmount, 0);
    const sumAmount = (list: DebtTransaction[]) => list.reduce((acc, t) => acc + t.amount, 0);
    const sumPaid = (list: DebtTransaction[]) => list.reduce((acc, t) => acc + t.paidAmount, 0);

    return [
      {
        status: 'Lunas',
        count: lunas.length,
        totalAmount: sumAmount(lunas),
        paidAmount: sumPaid(lunas),
        remainingAmount: 0,
        badgeClass: 'bg-emerald-100 text-emerald-800'
      },
      {
        status: 'Dalam Cicilan',
        count: cicilan.length,
        totalAmount: sumAmount(cicilan),
        paidAmount: sumPaid(cicilan),
        remainingAmount: sumRemaining(cicilan),
        badgeClass: 'bg-amber-100 text-amber-800'
      },
      {
        status: 'Belum Dibayar',
        count: belum.length,
        totalAmount: sumAmount(belum),
        paidAmount: 0,
        remainingAmount: sumRemaining(belum),
        badgeClass: 'bg-rose-100 text-rose-800'
      }
    ];
  }, [filteredTransactions]);

  const handlePrint = () => {
    window.print();
  };

  const handleQuickDownloadXLSX = () => {
    exportTransactionsToExcel(filteredTransactions, metrics, {
      scope: 'filtered',
      includePaymentsSheet: true,
      includeSummarySheet: true,
      fileName: `Laporan_Rekapitulasi_Keuangan_${new Date().toISOString().slice(0, 10)}.xlsx`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Pusat Laporan & Rekapitulasi Keuangan
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Rekapitulasi saldo piutang & hutang, rekapitulasi pelanggan, analisis kategori, dan mutasi kas
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Cetak tampilan laporan"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Laporan</span>
            </button>

            <button
              onClick={handleQuickDownloadXLSX}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Excel (.XLSX)</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Kustom</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Period Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Periode Waktu Laporan
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">Semua Waktu Transaksi</option>
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="this_year">Tahun Ini</option>
              <option value="custom">Rentang Tanggal Khusus</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Kategori Transaksi
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Custom Start Date */}
          {periodFilter === 'custom' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Custom End Date */}
          {periodFilter === 'custom' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

        </div>

      </div>

      {/* Primary KPI Neraca Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: Piutang */}
        <div className="bg-gradient-to-br from-emerald-900/5 via-white to-teal-50/60 rounded-2xl border border-emerald-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Rekapitulasi Piutang
                </div>
                <div className="text-xs text-slate-500">
                  {reportMetrics.totalTransaksiPiutang} transaksi ({reportMetrics.piutangLunasCount} lunas)
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {reportMetrics.piutangCollectionRate.toFixed(1)}% Tertagih
            </span>
          </div>

          <div className="mt-4">
            <div className="text-xs text-slate-500 font-medium">Sisa Piutang (Hak Tagih)</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
              {formatRupiah(reportMetrics.sisaPiutang)}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-100 text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Total Piutang Awal:</span>
              <span className="font-semibold text-slate-800">{formatRupiah(reportMetrics.totalPiutang)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kas Masuk Diterima:</span>
              <span className="font-semibold text-emerald-700">{formatRupiah(reportMetrics.totalPiutangTertagih)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Hutang */}
        <div className="bg-gradient-to-br from-rose-900/5 via-white to-pink-50/60 rounded-2xl border border-rose-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-sm">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Rekapitulasi Hutang
                </div>
                <div className="text-xs text-slate-500">
                  {reportMetrics.totalTransaksiHutang} transaksi ({reportMetrics.hutangLunasCount} lunas)
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {reportMetrics.hutangPaymentRate.toFixed(1)}% Terbayar
            </span>
          </div>

          <div className="mt-4">
            <div className="text-xs text-slate-500 font-medium">Sisa Hutang (Kewajiban)</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-950">
              {formatRupiah(reportMetrics.sisaHutang)}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-rose-100 text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Total Hutang Awal:</span>
              <span className="font-semibold text-slate-800">{formatRupiah(reportMetrics.totalHutang)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kas Keluar Dibayar:</span>
              <span className="font-semibold text-rose-700">{formatRupiah(reportMetrics.totalHutangTerbayar)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Posisi Kas Bersih (Net) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl border border-slate-700/80 p-5 sm:p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Posisi Kas Bersih (Net)
                  </div>
                  <div className="text-xs text-slate-400">
                    Sisa Piutang - Sisa Hutang
                  </div>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                reportMetrics.netBalance >= 0 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {reportMetrics.netBalance >= 0 ? 'Surplus Aset' : 'Defisit Kewajiban'}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className={reportMetrics.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {reportMetrics.netBalance >= 0 ? '+' : ''}{formatRupiah(reportMetrics.netBalance)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-xs text-slate-300 flex justify-between">
            <span>Status Neraca:</span>
            <span className="font-semibold text-slate-100">
              {reportMetrics.netBalance >= 0 ? 'Kondisi Sehat (Aman)' : 'Perlu Prioritas Pelunasan'}
            </span>
          </div>
        </div>

      </div>

      {/* Detailed Reports Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        
        {/* Navigation Tab Buttons */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 pt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveReportTab('ringkasan')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeReportTab === 'ringkasan'
                ? 'bg-white text-teal-800 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Ringkasan & Pelunasan
          </button>
          <button
            onClick={() => setActiveReportTab('pelanggan')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeReportTab === 'pelanggan'
                ? 'bg-white text-teal-800 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Rekapitulasi Pelanggan ({customerRecap.length})
          </button>
          <button
            onClick={() => setActiveReportTab('kategori')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeReportTab === 'kategori'
                ? 'bg-white text-teal-800 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Rekapitulasi Kategori ({categoryRecap.length})
          </button>
          <button
            onClick={() => setActiveReportTab('bulanan')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeReportTab === 'bulanan'
                ? 'bg-white text-teal-800 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Rekapitulasi Bulanan ({monthlyRecap.length})
          </button>
          <button
            onClick={() => setActiveReportTab('status')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeReportTab === 'status'
                ? 'bg-white text-teal-800 border-teal-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            Status Pelunasan
          </button>
        </div>

        {/* Tab 1: Ringkasan & Pelunasan */}
        {activeReportTab === 'ringkasan' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Piutang Collection Progress Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <span>Efektivitas Penagihan Piutang</span>
                  </h4>
                  <span className="font-bold text-emerald-700 text-sm">
                    {reportMetrics.piutangCollectionRate.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-emerald-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${reportMetrics.piutangCollectionRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 text-slate-600">
                  <div>
                    <span className="block text-[11px] text-slate-400">Total Tagihan</span>
                    <span className="font-bold text-slate-800">{formatRupiah(reportMetrics.totalPiutang)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Kas Masuk</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(reportMetrics.totalPiutangTertagih)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Sisa di Luar</span>
                    <span className="font-bold text-emerald-900">{formatRupiah(reportMetrics.sisaPiutang)}</span>
                  </div>
                </div>
              </div>

              {/* Hutang Payment Progress Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>Realisasi Pelunasan Hutang</span>
                  </h4>
                  <span className="font-bold text-rose-700 text-sm">
                    {reportMetrics.hutangPaymentRate.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-rose-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${reportMetrics.hutangPaymentRate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 text-slate-600">
                  <div>
                    <span className="block text-[11px] text-slate-400">Total Kewajiban</span>
                    <span className="font-bold text-slate-800">{formatRupiah(reportMetrics.totalHutang)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Kas Keluar</span>
                    <span className="font-bold text-rose-700">{formatRupiah(reportMetrics.totalHutangTerbayar)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400">Sisa Harus Bayar</span>
                    <span className="font-bold text-rose-900">{formatRupiah(reportMetrics.sisaHutang)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Rekapitulasi Ringkas Status Transaksi */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider">
                Ringkasan Transaksi Berdasarkan Status
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">Status Transaksi</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Transaksi</th>
                    <th className="py-2.5 px-4 text-right">Nominal Awal</th>
                    <th className="py-2.5 px-4 text-right">Sudah Dibayar</th>
                    <th className="py-2.5 px-4 text-right">Sisa Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statusRecap.map(item => (
                    <tr key={item.status} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.badgeClass}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {item.count}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatRupiah(item.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {formatRupiah(item.paidAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {formatRupiah(item.remainingAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Rekapitulasi Pelanggan */}
        {activeReportTab === 'pelanggan' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Tabel Rekapitulasi Per Pelanggan / Kontak
                </h4>
                <p className="text-xs text-slate-500">
                  Klik nama pelanggan untuk membuka detail mutasi & riwayat transaksinya
                </p>
              </div>
              <button
                onClick={handleQuickDownloadXLSX}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Excel</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Nama Pelanggan & Kontak</th>
                    <th className="py-3 px-4 text-center">Jml Transaksi</th>
                    <th className="py-3 px-4 text-right">Total Piutang</th>
                    <th className="py-3 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3 px-4 text-right">Total Hutang</th>
                    <th className="py-3 px-4 text-right">Sisa Hutang</th>
                    <th className="py-3 px-4 text-right">Posisi Net</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerRecap.map((c, idx) => (
                    <tr key={c.contactName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div 
                          onClick={() => onOpenCustomerHistory(c.contactName)}
                          className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{c.contactName}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </div>
                        {c.contactPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">{c.contactPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {c.transactionCount}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        {formatRupiah(c.totalPiutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">
                        {formatRupiah(c.sisaPiutang)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        {formatRupiah(c.totalHutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-800">
                        {formatRupiah(c.sisaHutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={c.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {c.netBalance >= 0 ? '+' : ''}{formatRupiah(c.netBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onOpenCustomerHistory(c.contactName)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          Riwayat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Rekapitulasi Kategori */}
        {activeReportTab === 'kategori' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              Rekapitulasi Berdasarkan Kategori Transaksi
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">Jml Transaksi</th>
                    <th className="py-3 px-4 text-right">Total Piutang</th>
                    <th className="py-3 px-4 text-right">Piutang Tertagih</th>
                    <th className="py-3 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3 px-4 text-right">Total Hutang</th>
                    <th className="py-3 px-4 text-right">Sisa Hutang</th>
                    <th className="py-3 px-4 text-right">Posisi Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryRecap.map(item => (
                    <tr key={item.category} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {item.txCount}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatRupiah(item.totalPiutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {formatRupiah(item.paidPiutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">
                        {formatRupiah(item.sisaPiutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatRupiah(item.totalHutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-800">
                        {formatRupiah(item.sisaHutang)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={item.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {item.net >= 0 ? '+' : ''}{formatRupiah(item.net)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Rekapitulasi Bulanan */}
        {activeReportTab === 'bulanan' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              Rekapitulasi Akumulasi Transaksi Per Bulan
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Bulan & Tahun</th>
                    <th className="py-3 px-4 text-center">Jml Transaksi</th>
                    <th className="py-3 px-4 text-right">Piutang Awal</th>
                    <th className="py-3 px-4 text-right">Kas Diterima</th>
                    <th className="py-3 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3 px-4 text-right">Hutang Awal</th>
                    <th className="py-3 px-4 text-right">Kas Dibayar</th>
                    <th className="py-3 px-4 text-right">Sisa Hutang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyRecap.map(item => (
                    <tr key={item.monthKey} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.label}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {item.txCount}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatRupiah(item.piutangAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {formatRupiah(item.piutangPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">
                        {formatRupiah(item.piutangRemaining)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatRupiah(item.hutangAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-700">
                        {formatRupiah(item.hutangPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-800">
                        {formatRupiah(item.hutangRemaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Status Pelunasan */}
        {activeReportTab === 'status' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              Analisis Tingkat Pelunasan Transaksi
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statusRecap.map(s => (
                <div key={s.status} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.badgeClass}`}>
                      {s.status}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {s.count} Transaksi
                    </span>
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nominal Awal:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(s.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sudah Terbayar:</span>
                      <span className="font-semibold text-emerald-700">{formatRupiah(s.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sisa Tagihan:</span>
                      <span className="font-bold text-rose-800">{formatRupiah(s.remainingAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Team Authority & Operational Info */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Validasi Rekapitulasi Akun Tim Pengelola
              </h4>
              <p className="text-xs text-slate-400">
                Laporan ini divalidasi secara otomatis dari database Firebase Cloud
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {AUTHORIZED_TEAM_MEMBERS.map((member) => (
              <div 
                key={member.email}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs"
              >
                <span className={`w-2 h-2 rounded-full ${member.role === 'Owner' ? 'bg-amber-400' : 'bg-teal-400'}`} />
                <span className="font-semibold text-slate-200">{member.role}:</span>
                <span className="text-slate-300 font-mono text-[11px]">{member.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
