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

// Initial sample data is empty
export const INITIAL_SAMPLE_DATA: DebtTransaction[] = [];

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

// Initialize and Seed Default Categories if empty, and purge any old demo records
export async function initializeDefaultsIfEmpty(): Promise<void> {
  try {
    // Check and seed default categories if empty
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

    // Clean up any legacy demo transaction IDs from Firestore if they exist
    const demoIds = ['TRX-101', 'TRX-102', 'TRX-103', 'TRX-104', 'TRX-105', 'TRX-106'];
    const trxSnap = await getDocs(collection(db, TRANSACTIONS_COLL));
    const demoDocs = trxSnap.docs.filter(d => demoIds.includes(d.id));
    if (demoDocs.length > 0) {
      const batch = writeBatch(db);
      demoDocs.forEach(d => batch.delete(d.ref));
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

