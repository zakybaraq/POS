# Rencana Rebuild: Logika Bisnis POS

## Latar Belakang

Implementasi POS saat ini memiliki beberapa masalah fundamental yang tidak sesuai dengan alur kerja restoran di lapangan:

### Masalah Saat Ini

1. **Order langsung dibuat saat klik meja** — User klik meja available → langsung create order di database. Ini bermasalah karena:
   - Jika user salah klik meja, order sudah terlanjur dibuat
   - User tidak bisa browsing meja tanpa membuat order
   - Database penuh dengan order "phantom" yang tidak pernah di-checkout
   
2. **Cart sepenuhnya server-side** — Setiap klik menu langsung POST ke API:
   - Tidak bisa undo/remove item sebelum checkout
   - Tidak ada draft state — semua perubahan langsung tersimpan
   - UX lambat karena setiap aksi butuh network request
   
3. **Tidak ada manajemen order yang proper**:
   - Tidak bisa pindah meja (transfer order)
   - Tidak bisa preview order sebelum checkout
   - Tidak ada status "draft" untuk order yang belum finalized
   
4. **Tidak ada fitur POS standar restoran**:
   - Tidak bisa split bill
   - Tidak bisa tambah catatan per item (misal: "tidak pedas", "extra nasi")
   - Tidak ada diskon (per-item atau per-order)
   - Tidak ada pajak yang configurable
   - Tidak ada kitchen display / order routing ke dapur
   - Tidak ada print receipt yang proper
   
5. **State management berantakan**:
   - Semua state di global variables (`currentOrderId`, `selectedTableId`)
   - Tidak ada state persistence jika page reload
   - DOM manipulation manual tanpa framework

---

## Tujuan

Rebuild logika bisnis POS agar sesuai dengan alur kerja restoran nyata:

1. **Order tidak langsung dibuat** — user pilih meja → browse menu → tambah item → baru checkout/create order
2. **Cart lokal dulu** — item ditampung di cart lokal, baru di-sync ke server saat checkout
3. **Draft order** — order dibuat saat user mulai menambah item, bukan saat klik meja
4. **Fitur standar POS** — catatan item, diskon, split bill, transfer meja
5. **State management yang proper** — tidak bergantung pada global variables

---

## Tahap 1: Desain Data Model Baru

### Order Status Baru
```
draft → active → completed
              → cancelled
```

- `draft`: Order belum finalized, item masih bisa ditambah/dihapus tanpa affect inventory
- `active`: Order sudah finalized, item sudah dikirim ke dapur
- `completed`: Order sudah dibayar
- `cancelled`: Order dibatalkan

### Tambah Field di Order Items
```
- notes: varchar(255) — catatan per item (opsional)
- status: enum('pending', 'cooking', 'ready', 'served') — status item di dapur
```

### Tambah Field di Orders
```
- discount: int — diskon per order (opsional)
- discountType: enum('fixed', 'percentage') — tipe diskon
- notes: varchar(500) — catatan umum order
```

### File yang perlu diubah
- `src/db/schema.ts` — tambah field baru
- Jalankan SQL migration untuk update database

---

## Tahap 2: Buat Local Cart System

Buat cart yang berjalan di browser (localStorage) sebelum di-sync ke server.

### Struktur Cart di Client
```javascript
{
  tableId: 1,
  tableNumber: 5,
  items: [
    { menuId: 1, name: "Nasi Goreng", price: 15000, quantity: 2, notes: "Tidak pedas" },
    { menuId: 3, name: "Es Teh", price: 5000, quantity: 1, notes: "" }
  ],
  createdAt: "2024-01-01T10:00:00Z"
}
```

### Fungsi yang perlu dibuat
```javascript
// Simpan cart ke localStorage
function saveCart(cart) { localStorage.setItem('pos-cart', JSON.stringify(cart)); }

// Load cart dari localStorage
function loadCart() { return JSON.parse(localStorage.getItem('pos-cart') || 'null'); }

// Clear cart
function clearCart() { localStorage.removeItem('pos-cart'); }

// Add item ke cart (lokal, belum ke server)
function addToCartLocal(menuId, name, price, quantity = 1, notes = '') { ... }

// Remove item dari cart
function removeFromCartLocal(menuId) { ... }

// Update quantity item di cart
function updateQuantityLocal(menuId, quantity) { ... }

// Sync cart ke server (buat order di database)
async function syncCartToServer() { ... }
```

### File yang perlu diubah
- `src/pages/pos.ts` — ganti logic cart dari server-side ke local-first

---

## Tahap 3: Ubah Alur POS

### Alur Lama (Salah)
```
Klik meja → POST /api/orders (order langsung dibuat) → Klik menu → POST /api/orders/:id/items
```

### Alur Baru (Benar)
```
Klik meja → Tampilkan cart lokal → Klik menu → Tambah ke cart lokal → 
Klik "Kirim ke Dapur" → POST /api/orders (order dibuat dengan status 'active') → 
Klik "Bayar" → POST /api/orders/:id/pay
```

### Perubahan di `selectTable()`
```javascript
async function selectTable(tableId, tableNumber, status) {
  // Cek apakah ada cart lokal untuk meja ini
  const localCart = loadCart();
  
  if (localCart && localCart.tableId === tableId) {
    // Load cart lokal
    renderCart(localCart);
    return;
  }
  
  // Jika meja occupied, load order dari server
  if (status === 'occupied') {
    const orderData = await fetch('/api/orders/table/' + tableId);
    if (orderData.order) {
      currentOrderId = orderData.order.id;
      renderCart(orderData.order, orderData.items);
    }
    return;
  }
  
  // Jika meja available, tampilkan cart kosong (JANGAN buat order)
  selectedTableId = tableId;
  currentTableNumber = tableNumber;
  renderEmptyCart(tableNumber);
}
```

### Perubahan di `addToCart()`
```javascript
function addToCart(menuId, name, price) {
  if (!selectedTableId) {
    alert('Pilih meja terlebih dahulu!');
    return;
  }
  
  // Tambah ke cart lokal (bukan ke server)
  addToCartLocal(menuId, name, price);
  renderCartFromLocal();
}
```

### Tambah tombol "Kirim ke Dapur"
```javascript
async function submitOrder() {
  const localCart = loadCart();
  if (!localCart || localCart.items.length === 0) {
    alert('Cart kosong!');
    return;
  }
  
  // Buat order di server dengan semua item sekaligus
  const response = await fetch('/api/orders/with-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableId: localCart.tableId,
      userId: currentUserId,
      items: localCart.items.map(item => ({
        menuId: item.menuId,
        quantity: item.quantity,
        notes: item.notes
      }))
    })
  });
  
  const data = await response.json();
  if (data.error) {
    alert(data.error);
    return;
  }
  
  currentOrderId = data.order.id;
  clearCart();
  renderCart(data.order, data.items);
  
  // Update status meja di DOM
  const tableBtn = document.querySelector(`[data-table-id="${localCart.tableId}"]`);
  if (tableBtn) tableBtn.dataset.status = 'occupied';
}
```

---

## Tahap 4: Buat API Endpoint Baru

### `POST /api/orders/with-items`
Buat order baru dengan semua item sekaligus (bukan satu per satu).

```typescript
.post('/with-items', async ({ body }) => {
  const { tableId, userId, items } = body;
  
  // Mulai transaction
  const order = await createOrder(tableId, userId);
  
  for (const item of items) {
    await addOrderItem(order.id, item.menuId, item.quantity, item.notes);
  }
  
  await calculateTotals(order.id);
  await updateTableStatus(tableId, 'occupied');
  
  const finalOrder = await getOrderById(order.id);
  const orderItems = await getItemsWithMenuByOrderId(order.id);
  
  return { order: finalOrder, items: orderItems };
})
```

### `PUT /api/orders/:id/items/:itemId`
Update notes atau quantity item yang sudah ada.

### `GET /api/orders/draft`
Ambil semua order dengan status `draft`.

---

## Tahap 5: Tambah Fitur Catatan Item

Di cart, tambahkan input notes untuk setiap item:

```html
<div class="cart-item">
  <div class="cart-item-info">
    <div class="cart-item-name">Nasi Goreng</div>
    <div class="cart-item-qty">
      <button onclick="decreaseQty(1)">-</button>
      x2
      <button onclick="increaseQty(1)">+</button>
    </div>
  </div>
  <div class="cart-item-notes">
    <input type="text" placeholder="Catatan (opsional)" 
           onchange="updateItemNotes(1, this.value)"
           value="Tidak pedas">
  </div>
  <div class="cart-item-price">30.000</div>
</div>
```

---

## Tahap 6: Tambah Fitur Diskon

Di bagian cart summary, tambahkan input diskon:

```html
<div class="cart-summary">
  <div class="cart-row"><span>Subtotal</span><span>35.000</span></div>
  <div class="cart-row"><span>Pajak (10%)</span><span>3.500</span></div>
  <div class="cart-discount">
    <input type="number" id="discount-amount" placeholder="Diskon" 
           onchange="applyDiscount(this.value)">
    <select id="discount-type">
      <option value="fixed">Rp</option>
      <option value="percentage">%</option>
    </select>
  </div>
  <div class="cart-row total"><span>Total</span><span>38.500</span></div>
</div>
```

---

## Tahap 7: Testing

### Skenario Test
1. **Flow normal**: Pilih meja → tambah 3 menu → klik "Kirim ke Dapur" → order dibuat → klik "Bayar" → pembayaran berhasil
2. **Salah klik meja**: Pilih meja A → batal → pilih meja B → cart kosong, tidak ada order phantom
3. **Refresh page**: Tambah item ke cart → refresh → cart masih ada (dari localStorage)
4. **Meja occupied**: Klik meja yang sudah ada order → load order yang ada → bisa tambah item lagi
5. **Catatan item**: Tambah catatan "Tidak pedas" → submit → catatan tersimpan di database
6. **Diskon**: Input diskon 10% → total berkurang sesuai

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | Tambah field: notes, discount, discountType, item status |
| `src/pages/pos.ts` | Rebuild total logic cart dari server-side ke local-first |
| `src/routes/orders.ts` | Tambah endpoint `POST /with-items` |
| `src/repositories/order.ts` | Tambah fungsi createOrderWithItems |
| `src/repositories/order-item.ts` | Tambah field notes di addItem |

## Catatan Penting

- **JANGAN hapus** endpoint yang sudah ada — buat endpoint baru
- **Backward compatible** — order lama (tanpa notes/diskon) tetap bisa diproses
- **localStorage** hanya untuk cart sementara — setelah submit, data harus ada di server
- **Test setiap tahap** — jangan rebuild semua sekaligus lalu test di akhir
- **Estimasi total**: 4-6 jam kerja
