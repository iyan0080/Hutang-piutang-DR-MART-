import React from 'react';
import { 
  Users, 
  CreditCard, 
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Layers,
  Settings2,
  FolderPlus
} from 'lucide-react';
import { DebtTransaction, AUTHORIZED_TEAM_MEMBERS, ActiveTab, CustomCategoryItem } from '../types';
import { formatRupiah, formatDate } from '../utils/formatters';
import { CustomerDirectory } from './CustomerDirectory';

interface DashboardSummaryProps {
  transactions: DebtTransaction[];
  categories: CustomCategoryItem[];
  onOpenCategoryManager: () => void;
  onOpenAddModal: (type: 'hutang' | 'piutang') => void;
  onSelectFilter: (type: 'all' | 'hutang' | 'piutang', status?: 'all' | 'belum_lunas' | 'sebagian' | 'lunas', category?: string) => void;
  onOpenPaymentModal: (transaction: DebtTransaction) => void;
  onOpenExportModal: () => void;
  onSelectCustomer: (customerName: string) => void;
  onAddNewForCustomer: (customerName: string, defaultType?: 'hutang' | 'piutang', phone?: string) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  transactions,
  categories,
  onOpenCategoryManager,
  onOpenAddModal,
  onSelectFilter,
  onOpenPaymentModal,
  onOpenExportModal,
  onSelectCustomer,
  onAddNewForCustomer,
  onNavigateToTab
}) => {
  // Category statistics
  const categoryStats = React.useMemo(() => {
    return categories.map(cat => {
      const catTransactions = transactions.filter(t => t.category === cat.name);
      const totalTransactions = catTransactions.length;
      const totalPiutang = catTransactions
        .filter(t => t.type === 'piutang')
        .reduce((sum, t) => sum + t.remainingAmount, 0);
      const totalHutang = catTransactions
        .filter(t => t.type === 'hutang')
        .reduce((sum, t) => sum + t.remainingAmount, 0);
      
      return {
        id: cat.id,
        name: cat.name,
        count: totalTransactions,
        totalPiutang,
        totalHutang
      };
    });
  }, [categories, transactions]);

  // Top unpaid receivables (Piutang)
  const topPiutang = transactions
    .filter(t => t.type === 'piutang' && t.remainingAmount > 0)
    .sort((a, b) => b.remainingAmount - a.remainingAmount)
    .slice(0, 4);

  // Top unpaid payables (Hutang)
  const topHutang = transactions
    .filter(t => t.type === 'hutang' && t.remainingAmount > 0)
    .sort((a, b) => b.remainingAmount - a.remainingAmount)
    .slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Top Quick Actions: Tambah Piutang & Tambah Hutang */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Pencatatan Transaksi Cepat
            </h3>
            <p className="text-xs text-slate-500">
              Pilih jenis transaksi yang ingin ditambahkan ke buku catatan
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center w-full sm:w-auto">
            {/* Tombol Tambah Piutang */}
            <button
              id="btn-tambah-piutang-dashboard"
              onClick={() => onOpenAddModal('piutang')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
            >
              <div className="p-0.5 bg-emerald-700/60 rounded-md">
                <ArrowDownLeft className="w-4 h-4 text-emerald-100" />
              </div>
              <span>+ Tambah Piutang</span>
            </button>

            {/* Tombol Tambah Hutang */}
            <button
              id="btn-tambah-hutang-dashboard"
              onClick={() => onOpenAddModal('hutang')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
            >
              <div className="p-0.5 bg-rose-700/60 rounded-md">
                <ArrowUpRight className="w-4 h-4 text-rose-100" />
              </div>
              <span>+ Tambah Hutang</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Section: DAFTAR PELANGGAN PADA DASBOR */}
      <section aria-label="Daftar Pelanggan">
        <CustomerDirectory
          transactions={transactions}
          onSelectCustomer={onSelectCustomer}
          onAddNewForCustomer={onAddNewForCustomer}
        />
      </section>

      {/* 2-Column Section: Top Piutang & Top Hutang */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Piutang List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Daftar Piutang Prioritas Tertinggi</span>
            </h4>
            <button 
              onClick={() => {
                onNavigateToTab('transactions');
                onSelectFilter('piutang', 'belum_lunas');
              }}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          {topPiutang.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl">
              Semua piutang telah lunas.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topPiutang.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-200 transition-colors"
                >
                  <div 
                    onClick={() => onSelectCustomer(item.contactName)}
                    className="min-w-0 pr-2 cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-slate-900 group-hover:text-teal-700 truncate transition-colors">
                      {item.contactName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span>{item.category} • Tgl: {formatDate(item.transactionDate)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-700">
                      {formatRupiah(item.remainingAmount)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 justify-end">
                      <button
                        onClick={() => onSelectCustomer(item.contactName)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                      >
                        Riwayat
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => onOpenPaymentModal(item)}
                        className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold underline cursor-pointer"
                      >
                        Terima Bayar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Hutang List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-600" />
              <span>Daftar Hutang Prioritas Pembayaran</span>
            </h4>
            <button 
              onClick={() => {
                onNavigateToTab('transactions');
                onSelectFilter('hutang', 'belum_lunas');
              }}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          {topHutang.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-xl">
              Tidak ada kewajiban hutang yang belum dibayar.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topHutang.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-rose-50/40 border border-slate-100 hover:border-rose-200 transition-colors"
                >
                  <div 
                    onClick={() => onSelectCustomer(item.contactName)}
                    className="min-w-0 pr-2 cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700 truncate transition-colors">
                      {item.contactName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span>{item.category} • Tgl: {formatDate(item.transactionDate)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-rose-700">
                      {formatRupiah(item.remainingAmount)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 justify-end">
                      <button
                        onClick={() => onSelectCustomer(item.contactName)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                      >
                        Riwayat
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => onOpenPaymentModal(item)}
                        className="text-[11px] text-rose-700 hover:text-rose-800 font-semibold underline cursor-pointer"
                      >
                        Bayar Cicilan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Section Kategori Transaksi di Dasbor */}
      <section aria-label="Kategori Transaksi" className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              <span>Kategori Transaksi & Klasifikasi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola kategori bisnis atau klik salah satu kategori untuk melihat daftar transaksi terkait
            </p>
          </div>

          <button
            id="btn-kelola-kategori-dasbor"
            onClick={onOpenCategoryManager}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/80 transition-colors cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-teal-600" />
            <span>Kelola / Tambah Kategori</span>
          </button>
        </div>

        {/* Grid Kartu Kategori */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {categoryStats.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                onNavigateToTab('transactions');
                onSelectFilter('all', 'all', cat.name);
              }}
              className="group p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-teal-50/40 hover:border-teal-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-teal-900 truncate">
                  {cat.name}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/80 group-hover:bg-teal-100 text-slate-700 group-hover:text-teal-800 transition-colors shrink-0">
                  {cat.count} transaksi
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <div>
                  <div className="text-slate-400 text-[10px]">Piutang</div>
                  <div className="font-semibold text-emerald-700">{formatRupiah(cat.totalPiutang)}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px]">Hutang</div>
                  <div className="font-semibold text-rose-700">{formatRupiah(cat.totalHutang)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Access & Operational Credentials Information Card */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Tim Pengelola & Otoritas Akun</span>
              </h4>
              <p className="text-xs text-slate-400">
                Akses terpadu real-time multi-perangkat (HP/PC) via Cloud Firebase
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
