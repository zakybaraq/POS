# Rencana Rebuild Total: UI/UX Modul POS `/pos`

## Latar Belakang

Modul POS saat ini (`src/pages/pos.ts`) sudah berfungsi dengan local-first cart system, namun UI/UX-nya masih sangat dasar dan tidak sesuai dengan standar POS restoran modern.

### Masalah UI/UX Saat Ini
1. **Layout sempit** — Panel meja hanya 140px, terlalu kecil untuk usability
2. **Menu items polos** — Hanya nama + harga, tanpa gambar, tanpa kategori visual
3. **Cart tidak informatif** — Tidak menampilkan nomor meja dengan jelas, tidak ada info waiter
4. **Tidak ada fitur hold/recall** — Tidak bisa menyimpan pesanan sementara
5. **Tidak ada transfer meja** — Tidak bisa pindah pesanan ke meja lain
6. **Tidak ada split bill** — Tidak bisa bagi tagihan
7. **Tidak ada jumlah tamu** — Tidak bisa input berapa orang di meja
8. **Tidak ada receipt preview** — Struk hanya alert text, tidak ada preview
9. **Tidak ada quick payment buttons** — Harus ketik manual jumlah uang
10. **Tidak ada order type** — Tidak bisa pilih dine-in atau takeaway
11. **Tidak ada visual feedback** — Tidak ada animasi saat tambah item, tidak ada toast notification
12. **Tidak ada keyboard shortcuts** — Kasir harus klik semua, tidak bisa pakai keyboard

---

## Tujuan

Rombak total UI/UX POS agar:
1. **Modern & profesional** — Tampilan seperti POS restoran kelas atas
2. **Efisien** — Minimal klik, maksimal produktivitas
3. **Informatif** — Semua data penting terlihat jelas
4. **Responsif** — Bisa dipakai di tablet dan desktop

---

## Tahap 1: Redesign Layout POS

### Layout Baru (3 Panel)
```
┌──────────────────────────────────────────────────────────────────┐
│  Header: [Meja 5] [3 Tamu] [Dine-in ▼]      [🔍 Cari] [Hold]   │
├──────────────┬───────────────────────────┬──────────────────────┤
│              │                           │                      │
│  MEJA        │      MENU                 │     ORDER/CART       │
│  (200px)     │      (flex: 1)            │     (320px)          │
│              │                           │                      │
│  [1] [2] [3] │  [Semua] [Makanan] [Min]  │  📋 Meja 5 - Dine-in │
│  [4] [5] [6] │                           │                      │
│  [7] [8] [9] │  ┌────┐ ┌────┐ ┌────┐    │  Nasi Goreng    x2   │
│  [10][11][12]│  │ 🍛 │ │ 🍜 │ │ 🥤 │    │  Rp 30.000           │
│              │  │Nasi│ │ Mie│ │ Es │    │  [−] 2 [+] [🗑️]     │
│              │  │Gor │ │Gor │ │ Teh│    │  Catatan: tidak pedas │
│              │  │15K │ │12K │ │ 5K │    │                      │
│              │  └────┘ └────┘ └────┘    │  ─────────────────    │
│              │  ┌────┐ ┌────┐ ┌────┐    │  Subtotal:  30.000   │
│              │  │ 🍗 │ │ 🍚 │ │ 🧃 │    │  Pajak:      3.000   │
│              │  │Ayam│ │Nasi│ │Jus │    │  Diskon:         0   │
│              │  │Gor │ │Put │ │ 8K │    │  ─────────────────    │
│              │  │18K │ │ 8K │ │    │    │  TOTAL:     33.000   │
│              │  └────┘ └────┘ └────┘    │                      │
│  🟢: 7 🔴: 5 │                           │  [💳 Bayar] [📋 Hold] │
│              │                           │  [↩️ Batal]           │
└──────────────┴───────────────────────────┴──────────────────────┘
```

### Perubahan Utama
- Panel meja diperbesar dari 140px → 200px
- Menu items diperbesar dengan emoji/icon placeholder
- Cart diperbesar dari 300px → 320px
- Header POS menampilkan info meja yang aktif
- Legend warna meja di bawah panel meja

---

## Tahap 2: Improve Menu Display

### Menu Card Baru
```
┌─────────────┐
│     🍛      │  ← Emoji/icon placeholder (bisa diganti gambar nanti)
│             │
│ Nasi Goreng │  ← Nama menu (bold, 2 line max)
│             │
│  Rp 15.000  │  ← Harga (besar, warna primary)
└─────────────┘
```

### Fitur Baru
- **Grid responsif** — Auto-adjust berdasarkan ukuran layar
- **Hover effect** — Scale up + shadow saat hover
- **Active animation** — Pulse animation saat diklik
- **Category filter** — Tab dengan icon, bukan hanya text
- **Search dengan highlight** — Highlight text yang match di nama menu

---

## Tahap 3: Improve Cart/Order Panel

### Header Cart
```
📋 Meja 5 — Dine-in (3 tamu)
```

### Item di Cart
```
┌─────────────────────────────────┐
│ Nasi Goreng Spesial        x2  │
│ Rp 30.000                       │
│ [−]  2  [+]        🗑️          │
│ ┌─────────────────────────────┐ │
│ │ Catatan: tidak pedas...     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Summary Section
```
┌─────────────────────────────────┐
│ Subtotal            Rp 30.000   │
│ Pajak (10%)          Rp 3.000   │
│ Diskon                   Rp 0   │
│ ─────────────────────────────── │
│ TOTAL              Rp 33.000    │
│                                 │
│ [💳 Bayar]  [📋 Hold]           │
│ [↩️ Batal]                      │
└─────────────────────────────────┘
```

### Fitur Baru
- **Nomor meja + tipe order** di header cart
- **Jumlah tamu** — bisa diubah
- **Tipe order** — Dine-in / Takeaway dropdown
- **Quick payment buttons** — Uang pas, 50K, 100K, 200K
- **Hold/Recall** — Simpan pesanan sementara, recall nanti
- **Toast notification** — Ganti alert() dengan toast yang lebih modern

---

## Tahap 4: Tambah Fitur Hold/Recall Order

### Hold Order
Simpan pesanan sementara tanpa submit ke server. Berguna jika:
- Pelanggan belum selesai pesan
- Pelanggan mau lihat menu lagi
- Ada gangguan (telepon, dll)

### Implementasi
```javascript
// Hold: simpan cart ke localStorage dengan key berbeda
function holdOrder() {
  const cart = getLocalCart();
  if (!cart || cart.items.length === 0) return;
  const heldOrders = JSON.parse(localStorage.getItem('pos-held-orders') || '[]');
  heldOrders.push({ ...cart, heldAt: new Date().toISOString() });
  localStorage.setItem('pos-held-orders', JSON.stringify(heldOrders));
  clearCart();
  showToast('Pesanan disimpan (hold)');
}

// Recall: tampilkan daftar held orders
function recallOrder(index) {
  const heldOrders = JSON.parse(localStorage.getItem('pos-held-orders') || '[]');
  const order = heldOrders.splice(index, 1)[0];
  localStorage.setItem('pos-held-orders', JSON.stringify(heldOrders));
  saveCart(order);
  showToast('Pesanan dipanggil kembali');
}
```

### UI
- Tombol "Hold" di cart
- Badge count menunjukkan berapa pesanan yang di-hold
- Modal recall menampilkan daftar held orders dengan waktu hold

---

## Tahap 5: Tambah Quick Payment Buttons

### Di bawah input uang diterima
```
┌─────────────────────────────────┐
│ Uang Diterima                   │
│ [          50.000          ]    │
│                                 │
│ [Uang Pas] [50K] [100K] [200K]  │
│                                 │
│ Kembalian: Rp 17.000            │
└─────────────────────────────────┘
```

### Implementasi
```javascript
function setQuickPayment(amount) {
  document.getElementById('amount-paid').value = amount;
  calculateChange();
}
```

---

## Tahap 6: Tambah Receipt Preview Modal

Ganti alert text dengan modal preview struk yang proper.

### Layout Receipt
```
┌──────────────────────────────┐
│         POS APP              │
│     Jl. Contoh No. 123       │
│    Telp: (021) 1234-5678     │
│ ──────────────────────────── │
│ Meja: 5    Kasir: Muhammad Z │
│ Tgl: 04/04/2026 10:30        │
│ ──────────────────────────── │
│ Nasi Goreng      x2   30.000 │
│ Es Teh           x1    5.000 │
│ ──────────────────────────── │
│ Subtotal            35.000   │
│ Pajak (10%)          3.500   │
│ TOTAL               38.500   │
│ Bayar               50.000   │
│ Kembali             11.500   │
│ ──────────────────────────── │
│       TERIMA KASIH!          │
│                              │
│ [🖨️ Print] [✕ Tutup]         │
└──────────────────────────────┘
```

---

## Tahap 7: Tambah Toast Notification System

Ganti semua `alert()` dengan toast notification yang modern.

### Implementasi
```html
<div id="toast-container" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>
```

```javascript
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

### Toast Types
- ✅ **Success** — "Item ditambahkan", "Pembayaran berhasil"
- ⚠️ **Warning** — "Cart kosong", "Meja belum dipilih"
- ❌ **Error** — "Gagal membuat pesanan", "Server error"

---

## Tahap 8: Tambah Keyboard Shortcuts

| Shortcut | Aksi |
|----------|------|
| `Ctrl+F` | Focus ke search menu |
| `Ctrl+H` | Hold order |
| `Ctrl+B` | Bayar (jika cart ada item) |
| `Escape` | Unselect meja / tutup modal |
| `1-9` | Pilih meja 1-9 |
| `Enter` | Submit pembayaran (jika di payment mode) |

### Implementasi
```javascript
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('menu-search').focus(); }
  if (e.ctrlKey && e.key === 'h') { e.preventDefault(); holdOrder(); }
  if (e.ctrlKey && e.key === 'b') { e.preventDefault(); if (currentOrderId) processPayment(); }
  if (e.key === 'Escape') { unselectTable(); closeAllModals(); }
});
```

---

## Tahap 9: Tambah Fitur Transfer Meja

Bisa memindahkan pesanan dari satu meja ke meja lain.

### UI
- Tombol "Transfer" di cart (hanya muncul jika ada order aktif)
- Modal pilih meja tujuan (hanya meja available yang tampil)
- Konfirmasi sebelum transfer

### Implementasi
```javascript
async function transferTable(fromTableId, toTableId) {
  const res = await fetch('/api/orders/' + currentOrderId + '/transfer', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newTableId: toTableId })
  });
  // Update UI
}
```

---

## Tahap 10: Testing

### Skenario Test
1. **Layout** — Tampilan rapi di desktop (1920x1080) dan tablet (1024x768)
2. **Menu display** — Menu tampil dengan icon/emoji, hover effect berfungsi
3. **Cart** — Info meja jelas, qty +/- berfungsi, catatan tersimpan
4. **Hold/Recall** — Hold pesanan → pilih meja lain → recall pesanan hold
5. **Quick payment** — Klik 50K → input terisi → kembalian terhitung
6. **Receipt preview** — Modal struk tampil rapi, bisa print
7. **Toast** — Toast muncul saat tambah item, bayar, hold, error
8. **Keyboard** — Ctrl+F focus search, Escape unselect meja
9. **Transfer meja** — Pindah order ke meja lain berhasil

---

## File yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/pos.ts` | **Rebuild total** — layout baru, menu cards, cart, modals, toast, shortcuts |
| `src/routes/orders.ts` | Tambah endpoint `PUT /:id/transfer` |
| `src/public/styles/global.css` | Tambah CSS untuk toast, receipt, quick-pay buttons |

## Catatan Penting

- **JANGAN hapus** fitur yang sudah ada (local cart, notes, discount, kirim ke dapur)
- **Backward compatible** — semua API endpoint yang ada tetap berfungsi
- **Emoji sebagai placeholder** — icon menu pakai emoji dulu, nanti bisa diganti gambar
- **Estimasi total**: 5-7 jam kerja
