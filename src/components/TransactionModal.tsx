import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  User, 
  Phone, 
  Settings2,
  Users,
  UserPlus
} from 'lucide-react';
import { DebtTransaction, TransactionType, CustomCategoryItem } from '../types';
import { formatNumberInput, parseNumberInput, formatRupiah } from '../utils/formatters';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { CalculatorAmountInput } from './CalculatorAmountInput';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<DebtTransaction, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  initialData?: DebtTransaction | null;
  defaultType?: TransactionType;
  prefilledContactName?: string;
  prefilledContactPhone?: string;
  categories: CustomCategoryItem[];
  transactions?: DebtTransaction[];
  onOpenCategoryManager: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = 'piutang',
  prefilledContactName = '',
  prefilledContactPhone = '',
  categories,
  transactions = [],
  onOpenCategoryManager,
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [category, setCategory] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Compute unique list of existing customers sorted alphabetically
  const existingCustomers = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach(t => {
      const name = t.contactName?.trim();
      if (name) {
        const lower = name.toLowerCase();
        if (!map.has(lower) || (!map.get(lower) && t.contactPhone)) {
          map.set(lower, t.contactPhone?.trim() || '');
        }
      }
    });

    const list: { name: string; phone: string }[] = [];
    const seen = new Set<string>();
    transactions.forEach(t => {
      const name = t.contactName?.trim();
      if (name) {
        const lower = name.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          list.push({
            name,
            phone: map.get(lower) || ''
          });
        }
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  useEffect(() => {
    if (isOpen) {
      const defaultCategoryName = categories.length > 0 ? categories[0].name : 'Bisnis / Usaha';

      if (initialData) {
        setType(initialData.type);
        setContactName(initialData.contactName);
        setContactPhone(initialData.contactPhone || '');
        setCategory(initialData.category || defaultCategoryName);
        setAmountStr(formatNumberInput(initialData.amount));
        setTransactionDate(initialData.transactionDate);
        setNotes(initialData.notes || '');
        
        // Determine mode for initialData
        const isKnown = existingCustomers.some(c => c.name.toLowerCase() === initialData.contactName.toLowerCase());
        setCustomerMode(isKnown ? 'existing' : 'new');
      } else {
        const today = new Date().toISOString().slice(0, 10);
        setType(defaultType);
        setCategory(defaultCategoryName);
        setAmountStr('');
        setTransactionDate(today);
        setNotes('');

        if (prefilledContactName) {
          setContactName(prefilledContactName);
          setContactPhone(prefilledContactPhone || '');
          const isKnown = existingCustomers.some(c => c.name.toLowerCase() === prefilledContactName.toLowerCase());
          setCustomerMode(isKnown ? 'existing' : 'new');
        } else if (existingCustomers.length > 0) {
          setCustomerMode('existing');
          setContactName(existingCustomers[0].name);
          setContactPhone(existingCustomers[0].phone || '');
        } else {
          setCustomerMode('new');
          setContactName('');
          setContactPhone('');
        }
      }
      setErrors({});
    }
  }, [isOpen, initialData, defaultType, prefilledContactName, prefilledContactPhone, categories, existingCustomers]);

  if (!isOpen) return null;

  const handleSelectExistingCustomer = (selectedName: string) => {
    if (selectedName === '__NEW__') {
      setCustomerMode('new');
      setContactName('');
      setContactPhone('');
      return;
    }

    setContactName(selectedName);
    const found = existingCustomers.find(c => c.name.toLowerCase() === selectedName.toLowerCase());
    if (found) {
      setContactPhone(found.phone || '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!contactName.trim()) {
      newErrors.contactName = 'Nama pihak/pelanggan wajib diisi atau dipilih';
    }

    const evaluated = evaluateMathExpression(amountStr);
    const numAmount = evaluated !== null && evaluated > 0 ? evaluated : parseNumberInput(amountStr);
    if (!numAmount || numAmount <= 0) {
      newErrors.amount = 'Nominal harus lebih dari Rp 0';
    }

    if (!transactionDate) {
      newErrors.transactionDate = 'Tanggal transaksi wajib diisi';
    }

    const finalCategory = category.trim() || (categories[0]?.name ?? 'Lainnya');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      id: initialData?.id,
      type,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      category: finalCategory,
      amount: numAmount,
      transactionDate,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {initialData ? 'Edit Catatan Transaksi' : type === 'piutang' ? 'Tambah Piutang Baru (Hak Tagih)' : 'Tambah Hutang Baru (Kewajiban)'}
            </h3>
            <p className="text-xs text-slate-500">
              {initialData ? 'Perbarui informasi transaksi & kategori' : 'Pilih pelanggan terdaftar atau input pelanggan baru'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('piutang')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  type === 'piutang'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Piutang (Hak Tagih)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('hutang')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  type === 'hutang'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs ring-1 ring-rose-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Hutang (Kewajiban)</span>
              </button>
            </div>
          </div>

          {/* Customer Selection: Existing Dropdown vs New Customer */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pelanggan / Pihak Transaksi
              </label>

              {/* Segmented Mode Toggle */}
              {existingCustomers.length > 0 && (
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('existing');
                      if (existingCustomers.length > 0 && !existingCustomers.some(c => c.name.toLowerCase() === contactName.toLowerCase())) {
                        setContactName(existingCustomers[0].name);
                        setContactPhone(existingCustomers[0].phone || '');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      customerMode === 'existing'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    <span>Pelanggan Terdaftar ({existingCustomers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('new');
                      setContactName('');
                      setContactPhone('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      customerMode === 'new'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                    <span>+ Pelanggan Baru</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mode 1: Pilih dari Pelanggan yang Sudah Ada */}
            {customerMode === 'existing' && existingCustomers.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Pelanggan dari Daftar <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={contactName}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                      errors.contactName ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  >
                    <option value="" disabled>-- Pilih Pelanggan Terdaftar --</option>
                    {existingCustomers.map((cust) => (
                      <option key={cust.name} value={cust.name}>
                        {cust.name} {cust.phone ? `• (${cust.phone})` : ''}
                      </option>
                    ))}
                    <option value="__NEW__">➕ + Input Pelanggan Baru...</option>
                  </select>
                  {errors.contactName && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.contactName}</p>
                  )}
                </div>

                {/* Auto-filled Phone (Editable) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="0812xxxxxxxx"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Input Pelanggan Baru */
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Pelanggan Baru <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Contoh: Budi Santoso"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          errors.contactName ? 'border-rose-400' : 'border-slate-300'
                        }`}
                      />
                    </div>
                    {errors.contactName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.contactName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. Telepon / WhatsApp (Opsional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="0812xxxxxxxx"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-teal-50/70 text-teal-800 p-2 rounded-xl border border-teal-100">
                  <UserPlus className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Pelanggan baru ini akan otomatis tersimpan ke Daftar Pelanggan & Dasbor.</span>
                </div>
              </div>
            )}
          </div>

          {/* Amount (Nominal) with Built-in Calculator */}
          <CalculatorAmountInput
            id="transaction-modal-amount-input"
            label="Nominal Transaksi (Rupiah)"
            required
            placeholder="0"
            value={amountStr}
            onChange={(val) => {
              setAmountStr(val);
              if (errors.amount) {
                setErrors(prev => ({ ...prev, amount: '' }));
              }
            }}
            error={errors.amount}
          />

          {/* Transaction Date (Date of Occurrence) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Terjadinya Transaksi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.transactionDate ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pilih tanggal saat transaksi hutang/piutang ini sebenarnya terjadi (digunakan untuk filter laporan & periode).
            </p>
            {errors.transactionDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.transactionDate}</p>
            )}
          </div>

          {/* Category Selector with Manager Link */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Kategori Transaksi
              </label>
              <button
                type="button"
                onClick={onOpenCategoryManager}
                className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Kelola Kategori</span>
              </button>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
              {categories.length === 0 && (
                <option value="Lainnya">Lainnya</option>
              )}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Keterangan / Deskripsi Transaksi
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: No. Faktur #INV-001, pelunasan bertahap, dsb."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors cursor-pointer"
            >
              {initialData ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

