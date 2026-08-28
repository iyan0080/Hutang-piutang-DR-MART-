import { DebtTransaction, SummaryMetrics } from '../types';

const STORAGE_KEY = 'buku_hutang_piutang_v1';

// Empty initial data - no demo records
export const INITIAL_SAMPLE_DATA: DebtTransaction[] = [];

export function loadTransactions(): DebtTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Error reading localStorage:', err);
    return [];
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
