# Issue: Redesain Total POS - Tampilan Seperti KDS dengan Fungsionalitas Maksimal

## Latar Belakang

Modul POS saat ini masih menggunakan desain yang tidak optimal dan kurang responsif. Dengan参考 dari modul KDS yang sudah memiliki tampilan fullscreen yang bersih dan fokus, POS也需要 diterapkan konsep yang sama dengan penyesuaian untuk kebutuhan kasir.

## Tujuan

1. **Desain Baru**: Ubah tampilan POS menjadi clean, fullscreen, dan responsif seperti KDS
2. **Fungsionalitas**: Tingkatkan fitur-fitur POS untuk memaksimalkan produktivitas kasir

## Fitur Baru yang Akan Ditambahkan

### 1. Tampilan Fullscreen Tanpa Sidebar/Navbar
- Layout penuh tanpa elemen yang tidak diperlukan
- Hanya menampilkan elemen yang dibutuhkan kasir
- Menggunakan CSS variables seperti KDS

### 2. Daftar Meja yang Lebih Baik
- Tampilan grid meja yang lebih rapi
- Status jelas (tersedia/terisi/dipilih)
- Indikator visual yang jelas

### 3. Quick Actions
- Tombol hold yang mudah diakses
- Quick payment buttons (Uang Pas, 50K, 100K, 200K)
- Fast category switching

### 4. Keranjang yang Lebih Clean
- Tampilan item yang jelas dengan quantity controls
- Easy notes input
- Quick remove items

### 5. Payment yang Lebih Mudah
- Input nominal yang besar dan jelas
- Quick select nominal buttons
- Clear change display

### 6. Fitur Tambahan
- Keyboard shortcuts untuk操作 cepat
- Auto-focus pada input yang diperlukan
- Toast notifications untuk feedback

## Tahapan Implementasi

### Tahap 1: Setup dan Struktur
1. Buat container fullscreen baru
2. Setup CSS variables untuk styling
3. Hapus sidebar dan navbar

### Tahap 2: Layout Components
1. Header dengan title dan quick actions
2. Left panel: Tables + Menu
3. Right panel: Cart + Payment

### Tahap 3: Fungsionalitas
1. Table selection logic
2. Menu filtering dan search
3. Cart management
4. Payment flow
5. Hold/Recall orders
6. Transfer table

### Tahap 4: Polish dan UX
1. Keyboard shortcuts
2. Visual feedback
3. Error handling
4. Responsive adjustments

## Referensi

- Lihat `src/pages/kitchen.ts` untuk contoh fullscreen mode
- Lihat `src/pages/pos.ts` (versi lama) untuk fungsionalitas yang harus dipertahankan

## Catatan

- Semua fungsionalitas lama harus dipertahankan
- Payment flow harus tetap bekerja dengan benar
- Hold dan Recall orders harus berfungsi
- Transfer meja harus berfungsi
- Keyboard shortcuts harus dipertahankan (Ctrl+F, Ctrl+H, Escape)