# Rencana Refactoring: Slicing src/index.ts (2200+ baris)

## Latar Belakang

File `src/index.ts` saat ini memiliki **~2200 baris** yang mencampur:
- Helper functions (htmlResponse, getSidebarHtml, getNavbarHtml, getFooterHtml, getCommonScripts)
- 8+ page route handlers (login, register, forgot-password, dashboard, pos, admin, menu, tables, orders, products)
- App initialization (Elysia app setup, static file serving)

File ini terlalu besar dan sulit di-maintain. Perlu dipecah menjadi file-file kecil yang terstruktur.

## Tujuan

Pecah `src/index.ts` menjadi beberapa file kecil yang:
- Masing-masing < 200 baris
- Bertanggung jawab atas satu hal saja
- Mudah di-test dan di-maintain
- Tidak mengubah fungsionalitas yang sudah ada

---

## Tahap 1: Buat Struktur Folder

Buat folder `src/pages/` dan `src/templates/`:

```
src/
├── index.ts                    (entry point, ~50 baris)
├── pages/
│   ├── auth.ts                 (login, register, forgot-password)
│   ├── dashboard.ts            (halaman /)
│   ├── pos.ts                  (halaman /pos)
│   ├── admin.ts                (halaman /admin)
│   ├── menu.ts                 (halaman /menu)
│   ├── tables.ts               (halaman /tables)
│   ├── orders.ts               (halaman /orders)
│   └── products.ts             (halaman /products)
└── templates/
    ├── sidebar.ts              (getSidebarHtml)
    ├── navbar.ts               (getNavbarHtml)
    ├── footer.ts               (getFooterHtml)
    ├── common-scripts.ts       (getCommonScripts + modals)
    └── html.ts                 (htmlResponse helper)
```

---

## Tahap 2: Extract Template Functions

Pindahkan fungsi-fungsi HTML template ke `src/templates/`.

### `src/templates/html.ts`
```typescript
// Pindahkan fungsi htmlResponse() dari index.ts
// Pindahkan import: readFileSync, existsSync, join
// Pindahkan layoutHtml constant
```

### `src/templates/sidebar.ts`
```typescript
// Pindahkan fungsi getSidebarHtml() dari index.ts
// Import htmlResponse dari './html' jika diperlukan
```

### `src/templates/navbar.ts`
```typescript
// Pindahkan fungsi getNavbarHtml() dari index.ts
```

### `src/templates/footer.ts`
```typescript
// Pindahkan fungsi getFooterHtml() dari index.ts
// Update link footer: showHelpModal, showTermsModal, showPrivacyModal
```

### `src/templates/common-scripts.ts`
```typescript
// Pindahkan fungsi getCommonScripts() dari index.ts
// Termasuk: toggleSidebar, toggleMobileSidebar, toggleNotifications,
//           toggleUserMenu, logout, showHelpModal, closeHelpModal, dll
// Termasuk: 3 modal HTML (help, terms, privacy)
```

---

## Tahap 3: Extract Page Route Handlers

Pindahkan setiap page handler ke `src/pages/`. Setiap file mengekspor sebuah Elysia instance.

### `src/pages/auth.ts`
```typescript
import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';

export const authPages = new Elysia()
  .get('/login', () => { /* ... login page HTML ... */ })
  .get('/register', () => { /* ... register page HTML ... */ })
  .get('/forgot-password', () => { /* ... forgot password page HTML ... */ });
```

### `src/pages/dashboard.ts`
```typescript
import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';
import { getSidebarHtml } from '../templates/sidebar';
import { getNavbarHtml } from '../templates/navbar';
import { getFooterHtml } from '../templates/footer';
import { getCommonScripts } from '../templates/common-scripts';
import { getTokenFromCookies, verifyToken, redirectToLogin } from '../utils/auth';

export const dashboardPage = new Elysia()
  .get('/', async ({ cookie, headers }) => {
    // ... existing dashboard handler ...
  });
```

### `src/pages/pos.ts`, `src/pages/admin.ts`, `src/pages/menu.ts`, `src/pages/tables.ts`, `src/pages/orders.ts`, `src/pages/products.ts`
```typescript
// Pindahkan masing-masing handler dari index.ts
// Pattern sama seperti dashboard.ts
```

---

## Tahap 4: Update src/index.ts

Setelah semua di-extract, `src/index.ts` hanya menjadi entry point yang merakit semuanya:

```typescript
import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { routes } from './routes';
import { authPages } from './pages/auth';
import { dashboardPage } from './pages/dashboard';
import { posPage } from './pages/pos';
import { adminPage } from './pages/admin';
import { menuPage } from './pages/menu';
import { tablesPage } from './pages/tables';
import { ordersPage } from './pages/orders';
import { productsPage } from './pages/products';

const app = new Elysia()
  .use(routes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/styles/:path', ({ params }) => {
    // ... static file serving ...
  })
  .use(authPages)
  .use(dashboardPage)
  .use(posPage)
  .use(adminPage)
  .use(menuPage)
  .use(tablesPage)
  .use(ordersPage)
  .use(productsPage);

app.listen(3000);
```

Target: **< 50 baris**.

---

## Tahap 5: Verifikasi

1. **Server harus bisa start** tanpa error: `bun run src/index.ts`
2. **Semua halaman harus bisa diakses** dan tampil sama seperti sebelumnya:
   - `/login`, `/register`, `/forgot-password`
   - `/` (dashboard)
   - `/pos`, `/admin`, `/menu`, `/tables`, `/orders`, `/products`
3. **LSP diagnostics clean** di semua file baru
4. **Tidak ada fungsionalitas yang berubah** — hanya refactoring struktur file

---

## Aturan Penting

- **JANGAN ubah logika** di dalam handler — hanya pindahkan
- **JANGAN ubah HTML** yang di-render — harus sama persis
- **JANGAN ubah import** yang sudah ada di route API (`src/routes/`)
- **Ikuti pattern** Elysia yang sudah ada — setiap page file ekspor Elysia instance
- **Gunakan relative import** (`../templates/html`, bukan `src/templates/html`)
- **Test setiap file** setelah dibuat — jangan pindahkan semua dulu baru test

## Estimasi

- Tahap 1 (Struktur folder): 5 menit
- Tahap 2 (Extract templates): 15-20 menit
- Tahap 3 (Extract pages): 30-45 menit
- Tahap 4 (Update index.ts): 10 menit
- Tahap 5 (Verifikasi): 15 menit
- **Total**: ~75-95 menit
