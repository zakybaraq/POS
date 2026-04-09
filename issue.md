# Issue: Improve UI Halaman Kategori - Samakan dengan Pesanan/Menu

## Masalah

Halaman `/kategori` tidakmatch dengan UI halaman lain khususnya `/pesanan` dan `/menu`. Perlu buat table dan UI benar-benar seragam.

---

## Referensi Pattern Lengkap (Halaman Pesanan)

```html
<div class="card">
  <div class="card-header">
    <div class="menu-toolbar">
      <div class="menu-toolbar-left">
        <input type="text" id="order-search" class="menu-search-input" placeholder="Cari...">
      </div>
      <div class="menu-toolbar-right">
        <button>Refresh</button>
      </div>
    </div>
  </div>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th onclick="sortOrders('id')"># <span id="sort-id"></span></th>
          <th>Meja</th>
          <th>Kasir</th>
          <th>Total</th>
          <th>Status</th>
          <th>Waktu</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody id="orders-table-body">
        <tr data-order-id="" data-table="" ...>
          <td><strong>#001</strong></td>
          <td>Meja 1</td>
          <td>Kasir</td>
          <td>Rp 50.000</td>
          <td><span class="badge badge-success">Selesai</span></td>
          <td>10:30</td>
          <td><button class="btn btn-secondary btn-sm">Detail</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="text-center text-secondary" style="padding: 40px;">Belum ada pesanan</p>
</div>

<!-- Modal Pattern -->
<div class="modal" id="order-detail-modal">
  <div class="modal-backdrop" onclick="closeOrderDetail()"></div>
  <div class="modal-content" style="max-width: 500px;">
    <div class="modal-header">
      <h3>Detail Pesanan #<span id="detail-order-id"></span></h3>
      <button class="modal-close" onclick="closeOrderDetail()">&times;</button>
    </div>
    <div class="modal-body" id="order-detail-body"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Cetak</button>
      <button class="btn btn-primary">Tutup</button>
    </div>
  </div>
</div>
```

## Tahapan Implementasi

### Langkah 1: Update HTML Structure

**File:** `src/pages/categories.ts`

1. Wrap dalam `<div class="card">` + `<div class="card-header">`
2. Toolbar dengan `.menu-toolbar`, `.menu-toolbar-left`, `.menu-toolbar-right`
3. Search input dengan `.menu-search-input`
4. Table dalam `<div class="table-container">` → `<table class="table">`
5. Thead dengan sorting spans
6. Tbody dengan data attributes
7. Empty state message

### Langkah 2: Update Modal Structure

- `.modal-backdrop` 
- `.modal-content` with max-width
- `.modal-header` with title + close button
- `.modal-body` with form
- `.modal-footer` with buttons

### Langkah 3: Update JavaScript Functions

- `filterCategories()` - untuk search
- `sortCategories()` - untuk sorting (optional)
- `renderCategories()` - untuk render table

### Langkah 4: CSS Classes yang Sudah Ada

- `.card`, `.card-header`
- `.menu-toolbar`, `.menu-toolbar-left`, `.menu-toolbar-right`
- `.menu-search-input`
- `.table`, `.table th`, `.table td`
- `.badge`, `.badge-success`, `.badge-warning`, `.badge-error`
- `.modal`, `.modal-backdrop`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-close`
- `.btn`, `.btn-sm`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.text-center`, `.text-secondary`
- `.form-group`, `.form-label`, `.input`

---

## Hasil yang Diharapkan

```html
<div class="card">
  <div class="card-header">
    <div class="menu-toolbar">
      <div class="menu-toolbar-left">
        <input type="text" id="category-search" class="menu-search-input" placeholder="Cari kategori..." oninput="filterCategories()">
      </div>
      <div class="menu-toolbar-right">
        <button class="btn btn-primary" onclick="showAddCategoryModal()">+ Tambah Kategori</button>
      </div>
    </div>
  </div>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th onclick="sortCategories('id')" style="cursor: pointer;"># <span id="sort-id"></span></th>
          <th onclick="sortCategories('name')" style="cursor: pointer;">Nama <span id="sort-name"></span></th>
          <th style="width: 120px;">Aksi</th>
        </tr>
      </thead>
      <tbody id="categories-table-body"></tbody>
    </table>
  </div>
  <p class="text-center text-secondary" style="padding: 40px;" id="empty-state">Belum ada kategori</p>
</div>

<!-- Modal -->
<div class="modal" id="category-modal">
  <div class="modal-backdrop" onclick="closeCategoryModal()"></div>
  <div class="modal-content" style="max-width: 400px;">
    <div class="modal-header">
      <h3 id="category-modal-title">Tambah Kategori</h3>
      <button class="modal-close" onclick="closeCategoryModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="category-form">
        <input type="hidden" id="category-id">
        <div class="form-group">
          <label class="form-label">Nama Kategori *</label>
          <input type="text" id="category-name" class="input" required>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="submit" form="category-form" class="btn btn-primary">Simpan</button>
    </div>
  </div>
</div>
```

---

## Files yang Diubah

| File | Perubahan |
|------|------------|
| `src/pages/categories.ts` | Full rewrite HTML + JS |

---

## Estimasi Effort

2-3 jam

---

*Ditugaskan untuk: Junior Programmer / AI Model Murah*