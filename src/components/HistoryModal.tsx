import React from 'react';
import { X, History, ArrowDownLeft, ArrowUpRight, Calendar, User, Phone, CheckCircle2, Clock, Trash2, PlusCircle } from 'lucide-react';
import { DebtTransaction, PaymentRecord } from '../types';
import { formatRupiah, formatDate, formatDateTime } from '../utils/formatters';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: DebtTransaction | null;
  onOpenPaymentModal: (transaction: DebtTransaction) => void;
  onDeletePayment: (transactionId: string, paymentId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onOpenPaymentModal,
  onDeletePayment,
}) => {
  if (!isOpen || !transaction) return null;

  const isPiutang = transaction.type === 'piutang';
  const isPaid = transaction.status === 'lunas';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl text-white ${isPiutang ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {isPiutang ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Detail Transaksi & Riwayat Pembayaran
              </h3>
              <p className="text-xs text-slate-500">
                ID Transaksi: {transaction.id}
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
          
          {/* Main Info Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block">Pihak Terkait:</span>
                <span className="font-bold text-slate-900 text-sm">{transaction.contactName}</span>
                {transaction.contactPhone && (
                  <span className="text-slate-500 block">{transaction.contactPhone}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Tipe & Kategori:</span>
                <span className={`font-bold text-xs ${isPiutang ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPiutang ? 'Piutang (Hak Tagih)' : 'Hutang (Kewajiban)'}
                </span>
                <span className="text-slate-600 block">{transaction.category}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-500 block">Nominal Awal</span>
                <span className="font-bold text-slate-900">{formatRupiah(transaction.amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Terbayar</span>
                <span className="font-bold text-emerald-700">{formatRupiah(transaction.paidAmount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sisa Tagihan</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-700' : isPiutang ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {formatRupiah(transaction.remainingAmount)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-slate-500">Tgl Transaksi:</span>{' '}
                <span className="font-semibold text-slate-800">{formatDate(transaction.transactionDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>{' '}
                <span className={`font-semibold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isPaid ? 'Lunas' : transaction.status === 'sebagian' ? 'Cicilan' : 'Belum Bayar'}
                </span>
              </div>
            </div>

            {transaction.notes && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-slate-500 block">Catatan:</span>
                <span className="text-slate-700">{transaction.notes}</span>
              </div>
            )}
          </div>

          {/* Payment Logs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Catatan Pelunasan / Cicilan ({transaction.payments.length})
              </h4>
              
              {!isPaid && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenPaymentModal(transaction);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Catat Bayar</span>
                </button>
              )}
            </div>

            {transaction.payments.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada transaksi pembayaran atau cicilan yang dicatat.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {transaction.payments.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 transition-colors text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{formatRupiah(p.amount)}</span>
                        <span className="text-[10px] font-normal text-slate-400">#{index + 1}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span>Tanggal Bayar: {formatDate(p.date)}</span>
                        {p.note && <span className="ml-1.5">• {p.note}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tercatat pada: {formatDateTime(p.recordedAt)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Hapus catatan pembayaran ini senilai ${formatRupiah(p.amount)}?`)) {
                          onDeletePayment(transaction.id, p.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Batalkan pembayaran ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
