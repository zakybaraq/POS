# Sub-Issue 1.2: Customer Management

## Parent Issue
[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Restoran nyata perlu mengenal pelanggannya. Tanpa customer management:
- Tidak tahu siapa pelanggan setia
- Tidak bisa track riwayat belanja per pelanggan
- Tidak ada program loyalty/member
- Tidak bisa kirim promo ke pelanggan spesifik
- Tidak ada data untuk keputusan bisnis

Modul ini adalah **modul kedua terpenting** setelah Inventory.

---

## Scope

### Yang HARUS ada (MVP)
1. **CRUD Pelanggan** — Nama, telepon, email, alamat, tanggal lahir
2. **Riwayat Belanja** — Semua transaksi per pelanggan (tanggal, total, item)
3. **Membership Tier** — Regular, Silver, Gold (auto-upgrade berdasarkan total belanja)
4. **Loyalty Points** — 1 poin per Rp 10.000 belanja, redeem poin untuk diskon
5. **Search & Filter** — Cari berdasarkan nama/telepon, filter berdasarkan tier
6. **Stats Cards** — Total pelanggan, member aktif, total poin beredar

### Yang NANTI bisa ditambahkan (Phase 2)
- Birthday promo (auto-diskon saat ulang tahun)
- Email/SMS blast promo
- Customer notes (catatan preferensi: "suka pedas", "alergi kacang")
- Referral program

---

## Tahap 1: Database Schema

Buat 3 tabel baru di `src/db/schema.ts`:

### `customers` — Data Pelanggan
```typescript
export const customers = mysqlTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 500 }),
  birthDate: date('birth_date'),
  totalSpent: int('total_spent').notNull().default(0),
  totalVisits: int('total_visits').notNull().default(0),
  loyaltyPoints: int('loyalty_points').notNull().default(0),
  tier: mysqlEnum('tier', ['regular', 'silver', 'gold']).notNull().default('regular'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  phoneIdx: index('idx_customers_phone').on(table.phone),
  tierIdx: index('idx_customers_tier').on(table.tier),
}));
```

### `loyalty_transactions` — Riwayat Poin
```typescript
export const loyaltyTransactions = mysqlTable('loyalty_transactions', {
  id: serial('id').primaryKey(),
  customerId: int('customer_id').notNull(),
  type: mysqlEnum('type', ['earn', 'redeem']).notNull(),
  points: int('points').notNull(),
  referenceId: int('reference_id'), // order_id
  reason: varchar('reason', { length: 255 }),
  createdAt: datetime('created_at').notNull().default(new Date()),
});
```

### SQL Migration
```sql
CREATE TABLE customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  address VARCHAR(500),
  birth_date DATE,
  total_spent INT NOT NULL DEFAULT 0,
  total_visits INT NOT NULL DEFAULT 0,
  loyalty_points INT NOT NULL DEFAULT 0,
  tier ENUM('regular', 'silver', 'gold') NOT NULL DEFAULT 'regular',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME,
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_tier (tier)
);

CREATE TABLE loyalty_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  type ENUM('earn', 'redeem') NOT NULL,
  points INT NOT NULL,
  reference_id INT,
  reason VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT NOW()
);
```

---

## Tahap 2: Repository Functions

Buat `src/repositories/customer.ts`:

```typescript
// CRUD
export async function getAllCustomers()
export async function getCustomerById(id: number)
export async function getCustomerByPhone(phone: string)
export async function createCustomer(data: NewCustomer)
export async function updateCustomer(id: number, data: Partial<NewCustomer>)
export async function deleteCustomer(id: number)

// Stats
export async function getCustomerStats() // total, active, by tier

// Loyalty
export async function addLoyaltyPoints(customerId: number, points: number, orderId?: number)
export async function redeemLoyaltyPoints(customerId: number, points: number, reason?: string)
export async function getLoyaltyTransactions(customerId: number, limit?: number)

// Auto tier upgrade
export async function updateCustomerTier(customerId: number)
// Silver: totalSpent >= 500.000
// Gold: totalSpent >= 2.000.000
```

---

## Tahap 3: API Endpoints

Buat `src/routes/customers.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/customers` | super_admin, admin_restoran, kasir | List semua pelanggan |
| GET | `/api/customers/stats` | super_admin, admin_restoran | Stats pelanggan |
| GET | `/api/customers/:id` | super_admin, admin_restoran, kasir | Detail pelanggan |
| GET | `/api/customers/:id/history` | super_admin, admin_restoran | Riwayat belanja |
| GET | `/api/customers/:id/loyalty` | super_admin, admin_restoran | Riwayat poin |
| POST | `/api/customers` | super_admin, admin_restoran, kasir | Tambah pelanggan |
| PUT | `/api/customers/:id` | super_admin, admin_restoran | Update pelanggan |
| DELETE | `/api/customers/:id` | super_admin | Hapus pelanggan |
| POST | `/api/customers/:id/loyalty/earn` | super_admin, admin_restoran | Tambah poin |
| POST | `/api/customers/:id/loyalty/redeem` | super_admin, admin_restoran | Tukar poin |
| GET | `/api/customers/search/:phone` | semua | Cari pelanggan by telepon (untuk POS) |

---

## Tahap 4: UI — Halaman Customers

Buat `src/pages/customers.ts` dengan 2 tab:

### Tab 1: Daftar Pelanggan
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🔍 Cari pelanggan...]  [Semua Tier ▼]  [Export]    [+ Tambah]         │
├─────────────────────────────────────────────────────────────────────────┤
│ Nama        │ Telepon    │ Tier   │ Poin  │ Total Belanja │ Kunjungan  │
│ Budi Santoso│ 0812345678 │ 🥇 Gold│ 250   │ Rp 2.500.000  │ 45x        │
│ Siti Aminah │ 0823456789 │ 🥈 Silver│ 80 │ Rp 800.000    │ 12x        │
│ Ahmad Rizki │ 0834567890 │ 🥉 Regular│ 5 │ Rp 50.000     │ 1x         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 2: Detail Pelanggan (klik baris)
```
┌──────────────────────────────────────────────┐
│ 👤 Budi Santoso — 🥇 Gold Member            │
│ 📞 0812345678 | ✉️ budi@email.com           │
│ 📍 Jl. Contoh No. 123                        │
│ 🎂 15 Maret                                  │
├──────────────────────────────────────────────┤
│ Total Belanja: Rp 2.500.000                  │
│ Kunjungan: 45x                               │
│ Poin Loyalty: 250 poin (= Rp 25.000)        │
├──────────────────────────────────────────────┤
│ Riwayat Belanja:                             │
│ 04/04 - Order #12 - Rp 85.000 - Selesai     │
│ 03/04 - Order #8  - Rp 120.000 - Selesai    │
│ 02/04 - Order #5  - Rp 45.000  - Selesai    │
└──────────────────────────────────────────────┘
```

---

## Tahap 5: Integrasi dengan POS

### Pilih Pelanggan saat Checkout

Di halaman POS, tambah field "Pelanggan" di cart:

```
┌─────────────────────────────────┐
│ 📋 Meja 5 — Dine-in             │
│ 👤 Pelanggan: [Cari...]         │
│                                 │
│ [Item list...]                  │
│                                 │
│ Subtotal: Rp 85.000             │
│ Poin yang didapat: +8 poin      │
│ [💳 Bayar]                      │
└─────────────────────────────────┘
```

### Auto Earn Points saat Pembayaran

Di `src/routes/orders.ts`, pada endpoint `POST /api/orders/with-items` dan `POST /api/orders/:id/pay`:

```typescript
// Setelah pembayaran berhasil
if (order.customerId) {
  const pointsEarned = Math.floor(order.total / 10000); // 1 poin per 10K
  await customerRepo.addLoyaltyPoints(order.customerId, pointsEarned, order.id);
  await customerRepo.updateCustomerVisit(order.customerId, order.total);
}
```

---

## Tahap 6: Stats di Dashboard

Tambahkan ringkasan pelanggan di dashboard:

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Pelanggan│ │  Gold   │ │ Poin    │
│   156   │ │   12    │ │ 2.450   │
└─────────┘ └─────────┘ └─────────┘
```

---

## Tahap 7: Testing

### Skenario Test
1. **CRUD Pelanggan** — Tambah, edit, hapus → data tersimpan benar
2. **Search** — Cari by nama/telepon → hasil benar
3. **Filter tier** — Filter Gold/Silver/Regular → tabel ter-filter
4. **Auto tier upgrade** — Total belanja mencapai threshold → tier naik otomatis
5. **Earn points** — Pembayaran di POS → poin bertambah
6. **Redeem points** — Tukar poin → poin berkurang, diskon diterapkan
7. **Loyalty history** — Semua transaksi poin tercatat
8. **POS integration** — Pilih pelanggan di POS → data tersimpan di order
9. **Stats** — Angka di dashboard sesuai dengan data

---

## File yang Perlu Diubah/Dibuat

| File | Aksi |
|------|------|
| `src/db/schema.ts` | **Update** — tambah 2 tabel baru |
| `src/repositories/customer.ts` | **BARU** — semua fungsi customer |
| `src/routes/customers.ts` | **BARU** — API endpoints |
| `src/routes/index.ts` | **Update** — register customer routes |
| `src/routes/orders.ts` | **Update** — tambah customerId + earn points |
| `src/pages/customers.ts` | **BARU** — halaman customers (2 tab) |
| `src/pages/pos.ts` | **Update** — tambah field pelanggan di cart |
| `src/pages/dashboard.ts` | **Update** — tambah customer stats |
| `src/templates/sidebar.ts` | **Update** — tambah menu Customers |

## Catatan Penting

- **Phone harus unik** — 1 nomor = 1 pelanggan
- **Tier auto-upgrade**: Regular → Silver (Rp 500K) → Gold (Rp 2M)
- **Poin tidak bisa minus** — Redeem hanya jika poin cukup
- **1 poin = Rp 100** (1 poin per Rp 10.000 belanja)
- **JANGAN hapus** fitur yang sudah ada
- **Estimasi total**: 6-8 jam kerja
