# Issue: POS Fullscreen Mode - Ubah Tampilan UI/UX Seperti KDS

## Latar Belakang

Modul KDS saat ini menggunakan mode fullscreen tanpa sidebar dan navbar, sehingga chef dapat fokus pada pesanan tanpa gangguan. Modul POS juga perlu diterapkan konsep yang sama agar kasir dapat bekerja lebih fokus dan efisien tanpa elemen UI yang tidak diperlukan.

## Tujuan

Mengubah tampilan UI/UX modul POS menjadi fullscreen mode seperti KDS:
- Tidak ada sidebar
- Tidak ada navbar
- Hanya menampilkan elemen yang diperlukan untuk transaksi POS

## Tahapan Implementasi

### Tahap 1: Persiapan dan Analisis

1. **Analisis file modul POS**
   - Lokasi: `src/pages/pos.ts`
   - Identifikasi semua komponen yang ada: sidebar, navbar, content area
   - Catat fungsi-fungsi penting yang perlu dipertahankan

2. **Analisis modul KDS sebagai referensi**
   - Lokasi: `src/pages/kitchen.ts`
   - Pelajari struktur HTML, CSS, dan JavaScript yang digunakan
   - Perhatikan bagaimana fullscreen mode diimplementasikan

### Tahap 2: Struktur HTML dan CSS

1. **Buat container fullscreen baru**
   ```css
   .pos-fullscreen {
     display: flex;
     flex-direction: column;
     height: 100vh;
     padding: 16px;
     gap: 12px;
   }
   ```

2. **Hapus atau sembunyikan sidebar dan navbar**
   - Cari dan hapus import sidebar dan navbar di `src/pages/pos.ts`
   - Atau buat CSS untuk menyembunyikan elemen tersebut dalam mode fullscreen

3. **Styling untuk komponen yang tersisa**
   - Daftar menu/pesanan
   - Keranjang belanja
   - Tombol-tombol aksi (bayar, clear, dll)

### Tahap 3: Modifikasi JavaScript

1. **Sederhanakan logika rendering**
   - Hilangkan referensi ke sidebar/navbar
   - Fokuskan pada logika tampilan POS utama

2. **Pertahankan fungsionalitas inti**
   - Pilih menu
   - Tambah ke keranjang
   - Hitung total
   - Proses pembayaran
   - Cetak struk (jika ada)

### Tahap 4: Pengujian

1. **Test tampilan**
   - Apakah tampilan fullscreen berfungsi?
   - Apakah semua elemen ter-render dengan benar?

2. **Test fungsionalitas**
   - Apakah pemilihan menu masih berfungsi?
   - Apakah perhitungan total akurat?
   - Apakah proses pembayaran berjalan?

3. **Test responsif**
   - Cek tampilan di berbagai ukuran layar

## File yang Mungkin Perlu Dimodifikasi

- `src/pages/pos.ts` - Main POS page
- `src/routes/pos.ts` - Jika ada perubahan route
- `src/templates/sidebar.ts` - Mungkin perlu dimodifikasi untuk menyembunyikan link POS

## Catatan Penting

- Pastikan untuk mempertahankan semua fungsionalitas inti POS
- Gunakan CSS variables yang sama dengan KDS untuk konsistensi
- Pertimbangkan untuk menambahkan tombol kembali ke dashboard (seperti KDS)
- Jangan hapus file sidebar dan navbar - cukup sembunyikan atau buat mode baru

## Referensi

- Lihat `src/pages/kitchen.ts` untuk contoh implementasi fullscreen mode
- Lihat `public/styles/global.css` untuk CSS variables yang tersedia