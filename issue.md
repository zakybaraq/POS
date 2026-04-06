# Issue: Perbaikan Flow Meja dan Take Away di Modul POS

## Latar Belakang

Saat ini flow meja dan take away di halaman POS (`http://localhost:3000/pos`) tidak sesuai dengan kejadian nyata di dunia bisnis kuliner:

### Masalah 1: Meja tetap Terisi setelah payment

**Kondisi saat ini**: Setelah customer membayar, meja langsung menjadi "Terisi" dan harus dikosongkan manual.

**Kondisi nyata di restoran**:
- **Dine-in**: Customer membayar → masih duduk makan → meja tetap "Terisi" → setelah customer PULANG → baru dikosongkan
- **Takeaway**: Customer membayar → langsung diambil → meja tidak dipilih sama sekali

### Masalah 2: Takeaway harus pilih meja terlebih dahulu

**Kondisi saat ini**: Di modul POS, user harus memilih meja dulu baru bisa menambah menu. Ini tidak masuk akal untuk order takeaway.

**Kondisi nyata di restoran**:
- Customer datang → pilih mau dine-in atau takeaway
- Kalau takeaway: langsung buat pesanan tanpa perlu pilih meja
- Kalau dine-in: pilih meja → buat pesanan

### Masalah 3: Tidak ada pilihan dine-in vs takeaway saat buat pesanan

**Kondisi saat ini**: Saat pilih meja, sudah ada pilihan "Dine-in" dan "Takeaway", tapi logic-nya masih salah karena:
- User POS harus pilih meja dulu untuk order apapun
- Tidak ada cara untuk buat takeaway tanpa pilih meja

## Tujuan

1. **Takeaway tanpa pilih meja**: User POS bisa buat pesanan takeaway TANPA pilih meja
2. **Order type ditentukan di awal**: Ketika user mulai buat pesanan, pilih dulu: Dine-in atau Takeaway
3. **Meja hanya untuk Dine-in**: Meja hanya digunakan untuk pesanan dine-in, bukan takeaway
4. **Logic sesuai kejadian nyata**:
   - Dine-in: Pilih meja → Pesan → Bayar → (Customer masih di resto) → Meja Terisi → Setelah customer PULANG → Klik Kosongkan
   - Takeaway: Pilih "Takeaway" → Pesan → Bayar → Selesai (meja tidak dipilih sama sekali)

## Perubahan yang Diperlukan

### 1. Tambah Opsi "Takeaway" di Layar POS (Tanpa Pilih Meja)

**File**: `src/pages/pos.ts` - bagian awal sebelum pilih meja

Tambahkan tombol/opsi untuk memulai pesanan Takeaway:

```html
<div class="pos-order-type-selection">
  <button class="pos-btn pos-btn-order-type" onclick="startDineIn()">
    🍽️ Dine-in
    <span class="pos-order-type-desc">Makan di tempat</span>
  </button>
  <button class="pos-btn pos-btn-order-type" onclick="startTakeaway()">
    🥡 Takeaway
    <span class="pos-order-type-desc">Bawa pulang</span>
  </button>
</div>
```

CSS untuk ini:
```css
.pos-order-type-selection {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}
.pos-btn-order-type {
  flex: 1;
  padding: 20px;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pos-order-type-desc {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
}
```

### 2. Update State untuk Track Order Type

**File**: `src/pages/pos-client.ts` - state object

```javascript
const state = {
  // ... existing fields
  orderType: null, // 'dine-in' atau 'takeaway' atau null (belum pilih)
  selectedTableId: null,
  // ...
};

function startDineIn() {
  state.orderType = 'dine-in';
  document.getElementById('order-type-selection').style.display = 'none';
  document.getElementById('tables-section').style.display = 'block';
}

function startTakeaway() {
  state.orderType = 'takeaway';
  document.getElementById('order-type-selection').style.display = 'none';
  document.getElementById('menu-section').style.display = 'block';
  document.getElementById('cart-title').textContent = 'Takeaway';
  document.getElementById('cart-meta').style.display = 'flex';
  document.getElementById('guest-count').value = 1;
  document.getElementById('order-type').value = 'takeaway';
}
```

### 3. Update addToCart untuk Handle Takeaway

**File**: `src/pages/pos-client.ts` - function `addToCart()`

```javascript
function addToCart(id, name, price, event) {
  // Untuk takeaway, tidak perlu pilih meja
  if (state.orderType === null) {
    toast('Pilih dulu: Dine-in atau Takeaway', 'warning');
    return;
  }
  
  // Untuk dine-in, harus pilih meja dulu
  if (state.orderType === 'dine-in' && !state.selectedTableId) {
    toast('Pilih meja terlebih dahulu!', 'warning');
    return;
  }
  
  // ... resto logic sama
}
```

### 4. Update selectTable - Hanya untuk Dine-in

**File**: `src/pages/pos-client.ts` - function `selectTable()`

Tombol meja hanya muncul/tidak bisa diklik untuk takeaway:

```javascript
async function selectTable(id, num, status) {
  // Jangan proses jika ini order takeaway
  if (state.orderType === 'takeaway') return;
  
  // ... resto logic sama
}
```

### 5. Update create order API payload

**File**: `src/pages/pos-client.ts` - function `processPayment()`

```javascript
// Di payload saat create order
const orderPayload = {
  tableId: state.orderType === 'takeaway' ? null : cart.tableId,
  userId: state.currentUserId,
  orderType: state.orderType, // 'dine-in' atau 'takeaway'
  items: cart.items.map(i => ({ ... }))
};
```

### 6. Update Backend - Accept null tableId untuk Takeaway

**File**: `src/routes/orders.ts` - endpoint `/with-items`

```typescript
.post('/with-items', async ({ cookie, headers, body }) => {
  const { tableId, userId, items, orderType } = body as any;
  
  // Jika takeaway, tableId boleh null
  if (orderType === 'takeaway' && !tableId) {
    // Create takeaway order tanpa meja
  }
  
  // Untuk dine-in, tetap wajib ada tableId
  if (orderType === 'dine-in' && !tableId) {
    return { error: 'Meja wajib untuk order dine-in' };
  }
  // ...
})
```

### 7. Meja Status untuk Dine-in Saja

**File**: `src/services/payment.ts` - function `processPayment()`

```javascript
export async function processPayment(orderId: number, amountPaid: number) {
  // ... existing code
  
  const order = await orderRepo.getOrderById(orderId);
  
  // JIKA DINE-IN: meja tetap Terisi (tidak otomatis tersedia)
  // JIKA TAKEAWAY: tidak perlu update status meja (meja tidak dipilih)
  
  // Hanya update meja status untuk dine-in
  if (order.orderType === 'dine-in') {
    // Meja tetap occupied - nanti dikosongkan manual
  }
  // Untuk takeaway: tidak ada perubahan meja
  
  return completedOrder;
}
```

### 8. Tambah Fungsi Batalkan (Cancel) untuk Takeaway

**File**: `src/pages/pos-client.ts` - function `cancelOrder()`

```javascript
function cancelOrder() {
  // Jika takeaway dan belum ada di server (local cart saja)
  if (state.orderType === 'takeaway' && !state.currentOrderId) {
    clearCart();
    state.orderType = null;
    document.getElementById('order-type-selection').style.display = 'flex';
    document.getElementById('menu-section').style.display = 'none';
    toast('Order takeaway dibatalkan');
    return;
  }
  
  // ... resto logic sama
}
```

## Tahapan Implementasi

### Tahap 1: Persiapan (10 menit)
1. Clone repository
2. Buka file-file yang akan dimodifikasi:
   - `src/pages/pos.ts` (HTML)
   - `src/pages/pos-client.ts` (JavaScript functions)
   - `src/routes/orders.ts` (Backend API)
   - `src/services/payment.ts` (Payment logic)

### Tahap 2: Update UI - Tambah Opsi Order Type (20 menit)
1. Di `src/pages/pos.ts`, cari bagian awal (sebelum meja)
2. Tambah div untuk "Pilih Jenis Pesanan":
   - Tombol "Dine-in" (bisa klik meja)
   - Tombol "Takeaway" (langsung ke menu)
3. Hide meja section defaultnya, show setelah pilih Dine-in
4. Tambahkan CSS untuk styling yang baik

### Tahap 3: Update State Management (15 menit)
1. Di `src/pages/pos-client.ts`:
   - Tambah field `orderType` di state object
   - Tambah function `startDineIn()`
   - Tambah function `startTakeaway()`
   - Update function `renderCart()` untuk handle null tableId

### Tahap 4: Update Add to Cart Logic (10 menit)
1. Di `src/pages/pos-client.ts` - function `addToCart()`:
   - Cek apakah orderType sudah dipilih
   - Jika takeaway: tidak perlu tableId
   - Jika dine-in: wajib tableId

### Tahap 5: Update Select Table (5 menit)
1. Di function `selectTable()`:
   - Return early jika orderType adalah 'takeaway'

### Tahap 6: Update Backend (15 menit)
1. Di `src/routes/orders.ts` - endpoint `/with-items`:
   - Accept `orderType` di body
   - Allow null `tableId` untuk takeaway
   - Validation: dine-in wajib tableId

### Tahap 7: Update Payment Logic (10 menit)
1. Di `src/services/payment.ts` - function `processPayment()`:
   - Cek orderType
   - Hanya update meja status untuk dine-in
   - Untuk takeaway: tidak ada perubahan status meja

### Tahap 8: Testing (30 menit)
1. Jalankan server: `bun run src/index.ts`
2. Login ke aplikasi
3. **Test Takeaway Flow**:
   - Klik "Takeaway"
   - Langsung tambahkan menu ke cart (tanpa pilih meja)
   - Bayar
   - Selesai - tidak ada perubahan status meja
4. **Test Dine-in Flow**:
   - Klik "Dine-in"
   - Pilih meja
   - Tambahkan menu
   - Bayar
   - Meja tetap "Terisi"
   - Klik "Kosongkan" setelah customer pulang
   - Meja jadi "Tersedia"

### Tahap 9: Fix Bug Jika Ada (10 menit)
- Cek console browser untuk error
- Cek API responses
- Pastikan cart berfungsi untuk kedua mode

## Catatan Penting

- Takeaway tidak menggunakan meja sama sekali
- Meja hanya untuk pesanan dine-in
- Setelah payment, meja dine-in tetap "Terisi" sampai ada interaksi "Kosongkan"
- Untuk takeaway: payment langsung selesai, tidak perlu kosongkan meja

## File yang Dimodifikasi

1. `src/pages/pos.ts` - Tambah UI untuk pilih order type
2. `src/pages/pos-client.ts` - Logic untuk dine-in dan takeaway
3. `src/routes/orders.ts` - Accept orderType di API
4. `src/services/payment.ts` - Handle berdasarkan orderType

## Ekspektasi Hasil

1. Ketika buka POS, user diminta memilih: "Dine-in" atau "Takeaway"
2. Pilih "Takeaway" → langsung bisa pesan tanpa pilih meja
3. Pilih "Dine-in" → harus pilih meja dulu baru bisa pesan
4. Payment untuk Takeaway: selesai, tidak mengubah status meja
5. Payment untuk Dine-in: meja tetap "Terisi", harus dikosongkan manual