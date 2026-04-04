# Rencana Transformasi: POS System → Production-Ready Business POS

## Latar Belakang

Sistem POS saat ini hanya memiliki modul dasar:
- ✅ Dashboard (basic stats)
- ✅ POS (order & payment)
- ✅ Menu Management
- ✅ Table Management
- ✅ Orders (today's orders)
- ✅ Admin (user management)

**Ini tidak cukup untuk menangani bisnis restoran nyata.** Sistem POS kompetitor seperti Moka POS, Majoo, Qasir, dan Pawoon memiliki puluhan modul yang saling terintegrasi.

---

## Analisis: Modul yang HARUS Ada untuk Bisnis Nyata

### 🔴 KRITIS — Tanpa ini, sistem tidak layak produksi

| # | Modul | Kenapa Penting | Estimasi |
|---|-------|---------------|----------|
| 1 | **Inventory/Stock Management** | Restoran harus tahu stok bahan baku, auto-decrement saat pesanan, alert stok habis | 8-12 jam |
| 2 | **Customer Management** | Database pelanggan, riwayat belanja, membership, loyalty points | 6-8 jam |
| 3 | **Reporting & Analytics** | Laporan penjualan harian/mingguan/bulanan, profit/loss, best seller | 8-10 jam |
| 4 | **Settings/Business Config** | Info restoran, pajak, metode pembayaran, template struk, jam operasional | 4-6 jam |
| 5 | **Supplier & Purchase Order** | Manajemen supplier, PO, penerimaan barang, harga beli | 6-8 jam |
| 6 | **Employee/Shift Management** | Shift kasir, attendance, performa karyawan, komisi | 6-8 jam |

### 🟡 PENTING — Meningkatkan efisiensi operasional

| # | Modul | Kenapa Penting | Estimasi |
|---|-------|---------------|----------|
| 7 | **Kitchen Display System (KDS)** | Layar dapur untuk lihat pesanan masuk, update status masak | 6-8 jam |
| 8 | **Promotions & Discounts** | Voucher, promo code, happy hour, diskon member, buy 1 get 1 | 6-8 jam |
| 9 | **Reservation/Booking** | Reservasi meja, booking online, waitlist | 4-6 jam |
| 10 | **Split Bill** | Bagi tagihan per orang atau per item | 4-6 jam |
| 11 | **Delivery/Takeaway** | Order delivery, status pengiriman, ongkir | 6-8 jam |
| 12 | **Multi-Payment Methods** | Cash, kartu, QRIS, e-wallet (GoPay, OVO, Dana), split payment | 6-8 jam |

### 🟢 NILAI TAMBAH — Membedakan dari kompetitor

| # | Modul | Kenapa Penting | Estimasi |
|---|-------|---------------|----------|
| 13 | **Loyalty Program** | Poin reward, tier member, redeem poin | 4-6 jam |
| 14 | **Email/SMS Receipt** | Kirim struk via email atau SMS | 2-4 jam |
| 15 | **Expense Management** | Catat pengeluaran operasional (listrik, gaji, bahan) | 4-6 jam |
| 16 | **Multi-branch Support** | Kelola banyak cabang dari satu dashboard | 12-16 jam |
| 17 | **API Integration** | Integrasi dengan GoFood, GrabFood, ShopeeFood | 8-12 jam |
| 18 | **Barcode/QR Scanner** | Scan barcode untuk inventory, QR untuk menu digital | 4-6 jam |

---

## Rencana Implementasi Bertahap

### Fase 1: Foundation (Week 1-2) — Modul KRITIS

#### 1.1 Inventory/Stock Management
**File baru**: `src/pages/inventory.ts`, `src/routes/inventory.ts`, `src/repositories/inventory.ts`

**Fitur**:
- Database bahan baku (nama, satuan, stok, minimum stok, harga beli)
- Auto-decrement stok saat pesanan dibuat (recipe mapping)
- Alert stok hampir habis / habis
- Stock in/out manual (penyesuaian stok)
- Riwayat pergerakan stok

**Schema baru**:
```typescript
// ingredients — bahan baku
// recipes — mapping menu ke bahan baku
// stock_movements — riwayat stok masuk/keluar
```

#### 1.2 Customer Management
**File baru**: `src/pages/customers.ts`, `src/routes/customers.ts`

**Fitur**:
- CRUD pelanggan (nama, telepon, email, alamat)
- Riwayat belanja per pelanggan
- Membership tier (Regular, Silver, Gold)
- Loyalty points (1 poin per Rp 10.000 belanja)

**Schema baru**:
```typescript
// customers
// customer_memberships
// loyalty_transactions
```

#### 1.3 Reporting & Analytics
**File baru**: `src/pages/reports.ts`

**Fitur**:
- Laporan penjualan (harian, mingguan, bulanan, custom range)
- Laporan menu terlaris
- Laporan kasir (performa per kasir)
- Laporan okupansi meja
- Grafik penjualan (chart.js atau vanilla JS bar chart)
- Export laporan ke PDF/Excel

#### 1.4 Settings/Business Config
**File baru**: `src/pages/settings.ts`

**Fitur**:
- Info bisnis (nama, alamat, telepon, logo)
- Pengaturan pajak (persentase, inclusive/exclusive)
- Metode pembayaran aktif (cash, card, QRIS, e-wallet)
- Template struk (header, footer, ukuran kertas)
- Jam operasional
- Backup & restore database

#### 1.5 Supplier & Purchase Order
**File baru**: `src/pages/suppliers.ts`, `src/pages/purchase-orders.ts`

**Fitur**:
- CRUD supplier
- Buat purchase order
- Terima barang (update stok otomatis)
- Riwayat PO

**Schema baru**:
```typescript
// suppliers
// purchase_orders
// purchase_order_items
```

#### 1.6 Employee/Shift Management
**File baru**: `src/pages/employees.ts`, `src/pages/shifts.ts`

**Fitur**:
- Data karyawan (sudah ada di users, tambah field: jabatan, gaji, telepon)
- Shift management (buka/tutup shift, cash count)
- Attendance (clock in/clock out)
- Performa kasir (total transaksi, rata-rata per transaksi)

---

### Fase 2: Operational Excellence (Week 3-4) — Modul PENTING

#### 2.1 Kitchen Display System (KDS)
**File baru**: `src/pages/kitchen.ts`

**Fitur**:
- Real-time display pesanan masuk (WebSocket atau polling)
- Update status: Pending → Cooking → Ready → Served
- Timer per pesanan (warning jika terlalu lama)
- Filter by station (makanan/minuman)

#### 2.2 Promotions & Discounts
**Schema baru**:
```typescript
// promotions (kode, tipe, nilai, periode, minimum belanja)
// promotion_usage
```

**Fitur**:
- Voucher diskon (fixed/percentage)
- Happy hour (diskon otomatis di jam tertentu)
- Buy X Get Y
- Diskon per kategori/menu
- Promo code di POS

#### 2.3 Reservation/Booking
**Schema baru**:
```typescript
// reservations (nama, telepon, tanggal, jam, jumlah tamu, meja, status)
```

**Fitur**:
- Buat reservasi
- Calendar view
- Assign meja otomatis
- Status: Pending → Confirmed → Seated → Completed/No-show

#### 2.4 Split Bill
**Fitur di POS**:
- Split by item (tiap orang pilih item sendiri)
- Split equally (bagi rata)
- Custom split (manual assign)

#### 2.5 Delivery/Takeaway
**Schema baru**:
```typescript
// delivery_orders (customer, alamat, ongkir, driver, status)
```

**Fitur**:
- Order type: Dine-in / Takeaway / Delivery
- Input alamat pengiriman
- Assign driver
- Status tracking: Pending → Preparing → On the way → Delivered

#### 2.6 Multi-Payment Methods
**Schema update**:
```typescript
// orders — tambah payment_method, split_payments
// payment_methods — cash, card, qris, gopay, ovo, dana, shopeepay
```

**Fitur**:
- Pilih metode pembayaran saat checkout
- Split payment (bayar sebagian cash, sebagian QRIS)
- Integration-ready untuk QRIS (struktur data siap)

---

### Fase 3: Competitive Edge (Week 5-6) — Modul NILAI TAMBAH

#### 3.1 Loyalty Program
**Fitur**:
- Earn points saat belanja
- Redeem points untuk diskon
- Tier upgrade (Regular → Silver → Gold)
- Member-exclusive promo

#### 3.2 Email/SMS Receipt
**Fitur**:
- Input email pelanggan saat checkout
- Kirim struk via email (gunakan nodemailer atau API pihak ketiga)
- Template struk email

#### 3.3 Expense Management
**Schema baru**:
```typescript
// expenses (kategori, jumlah, keterangan, tanggal, bukti)
```

**Fitur**:
- Catat pengeluaran (bahan baku, listrik, gaji, dll)
- Kategori pengeluaran
- Laporan pengeluaran vs pendapatan
- Profit/loss otomatis

#### 3.4 Multi-branch Support
**Schema update**:
```typescript
// branches (nama, alamat, telepon, status)
// Semua tabel utama — tambah branch_id
```

**Fitur**:
- Kelola banyak cabang
- Dashboard per cabang atau consolidated
- Transfer stok antar cabang
- Laporan per cabang

---

## Prioritas Implementasi (Urutan yang Disarankan)

Berdasarkan dampak bisnis, urutan pengerjaan yang optimal:

1. **Settings** — Fondasi konfigurasi bisnis (4-6 jam)
2. **Inventory** — Tanpa ini, stok tidak terkontrol (8-12 jam)
3. **Reporting** — Owner butuh data untuk keputusan (8-10 jam)
4. **Customer Management** — Retensi pelanggan (6-8 jam)
5. **Supplier & PO** — Supply chain (6-8 jam)
6. **Employee/Shift** — Operasional harian (6-8 jam)
7. **Promotions** — Marketing (6-8 jam)
8. **Kitchen Display** — Efisiensi dapur (6-8 jam)
9. **Multi-Payment** — Fleksibilitas pembayaran (6-8 jam)
10. **Split Bill** — UX pelanggan (4-6 jam)
11. **Reservation** — Booking system (4-6 jam)
12. **Delivery** — Revenue channel baru (6-8 jam)
13. **Loyalty Program** — Retensi (4-6 jam)
14. **Expense Management** — Financial control (4-6 jam)
15. **Email Receipt** — Professional touch (2-4 jam)
16. **Multi-branch** — Scale up (12-16 jam)

**Total estimasi**: 96-134 jam kerja (~3-4 bulan untuk 1 developer)

---

## Arsitektur File yang Disarankan

```
src/
├── pages/
│   ├── dashboard.ts          ✅ Sudah ada
│   ├── pos.ts                ✅ Sudah ada
│   ├── menu.ts               ✅ Sudah ada
│   ├── tables.ts             ✅ Sudah ada
│   ├── orders.ts             ✅ Sudah ada
│   ├── admin.ts              ✅ Sudah ada
│   ├── inventory.ts          🆕
│   ├── customers.ts          🆕
│   ├── reports.ts            🆕
│   ├── settings.ts           🆕
│   ├── suppliers.ts          🆕
│   ├── purchase-orders.ts    🆕
│   ├── employees.ts          🆕
│   ├── shifts.ts             🆕
│   ├── kitchen.ts            🆕
│   ├── reservations.ts       🆕
│   ├── promotions.ts         🆕
│   ├── expenses.ts           🆕
│   └── branches.ts           🆕
├── routes/
│   ├── inventory.ts          🆕
│   ├── customers.ts          🆕
│   ├── suppliers.ts          🆕
│   ├── reservations.ts       🆕
│   ├── promotions.ts         🆕
│   └── expenses.ts           🆕
├── repositories/
│   ├── inventory.ts          🆕
│   ├── customer.ts           🆕
│   ├── supplier.ts           🆕
│   ├── reservation.ts        🆕
│   ├── promotion.ts          🆕
│   └── expense.ts            🆕
└── db/
    └── schema.ts             🔄 Update — tambah semua tabel baru
```

---

## Catatan Penting

- **JANGAN hapus** modul yang sudah ada
- **JANGAN ubah** API endpoint yang sudah ada (backward compatible)
- **Setiap modul harus independent** — bisa diaktifkan/nonaktifkan
- **Gunakan RBAC yang sudah ada** — setiap modul punya role access
- **Semua modul harus punya search, filter, pagination** — konsisten dengan modul existing
- **Estimasi per modul** termasuk: database migration, API, UI, testing
