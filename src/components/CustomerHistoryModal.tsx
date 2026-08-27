import React, { useState, useMemo } from 'react';
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
  Layers,
  Search
} from 'lucide-react';
import { DebtTransaction, PaymentRecord } from '../types';
import { formatRupiah, formatDate, formatDateTime } from '../utils/formatters';
import { formatWhatsAppUrl } from '../utils/customerHelper';
import * as XLSX from 'xlsx';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string | null;
  transactions: DebtTransaction[];
  onOpenPaymentModal: (transaction: DebtTransaction) => void;
  onOpenEditModal: (transaction: DebtTransaction) => void;
  onDeleteTransaction: (id: string, name: string) => void;
  onAddNewTransaction: (customerName: string, defaultType?: 'hutang' | 'piutang', phone?: string) => void;
  onDeletePayment: (transactionId: string, paymentId: string) => void;
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
  const [filterType, setFilterType] = useState<'all' | 'piutang' | 'hutang'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'belum_lunas' | 'sebagian' | 'lunas'>('all');
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  if (!isOpen || !customerName) return null;

  // Filter all transactions matching this customer
  const customerTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.contactName.trim().toLowerCase() === customerName.trim().toLowerCase()
    ).sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions, customerName]);

  // Aggregate metrics for this customer
  const customerStats = useMemo(() => {
    let totalPiutang = 0;
    let paidPiutang = 0;
    let sisaPiutang = 0;
    let totalHutang = 0;
    let paidHutang = 0;
    let sisaHutang = 0;
    let phone: string | undefined = undefined;

    customerTransactions.forEach(t => {
      if (t.contactPhone && !phone) {
        phone = t.contactPhone;
      }
      if (t.type === 'piutang') {
        totalPiutang += t.amount;
        paidPiutang += t.paidAmount;
        sisaPiutang += t.remainingAmount;
      } else {
        totalHutang += t.amount;
        paidHutang += t.paidAmount;
        sisaHutang += t.remainingAmount;
      }
    });

    const net = sisaPiutang - sisaHutang;

    return {
      phone,
      totalPiutang,
      paidPiutang,
      sisaPiutang,
      totalHutang,
      paidHutang,
      sisaHutang,
      net,
      totalTransactions: customerTransactions.length,
      unpaidCount: customerTransactions.filter(t => t.status !== 'lunas').length,
    };
  }, [customerTransactions]);

  // Filtered transactions within modal
  const displayedTransactions = useMemo(() => {
    return customerTransactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterStatus === 'lunas' && t.status !== 'lunas') return false;
      if (filterStatus === 'belum_lunas' && t.status !== 'belum_lunas') return false;
      if (filterStatus === 'sebagian' && t.status !== 'sebagian') return false;
      return true;
    });
  }, [customerTransactions, filterType, filterStatus]);

  const toggleExpand = (id: string) => {
    setExpandedTxIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExportCustomerStatement = () => {
    const wb = XLSX.utils.book_new();
    const rows = customerTransactions.map((t, idx) => ({
      'No': idx + 1,
      'Tanggal': formatDate(t.transactionDate),
      'Tipe': t.type === 'piutang' ? 'Piutang (Hak Tagih)' : 'Hutang (Kewajiban)',
      'Kategori': t.category,
      'Nominal Awal': t.amount,
      'Total Terbayar': t.paidAmount,
      'Sisa Tagihan': t.remainingAmount,
      'Status': t.status === 'lunas' ? 'Lunas' : t.status === 'sebagian' ? 'Cicilan' : 'Belum Bayar',
      'Catatan': t.notes || '-',
      'ID Transaksi': t.id
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Transaksi');
    XLSX.writeFile(wb, `Mutasi_${customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const waUrl = formatWhatsAppUrl(customerStats.phone, customerName, customerStats.sisaPiutang);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0">
              {customerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {customerName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                  {customerStats.totalTransactions} Catatan
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                {customerStats.phone ? (
                  <span className="font-mono text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customerStats.phone}
                  </span>
                ) : (
                  <span>Tanpa nomor telepon</span>
                )}
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-800"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat WA</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCustomerStatement}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Export riwayat ke Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export</span>
            </button>
            <button
              onClick={() => onAddNewTransaction(customerName, 'piutang', customerStats.phone)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Tambah Transaksi</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Summary Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Piutang (Hak Tagih) */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  Piutang (Hak Tagih)
                </span>
              </div>
              <div className="mt-2 text-lg sm:text-xl font-black text-emerald-950">
                {formatRupiah(customerStats.sisaPiutang)}
              </div>
              <div className="mt-1 text-[11px] text-emerald-700 flex justify-between">
                <span>Awal: {formatRupiah(customerStats.totalPiutang)}</span>
                <span>Diterima: {formatRupiah(customerStats.paidPiutang)}</span>
              </div>
            </div>

            {/* Hutang (Kewajiban) */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Hutang (Kewajiban)
                </span>
              </div>
              <div className="mt-2 text-lg sm:text-xl font-black text-rose-950">
                {formatRupiah(customerStats.sisaHutang)}
              </div>
              <div className="mt-1 text-[11px] text-rose-700 flex justify-between">
                <span>Awal: {formatRupiah(customerStats.totalHutang)}</span>
                <span>Terbayar: {formatRupiah(customerStats.paidHutang)}</span>
              </div>
            </div>

            {/* Posisi Bersih */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Posisi Kas Bersih (Net)
              </div>
              <div className={`mt-2 text-lg sm:text-xl font-black ${
                customerStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {customerStats.net >= 0 ? '+' : ''}{formatRupiah(customerStats.net)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {customerStats.net > 0 ? 'Pelanggan memiliki tagihan' : customerStats.net < 0 ? 'Kita memiliki hutang' : 'Saldo seimbang / lunas'}
              </div>
            </div>

          </div>

          {/* Filter Bar within Customer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Transaksi ({customerTransactions.length})
              </button>
              <button
                onClick={() => setFilterType('piutang')}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'piutang' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>Piutang</span>
              </button>
              <button
                onClick={() => setFilterType('hutang')}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'hutang' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Hutang</span>
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Status: Semua
              </button>
              <button
                onClick={() => setFilterStatus('belum_lunas')}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  filterStatus === 'belum_lunas' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Belum Lunas
              </button>
              <button
                onClick={() => setFilterStatus('lunas')}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  filterStatus === 'lunas' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Lunas
              </button>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-teal-600" />
              <span>Daftar Riwayat Transaksi & Pembayaran ({displayedTransactions.length})</span>
            </h4>

            {displayedTransactions.length === 0 ? (
              <div className="text-xs text-slate-400 py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Tidak ada transaksi yang cocok dengan filter.
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
                      <div className="p-4 sm:p-4.5 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                              <span>ID: {item.id}</span>
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

                          <div className="flex items-center gap-1.5">
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
                                className="text-[11px] text-teal-700 hover:underline cursor-pointer"
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

                                  <button
                                    onClick={() => {
                                      if (confirm(`Hapus catatan pembayaran ini senilai ${formatRupiah(p.amount)}?`)) {
                                        onDeletePayment(item.id, p.id);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hapus pembayaran ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Semua perubahan transaksi otomatis tersinkronisasi ke Firebase Cloud.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
