# Issue: Perbaikan Tampilan POS dan KDS - Warna dan UI yang Lebih Jelas

## Latar Belakang

Tampilan POS dan KDS saat ini terlalu polos dengan warna putih yang dominan, menyebabkan:
1. User kesulitan membedakan elemen-elemen penting
2. Tombol sulit terlihat karena berwarna putih
3. Modal pada tombol Hold di POS tidak rapih

## Tujuan

1. Tambahkan warna yang lebih jelas untuk elemen-elemen penting
2. Perbaiki visibilitas tombol
3. Rapikan modal Hold di POS

## Tahapan Implementasi

### Tahap 1: Analisis dan Identifikasi Masalah

1. **Identifikasi elemen yang perlu warna berbeda**
   - Header (background berbeda)
   - Tombol-tombol aksi (Hold, Bayar, Batal, dll)
   - Panel/card container
   - Status indicator (tersedia, terisi, dipilih)

2. **Lihat referensi warna yang sudah ada**
   - Cek `public/styles/global.css` untuk CSS variables yang tersedia
   - Contoh: `var(--color-primary)`, `var(--color-success)`, `var(--color-error)`, `var(--color-warning)`

### Tahap 2: Perbaikan KDS (src/pages/kitchen.ts)

1. **Tambahkan warna pada header**
   ```css
   .kds-header {
     background: var(--color-card);
     /* sudah ada border, pertahankan */
   }
   ```

2. **Perbaiki visibilitas tombol**
   - Tombol "Mulai Masak" (pending): gunakan warna warning/oren
   - Tombol "Siap Saji" (cooking): gunakan warna success/hijau
   - Tombol "Sajikan" (ready): gunakan warna primary/biru
   - Contoh:
   ```css
   .kds-btn-start { background: var(--color-warning); color: white; }
   .kds-btn-ready { background: var(--color-success); color: white; }
   .kds-btn-serve { background: var(--color-primary); color: white; }
   ```

3. **Tambahkan warna pada list item berdasarkan status**
   ```css
   .kds-list-item.pending { border-left: 4px solid var(--color-warning); }
   .kds-list-item.cooking { border-left: 4px solid var(--color-success); }
   .kds-list-item.ready { border-left: 4px solid var(--color-primary); }
   ```

4. **Tambahkan warna pada stats**
   ```css
   .kds-stat.pending .kds-stat-value { color: var(--color-warning); }
   .kds-stat.cooking .kds-stat-value { color: var(--color-success); }
   .kds-stat.ready .kds-stat-value { color: var(--color-primary); }
   ```

### Tahap 3: Perbaikan POS (src/pages/pos.ts)

1. **Tambahkan warna pada tombol**
   ```css
   .pos-btn { background: var(--color-primary); color: white; }
   .pos-btn-success { background: var(--color-success); }
   .pos-btn-danger { background: var(--color-error); }
   .pos-btn-warning { background: var(--color-warning); }
   ```

2. **Tambahkan warna pada panel/containers**
   ```css
   .pos-tables { background: var(--color-card); border: 1px solid var(--color-border); }
   .pos-menu { background: var(--color-card); border: 1px solid var(--color-border); }
   .pos-cart { background: var(--color-card); border: 1px solid var(--color-border); }
   ```

3. **Perbaiki warna meja berdasarkan status**
   ```css
   .pos-table.available { background: var(--color-success); color: white; }
   .pos-table.occupied { background: var(--color-error); color: white; }
   .pos-table.selected { background: var(--color-primary); color: white; }
   ```

4. **Rapikan modal Hold**
   - Perbaiki CSS modal:
   ```css
   .pos-modal-content {
     background: var(--color-card);
     border: 1px solid var(--color-border);
     border-radius: var(--radius-lg);
     padding: 16px;
   }
   .pos-held-item {
     background: var(--color-bg);
     border: 1px solid var(--color-border);
     border-radius: var(--radius-md);
     padding: 12px;
     margin-bottom: 8px;
   }
   .pos-held-item:hover {
     border-color: var(--color-primary);
     background: var(--color-bg-secondary);
   }
   ```

5. **Tambahkan hover effect pada tombol**
   ```css
   .pos-btn:hover {
     filter: brightness(1.1);
     transform: translateY(-1px);
   }
   ```

### Tahap 4: Testing

1. Refresh halaman POS dan KDS
2. Cek semua tombol visibility
3. Cek modal Hold rapih atau tidak
4. Cek warna meja/pesanan sesuai status
5. Test semua fungsi tetap berjalan normal

## Referensi

- CSS Variables: `public/styles/global.css`
- Contoh styling: `src/pages/kitchen.ts` (sudah ada styling yang lebih baik)
- POS styling: `src/pages/pos.ts`

## Catatan Penting

- Gunakan CSS variables yang sudah ada, jangan buat warna baru
- Pertahankan konsistensi antara KDS dan POS
- Jangan ubah struktur HTML, hanya tambahkan/modifikasi CSS
- Test di berbagai ukuran layar