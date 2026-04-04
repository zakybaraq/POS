# Rencana Improve: Dashboard `/`

## Latar Belakang

Dashboard saat ini (`src/pages/dashboard.ts`) hanya menampilkan:
- 4 stats cards dengan nilai **hardcoded "0"** (tidak ada data real dari database)
- 4 quick links statis
- **Sama untuk semua role** — tidak ada perbedaan antara super_admin, kasir, chef, dll

Dashboard seharusnya menjadi pusat informasi utama yang menampilkan data real-time dan insight bisnis **yang relevan dengan role masing-masing pengguna**.

---

## Requirement Utama: Dashboard Berbeda Per Role

Setiap role harus melihat dashboard yang berbeda sesuai dengan tanggung jawab dan kebutuhan mereka:

### Dashboard Super Admin
**Fokus**: Monitoring bisnis secara keseluruhan
- Total penjualan hari ini, minggu ini, bulan ini
- Total pesanan, meja terpakai, menu tersedia
- Pesanan terbaru (semua)
- Menu terlaris hari ini
- Ringkasan status meja (visualisasi)
- Greeting personal

### Dashboard Admin Restoran
**Fokus**: Operasional harian restoran
- Total penjualan hari ini
- Total pesanan hari ini
- Meja terpakai / total meja
- Pesanan terbaru
- Menu terlaris hari ini
- Ringkasan status meja
- Greeting personal

### Dashboard Kasir
**Fokus**: Transaksi dan pembayaran
- Total penjualan hari ini (milik kasir sendiri)
- Jumlah transaksi yang sudah diproses
- Pesanan yang menunggu pembayaran
- Pesanan terbaru yang ditangani kasir
- Greeting personal
- **TIDAK ADA**: Menu terlaris, status meja (tidak relevan)

### Dashboard Waitress/Waiter
**Fokus**: Pesanan yang perlu dilayani
- Jumlah pesanan aktif yang perlu diantar
- Pesanan terbaru di meja yang ditangani
- Status pesanan (menunggu dapur, siap diantar)
- Greeting personal
- **TIDAK ADA**: Penjualan, menu terlaris, status meja

### Dashboard Chef
**Fokus**: Pesanan yang perlu dimasak
- Jumlah pesanan pending yang perlu dimasak
- Daftar item yang perlu dimasak (dengan catatan)
- Status pesanan (pending, cooking, ready)
- Greeting personal
- **TIDAK ADA**: Penjualan, menu terlaris, status meja

---

## Matriks Dashboard Per Role

| Fitur | Super Admin | Admin Restoran | Kasir | Waitress | Chef |
|-------|:-----------:|:--------------:|:-----:|:--------:|:----:|
| Total Penjualan | ✅ | ✅ | ✅ (sendiri) | ❌ | ❌ |
| Total Pesanan | ✅ | ✅ | ✅ (sendiri) | ✅ (aktif) | ✅ (pending) |
| Meja Terpakai | ✅ | ✅ | ❌ | ❌ | ❌ |
| Menu Tersedia | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pesanan Terbaru | ✅ (semua) | ✅ (semua) | ✅ (sendiri) | ✅ (aktif) | ✅ (pending) |
| Menu Terlaris | ✅ | ✅ | ❌ | ❌ | ❌ |
| Status Meja | ✅ | ✅ | ❌ | ❌ | ❌ |
| Item Perlu Dimasak | ❌ | ❌ | ❌ | ❌ | ✅ |
| Pesanan Menunggu Bayar | ❌ | ❌ | ✅ | ❌ | ❌ |
| Greeting Personal | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Tahap 1: Buat API Endpoint untuk Dashboard Stats (Per Role)

Buat endpoint baru `GET /api/dashboard/stats` yang mengembalikan data berbeda berdasarkan role user yang login.

### Response untuk Super Admin / Admin Restoran
```json
{
  "todaySales": 1250000,
  "todayOrders": 24,
  "occupiedTables": 5,
  "totalTables": 12,
  "availableMenus": 18,
  "totalMenus": 22,
  "recentOrders": [...],
  "topMenus": [...]
}
```

### Response untuk Kasir
```json
{
  "myTodaySales": 450000,
  "myTodayOrders": 12,
  "pendingPayments": 3,
  "recentOrders": [...]
}
```

### Response untuk Waitress
```json
{
  "activeOrders": 5,
  "recentOrders": [...]
}
```

### Response untuk Chef
```json
{
  "pendingItems": 8,
  "cookingItems": 3,
  "readyItems": 2,
  "pendingOrderItems": [...]
}
```

### File yang perlu dibuat
- `src/routes/dashboard.ts` — endpoint baru

### Repository functions yang perlu dibuat
- `src/repositories/order.ts` — `getTodaySales()`, `getTodayOrders()`, `getTopMenus()`
- `src/repositories/table.ts` — `getOccupiedTableCount()`

---

## Tahap 2: Update Stats Cards Berdasarkan Role

Ubah stats cards agar menampilkan data yang relevan sesuai role user.

### Di `src/pages/dashboard.ts`
- Ambil role dari user token
- Render stats cards yang berbeda berdasarkan role
- Contoh: Chef tidak melihat "Total Penjualan", tapi melihat "Pesanan Pending"

### Contoh implementasi
```typescript
const stats = await fetch('/api/dashboard/stats');

if (user.role === 'super_admin' || user.role === 'admin_restoran') {
  // Tampilkan 4 cards: Penjualan, Pesanan, Meja, Menu
} else if (user.role === 'kasir') {
  // Tampilkan 3 cards: Penjualan Saya, Transaksi Saya, Menunggu Bayar
} else if (user.role === 'waitress') {
  // Tampilkan 2 cards: Pesanan Aktif, Perlu Dianter
} else if (user.role === 'chef') {
  // Tampilkan 3 cards: Perlu Dimasak, Sedang Dimasak, Siap Saji
}
```

---

## Tahap 3: Tambah Section "Pesanan Terbaru" (Role-Aware)

Tambahkan card yang menampilkan pesanan terbaru, tapi **hanya yang relevan dengan role user**.

### Super Admin / Admin Restoran
Tampilkan 5 pesanan terakhir dari semua meja.

### Kasir
Tampilkan pesanan yang menunggu pembayaran atau baru saja dibayar.

### Waitress
Tampilkan pesanan aktif yang perlu dilayani/diantar.

### Chef
Tampilkan item pesanan yang statusnya `pending` (perlu dimasak).

---

## Tahap 4: Tambah Section Role-Specific

### Super Admin & Admin Restoran: "Menu Terlaris"
Top 5 menu paling laris hari ini.

### Chef: "Perlu Dimasak"
Daftar item pesanan yang belum dimasak, lengkap dengan catatan (misal: "tidak pedas").

### Kasir: "Menunggu Pembayaran"
Daftar pesanan aktif yang belum dibayar.

### Waitress & Chef
Tidak ada section tambahan ini.

---

## Tahap 5: Tambah Greeting Berdasarkan Waktu

Ubah header dashboard agar menampilkan greeting yang personal.

### Contoh
- Pagi (05:00-11:59): "Selamat Pagi, Muhammad Zaki! ☀️"
- Siang (12:00-14:59): "Selamat Siang, Muhammad Zaki! 🌤️"
- Sore (15:00-17:59): "Selamat Sore, Muhammad Zaki! 🌅"
- Malam (18:00-04:59): "Selamat Malam, Muhammad Zaki! 🌙"

### Implementasi
```javascript
function getGreeting(name) {
  const hour = new Date().getHours();
  let greeting, emoji;
  if (hour >= 5 && hour < 12) { greeting = 'Selamat Pagi'; emoji = '☀️'; }
  else if (hour >= 12 && hour < 15) { greeting = 'Selamat Siang'; emoji = '🌤️'; }
  else if (hour >= 15 && hour < 18) { greeting = 'Selamat Sore'; emoji = '🌅'; }
  else { greeting = 'Selamat Malam'; emoji = '🌙'; }
  return `${greeting}, ${name}! ${emoji}`;
}
```

---

## Tahap 6: Tambah Ringkasan Status Meja (Super Admin & Admin Restoran Only)

Tambahkan visualisasi sederhana status meja di dashboard.

### Layout
```
┌─────────────────────────────────────┐
│ Status Meja                         │
├─────────────────────────────────────┤
│ ████████░░░░ 5/12 Terisi (42%)     │
│                                     │
│ 🟢 Tersedia: 7   🔴 Terisi: 5      │
└─────────────────────────────────────┘
```

---

## Tahap 7: Testing

### Skenario Test Per Role
1. **Super Admin**: Login → lihat semua stats, pesanan terbaru, menu terlaris, status meja, greeting
2. **Admin Restoran**: Login → lihat semua stats (sama seperti super admin), greeting
3. **Kasir**: Login → hanya lihat penjualan sendiri, transaksi sendiri, menunggu bayar, greeting. TIDAK lihat menu terlaris atau status meja
4. **Waitress**: Login → hanya lihat pesanan aktif, greeting. TIDAK lihat penjualan atau menu terlaris
5. **Chef**: Login → hanya lihat item pending/cooking/ready, greeting. TIDAK lihat stats penjualan
6. **Greeting**: Verifikasi berubah sesuai waktu (pagi/siang/sore/malam)
7. **Graceful**: Dashboard tetap berfungsi saat database kosong (tampilkan 0, bukan error)

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/routes/dashboard.ts` | **BARU** — API endpoint `/api/dashboard/stats` |
| `src/pages/dashboard.ts` | Update stats cards, tambah section baru |
| `src/repositories/order.ts` | Tambah `getTodaySales()`, `getTopMenus()` |
| `src/repositories/table.ts` | Tambah `getOccupiedTableCount()` |

## Catatan Penting

- **JANGAN hapus** quick links yang sudah ada
- **Graceful handling** — jika database kosong, tampilkan 0 (bukan error)
- **Performance** — query harus efisien, gunakan index yang sudah ada
- **Estimasi total**: 2-3 jam kerja
