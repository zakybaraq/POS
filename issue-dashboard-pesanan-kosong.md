# Issue: Dashboard "Pesanan Terbaru" dan "Menu Terlaris Hari Ini" Menampilkan "Belum Ada Pesanan"

## Ringkasan Masalah

Pada halaman Dashboard (`http://localhost:3000/`), dua section menampilkan pesan kosong meskipun pesanan sudah ada:

1. **"Pesanan Terbaru"** → menampilkan "Belum ada pesanan hari ini"
2. **"Menu Terlaris Hari Ini"** → menampilkan "Belum ada data menu terlaris"

Padahal pesanan sudah dibuat dan tersimpan di database.

---

## Root Cause (Penyebab Utama)

Bug ada di fungsi `todayStart()` pada file **`src/repositories/order.ts`** (baris 6-9):

```typescript
function todayStart() {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
}
```

**Masalahnya:** Fungsi ini **tidak menghitung awal hari ini (midnight WIB)**, melainkan hanya menggeser waktu sekarang sebesar offset timezone. Hasilnya adalah timestamp yang **bukan pukul 00:00 WIB**, melainkan waktu sekarang + offset.

**Contoh:**
- Jika sekarang pukul 14:00 WIB (07:00 UTC)
- `todayStart()` akan menghasilkan timestamp sekitar pukul 21:00 WIB (bukan 00:00 WIB)
- Query `WHERE createdAt >= todayStart()` akan mencari pesanan yang dibuat **setelah pukul 21:00 WIB** → tidak ada pesanan yang cocok
- Hasil: array kosong → dashboard menampilkan "Belum ada pesanan hari ini"

Fungsi `todayStart()` digunakan oleh dua query yang terdampak:
- **`getRecentOrders()`** (baris 113-127) → query "Pesanan Terbaru"
- **`getTopMenus()`** (baris 129-141) → query "Menu Terlaris Hari Ini"

---

## File yang Terlibat

| File | Peran |
|------|-------|
| `src/repositories/order.ts` | **File utama yang perlu diperbaiki** - berisi fungsi `todayStart()` yang salah |
| `src/pages/dashboard.ts` | Halaman dashboard - memanggil `getRecentOrders()` dan `getTopMenus()` (tidak perlu diubah) |
| `src/routes/dashboard.ts` | API dashboard - juga memanggil fungsi yang sama (tidak perlu diubah) |

---

## Langkah Implementasi

### Langkah 1: Perbaiki Fungsi `todayStart()` di `src/repositories/order.ts`

**Lokasi:** Baris 6-9

**Kode saat ini (SALAH):**
```typescript
function todayStart() {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000));
}
```

**Kode yang benar:**
```typescript
function todayStart() {
  // Dapatkan waktu saat ini dalam WIB (UTC+7)
  const now = new Date();
  // Konversi ke string tanggal format ISO di timezone Asia/Jakarta
  const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wibDate = new Date(wibString);
  // Set ke awal hari (00:00:00) di waktu WIB
  return new Date(Date.UTC(
    wibDate.getUTCFullYear(),
    wibDate.getUTCMonth(),
    wibDate.getUTCDate(),
    0, 0, 0, 0
  ));
}
```

**Penjelasan:**
1. `toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })` → mengkonversi waktu sekarang ke representasi waktu WIB
2. `new Date(wibString)` → membuat Date object dari string WIB tersebut
3. `Date.UTC(...)` → membuat timestamp UTC untuk pukul 00:00:00 WIB hari ini
4. Hasilnya adalah timestamp yang benar untuk awal hari WIB, yang bisa dipakai di query `gte(orders.createdAt, todayStart())`

**Alternatif (lebih sederhana, jika server sudah berjalan di timezone WIB):**
```typescript
function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
```
> **Catatan:** Alternatif ini hanya bekerja jika server berjalan di timezone Asia/Jakarta. Gunakan cara pertama (dengan `toLocaleString` + `timeZone`) untuk keamanan karena tidak bergantung pada timezone server.

---

### Langkah 2: Verifikasi Tidak Ada Efek Samping

Fungsi `todayStart()` hanya dipakai di 3 tempat dalam file yang sama:

| Fungsi | Baris | Efek Perbaikan |
|--------|-------|----------------|
| `getOrdersToday()` | 45-49 | ✅ Akan mengembalikan pesanan hari ini dengan benar |
| `getRecentOrders()` | 113-127 | ✅ Dashboard "Pesanan Terbaru" akan tampil |
| `getTopMenus()` | 129-141 | ✅ Dashboard "Menu Terlaris" akan tampil |

Tidak ada fungsi lain yang menggunakan `todayStart()`, jadi efek samping **minimal**.

---

### Langkah 3: Testing Manual

Setelah mengubah kode:

1. **Restart server:**
   ```bash
   bun run index.ts
   ```

2. **Buka dashboard:** `http://localhost:3000/`

3. **Cek:**
   - Section "Pesanan Terbaru" → harus menampilkan daftar pesanan terbaru (bukan "Belum ada pesanan hari ini")
   - Section "Menu Terlaris Hari Ini" → harus menampilkan menu yang paling banyak dipesan hari ini

4. **Jika belum ada pesanan hari ini:** Buat pesanan baru lewat halaman POS, lalu refresh dashboard.

---

## Ringkasan Perubahan

| File | Baris | Perubahan |
|------|-------|-----------|
| `src/repositories/order.ts` | 6-9 | Perbaiki fungsi `todayStart()` agar mengembalikan timestamp midnight WIB yang benar |

**Hanya 1 file yang perlu diubah.** Semua fungsi lain (`getRecentOrders`, `getTopMenus`, `getOrdersToday`) sudah benar logikanya - mereka hanya bergantung pada `todayStart()` yang salah.

---

## Catatan untuk Junior Programmer

1. **Jangan ubah apa pun selain fungsi `todayStart()`** - semua query sudah benar, hanya input tanggalnya yang salah
2. **Gunakan cara pertama** (dengan `toLocaleString` + `timeZone: 'Asia/Jakarta'`) karena tidak bergantung pada timezone server
3. **Setelah mengubah, restart server** - perubahan .ts tidak otomatis ter-reload kecuali server berjalan dengan `--hot`
4. **Cek database** - pastikan ada pesanan yang `created_at`-nya hari ini. Bisa cek dengan query SQL:
   ```sql
   SELECT id, table_id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10;
   ```
5. **Jika masih bermasalah**, tambahkan `console.log` sementara di fungsi `todayStart()` untuk melihat timestamp yang dihasilkan:
   ```typescript
   function todayStart() {
     // ... kode perbaikan ...
     console.log('todayStart result:', result.toISOString());
     return result;
   }
   ```
