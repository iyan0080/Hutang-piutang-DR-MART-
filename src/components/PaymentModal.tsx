import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Calendar, FileText, Trash2, ArrowDownLeft, ArrowUpRight, History, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DebtTransaction, PaymentRecord } from '../types';
import { formatNumberInput, parseNumberInput, formatRupiah, formatDate, formatDateTime } from '../utils/formatters';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { CalculatorAmountInput } from './CalculatorAmountInput';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: DebtTransaction | null;
  onAddPayment: (transactionId: string, payment: Omit<PaymentRecord, 'id' | 'recordedAt'>) => void;
  onDeletePayment: (transactionId: string, paymentId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onAddPayment,
  onDeletePayment,
}) => {
  if (!isOpen || !transaction) return null;

  const [amountStr, setAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const isPiutang = transaction.type === 'piutang';
  const progressPercent = transaction.amount > 0 
    ? Math.min(100, Math.round((transaction.paidAmount / transaction.amount) * 100))
    : 0;

  const setQuickAmount = (ratio: number) => {
    const targetAmount = Math.round(transaction.remainingAmount * ratio);
    setAmountStr(formatNumberInput(targetAmount));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const evaluated = evaluateMathExpression(amountStr);
    const numAmount = evaluated !== null && evaluated > 0 ? evaluated : parseNumberInput(amountStr);

    if (!numAmount || numAmount <= 0) {
      setError('Nominal pembayaran harus lebih dari Rp 0');
      return;
    }

    if (numAmount > transaction.remainingAmount) {
      setError(`Nominal melebihi sisa tagihan (${formatRupiah(transaction.remainingAmount)})`);
      return;
    }

    // Trigger confetti if this payment fully settles the balance
    if (numAmount >= transaction.remainingAmount) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore if not supported
      }
    }

    onAddPayment(transaction.id, {
      date: paymentDate,
      amount: numAmount,
      note: note.trim() || (numAmount >= transaction.remainingAmount ? 'Pelunasan Penuh' : 'Cicilan Pembayaran'),
    });

    setAmountStr('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl text-white ${isPiutang ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {isPiutang ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isPiutang ? 'Catat Penerimaan Piutang' : 'Catat Pembayaran Hutang'}
              </h3>
              <p className="text-xs text-slate-500">
                Pihak Terkait: <span className="font-semibold text-slate-700">{transaction.contactName}</span>
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

        <div className="p-6 space-y-5">
          
          {/* Progress Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Transaksi Awal:</span>
              <span className="font-bold text-slate-800">{formatRupiah(transaction.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Telah Terbayar:</span>
              <span className="font-bold text-emerald-700">{formatRupiah(transaction.paidAmount)} ({progressPercent}%)</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-slate-200">
              <span className="text-slate-700">Sisa Tagihan Saat Ini:</span>
              <span className={`text-base ${isPiutang ? 'text-emerald-800' : 'text-rose-800'}`}>
                {formatRupiah(transaction.remainingAmount)}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${isPiutang ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Form Record Payment (if not already 100% paid) */}
          {transaction.remainingAmount > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {/* Quick percentage buttons */}
                    <button
                      type="button"
                      onClick={() => setQuickAmount(1)}
                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      Lunas 100%
                    </button>
                    {transaction.remainingAmount > 10000 && (
                      <button
                        type="button"
                        onClick={() => setQuickAmount(0.5)}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>

                <CalculatorAmountInput
                  id="payment-modal-amount-input"
                  label={`Nominal ${isPiutang ? 'Yang Diterima' : 'Yang Dibayarkan'} (Rp)`}
                  required
                  placeholder="0"
                  value={amountStr}
                  onChange={(val) => {
                    setAmountStr(val);
                    setError('');
                  }}
                  error={error}
                />
              </div>

              {/* Payment Date & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pembayaran
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Metode / Catatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Transfer BCA, Tunai"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-colors cursor-pointer ${
                  isPiutang
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                + Simpan Catatan Pembayaran
              </button>
            </form>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tagihan ini sudah berstatus LUNAS 100%.</span>
            </div>
          )}

          {/* Payment History List */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              Riwayat Cicilan ({transaction.payments.length})
            </h4>

            {transaction.payments.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
                Belum ada catatan cicilan yang masuk.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {transaction.payments.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {formatRupiah(p.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Tgl: {formatDate(p.date)}</span>
                        {p.note && <span>• {p.note}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus catatan pembayaran senilai ${formatRupiah(p.amount)}?`)) {
                          onDeletePayment(transaction.id, p.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Batalkan pembayaran ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
