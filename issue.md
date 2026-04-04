# Rencana Improve: Modul Menu `/menu`

## Latar Belakang

Modul menu saat ini (`src/pages/menu.ts`) hanya memiliki fitur dasar:
- Tabel dengan 5 kolom: Nama, Harga, Kategori, Status, Aksi
- Filter kategori (Semua, Makanan, Minuman)
- Tambah menu via modal (nama, harga, kategori)
- Edit via `prompt()` browser (hanya nama & harga)
- Toggle ketersediaan
- Hapus dengan `confirm()`

### Masalah Saat Ini
1. **Tidak ada search** — Jika menu banyak, harus scroll manual
2. **Edit pakai `prompt()`** — UX buruk, tidak bisa edit deskripsi atau gambar
3. **Tidak ada deskripsi menu** — Tidak bisa tambah info bahan, level pedas, dll
4. **Tidak ada gambar menu** — Hanya teks, tidak ada visual
5. **Tidak ada pagination** — Semua menu dimuat sekaligus
6. **Tidak ada stats/summary** — Tidak tahu berapa total menu, tersedia, tidak tersedia
7. **Tidak ada bulk action** — Tidak bisa hapus atau toggle banyak menu sekaligus
8. **Tidak ada toast notification** — Pakai `alert()` yang mengganggu
9. **Tidak ada konfirmasi delete yang proper** — Pakai `confirm()` browser native
10. **Tidak ada sort** — Tidak bisa sort berdasarkan harga, nama, atau tanggal

---

## Tujuan

Improve modul menu agar:
1. **Lebih informatif** — Stats, search, sort, deskripsi
2. **Lebih efisien** — Edit via modal, bulk action, pagination
3. **Lebih modern** — Toast notification, custom confirmation modal
4. **Lebih visual** — Placeholder gambar/emoji untuk menu

---

## Tahap 1: Tambah Stats Cards di Atas Tabel

Tambahkan ringkasan menu sebelum tabel utama.

### Layout
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Total  │ │Tersedia │ │  Tidak  │ │ Kategori│
│   22    │ │   18    │ │   4     │ │  2      │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Implementasi
- Hitung dari data menu yang sudah ada (tidak perlu API baru)
- Total menu, tersedia, tidak tersedia, jumlah kategori

---

## Tahap 2: Tambah Search & Sort

### Search Bar
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Cari menu...]    [Semua ▼]  [Harga ↑]  [+ Tambah]  │
└─────────────────────────────────────────────────────────┘
```

### Fitur
- **Search** — Filter berdasarkan nama menu (client-side)
- **Sort** — Klik header kolom untuk sort: Nama A-Z/Z-A, Harga Rendah/Tinggi, Terbaru/Terlama
- **Filter kategori** — Dropdown (bukan button) agar lebih compact

---

## Tahap 3: Replace `prompt()` dengan Edit Modal

Ganti `editMenu()` yang pakai `prompt()` dengan modal yang proper.

### Modal Edit Menu
```
┌──────────────────────────────┐
│ Edit Menu                    │
├──────────────────────────────┤
│ Nama:    [Nasi Goreng      ] │
│ Harga:   [15000            ] │
│ Kategori:[Makanan          ▼]│
│ Deskripsi:[Nasi goreng spesial]│
│           [dengan telur     ] │
│ Status:  [✅ Tersedia      ▼] │
├──────────────────────────────┤
│         [Batal]  [Simpan]    │
└──────────────────────────────┘
```

### Perubahan
- Tambah field **deskripsi** (textarea, opsional)
- Tambah field **status** toggle (Tersedia/Tidak Tersedia)
- Ganti `prompt()` dengan form modal yang proper

---

## Tahap 4: Tambah Field Deskripsi di Database

### Schema Update
```typescript
// Di src/db/schema.ts
description: varchar('description', { length: 500 }),
```

### SQL Migration
```sql
ALTER TABLE menus ADD COLUMN description VARCHAR(500) DEFAULT '' AFTER price;
```

### Update Tabel
Tambahkan kolom "Deskripsi" di tabel (tampilkan truncated, max 50 karakter):
| Nama | Harga | Deskripsi | Kategori | Status | Aksi |

---

## Tahap 5: Tambah Placeholder Emoji/Gambar

Tambahkan kolom emoji di tabel agar menu lebih visual.

### Tampilan
| | Nama | Harga | Kategori | Status | Aksi |
|---|------|-------|----------|--------|------|
| 🍛 | Nasi Goreng | 15.000 | Makanan | ✅ | Edit Hapus |
| 🥤 | Es Teh | 5.000 | Minuman | ✅ | Edit Hapus |

### Emoji Mapping
- Makanan: 🍛 Nasi, 🍜 Mie, 🍗 Ayam, 🍚 Nasi Putih, 🥘 Sop, 🍲 Soto, 🥩 Steak, 🌮 dll
- Minuman: 🥤 Es, ☕ Kopi, 🍵 Teh, 🧃 Jus, 🥛 Susu, dll

---

## Tahap 6: Tambah Pagination

Jika menu lebih dari 15 item, tabel harus di-paginate.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ Tabel Menu                                              │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│ Menampilkan 1-15 dari 22    [← Prev] [1] [2] [Next →]  │
└─────────────────────────────────────────────────────────┘
```

### Implementasi (Client-side)
- Slice array menu di JavaScript
- 15 item per halaman
- Navigasi: Prev, Next, page numbers

---

## Tahap 7: Tambah Toast Notification

Ganti semua `alert()` dengan toast notification (sudah ada di `src/templates/common-scripts.ts`).

### Yang perlu diganti
- `alert('Nama dan harga wajib diisi')` → `showToast('...', 'warning')`
- `alert('Gagal menambahkan menu')` → `showToast('...', 'error')`
- `alert('Harga tidak valid')` → `showToast('...', 'warning')`
- `confirm('Hapus menu?')` → Custom confirmation modal

---

## Tahap 8: Tambah Custom Confirmation Modal untuk Delete

Ganti `confirm()` browser dengan modal yang konsisten dengan UI.

```
┌──────────────────────────────┐
│ Konfirmasi Hapus             │
├──────────────────────────────┤
│ Apakah Anda yakin ingin      │
│ menghapus menu "Nasi Goreng"?│
│ Tindakan ini tidak dapat     │
│ dibatalkan.                  │
├──────────────────────────────┤
│         [Batal]  [Hapus]     │
└──────────────────────────────┘
```

---

## Tahap 9: Tambah Fitur Bulk Action

Tambahkan checkbox di setiap baris tabel untuk aksi massal.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ ☑ Pilih Semua    [Hapus Terpilih] [Toggle Status]       │
├─────────────────────────────────────────────────────────┤
│ ☐ 🍛 Nasi Goreng | 15.000 | Makanan | ✅ | Edit Hapus  │
│ ☐ 🥤 Es Teh     |  5.000 | Minuman | ✅ | Edit Hapus  │
└─────────────────────────────────────────────────────────┘
```

### Aksi Bulk
- **Hapus Terpilih** — Hapus semua menu yang dicentang
- **Toggle Status** — Ubah semua menu terpilih jadi tersedia/tidak

---

## Tahap 10: Testing

### Skenario Test
1. Stats cards menampilkan angka yang benar
2. Search menu berdasarkan nama → tabel ter-filter
3. Sort berdasarkan harga → urutan benar
4. Edit menu via modal → data ter-update
5. Tambah deskripsi → tersimpan di database
6. Emoji tampil di kolom tabel
7. Pagination berfungsi (15 item per halaman)
8. Toast muncul saat tambah/edit/hapus menu
9. Custom confirmation modal untuk delete
10. Bulk delete dan bulk toggle status berfungsi

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | Tambah field `description` di menus |
| `src/pages/menu.ts` | **Rewrite total** — stats, search, sort, edit modal, pagination, toast, bulk action, emoji |
| `src/public/styles/global.css` | Tambah CSS untuk bulk action, pagination, edit modal |

## Catatan Penting

- **JANGAN hapus** fitur yang sudah ada (filter kategori, toggle, delete)
- **JANGAN ubah** API endpoint yang sudah ada
- **Emoji sebagai placeholder** — nanti bisa diganti gambar asli
- **Estimasi total**: 2-3 jam kerja
