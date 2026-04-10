# Issue: Linking Kategori and Menu Pages

## Overview
Buat link/shortcut antara halaman Kategori dan Menu agar navigasi lebih mudah:
1. **Kategori → Menu**: Klik jumlah menu di kategori → ke halaman Menu dengan filter kategori tersebut
2. **Menu → Kategori**: Klik nama kategori di tabel → ke halaman Kategori dengan filter tersebut

## Requirements

### 1. Kategori Page (Kategori → Menu)
- Pada kolom "Menu" (contoh: "5 menu"), tambahkan link yang bisa diklik
- Ketika diklik, redirect ke `/menu?category=NAMA_KATEGORI`
- Menggunakan tag `<a>` atau ubah button jadi clickable link

### 2. Menu Page (Menu → Kategori)
- Pada setiap baris menu, tambahkan link pada nama kategori
- Ketika diklik, redirect ke `/kategori?filter=NAMA_KATEGORI`
- Juga bisa ke `/kategori?name=NAMA_KATEGORI` atau format lain

## Implementation Steps

### Step 1: Update Kategori Page (categories.ts)

**File:** `src/pages/categories.ts`

**Objective:** Buat kolom "Menu" jadi clickable link ke halaman Menu

**Changes:**

1. **Tambah CSS untuk link styling** (bagian `<style>`):
```css
.menu-count-link {
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;
}
.menu-count-link:hover {
  color: var(--color-primary-hover);
}
```

2. **Ubah render HTML untuk kolom Menu** (di dalam fungsi `renderCategories()`):
- Dari:
```javascript
'<td>' + menuCount + ' menu</td>'
```
- Menjadi:
```javascript
'<td><a href="/menu?category=' + encodeURIComponent(c.name) + '" class="menu-count-link">' + menuCount + ' menu</a></td>'
```

**Note:** Gunakan `encodeURIComponent()` untuk handle kategori nama yang ada spasi/special chars.

---

### Step 2: Update Menu Page (menu.ts)

**File:** `src/pages/menu.ts`

**Objective:** Buat nama kategori di setiap baris jadi clickable link ke halaman Kategori

**Changes:**

1. **Tambah CSS untuk link styling** (bagian `<style>`):
```css
.category-link {
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: none;
}
.category-link:hover {
  text-decoration: underline;
}
```

2. **Ubah render HTML untuk kolom Kategori** (cari fungsi yang render tabel menu):
- Dari (contoh):
```javascript
'<td>' + m.category + '</td>'
```
- Menjadi:
```javascript
'<td><a href="/kategori?filter=' + encodeURIComponent(m.category) + '" class="category-link">' + m.category + '</a></td>'
```

---

### Step 3: (Optional) Update Kategori untuk Handle Filter Query Parameter

**File:** `src/pages/categories.ts`

**Objective:** Biar kalau user akses `/kategori?filter=Makanan`, otomatis apply filter search

**Changes:**

1. **Di dalam script, tambahkan logic untuk read query param:**
```javascript
// Di dalam loadData() atau di akhir script
function applyCategoryFilterFromURL() {
  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter');
  if (filter) {
    document.getElementById('category-search').value = filter;
    filterCategories();
  }
}

// Panggil setelah loadData() selesai
//loadData().then(() => applyCategoryFilterFromURL());
// ATAU di akhir:
document.addEventListener('DOMContentLoaded', applyCategoryFilterFromURL);
```

**Note:** Step ini optional - kalau tidak punya waktu, skip dulu. Kategori page bisa tetap works tanpa ini.

---

## Technical Notes

### URL Format Choices
- **Option A:** `/menu?category=Nama Kategori` (simple, perlu URL encode)
- **Option B:** `/menu?categoryId=123` (lebih reliable, perlu lookup ID)

**Recommendation:** Gunakan Option A untuk simplicity.Kalau di masa depan perlu lebih robust, baru ubah ke Option B.

### URL Encode
Selalu gunakan `encodeURIComponent()` untuk nilai yang dimasukkan ke URL:
```javascript
encodeURIComponent(c.name)  // "Minuman" -> "Minuman"
encodeURIComponent("Es Teh")  // "Es%20Teh"
```

### Testing Checklist
- [ ] Klik "5 menu" di Kategori → ke Menu dengan filter "Makanan"
- [ ] Klik "Makanan" di Menu → ke Kategori dengan filter "Makanan"
- [ ] Category dengan spasi works correctly (e.g., "Es Teh")
- [ ] Category dengan karakter khusus works (optional)

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/categories.ts` | Tambah link di kolom Menu, optional: add filter from URL |
| `src/pages/menu.ts` | Tambah link di kolom Kategori |

## Estimated Time
- **Junior Programmer:** 30-60 menit
- **AI Model:** 10-20 menit

## Dependencies
- Tidak ada dependency baru
- Hanya modifikasi frontend (tidak perlu API changes)
- Tidak perlu DB schema changes