# Bug Fix: POS — "Pilih meja terlebih dahulu!" muncul meskipun meja sudah diklik

## Latar Belakang

Di halaman POS (`/pos`), user mengalami bug berikut:
1. User klik meja (meja berubah highlight/selected)
2. User klik menu untuk menambahkan ke cart
3. **Alert muncul: "Pilih meja terlebih dahulu!"** — padahal meja sudah diklik
4. Meja yang sudah diklik **tidak bisa di-unselect** (tidak ada cara untuk membatalkan pilihan meja)

## Root Cause (Analisis)

File: `src/pages/pos.ts`, fungsi `selectTable()` dan `addToCart()`

### Bug 1: `currentOrderId` tidak ter-set setelah klik meja

Di fungsi `selectTable()`, setelah order berhasil dibuat:
```javascript
const createRes = await fetch('/api/orders', { ... });
const newOrder = await createRes.json();
currentOrderId = newOrder.id;  // <-- MASALAH: response mungkin tidak punya properti 'id' di level atas
renderCart(newOrder, []);
```

Response dari `POST /api/orders` kemungkinan memiliki struktur yang berbeda (misalnya `{ order: { id: 1 } }` bukan `{ id: 1 }`). Akibatnya `currentOrderId` tetap `null`, dan `addToCart()` menampilkan alert.

### Bug 2: Meja tidak bisa di-unselect

Fungsi `selectTable()` tidak ada logika untuk membatalkan pilihan. Jika user klik meja yang sama lagi, order baru akan dibuat lagi (duplikat). Tidak ada cara untuk "deselect" meja.

---

## Tahap 1: Debug Response API

Cek struktur response dari `POST /api/orders`:

```bash
# Setelah server running, buka browser console di halaman /pos
# Klik meja, lalu di console ketik:
# console.log(newOrder) setelah line `const newOrder = await createRes.json();`
```

Atau cek langsung di `src/routes/orders.ts` — lihat apa yang di-return oleh endpoint `POST /api/orders`.

---

## Tahap 2: Fix `selectTable()` — Set `currentOrderId` dengan benar

Berdasarkan struktur response API, perbaiki cara mengambil `orderId`.

**Jika response berbentuk `{ id: 1, tableId: 1, ... }`:**
```javascript
currentOrderId = newOrder.id;
```

**Jika response berbentuk `{ order: { id: 1 }, items: [] }`:**
```javascript
currentOrderId = newOrder.order?.id || newOrder.id;
```

**Tambahkan console.log untuk debugging:**
```javascript
console.log('Order response:', newOrder);
console.log('currentOrderId set to:', currentOrderId);
```

---

## Tahap 3: Tambah Fitur Unselect Meja

Modifikasi `selectTable()` agar:
1. Jika user klik meja yang **sama** dengan yang sudah dipilih → **unselect** (reset `currentOrderId`, `selectedTableId`, `currentTableNumber`)
2. Jika user klik meja **berbeda** → tampilkan konfirmasi (opsional) atau langsung switch
3. Visual feedback: hapus class `selected` saat unselect

```javascript
async function selectTable(tableId, tableNumber, status) {
  // Jika klik meja yang sama → unselect
  if (selectedTableId === tableId) {
    selectedTableId = null;
    currentTableNumber = null;
    currentOrderId = null;
    document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('cart-zone').innerHTML = '<div class="cart-empty">...</div>';
    document.getElementById('cart-count').style.display = 'none';
    return;
  }

  // Reset previous selection
  document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`[data-table-id="${tableId}"]`).classList.add('selected');

  selectedTableId = tableId;
  currentTableNumber = tableNumber;

  if (status === 'occupied') {
    const orderRes = await fetch('/api/orders/table/' + tableId);
    const orderData = await orderRes.json();
    if (orderData.order) {
      currentOrderId = orderData.order.id;
      renderCart(orderData.order, orderData.items);
    }
    return;
  }

  const createRes = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId: parseInt(tableId), userId: currentUserId })
  });
  const newOrder = await createRes.json();
  // FIX: ambil id dari response yang benar
  currentOrderId = newOrder.id;
  if (!currentOrderId) {
    console.error('Failed to get order ID from response:', newOrder);
    alert('Gagal membuat pesanan. Coba lagi.');
    return;
  }
  renderCart(newOrder, []);
}
```

---

## Tahap 4: Fix `addToCart()` — Tambah Error Handling yang Lebih Baik

```javascript
async function addToCart(menuId, name, price) {
  if (!currentOrderId) {
    alert('Pilih meja terlebih dahulu!');
    return;
  }
  if (!selectedTableId) {
    alert('Meja belum dipilih. Klik meja terlebih dahulu.');
    return;
  }
  // ... sisa kode tetap sama
}
```

---

## Tahap 5: Testing

1. Buka halaman `/pos`
2. Klik meja yang **available** → meja harus highlight (class `selected`)
3. Klik menu → item harus masuk ke cart (tanpa alert error)
4. Klik meja yang **sama** lagi → meja harus unselect, cart kosong kembali
5. Klik meja **berbeda** → harus switch ke meja baru
6. Klik meja yang **occupied** → harus load pesanan yang sudah ada

---

## File yang Perlu Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/pos.ts` | Fix `selectTable()` — response parsing + unselect logic |
| `src/pages/pos.ts` | Fix `addToCart()` — tambah validasi tambahan |

## Catatan Penting

- **JANGAN ubah** API endpoint (`src/routes/orders.ts`) kecuali memang response-nya salah
- **JANGAN ubah** HTML/CSS layout — hanya fix JavaScript logic
- **Test** di browser setelah perubahan — pastikan tidak ada error di console
- **Console.log** boleh ditambahkan untuk debugging, tapi hapus sebelum commit
