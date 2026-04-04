# Rencana Improve: Modul Meja `/tables`

## Latar Belakang

Modul meja saat ini (`src/pages/tables.ts`) sangat dasar:
- Grid card dengan nomor meja, status badge, tombol hapus
- Tambah meja via modal (hanya nomor meja)
- Hapus dengan `confirm()` browser

### Masalah Saat Ini
1. **Tidak ada stats/summary** — Tidak tahu berapa total meja, tersedia, terisi
2. **Tidak ada search** — Jika meja banyak, harus scroll manual
3. **Tidak bisa edit nomor meja** — Hanya bisa hapus dan buat ulang
4. **Tidak ada visual floor plan** — Hanya card statis, tidak ada layout visual
5. **Tidak ada info pesanan aktif** — Tidak tahu meja yang terisi sedang pesan apa
6. **Tidak ada kapasitas tamu** — Tidak bisa set berapa orang per meja
7. **Tidak ada area/zona** — Tidak bisa kelompokkan meja (indoor, outdoor, VIP)
8. **Tidak ada bulk action** — Tidak bisa hapus atau toggle banyak meja sekaligus
9. **Tidak ada toast notification** — Pakai `alert()` yang mengganggu
10. **Tidak ada custom confirmation modal** — Pakai `confirm()` browser native

---

## Tujuan

Improve modul meja agar:
1. **Lebih informatif** — Stats, info pesanan aktif, kapasitas tamu
2. **Lebih efisien** — Edit via modal, search, bulk action
3. **Lebih modern** — Toast notification, custom confirmation modal
4. **Lebih visual** — Floor plan view, area/zona grouping

---

## Tahap 1: Tambah Stats Cards

Tambahkan ringkasan meja sebelum grid utama.

### Layout
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Total  │ │Tersedia │ │ Terisi  │ % Okupansi│
│   12    │ │    7    │ │    5    │ │   42%   │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Implementasi
- Hitung dari data meja yang sudah ada
- Total meja, tersedia, terisi, persentase okupansi

---

## Tahap 2: Tambah Search & Filter

### Toolbar
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Cari meja...]  [Semua Status ▼]  [Semua Area ▼]  [+ Tambah] │
└─────────────────────────────────────────────────────────┘
```

### Fitur
- **Search** — Filter berdasarkan nomor meja (client-side)
- **Filter status** — Semua, Tersedia, Terisi
- **Filter area** — Semua, Indoor, Outdoor, VIP (jika sudah ada field area)

---

## Tahap 3: Tambah Field Kapasitas dan Area di Database

### Schema Update
```typescript
// Di src/db/schema.ts
capacity: int('capacity').default(4),
area: mysqlEnum('area', ['indoor', 'outdoor', 'vip']).default('indoor'),
```

### SQL Migration
```sql
ALTER TABLE tables ADD COLUMN capacity INT DEFAULT 4 AFTER table_number;
ALTER TABLE tables ADD COLUMN area ENUM('indoor', 'outdoor', 'vip') DEFAULT 'indoor' AFTER capacity;
```

---

## Tahap 4: Improve Card Meja dengan Info Lebih Detail

### Card Baru
```
┌─────────────────────┐
│   🪑 Meja 5         │
│   🟢 Tersedia       │
│   👥 4 orang        │
│   📍 Indoor         │
│                     │
│  [Edit]  [Hapus]    │
└─────────────────────┘
```

### Jika Meja Terisi
```
┌─────────────────────┐
│   🪑 Meja 3         │
│   🔴 Terisi         │
│   👥 2 orang        │
│   📍 VIP            │
│                     │
│   📋 Order #12      │
│   Rp 85.000         │
│   2 item            │
│                     │
│  [Lihat]  [Edit]    │
└─────────────────────┘
```

---

## Tahap 5: Replace `prompt()` dengan Edit Modal

Ganti edit yang tidak ada (saat ini hanya hapus) dengan modal edit yang proper.

### Modal Edit Meja
```
┌──────────────────────────────┐
│ Edit Meja                    │
├──────────────────────────────┤
│ Nomor:   [5               ]  │
│ Kapasitas:[4              ]  │
│ Area:    [Indoor         ▼]  │
│ Status:  [✅ Tersedia    ▼]  │
├──────────────────────────────┤
│         [Batal]  [Simpan]    │
└──────────────────────────────┘
```

---

## Tahap 6: Tambah Link ke Pesanan Aktif

Jika meja terisi, tampilkan info pesanan aktif dan link untuk melihat detail.

### Implementasi
- Fetch order aktif dari API `/api/orders/table/:tableId`
- Tampilkan: nomor order, total, jumlah item
- Klik untuk redirect ke halaman orders dengan filter meja tersebut

---

## Tahap 7: Tambah Toast Notification

Ganti semua `alert()` dengan toast notification.

### Yang perlu diganti
- `alert('Nomor meja wajib diisi')` → `showToast('...', 'warning')`
- `alert(data.error || 'Gagal menambahkan meja')` → `showToast('...', 'error')`
- `confirm('Hapus meja?')` → Custom confirmation modal

---

## Tahap 8: Tambah Custom Confirmation Modal untuk Delete

Ganti `confirm()` browser dengan modal yang konsisten.

```
┌──────────────────────────────┐
│ Konfirmasi Hapus             │
├──────────────────────────────┤
│ Apakah Anda yakin ingin      │
│ menghapus Meja 5?            │
│ Meja yang sedang terisi      │
│ tidak dapat dihapus.         │
├──────────────────────────────┤
│         [Batal]  [Hapus]     │
└──────────────────────────────┘
```

---

## Tahap 9: Tambah Fitur Bulk Action

Tambahkan checkbox di setiap card untuk aksi massal.

### Aksi Bulk
- **Hapus Terpilih** — Hapus semua meja yang dicentang (hanya yang tersedia)
- **Toggle Status** — Set semua meja terpilih jadi tersedia/terisi

---

## Tahap 10: Testing

### Skenario Test
1. Stats cards menampilkan angka yang benar
2. Search meja berdasarkan nomor → card ter-filter
3. Filter berdasarkan status → hanya meja dengan status tersebut tampil
4. Edit meja via modal → data ter-update
5. Tambah kapasitas dan area → tersimpan di database
6. Meja terisi menampilkan info pesanan aktif
7. Toast muncul saat tambah/edit/hapus meja
8. Custom confirmation modal untuk delete
9. Bulk delete hanya menghapus meja yang tersedia
10. Meja terisi tidak bisa dihapus (error message)

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | Tambah field `capacity`, `area` di tables |
| `src/pages/tables.ts` | **Rewrite total** — stats, search, edit modal, bulk action, toast, info pesanan |
| `src/routes/tables.ts` | Update API untuk accept capacity, area |
| `src/repositories/table.ts` | Update query untuk field baru |

## Catatan Penting

- **JANGAN hapus** fitur yang sudah ada (tambah, hapus, toggle status)
- **JANGAN ubah** API endpoint yang sudah ada (hanya tambah field)
- **Meja terisi tidak bisa dihapus** — validasi di backend
- **Estimasi total**: 2-3 jam kerja
