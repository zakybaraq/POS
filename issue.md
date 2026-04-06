# Issue: Perbaikan Flow Pembayaran di Halaman POS

## Latar Belakang

Saat ini flow pembayaran di halaman POS (`http://localhost:3000/pos`) memiliki masalah:

1. **Tombol Bayar dobel**: Ketika user klik tombol "Bayar" (antara Hold dan Cancel), Muncul section pembayaran dengan tombol "Bayar" lagi. Ini membingungkan user karena ada 2 tombol Bayar.

2. **Tidak efisien**: User harus klik tombol Bayar dulu untuk lihat detail harga (subtotal, pajak, total).

3. **Payment tidak berfungsi**: Ketika user klik tombol Bayar di section pembayaran, tidak terjadi apapun.

## Tujuan

1. Hilangkan tombol Bayar (antara Hold dan Cancel)
2. Tampilkan detail harga (subtotal, pajak, total) terlihat dari awal TANPA user klik apapun
3. Perbaiki flow pembayaran agar berfungsi

## Perubahan yang Diperlukan

### 1. Hapus Tombol Bayar di Cart Actions

**File**: `src/pages/pos.ts` ( sekitar baris 147-150)

**Sebelum**:
```html
<div class="pos-cart-actions">
  <button class="pos-btn" onclick="holdOrder()">Hold</button>
  <button class="pos-btn pos-btn-primary" onclick="togglePayment()">Bayar</button>
  <button class="pos-btn pos-btn-danger" onclick="cancelOrder()">Batal</button>
</div>
```

**Sesudah**:
```html
<div class="pos-cart-actions">
  <button class="pos-btn" onclick="holdOrder()">Hold</button>
  <button class="pos-btn pos-btn-danger" onclick="cancelOrder()">Batal</button>
</div>
```

### 2. Tampilkan Payment Section dari Awal

**File**: `src/pages/pos.ts` ( sekitar baris 135)

**Sebelum**:
```html
<div class="pos-payment" id="payment-section">
```

**Sesudah**:
```html
<div class="pos-payment show" id="payment-section">
```

### 3. Perbaiki Function processPayment di pos-client.ts

**File**: `src/pages/pos-client.ts` - function `processPayment()`

Pastikan function ini benar-benar memanggil API dan memproses pembayaran:

```javascript
async function processPayment() {
  const total = parseInt(document.getElementById('summary-total').textContent.replace(/\./g, '')) || 0;
  const paid = parseInt(document.getElementById('paid-input').value) || 0;
  
  if (paid < total) { 
    toast('Uang kurang!', 'error'); 
    return; 
  }

  // Jika bukan server order, buat order dulu
  if (!state.isServerOrder && !state.currentOrderId) {
    const cart = getCart();
    const res = await fetch('/api/orders/with-items', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        tableId: cart.tableId, 
        userId: state.currentUserId, 
        items: cart.items.map(i => ({ menuId: i.menuId, quantity: i.quantity, notes: i.notes || '' })) 
      }) 
    });
    const data = await res.json();
    if (data.error) { toast(data.error, 'error'); return; }
    state.currentOrderId = data.order.id;
    state.isServerOrder = true;
    clearCart();
  }

  // Proses pembayaran
  const res = await fetch('/api/orders/' + state.currentOrderId + '/pay', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ amountPaid: paid }) 
  });
  const data = await res.json();
  if (data.error) { toast(data.error, 'error'); }
  else {
    const cart = getCart();
    if (cart && cart.items.length > 0) {
      localStorage.setItem('last-receipt', JSON.stringify(cart));
    }
    toast('Pembayaran berhasil!'); 
    printReceipt(); 
    resetAfterPayment(); 
  }
}
```

## Tahapan Implementasi

### Tahap 1: Persiapan
1. Clone repository
2. Buka file `src/pages/pos.ts`
3. Buka file `src/pages/pos-client.ts`

### Tahap 2: Hapus Tombol Bayar (5 menit)
1. Di `pos.ts`, cari bagian `pos-cart-actions`
2. Hapus `<button class="pos-btn pos-btn-primary" onclick="togglePayment()">Bayar</button>`
3. Simpan perubahan

### Tahap 3: Tampilkan Payment Section (5 menit)
1. Di `pos.ts`, cari `<div class="pos-payment" id="payment-section">`
2. Tambahkan class `show`: `<div class="pos-payment show" id="payment-section">`
3. Simpan perubahan

### Tahap 4: Test Payment Flow (10 menit)
1. Jalankan server: `bun run src/index.ts`
2. Login ke aplikasi
3. Buka halaman POS
4. Pilih meja, tambahkan menu ke cart
5. Pastikan detail harga terlihat tanpa klik apapun
6. Klik tombol "BAYAR" di section pembayaran
7. Verifikasi pembayaran berhasil

### Tahap 5: Fix Jika Ada Bug
1. Jika tombol Bayar tidak responsif, cek function `processPayment()` di `pos-client.ts`
2. Pastikan semua fetch call ke API benar
3. Cek console browser untuk error

## Catatan

- Gunakan browser console (F12) untuk debugging
- Test dengan data menu yang ada di database
- Pastikan API endpoint `/api/orders/with-items` dan `/api/orders/:id/pay` tersedia

## File yang Dimodifikasi

1. `src/pages/pos.ts` - Hapus tombol Bayar, tambahkan class show
2. `src/pages/pos-client.ts` - Pastikan processPayment berfungsi

## Ekspektasi Hasil

1. Detail harga (subtotal, pajak, total) terlihat dari awal
2. Hanya ada 1 tombol Bayar (di dalam payment section)
3. Klik Bayar akan memproses pembayaran dengan benar