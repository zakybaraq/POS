# Codebase Concerns

**Analysis Date:** 2026-04-10

## Known Issues (Documented)

### Issue 1: Kategori Page UI Consistency
- **File:** `src/pages/categories.ts`
- **Problem:** UI tidak match dengan halaman lain (Pesanan dan Menu). Tidak menggunakan pola table yang sama.
- **Impact:** User experience tidak konsisten
- **Fix approach:** Update HTML structure untuk menggunakan pattern `.card`, `.menu-toolbar`, `.table-container` yang sama. Lihat `issue.md` untuk detail lengkap.

### Issue 2: Missing Cross-Page Navigation (Kategori ↔ Menu)
- **Files:** `src/pages/categories.ts`, `src/pages/menu.ts`
- **Problem:** Tidak ada link antara halaman Kategori dan Menu. User harus manual navigasi.
- **Impact:** Navigasi tidak intuitif
- **Fix approach:** Tambahkan clickable links:
  - Kategori page: Kolom "Menu" menuju `/menu?category=NAMA_KATEGORI`
  - Menu page: Kolom "Kategori" menuju `/kategori?filter=NAMA_KATEGORI`
- **Note:** Lihat `issue-kategori-menu-linking.md` untuk detail implementasi.

---

## Tech Debt

### Hardcoded JWT Secret
- **Files:** `src/utils/auth.ts`, `src/services/auth.ts`
- **Issue:** Default JWT secret di-hardcode: `'pos-secret-key-change-in-production'`
- **Impact:** Security vulnerability jika environment variable tidak diset
- **Fix approach:** Pastikan `JWT_SECRET` environment variable selalu diset di production, atau fail startup jika tidak diset.

### No Password Complexity Requirements
- **File:** `src/services/auth.ts`
- **Issue:** Registrasi user tidak memvalidasi password strength
- **Impact:** weak passwords bisa digunakan
- **Fix approach:** Tambah validasi minimal: 8 karakter, kombinasi huruf/angka

### No Input Validation/Sanitization
- **Issue:** User input tidak divalidasi atau disanitasi secara konsisten
- **Impact:** Potential XSS, injection vulnerabilities
- **Fix approach:** Gunakan Zod schemas yang sudah ada (`src/services/payment.ts` imports dari `zod`) untuk validasi input di semua endpoints.

---

## Security Considerations

### JWT Token Expiry
- **File:** `src/services/auth.ts`
- **Issue:** Token expiry hanya 24 jam (`JWT_EXPIRES = '24h'`)
- **Impact:** User harus login ulang setiap hari - mungkin acceptable tapi perlu consideration untuk UX
- **Current mitigation:** Cookie-based session dengan httpOnly

### Missing Rate Limiting
- **Issue:** Tidak ada rate limiting untuk login endpoint
- **Impact:** Brute force attack memungkinkan
- **Recommendations:** Implement rate limiting untuk `/auth/login` endpoint

### No CSRF Protection
- **Issue:** Tidak ada CSRF token implementation
- **Impact:** CSRF attacks mungkin bisa dilakukan
- **Recommendations:** Implement CSRF tokens untuk state-changing operations

---

## Code Quality Issues

### No Test Coverage
- **Issue:** Tidak ada test files di codebase
- **Impact:** Perubahan bisa break functionality tanpa deteksi
- **Fix approach:** Tambah unit tests untuk repositories dan services, integration tests untuk routes

### Large File Sizes
- **Files:**
  - `src/pages/pos-client.ts` (900 lines)
  - `src/pages/admin.ts` (538 lines)
  - `src/pages/reports.ts` (481 lines)
  - `src/pages/menu.ts` (466 lines)
- **Issue:** Beberapa page files terlalu besar (>400 lines)
- **Impact:** Harder to maintain, test, and understand
- **Fix approach:** Extract components, separate concerns (data fetching, rendering, logic)

### Inconsistent Error Handling
- **Issue:** Tidak ada pola error handling yang konsisten
- **Impact:** User experience tidak predictable saat errors
- **Fix approach:** Implement global error handler, consistent error responses

### Missing Error Boundaries in Frontend
- **Issue:** Frontend pages tidak memiliki error boundaries
- **Impact:** JS errors bisa crash entire page tanpa recovery
- **Fix approach:** Tambah try-catch di async operations, user-friendly error messages

---

## Performance Considerations

### No Query Optimization
- **Issue:** Database queries tidak dioptimize (tidak ada pagination, lazy loading)
- **Impact:** Performance degrades dengan data growth
- **Fix approach:** Implement pagination untuk list endpoints, limit results

### Large Inline CSS/JS in Pages
- **Issue:** Setiap page memiliki inline styles dan scripts
- **Impact:** Duplicated code, larger bundle size
- **Fix approach:** Extract ke shared CSS/JS files atau use component library

---

## Missing Critical Features

### No Data Backup/Export
- **Issue:** Tidak ada fitur export/backup data
- **Impact:** Data loss risk, manual migration sulit
- **Fix approach:** Tambah export endpoints (CSV/JSON) untuk orders, inventory, dll.

### No Audit Trail for Sensitive Operations
- **Issue:** Tidak ada logging untuk sensitive operations (password changes, role changes)
- **Impact:** Sulit track who did what
- **Fix approach:** Gunakan existing `audit-log` repository yang sudah ada

### No Offline Capability
- **Issue:** POS client tidak bisa beroperasi offline
- **Impact:** Jika network issue, transactions berhenti
- **Fix approach:** Implement local-first dengan sync when online

---

## Documentation Gaps

### No API Documentation
- **Issue:** Tidak ada API docs (Swagger/OpenAPI)
- **Impact:** Sulit untuk integrasi external
- **Fix approach:** Generate OpenAPI spec dari routes

### No Deployment/DevOps Docs
- **Issue:** Tidak ada setup/production deployment guides
- **Impact:** Onboarding sulit, deployment risky
- **Fix approach:** Tambah README dengan setup instructions

---

## Dependencies at Risk

### Old Dependencies
- **Issue:** Beberapa packages tidak diupdate (drizzle-orm: 0.45.2, elysia: 1.4.28)
- **Impact:** Security vulnerabilities, compatibility issues
- **Migration plan:** Regular updates, check for breaking changes

---

*Concerns audit: 2026-04-10*