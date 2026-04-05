# Sub-Issue 1.5: Supplier & Purchase Order — Manajemen Supplier dan Pemesanan Barang

## Parent Issue

[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Restoran membutuhkan pasokan bahan baku secara berkala. Tanpa sistem Supplier & PO:

- Tidak tahu supplier mana yang menyediakan bahan apa
- Tidak ada riwayat pemesanan per supplier
- Pemesanan masih manual (WA, telepon) tanpa tracking
- Tidak ada data harga beli per supplier untuk perbandingan
- Penerimaan barang tidak tercatat → stok tidak akurat
- Tidak ada dokumen PO sebagai bukti pemesanan
- Sulit hitung COGS (Cost of Goods Sold) tanpa data harga beli

Modul ini terintegrasi langsung dengan **Inventory Management** — saat barang diterima, stok otomatis bertambah.

---

## Scope

### Yang HARUS ada (MVP)

1. **CRUD Supplier** — Nama, kontak, alamat, kategori bahan yang disediakan
2. **CRUD Purchase Order** — Buat PO, pilih supplier, tambah item, status tracking
3. **Penerimaan Barang** — Terima barang → update stok inventory otomatis
4. **Riwayat PO** — Lihat semua PO, filter by status/supplier/tanggal
5. **Harga Beli per Supplier** — Simpan harga terakhir beli per item

### Yang NANTI bisa ditambahkan (Phase 2)

- Print PO (PDF)
- Email PO ke supplier
- Multi-currency untuk supplier luar negeri
- Approval workflow (PO perlu disetujui manager)
- Return barang ke supplier
- Supplier performance rating
- Auto-generate PO saat stok di bawah minimum
- Purchase analytics (total belanja per supplier, tren harga)

---

## Tahap 1: Database Schema

Tambahkan ke `src/db/schema.ts`:

```typescript
// suppliers — data supplier
export const suppliers = mysqlTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 100 }).default(''),
  phone: varchar('phone', { length: 20 }).default(''),
  email: varchar('email', { length: 255 }).default(''),
  address: varchar('address', { length: 500 }).default(''),
  category: varchar('category', { length: 100 }).default(''), // Bahan Makanan, Minuman, Packaging, dll
  notes: varchar('notes', { length: 500 }).default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  nameIdx: index('idx_suppliers_name').on(table.name),
}));

// purchase_orders — header PO
export const purchaseOrders = mysqlTable('purchase_orders', {
  id: serial('id').primaryKey(),
  poNumber: varchar('po_number', { length: 50 }).notNull().unique(), // PO-20260405-001
  supplierId: int('supplier_id').notNull(),
  orderDate: datetime('order_date').notNull().default(new Date()),
  expectedDeliveryDate: datetime('expected_delivery_date'),
  status: mysqlEnum('status', ['draft', 'ordered', 'received', 'cancelled']).notNull().default('draft'),
  subtotal: int('subtotal').notNull().default(0),
  notes: varchar('notes', { length: 500 }).default(''),
  receivedDate: datetime('received_date'),
  receivedBy: int('received_by'), // user_id yang menerima
  createdBy: int('created_by').notNull(), // user_id yang membuat
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  supplierIdIdx: index('idx_po_supplier_id').on(table.supplierId),
  statusIdx: index('idx_po_status').on(table.status),
  orderDateIdx: index('idx_po_order_date').on(table.orderDate),
}));

// purchase_order_items — item per PO
export const purchaseOrderItems = mysqlTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  poId: int('po_id').notNull(),
  ingredientId: int('ingredient_id').notNull(), // FK ke ingredients
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(), // kg, liter, pcs, dll
  unitPrice: int('unit_price').notNull(), // harga beli per unit
  totalPrice: int('total_price').notNull(), // quantity * unitPrice
  quantityReceived: decimal('quantity_received', { precision: 10, scale: 2 }).default('0'),
  notes: varchar('notes', { length: 255 }).default(''),
}, (table) => ({
  poIdIdx: index('idx_poi_po_id').on(table.poId),
  ingredientIdIdx: index('idx_poi_ingredient_id').on(table.ingredientId),
}));

// supplier_prices — riwayat harga beli per supplier per item
export const supplierPrices = mysqlTable('supplier_prices', {
  id: serial('id').primaryKey(),
  supplierId: int('supplier_id').notNull(),
  ingredientId: int('ingredient_id').notNull(),
  price: int('price').notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  lastOrderedAt: datetime('last_ordered_at').notNull().default(new Date()),
}, (table) => ({
  supplierIngredientIdx: index('idx_sp_supplier_ingredient').on(table.supplierId, table.ingredientId),
}));
```

---

## Tahap 2: Repository Functions

Buat `src/repositories/supplier.ts`:

```typescript
// Suppliers
export async function getAllSuppliers()
export async function getActiveSuppliers()
export async function getSupplierById(id: number)
export async function createSupplier(data: NewSupplier)
export async function updateSupplier(id: number, data: Partial<Supplier>)
export async function deleteSupplier(id: number)
export async function getSuppliersByCategory(category: string)

// Purchase Orders
export async function getAllPOs()
export async function getPOById(id: number)
export async function getPOByNumber(poNumber: string)
export async function createPO(data: { supplierId, items, notes, expectedDeliveryDate, createdBy })
export async function updatePOStatus(id: number, status: 'ordered' | 'received' | 'cancelled')
export async function receivePO(id: number, receivedBy: number) // Terima barang → update stok
export async function getPOsBySupplier(supplierId: number)
export async function getPOsByStatus(status: string)
export async function getPOsByDateRange(startDate: string, endDate: string)
export async function generatePONumber() // Auto-generate: PO-YYYYMMDD-XXX

// Supplier Prices
export async function getSupplierPrice(supplierId: number, ingredientId: number)
export async function updateSupplierPrice(supplierId: number, ingredientId: number, price: number, unit: string)
export async function getSupplierPriceHistory(supplierId: number, ingredientId: number)
export async function getBestPriceForIngredient(ingredientId: number) // Supplier dengan harga termurah
```

---

## Tahap 3: API Endpoints

Buat `src/routes/suppliers.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/suppliers` | super_admin, admin_restoran | Get semua supplier |
| GET | `/api/suppliers/:id` | super_admin, admin_restoran | Get detail supplier |
| POST | `/api/suppliers` | super_admin, admin_restoran | Buat supplier baru |
| PUT | `/api/suppliers/:id` | super_admin, admin_restoran | Update supplier |
| DELETE | `/api/suppliers/:id` | super_admin, admin_restoran | Hapus supplier |
| GET | `/api/suppliers/:id/prices` | super_admin, admin_restoran | Get harga supplier per item |

Buat `src/routes/purchase-orders.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/purchase-orders` | super_admin, admin_restoran | Get semua PO |
| GET | `/api/purchase-orders/:id` | super_admin, admin_restoran | Get detail PO + items |
| POST | `/api/purchase-orders` | super_admin, admin_restoran | Buat PO baru |
| PUT | `/api/purchase-orders/:id` | super_admin, admin_restoran | Update PO (draft only) |
| PATCH | `/api/purchase-orders/:id/status` | super_admin, admin_restoran | Update status PO |
| POST | `/api/purchase-orders/:id/receive` | super_admin, admin_restoran | Terima barang (update stok) |
| GET | `/api/purchase-orders/supplier/:supplierId` | super_admin, admin_restoran | Get PO by supplier |
| GET | `/api/purchase-orders/best-price/:ingredientId` | super_admin, admin_restoran | Get harga termurah per item |

---

## Tahap 4: UI — Halaman Suppliers

Buat `src/pages/suppliers.ts`:

### Daftar Supplier
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Supplier                                          [➕ Tambah Supplier]          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Cari supplier...                                [Filter: Semua Kategori ▼]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Nama              │ Kontak      │ Telepon      │ Kategori       │ Aksi          │
│───────────────────┼─────────────┼──────────────┼────────────────┼───────────────│
│ PT. Segar Jaya    │ Budi        │ 0812-xxxx    │ Bahan Makanan  │ [Edit][PO]    │
│ CV. Minuman Nusantara│ Siti     │ 0813-xxxx    │ Minuman        │ [Edit][PO]    │
│ UD. Kemasan Bagus  │ Andi        │ 0857-xxxx    │ Packaging      │ [Edit][PO]    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Form Tambah/Edit Supplier
```
┌─────────────────────────────────────────────────────────┐
│ Tambah Supplier Baru                                    │
├─────────────────────────────────────────────────────────┤
│ Nama Supplier     [  PT. Segar Jaya        ] *          │
│ Contact Person    [  Budi                  ]            │
│ Telepon           [  0812-1234-5678        ] *          │
│ Email             [  budi@segarjaya.com    ]            │
│ Alamat            [  Jl. Pasar No. 45      ]            │
│                   [  Jakarta Timur          ]            │
│ Kategori          [  Bahan Makanan ▼       ]            │
│ Catatan           [  Supplier utama untuk  ]            │
│                   [  sayur dan buah segar   ]            │
│                                                         │
│              [Batal]          [Simpan Supplier]         │
└─────────────────────────────────────────────────────────┘
```

### Detail Supplier + Riwayat PO
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PT. Segar Jaya                                    [✏️ Edit]  [➕ Buat PO]       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📞 0812-1234-5678  │  📧 budi@segarjaya.com  │  📍 Jl. Pasar No. 45, Jakarta   │
│ Kategori: Bahan Makanan  │  Status: ✅ Aktif                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Harga Terakhir:                                                                 │
│ Item              │ Harga      │ Unit  │ Terakhir Beli                          │
│───────────────────┼────────────┼───────┼───────────────────────────────────────│
│ Beras             │ Rp 12.000  │ kg    │ 01/04/2026                            │
│ Ayam Potong       │ Rp 35.000  │ kg    │ 28/03/2026                            │
│ Wortel            │ Rp 8.000   │ kg    │ 01/04/2026                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Riwayat Purchase Order:                                                         │
│ No. PO       │ Tanggal    │ Total        │ Status      │ Diterima               │
│──────────────┼────────────┼──────────────┼─────────────┼────────────────────────│
│ PO-20260401-001│ 01/04/2026│ Rp 2.500.000│ ✅ Diterima │ 02/04/2026             │
│ PO-20260325-003│ 25/03/2026│ Rp 1.800.000│ ✅ Diterima │ 26/03/2026             │
│ PO-20260320-002│ 20/03/2026│ Rp 3.200.000│ ✅ Diterima │ 21/03/2026             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tahap 5: UI — Halaman Purchase Orders

Buat `src/pages/purchase-orders.ts`:

### Daftar PO
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Purchase Order                                          [➕ Buat PO Baru]       │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Cari PO...      [Filter: Semua Status ▼]  [📅 01/04/2026] - [📅 05/04/2026] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ No. PO         │ Supplier         │ Tanggal    │ Total         │ Status         │
│────────────────┼──────────────────┼────────────┼───────────────┼────────────────│
│ PO-20260405-001│ PT. Segar Jaya   │ 05/04/2026 │ Rp 2.500.000  │ 🟡 Ordered     │
│ PO-20260401-001│ PT. Segar Jaya   │ 01/04/2026 │ Rp 2.500.000  │ ✅ Received    │
│ PO-20260328-002│ CV. Minuman      │ 28/03/2026 │ Rp 800.000    │ ✅ Received    │
│ PO-20260325-001│ UD. Kemasan Bagus │ 25/03/2026 │ Rp 500.000    │ ❌ Cancelled   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Form Buat PO
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Buat Purchase Order Baru                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Supplier          [  PT. Segar Jaya ▼      ] *                                  │
│ Tanggal Order     [  05/04/2026            ]                                    │
│ Estimasi Tiba     [  06/04/2026            ]                                    │
│ Catatan           [                         ]                                   │
│                                                                                 │
│ Item Pesanan:                                                                   │
│ ┌────────────────┬──────────┬──────┬────────────┬──────────────┬────────────┐   │
│ │ Bahan Baku     │ Qty      │ Unit │ Harga/Unit │ Total        │ Aksi       │   │
│ ├────────────────┼──────────┼──────┼────────────┼──────────────┼────────────┤   │
│ │ Beras          │ 100      │ kg   │ Rp 12.000  │ Rp 1.200.000 │ [🗑️]       │   │
│ │ Ayam Potong    │ 50       │ kg   │ Rp 35.000  │ Rp 1.750.000 │ [🗑️]       │   │
│ │ Wortel         │ 30       │ kg   │ Rp 8.000   │ Rp   240.000 │ [🗑️]       │   │
│ └────────────────┴──────────┴──────┴────────────┴──────────────┴────────────┘   │
│                                    [+ Tambah Item]                              │
│                                                                                 │
│ Subtotal: Rp 3.190.000                                                          │
│                                                                                 │
│              [Simpan Draft]     [Kirim PO]                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Detail PO + Terima Barang
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PO-20260405-001                                    Status: 🟡 Ordered           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Supplier: PT. Segar Jaya                                                    │
│ Tanggal Order: 05/04/2026  │  Estimasi Tiba: 06/04/2026                      │
│ Dibuat oleh: Admin  │  Catatan: -                                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Item:                                                                           │
│ Bahan Baku     │ Qty Pesan │ Qty Diterima │ Harga/Unit │ Total       │ Status   │
│────────────────┼───────────┼──────────────┼────────────┼─────────────┼──────────│
│ Beras          │ 100 kg    │ -            │ Rp 12.000  │ Rp 1.200.000│ Pending  │
│ Ayam Potong    │ 50 kg     │ -            │ Rp 35.000  │ Rp 1.750.000│ Pending  │
│ Wortel         │ 30 kg     │ -            │ Rp 8.000   │ Rp   240.000│ Pending  │
├────────────────┼───────────┼──────────────┼────────────┼─────────────┼──────────│
│ Subtotal: Rp 3.190.000                                                          │
│                                                                                 │
│              [Batalkan PO]     [✅ Terima Barang]                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Modal Terima Barang
```
┌─────────────────────────────────────────────────────────┐
│ Terima Barang — PO-20260405-001                         │
├─────────────────────────────────────────────────────────┤
│ Konfirmasi penerimaan barang:                           │
│                                                         │
│ Item             │ Pesan  │ Diterima │                  │
│──────────────────┼────────┼──────────┤                  │
│ Beras            │ 100 kg │ [100] kg │ ✅ Sesuai        │
│ Ayam Potong      │ 50 kg  │ [48] kg  │ ⚠️ Kurang 2 kg   │
│ Wortel           │ 30 kg  │ [30] kg  │ ✅ Sesuai        │
│                                                         │
│ Catatan Penerimaan:                                     │
│ [  Ayam kurang 2 kg, supplier janji kirim besok  ]     │
│                                                         │
│           [Batal]          [Konfirmasi Penerimaan]     │
└─────────────────────────────────────────────────────────┘
```

Setelah konfirmasi:
- Status PO → `received`
- Stok ingredients otomatis bertambah sesuai qty diterima
- Supplier prices terupdate dengan harga terakhir
- Stock movements tercatat (type: 'in')

---

## Tahap 6: Integrasi dengan Modul Lain

### Inventory Module
- Saat PO diterima → `incrementStock(ingredientId, quantityReceived)`
- Catat stock movement dengan type 'in' dan reference ke PO
- Update `supplier_prices` dengan harga terakhir

### Dashboard
- Tampilkan ringkasan: total PO bulan ini, PO pending, total belanja
- Alert: PO yang belum diterima melebihi estimasi tanggal

### Reporting (Phase 2)
- Laporan belanja per supplier
- Laporan harga beli per item (tren harga)
- Supplier performance (on-time delivery, accuracy)

---

## Tahap 7: Testing

### Skenario Test

1. **CRUD Supplier** — Tambah, edit, hapus supplier berhasil
2. **Buat PO** — Pilih supplier, tambah item, simpan sebagai draft
3. **Kirim PO** — Status berubah dari draft → ordered
4. **Terima Barang** — Input qty diterima → stok inventory bertambah
5. **Terima Partial** — Qty diterima < qty pesan → stok sesuai qty diterima
6. **Batalkan PO** — Status berubah ke cancelled, stok tidak berubah
7. **Auto-generate PO Number** — Format PO-YYYYMMDD-XXX unik dan increment
8. **Update Supplier Price** — Harga terakhir tersimpan saat PO diterima
9. **Best Price** — Menampilkan supplier dengan harga termurah per item
10. **Role Access** — Kasir/waitress/chef tidak bisa akses modul ini

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | **Update** — tambah 4 tabel baru |
| `src/repositories/supplier.ts` | **BARU** — semua fungsi supplier & PO |
| `src/routes/suppliers.ts` | **BARU** — API endpoints supplier |
| `src/routes/purchase-orders.ts` | **BARU** — API endpoints PO |
| `src/routes/index.ts` | **Update** — register supplier & PO routes |
| `src/pages/suppliers.ts` | **BARU** — halaman suppliers |
| `src/pages/purchase-orders.ts` | **BARU** — halaman purchase orders |
| `src/index.ts` | **Update** — register pages |
| `src/templates/sidebar.ts` | **Update** — tambah menu Supplier & PO |
| `src/repositories/inventory.ts` | **Update** — fungsi increment stock |

---

## Catatan Penting

- **PO yang sudah ordered tidak bisa diedit** — harus dibatalkan dulu lalu buat baru
- **Stok hanya bertambah saat barang diterima** — bukan saat PO dibuat
- **Partial receive didukung** — qty diterima bisa kurang dari qty pesan
- **Harga otomatis tersimpan** — saat PO diterima, harga terakhir update ke supplier_prices
- **Estimasi total**: 6-8 jam kerja
