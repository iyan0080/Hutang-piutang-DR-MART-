import { DebtTransaction, CustomerSummary } from '../types';

export function getCustomerSummaries(transactions: DebtTransaction[]): CustomerSummary[] {
  const customerMap = new Map<string, {
    contactName: string;
    contactPhone?: string;
    transactionCount: number;
    totalPiutang: number;
    paidPiutang: number;
    sisaPiutang: number;
    totalHutang: number;
    paidHutang: number;
    sisaHutang: number;
    lastTransactionDate: string;
    unpaidCount: number;
  }>();

  transactions.forEach(t => {
    // Group by trimmed contact name (case-insensitive key for normalization)
    const key = t.contactName.trim().toLowerCase();
    
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        contactName: t.contactName.trim(),
        contactPhone: t.contactPhone?.trim(),
        transactionCount: 0,
        totalPiutang: 0,
        paidPiutang: 0,
        sisaPiutang: 0,
        totalHutang: 0,
        paidHutang: 0,
        sisaHutang: 0,
        lastTransactionDate: t.transactionDate,
        unpaidCount: 0,
      });
    }

    const current = customerMap.get(key)!;
    current.transactionCount += 1;

    // Use latest available phone if current entry doesn't have it
    if (!current.contactPhone && t.contactPhone?.trim()) {
      current.contactPhone = t.contactPhone.trim();
    }

    if (t.type === 'piutang') {
      current.totalPiutang += t.amount;
      current.paidPiutang += t.paidAmount;
      current.sisaPiutang += t.remainingAmount;
    } else {
      current.totalHutang += t.amount;
      current.paidHutang += t.paidAmount;
      current.sisaHutang += t.remainingAmount;
    }

    if (t.status !== 'lunas') {
      current.unpaidCount += 1;
    }

    if (new Date(t.transactionDate) > new Date(current.lastTransactionDate)) {
      current.lastTransactionDate = t.transactionDate;
    }
  });

  const list: CustomerSummary[] = [];

  customerMap.forEach(item => {
    const netBalance = item.sisaPiutang - item.sisaHutang;
    let status: CustomerSummary['status'] = 'lunas';

    if (item.sisaPiutang > 0 && item.sisaHutang > 0) {
      status = 'keduanya_aktif';
    } else if (item.sisaPiutang > 0) {
      status = 'piutang_aktif';
    } else if (item.sisaHutang > 0) {
      status = 'hutang_aktif';
    } else {
      status = 'lunas';
    }

    list.push({
      ...item,
      netBalance,
      status,
    });
  });

  return list;
}

export function formatWhatsAppUrl(phone?: string, customerName?: string, sisaPiutang?: number): string | null {
  if (!phone) return null;
  
  // Clean phone number: remove non-digits
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Replace leading '0' with '62' (Indonesia standard)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('8')) {
    cleanPhone = '62' + cleanPhone;
  }

  if (cleanPhone.length < 8) return null;

  let message = `Halo ${customerName || 'Bapak/Ibu'}, salam silaturahmi.`;
  if (sisaPiutang && sisaPiutang > 0) {
    message += ` Kami ingin mengonfirmasi terkait catatan tagihan piutang sebesar Rp ${sisaPiutang.toLocaleString('id-ID')}. Terima kasih.`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
