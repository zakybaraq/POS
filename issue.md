# Issue: Perencanaan UI/UX Aplikasi POS

## Overview

Membuat layout UI/UX yang clean, minimalist, dan konsisten untuk aplikasi POS dengan warna utama #f5427e (pink/magenta).

## Tujuan

1. Desain yang clean dan minimalist
2. Warna konsisten di seluruh aplikasi
3. Warna utama: #f5427e
4. Siap diimplementasikan oleh junior programmer atau AI model murah

---

## Spesifikasi Desain

### Palet Warna

| Nama | Hex Code | Penggunaan |
|------|----------|------------|
| Primary | #f5427e | Tombol utama, aksen, header |
| Primary Dark | #d6366b | Hover state tombol |
| Primary Light | #ff7da3 | Background subtle, highlight |
| Background | #ffffff | Background utama |
| Background Alt | #f8f9fa | Card, sidebar, area sekunder |
| Text Primary | #1a1a2e | Teks utama |
| Text Secondary | #6b7280 | Teks deskriptif, label |
| Border | #e5e7eb | Garis pemisah, border input |
| Success | #10b981 | Status berhasil |
| Warning | #f59e0b | Status warning |
| Error | #ef4444 | Status error |

### Tipografi

- **Font Family**: System UI (San Francisco, Segoe UI, Roboto)
- **Heading**: Bold, ukuran besar
- **Body**: Regular, mudah dibaca
- **Spacing**: Konsisten menggunakan kelipatan 4px (4, 8, 12, 16, 24, 32, 48)

### Komponen UI

#### 1. Layout Utama
- Sidebar di kiri (fixed width 240px)
- Content area di kanan
- Navbar di top

#### 2. Sidebar
- Logo di bagian atas
- Menu items dengan icon
- Active state dengan background #f5427e (10% opacity)
- Hover state dengan background #f8f9fa

#### 3. Tombol (Button)
- **Primary**: Background #f5427e, text white
- **Secondary**: Background transparent, border #e5e7eb
- **Danger**: Background #ef4444, text white
- Border radius: 8px
- Padding: 12px 24px

#### 4. Input Fields
- Border: 1px solid #e5e7eb
- Border radius: 8px
- Padding: 12px 16px
- Focus: Border #f5427e

#### 5. Card
- Background: #ffffff
- Border: 1px solid #e5e7eb
- Border radius: 12px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)

#### 6. Table
- Header: Background #f8f9fa
- Row: Border bottom #e5e7eb
- Hover: Background #fafafa

---

## Struktur File

Proposed struktur file untuk implementasi:

```
src/
├── public/
│   └── styles/
│       └── global.css      # CSS variables dan global styles
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # Komponen sidebar
│   │   ├── Navbar.tsx      # Komponen navbar
│   │   └── Layout.tsx      # Wrapper layout utama
│   ├── ui/
│   │   ├── Button.tsx      # Komponen tombol
│   │   ├── Input.tsx       # Komponen input
│   │   ├── Card.tsx        # Komponen card
│   │   ├── Table.tsx       # Komponen tabel
│   │   └── Modal.tsx       # Komponen modal
│   └── features/
│       ├── Dashboard.tsx   # Halaman dashboard
│       ├── Products.tsx    # Halaman produk
│       └── ...
└── routes/
    └── ...
```

---

## Tahap Implementasi (Step by Step)

###TAHAP 1: Setup Project dan CSS Variables

**Tujuan**: Siapkan dasar styling dengan CSS variables

**Langkah-langkah**:

1. **Buka file `src/index.ts`** untuk melihat struktur project saat ini
   - Catat bagaimana server dirunning
   - Catat bagaimana static files di-serve

2. **Buat folder `src/styles/`** jika belum ada

3. **Buat file `src/styles/variables.css`** dengan isi:

```css
:root {
  /* Primary Colors */
  --color-primary: #f5427e;
  --color-primary-dark: #d6366b;
  --color-primary-light: #ff7da3;
  --color-primary-10: rgba(245, 66, 126, 0.1);

  /* Background Colors */
  --color-bg: #ffffff;
  --color-bg-alt: #f8f9fa;
  --color-bg-hover: #fafafa;

  /* Text Colors */
  --color-text: #1a1a2e;
  --color-text-secondary: #6b7280;
  --color-text-white: #ffffff;

  /* Border Colors */
  --color-border: #e5e7eb;
  --color-border-focus: #f5427e;

  /* Status Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --transition: all 0.2s ease;
}
```

4. **Import CSS ini di `index.ts`**:
   - Cari bagian static files atau middlewares
   - Tambah styling untuk serve file CSS ini

**Cekpoint**: Buka browser, inspect element, cek apakah CSS variables sudah ter-load.

---

###TAHAP 2: Update Global Styles dan Reset

**Tujuan**: Styling dasar untuk body, heading, dll.

**Langkah-langkah**:

1. **Buat file `src/styles/global.css`**:

```css
/* Import variables */
@import './variables.css';

/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  background-color: var(--color-bg);
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  color: var(--color-text);
}

h1 { font-size: 28px; }
h2 { font-size: 24px; }
h3 { font-size: 20px; }
h4 { font-size: 16px; }

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  color: var(--color-primary-dark);
}

/* Utility Classes */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }
.gap-lg { gap: var(--space-lg); }

.text-center { text-align: center; }
.text-secondary { color: var(--color-text-secondary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }
```

2. **Pastikan file ini di-import di `index.ts`**

**Cekpoint**: Refresh halaman, font dan spacing sudah konsisten.

---

###TAHAP 3: Buat Komponen Button

**Tujuan**: Buat komponen button yang reusable dengan berbagai variant.

**Langkah-langkah**:

1. **Buat folder `src/components/ui/`**

2. **Buat file `src/components/ui/Button.tsx`**:

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = ''
}: ButtonProps) {
  const baseStyles = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    border: none;
    outline: none;
  `;

  const variants = {
    primary: `
      background: var(--color-primary);
      color: var(--color-text-white);
    `,
    secondary: `
      background: transparent;
      color: var(--color-text);
      border: 1px solid var(--color-border);
    `,
    danger: `
      background: var(--color-error);
      color: var(--color-text-white);
    `
  };

  const sizes = {
    sm: 'padding: 8px 16px; font-size: 13px;',
    md: 'padding: 12px 24px; font-size: 14px;',
    lg: 'padding: 16px 32px; font-size: 16px;'
  };

  const disabledStyle = disabled ? 'opacity: 0.5; cursor: not-allowed;' : '';
  const hoverStyle = !disabled ? `
   :hover {
      background: ${variant === 'primary' ? 'var(--color-primary-dark)' : 
                    variant === 'danger' ? '#dc2626' : 'var(--color-bg-alt)'};
    }
  ` : '';

  return `
    <button 
      type="${type}"
      class="btn btn-${variant} btn-${size} ${className}"
      ${disabled ? 'disabled' : ''}
      onclick="${onClick ? 'window.__btnClick_' + Math.random() : ''}"
      style="${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyle}"
    >
      ${children}
    </button>
  `;
}
```

> **Catatan untuk Junior**: Jika project belum support TSX, bisa buat versi JavaScript biasa dengan template literal string return.

**Alternatif cara lebih simple** (tanpa React):
Buat file CSS `src/styles/button.css`:
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  border: none;
  padding: 12px 24px;
  font-size: 14px;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-white);
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-alt);
}

.btn-danger {
  background: var(--color-error);
  color: var(--color-text-white);
}

.btn-danger:hover {
  background: #dc2626;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Cekpoint**: Button Primary harus berwarna #f5427e dengan text putih.

---

###TAHAP 4: Buat Komponen Input

**Tujuan**: Buat komponen input yang konsisten dengan desain.

**Langkah-langkah**:

1. **Buat file `src/styles/input.css`**:

```css
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.input {
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  transition: var(--transition);
  outline: none;
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-10);
}

.input::placeholder {
  color: var(--color-text-secondary);
}

.input:disabled {
  background: var(--color-bg-alt);
  cursor: not-allowed;
}

.input-error {
  border-color: var(--color-error);
}

.input-error-message {
  font-size: 12px;
  color: var(--color-error);
}

/* Search input specific */
.input-search {
  padding-left: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px center;
  background-size: 20px;
}
```

2. **Contoh penggunaan HTML**:
```html
<div class="input-group">
  <label class="input-label">Email</label>
  <input type="email" class="input" placeholder="Masukkan email">
</div>
```

**Cekpoint**: Input field focus border jadi warna #f5427e.

---

###TAHAP 5: Buat Komponen Card

**Tujuan**: Buat card container yang reusable.

**Langkah-langkah**:

1. **Buat file `src/styles/card.css`**:

```css
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.card-body {
  /* Content area */
}

.card-footer {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}
```

**Cekpoint**: Card punya border radius 12px dan shadow halus.

---

###TAHAP 6: Buat Komponen Table

**Tujuan**: Buat tabel yang clean dan mudah dibaca.

**Langkah-langkah**:

1. **Buat file `src/styles/table.css`**:

```css
.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th {
  background: var(--color-bg-alt);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.table tr:hover {
  background: var(--color-bg-hover);
}

.table .actions {
  display: flex;
  gap: var(--space-sm);
}

/* Status badges */
.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.badge-success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.badge-warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.badge-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.badge-primary {
  background: var(--color-primary-10);
  color: var(--color-primary);
}
```

2. **Contoh penggunaan**:
```html
<div class="table-container">
  <table class="table">
    <thead>
      <tr>
        <th>No</th>
        <th>Nama</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Produk A</td>
        <td><span class="badge badge-success">Aktif</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

**Cekpoint**: Table header background #f8f9fa, hover row background #fafafa.

---

###TAHAP 7: Buat Komponen Sidebar

**Tujuan**: Buat sidebar dengan menu navigation.

**Langkah-langkah**:

1. **Buat file `src/styles/sidebar.css`**:

```css
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: var(--color-bg);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--color-border);
}

.sidebar-logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-md);
  overflow-y: auto;
}

.sidebar-menu {
  list-style: none;
}

.sidebar-menu-item {
  margin-bottom: var(--space-xs);
}

.sidebar-menu-link {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 12px 16px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: var(--transition);
  cursor: pointer;
}

.sidebar-menu-link:hover {
  background: var(--color-bg-alt);
  color: var(--color-text);
}

.sidebar-menu-link.active {
  background: var(--color-primary-10);
  color: var(--color-primary);
  font-weight: 500;
}

.sidebar-menu-link svg {
  width: 20px;
  height: 20px;
}

.sidebar-footer {
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
}
```

2. **Contoh HTML structure**:
```html
<aside class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
      </svg>
      POS App
    </div>
  </div>
  <nav class="sidebar-nav">
    <ul class="sidebar-menu">
      <li class="sidebar-menu-item">
        <a href="/" class="sidebar-menu-link active">
          <svg>...</svg>
          Dashboard
        </a>
      </li>
      <li class="sidebar-menu-item">
        <a href="/products" class="sidebar-menu-link">
          <svg>...</svg>
          Produk
        </a>
      </li>
    </ul>
  </nav>
</aside>
```

**Cekpoint**: Sidebar fixed 240px di kiri, active menu background pink transparan (#f5427e 10%).

---

###TAHAP 8: Buat Komponen Navbar

**Tujuan**: Buat top navigation bar.

**Langkah-langkah**:

1. **Buat file `src/styles/navbar.css`**:

```css
.navbar {
  position: fixed;
  top: 0;
  left: 240px;
  right: 0;
  height: 64px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  z-index: 99;
}

.navbar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  transition: var(--transition);
}

.navbar-user:hover {
  background: var(--color-bg-alt);
}

.navbar-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.navbar-user-name {
  font-weight: 500;
  color: var(--color-text);
}

.navbar-dropdown {
  position: relative;
}

.navbar-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 150px;
  display: none;
}

.navbar-dropdown-menu.show {
  display: block;
}

.navbar-dropdown-item {
  display: block;
  padding: 10px 16px;
  color: var(--color-text);
  cursor: pointer;
  transition: var(--transition);
}

.navbar-dropdown-item:hover {
  background: var(--color-bg-alt);
}

.navbar-dropdown-item.danger {
  color: var(--color-error);
}
```

**Cekpoint**: Navbar mulai dari left 240px (sebelah sidebar), tinggi 64px.

---

###TAHAP 9: Buat Layout Utama (Wrapper)

**Tujuan**: Gabungkan sidebar dan navbar jadi satu layout.

**Langkah-langkah**:

1. **Buat file `src/styles/layout.css`**:

```css
/* Main content wrapper */
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-content {
  margin-left: 240px;
  padding-top: 64px;
  width: calc(100% - 240px);
  min-height: 100vh;
}

.app-main {
  padding: var(--space-lg);
  background: var(--color-bg-alt);
  min-height: calc(100vh - 64px);
}
```

2. **Struktur HTML lengkap**:
```html
<div class="app-layout">
  <!-- Sidebar -->
  <aside class="sidebar">...</aside>
  
  <!-- Main Area -->
  <div class="app-content">
    <!-- Navbar -->
    <header class="navbar">...</header>
    
    <!-- Page Content -->
    <main class="app-main">
      <!-- Isi halaman di sini -->
    </main>
  </div>
</div>
```

**Cekpoint**: Layout punya margin-left 240px untuk sidebar, padding-top 64px untuk navbar.

---

###TAHAP 10: Update Halaman Login

**Tujuan**: Terapkan desain baru ke halaman login.

**Langkah-langkah**:

1. **Buka file halaman login** (biasanya di `src/index.ts` route `/login`)

2. **Update stylenya**:
   - Ganti background jadi lebih menarik (gradient atau solid color)
   - Gunakan Card untuk container form
   - Gunakan Button variant primary untuk tombol login
   - Gunakan Input untuk form fields

3. **Contoh struktur login page**:
```html
<div class="login-page" style="
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5427e 0%, #ff7da3 100%);
">
  <div class="card" style="width: 400px;">
    <div class="card-header">
      <h2 style="text-align: center; color: var(--color-primary);">POS App</h2>
      <p class="text-center text-secondary">Login ke akun Anda</p>
    </div>
    <div class="card-body">
      <form onsubmit="handleLogin(event)">
        <div class="input-group" style="margin-bottom: 16px;">
          <label class="input-label">Email</label>
          <input type="email" class="input" placeholder="email@example.com" required>
        </div>
        <div class="input-group" style="margin-bottom: 24px;">
          <label class="input-label">Password</label>
          <input type="password" class="input" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">
          Login
        </button>
      </form>
    </div>
  </div>
</div>
```

4. **Catatan**: Untuk login page, sidebar dan navbar tidak perlu ditampilkan

**Cekpoint**: Halaman login bersih, card centered, tombol primary warna pink.

---

###TAHAP 11: Update Halaman Dashboard

**Tujuan**: Terapkan desain ke halaman utama setelah login.

**Langkah-langkah**:

1. **Buka file dashboard** (route `/` di `src/index.ts`)

2. **Update structure**:
   - Wrap dengan app-layout
   - Tambahkan sidebar
   - Tambahkan navbar
   - Gunakan Card untuk stats/analytics

3. **Contoh struktur dashboard**:

```html
<div class="app-layout">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">POS App</div>
    </div>
    <nav class="sidebar-nav">
      <ul class="sidebar-menu">
        <li class="sidebar-menu-item">
          <a href="/" class="sidebar-menu-link active">Dashboard</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="/products" class="sidebar-menu-link">Produk</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="/orders" class="sidebar-menu-link">Pesanan</a>
        </li>
        <li class="sidebar-menu-item">
          <a href="/users" class="sidebar-menu-link">Pengguna</a>
        </li>
      </ul>
    </nav>
  </aside>

  <!-- Content -->
  <div class="app-content">
    <header class="navbar">
      <h1 class="navbar-title">Dashboard</h1>
      <div class="navbar-right">
        <div class="navbar-user" onclick="toggleUserMenu()">
          <div class="navbar-user-avatar">A</div>
          <span class="navbar-user-name">Admin</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <!-- Stats Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 24px;">
        <div class="card">
          <div class="text-secondary" style="font-size: 13px;">Total Penjualan</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--color-text);">Rp 12.500.000</div>
          <div class="text-success" style="font-size: 13px;">+15% dari kemarin</div>
        </div>
        <div class="card">
          <div class="text-secondary" style="font-size: 13px;">Total Pesanan</div>
          <div style="font-size: 24px; font-weight: 700; color: var(--color-text);">124</div>
          <div class="text-success" style="font-size: 13px;">+8% dari kemarin</div>
        </div>
        <!-- dst... -->
      </div>

      <!-- Recent Orders Table -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Pesanan Terbaru</h3>
        </div>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#ORD-001</td>
                <td>Budi Santoso</td>
                <td>Rp 150.000</td>
                <td><span class="badge badge-success">Selesai</span></td>
                <td>04 Apr 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</div>
```

**Cekpoint**: Dashboard ada sidebar, navbar, cards untuk stats, dan table untuk recent orders.

---

###TAHAP 12: Update Halaman Products

**Tujuan**: Terapkan desain ke halaman management produk.

**Langkah-langkah**:

1. **Buat halaman products** (route `/products`)

2. **Struktur sama dengan dashboard**, bedanya:
   - Sidebar menu "Produk" aktif
   - Ada tombol "Tambah Produk" di header
   - Ada table untuk list produk
   - Ada search input

3. **Contoh struktur**:
```html
<main class="app-main">
  <!-- Header dengan tombol -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <h2 style="font-size: 24px; font-weight: 600;">Produk</h2>
    <button class="btn btn-primary" onclick="showAddProductModal()">
      + Tambah Produk
    </button>
  </div>

  <!-- Search & Filter -->
  <div class="card" style="margin-bottom: 24px;">
    <div style="display: flex; gap: 16px;">
      <input type="text" class="input input-search" placeholder="Cari produk..." style="flex: 1;">
      <select class="input" style="width: 200px;">
        <option>Semua Kategori</option>
        <option>Makanan</option>
        <option>Minuman</option>
      </select>
    </div>
  </div>

  <!-- Table -->
  <div class="card">
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Gambar</th>
            <th>Nama Produk</th>
            <th>Kategori</th>
            <th>Harga</th>
            <th>Stok</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <!-- Data produk -->
        </tbody>
      </table>
    </div>
  </div>
</main>
```

**Cekpoint**: Products page ada search, filter, table dengan gambar, dan tombol tambah.

---

###TAHAP 13: Update Halaman Orders

**Tujuan**: Terapkan desain ke halaman management pesanan.

**Langkah-langkah**:

1. **Buat halaman orders** (route `/orders`)

2. **Struktur mirip products**, bedanya:
   - Kolom: No. Pesanan, Pelanggan, Items, Total, Status, Tanggal, Aksi
   - Status badges dengan warna berbeda
   - Bisa filter berdasarkan status

3. **Contoh filter status**:
```html
<div style="display: flex; gap: 8px; margin-bottom: 24px;">
  <button class="btn btn-primary">Semua</button>
  <button class="btn btn-secondary">Menunggu</button>
  <button class="btn btn-secondary">Diproses</button>
  <button class="btn btn-secondary">Selesai</button>
  <button class="btn btn-secondary">Dibatalkan</button>
</div>
```

**Cekpoint**: Orders page ada filter tabs untuk status pesanan.

---

###TAHAP 14: Testing dan Verifikasi

**Tujuan**: Pastikan semua komponen bekerja dengan benar.

**Langkah-langkah**:

1. **Cek semua warna sudah sesuai**:
   - Primary: #f5427e
   - Background alt: #f8f9fa
   - Text: #1a1a2e
   - Border: #e5e7eb

2. **Cek responsive**:
   - Test di resolution 1024px ke atas
   - Sidebar dan navbar tetap di posisi

3. **Cek interaksi**:
   - Hover states bekerja
   - Button click正常工作
   - Form validation bekerja

4. **Cek konsistensi**:
   - Semua halaman pakai CSS yang sama
   - Spacing konsisten
   - Font sama di semua tempat

5. **Manual test scenarios**:
   - Login → harus muncul dashboard dengan layout baru
   - Klik menu sidebar → navigasi berfungsi
   - Logout → kembali ke halaman login
   - Refresh halaman → tetap di halaman yang sama

---

## Ringkasan Tahapan

| Tahap | Nama | Estimasi Effort |
|-------|------|-----------------|
| 1 | Setup CSS Variables | Rendah |
| 2 | Global Styles | Rendah |
| 3 | Button Component | Rendah |
| 4 | Input Component | Rendah |
| 5 | Card Component | Rendah |
| 6 | Table Component | Rendah |
| 7 | Sidebar Component | Sedang |
| 8 | Navbar Component | Sedang |
| 9 | Layout Wrapper | Sedang |
| 10 | Login Page | Sedang |
| 11 | Dashboard Page | Sedang |
| 12 | Products Page | Sedang |
| 13 | Orders Page | Sedang |
| 14 | Testing | Rendah |

---

## Catatan untuk Implementor

### Sebelum Mulai:
1. **Baca dulu** semua tahap dengan teliti
2. **Cek struktur project** saat ini
3. **Backup file** sebelum mengubah

### Tips:
1. **Gunakan CSS variables** - jangan hardcode warna
2. **Fokus pada consistency** - semua halaman harus mirip
3. **Test setiap tahap** - jangan tunggu akhir baru test
4. **Catat yang mau diubah** - struktur HTML harus diubah di setiap halaman

### Troubleshooting:
- **Warna tidak muncul**: Cek apakah CSS file sudah di-import
- **Layout rusak**: Cek struktur HTML dan class names
- **Responsive bermasalah**: Cek width calculations

---

## Referensi Design

- Clean dashboard design
- Pink/magenta accent (#f5427e)
- Card-based layouts
- Simple iconography
- Consistent spacing (4px base)

---

## STATUS: IMPLEMENTATION COMPLETE

### Checklist untuk Implementor:

- [x] Tahap 1: Setup CSS Variables
- [x] Tahap 2: Global Styles
- [x] Tahap 3: Button Component
- [x] Tahap 4: Input Component
- [x] Tahap 5: Card Component
- [x] Tahap 6: Table Component
- [x] Tahap 7: Sidebar Component
- [x] Tahap 8: Navbar Component
- [x] Tahap 9: Layout Wrapper (Layout.tsx)
- [x] Tahap 10: Login Page
- [x] Tahap 11: Dashboard Page
- [x] Tahap 12: Products Page (/products)
- [x] Tahap 13: Orders Page
- [x] Tahap 14: Testing & Verification

### Komponen Baru Ditambahkan:
- [x] Modal.tsx - Komponen modal untuk add/edit forms