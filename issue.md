# Rencana Improve: Modul Pesanan `/orders`

## Latar Belakang

Modul pesanan saat ini (`src/pages/orders.ts`) sangat dasar — hanya 66 baris:
- Tabel sederhana dengan 5 kolom: Meja, Pelanggan, Total, Status, Waktu
- Menampilkan semua pesanan hari ini tanpa filter
- Tidak ada stats, search, pagination, atau detail pesanan

### Masalah Saat Ini
1. **Tidak ada stats/summary** — Tidak tahu total penjualan, pesanan aktif, selesai, dibatalkan
2. **Tidak ada search** — Tidak bisa cari berdasarkan nama pelanggan atau nomor meja
3. **Tidak ada filter** — Tidak bisa filter berdasarkan status (aktif, selesai, dibatalkan)
4. **Tidak ada detail pesanan** — Tidak bisa lihat item apa saja yang dipesan
5. **Tidak ada pagination** — Semua pesanan dimuat sekaligus
6. **Tidak ada sort** — Tidak bisa sort berdasarkan waktu, total, atau status
7. **Tidak ada export** — Tidak bisa download laporan pesanan
8. **Tidak ada toast notification** — Tidak ada feedback visual
9. **Tidak ada info kasir** — Tidak tahu siapa yang menangani pesanan
10. **Tidak ada cetak ulang struk** — Tidak bisa reprint struk pesanan selesai

---

## Tujuan

Improve modul pesanan agar:
1. **Lebih informatif** — Stats, detail pesanan, info kasir
2. **Lebih efisien** — Search, filter, sort, pagination
3. **Lebih modern** — Toast notification, export, cetak ulang struk

---

## Tahap 1: Tambah Stats Cards

Tambahkan ringkasan pesanan sebelum tabel utama.

### Layout
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Total  │ │  Aktif  │ │ Selesai │ │Dibatal  │ Penjualan │
│   24    │ │    5    │ │   17    │ │    2    │  Rp 1.2jt │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Implementasi
- Hitung dari data pesanan hari ini
- Total pesanan, aktif, selesai, dibatalkan, total penjualan

---

## Tahap 2: Tambah Search & Filter

### Toolbar
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🔍 Cari pesanan...]  [Semua Status ▼]  [Export CSV]  [Refresh]       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fitur
- **Search** — Filter berdasarkan nama pelanggan, nomor meja, atau nama kasir
- **Filter status** — Semua, Aktif, Selesai, Dibatalkan
- **Export CSV** — Download laporan pesanan hari ini

---

## Tahap 3: Tambah Modal Detail Pesanan

Klik baris pesanan untuk melihat detail item yang dipesan.

### Layout Modal
```
┌──────────────────────────────────────────────┐
│ Detail Pesanan #12                           │
├──────────────────────────────────────────────┤
│ Meja: 5          Kasir: Muhammad Zaki       │
│ Tgl: 04/04/2026 10:30    Status: Selesai    │
├──────────────────────────────────────────────┤
│ Item                  Qty    Harga    Total  │
│ Nasi Goreng Spesial  x2   15.000   30.000  │
│ Es Teh Manis         x1    5.000    5.000  │
│ Ayam Goreng          x1   18.000   18.000  │
├──────────────────────────────────────────────┤
│ Subtotal                    53.000           │
│ Pajak (10%)                  5.300           │
│ TOTAL                       58.300           │
│ Bayar                       60.000           │
│ Kembali                      1.700           │
├──────────────────────────────────────────────┤
│         [🖨️ Cetak Struk]  [✕ Tutup]         │
└──────────────────────────────────────────────┘
```

### Implementasi
- Fetch detail order dari API `/api/orders/:id`
- Tampilkan items dengan quantity, harga, total
- Tombol cetak struk (reuse receipt modal dari POS)

---

## Tahap 4: Tambah Kolom Kasir di Tabel

Tambahkan kolom "Kasir" di tabel pesanan.

### Tabel Baru
| Meja | Pelanggan | Kasir | Total | Status | Waktu | Aksi |
|------|-----------|-------|-------|--------|-------|------|
| 5 | Walk-in | Muhammad Zaki | Rp 58.300 | Selesai | 10:30 | 👁️ |

### Implementasi
- Data kasir sudah ada dari `getUserById()` di backend
- Tampilkan nama kasir di kolom baru
- Tambah kolom "Aksi" dengan tombol "Lihat Detail" (👁️)

---

## Tahap 5: Tambah Pagination

Jika pesanan lebih dari 15 item, tabel harus di-paginate.

### Implementasi (Client-side)
- Slice array pesanan di JavaScript
- 15 item per halaman
- Navigasi: Prev, Next, page numbers

---

## Tahap 6: Tambah Sort

Klik header kolom untuk sort:
- **Waktu** — Terbaru/Terlama (default: terbaru)
- **Total** — Tertinggi/Terendah
- **Meja** — Nomor kecil/besar

---

## Tahap 7: Tambah Fitur Export CSV

Download laporan pesanan hari ini dalam format CSV.

### Kolom CSV
```
No Order,Meja,Pelanggan,Kasir,Subtotal,Pajak,Total,Status,Waktu
12,5,Walk-in,Muhammad Zaki,53000,5300,58300,Selesai,2026-04-04 10:30
```

---

## Tahap 8: Tambah Auto-Refresh

Pesanan aktif harus auto-refresh setiap 30 detik agar status terbaru tampil.

### Implementasi
```javascript
setInterval(async () => {
  const response = await fetch('/api/orders/today');
  const data = await response.json();
  updateOrdersTable(data);
}, 30000);
```

---

## Tahap 9: Testing

### Skenario Test
1. Stats cards menampilkan angka yang benar
2. Search pesanan berdasarkan nama pelanggan → tabel ter-filter
3. Filter berdasarkan status → hanya pesanan dengan status tersebut tampil
4. Klik detail pesanan → modal muncul dengan item lengkap
5. Cetak struk dari detail pesanan → struk tampil rapi
6. Export CSV → file ter-download dengan data yang benar
7. Pagination berfungsi (15 item per halaman)
8. Sort berdasarkan waktu/total → urutan benar
9. Auto-refresh update status pesanan aktif
10. Kolom kasir menampilkan nama kasir yang benar

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/pages/orders.ts` | **Rewrite total** — stats, search, filter, detail modal, pagination, sort, export, auto-refresh |
| `src/routes/orders.ts` | Tambah endpoint `GET /api/orders/:id` (sudah ada), pastikan response lengkap |
| `src/repositories/order.ts` | Pastikan `getOrdersTodayWithTables()` return data lengkap dengan user/kasir |

## Catatan Penting

- **JANGAN hapus** fitur yang sudah ada
- **JANGAN ubah** API endpoint yang sudah ada (hanya tambah jika perlu)
- **Auto-refresh** hanya untuk pesanan aktif, bukan semua pesanan
- **Estimasi total**: 2-3 jam kerja
