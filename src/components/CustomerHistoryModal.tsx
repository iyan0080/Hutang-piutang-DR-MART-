import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MessageCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  History, 
  ChevronDown, 
  ChevronUp,
  FileSpreadsheet,
  Printer,
  Layers,
  Search,
  RotateCcw,
  FileText,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Filter
} from 'lucide-react';
import { DebtTransaction, PaymentRecord } from '../types';
import { formatRupiah, formatDate, formatDateTime } from '../utils/formatters';
import { formatWhatsAppUrl } from '../utils/customerHelper';
import * as XLSX from 'xlsx';

export type PeriodPreset = 'all' | 'today' | 'this_month' | 'last_month' | 'this_year' | 'custom';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string | null;
  transactions: DebtTransaction[];
  onOpenPaymentModal: (transaction: DebtTransaction) => void;
  onOpenEditModal: (transaction: DebtTransaction) => void;
  onDeleteTransaction: (id: string, name: string) => void;
  onAddNewTransaction: (customerName: string, defaultType?: 'hutang' | 'piutang', phone?: string) => void;
  onDeletePayment?: (transactionId: string, paymentId: string) => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customerName,
  transactions,
  onOpenPaymentModal,
  onOpenEditModal,
  onDeleteTransaction,
  onAddNewTransaction,
  onDeletePayment,
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'transactions' | 'report'>('transactions');

  // Filters
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'piutang' | 'hutang'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'belum_lunas' | 'sebagian' | 'lunas'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !customerName) return null;

  // 1. All raw transactions for this customer
  const allCustomerTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.contactName.trim().toLowerCase() === customerName.trim().toLowerCase()
    ).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions, customerName]);

  // Phone number extraction
  const customerPhone = useMemo(() => {
    const found = allCustomerTransactions.find(t => t.contactPhone && t.contactPhone.trim() !== '');
    return found ? found.contactPhone : undefined;
  }, [allCustomerTransactions]);

  // 2. Compute date boundaries based on periodPreset
  const activeDateRange = useMemo<{ start: string; end: string; label: string }>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const formatDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (periodPreset) {
      case 'today': {
        const todayStr = formatDateStr(now);
        return { start: todayStr, end: todayStr, label: `Hari Ini (${formatDate(todayStr)})` };
      }
      case 'this_month': {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const start = formatDateStr(firstDay);
        const end = formatDateStr(lastDay);
        return { 
          start, 
          end, 
          label: `Bulan Ini (${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)})` 
        };
      }
      case 'last_month': {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);
        const start = formatDateStr(firstDay);
        const end = formatDateStr(lastDay);
        return { 
          start, 
          end, 
          label: `Bulan Lalu (${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(firstDay)})` 
        };
      }
      case 'this_year': {
        const firstDay = new Date(currentYear, 0, 1);
        const lastDay = new Date(currentYear, 11, 31);
        const start = formatDateStr(firstDay);
        const end = formatDateStr(lastDay);
        return { start, end, label: `Tahun Ini (${currentYear})` };
      }
      case 'custom': {
        if (startDate && endDate) {
          return { start: startDate, end: endDate, label: `Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}` };
        } else if (startDate) {
          return { start: startDate, end: '9999-12-31', label: `Mulai ${formatDate(startDate)}` };
        } else if (endDate) {
          return { start: '1970-01-01', end: endDate, label: `Sampai ${formatDate(endDate)}` };
        }
        return { start: '', end: '', label: 'Kustom (Belum dipilih rentang)' };
      }
      case 'all':
      default:
        return { start: '', end: '', label: 'Semua Periode Transaksi' };
    }
  }, [periodPreset, startDate, endDate]);

  // 3. Filtered transactions based on period (by transactionDate), type, status, and search query
  const displayedTransactions = useMemo(() => {
    return allCustomerTransactions.filter(t => {
      // Date filter based on transaction occurrence date (transactionDate)
      const txDateStr = (t.transactionDate || '').slice(0, 10);
      if (activeDateRange.start && txDateStr < activeDateRange.start) return false;
      if (activeDateRange.end && txDateStr > activeDateRange.end) return false;

      // Type filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Status filter
      if (filterStatus === 'lunas' && t.status !== 'lunas') return false;
      if (filterStatus === 'belum_lunas' && t.status !== 'belum_lunas') return false;
      if (filterStatus === 'sebagian' && t.status !== 'sebagian') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNote = t.notes ? t.notes.toLowerCase().includes(q) : false;
        const matchCategory = t.category ? t.category.toLowerCase().includes(q) : false;
        const matchId = t.id ? t.id.toLowerCase().includes(q) : false;
        const matchAmount = t.amount.toString().includes(q);
        if (!matchNote && !matchCategory && !matchId && !matchAmount) return false;
      }

      return true;
    });
  }, [allCustomerTransactions, activeDateRange, filterType, filterStatus, searchQuery]);

  // 4. Metrics specifically for the active period & filters
  const periodMetrics = useMemo(() => {
    let totalPiutang = 0;
    let paidPiutang = 0;
    let sisaPiutang = 0;
    let totalHutang = 0;
    let paidHutang = 0;
    let sisaHutang = 0;
    let piutangLunasCount = 0;
    let hutangLunasCount = 0;
    let totalPaymentsInPeriod = 0;
    let totalPaymentAmountInPeriod = 0;

    displayedTransactions.forEach(t => {
      if (t.type === 'piutang') {
        totalPiutang += t.amount;
        paidPiutang += t.paidAmount;
        sisaPiutang += t.remainingAmount;
        if (t.status === 'lunas') piutangLunasCount++;
      } else {
        totalHutang += t.amount;
        paidHutang += t.paidAmount;
        sisaHutang += t.remainingAmount;
        if (t.status === 'lunas') hutangLunasCount++;
      }

      // Count payments on these transactions (using payment occurrence date p.date)
      if (t.payments && t.payments.length > 0) {
        t.payments.forEach(p => {
          const payDateStr = (p.date || '').slice(0, 10);
          let isPaymentInRange = true;
          if (activeDateRange.start && payDateStr < activeDateRange.start) isPaymentInRange = false;
          if (activeDateRange.end && payDateStr > activeDateRange.end) isPaymentInRange = false;
          
          if (isPaymentInRange || periodPreset === 'all') {
            totalPaymentsInPeriod++;
            totalPaymentAmountInPeriod += p.amount;
          }
        });
      }
    });

    const net = sisaPiutang - sisaHutang;
    const piutangRate = totalPiutang > 0 ? (paidPiutang / totalPiutang) * 100 : 0;
    const hutangRate = totalHutang > 0 ? (paidHutang / totalHutang) * 100 : 0;

    return {
      totalPiutang,
      paidPiutang,
      sisaPiutang,
      totalHutang,
      paidHutang,
      sisaHutang,
      net,
      totalTransactions: displayedTransactions.length,
      unpaidCount: displayedTransactions.filter(t => t.status !== 'lunas').length,
      lunasCount: displayedTransactions.filter(t => t.status === 'lunas').length,
      piutangLunasCount,
      hutangLunasCount,
      piutangRate,
      hutangRate,
      totalPaymentsInPeriod,
      totalPaymentAmountInPeriod,
    };
  }, [displayedTransactions, activeDateRange, periodPreset]);

  // Overall lifetime stats for comparison
  const lifetimeStats = useMemo(() => {
    let sisaPiutang = 0;
    let sisaHutang = 0;
    allCustomerTransactions.forEach(t => {
      if (t.type === 'piutang') sisaPiutang += t.remainingAmount;
      else sisaHutang += t.remainingAmount;
    });
    return {
      sisaPiutang,
      sisaHutang,
      net: sisaPiutang - sisaHutang,
      total: allCustomerTransactions.length
    };
  }, [allCustomerTransactions]);

  // Category breakdown for this period
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; piutang: number; hutang: number; remaining: number }> = {};
    displayedTransactions.forEach(t => {
      const cat = t.category || 'Umum';
      if (!map[cat]) {
        map[cat] = { count: 0, piutang: 0, hutang: 0, remaining: 0 };
      }
      map[cat].count++;
      if (t.type === 'piutang') {
        map[cat].piutang += t.amount;
      } else {
        map[cat].hutang += t.amount;
      }
      map[cat].remaining += t.remainingAmount;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [displayedTransactions]);

  // List of all payment records in displayed transactions
  const paymentsInPeriod = useMemo(() => {
    const list: Array<{
      payment: PaymentRecord;
      transaction: DebtTransaction;
    }> = [];

    displayedTransactions.forEach(t => {
      t.payments?.forEach(p => {
        list.push({ payment: p, transaction: t });
      });
    });

    return list.sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());
  }, [displayedTransactions]);

  const toggleExpand = (id: string) => {
    setExpandedTxIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Export period statement to Excel (.xlsx)
  const handleExportPeriodExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Ringkasan Periode Sheet
    const summaryData = [
      [`LAPORAN REKAPITULASI HUTANG PIUTANG - ${customerName.toUpperCase()}`],
      [`Periode Laporan`, activeDateRange.label],
      [`Tanggal Ekspor`, formatDateTime(new Date().toISOString())],
      [`Nomor Kontak / WA`, customerPhone || '-'],
      [''],
      ['INDIKATOR KEUANGAN PERIODE INI', 'NILAI (RUPIAH)', 'KETERANGAN'],
      ['Total Piutang Tercatat (Hak Tagih)', periodMetrics.totalPiutang, 'Nominal piutang baru pada periode ini'],
      ['Piutang Telah Diterima (Cicilan/Lunas)', periodMetrics.paidPiutang, 'Uang masuk dari piutang periode ini'],
      ['Sisa Piutang Berjalan', periodMetrics.sisaPiutang, 'Sisa hak tagih yang belum diterima'],
      [''],
      ['Total Hutang Tercatat (Kewajiban)', periodMetrics.totalHutang, 'Nominal hutang baru pada periode ini'],
      ['Hutang Telah Terbayar', periodMetrics.paidHutang, 'Uang keluar untuk bayar hutang periode ini'],
      ['Sisa Hutang Berjalan', periodMetrics.sisaHutang, 'Sisa kewajiban hutang yang harus dibayar'],
      [''],
      ['POSISI KAS BERSIH PERIODE (NET)', periodMetrics.net, periodMetrics.net >= 0 ? 'Surplus (Tagihan ke pelanggan)' : 'Defisit (Kewajiban ke pelanggan)'],
      [''],
      ['TOTAL SALDO BERJALAN KESELURUHAN (ALL-TIME)', lifetimeStats.net, `Total Sisa Piutang: ${formatRupiah(lifetimeStats.sisaPiutang)} | Sisa Hutang: ${formatRupiah(lifetimeStats.sisaHutang)}`],
      [''],
      ['STATISTIK TRANSAKSI PERIODE INI', 'JUMLAH', 'STATUS'],
      ['Total Transaksi', periodMetrics.totalTransactions, `${periodMetrics.lunasCount} Lunas / ${periodMetrics.unpaidCount} Belum Lunas`],
      ['Total Pembayaran / Cicilan Dicatat', paymentsInPeriod.length, `Total Nilai: ${formatRupiah(periodMetrics.paidPiutang + periodMetrics.paidHutang)}`]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');

    // 2. Daftar Transaksi Periode Sheet
    const txRows = displayedTransactions.map((t, idx) => ({
      'No': idx + 1,
      'Tanggal Transaksi': formatDate(t.transactionDate),
      'Tipe Transaksi': t.type === 'piutang' ? 'Piutang (Hak Tagih)' : 'Hutang (Kewajiban)',
      'Kategori': t.category,
      'Nominal Awal': t.amount,
      'Total Terbayar': t.paidAmount,
      'Sisa Tagihan': t.remainingAmount,
      'Status': t.status === 'lunas' ? 'Lunas' : t.status === 'sebagian' ? 'Cicilan' : 'Belum Bayar',
      'Catatan': t.notes || '-',
      'ID Transaksi': t.id,
      'Jumlah Cicilan': t.payments.length
    }));

    const wsTx = XLSX.utils.json_to_sheet(txRows);
    wsTx['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 },
      { wch: 18 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTx, 'Mutasi Transaksi');

    // 3. Rincian Pembayaran Sheet
    if (paymentsInPeriod.length > 0) {
      const payRows = paymentsInPeriod.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal Bayar': formatDate(item.payment.date),
        'ID Transaksi': item.transaction.id,
        'Tipe': item.transaction.type === 'piutang' ? 'Penerimaan Piutang' : 'Pembayaran Hutang',
        'Kategori': item.transaction.category,
        'Nominal Bayar': item.payment.amount,
        'Catatan Pembayaran': item.payment.note || '-',
        'ID Pembayaran': item.payment.id
      }));
      const wsPay = XLSX.utils.json_to_sheet(payRows);
      wsPay['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 30 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsPay, 'Rincian Pembayaran');
    }

    const cleanCustName = customerName.replace(/[^a-zA-Z0-9]/g, '_');
    const dateSuffix = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Laporan_${cleanCustName}_${periodPreset}_${dateSuffix}.xlsx`);
  };

  // Print customer statement
  const handlePrintStatement = () => {
    window.print();
  };

  const waUrl = formatWhatsAppUrl(customerPhone, customerName, periodMetrics.sisaPiutang > 0 ? periodMetrics.sisaPiutang : lifetimeStats.sisaPiutang);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:border-b-2 print:border-slate-800">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0">
              {customerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {customerName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800">
                  {periodMetrics.totalTransactions} Catatan Periode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                  Total: {lifetimeStats.total}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                {customerPhone ? (
                  <span className="font-mono text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customerPhone}
                  </span>
                ) : (
                  <span>Tanpa nomor telepon</span>
                )}
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-800 print:hidden"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat WA</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap print:hidden">
            <button
              onClick={handleExportPeriodExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Unduh Laporan Periode ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={handlePrintStatement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Cetak Laporan / Simpan PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={() => onAddNewTransaction(customerName, 'piutang', customerPhone)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Transaksi</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector & Period Filter Bar */}
        <div className="bg-slate-100/80 border-b border-slate-200/80 p-3 sm:px-6 space-y-3 shrink-0 print:hidden">
          
          {/* Main Tab Toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex p-1 bg-slate-200/80 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-teal-600" />
                <span>Riwayat Transaksi & Cicilan ({displayedTransactions.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-teal-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Laporan & Rekapitulasi Periode</span>
              </button>
            </div>

            {/* Active Period Label Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-teal-200/80 rounded-xl text-xs font-bold text-teal-900 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>{activeDateRange.label}</span>
            </div>
          </div>

          {/* Period Filter Presets Row */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Periode:
            </span>

            <button
              onClick={() => { setPeriodPreset('all'); setStartDate(''); setEndDate(''); }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                periodPreset === 'all'
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setPeriodPreset('today')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                periodPreset === 'today'
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriodPreset('this_month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                periodPreset === 'this_month'
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPeriodPreset('last_month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                periodPreset === 'last_month'
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setPeriodPreset('this_year')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                periodPreset === 'this_year'
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Tahun Ini
            </button>
            <button
              onClick={() => setPeriodPreset('custom')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                periodPreset === 'custom'
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Pilih Tanggal (Kustom)
            </button>

            {periodPreset !== 'all' && (
              <button
                onClick={() => { setPeriodPreset('all'); setStartDate(''); setEndDate(''); }}
                className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold ml-auto cursor-pointer"
                title="Reset periode ke semua waktu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Indicator: Date of Occurrence */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span>
            <span>Filter periode dihitung berdasarkan <strong>Tanggal Terjadinya Transaksi</strong> (bukan tanggal/waktu input).</span>
          </div>

          {/* Custom Date Range Picker (Only shown when 'custom' is selected) */}
          {periodPreset === 'custom' && (
            <div className="p-3 bg-white rounded-xl border border-teal-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Dari Tanggal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Sampai Tanggal:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Bersihkan Rentang
                </button>
              )}
            </div>
          )}

          {/* Secondary Filter Controls: Type, Status, & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-lg text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterType === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Tipe
                </button>
                <button
                  onClick={() => setFilterType('piutang')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterType === 'piutang' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>Piutang</span>
                </button>
                <button
                  onClick={() => setFilterType('hutang')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterType === 'hutang' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Hutang</span>
                </button>
              </div>

              {/* Status Filter */}
              <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-lg text-xs">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Status: Semua
                </button>
                <button
                  onClick={() => setFilterStatus('belum_lunas')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'belum_lunas' ? 'bg-amber-600 text-white font-bold' : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  Belum Lunas
                </button>
                <button
                  onClick={() => setFilterStatus('lunas')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'lunas' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Lunas
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Scrollable Main Content */}
        <div ref={printableRef} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 print:p-0 print:overflow-visible">
          
          {/* Printable Document Header (Visible during Print only) */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-slate-900 uppercase">Rekening Koran / Mutasi Hutang Piutang</h1>
                <p className="text-sm font-semibold text-slate-700">Nama Pelanggan / Mitra: {customerName}</p>
                <p className="text-xs text-slate-500">No. Kontak / WA: {customerPhone || '-'}</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p className="font-bold text-slate-800">Periode: {activeDateRange.label}</p>
                <p>Dicetak pada: {formatDateTime(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          {/* Period Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Piutang Card for Selected Period */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Piutang Periode Ini
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {periodMetrics.piutangRate.toFixed(0)}% Tertagih
                </span>
              </div>
              <div className="mt-2 text-lg sm:text-xl font-black text-emerald-950">
                {formatRupiah(periodMetrics.sisaPiutang)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-700 flex justify-between">
                <span>Awal: {formatRupiah(periodMetrics.totalPiutang)}</span>
                <span>Diterima: {formatRupiah(periodMetrics.paidPiutang)}</span>
              </div>
            </div>

            {/* Hutang Card for Selected Period */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Hutang Periode Ini
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {periodMetrics.hutangRate.toFixed(0)}% Dibayar
                </span>
              </div>
              <div className="mt-2 text-lg sm:text-xl font-black text-rose-950">
                {formatRupiah(periodMetrics.sisaHutang)}
              </div>
              <div className="mt-1 text-[11px] text-rose-700 flex justify-between">
                <span>Awal: {formatRupiah(periodMetrics.totalHutang)}</span>
                <span>Terbayar: {formatRupiah(periodMetrics.paidHutang)}</span>
              </div>
            </div>

            {/* Posisi Bersih Periode Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <span>Posisi Kas Bersih (Net)</span>
                {periodPreset !== 'all' && (
                  <span className="text-[10px] text-teal-300 normal-case font-normal">Periode Terpilih</span>
                )}
              </div>
              <div className={`mt-2 text-lg sm:text-xl font-black ${
                periodMetrics.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {periodMetrics.net >= 0 ? '+' : ''}{formatRupiah(periodMetrics.net)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 flex justify-between items-center">
                <span>
                  {periodMetrics.net > 0 ? 'Pelanggan memiliki tagihan' : periodMetrics.net < 0 ? 'Kita memiliki hutang' : 'Saldo seimbang / lunas'}
                </span>
                {periodPreset !== 'all' && (
                  <span className="text-[10px] text-slate-300 font-mono">
                    All-time: {lifetimeStats.net >= 0 ? '+' : ''}{formatRupiah(lifetimeStats.net)}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DAFTAR TRANSAKSI & CICILAN                                        */}
          {/* ========================================================================= */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-600" />
                  <span>Daftar Transaksi ({displayedTransactions.length})</span>
                </h4>
                <div className="text-xs text-slate-500">
                  {periodMetrics.unpaidCount > 0 ? (
                    <span className="text-amber-700 font-semibold">{periodMetrics.unpaidCount} Transaksi Belum Lunas</span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">Semua Transaksi Periode Ini Lunas</span>
                  )}
                </div>
              </div>

              {displayedTransactions.length === 0 ? (
                <div className="text-xs text-slate-400 py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto mb-2 text-slate-400">
                    <Filter className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-600 text-sm">Tidak ada catatan transaksi pada periode ini</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah rentang tanggal atau pilih preset periode lainnya.</p>
                  <button
                    onClick={() => { setPeriodPreset('all'); setFilterType('all'); setFilterStatus('all'); setSearchQuery(''); }}
                    className="mt-3 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Tampilkan Semua Waktu
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedTransactions.map((item) => {
                    const isPiutang = item.type === 'piutang';
                    const isPaid = item.status === 'lunas';
                    const isExpanded = !!expandedTxIds[item.id];

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all overflow-hidden"
                      >
                        {/* Top Bar */}
                        <div className="p-4 sm:p-4.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                              isPiutang ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}>
                              {isPiutang ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs sm:text-sm ${
                                  isPiutang ? 'text-emerald-800' : 'text-rose-800'
                                }`}>
                                  {isPiutang ? 'Piutang (Hak Tagih)' : 'Hutang (Kewajiban)'}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700">
                                  {item.category}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>Tgl: {formatDate(item.transactionDate)}</span>
                                <span>•</span>
                                <span className="font-mono text-[11px]">ID: {item.id}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                            <div className="text-left sm:text-right">
                              <div className="text-[11px] text-slate-500">Sisa Tagihan</div>
                              <div className={`font-black text-sm sm:text-base ${
                                isPaid ? 'text-emerald-600' : isPiutang ? 'text-emerald-800' : 'text-rose-800'
                              }`}>
                                {formatRupiah(item.remainingAmount)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 print:hidden">
                              {!isPaid && (
                                <button
                                  onClick={() => onOpenPaymentModal(item)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer ${
                                    isPiutang ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                  }`}
                                >
                                  {isPiutang ? '+ Terima' : '+ Bayar'}
                                </button>
                              )}

                              <button
                                onClick={() => onOpenEditModal(item)}
                                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                title="Edit transaksi"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => onDeleteTransaction(item.id, item.contactName)}
                                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus transaksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Middle Details Grid */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Nominal Awal</span>
                            <span className="font-bold text-slate-900">{formatRupiah(item.amount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Total Terbayar</span>
                            <span className="font-bold text-emerald-700">{formatRupiah(item.paidAmount)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Status</span>
                            <span className={`font-semibold inline-flex items-center gap-1 ${
                              isPaid ? 'text-emerald-700' : item.status === 'sebagian' ? 'text-amber-700' : 'text-slate-700'
                            }`}>
                              {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {isPaid ? 'Lunas' : item.status === 'sebagian' ? 'Cicilan' : 'Belum Bayar'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">Riwayat Cicilan</span>
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{item.payments.length} Pembayaran</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="px-4 pb-3 text-xs text-slate-600 border-t border-slate-50 pt-2">
                            <span className="font-semibold text-slate-700">Catatan: </span>
                            <span>{item.notes}</span>
                          </div>
                        )}

                        {/* Expandable Payments Log */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50 border-t border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                              <span>Rincian Pembayaran / Cicilan:</span>
                              {!isPaid && (
                                <button
                                  onClick={() => onOpenPaymentModal(item)}
                                  className="text-[11px] text-teal-700 hover:underline cursor-pointer print:hidden"
                                >
                                  + Catat Pembayaran Baru
                                </button>
                              )}
                            </div>

                            {item.payments.length === 0 ? (
                              <div className="text-xs text-slate-400 py-3 text-center bg-white rounded-xl border border-slate-200">
                                Belum ada catatan pembayaran.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {item.payments.map((p, pIdx) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900">
                                        #{pIdx + 1} • {formatRupiah(p.amount)}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                        <span>Tgl Bayar: {formatDate(p.date)}</span>
                                        {p.note && <span className="ml-2">• {p.note}</span>}
                                      </div>
                                    </div>

                                    {onDeletePayment && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Hapus catatan pembayaran ini senilai ${formatRupiah(p.amount)}?`)) {
                                            onDeletePayment(item.id, p.id);
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer print:hidden"
                                        title="Hapus pembayaran ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LAPORAN REKAPITULASI & STATISTIK PERIODE                           */}
          {/* ========================================================================= */}
          {activeTab === 'report' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Report Header Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30 uppercase tracking-wider">
                      Ikhtisar Mutasi Periode
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold mt-2">
                      Laporan Hutang & Piutang: {customerName}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Rentang: <span className="font-semibold text-white">{activeDateRange.label}</span> • Total {displayedTransactions.length} transaksi dianalisis
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-right">
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs text-left">
                      <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Tingkat Tertagih</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-400">{periodMetrics.piutangRate.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs text-left">
                      <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Tingkat Pembayaran</div>
                      <div className="text-base sm:text-lg font-bold text-rose-300">{periodMetrics.hutangRate.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabel Mutasi Kronologis Periode */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Tabel Mutasi Transaksi Pada Periode Terpilih</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    {displayedTransactions.length} Data
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">ID & Tipe</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3 text-right">Nominal Awal</th>
                        <th className="py-2.5 px-3 text-right">Terbayar</th>
                        <th className="py-2.5 px-3 text-right">Sisa Tagihan</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Tidak ada transaksi pada periode terpilih.
                          </td>
                        </tr>
                      ) : (
                        displayedTransactions.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                              {formatDate(t.transactionDate)}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold">
                                {t.type === 'piutang' ? (
                                  <span className="text-emerald-700">Piutang</span>
                                ) : (
                                  <span className="text-rose-700">Hutang</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{t.id}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                                {t.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatRupiah(t.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                              {formatRupiah(t.paidAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatRupiah(t.remainingAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'lunas' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : t.status === 'sebagian' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {t.status === 'lunas' ? 'Lunas' : t.status === 'sebagian' ? 'Cicilan' : 'Belum Bayar'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-right">TOTAL PERIODE INI:</td>
                        <td className="py-3 px-3 text-right text-slate-900">{formatRupiah(periodMetrics.totalPiutang + periodMetrics.totalHutang)}</td>
                        <td className="py-3 px-3 text-right text-emerald-700">{formatRupiah(periodMetrics.paidPiutang + periodMetrics.paidHutang)}</td>
                        <td className="py-3 px-3 text-right text-teal-900">{formatRupiah(periodMetrics.sisaPiutang + periodMetrics.sisaHutang)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Rincian Kategori & Cicilan 2-Kolom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Rekapitulasi Berdasarkan Kategori */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>Rekap Kategori Transaksi Periode Ini</span>
                  </h4>
                  {categoryBreakdown.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">Tidak ada data kategori.</div>
                  ) : (
                    <div className="space-y-2">
                      {categoryBreakdown.map(cat => (
                        <div key={cat.name} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>{cat.name}</span>
                            <span className="text-slate-500 font-normal">{cat.count} transaksi</span>
                          </div>
                          <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">Piutang</span>
                              <span className="font-semibold text-emerald-700">{formatRupiah(cat.piutang)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Hutang</span>
                              <span className="font-semibold text-rose-700">{formatRupiah(cat.hutang)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Sisa Tagihan</span>
                              <span className="font-bold text-slate-900">{formatRupiah(cat.remaining)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Rincian Pembayaran Masuk / Keluar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Riwayat Penerimaan / Cicilan</span>
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {paymentsInPeriod.length} Pembayaran
                    </span>
                  </div>

                  {paymentsInPeriod.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      Belum ada pembayaran dicatat pada periode transaksi ini.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {paymentsInPeriod.map((item, idx) => (
                        <div
                          key={item.payment.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="text-emerald-700">+{formatRupiah(item.payment.amount)}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({item.transaction.type === 'piutang' ? 'Cicilan Piutang' : 'Bayar Hutang'})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              <span>{formatDate(item.payment.date)}</span>
                              {item.payment.note && <span className="ml-1.5">• {item.payment.note}</span>}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">
                            {item.transaction.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Tanda Tangan Cetak (Hanya tampil saat dicetak) */}
              <div className="hidden print:grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-300 text-center text-xs">
                <div>
                  <p className="font-semibold text-slate-700">Diserahkan / Dikonfirmasi Oleh,</p>
                  <div className="h-20"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 w-48 mx-auto">{customerName}</p>
                  <p className="text-slate-500 text-[10px]">Pelanggan / Mitra</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Pengelola Buku Kas / Toko,</p>
                  <div className="h-20"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 w-48 mx-auto">dr.bussiness01@gmail.com</p>
                  <p className="text-slate-500 text-[10px]">Staff / Otoritas Toko</p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-slate-500 hidden sm:block">
            Semua perubahan dan pembayaran tersinkronisasi otomatis ke Firebase Cloud.
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleExportPeriodExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel Periode Ini</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
