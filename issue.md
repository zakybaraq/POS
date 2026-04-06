# Issue: Perbaikan Meja Occupied dan Flow Pelanggan Sudah Bayar

## Ringkasan Masalah

Ketika meja berstatus `occupied` (ada pelanggan sedang makan), terdapat beberapa masalah dalam flow POS:

1. **Tidak ada histori pesanan** - Ketika klik meja occupied, cart tidak menampilkan histori pesanan customer
2. **Alert salah** - Ketika klik "Kosongkan Meja", alert mengatakan "Semua pesanan akan dibatalkan" padahal seharusnya pesanan selesai (completed), tidak dibatalkan
3. **Penambahan pesanan setelah bayar** - Bagaimana flow jika customer ingin menambah pesanan setelah pembayaran pertama?

---

## Masalah 1: Tidak Ada Histori Pesanan

### Kondisi Saat Ini
Ketika klik meja yang occupied:
- Jika meja punya pesanan aktif → cart menampilkan pesanan (sudah bisa edit)
- Jika meja punya pesanan selesai/tidak aktif → cart kosong, tidak显示 histori

### Kondisi yang Diinginkan
Ketika klik meja yang occupied:
- Tampilkan histori semua pesanan yang pernah dibuat di meja tersebut (meski sudah selesai)
- Pesanan yang sudah selesai harusnya **read-only** (tidak bisa edit)
- Jika ada pesanan aktif → bisa tambahkan item ke pesanan tersebut

### File yang Perlu Diubah
- `src/routes/orders.ts` - Endpoint untuk get semua pesanan berdasarkan tableId (bukan hanya yang active)
- `src/pages/pos-client.ts` - Fungsi `selectTable()` perlu fetch semua pesanan

### Langkah Implementasi

#### Langkah 1: Tambah Endpoint API
Buat endpoint baru di `src/routes/orders.ts`:

```typescript
// GET /api/orders/table/:tableId/all - Ambil semua pesanan di meja tertentu
.get('/table/:tableId/all', async ({ params: { tableId } }) => {
  const table = await tableRepo.getTableById(Number(tableId));
  if (!table) {
    return { error: 'Table not found' };
  }
  // Ambil semua pesanan (aktif + selesai) untuk meja ini
  const orders = await orderRepo.getOrdersByTableId(Number(tableId));
  return { table, orders };
})
```

#### Langkah 2: Tambah Repository Function
Di `src/repositories/order.ts`:

```typescript
export async function getOrdersByTableId(tableId: number) {
  return db.select().from(orders)
    .where(eq(orders.tableId, tableId))
    .orderBy(desc(orders.createdAt));
}
```

#### Langkah 3: Update Client-Side
Di `src/pages/pos-client.ts`, fungsi `selectTable()`:

```typescript
if (status === 'occupied') {
  // Fetch semua pesanan (bukan hanya yang aktif)
  const res = await fetch('/api/orders/table/' + id + '/all');
  const data = await res.json();
  
  if (data.orders && data.orders.length > 0) {
    // Tampilkan semua pesanan (read-only)
    renderMultipleOrdersCart(data.orders);
    // Tampilkan tombol "Tambah Pesanan" jika ada pesanan aktif
  }
}
```

---

## Masalah 2: Alert Salah Ketika Kosongkan Meja

### Kondisi Saat Ini
Ketika klik "Kosongkan Meja":
- Muncul alert: "Kosongkan meja ini? (Semua pesanan akan dibatalkan)"
- Jika user klik OK → pesanan di-cancel via API

### Kondisi yang Diinginkan
Ketika klik "Kosongkan Meja":
- Alert harusnya: "Kosongkan meja ini? Pelanggan akan pulang."
- Jika meja punya pesanan aktif → pesanan harus di-**finish/complete**, bukan di-cancel
- Jika meja punya pesanan selesai → langsung kosongkan meja

### File yang Perlu Diubah
- `src/pages/pos.ts` - Tambah modal HTML untuk konfirmasi kosongkan meja
- `src/pages/pos-client.ts` - Fungsi `kosongkanMeja()` dan fungsi modal
- `src/routes/orders.ts` - Endpoint untuk finish order
- `src/styles/pos.css` - Styling modal (bisa reuse dari payment modal)

### Langkah Implementasi

#### Langkah 1: Tambah Modal HTML di pos.ts
Di `src/pages/pos.ts`, setelah payment-confirm-modal (sekitar line 229):

```html
<div class="pos-modal" id="kosongkan-meja-modal">
  <div class="pos-modal-backdrop" onclick="closeKosongkanModal()"></div>
  <div class="pos-modal-content" style="max-width:360px;">
    <div class="pos-modal-header"><h3>Kosongkan Meja</h3><button class="pos-modal-close" onclick="closeKosongkanModal()">&times;</button></div>
    <div class="pos-modal-body">
      <div style="background:var(--color-bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--color-text-secondary);font-size:12px;">Meja</span>
          <span style="font-weight:600;" id="kosongkan-table-num">-</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--color-text-secondary);font-size:12px;">Status Pesanan</span>
          <span style="font-weight:600;" id="kosongkan-order-status">-</span>
        </div>
      </div>
      <p style="font-size:11px;color:var(--color-text-secondary);text-align:center;margin-bottom:16px;">
        ⚠️ Meja akan dikosongkan dan pesanan akan diselesaikan.
      </p>
      <div style="display:flex;gap:8px;">
        <button class="pos-btn" style="flex:1;" onclick="closeKosongkanModal()">Batal</button>
        <button class="pos-btn pos-btn-success" style="flex:1;" onclick="confirmKosongkanMeja()">Konfirmasi</button>
      </div>
    </div>
  </div>
</div>
```

#### Langkah 2: Tambah Endpoint API untuk Finish Order
Di `src/routes/orders.ts`:

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
  
  // Kosongkan meja
  if (order.tableId) {
    await tableRepo.updateTableStatus(order.tableId, 'available');
  }
  
  return { success: true };
})
```

#### Langkah 3: Update Client-Side Functions
Di `src/pages/pos-client.ts`:

```typescript
// Tampilkan modal konfirmasi kosongkan meja
function showKosongkanMejaModal() {
  if (!state.selectedTableId) {
    toast('Pilih meja dulu', 'warning');
    return;
  }
  
  const tableNum = state.currentTableNumber || state.selectedTableId;
  document.getElementById('kosongkan-table-num').textContent = 'Meja ' + tableNum;
  
  // Tampilkan status pesanan
  if (state.currentOrderId) {
    document.getElementById('kosongkan-order-status').textContent = 'Ada pesanan aktif';
  } else {
    document.getElementById('kosongkan-order-status').textContent = 'Tidak ada pesanan';
  }
  
  document.getElementById('kosongkan-meja-modal').style.display = 'flex';
}

// Tutup modal
function closeKosongkanModal() {
  document.getElementById('kosongkan-meja-modal').style.display = 'none';
}

// Konfirmasi kosongkan meja
async function confirmKosongkanMeja() {
  closeKosongkanModal();
  
  // Jika ada pesanan aktif, finish pesanan dulu (bukan cancel)
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
  
  // Jika meja occupied tapi tidak ada pesanan aktif, langsung kosongkan
  await fetch('/api/tables/' + state.selectedTableId, { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ status: 'available' }) 
  });
  
  toast('Meja dikosongkan');
  location.reload();
}

// Update fungsi kosongkanMeja untuk gunakan modal
async function kosongkanMeja() {
  showKosongkanMejaModal();
}
```

#### Langkah 4: Styling (Opsional)
Jika modal perlu penyesuaian, bisa tambah di `src/styles/pos.css`. Tapi karena pakai class yang sama dengan payment modal, harusnya sudah ada stylenya.

**Penting:** Pastikan button "Kosongkan" di cart memanggil `showKosongkanMejaModal()` bukan `kosongkanMeja()` langsung.update bagian client-side untuk menggunakan modal baru:

---

## Masalah 3: Penambahan Pesanan Setelah Bayar

### Skenario
1. Customer makan di meja, memesan makanan
2. Kasir memproses pembayaran
3. Customer ingin menambah pesanan (makanan/minuman tambahan)
4. Bagaimana flow-nya?

### Kondisi yang Diinginkan
Ada beberapa opsi:

**Opsi A: Buat pesanan baru**
- Setelah pembayaran, customer bisa mulai pesanan baru di meja yang sama
- Meja tetap "occupied" sampai customer benar-benar pulang

**Opsi B: Tambah ke pesanan yang sudah ada (untuk makanan saja)**
- Jika customer ingin menambah makanan setelah bayar, perlu opsi "Tambah Pesanan"
- Ini memerlukan perubahan flow pembayaran

### Rekomendasi: Opsi A (Pesanan Baru Sederhana)

Karena复杂性 dan keamanan,，建议使用 Opsi A:
- Meja tetap occupied setelah pembayaran (sudah ada)
- Jika customer ingin menambah pesanan, bisa klik "Tambah Pesanan" di cart
- Ini akan membuat pesanan baru atau tambahkan ke pesanan aktif

### Langkah Implementasi

#### Langkah 1: Tambah Tombol "Tambah Pesanan" di Cart
Di `src/pages/pos.ts` atau `src/pages/pos-client.ts`:

```typescript
// Di dalam cart, tambahkan tombol untuk menambah pesanan
function renderServerCart(order, items, readOnly = false) {
  let html = '';
  // ... existing code untuk render items ...
  
  // Jika pesanan sudah dibayar tapi customer masih di meja,
  // tampilkan tombol untuk menambah pesanan
  if (order.status === 'completed' && state.selectedTableId) {
    html += '<button class="pos-btn pos-btn-add" onclick="addMoreOrder()">+ Tambah Pesanan</button>';
  }
  
  document.getElementById('cart-items').innerHTML = html;
}
```

#### Langkah 2: Fungsi addMoreOrder()
Di `src/pages/pos-client.ts`:

```typescript
async function addMoreOrder() {
  // Cek apakah ada pesanan aktif di meja ini
  if (state.currentOrderId) {
    // Gunakan pesanan yang ada
    toast('Menambah ke pesanan yang ada...');
  } else {
    // Buat pesanan baru
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: state.selectedTableId,
        userId: state.currentUserId
      })
    });
    const data = await res.json();
    if (data.order) {
      state.currentOrderId = data.order.id;
      state.isServerOrder = true;
      toast('Pesanan baru dibuat');
    }
  }
  
  // Tampilkan cart dalam mode edit
  renderServerCartEditable();
}
```

#### Langkah 3: Buat Mode Edit untuk Cart
Di `src/pages/pos-client.ts`:

```typescript
function renderServerCartEditable() {
  // Sama seperti renderServerCart tapi dengan tombol edit (+, -, hapus)
  // Ini untuk saat menambah pesanan setelah pembayaran
}
```

---

## Ringkasan File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/routes/orders.ts` | Tambah endpoint `/table/:tableId/all` dan `/:id/finish` |
| `src/repositories/order.ts` | Tambah function `getOrdersByTableId()` |
| `src/pages/pos-client.ts` | Update `selectTable()`, `kosongkanMeja()`, tambah `addMoreOrder()` |
| `src/styles/pos.css` | Tambah styling jika diperlukan |

---

## Urutan Implementasi (Disarankan)

1. **Mulai dari Masalah 2** (Alert salah) - Paling sederhana, hanya ubah text dan API
2. **Lanjut ke Masalah 1** (Histori pesanan) - Butuh API baru dan render ulang cart
3. **Akhir Masalah 3** (Tambah pesanan setelah bayar) - Paling kompleks, opsional

---

## Catatan untuk Junior Programmer

1. **Selalu testing** setiap perubahan dengan Playwright atau manual
2. **Jangan lupa restart server** setelah mengubah file .ts
3. **Perhatikan authorization** - Pastikan role yang tepat bisa akses endpoint baru
4. **Gunakan console.log** untuk debugging jika perlu
5. **Ikuti pola kode yang sudah ada** - Lihat bagaimana fungsi serupa dibuat

---

## Referensi

- File similar: `src/routes/orders.ts` - Cara membuat endpoint baru
- File similar: `src/pages/pos-client.ts` - Cara membuat fungsi cart
- Testing: `http://localhost:3000/pos` - Untuk test manual
