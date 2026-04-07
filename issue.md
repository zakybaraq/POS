# Issue: Perbaikan UI/UX dan Perhitungan di Modul POS

## Latar Belakang

Terdapat dua masalah yang perlu diperbaiki pada modul POS:

1. **Masalah Perhitungan di History**: Pada history meja occupied, total pesanan ditampilkan dengan pajak (10%), tetapi tidak ada rincian pajak yang ditampilkan. User tidak bisa melihat berapa subtotal sebelum pajak dan berapa jumlah pajaknya.

2. **Kurangnya Label pada Input**: Di bagian `pos-cart-meta` terdapat input untuk:
   - Tipe pesanan (dine-in / take-away)
   - Jumlah customer
   
   Tidak ada label/keterangan yang jelas bahwa input tersebut untuk apa, sehingga user bisa kebingungan.

---

## Tahapan Implementasi

### Tahap 1: Tambahkan Rincian Pajak di History Meja Occupied

**File yang perlu diubah:** `src/pages/pos-client.ts`

**Langkah-langkah:**

1. Cari fungsi `renderMultipleOrdersCart(orders)` di dalam file `pos-client.ts`
2. Di dalam fungsi tersebut, cari bagian yang menampilkan total pesanan (biasanya di baris yang menampilkan `order.total`)
3. Tambahkan perhitungan pajak dan subtotal:
   - Total yang ditampilkan sudah includes pajak (10%)
   - Untuk mendapatkan subtotal: `subtotal = total / 1.1`
   - Untuk mendapatkan pajak: `tax = total - subtotal`
4. Tampilkan informasi ini dengan format yang jelas:
   ```
   Subtotal: Rp XXX.XXX
   Pajak (10%): Rp XX.XXX
   Total: Rp XXX.XXX
   ```

**Contoh kode yang perlu ditambahkan:**

```javascript
// Di dalam loop yang menampilkan pesanan, tambahkan:
const subtotal = Math.round(order.total / 1.1);
const tax = order.total - subtotal;

html += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;">';
html += '<span style="color:var(--color-text-secondary);">Subtotal</span>';
html += '<span style="font-weight:700;">' + subtotal.toLocaleString('id-ID') + '</span>';
html += '</div>';

html += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">';
html += '<span style="color:var(--color-text-secondary);">Pajak (10%)</span>';
html += '<span style="font-weight:700;">' + tax.toLocaleString('id-ID') + '</span>';
html += '</div>';

html += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-top:1px dashed var(--color-border);margin-top:4px;">';
html += '<span style="color:var(--color-text-secondary);font-weight:600;">Total</span>';
html += '<span style="font-weight:700;font-size:13px;">' + (order.total || 0).toLocaleString('id-ID') + '</span>';
html += '</div>';
```

**Catatan:**
- Jangan ubah logika perhitungan yang sudah ada di backend
- Display saja di frontend untuk memberikan informasi ke user
- Gunakan styling yang konsisten dengan elemen lain di history

---

### Tahap 2: Tambahkan Label pada Input Form di POS

**File yang perlu diubah:** `src/pages/pos.ts` dan/atau `src/pages/pos-client.ts`

**Langkah-langkah:**

1. Cari elemen `pos-cart-meta` di file HTML atau fungsi yang merender cart
2. Tambahkan label untuk input yang sudah ada:
   - Untuk selector tipe pesanan: tambahkan label "Tipe Pesanan"
   - Untuk input jumlah customer: tambahkan label "Jumlah Tamu"

**Jika menggunakan HTML (pos.ts):**

Cari bagian yang like ini:
```html
<div id="cart-meta" style="display:none;">
  <!-- Tambahkan label di sini -->
  <select id="order-type">...</select>
  <input type="number" id="guest-count">...</input>
</div>
```

Menjadi:
```html
<div id="cart-meta" style="display:none;">
  <div class="pos-form-group">
    <label style="font-size:11px;color:var(--color-text-secondary);">Tipe Pesanan</label>
    <select id="order-type">...</select>
  </div>
  <div class="pos-form-group">
    <label style="font-size:11px;color:var(--color-text-secondary);">Jumlah Tamu</label>
    <input type="number" id="guest-count">...</input>
  </div>
</div>
```

**Jika menggunakan JavaScript (pos-client.ts):**

Cari fungsi yang merender cart-meta dan tambahkan label di sana.

**Styling yang disarankan:**
- Label menggunakan font size kecil (11px)
- Warna text menggunakan `var(--color-text-secondary)` atau warna abu-abu
- Letakkan di atas input masing-masing

---

## Verifikasi

Setelah implementasi, lakukan verifikasi:

1. **Verifikasi Tahap 1:**
   - Buka POS, pilih meja yang occupied
   - Lihat history - seharusnya ada rincian: Subtotal, Pajak (10%), Total
   - Total harus sesuai dengan yang di bayarkan (sudah including pajak)

2. **Verifikasi Tahap 2:**
   - Buka POS, mulai pesanan baru (dine-in atau take-away)
   - Pastikan ada label yang jelas di atas input tipe pesanan dan jumlah customer
   - User harus bisa memahami tanpa perlu bertanya

---

## Catatan Penting

- Perubahan ini hanya untuk perbaikan UI/frontend, tidak mengubah data atau logika backend
- Pastikan styling tetap konsisten dengan desain yang sudah ada
- Jangan hapus fungsionalitas yang sudah ada
- Jangan tambahkan fitur baru selain yang diminta

---

## Estimasi Waktu

- Tahap 1: 15-30 menit
- Tahap 2: 15-30 menit
- Total: 30-60 menit

---

## Referensi File

- `src/pages/pos-client.ts` - berisi fungsi `renderMultipleOrdersCart()`
- `src/pages/pos.ts` - berisi HTML untuk cart dan form inputs
