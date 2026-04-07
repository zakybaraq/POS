# Issue: Fitur Kosongkan Meja dan Histori Pesanan per-Sesi

## Ringkasan Masalah

Pada halaman POS (`http://localhost:3000/pos`), terdapat dua masalah:

1. **Tidak ada fitur "Kosongkan Meja"** - Ketika customer sudah pulang, meja yang berstatus `occupied` tidak bisa dikosongkan sehingga meja tidak bisa digunakan oleh customer lain.

2. **Histori pesanan terlalu banyak** - Ketika klik meja yang `occupied`, cart menampilkan SEMUA pesanan yang pernah ada di meja tersebut dari semua sesi/customer, bukan hanya pesanan customer yang sedang duduk di meja saat ini.

---

## File yang Terlibat

| File | Peran |
|------|-------|
| `src/repositories/table.ts` | Management status meja (updateTableStatus) |
| `src/repositories/order.ts` | Fetch pesanan berdasarkan tableId |
| `src/routes/tables.ts` | API endpoint untuk update status meja |
| `src/routes/orders.ts` | API endpoint untuk order lifecycle |
| `src/pages/pos-client.ts` | Client-side logic: selectTable(), renderMultipleOrdersCart(), kosongkanMeja() |
| `src/pages/pos.ts` | HTML modal "Kosongkan Meja" |

---

## Langkah Implementasi

### Masalah 1: Fitur Kosongkan Meja

**Kondisi Saat Ini:**
- Ketika klik meja `occupied`, tombol "Kosongkan" muncul (baris 257 di pos-client.ts)
- Tapi ketika diklik, fungsi `kosongkanMeja()` hanya memanggil modal saja (baris 330-332)
- Modal "Kosongkan Meja" sudah ada di pos.ts (baris 231-248)

**Yang Perlu Diperbaiki:**
1. Fungsi `kosongkanMeja()` di `src/pages/pos-client.ts` harus benar-benar mengosongkan meja

**Langkah Implementasi:**

#### Langkah 1: Update fungsi kosongkanMeja() di pos-client.ts

**Lokasi:** `src/pages/pos-client.ts`, baris ~330

**Kode saat ini (hanya menampilkan modal):**
```typescript
async function kosongkanMeja() {
  showKosongkanMejaModal();
}
```

**Kode yang benar:**
```typescript
async function kosongkanMeja() {
  const tableId = state.selectedTableId;
  if (!tableId) {
    toast('Pilih meja dulu', 'warning');
    return;
  }

  // Jika ada pesanan aktif, selesaikan pesanan dulu (bukan cancel)
  if (state.currentOrderId) {
    const res = await fetch('/api/orders/' + state.currentOrderId + '/finish', {
      method: 'POST'
    });
    const data = await res.json();
    if (data.error) {
      toast(data.error, 'error');
      return;
    }
    toast('Pesanan diselesaikan');
  }

  // Update status meja menjadi available
  await fetch('/api/tables/' + tableId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'available' })
  });

  toast('Meja dikosongkan');
  // Reset state dan reload
  state.selectedTableId = null;
  state.currentOrderId = null;
  location.reload();
}
```

#### Langkah 2: Pastikan endpoint /finish ada

**Lokasi:** `src/routes/orders.ts`

**Jika belum ada, tambahkan endpoint ini:**
```typescript
// POST /api/orders/:id/finish - Selesai makan, meja dikosongkan
.post('/:id/finish', async ({ cookie, headers, params: { id }, body }) => {
  const user = getUserFromRequest(cookie, headers);
  if (!user) return { error: 'Unauthorized' };
  
  const order = await orderRepo.getOrderById(Number(id));
  if (!order) {
    return { error: 'Order not found' };
  }
  
  // Update status pesanan menjadi 'completed'
  await orderRepo.updateOrderStatus(Number(id), 'completed');
  
  return { success: true, order };
})
```

---

### Masalah 2: Histori Pesanan Terlalu Banyak

**Kondisi Saat Ini:**
- Ketika klik meja `occupied`, kode memanggil `/api/orders/table/{id}/all` (baris 249 di pos-client.ts)
- Ini mengambil SEMUA pesanan di meja tersebut, dari semua sesi/customer
- Semua pesanan ditampilkan di cart pakai `renderMultipleOrdersCart()`

**Yang Perlu Diperbaiki:**
- Hanya tampilkan pesanan yang sedang aktif (status `active`) di meja tersebut
- Jika ada pesanan lama yang `completed`, jangan tampilkan di cart utama

**Langkah Implementasi:**

#### Langkah 1: Ubah logika selectTable() di pos-client.ts

**Lokasi:** `src/pages/pos-client.ts`, baris ~248-267

**Kode saat ini:**
```typescript
if (status === 'occupied') {
  const res = await fetch('/api/orders/table/' + id + '/all');
  const data = await res.json();
  
  const activeOrder = data.orders ? data.orders.find(o => o.status === 'active') : null;
  state.currentOrderId = activeOrder ? activeOrder.id : null;
  state.isServerOrder = !!activeOrder;
  document.getElementById('cart-title').textContent = 'Meja ' + num;
  
  document.getElementById('btn-kosongkan').style.display = 'inline';
  document.getElementById('btn-transfer').style.display = 'none';
  
  if (data.orders && data.orders.length > 0) {
    renderMultipleOrdersCart(data.orders);  // <-- Menampilkan SEMUA pesanan
  } else {
    document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Meja ' + num + ' - Tambahkan menu</div>';
    document.getElementById('cart-meta').style.display = 'none';
    document.getElementById('cart-footer').style.display = 'block';
  }
  return;
}
```

**Kode yang benar:**
```typescript
if (status === 'occupied') {
  const res = await fetch('/api/orders/table/' + id + '/all');
  const data = await res.json();
  
  // Hanya ambil pesanan yang sedang aktif (status = 'active')
  // Jangan tampilkan pesanan lama (completed/cancelled)
  const activeOrder = data.orders ? data.orders.find(o => o.status === 'active') : null;
  state.currentOrderId = activeOrder ? activeOrder.id : null;
  state.isServerOrder = !!activeOrder;
  document.getElementById('cart-title').textContent = 'Meja ' + num;
  
  document.getElementById('btn-kosongkan').style.display = 'inline';
  document.getElementById('btn-transfer').style.display = 'none';
  
  // Jika ada pesanan aktif, tampilkan di cart
  if (activeOrder) {
    // Fetch items untuk pesanan aktif saja
    const itemsRes = await fetch('/api/orders/' + activeOrder.id + '/items');
    const itemsData = await itemsRes.json();
    renderServerCart(activeOrder, itemsData.items || [], false);
  } else {
    // Tidak ada pesanan aktif - meja masih occupied tapi tidak ada pesanan
    // Ini bisa terjadi jika pesanan sebelumnya sudah selesai tapi status meja belum diupdate
    document.getElementById('cart-items').innerHTML = '<div class="pos-cart-empty">Meja ' + num + ' - Tambahkan menu</div>';
    document.getElementById('cart-meta').style.display = 'none';
    document.getElementById('cart-footer').style.display = 'block';
  }
  return;
}
```

#### Langkah 2: Hapus atau update fungsi renderMultipleOrdersCart()

Karena sekarang tidak perlu menampilkan banyak pesanan, fungsi `renderMultipleOrdersCart()` mungkin tidak diperlukan lagi. Namun, bisa juga dipertahankan untuk fiturOpsional: lihat histori pesanan lama di meja.

Jika ingin menghapus:
```typescript
// Comment out atau hapus fungsi ini
// function renderMultipleOrdersCart(orders) { ... }
```

---

## Urutan Implementasi (Disarankan)

1. **Mulai dari Masalah 2** (Histori pesanan) - Paling sederhana, hanya ubah logika display
2. **Lanjut ke Masalah 1** (Kosongkan Meja) - Butuh API endpoint baru + update fungsi client

---

## Ringkasan Perubahan

| File | Masalah | Perubahan |
|------|---------|-----------|
| `src/pages/pos-client.ts` | Kosongkan Meja | Update fungsi `kosongkanMeja()` agar benar-benar mengosongkan meja |
| `src/pages/pos-client.ts` | Histori Pesanan | Ubah `selectTable()` untuk hanya tampilkan pesanan aktif |
| `src/routes/orders.ts` | Kosongkan Meja | Tambah endpoint `/:id/finish` jika belum ada |

---

## Catatan untuk Junior Programmer

1. **Status meja dan pesanan harus sinkron** - Ketika pesanan selesai (completed), meja harus jadi `available`. Ini sudah dilakukan oleh fungsi `kosongkanMeja()` yang diperbaiki.

2. **Endpoint /finish** - endpoint ini berbeda dari /cancel. /finish menandakan pesanan selesai (customer sudah membayar dan pergi), sedangkan /cancel menandakan pesanan dibatalkan.

3. **Histori pesanan lama** - Dengan perubahan ini, pesanan lama tidak akan muncul di cart. Tapi data pesanan lama tetap ada di database dan bisa diakses melalui halaman "Pesanan" (/orders) jika perlu dilihat kembali.

4. **Testing** - Setelah mengimplementasikan, test:
   - Pilih meja occupied → klik "Kosongkan" → meja harus menjadi available
   - Pilih meja occupied dengan pesanan → cart hanya menampilkan pesanan saat ini (bukan histori semua pesanan)

---

## Referensi

- File similar: `src/routes/orders.ts` - Cara membuat endpoint baru
- File similar: `src/pages/pos-client.ts` - Cara membuat fungsi cart
- Testing: `http://localhost:3000/pos` - Untuk test manual