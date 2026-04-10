# Requirements - POS Application

**Generated:** 2026-04-10

## Issue: Improve UI Halaman Kategori

### Problem
Halaman `/kategori` tidak match dengan UI halaman lain khususnya `/pesanan` dan `/menu`. Perlu buat table dan UI benar-benar seragam.

### Reference
- UI Pattern dari halaman Pesanan/Menu
- CSS classes yang sudah ada: `.card`, `.menu-toolbar`, `.table`, `.modal`, dll.

### Implementation Steps

#### Step 1: Update HTML Structure
**File:** `src/pages/categories.ts`

1. Wrap dalam `<div class="card">` + `<div class="card-header">`
2. Toolbar dengan `.menu-toolbar`, `.menu-toolbar-left`, `.menu-toolbar-right`
3. Search input dengan `.menu-search-input`
4. Table dalam `<div class="table-container">` → `<table class="table">`
5. Thead dengan sorting spans
6. Tbody dengan data attributes
7. Empty state message

#### Step 2: Update Modal Structure
- `.modal-backdrop`
- `.modal-content` with max-width
- `.modal-header` with title + close button
- `.modal-body` with form
- `.modal-footer` with buttons

#### Step 3: Update JavaScript Functions
- `filterCategories()` - untuk search
- `sortCategories()` - untuk sorting (optional)
- `renderCategories()` - untuk render table

#### Step 4: CSS Classes yang Sudah Ada
- `.card`, `.card-header`
- `.menu-toolbar`, `.menu-toolbar-left`, `.menu-toolbar-right`
- `.menu-search-input`
- `.table`, `.table th`, `.table td`
- `.badge`, `.badge-success`, `.badge-warning`, `.badge-error`
- `.modal`, `.modal-backdrop`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-close`
- `.btn`, `.btn-sm`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.text-center`, `.text-secondary`
- `.form-group`, `.form-label`, `.input`

### Acceptance Criteria

1. **Visual Match**: Halaman kategori terlihat sama dengan halaman pesanan/menu
2. **Card Structure**: Menggunakan `.card` dan `.card-header`
3. **Toolbar**: Menggunakan `.menu-toolbar` dengan search dan tombol
4. **Table**: Menggunakan `.table` dalam `.table-container`
5. **Modal**: Menggunakan standar modal dengan `.modal-backdrop`, `.modal-content`
6. **Functionality**: Search dan filter berfungsi
7. **Responsive**: Tampilan bagus di berbagai ukuran layar