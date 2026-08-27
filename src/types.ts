export type TransactionType = 'hutang' | 'piutang';

export type PaymentStatus = 'belum_lunas' | 'sebagian' | 'lunas';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  note?: string;
  recordedAt: string;
}

export interface DebtTransaction {
  id: string;
  type: TransactionType; // 'hutang' = utang kita ke orang, 'piutang' = orang berutang ke kita
  contactName: string;
  contactPhone?: string;
  category: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  transactionDate: string;
  notes?: string;
  status: PaymentStatus;
  payments: PaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface SummaryMetrics {
  totalPiutang: number;
  totalPiutangTertagih: number;
  sisaPiutang: number; // Belum diterima
  
  totalHutang: number;
  totalHutangTerbayar: number;
  sisaHutang: number; // Belum dibayar
  
  netBalance: number; // sisaPiutang - sisaHutang (Aset bersih hak tagih vs kewajiban)
  
  totalTransaksiPiutang: number;
  totalTransaksiHutang: number;
  
  piutangLunasCount: number;
  piutangBelumLunasCount: number;
  
  hutangLunasCount: number;
  hutangBelumLunasCount: number;
}

export interface FilterOptions {
  type: 'all' | 'hutang' | 'piutang';
  status: 'all' | 'belum_lunas' | 'sebagian' | 'lunas';
  category: string;
  search: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy: 'transactionDate' | 'amount' | 'remainingAmount' | 'contactName';
  sortOrder: 'asc' | 'desc';
}

export type ActiveTab = 'dashboard' | 'transactions' | 'reports';

export interface CustomerSummary {
  contactName: string;
  contactPhone?: string;
  transactionCount: number;
  totalPiutang: number;
  paidPiutang: number;
  sisaPiutang: number;
  totalHutang: number;
  paidHutang: number;
  sisaHutang: number;
  netBalance: number; // sisaPiutang - sisaHutang
  lastTransactionDate: string;
  unpaidCount: number;
  status: 'lunas' | 'piutang_aktif' | 'hutang_aktif' | 'keduanya_aktif';
}

export interface CustomCategoryItem {
  id: string;
  name: string;
  color?: string;
}

export interface AppUser {
  email: string;
  role: 'Owner' | 'Staff';
  name: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'Owner' | 'Staff' | 'User';
  createdAt?: string;
}

export const AUTHORIZED_TEAM_MEMBERS: AppUser[] = [
  {
    email: 'dr.bussiness01@gmail.com',
    role: 'Owner',
    name: 'Owner (dr.bussiness01)'
  },
  {
    email: 'drmartikhwan@gmail.com',
    role: 'Staff',
    name: 'Staff 1 (drmartikhwan)'
  },
  {
    email: 'drmartakhwat@gmail.com',
    role: 'Staff',
    name: 'Staff 2 (drmartakhwat)'
  }
];

export const DEFAULT_CATEGORIES: string[] = [
  'Bisnis / Usaha',
  'Pribadi / Teman',
  'Keluarga',
  'Operasional Kantor',
  'Suplier / Vendor',
  'Pelanggan / Klien',
  'Belanja / Toko',
  'Lainnya'
];
