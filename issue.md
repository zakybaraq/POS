# Rencana Refactor: `src/pages/pos.ts` (908 baris)

## Latar Belakang

File `src/pages/pos.ts` saat ini memiliki **~908 baris** yang mencampur:
- Route handler server (Elysia)
- HTML template (inline, ~160 baris)
- CSS styles (inline, ~80 baris)
- JavaScript client-side (~600 baris) — cart, payment, hold/recall, toast, modals, keyboard shortcuts

File ini terlalu besar dan sulit di-maintain. Setiap perubahan UI butuh scroll ratusan baris. Bug fixing jadi lambat karena logika bercampur.

## Tujuan

Pecah `src/pages/pos.ts` menjadi file-file kecil yang:
- Masing-masing < 150 baris
- Bertanggung jawab atas satu hal saja
- Mudah di-test dan di-maintain
- **Tidak mengubah fungsionalitas** yang sudah ada

---

## Tahap 1: Buat Struktur Folder

Buat folder dan file baru:

```
src/
├── pages/
│   └── pos.ts                    (route handler saja, ~50 baris)
├── public/
│   └── styles/
│       └── pos.css               (semua CSS POS, ~80 baris)
└── pos/
    ├── cart.js                   (cart logic: local, server, render)
    ├── payment.js                (payment: showPayment, processPayment, quickPay)
    ├── modals.js                 (modals: held orders, transfer, receipt)
    ├── toast.js                  (toast notification system)
    ├── keyboard.js               (keyboard shortcuts)
    └── init.js                   (init + event listeners + entry point)
```

---

## Tahap 2: Extract CSS ke `src/public/styles/pos.css`

Pindahkan semua CSS dari `<style>` tag di pos.ts ke file terpisah.

### CSS yang perlu di-extract
- `.pos-main`, `.pos-left`, `.pos-panels`, `.pos-tables-panel`
- `.panel-header`, `.tables-grid`, `.table-btn`
- `.pos-menu-panel`, `.pos-menu-header`, `.menu-card`
- `.pos-right`, `.cart-panel`, `.cart-header`, `.cart-meta`
- `.cart-zone`, `.cart-item`, `.cart-footer`
- `.payment-section`, `.quick-pay-buttons`, `.cart-buttons`
- `.toast-container`, `.toast`, `.toast-success`, `.toast-warning`, `.toast-error`
- `.held-order-item`, `.receipt-line`, `.receipt-row`
- Animasi: `@keyframes pulse`, `@keyframes slideIn`

### Update pos.ts
Ganti `<style>...</style>` dengan:
```html
<link rel="stylesheet" href="/styles/pos.css">
```

---

## Tahap 3: Extract JavaScript ke File Terpisah

### `src/pos/toast.js`
```javascript
// Fungsi showToast() saja
function showToast(message, type = 'success') {
  // ... existing code ...
}
```

### `src/pos/cart.js`
```javascript
// Semua fungsi cart
// saveCart, loadCart, clearCart, getLocalCart
// addToCartLocal, removeFromCartLocal, updateQuantityLocal, updateItemNotes
// renderCartFromLocal, renderServerCart, renderEmptyCartForTable
// selectTable, addToCart, addToCartServer
// updateServerQty, removeServerItem
// updateGuestCount, updateOrderType
```

### `src/pos/payment.js`
```javascript
// Semua fungsi payment
// showPayment, processPaymentManual, setQuickPayment
// updatePaidAmount, processPaymentWithAmount, submitOrder
// processPayment (old function, bisa dihapus jika tidak dipakai)
```

### `src/pos/modals.js`
```javascript
// Semua fungsi modal
// holdOrder, showHeldOrdersModal, closeHeldOrdersModal, recallOrder, updateHeldCount
// showTransferModal, closeTransferModal, transferTable
// showReceipt, closeReceiptModal, printReceipt
```

### `src/pos/keyboard.js`
```javascript
// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl+F, Ctrl+H, Escape
});
```

### `src/pos/init.js`
```javascript
// Entry point — dipanggil saat DOM ready
// - Panggil updateHeldCount()
// - Load saved cart dari localStorage
// - Setup event listeners
// - Import semua modul lain
```

---

## Tahap 4: Update Route Handler di `src/pages/pos.ts`

Setelah semua di-extract, `src/pages/pos.ts` hanya berisi:
- Route handler Elysia
- HTML template (tanpa `<style>` dan `<script>` panjang)
- Import CSS dan JS files

```typescript
import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
// ... imports lain

export const posPage = new Elysia()
  .get('/pos', async ({ cookie, headers }) => {
    // ... auth check, fetch data ...

    return htmlResponse(`
      <div class="app-layout">
        <!-- HTML layout tanpa style/script inline -->
      </div>
      <link rel="stylesheet" href="/styles/pos.css">
      <script src="/pos/init.js"></script>
      <script>
        // Inject server-side variables
        window.POS_USER = ${JSON.stringify(user)};
        window.POS_USER_ID = ${user.userId};
        window.POS_TABLES = ${JSON.stringify(tables)};
        window.POS_MENUS = ${JSON.stringify(menus)};
      </script>
    `);
  });
```

---

## Tahap 5: Setup Static File Serving

Pastikan Bun serve file statis dari `src/pos/` dan `src/public/styles/`.

Di `src/index.ts`, tambahkan:
```typescript
.get('/pos/:path', ({ params }) => {
  const filePath = join(__dirname, 'pos', params.path);
  if (existsSync(filePath)) {
    return new Response(Bun.file(filePath), {
      headers: { 'Content-Type': params.path.endsWith('.css') ? 'text/css' : 'application/javascript' }
    });
  }
  return new Response('Not found', { status: 404 });
})
.get('/styles/pos.css', () => {
  const filePath = join(__dirname, 'public/styles/pos.css');
  if (existsSync(filePath)) {
    return new Response(Bun.file(filePath), { headers: { 'Content-Type': 'text/css' } });
  }
  return new Response('Not found', { status: 404 });
})
```

---

## Tahap 6: Testing

### Skenario Test
1. **Server start** — `bun run src/index.ts` tanpa error
2. **POS page loads** — `/pos` tampil sama seperti sebelumnya
3. **Cart** — tambah item, +/- qty, catatan, hapus item — semua berfungsi
4. **Payment** — input manual + quick buttons — pembayaran berhasil, struk muncul
5. **Hold/Recall** — hold pesanan, pilih meja lain, recall — berfungsi
6. **Transfer meja** — pindah pesanan ke meja lain — berfungsi
7. **Toast** — notifikasi muncul saat tambah item, bayar, hold, error
8. **Keyboard** — Ctrl+F focus search, Escape unselect meja
9. **Receipt** — struk tampil rapi, kembalian terhitung benar, print berfungsi

---

## File yang Perlu Diubah/Dibuat

| File | Aksi |
|------|------|
| `src/pages/pos.ts` | **Rewrite** — hanya route handler + HTML template |
| `src/public/styles/pos.css` | **BARU** — semua CSS POS |
| `src/pos/cart.js` | **BARU** — cart logic |
| `src/pos/payment.js` | **BARU** — payment logic |
| `src/pos/modals.js` | **BARU** — modal logic |
| `src/pos/toast.js` | **BARU** — toast notification |
| `src/pos/keyboard.js` | **BARU** — keyboard shortcuts |
| `src/pos/init.js` | **BARU** — entry point + init |
| `src/index.ts` | **Update** — tambah static file serving untuk `/pos/*` dan `/styles/pos.css` |

## Catatan Penting

- **JANGAN hapus** fitur yang sudah ada — hanya pindahkan
- **JANGAN ubah** HTML yang di-render — harus sama persis
- **JANGAN ubah** API endpoint yang sudah ada
- **Gunakan `window.POS_*`** untuk inject server-side variables ke client JS
- **Test setiap tahap** — jangan extract semua dulu baru test
- **Estimasi total**: 2-3 jam kerja
