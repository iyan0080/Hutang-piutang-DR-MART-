import React, { useState, useRef, useEffect } from 'react';
import { 
  PlusCircle, 
  FileSpreadsheet, 
  RotateCcw, 
  Download, 
  Upload, 
  Trash2, 
  MoreVertical,
  Scale,
  Settings2,
  LayoutDashboard,
  Receipt,
  PieChart,
  Users,
  User,
  KeyRound,
  LogOut,
  UserPlus,
  LogIn,
  ShieldCheck
} from 'lucide-react';
import { DebtTransaction, SummaryMetrics, ActiveTab, UserProfile } from '../types';
import { formatRupiah } from '../utils/formatters';

interface NavbarProps {
  metrics: SummaryMetrics;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenCategoryManager: () => void;
  onResetData: () => void;
  onClearAll: () => void;
  onImportData: (data: DebtTransaction[]) => void;
  transactions: DebtTransaction[];
  isCloudSynced: boolean;
  currentUser: UserProfile | null;
  onOpenAuthModal: (mode?: 'login' | 'register' | 'change_password') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  metrics,
  activeTab,
  onTabChange,
  onOpenAddModal,
  onOpenExportModal,
  onOpenCategoryManager,
  onResetData,
  onClearAll,
  onImportData,
  transactions,
  isCloudSynced,
  currentUser,
  onOpenAuthModal,
  onLogout
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBackupJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `backup_hutang_piutang_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportData(parsed);
          alert('Data berhasil diimpor dan disinkronkan ke Firebase Cloud!');
        } else {
          alert('Format data JSON tidak valid.');
        }
      } catch {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowMenu(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Navbar Row */}
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white font-bold text-xl ring-2 ring-emerald-400/30 shrink-0">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-50">
                  Buku Hutang Piutang
                </h1>
                {/* Cloud Sync Status Indicator Badge */}
                <span 
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                    isCloudSynced 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                  title={isCloudSynced ? 'Firebase Realtime Cloud Aktif (Sinkron HP & PC)' : 'Menghubungkan ke Cloud...'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="hidden sm:inline">{isCloudSynced ? 'Cloud Real-time' : 'Menghubungkan...'}</span>
                  <span className="sm:hidden">{isCloudSynced ? 'Cloud' : '...'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Sinkronisasi Multi-Perangkat (HP & PC) • Pelanggan & Rekapitulasi
              </p>
            </div>
          </div>

          {/* Quick Net Ticker (Desktop) */}
          <div className="hidden xl:flex items-center space-x-4 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Posisi Bersih (Net)</div>
              <div className={`text-sm font-bold ${metrics.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.netBalance >= 0 ? '+' : ''}{formatRupiah(metrics.netBalance)}
              </div>
            </div>
            <div className="h-7 w-px bg-slate-700"></div>
            <div className="text-xs text-slate-300">
              <div><span className="text-emerald-400 font-semibold">Piutang:</span> {formatRupiah(metrics.sisaPiutang)}</div>
              <div><span className="text-rose-400 font-semibold">Hutang:</span> {formatRupiah(metrics.sisaHutang)}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Category Manager */}
            <button
              onClick={onOpenCategoryManager}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Kelola Kategori"
            >
              <Settings2 className="w-4 h-4 text-teal-400" />
              <span>Kategori</span>
            </button>

            {/* Export Excel Button in Header */}
            <button
              onClick={onOpenExportModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors cursor-pointer"
              title="Export ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export XLSX</span>
            </button>

            {/* User Account / Auth Dropdown */}
            <div className="relative" ref={userMenuRef}>
              {currentUser ? (
                <button
                  id="btn-user-profile-menu"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs text-slate-200 transition-all cursor-pointer"
                  title="Menu Akun & Kata Sandi"
                >
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40 flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold leading-tight truncate max-w-[120px]">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] text-teal-400 font-mono">
                      {currentUser.role}
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  id="btn-login-header"
                  onClick={() => onOpenAuthModal('login')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {showUserMenu && currentUser && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 text-xs text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-700/70">
                    <div className="font-bold text-white text-sm truncate">{currentUser.displayName}</div>
                    <div className="text-slate-400 font-mono text-[11px] truncate">{currentUser.email}</div>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-400/30">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Hak Akses: {currentUser.role}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onOpenAuthModal('change_password');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Ganti Password</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenAuthModal('register');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-4 h-4 text-teal-400" />
                      <span>Pendaftaran Akun Baru</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenAuthModal('login');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                    >
                      <LogIn className="w-4 h-4 text-blue-400" />
                      <span>Ganti Akun / Masuk Lainnya</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-700/70 pt-1">
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-rose-950/50 flex items-center gap-2.5 text-rose-400 cursor-pointer transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* More Settings Menu */}
            <div className="relative" ref={menuRef}>
              <button
                id="btn-more-options"
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600 cursor-pointer"
                title="Opsi & Cadangan Data"
                aria-label="Menu Opsi"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 text-sm text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Manajemen Cloud & Data
                  </div>

                  <button
                    onClick={() => {
                      onOpenCategoryManager();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                  >
                    <Settings2 className="w-4 h-4 text-teal-400" />
                    <span>Kelola Kategori</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenAuthModal('change_password');
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Ganti Password</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenAuthModal('register');
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-teal-400" />
                    <span>Pendaftaran Akun Baru</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenExportModal();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Export Excel (.XLSX)</span>
                  </button>

                  <button
                    onClick={handleBackupJSON}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4 text-teal-400" />
                    <span>Backup Data (JSON)</span>
                  </button>

                  <label className="w-full text-left px-3.5 py-2 hover:bg-slate-700 flex items-center gap-2.5 text-slate-200 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Import Backup (JSON)</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => {
                      if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data transaksi dan pelanggan di Firebase Cloud? Tindakan ini tidak dapat dibatalkan.')) {
                        onClearAll();
                        setShowMenu(false);
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-950/60 flex items-center gap-2.5 text-rose-400 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Semua Data Transaksi</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Tab Navigation Row */}
        <div className="flex items-center space-x-1 sm:space-x-2 border-t border-slate-800/80 py-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dasbor & Pelanggan</span>
          </button>

          <button
            onClick={() => onTabChange('transactions')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Buku Transaksi</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
              activeTab === 'transactions' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => onTabChange('reports')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Laporan & Rekapitulasi</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Khusus
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};

