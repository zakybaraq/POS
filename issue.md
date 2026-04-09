# Issue: Konsolidasi File CSS Duplikat

## Masalah

Terdapat dua file CSS dengan isi yang hampir sama:

1. `/Users/zakybaraq/Desktop/pos/src/styles/pos.css` (385 baris)
2. `/Users/zakybaraq/Desktop/pos/src/public/styles/pos.css` (374 baris)

Kedua file ini duplicate dan perlu dibersihkan. Pilih salah satu sebagai sumber utama dan hapus yang lain.

---

## Analisis Perbedaan

### Perbedaan di `src/styles/pos.css` (baris 358-385):

```css
.pos-order-type-selection {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
/* kode order type selection berbeda - lebih lengkap */
```

### File `src/public/styles/pos.css` (baris 348-374):

```css
.pos-order-type-selection {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
/* kode order type selection berbeda */
```

---

## Tahapan Implementasi

### Langkah 1: Pilih File Utama

Pilih `src/public/styles/pos.css` sebagai file utama karena:
- Lebih ringkas (374 vs 385 baris)
- Sudah di-serving via endpoint `/styles/:path` di `src/index.ts`

### Langkah 2: Gabungkan Perbedaan

Copy kode `.pos-order-type-selection` dari `src/styles/pos.css` ke `src/public/styles/pos.css` untuk memastikan tidak ada fitur yang hilang.

### Langkah 3: Hapus File Duplicate

Hapus file `src/styles/pos.css` setelah penggabungan selesai.

### Langkah 4: Verifikasi

Pastikan semua halaman POS masih berjalan normal setelah perubahan.

---

## Aksi yang Diperlukan

1. **Gabungkan** kode `.pos-order-type-selection` yang lebih lengkap dari `src/styles/pos.css` ke `src/public/styles/pos.css`
2. **Hapus** file `src/styles/pos.css`
3. **Verifikasi** aplikasi tetap berfungsi

---

## Catatan

- Setelah file duplikat dihapus, perlu memastikan tidak ada import/reference ke `src/styles/pos.css` yang tersisa di codebase.
- Cek apakah folder `src/styles` masih butuh atau bisa dihapus juga.

---

*Ditugaskan untuk: Junior Programmer / AI Model Murah*