import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { DebtTransaction, CustomCategoryItem, DEFAULT_CATEGORIES } from '../types';
import { saveTransactions, loadTransactions } from '../utils/storage';

const TRANSACTIONS_COLL = 'debt_transactions';
const CATEGORIES_COLL = 'categories';

// Initial sample data for seeding if database is empty
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

// Real-time listener for Transactions
export function subscribeTransactions(
  onData: (transactions: DebtTransaction[]) => void,
  onError?: (err: Error) => void
) {
  const collRef = collection(db, TRANSACTIONS_COLL);
  return onSnapshot(
    collRef,
    (snapshot) => {
      const list: DebtTransaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DebtTransaction);
      });
      // Sort by transactionDate descending by default
      list.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      
      if (list.length > 0) {
        saveTransactions(list);
      }
      onData(list);
    },
    (error) => {
      console.warn('Firebase transactions subscription notice (offline fallback active):', error.message);
      // Fallback to local storage if offline or unavailable
      const localData = loadTransactions();
      onData(localData);
      if (onError) onError(error);
    }
  );
}

// Real-time listener for Categories
export function subscribeCategories(
  onData: (categories: CustomCategoryItem[]) => void,
  onError?: (err: Error) => void
) {
  const collRef = collection(db, CATEGORIES_COLL);
  return onSnapshot(
    collRef,
    (snapshot) => {
      const list: CustomCategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CustomCategoryItem);
      });
      if (list.length > 0) {
        onData(list);
      }
    },
    (error) => {
      console.warn('Firebase categories subscription notice:', error.message);
      if (onError) onError(error);
    }
  );
}

// Save or Update a Transaction
export async function saveTransactionToFirebase(transaction: DebtTransaction): Promise<void> {
  // Update local cache immediately
  const local = loadTransactions();
  const index = local.findIndex(t => t.id === transaction.id);
  if (index >= 0) {
    local[index] = transaction;
  } else {
    local.unshift(transaction);
  }
  saveTransactions(local);

  try {
    const docRef = doc(db, TRANSACTIONS_COLL, transaction.id);
    await setDoc(docRef, transaction, { merge: true });
  } catch (err) {
    console.warn('Saved to local storage, pending Firebase sync:', err);
  }
}

// Delete a Transaction
export async function deleteTransactionFromFirebase(transactionId: string): Promise<void> {
  const local = loadTransactions().filter(t => t.id !== transactionId);
  saveTransactions(local);

  try {
    const docRef = doc(db, TRANSACTIONS_COLL, transactionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Deleted locally, pending Firebase sync:', err);
  }
}

// Save or Update Category
export async function saveCategoryToFirebase(category: CustomCategoryItem): Promise<void> {
  try {
    const docRef = doc(collection(db, CATEGORIES_COLL), category.id);
    await setDoc(docRef, category, { merge: true });
  } catch (err) {
    console.warn('Category saved locally:', err);
  }
}

// Delete Category
export async function deleteCategoryFromFirebase(categoryId: string): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLL, categoryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Category deleted locally:', err);
  }
}

// Initialize and Seed Default Categories if empty
export async function initializeDefaultsIfEmpty(): Promise<void> {
  try {
    // Check categories
    const catSnap = await getDocs(collection(db, CATEGORIES_COLL));
    if (catSnap.empty) {
      const batch = writeBatch(db);
      DEFAULT_CATEGORIES.forEach((catName, idx) => {
        const id = `cat-${idx + 1}-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const ref = doc(db, CATEGORIES_COLL, id);
        batch.set(ref, { id, name: catName });
      });
      await batch.commit();
    }

    // Check transactions
    const trxSnap = await getDocs(collection(db, TRANSACTIONS_COLL));
    if (trxSnap.empty) {
      const batch = writeBatch(db);
      INITIAL_SAMPLE_DATA.forEach((trx) => {
        const ref = doc(db, TRANSACTIONS_COLL, trx.id);
        batch.set(ref, trx);
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Firebase initialization notice (offline mode available):', err);
  }
}

// Reset data in Firebase to initial demo set
export async function resetFirebaseTransactions(): Promise<void> {
  saveTransactions(INITIAL_SAMPLE_DATA);
  try {
    const batch = writeBatch(db);
    const trxSnap = await getDocs(collection(db, TRANSACTIONS_COLL));
    trxSnap.forEach((d) => batch.delete(d.ref));

    INITIAL_SAMPLE_DATA.forEach((trx) => {
      const ref = doc(db, TRANSACTIONS_COLL, trx.id);
      batch.set(ref, trx);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Reset applied to local storage:', err);
  }
}

// Clear all transactions from Firebase
export async function clearAllFirebaseTransactions(): Promise<void> {
  saveTransactions([]);
  try {
    const batch = writeBatch(db);
    const trxSnap = await getDocs(collection(db, TRANSACTIONS_COLL));
    trxSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('Cleared locally:', err);
  }
}

// Batch import transactions
export async function importTransactionsToFirebase(transactions: DebtTransaction[]): Promise<void> {
  saveTransactions(transactions);
  try {
    const batch = writeBatch(db);
    transactions.forEach((trx) => {
      const ref = doc(db, TRANSACTIONS_COLL, trx.id);
      batch.set(ref, trx, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Imported to local storage:', err);
  }
}

