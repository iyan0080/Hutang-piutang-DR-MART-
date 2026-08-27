import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Trash2, 
  History, 
  Layers, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { DebtTransaction, FilterOptions, CustomCategoryItem } from '../types';
import { formatRupiah, formatDate } from '../utils/formatters';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className }) => {
  if (!text) return null;
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.toLowerCase() === trimmedQuery.toLowerCase()) {
          return (
            <mark
              key={index}
              className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded-[2px] shadow-2xs"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};

interface TransactionListProps {
  transactions: DebtTransaction[];
  filters: FilterOptions;
  categories: CustomCategoryItem[];
  onFilterChange: (filters: FilterOptions) => void;
  onOpenAddModal: (preselectedType?: 'hutang' | 'piutang') => void;
  onOpenEditModal: (transaction: DebtTransaction) => void;
  onOpenPaymentModal: (transaction: DebtTransaction) => void;
  onOpenHistoryModal: (transaction: DebtTransaction) => void;
  onDeleteTransaction: (id: string, name: string) => void;
  onOpenExportModal: () => void;
  onOpenCategoryManager: () => void;
  onSelectCustomer?: (customerName: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  filters,
  categories,
  onFilterChange,
  onOpenAddModal,
  onOpenEditModal,
  onOpenPaymentModal,
  onOpenHistoryModal,
  onDeleteTransaction,
  onOpenExportModal,
  onOpenCategoryManager,
  onSelectCustomer,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(item => {
      // 1. Type filter (Semua / Piutang / Hutang)
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // 2. Status filter
      const isPaid = item.status === 'lunas';
      if (filters.status === 'lunas' && !isPaid) return false;
      if (filters.status === 'belum_lunas' && item.status !== 'belum_lunas') return false;
      if (filters.status === 'sebagian' && item.status !== 'sebagian') return false;

      // 3. Category filter
      if (filters.category && filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }

      // 4. Date range filter (based on transactionDate)
      if (filters.startDate && item.transactionDate < filters.startDate) return false;
      if (filters.endDate && item.transactionDate > filters.endDate) return false;

      // 5. Amount range filter (Nominal range)
      if (filters.minAmount !== undefined && filters.minAmount > 0 && item.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount !== undefined && filters.maxAmount > 0 && item.amount > filters.maxAmount) {
        return false;
      }

      // 6. Advanced keyword search (Contact name, phone, notes/description, category)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchName = item.contactName.toLowerCase().includes(query);
        const matchNotes = item.notes ? item.notes.toLowerCase().includes(query) : false;
        const matchPhone = item.contactPhone ? item.contactPhone.toLowerCase().includes(query) : false;
        const matchCat = item.category.toLowerCase().includes(query);

        if (!matchName && !matchNotes && !matchPhone && !matchCat) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'transactionDate') {
        comparison = new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      } else if (filters.sortBy === 'amount') {
        comparison = b.amount - a.amount;
      } else if (filters.sortBy === 'remainingAmount') {
        comparison = b.remainingAmount - a.remainingAmount;
      } else if (filters.sortBy === 'contactName') {
        comparison = a.contactName.localeCompare(b.contactName);
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, filters]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.minAmount || filters.maxAmount) count++;
    if (filters.search.trim()) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    onFilterChange({
      type: 'all',
      status: 'all',
      category: 'all',
      search: '',
      startDate: undefined,
      endDate: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      sortBy: 'transactionDate',
      sortOrder: 'desc'
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
        
        {/* Top bar: Title & Quick action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Daftar Catatan Hutang & Piutang
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Menampilkan {filteredTransactions.length} dari {transactions.length} total transaksi</span>
              {filters.search.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                  Sorotan pencarian: "{filters.search}"
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer w-full sm:w-auto"
              title="Export hasil filter ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export XLSX</span>
            </button>
          </div>
        </div>

        {/* Primary Tab Filters: Semua / Piutang / Hutang */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          
          {/* Main Segment Filter */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => onFilterChange({ ...filters, type: 'all' })}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.type === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, type: 'piutang' })}
              className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.type === 'piutang'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Piutang (Hak Tagih)</span>
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, type: 'hutang' })}
              className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.type === 'hutang'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Hutang (Kewajiban)</span>
            </button>
          </div>

          {/* Quick status chips */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => onFilterChange({ ...filters, status: 'all' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filters.status === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Status: Semua
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, status: 'belum_lunas' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filters.status === 'belum_lunas'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Belum Lunas
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, status: 'sebagian' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filters.status === 'sebagian'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Cicilan
            </button>
            <button
              onClick={() => onFilterChange({ ...filters, status: 'lunas' })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                filters.status === 'lunas'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Lunas
            </button>
          </div>

        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2">
          
          {/* Search box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama orang, no. HP, atau catatan..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="sm:col-span-2 flex items-center">
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [any, any];
                onFilterChange({ ...filters, sortBy, sortOrder });
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="transactionDate-desc">Transaksi Terbaru</option>
              <option value="transactionDate-asc">Transaksi Terlama</option>
              <option value="remainingAmount-desc">Sisa Tagihan Terbesar</option>
              <option value="amount-desc">Nominal Awal Terbesar</option>
              <option value="contactName-asc">Nama Kontak (A-Z)</option>
            </select>
          </div>

          {/* Advanced Filters Toggle Button */}
          <div className="sm:col-span-2 flex items-center">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                showAdvancedFilters || (filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount)
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Tanggal/Nominal</span>
              {showAdvancedFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

        </div>

        {/* Expandable Advanced Filter Panel (Date Range & Amount Range) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-4 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Dari Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || undefined })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Sampai Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || undefined })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Min Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nominal Min (Rp)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount ?? ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    minAmount: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Max Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nominal Max (Rp)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 10000000"
                  value={filters.maxAmount ?? ''}
                  onChange={(e) => onFilterChange({ 
                    ...filters, 
                    maxAmount: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Reset All Filters button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-xs text-slate-500">
                {activeFiltersCount > 0 ? `${activeFiltersCount} filter diterapkan` : 'Belum ada filter khusus'}
              </span>
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Transaction Table */}
      {filteredTransactions.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tidak ada transaksi ditemukan</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
            Coba sesuaikan kata kunci pencarian, rentang tanggal/jumlah, atau kategori.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Tipe & Kontak</th>
                <th className="py-3 px-4">Kategori & Keterangan</th>
                <th className="py-3 px-4 text-right">Nominal Awal</th>
                <th className="py-3 px-4 text-right">Terbayar</th>
                <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                <th className="py-3 px-4">Tgl Transaksi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredTransactions.map(item => {
                const isPaid = item.status === 'lunas';
                const isPiutang = item.type === 'piutang';

                return (
                  <tr 
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    
                    {/* Column 1: Type & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start space-x-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isPiutang 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPiutang ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {onSelectCustomer ? (
                              <button
                                onClick={() => onSelectCustomer(item.contactName)}
                                className="text-left font-bold text-slate-900 hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                                title={`Lihat riwayat lengkap transaksi ${item.contactName}`}
                              >
                                <HighlightText text={item.contactName} query={filters.search} />
                              </button>
                            ) : (
                              <span>
                                <HighlightText text={item.contactName} query={filters.search} />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className={`font-semibold ${isPiutang ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isPiutang ? 'Piutang (Hak Tagih)' : 'Hutang (Kewajiban)'}
                            </span>
                            {item.contactPhone && (
                              <span className="text-slate-400">
                                • <HighlightText text={item.contactPhone} query={filters.search} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Category & Notes */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="mb-1">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                          <HighlightText text={item.category} query={filters.search} />
                        </span>
                      </div>
                      {item.notes ? (
                        <p className="text-xs text-slate-500 truncate" title={item.notes}>
                          <HighlightText text={item.notes} query={filters.search} />
                        </p>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Column 3: Nominal Awal */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-medium text-slate-800">
                        {formatRupiah(item.amount)}
                      </div>
                    </td>

                    {/* Column 4: Terbayar */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="text-emerald-700 font-semibold">
                        {formatRupiah(item.paidAmount)}
                      </div>
                    </td>

                    {/* Column 5: Sisa Tagihan */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-bold ${
                        isPaid ? 'text-emerald-600' : isPiutang ? 'text-emerald-800' : 'text-rose-800'
                      }`}>
                        {formatRupiah(item.remainingAmount)}
                      </div>
                    </td>

                    {/* Column 6: Tanggal Transaksi */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700">
                        {formatDate(item.transactionDate)}
                      </div>
                    </td>

                    {/* Column 7: Status */}
                    <td className="py-3.5 px-4 text-center">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Lunas
                        </span>
                      ) : item.status === 'sebagian' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          Cicilan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Belum Bayar
                        </span>
                      )}
                    </td>

                    {/* Column 8: Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Record Payment Button */}
                        {!isPaid && (
                          <button
                            onClick={() => onOpenPaymentModal(item)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                              isPiutang
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                            title={isPiutang ? 'Catat Penerimaan Uang' : 'Catat Pembayaran Hutang'}
                          >
                            {isPiutang ? '+ Terima' : '+ Bayar'}
                          </button>
                        )}

                        {/* Installment History button */}
                        <button
                          onClick={() => onOpenHistoryModal(item)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer relative"
                          title="Lihat Riwayat Cicilan & Detail"
                        >
                          <History className="w-4 h-4" />
                          {item.payments.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {item.payments.length}
                            </span>
                          )}
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => onOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Transaksi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => onDeleteTransaction(item.id, item.contactName)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
