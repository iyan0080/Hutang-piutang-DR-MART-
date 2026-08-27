import * as XLSX from 'xlsx';
import { DebtTransaction, SummaryMetrics, AUTHORIZED_TEAM_MEMBERS } from '../types';
import { formatDate, formatDateTime, formatRupiah } from './formatters';

export interface ExportOptions {
  fileName?: string;
  scope: 'all' | 'piutang' | 'hutang' | 'filtered';
  includePaymentsSheet?: boolean;
  includeSummarySheet?: boolean;
}

export function exportTransactionsToExcel(
  transactions: DebtTransaction[],
  metrics: SummaryMetrics,
  options: ExportOptions = { scope: 'all', includePaymentsSheet: true, includeSummarySheet: true }
) {
  // Create workbook
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const dateSuffix = now.toISOString().slice(0, 10);
  const fileName = options.fileName || `Laporan_Hutang_Piutang_${dateSuffix}.xlsx`;

  // 1. SUMMARY SHEET
  if (options.includeSummarySheet) {
    const summaryData = [
      ['LAPORAN RINGKASAN KEUANGAN & BUKU HUTANG PIUTANG'],
      ['Tanggal Unduh', formatDateTime(now.toISOString())],
      ['Owner Aplikasi', 'dr.bussiness01@gmail.com'],
      ['Staff Pengelola', 'drmartikhwan@gmail.com / drmartakhwat@gmail.com'],
      [''],
      ['INDIKATOR KEUANGAN', 'NILAI (RUPIAH)', 'KETERANGAN'],
      ['Total Piutang Awal', metrics.totalPiutang, 'Total hak tagih yang dipinjamkan'],
      ['Piutang Telah Diterima', metrics.totalPiutangTertagih, 'Uang masuk dari piutang'],
      ['Sisa Piutang (Belum Diterima)', metrics.sisaPiutang, 'Uang kita yang masih di luar'],
      [''],
      ['Total Hutang Awal', metrics.totalHutang, 'Total pinjaman yang kita lakukan'],
      ['Hutang Telah Dibayar', metrics.totalHutangTerbayar, 'Uang keluar untuk bayar hutang'],
      ['Sisa Hutang (Harus Dibayar)', metrics.sisaHutang, 'Kewajiban bayar yang tersisa'],
      [''],
      ['POSISI KEUANGAN BERSIH (NET)', metrics.netBalance, metrics.netBalance >= 0 ? 'Surplus (Piutang > Hutang)' : 'Defisit (Hutang > Piutang)'],
      [''],
      ['STATISTIK TRANSAKSI', 'JUMLAH TRANSAKSI', 'STATUS'],
      ['Total Transaksi Piutang', metrics.totalTransaksiPiutang, `${metrics.piutangLunasCount} Lunas / ${metrics.piutangBelumLunasCount} Belum Lunas`],
      ['Total Transaksi Hutang', metrics.totalTransaksiHutang, `${metrics.hutangLunasCount} Lunas / ${metrics.hutangBelumLunasCount} Belum Lunas`],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Keuangan');
  }

  // Filter transactions based on scope
  let dataToExport = transactions;
  if (options.scope === 'piutang') {
    dataToExport = transactions.filter(t => t.type === 'piutang');
  } else if (options.scope === 'hutang') {
    dataToExport = transactions.filter(t => t.type === 'hutang');
  }

  // Transform transactions to tabular rows
  const formatRows = (list: DebtTransaction[]) => {
    return list.map((t, idx) => ({
      'No': idx + 1,
      'Tipe': t.type === 'piutang' ? 'Piutang (Hak Tagih)' : 'Hutang (Kewajiban)',
      'Nama Kontak': t.contactName,
      'No. Telepon / WA': t.contactPhone || '-',
      'Kategori': t.category,
      'Nominal Awal': t.amount,
      'Total Terbayar': t.paidAmount,
      'Sisa Tagihan': t.remainingAmount,
      'Tanggal Transaksi': formatDate(t.transactionDate),
      'Status Pelunasan': t.status === 'lunas' ? 'LUNAS' : t.status === 'sebagian' ? 'DIBAYAR SEBAGIAN' : 'BELUM DIBAYAR',
      'Catatan': t.notes || '-',
      'Jumlah Pembayaran': t.payments.length,
      'ID Transaksi': t.id
    }));
  };

  // 2. ALL / FILTERED DATA SHEET
  if (options.scope === 'all' || options.scope === 'filtered') {
    const wsAll = XLSX.utils.json_to_sheet(formatRows(dataToExport));
    wsAll['!cols'] = [
      { wch: 6 },  // No
      { wch: 22 }, // Tipe
      { wch: 24 }, // Nama Kontak
      { wch: 18 }, // No HP
      { wch: 20 }, // Kategori
      { wch: 16 }, // Nominal Awal
      { wch: 16 }, // Total Terbayar
      { wch: 16 }, // Sisa Tagihan
      { wch: 16 }, // Tanggal Transaksi
      { wch: 20 }, // Status Pelunasan
      { wch: 30 }, // Catatan
      { wch: 14 }, // Jml Pembayaran
      { wch: 16 }, // ID
    ];
    XLSX.utils.book_append_sheet(wb, wsAll, options.scope === 'filtered' ? 'Data Terpilih' : 'Semua Transaksi');
  }

  // 3. SEPARATE PIUTANG & HUTANG SHEETS (if exporting all)
  if (options.scope === 'all') {
    const piutangList = transactions.filter(t => t.type === 'piutang');
    if (piutangList.length > 0) {
      const wsPiutang = XLSX.utils.json_to_sheet(formatRows(piutangList));
      wsPiutang['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 20 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
        { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsPiutang, 'Daftar Piutang');
    }

    const hutangList = transactions.filter(t => t.type === 'hutang');
    if (hutangList.length > 0) {
      const wsHutang = XLSX.utils.json_to_sheet(formatRows(hutangList));
      wsHutang['!cols'] = [
        { wch: 6 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 20 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
        { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsHutang, 'Daftar Hutang');
    }
  }

  // 4. PAYMENTS SHEET
  if (options.includePaymentsSheet) {
    const paymentRows: Array<{
      'No': number;
      'ID Pembayaran': string;
      'Tanggal Pembayaran': string;
      'Tipe Transaksi': string;
      'Nama Kontak': string;
      'Nominal Dibayar': number;
      'Keterangan / Bukti': string;
      'Dicatat Pada': string;
      'ID Transaksi Asal': string;
    }> = [];

    let pIdx = 1;
    dataToExport.forEach(t => {
      t.payments.forEach(p => {
        paymentRows.push({
          'No': pIdx++,
          'ID Pembayaran': p.id,
          'Tanggal Pembayaran': formatDate(p.date),
          'Tipe Transaksi': t.type === 'piutang' ? 'Penerimaan Piutang' : 'Pembayaran Hutang',
          'Nama Kontak': t.contactName,
          'Nominal Dibayar': p.amount,
          'Keterangan / Bukti': p.note || '-',
          'Dicatat Pada': formatDateTime(p.recordedAt),
          'ID Transaksi Asal': t.id,
        });
      });
    });

    if (paymentRows.length > 0) {
      const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
      wsPayments['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 18 },
        { wch: 22 },
        { wch: 24 },
        { wch: 18 },
        { wch: 30 },
        { wch: 20 },
        { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsPayments, 'Riwayat Pembayaran');
    }
  }

  // Write file and trigger browser download
  XLSX.writeFile(wb, fileName);
}
