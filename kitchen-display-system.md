# Sub-Issue 2.1: Kitchen Display System (KDS) — Layar Dapur Digital

## Parent Issue

[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Restoran yang efisien membutuhkan komunikasi yang baik antara kasir dan dapur. Tanpa KDS:

- Pesanan dicatat di kertas → mudah hilang, salah baca, atau tertukar
- Waiter harus bolak-balik ke dapur untuk cek status pesanan
- Tidak ada tracking waktu masak → pelanggan menunggu terlalu lama
- Tidak ada data performa dapur → tidak tahu berapa lama rata-rata masak per menu
- Chef tidak tahu urutan prioritas pesanan mana yang harus dimasak dulu
- Tidak ada notifikasi saat pesanan siap → makanan dingin karena terlalu lama di counter
- Tidak ada filter by station → chef minuman tidak perlu lihat pesanan makanan

Modul KDS menggantikan kertas pesanan dengan layar digital real-time yang terhubung langsung dengan sistem POS.

---

## Scope

### Yang HARUS ada (MVP)

1. **Dashboard KDS** — Tampilan real-time semua pesanan aktif (pending, cooking, ready)
2. **Update Status Pesanan** — Pending → Cooking → Ready → Served
3. **Timer Per Pesanan** — Hitung waktu sejak pesanan dibuat, warning jika > batas waktu
4. **Filter by Category** — Tampilkan hanya makanan atau hanya minuman
5. **Auto-refresh** — Polling setiap 5 detik untuk update pesanan baru

### Yang NANTI bisa ditambahkan (Phase 2)

- WebSocket real-time (ganti polling)
- Sound notification saat pesanan baru masuk
- Bump bar support (hardware KDS)
- Multi-screen KDS (layar terpisah untuk station berbeda)
- Recipe view (tampilkan bahan & cara masak per item)
- Chef performance analytics
- Order priority (urgent, VIP, regular)
- Allergy/special instruction highlight
- Print kitchen ticket backup

---

## Tahap 1: Database Schema

Tidak perlu tabel baru — gunakan tabel `orders` dan `order_items` yang sudah ada.

Tambahkan kolom ke tabel `orders`:

```typescript
// Di orders table, tambahkan:
kitchenStatus: mysqlEnum('kitchen_status', ['pending', 'cooking', 'ready', 'served']).notNull().default('pending'),
cookingStartedAt: datetime('cooking_started_at'), // Timestamp saat mulai masak
readyAt: datetime('ready_at'), // Timestamp saat pesanan siap
```

---

## Tahap 2: Repository Functions

Tambahkan ke `src/repositories/order.ts` atau buat `src/repositories/kitchen.ts`:

```typescript
// Kitchen Orders
export async function getActiveKitchenOrders() // Semua pesanan dengan status != served dan != cancelled
export async function getKitchenOrdersByCategory(category: 'makanan' | 'minuman')
export async function updateKitchenStatus(orderId: number, status: 'cooking' | 'ready' | 'served')
export async function getKitchenOrderItems(orderId: number) // Get items dengan detail menu
export async function getKitchenStats() // Statistik: total pending, cooking, ready, avg cook time
```

---

## Tahap 3: API Endpoints

Buat `src/routes/kitchen.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/kitchen/orders` | super_admin, admin_restoran, chef | Get semua pesanan aktif untuk dapur |
| GET | `/api/kitchen/orders/:category` | super_admin, admin_restoran, chef | Get pesanan by category (makanan/minuman) |
| GET | `/api/kitchen/orders/:id/items` | super_admin, admin_restoran, chef | Get detail item pesanan |
| PATCH | `/api/kitchen/orders/:id/status` | super_admin, admin_restoran, chef | Update status dapur (cooking/ready/served) |
| GET | `/api/kitchen/stats` | super_admin, admin_restoran | Get statistik dapur |

---

## Tahap 4: UI — Halaman Kitchen Display

Buat `src/pages/kitchen.ts` — halaman full-screen optimized untuk layar dapur:

### Layout Utama
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🍳 Kitchen Display System                        🟡 3 Pending  🔴 5 Cooking  🟢 2 Ready       │
│  [Semua] [🍔 Makanan (7)] [🥤 Minuman (3)]                          [🔄 Refresh]  [📊 Stats]   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐                    │
│  │ #1023  ⏱️ 12:30     │  │ #1019  ⏱️ 12:15     │  │ #1021  ⏱️ 12:22     │                    │
│  │ Meja 5  │ 12:28     │  │ Meja 2  │ 12:10     │  │ Meja 8  │ 12:20     │                    │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤                    │
│  │ 🟡 PENDING          │  │ 🔴 COOKING          │  │ 🟡 PENDING          │                    │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤                    │
│  │ 2x Nasi Goreng      │  │ 1x Ayam Bakar       │  │ 3x Es Teh Manis     │                    │
│  │ 1x Es Jeruk         │  │ 2x Nasi Putih       │  │ 1x Jus Alpukat      │                    │
│  │ 1x Sate Ayam        │  │ 1x Sop Ayam         │  │                     │                    │
│  │                     │  │                     │  │                     │                    │
│  │  [Mulai Masak ▶]    │  │  [✅ Siap Saji]     │  │  [Mulai Masak ▶]    │                    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘                    │
│                                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐                                              │
│  │ #1018  ⏱️ 12:05 ⚠️ │  │ #1020  ⏱️ 12:18     │                                              │
│  │ Meja 1  │ 12:00     │  │ Meja 3  │ 12:15     │                                              │
│  ├─────────────────────┤  ├─────────────────────┤                                              │
│  │ 🔴 COOKING  25min   │  │ 🟢 READY            │                                              │
│  ├─────────────────────┤  ├─────────────────────┤                                              │
│  │ 1x Rendang          │  │ 2x Mie Goreng       │                                              │
│  │ 1x Gado-gado        │  │ 1x Bakso            │                                              │
│  │ 2x Nasi Putih       │  │                     │                                              │
│  │                     │  │                     │                                              │
│  │  [✅ Siap Saji]     │  │  [🍽️ Sajikan]       │                                              │
│  └─────────────────────┘  └─────────────────────┘                                              │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Kartu Pesanan (Card Design)
```
┌─────────────────────────────────┐
│ #1023         ⏱️ 12:30 (5 min) │
│ Meja 5  │  12:28  │  Kasir: Budi│
├─────────────────────────────────┤
│ 🟡 PENDING                      │
├─────────────────────────────────┤
│  2x  Nasi Goreng                │
│  1x  Es Jeruk                   │
│  1x  Sate Ayam                  │
│      (tanpa kacang) ← catatan   │
├─────────────────────────────────┤
│      [Mulai Masak ▶]            │
└─────────────────────────────────┘

Status Colors:
🟡 PENDING  = Kuning (belum dimasak)
🔴 COOKING  = Merah (sedang dimasak)
🟢 READY    = Hijau (siap saji)
```

### Warning System
```
Timer > 15 menit: Kartu border kuning ⚠️
Timer > 25 menit: Kartu border merah 🔴 + flash animation
Timer > 35 menit: Kartu background merah gelap + "OVERDUE!" badge
```

### Stats Modal
```
┌─────────────────────────────────────────────────────────┐
│ Statistik Dapur Hari Ini                                │
├─────────────────────────────────────────────────────────┤
│ Total Pesanan:     45                                   │
│ Selesai:           38 (84%)                             │
│ Sedang Dimasak:    5                                    │
│ Belum Dimasak:     2                                    │
│                                                         │
│ Rata-rata Waktu Masak: 12 menit                         │
│ Pesanan Terlama:     25 menit (#1018)                   │
│ Pesanan Tercepat:    5 menit (#1022)                    │
│                                                         │
│ Top 5 Menu Hari Ini:                                    │
│ 1. Nasi Goreng     — 15 porsi                          │
│ 2. Es Teh Manis    — 12 porsi                          │
│ 3. Ayam Bakar      — 10 porsi                          │
│ 4. Mie Goreng      — 8 porsi                           │
│ 5. Nasi Putih      — 7 porsi                           │
└─────────────────────────────────────────────────────────┘
```

---

## Tahap 5: Integrasi dengan Modul Lain

### POS Module
- Saat pesanan dibuat di POS → otomatis muncul di KDS dengan status `pending`
- Saat status KDS berubah → update di orders table

### Orders Page
- Tampilkan status dapur di halaman orders (Pending → Cooking → Ready → Served)
- Filter orders by kitchen status

### Dashboard
- Tampilkan ringkasan: pesanan pending dapur, rata-rata waktu masak
- Alert: pesanan yang sudah > 20 menit belum selesai masak

### Reporting (Phase 2)
- Laporan performa dapur: rata-rata waktu masak per menu
- Laporan chef productivity (jika ada user assignment)
- Laporan peak hours (jam tersibuk dapur)

---

## Tahap 6: Testing

### Skenario Test

1. **KDS Display** — Pesanan baru dari POS muncul di KDS dalam 5 detik
2. **Update Status** — Klik "Mulai Masak" → status berubah ke Cooking + timestamp
3. **Update Status** — Klik "Siap Saji" → status berubah ke Ready + timestamp
4. **Update Status** — Klik "Sajikan" → status berubah ke Served + hilang dari KDS
5. **Timer** — Timer berjalan dari waktu pesanan dibuat, update setiap detik
6. **Warning** — Pesanan > 15 menit border kuning, > 25 menit border merah
7. **Filter** — Klik "Makanan" → hanya tampil pesanan dengan item makanan
8. **Filter** — Klik "Minuman" → hanya tampil pesanan dengan item minuman
9. **Auto-refresh** — Pesanan baru muncul otomatis tanpa reload halaman
10. **Stats** — Modal stats menampilkan data akurat (total, avg time, top menu)
11. **Role Access** — Chef bisa akses KDS, kasir tidak bisa update status dapur

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | **Update** — tambah kolom kitchenStatus, cookingStartedAt, readyAt di orders |
| `src/repositories/kitchen.ts` | **BARU** — semua fungsi KDS |
| `src/routes/kitchen.ts` | **BARU** — API endpoints KDS |
| `src/routes/index.ts` | **Update** — register kitchen routes |
| `src/pages/kitchen.ts` | **BARU** — halaman KDS full-screen |
| `src/index.ts` | **Update** — register kitchen page |
| `src/templates/sidebar.ts` | **Update** — tambah menu Dapur (KDS) |
| `src/routes/orders.ts` | **Update** — set kitchenStatus saat buat pesanan |
| `src/public/styles/global.css` | **Update** — tambah CSS untuk KDS cards, timer, warning |

---

## Catatan Penting

- **Full-screen optimized** — Halaman KDS dirancang untuk layar sentuh di dapur (font besar, tombol besar)
- **Auto-refresh 5 detik** — Polling `/api/kitchen/orders` setiap 5 detik
- **Status flow**: Pending → Cooking → Ready → Served (tidak bisa skip)
- **Timer real-time** — JavaScript `setInterval` update setiap detik di client
- **Warna warning**: Kuning (>15 min), Merah (>25 min), Merah gelap + flash (>35 min)
- **Estimasi total**: 6-8 jam kerja
