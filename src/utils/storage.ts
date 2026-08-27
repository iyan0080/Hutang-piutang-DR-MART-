import { DebtTransaction, SummaryMetrics } from '../types';

const STORAGE_KEY = 'buku_hutang_piutang_v1';

// Seed sample data without due dates or tags
export const INITIAL_SAMPLE_DATA: DebtTransaction[] = [
  {
    id: 'TRX-101',
    type: 'piutang',
    contactName: 'Budi Pratama (Proyek Web)',
    contactPhone: '081234567890',
    category: 'Bisnis / Usaha',
    amount: 7500000,
    paidAmount: 3500000,
    remainingAmount: 4000000,
    transactionDate: '2026-08-01',
    notes: 'Pelunasan sisa termin 2 pembuatan website toko online',
    status: 'sebagian',
    payments: [
      {
        id: 'PAY-101-1',
        date: '2026-08-01',
        amount: 3500000,
        note: 'DP Termin 1 via Transfer BCA',
        recordedAt: '2026-08-01T10:30:00.000Z'
      }
    ],
    createdAt: '2026-08-01T10:30:00.000Z',
    updatedAt: '2026-08-01T10:30:00.000Z'
  },
  {
    id: 'TRX-102',
    type: 'piutang',
    contactName: 'Siti Rahma',
    contactPhone: '085712349999',
    category: 'Pribadi / Teman',
    amount: 1200000,
    paidAmount: 0,
    remainingAmount: 1200000,
    transactionDate: '2026-08-10',
    notes: 'Pinjaman keperluan renovasi',
    status: 'belum_lunas',
    payments: [],
    createdAt: '2026-08-10T14:15:00.000Z',
    updatedAt: '2026-08-10T14:15:00.000Z'
  },
  {
    id: 'TRX-103',
    type: 'piutang',
    contactName: 'Toko Berkah Abadi',
    contactPhone: '081988887766',
    category: 'Pelanggan / Klien',
    amount: 4500000,
    paidAmount: 4500000,
    remainingAmount: 0,
    transactionDate: '2026-07-15',
    notes: 'Pembelian grosir bahan baku batch #14',
    status: 'lunas',
    payments: [
      {
        id: 'PAY-103-1',
        date: '2026-07-30',
        amount: 2000000,
        note: 'Cicilan 1 tunai',
        recordedAt: '2026-07-30T16:00:00.000Z'
      },
      {
        id: 'PAY-103-2',
        date: '2026-08-14',
        amount: 2500000,
        note: 'Pelunasan transfer Mandiri',
        recordedAt: '2026-08-14T11:20:00.000Z'
      }
    ],
    createdAt: '2026-07-15T09:00:00.000Z',
    updatedAt: '2026-08-14T11:20:00.000Z'
  },
  {
    id: 'TRX-104',
    type: 'hutang',
    contactName: 'PT Sumber Logistik Nusantara',
    contactPhone: '0217654321',
    category: 'Suplier / Vendor',
    amount: 5000000,
    paidAmount: 2000000,
    remainingAmount: 3000000,
    transactionDate: '2026-08-05',
    notes: 'Pengadaan stok inventaris Q3 Faktur #INV-889',
    status: 'sebagian',
    payments: [
      {
        id: 'PAY-104-1',
        date: '2026-08-12',
        amount: 2000000,
        note: 'Pembayaran sebagian invoice #INV-889',
        recordedAt: '2026-08-12T13:45:00.000Z'
      }
    ],
    createdAt: '2026-08-05T08:00:00.000Z',
    updatedAt: '2026-08-12T13:45:00.000Z'
  },
  {
    id: 'TRX-105',
    type: 'hutang',
    contactName: 'Rian Santoso (Koperasi)',
    contactPhone: '081399881122',
    category: 'Keluarga',
    amount: 2500000,
    paidAmount: 2500000,
    remainingAmount: 0,
    transactionDate: '2026-07-01',
    notes: 'Iuran kas pinjaman modal usaha koperasi',
    status: 'lunas',
    payments: [
      {
        id: 'PAY-105-1',
        date: '2026-08-01',
        amount: 2500000,
        note: 'Pelunasan tepat waktu',
        recordedAt: '2026-08-01T09:00:00.000Z'
      }
    ],
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z'
  },
  {
    id: 'TRX-106',
    type: 'hutang',
    contactName: 'CV Mitra Makmur',
    contactPhone: '081299887766',
    category: 'Operasional Kantor',
    amount: 1800000,
    paidAmount: 0,
    remainingAmount: 1800000,
    transactionDate: '2026-08-18',
    notes: 'Servis rutin & upgrade perangkat komputer kantor',
    status: 'belum_lunas',
    payments: [],
    createdAt: '2026-08-18T15:30:00.000Z',
    updatedAt: '2026-08-18T15:30:00.000Z'
  }
];

export function loadTransactions(): DebtTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveTransactions(INITIAL_SAMPLE_DATA);
      return INITIAL_SAMPLE_DATA;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SAMPLE_DATA;
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return INITIAL_SAMPLE_DATA;
  }
}

export function saveTransactions(transactions: DebtTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
}

export function resetTransactions(): DebtTransaction[] {
  saveTransactions(INITIAL_SAMPLE_DATA);
  return INITIAL_SAMPLE_DATA;
}

export function clearAllTransactions(): DebtTransaction[] {
  saveTransactions([]);
  return [];
}

export function calculateMetrics(transactions: DebtTransaction[]): SummaryMetrics {
  let totalPiutang = 0;
  let totalPiutangTertagih = 0;
  let sisaPiutang = 0;

  let totalHutang = 0;
  let totalHutangTerbayar = 0;
  let sisaHutang = 0;

  let totalTransaksiPiutang = 0;
  let totalTransaksiHutang = 0;

  let piutangLunasCount = 0;
  let piutangBelumLunasCount = 0;

  let hutangLunasCount = 0;
  let hutangBelumLunasCount = 0;

  transactions.forEach(t => {
    const isPaid = t.status === 'lunas';

    if (t.type === 'piutang') {
      totalTransaksiPiutang++;
      totalPiutang += t.amount;
      totalPiutangTertagih += t.paidAmount;
      sisaPiutang += t.remainingAmount;

      if (isPaid) {
        piutangLunasCount++;
      } else {
        piutangBelumLunasCount++;
      }
    } else {
      totalTransaksiHutang++;
      totalHutang += t.amount;
      totalHutangTerbayar += t.paidAmount;
      sisaHutang += t.remainingAmount;

      if (isPaid) {
        hutangLunasCount++;
      } else {
        hutangBelumLunasCount++;
      }
    }
  });

  const netBalance = sisaPiutang - sisaHutang;

  return {
    totalPiutang,
    totalPiutangTertagih,
    sisaPiutang,
    totalHutang,
    totalHutangTerbayar,
    sisaHutang,
    netBalance,
    totalTransaksiPiutang,
    totalTransaksiHutang,
    piutangLunasCount,
    piutangBelumLunasCount,
    hutangLunasCount,
    hutangBelumLunasCount,
  };
}
