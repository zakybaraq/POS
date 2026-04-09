# Issue: Dashboard Tidak Menampilkan Data Hari Ini

## Latar Belakang

Dashboard saat ini menampilkan seluruh data penjualan dari semua waktu, bukan hanya hari ini. Hal ini menyebabkan:

1. **Total Penjualan**: Menampilkan jumlah seluruh penjualan, bukan penjualan hari ini
2. **Jumlah Pesanan**: Menampilkan total semua pesanan, bukan pesanan hari ini
3. **Pesanan Terbaru**: Menampilkan pesanan dari semua waktu, bukan pesanan hari ini
4. **Menu Terlaris**: Menghitung dari seluruh waktu, bukan dari hari ini

User tidak bisa melihat performa restoran hari ini dengan jelas karena data tercampur dengan data historis.

---

## Tahapan Implementasi

### Tahap 1: Perbaiki Fungsi `todayStart()` untuk Waktu WIB

**File yang perlu diubah:** `src/repositories/order.ts`

**Langkah-langkah:**

1. Cari fungsi `todayStart()` di file `src/repositories/order.ts`
2. Pastikan fungsi ini menghitung tengah malam WIB (Asia/Jakarta) dengan benar
3. Fungsi harus mengembalikan tanggal awal hari ini dalam format UTC yang sesuai dengan timezone WIB

**Kode yang seharusnya:**

```typescript
function todayStart(): Date {
  const now = new Date();
  const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wibDate = new Date(wibString);
  return new Date(Date.UTC(
    wibDate.getUTCFullYear(),
    wibDate.getUTCMonth(),
    wibDate.getUTCDate(),
    0, 0, 0, 0
  ));
}
```

**Catatan:**
- Pastikan menggunakan `Asia/Jakarta` sebagai timezone
- Return value harus berupa Date object yang bisa digunakan untuk filtering di query

---

### Tahap 2: Tambahkan Filter Tanggal pada Query Dashboard

**File yang perlu diubah:** `src/repositories/order.ts`

**Langkah-langkah:**

1. **Perbaiki fungsi `getTodaySales()`:**
   - Cek apakah sudah menggunakan filter `todayStart()`
   - Jika belum, tambahkan `.where(gte(orders.createdAt, todayStart()))`
   - Juga filter berdasarkan `status = 'completed'`

2. **Perbaiki fungsi `getTodayOrders()`:**
   - Tambahkan filter `todayStart()`
   - Filter juga berdasarkan `status = 'completed'`

3. **Perbaiki fungsi `getTopMenus()`:**
   - Tambahkan filter `todayStart()` pada query
   - Hanya hitung menu dari pesanan yang sudah selesai (completed) hari ini

**Contoh perbaikan getTodaySales:**

```typescript
export async function getTodaySales() {
  const result = await db.select({ total: sum(orders.total) })
    .from(orders)
    .where(and(
      gte(orders.createdAt, todayStart()),
      eq(orders.status, 'completed')
    ));
  return Number(result[0]?.total || 0);
}
```

**Contoh perbaikan getTopMenus:**

```typescript
export async function getTopMenus(limit: number = 5) {
  return db.select({
    name: menus.name,
    totalSold: sum(orderItems.quantity).mapWith(Number),
  })
  .from(orderItems)
  .leftJoin(menus, eq(orderItems.menuId, menus.id))
  .leftJoin(orders, eq(orderItems.orderId, orders.id))
  .where(and(
    gte(orders.createdAt, todayStart()),
    eq(orders.status, 'completed')
  ))
  .groupBy(menus.name)
  .orderBy(desc(sum(orderItems.quantity)))
  .limit(limit);
}
```

---

### Tahap 3: Verifikasi Endpoint Dashboard

**File yang perlu diubah:** `src/pages/dashboard.ts` (jika ada)

**Langkah-langkah:**

1. Cek bagaimana dashboard mengambil data
2. Pastikan menggunakan fungsi yang sudah diperbaiki (getTodaySales, getTodayOrders, getTopMenus)
3. Pastikan tidak ada endpoint yang mengambil data tanpa filter tanggal

---

## Verifikasi

Setelah implementasi, lakukan verifikasi:

1. **Total Penjualan Hari Ini:**
   - Buka dashboard
   - Bandingkan dengan jumlah pesanan yang sudah selesai hari ini
   - Harus sesuai

2. **Pesanan Terbaru:**
   - Bagian "Pesanan Terbaru" hanya menampilkan pesanan hari ini
   - Tidak ada pesanan dari hari sebelumnya

3. **Menu Terlaris:**
   - Hanya menghitung menu yang terjual hari ini
   - Tidak termasuk menu yang terjual kemarin atau sebelumnya

---

## Catatan Penting

- Jangan ubah struktur data atau schema database
- Jangan hapus fungsi yang sudah ada (misalnya getAllSales) - buat fungsi baru jika perlu
- Gunakan operator `gte` (greater than or equal) untuk filter tanggal
- Pastikan timezone selalu menggunakan WIB (Asia/Jakarta)

---

## Estimasi Waktu

- Tahap 1: 10-15 menit
- Tahap 2: 20-30 menit
- Tahap 3: 10-15 menit
- Total: 40-60 menit

---

## Referensi File

- `src/repositories/order.ts` - berisi fungsi query untuk dashboard
- `src/pages/dashboard.ts` - halaman dashboard (jika perlu dicek)
- `src/repositories/report.ts` - fungsi report (cek juga jika ada yang perlu diperbaiki)
