import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DashboardSummary } from './components/DashboardSummary';
import { TransactionList } from './components/TransactionList';
import { ReportsView } from './components/ReportsView';
import { CustomerHistoryModal } from './components/CustomerHistoryModal';
import { TransactionModal } from './components/TransactionModal';
import { PaymentModal } from './components/PaymentModal';
import { HistoryModal } from './components/HistoryModal';
import { ExportModal } from './components/ExportModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { AuthModal, AuthViewMode } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { authService } from './lib/authService';
import { 
  DebtTransaction, 
  PaymentRecord, 
  FilterOptions, 
  TransactionType,
  CustomCategoryItem,
  DEFAULT_CATEGORIES,
  ActiveTab,
  UserProfile
} from './types';
import { 
  subscribeTransactions, 
  subscribeCategories, 
  saveTransactionToFirebase, 
  deleteTransactionFromFirebase, 
  resetFirebaseTransactions, 
  clearAllFirebaseTransactions, 
  importTransactionsToFirebase,
  initializeDefaultsIfEmpty 
} from './lib/firestoreService';
import { calculateMetrics } from './utils/storage';

export default function App() {
  // Navigation Tab ('dashboard' | 'transactions' | 'reports')
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Real-time State from Firebase Firestore
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [categories, setCategories] = useState<CustomCategoryItem[]>(() => 
    DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i+1}`, name }))
  );
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Authentication State (Mandatory login before accessing the app)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthViewMode>('login');
  
  // Advanced Filter state
  const [filters, setFilters] = useState<FilterOptions>({
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

  // Modal States
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<DebtTransaction | null>(null);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>('piutang');
  const [prefilledContactName, setPrefilledContactName] = useState<string>('');
  const [prefilledContactPhone, setPrefilledContactPhone] = useState<string>('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState<DebtTransaction | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTransaction, setHistoryTransaction] = useState<DebtTransaction | null>(null);

  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Initialize and subscribe to Auth and Firestore collections
  useEffect(() => {
    // Subscribe to Auth status
    const unsubscribeAuth = authService.subscribe((user) => {
      setCurrentUser(user);
      setIsAuthChecking(false);
    });

    // Purge local storage demo data if present
    try {
      const rawLocal = localStorage.getItem('buku_hutang_piutang_v1');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          const demoIds = ['TRX-101', 'TRX-102', 'TRX-103', 'TRX-104', 'TRX-105', 'TRX-106'];
          const cleaned = parsed.filter((t: any) => !demoIds.includes(t.id));
          localStorage.setItem('buku_hutang_piutang_v1', JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }

    // Seed defaults in Firestore if collections are empty
    initializeDefaultsIfEmpty();

    // Subscribe to transactions in real-time
    const unsubscribeTransactions = subscribeTransactions(
      (data) => {
        setTransactions(data);
        setIsCloudSynced(true);
      },
      (err) => {
        console.error('Transactions sync error:', err);
        setIsCloudSynced(false);
      }
    );

    // Subscribe to categories
    const unsubscribeCategories = subscribeCategories((catData) => {
      if (catData.length > 0) {
        setCategories(catData);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, []);

  // Reactive metrics
  const metrics = useMemo(() => calculateMetrics(transactions), [transactions]);

  // Filtered transactions calculation for export and count
  const filteredTransactions = useMemo(() => {
    return transactions.filter(item => {
      // 1. Type
      if (filters.type !== 'all' && item.type !== filters.type) return false;

      // 2. Status
      const isPaid = item.status === 'lunas';
      if (filters.status === 'lunas' && !isPaid) return false;
      if (filters.status === 'belum_lunas' && item.status !== 'belum_lunas') return false;
      if (filters.status === 'sebagian' && item.status !== 'sebagian') return false;

      // 3. Category
      if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;

      // 4. Date range
      if (filters.startDate && item.transactionDate < filters.startDate) return false;
      if (filters.endDate && item.transactionDate > filters.endDate) return false;

      // 5. Amount range
      if (filters.minAmount !== undefined && filters.minAmount > 0 && item.amount < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && filters.maxAmount > 0 && item.amount > filters.maxAmount) return false;

      // 6. Search keyword
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchName = item.contactName.toLowerCase().includes(query);
        const matchNotes = item.notes ? item.notes.toLowerCase().includes(query) : false;
        const matchPhone = item.contactPhone ? item.contactPhone.toLowerCase().includes(query) : false;
        const matchCat = item.category.toLowerCase().includes(query);
        if (!matchName && !matchNotes && !matchPhone && !matchCat) return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Handler: Add or Edit Transaction directly to Firebase
  const handleSaveTransaction = async (formData: Omit<DebtTransaction, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();

    if (formData.id) {
      // Editing existing transaction
      const existing = transactions.find(t => t.id === formData.id);
      const paid = existing ? existing.paidAmount : 0;
      const remaining = Math.max(0, formData.amount - paid);
      const status = remaining === 0 ? 'lunas' : paid > 0 ? 'sebagian' : 'belum_lunas';

      const updated: DebtTransaction = {
        id: formData.id,
        type: formData.type,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        category: formData.category,
        amount: formData.amount,
        paidAmount: paid,
        remainingAmount: remaining,
        transactionDate: formData.transactionDate,
        notes: formData.notes,
        status,
        payments: existing ? existing.payments : [],
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };

      await saveTransactionToFirebase(updated);
    } else {
      // Creating new transaction
      const newId = `TRX-${Date.now().toString().slice(-6)}`;
      const newTransaction: DebtTransaction = {
        id: newId,
        type: formData.type,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        category: formData.category,
        amount: formData.amount,
        paidAmount: 0,
        remainingAmount: formData.amount,
        transactionDate: formData.transactionDate,
        notes: formData.notes,
        status: 'belum_lunas',
        payments: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveTransactionToFirebase(newTransaction);
    }
  };

  // Handler: Delete Transaction from Firebase
  const handleDeleteTransaction = async (id: string, contactName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data transaksi dengan "${contactName}"?`)) {
      await deleteTransactionFromFirebase(id);
    }
  };

  // Handler: Add Payment / Installment
  const handleAddPayment = async (transactionId: string, paymentData: Omit<PaymentRecord, 'id' | 'recordedAt'>) => {
    const paymentId = `PAY-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const newRecord: PaymentRecord = {
      id: paymentId,
      date: paymentData.date,
      amount: paymentData.amount,
      note: paymentData.note,
      recordedAt: now,
    };

    const target = transactions.find(t => t.id === transactionId);
    if (!target) return;

    const newPayments = [...target.payments, newRecord];
    const newPaidAmount = target.paidAmount + paymentData.amount;
    const newRemaining = Math.max(0, target.amount - newPaidAmount);
    const newStatus = newRemaining === 0 ? 'lunas' : newPaidAmount > 0 ? 'sebagian' : 'belum_lunas';

    const updated: DebtTransaction = {
      ...target,
      paidAmount: newPaidAmount,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: newPayments,
      updatedAt: now,
    };

    // Update modal reference if active
    if (paymentTransaction?.id === transactionId) {
      setPaymentTransaction(updated);
    }
    if (historyTransaction?.id === transactionId) {
      setHistoryTransaction(updated);
    }

    await saveTransactionToFirebase(updated);
  };

  // Handler: Delete / Revert an Installment Payment
  const handleDeletePayment = async (transactionId: string, paymentId: string) => {
    const now = new Date().toISOString();
    const target = transactions.find(t => t.id === transactionId);
    if (!target) return;

    const targetPayment = target.payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const newPayments = target.payments.filter(p => p.id !== paymentId);
    const newPaidAmount = Math.max(0, target.paidAmount - targetPayment.amount);
    const newRemaining = Math.max(0, target.amount - newPaidAmount);
    const newStatus = newRemaining === 0 ? 'lunas' : newPaidAmount > 0 ? 'sebagian' : 'belum_lunas';

    const updated: DebtTransaction = {
      ...target,
      paidAmount: newPaidAmount,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: newPayments,
      updatedAt: now,
    };

    if (paymentTransaction?.id === transactionId) {
      setPaymentTransaction(updated);
    }
    if (historyTransaction?.id === transactionId) {
      setHistoryTransaction(updated);
    }

    await saveTransactionToFirebase(updated);
  };

  // Open modals helper
  const handleOpenAddModal = (
    preselectedType: TransactionType = 'piutang', 
    contactName: string = '', 
    contactPhone: string = ''
  ) => {
    setEditingTransaction(null);
    setDefaultTransactionType(preselectedType);
    setPrefilledContactName(contactName);
    setPrefilledContactPhone(contactPhone);
    setIsTransactionModalOpen(true);
  };

  const handleOpenEditModal = (item: DebtTransaction) => {
    setEditingTransaction(item);
    setPrefilledContactName('');
    setPrefilledContactPhone('');
    setIsTransactionModalOpen(true);
  };

  const handleOpenPaymentModal = (item: DebtTransaction) => {
    setPaymentTransaction(item);
    setIsPaymentModalOpen(true);
  };

  const handleOpenHistoryModal = (item: DebtTransaction) => {
    setHistoryTransaction(item);
    setIsHistoryModalOpen(true);
  };

  const handleSelectFilterFromDashboard = (
    type: 'all' | 'hutang' | 'piutang', 
    status: 'all' | 'belum_lunas' | 'sebagian' | 'lunas' = 'all',
    category: string = 'all'
  ) => {
    setFilters(prev => ({
      ...prev,
      type,
      status,
      category,
    }));
    setActiveTab('transactions');
  };

  const handleSelectCustomer = (customerName: string) => {
    setSelectedCustomerName(customerName);
  };

  const handleAddNewForCustomer = (customerName: string, defaultType: TransactionType = 'piutang', phone?: string) => {
    handleOpenAddModal(defaultType, customerName, phone || '');
  };

  const handleOpenAuthModal = (mode: AuthViewMode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  // Mandatory Authentication Gate: user must log in before accessing the app
  if (!currentUser) {
    return (
      <AuthGate
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950/5 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      
      {/* Top Navigation Bar with Page Tab Navigation */}
      <Navbar
        metrics={metrics}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        transactions={transactions}
        isCloudSynced={isCloudSynced}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
        onOpenAddModal={() => handleOpenAddModal('piutang')}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
        onResetData={resetFirebaseTransactions}
        onClearAll={clearAllFirebaseTransactions}
        onImportData={importTransactionsToFirebase}
      />

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Tab 1: DASBOR & PELANGGAN */}
        {activeTab === 'dashboard' && (
          <section aria-label="Dasbor dan Daftar Pelanggan">
            <DashboardSummary
              transactions={transactions}
              categories={categories}
              onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
              onOpenAddModal={handleOpenAddModal}
              onSelectFilter={handleSelectFilterFromDashboard}
              onOpenPaymentModal={handleOpenPaymentModal}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onSelectCustomer={handleSelectCustomer}
              onAddNewForCustomer={handleAddNewForCustomer}
              onNavigateToTab={setActiveTab}
            />
          </section>
        )}

        {/* Tab 2: BUKU TRANSAKSI */}
        {activeTab === 'transactions' && (
          <section id="section-transaction-list" aria-label="Daftar Hutang Piutang">
            <TransactionList
              transactions={transactions}
              filters={filters}
              categories={categories}
              onFilterChange={setFilters}
              onOpenAddModal={handleOpenAddModal}
              onOpenEditModal={handleOpenEditModal}
              onOpenPaymentModal={handleOpenPaymentModal}
              onOpenHistoryModal={handleOpenHistoryModal}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
              onSelectCustomer={handleSelectCustomer}
            />
          </section>
        )}

        {/* Tab 3: HALAMAN LAPORAN & REKAPITULASI KHUSUS */}
        {activeTab === 'reports' && (
          <section aria-label="Halaman Laporan & Rekapitulasi">
            <ReportsView
              transactions={transactions}
              categories={categories}
              onSelectCustomer={handleSelectCustomer}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          </section>
        )}

      </main>

      {/* Footer with Team Credentials & Multi-device Info */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-bold text-slate-800">Buku Hutang Piutang</span>
            <span className="hidden sm:inline">•</span>
            <span>Real-time Multi-Device Firebase Cloud & Export XLSX</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Otoritas:</span>
            <span>Owner: <strong className="text-slate-800 font-mono">dr.bussiness01@gmail.com</strong></span>
            <span>|</span>
            <span>Staff: <span className="font-mono">drmartikhwan@gmail.com</span>, <span className="font-mono">drmartakhwat@gmail.com</span></span>
          </div>
        </div>
      </footer>

      {/* Floating Action Button (FAB): 1 Tombol Tambah Transaksi */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40">
        <button
          id="btn-floating-tambah-transaksi"
          onClick={() => handleOpenAddModal('piutang')}
          className="group inline-flex items-center gap-2.5 px-5 py-3.5 sm:px-6 sm:py-4 rounded-full font-bold text-sm sm:text-base text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-xl hover:shadow-2xl hover:shadow-teal-900/30 ring-2 ring-white/30 transition-all duration-200 cursor-pointer"
          title="Tambah Catatan Transaksi Baru"
        >
          <div className="p-1 bg-white/20 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 sm:w-5 sm:h-5 text-white transition-transform group-hover:rotate-90 duration-200" />
          </div>
          <span className="tracking-wide shadow-xs">Tambah Transaksi</span>
        </button>
      </div>

      {/* Modal: Drill-down Riwayat Transaksi Pelanggan */}
      {selectedCustomerName && (
        <CustomerHistoryModal
          isOpen={Boolean(selectedCustomerName)}
          onClose={() => setSelectedCustomerName(null)}
          customerName={selectedCustomerName}
          transactions={transactions}
          onOpenPaymentModal={handleOpenPaymentModal}
          onOpenEditModal={handleOpenEditModal}
          onDeleteTransaction={handleDeleteTransaction}
          onAddNewTransaction={handleAddNewForCustomer}
        />
      )}

      {/* Modal: Tambah & Edit Transaksi */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
          setPrefilledContactName('');
          setPrefilledContactPhone('');
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        defaultType={defaultTransactionType}
        prefilledContactName={prefilledContactName}
        prefilledContactPhone={prefilledContactPhone}
        categories={categories}
        transactions={transactions}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
      />

      {/* Modal: Catat Cicilan & Pelunasan */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentTransaction(null);
        }}
        transaction={paymentTransaction}
        onAddPayment={handleAddPayment}
        onDeletePayment={handleDeletePayment}
      />

      {/* Modal: Riwayat Cicilan & Detail Transaksi Satuan */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTransaction(null);
        }}
        transaction={historyTransaction}
        onOpenPaymentModal={handleOpenPaymentModal}
        onDeletePayment={handleDeletePayment}
      />

      {/* Modal: Manajemen Kategori Kustom */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
      />

      {/* Modal: Export Excel (.xlsx) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        filteredTransactions={filteredTransactions}
        metrics={metrics}
      />

      {/* Modal: Halaman Login, Pendaftaran Akun, & Ganti Password */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
      />

    </div>
  );
}
