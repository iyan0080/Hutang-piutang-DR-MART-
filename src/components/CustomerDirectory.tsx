import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  MessageCircle, 
  History, 
  PlusCircle, 
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  Clock,
  Phone,
  LayoutGrid,
  List
} from 'lucide-react';
import { DebtTransaction, CustomerSummary } from '../types';
import { getCustomerSummaries, formatWhatsAppUrl } from '../utils/customerHelper';
import { formatRupiah, formatDate } from '../utils/formatters';

interface CustomerDirectoryProps {
  transactions: DebtTransaction[];
  onSelectCustomer: (customerName: string) => void;
  onAddNewForCustomer: (customerName: string, defaultType?: 'hutang' | 'piutang', phone?: string) => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  transactions,
  onSelectCustomer,
  onAddNewForCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'piutang_aktif' | 'hutang_aktif' | 'lunas'>('all');
  const [sortBy, setSortBy] = useState<'sisaPiutang' | 'sisaHutang' | 'transactions' | 'lastDate' | 'name'>('sisaPiutang');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Compute customer summaries
  const customerSummaries = useMemo(() => {
    return getCustomerSummaries(transactions);
  }, [transactions]);

  // Filter and sort customer list
  const filteredCustomers = useMemo(() => {
    return customerSummaries.filter(c => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = c.contactName.toLowerCase().includes(query);
        const matchPhone = c.contactPhone ? c.contactPhone.toLowerCase().includes(query) : false;
        if (!matchName && !matchPhone) return false;
      }

      // Status filter
      if (statusFilter === 'piutang_aktif' && c.sisaPiutang <= 0) return false;
      if (statusFilter === 'hutang_aktif' && c.sisaHutang <= 0) return false;
      if (statusFilter === 'lunas' && (c.sisaPiutang > 0 || c.sisaHutang > 0)) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'sisaPiutang') return b.sisaPiutang - a.sisaPiutang;
      if (sortBy === 'sisaHutang') return b.sisaHutang - a.sisaHutang;
      if (sortBy === 'transactions') return b.transactionCount - a.transactionCount;
      if (sortBy === 'lastDate') return new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime();
      if (sortBy === 'name') return a.contactName.localeCompare(b.contactName);
      return 0;
    });
  }, [customerSummaries, search, statusFilter, sortBy]);

  // Quick stats
  const totalCustomers = customerSummaries.length;
  const customersWithPiutang = customerSummaries.filter(c => c.sisaPiutang > 0).length;
  const customersWithHutang = customerSummaries.filter(c => c.sisaHutang > 0).length;
  const customersLunas = customerSummaries.filter(c => c.sisaPiutang === 0 && c.sisaHutang === 0).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              <span>Daftar Pelanggan & Kontak Terdaftar</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Klik nama pelanggan untuk membuka riwayat transaksi lengkap dan mutasi pembayaran
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua Pelanggan ({totalCustomers})
          </button>
          <button
            onClick={() => setStatusFilter('piutang_aktif')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === 'piutang_aktif'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Ada Tagihan Piutang ({customersWithPiutang})</span>
          </button>
          <button
            onClick={() => setStatusFilter('hutang_aktif')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === 'hutang_aktif'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Ada Kewajiban Hutang ({customersWithHutang})</span>
          </button>
          <button
            onClick={() => setStatusFilter('lunas')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              statusFilter === 'lunas'
                ? 'bg-teal-700 text-white border-teal-700'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lunas / Bebas Tagihan ({customersLunas})</span>
          </button>
        </div>

        {/* Search & Sort Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pelanggan berdasarkan nama atau nomor telepon / WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="sisaPiutang">Urutkan: Sisa Piutang Terbesar</option>
              <option value="sisaHutang">Urutkan: Sisa Hutang Terbesar</option>
              <option value="transactions">Urutkan: Transaksi Terbanyak</option>
              <option value="lastDate">Urutkan: Transaksi Terakhir</option>
              <option value="name">Urutkan: Nama Pelanggan (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Content */}
      {filteredCustomers.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">Tidak ada data pelanggan yang cocok</h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1">
            Coba sesuaikan kata kunci pencarian atau ganti filter status di atas.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const hasPiutang = customer.sisaPiutang > 0;
            const hasHutang = customer.sisaHutang > 0;
            const isAllPaid = !hasPiutang && !hasHutang;
            const waUrl = formatWhatsAppUrl(customer.contactPhone, customer.contactName, customer.sisaPiutang);

            return (
              <div
                key={customer.contactName}
                className="group relative bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-teal-300 p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                {/* Top: Avatar & Name */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      onClick={() => onSelectCustomer(customer.contactName)}
                      className="flex items-center space-x-3 cursor-pointer min-w-0"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                        hasPiutang ? 'bg-emerald-600' : hasHutang ? 'bg-rose-600' : 'bg-slate-700'
                      }`}>
                        {customer.contactName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                          {customer.contactName}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          {customer.contactPhone ? (
                            <span className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {customer.contactPhone}
                            </span>
                          ) : (
                            <span>Tanpa No. HP</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                      isAllPaid
                        ? 'bg-slate-100 text-slate-700'
                        : hasPiutang && hasHutang
                        ? 'bg-amber-100 text-amber-800'
                        : hasPiutang
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isAllPaid ? 'Lunas' : hasPiutang && hasHutang ? 'Piutang & Hutang' : hasPiutang ? 'Hak Tagih' : 'Hutang'}
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/80">
                      <span className="text-[10px] text-emerald-700 font-medium block">Sisa Piutang</span>
                      <span className="font-bold text-emerald-900 text-xs sm:text-sm">
                        {formatRupiah(customer.sisaPiutang)}
                      </span>
                    </div>

                    <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100/80">
                      <span className="text-[10px] text-rose-700 font-medium block">Sisa Hutang</span>
                      <span className="font-bold text-rose-900 text-xs sm:text-sm">
                        {formatRupiah(customer.sisaHutang)}
                      </span>
                    </div>
                  </div>

                  {/* Meta stats */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{customer.transactionCount} transaksi ({customer.unpaidCount} aktif)</span>
                    <span>Tgl: {formatDate(customer.lastTransactionDate)}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => onSelectCustomer(customer.contactName)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Lihat Riwayat</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Kirim pesan WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onAddNewForCustomer(customer.contactName, 'piutang', customer.contactPhone)}
                      className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Tambah transaksi untuk kontak ini"
                    >
                      <PlusCircle className="w-4 h-4 text-teal-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Nama Pelanggan & Kontak</th>
                <th className="py-3 px-4 text-center">Jml Transaksi</th>
                <th className="py-3 px-4 text-right">Sisa Piutang</th>
                <th className="py-3 px-4 text-right">Sisa Hutang</th>
                <th className="py-3 px-4 text-right">Posisi Net</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredCustomers.map(customer => {
                const hasPiutang = customer.sisaPiutang > 0;
                const hasHutang = customer.sisaHutang > 0;
                const isAllPaid = !hasPiutang && !hasHutang;
                const waUrl = formatWhatsAppUrl(customer.contactPhone, customer.contactName, customer.sisaPiutang);

                return (
                  <tr 
                    key={customer.contactName}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div 
                        onClick={() => onSelectCustomer(customer.contactName)}
                        className="cursor-pointer group flex items-center space-x-2.5"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {customer.contactName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {customer.contactName}
                          </div>
                          {customer.contactPhone && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {customer.contactPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center text-slate-700">
                      <span className="font-semibold">{customer.transactionCount}</span>
                      <span className="text-[11px] text-slate-400 block">({customer.unpaidCount} aktif)</span>
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-emerald-800">
                      {formatRupiah(customer.sisaPiutang)}
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-rose-800">
                      {formatRupiah(customer.sisaHutang)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold">
                      <span className={customer.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {customer.netBalance >= 0 ? '+' : ''}{formatRupiah(customer.netBalance)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isAllPaid
                          ? 'bg-slate-100 text-slate-700'
                          : hasPiutang && hasHutang
                          ? 'bg-amber-100 text-amber-800'
                          : hasPiutang
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isAllPaid ? 'Lunas' : hasPiutang && hasHutang ? 'Piutang & Hutang' : hasPiutang ? 'Ada Piutang' : 'Ada Hutang'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectCustomer(customer.contactName)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          Riwayat
                        </button>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => onAddNewForCustomer(customer.contactName, 'piutang', customer.contactPhone)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Tambah transaksi"
                        >
                          <PlusCircle className="w-4 h-4 text-teal-600" />
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
