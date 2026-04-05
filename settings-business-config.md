# Sub-Issue 1.4: Settings/Business Config — Konfigurasi Bisnis Restoran

## Parent Issue

[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Setiap restoran memiliki konfigurasi bisnis yang berbeda-beda. Tanpa modul Settings:

- Nama restoran dan alamat hardcoded di struk
- Pajak tidak bisa dikonfigurasi (ada yang 0%, 5%, 10%, 11%)
- Tidak bisa atur metode pembayaran mana yang aktif
- Template struk tidak bisa dikustomisasi
- Tidak ada jam operasional untuk validasi pesanan
- Tidak ada backup/restore data
- Owner tidak bisa update info bisnis tanpa ubah kode

Modul ini adalah **fondasi konfigurasi** yang dibutuhkan sebelum modul lain bisa berjalan dengan benar.

---

## Scope

### Yang HARUS ada (MVP)

1. **Info Bisnis** — Nama restoran, alamat, telepon, email, logo
2. **Pengaturan Pajak** — Persentase pajak, inclusive/exclusive
3. **Metode Pembayaran** — Aktifkan/nonaktifkan metode (Cash, Card, QRIS, E-Wallet)
4. **Template Struk** — Header, footer, ukuran kertas, show/hide info
5. **Jam Operasional** — Jam buka/tutup per hari
6. **General Settings** — Mata uang, bahasa, timezone, nomor struk otomatis

### Yang NANTI bisa ditambahkan (Phase 2)

- Backup & restore database
- Email/SMS gateway config
- Printer setup & test print
- Multi-currency support
- Custom receipt fields
- Audit log settings changes

---

## Tahap 1: Database Schema

Tambahkan ke `src/db/schema.ts`:

```typescript
// business_settings — konfigurasi utama bisnis
export const businessSettings = mysqlTable('business_settings', {
  id: serial('id').primaryKey(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  businessTagline: varchar('business_tagline', { length: 255 }).default(''),
  address: varchar('address', { length: 500 }).default(''),
  phone: varchar('phone', { length: 20 }).default(''),
  email: varchar('email', { length: 255 }).default(''),
  logo: varchar('logo', { length: 500 }).default(''), // URL/path logo
  currency: varchar('currency', { length: 10 }).notNull().default('IDR'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Jakarta'),
  language: varchar('language', { length: 10 }).notNull().default('id'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
});

// tax_settings — konfigurasi pajak
export const taxSettings = mysqlTable('tax_settings', {
  id: serial('id').primaryKey(),
  taxName: varchar('tax_name', { length: 50 }).notNull().default('Pajak'), // PPN, PB1, dll
  taxPercentage: decimal('tax_percentage', { precision: 5, scale: 2 }).notNull().default('10.00'),
  taxType: mysqlEnum('tax_type', ['exclusive', 'inclusive']).notNull().default('exclusive'),
  isTaxEnabled: boolean('is_tax_enabled').notNull().default(true),
  updatedAt: datetime('updated_at'),
});

// payment_methods — metode pembayaran
export const paymentMethods = mysqlTable('payment_methods', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // cash, card, qris, gopay, ovo, dana
  name: varchar('name', { length: 100 }).notNull(), // Cash, Kartu Debit/Kredit, QRIS, GoPay, OVO, Dana
  icon: varchar('icon', { length: 100 }).default(''), // icon class atau path
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

// receipt_settings — template struk
export const receiptSettings = mysqlTable('receipt_settings', {
  id: serial('id').primaryKey(),
  paperSize: mysqlEnum('paper_size', ['58mm', '80mm']).notNull().default('80mm'),
  headerText: varchar('header_text', { length: 500 }).default(''), // Teks custom di atas struk
  footerText: varchar('footer_text', { length: 500 }).default('Terima kasih atas kunjungan Anda!'),
  showBusinessName: boolean('show_business_name').notNull().default(true),
  showAddress: boolean('show_address').notNull().default(true),
  showPhone: boolean('show_phone').notNull().default(true),
  showCashierName: boolean('show_cashier_name').notNull().default(true),
  showTableNumber: boolean('show_table_number').notNull().default(true),
  showOrderTime: boolean('show_order_time').notNull().default(true),
  showTaxBreakdown: boolean('show_tax_breakdown').notNull().default(true),
  showThankYouMessage: boolean('show_thank_you').notNull().default(true),
  receiptPrefix: varchar('receipt_prefix', { length: 20 }).default('INV'), // Prefix nomor struk
  receiptSuffix: varchar('receipt_suffix', { length: 20 }).default(''), // Suffix nomor struk
  nextReceiptNumber: int('next_receipt_number').notNull().default(1),
  updatedAt: datetime('updated_at'),
});

// operating_hours — jam operasional
export const operatingHours = mysqlTable('operating_hours', {
  id: serial('id').primaryKey(),
  dayOfWeek: int('day_of_week').notNull(), // 0=Senin, 6=Minggu
  openTime: varchar('open_time', { length: 5 }).notNull().default('09:00'), // HH:MM
  closeTime: varchar('close_time', { length: 5 }).notNull().default('22:00'), // HH:MM
  isOpen: boolean('is_open').notNull().default(true),
});
```

---

## Tahap 2: Repository Functions

Buat `src/repositories/settings.ts`:

```typescript
// Business Settings
export async function getBusinessSettings()
export async function updateBusinessSettings(data: Partial<BusinessSettings>)

// Tax Settings
export async function getTaxSettings()
export async function updateTaxSettings(data: Partial<TaxSettings>)

// Payment Methods
export async function getAllPaymentMethods()
export async function getActivePaymentMethods()
export async function updatePaymentMethod(id: number, data: Partial<PaymentMethod>)
export async function togglePaymentMethod(id: number)

// Receipt Settings
export async function getReceiptSettings()
export async function updateReceiptSettings(data: Partial<ReceiptSettings>)
export async function getNextReceiptNumber() // Auto-increment

// Operating Hours
export async function getOperatingHours()
export async function updateOperatingHours(dayOfWeek: number, data: Partial<OperatingHours>)
export async function isCurrentlyOpen() // Check if business is open now

// Utility
export async function getAllSettings() // Get all settings in one call
```

---

## Tahap 3: API Endpoints

Buat `src/routes/settings.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/settings/business` | super_admin, admin_restoran | Get info bisnis |
| PUT | `/api/settings/business` | super_admin, admin_restoran | Update info bisnis |
| GET | `/api/settings/tax` | super_admin, admin_restoran | Get pengaturan pajak |
| PUT | `/api/settings/tax` | super_admin, admin_restoran | Update pengaturan pajak |
| GET | `/api/settings/payments` | super_admin, admin_restoran | Get semua metode pembayaran |
| PUT | `/api/settings/payments/:id` | super_admin, admin_restoran | Update metode pembayaran |
| PATCH | `/api/settings/payments/:id/toggle` | super_admin, admin_restoran | Toggle aktif/nonaktif |
| GET | `/api/settings/receipt` | super_admin, admin_restoran | Get template struk |
| PUT | `/api/settings/receipt` | super_admin, admin_restoran | Update template struk |
| GET | `/api/settings/hours` | super_admin, admin_restoran | Get jam operasional |
| PUT | `/api/settings/hours/:day` | super_admin, admin_restoran | Update jam operasional |
| GET | `/api/settings/all` | super_admin, admin_restoran | Get semua settings sekaligus |
| GET | `/api/settings/public/is-open` | Public | Cek apakah restoran buka |

---

## Tahap 4: UI — Halaman Settings

Buat `src/pages/settings.ts` dengan layout tab/section:

### Tab 1: Info Bisnis
```
┌─────────────────────────────────────────────────────────┐
│ Informasi Bisnis                                        │
├─────────────────────────────────────────────────────────┤
│ Nama Restoran    [  Resto Saya            ]             │
│ Tagline          [  Makanan Enak & Murah  ]             │
│ Alamat           [  Jl. Contoh No. 123    ]             │
│                  [  Jakarta, Indonesia     ]             │
│ Telepon          [  021-12345678          ]             │
│ Email            [  info@resto.com        ]             │
│ Logo             [  📷 Upload Logo        ]             │
│ Mata Uang        [  IDR ▼                 ]             │
│ Timezone         [  Asia/Jakarta ▼        ]             │
│ Bahasa           [  Indonesia ▼           ]             │
│                                                         │
│                        [Simpan Perubahan]               │
└─────────────────────────────────────────────────────────┘
```

### Tab 2: Pengaturan Pajak
```
┌─────────────────────────────────────────────────────────┐
│ Pengaturan Pajak                                        │
├─────────────────────────────────────────────────────────┤
│ Aktifkan Pajak   [✓]                                     │
│ Nama Pajak       [  PPN    ▼            ]               │
│ Tipe Pajak       [  Exclusive ▼         ]               │
│ Persentase       [  11.00  ] %                          │
│                                                         │
│ Preview:                                                │
│ Subtotal:    Rp 100.000                                 │
│ PPN (11%):   Rp  11.000                                 │
│ Total:       Rp 111.000                                 │
│                                                         │
│                        [Simpan Perubahan]               │
└─────────────────────────────────────────────────────────┘
```

### Tab 3: Metode Pembayaran
```
┌─────────────────────────────────────────────────────────┐
│ Metode Pembayaran                                       │
├─────────────────────────────────────────────────────────┤
│ Metode              │ Status   │ Aksi                   │
│─────────────────────┼──────────┼────────────────────────│
│ 💵 Cash             │ [✓] Aktif│                        │
│ 💳 Kartu Debit      │ [✓] Aktif│ [Edit]                 │
│ 💳 Kartu Kredit     │ [✓] Aktif│ [Edit]                 │
│ 📱 QRIS             │ [✓] Aktif│ [Edit]                 │
│ 🟢 GoPay            │ [ ] Nonaktif│ [Edit]              │
│ 🟣 OVO              │ [ ] Nonaktif│ [Edit]              │
│ 🔵 Dana             │ [ ] Nonaktif│ [Edit]              │
│ 🟠 ShopeePay        │ [ ] Nonaktif│ [Edit]              │
└─────────────────────────────────────────────────────────┘
```

### Tab 4: Template Struk
```
┌─────────────────────────────────────────────────────────┐
│ Template Struk                                          │
├─────────────────────────────────────────────────────────┤
│ Ukuran Kertas    [  80mm ▼              ]               │
│ Prefix No. Struk [  INV                  ]              │
│ Suffix No. Struk [                         ]            │
│ No. Struk Berikutnya [  1001             ]              │
│                                                         │
│ Tampilkan di Struk:                                     │
│ [✓] Nama Bisnis                                         │
│ [✓] Alamat                                              │
│ [✓] Telepon                                             │
│ [✓] Nama Kasir                                          │
│ [✓] Nomor Meja                                          │
│ [✓] Waktu Pesanan                                       │
│ [✓] Detail Pajak                                        │
│ [✓] Pesan Terima Kasih                                  │
│                                                         │
│ Header Custom:     [  __________________  ]             │
│ Footer Custom:     [  Terima kasih!       ]             │
│                                                         │
│ Preview Struk:                                          │
│ ┌──────────────────────┐                                │
│ │   RESTO SAYA         │                                │
│ │   Jl. Contoh No. 123 │                                │
│ │   Telp: 021-12345678 │                                │
│ │──────────────────────│                                │
│ │ INV-1001             │                                │
│ │ Meja 5 | Kasir: Budi │                                │
│ │ 04/04/2026 12:30     │                                │
│ │                      │                                │
│ │ Nasi Goreng    25.000│                                │
│ │ Es Teh          5.000│                                │
│ │──────────────────────│                                │
│ │ Subtotal       30.000│                                │
│ │ PPN (11%)       3.300│                                │
│ │ TOTAL         33.300 │                                │
│ │                      │                                │
│ │ Terima kasih!        │                                │
│ └──────────────────────┘                                │
│                                                         │
│                        [Simpan Perubahan]               │
└─────────────────────────────────────────────────────────┘
```

### Tab 5: Jam Operasional
```
┌─────────────────────────────────────────────────────────┐
│ Jam Operasional                                         │
├─────────────────────────────────────────────────────────┤
│ Hari       │ Buka    │ Tutup   │ Status                 │
│────────────┼─────────┼─────────┼────────────────────────│
│ Senin      │ 09:00   │ 22:00   │ [✓] Buka               │
│ Selasa     │ 09:00   │ 22:00   │ [✓] Buka               │
│ Rabu       │ 09:00   │ 22:00   │ [✓] Buka               │
│ Kamis      │ 09:00   │ 22:00   │ [✓] Buka               │
│ Jumat      │ 09:00   │ 23:00   │ [✓] Buka               │
│ Sabtu      │ 08:00   │ 23:00   │ [✓] Buka               │
│ Minggu     │ 08:00   │ 22:00   │ [✓] Buka               │
│                                                         │
│ Status Saat Ini: 🟢 BUKA (tutup pukul 22:00)            │
│                                                         │
│                        [Simpan Perubahan]               │
└─────────────────────────────────────────────────────────┘
```

---

## Tahap 5: Integrasi dengan Modul Lain

### POS Module
- Gunakan `getActivePaymentMethods()` untuk tampilkan opsi pembayaran
- Gunakan `getTaxSettings()` untuk hitung pajak di checkout
- Gunakan `getNextReceiptNumber()` untuk generate nomor struk
- Gunakan `getReceiptSettings()` untuk format struk

### Dashboard
- Tampilkan status "BUKA" / "TUTUP" berdasarkan `isCurrentlyOpen()`
- Tampilkan nama bisnis di header

### Orders
- Validasi pesanan hanya bisa dibuat saat `isCurrentlyOpen() === true`
- Simpan `payment_method` yang dipilih ke orders table

### Receipt/Print
- Gunakan `receiptSettings` untuk generate struk
- Auto-increment `nextReceiptNumber` setelah struk diprint

---

## Tahap 6: Testing

### Skenario Test

1. **Update info bisnis** — Nama, alamat, telepon tersimpan dan tampil di struk
2. **Update pajak** — Persentase berubah, perhitungan di POS update otomatis
3. **Toggle pajak** — Nonaktifkan pajak → tidak ada pajak di struk
4. **Toggle metode pembayaran** — Nonaktifkan GoPay → tidak muncul di POS
5. **Update template struk** — Header/footer custom tampil di preview
6. **Update jam operasional** — Ubah jam → `isCurrentlyOpen()` return sesuai
7. **Nomor struk** — Auto-increment setelah setiap transaksi
8. **Role access** — Kasir tidak bisa akses halaman settings
9. **Preview struk** — Update settings → preview update real-time
10. **Public endpoint** — `/api/settings/public/is-open` bisa diakses tanpa auth

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | **Update** — tambah 5 tabel baru |
| `src/repositories/settings.ts` | **BARU** — semua fungsi settings |
| `src/routes/settings.ts` | **BARU** — API endpoints |
| `src/routes/index.ts` | **Update** — register settings routes |
| `src/pages/settings.ts` | **BARU** — halaman settings (5 tab) |
| `src/index.ts` | **Update** — register settings page |
| `src/templates/sidebar.ts` | **Update** — tambah menu Settings |
| `src/repositories/order.ts` | **Update** — integrasi receipt number & tax |
| `src/pages/pos.ts` | **Update** — gunakan payment methods & tax settings |

---

## Catatan Penting

- **Settings harus di-cache** — jangan query database setiap kali butuh tax rate
- **Default settings** — saat pertama kali deploy, isi dengan default yang masuk akal
- **Audit trail** — catat setiap perubahan settings (siapa, kapan, apa yang diubah)
- **Validasi input** — persentase pajak 0-100, jam dalam format HH:MM
- **Estimasi total**: 4-6 jam kerja
