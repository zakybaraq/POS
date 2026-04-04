# Issue: Perbaikan Session Authentication

## Overview

Saat ini aplikasi menggunakan client-side session check yang menyebabkan loading loop dan tidak aman. Ini perlu diganti dengan server-side session yang lebih reliable.

## Masalah Saat Ini

1. **Loading Loop**: Halaman melakukan fetch ke `/api/auth/me` untuk cek auth, tapi endpoint ini perlu token Bearer - tapi halaman belum selesai load, jdi loop
2. **Tidak Aman**: Token disimpan di localStorage bisa diakses via XSS
3. **Tidak Robust**: Jika API gagal respond, user stuck di loading

## Solusi yang Dibutuhkan

Ganti client-side auth check dengan server-side session menggunakan cookie yang httpOnly dan secure.

---

## Tahap 1: Setup Cookie-Based Session

### 1.1 Install Dependencies

```bash
bun add cookie-parser
```

### 1.2 Update Auth Service

Buat file `src/services/session.ts`:

```typescript
import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'elysia';

const JWT_SECRET = process.env.JWT_SECRET || 'pos-secret-key-change-in-production';
const COOKIE_NAME = 'pos_session';

export function createSessionCookie(token: string): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    path: '/',
  };
}

export function getTokenFromCookie(cookies: any): string | null {
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;
  try {
    jwt.verify(sessionCookie, JWT_SECRET);
    return sessionCookie;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
```

### 1.3 Update Auth Routes

Update `src/routes/auth.ts`:

```typescript
import { cookie } from 'elysia';
import { createSessionCookie, getTokenFromCookie, verifyToken } from '../services/session';

const COOKIE_NAME = 'pos_session';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(cookie())
  
  .post('/login', async ({ body, cookies }) => {
    // ... existing login logic ...
    
    // Set cookie instead of returning token
    cookies.set(COOKIE_NAME, token, createSessionCookie(token));
    return { success: true, user: payload };
  }, { ... })
  
  .post('/logout', async ({ cookies }) => {
    cookies.delete(COOKIE_NAME, { path: '/' });
    return { success: true };
  })
  
  .get('/me', async ({ cookies }) => {
    const token = getTokenFromCookie(cookies);
    if (!token) return { error: 'Not authenticated' };
    try {
      const user = verifyToken(token);
      return { user };
    } catch {
      return { error: 'Invalid token' };
    }
  });
```

---

## Tahap 2: Update Frontend untuk Pakai Cookie

### 2.1 Hapus Token dari localStorage

Update halaman login di `src/index.ts`:

```typescript
// Di script login:
if (data.success) {
  // Hapus localStorage token, cukup redirect
  window.location.href = '/';
}

// Di script logout:
function logout() {
  fetch('/api/auth/logout', { method: 'POST' })
    .then(() => window.location.href = '/login');
}
```

### 2.2 Hapus Auth Check Script dari Setiap Halaman

Hapus variabel `authCheckScript` dari setiap route yang ada. Biarkan halaman render biasa, kalau belum login akan di-redirect oleh server.

---

## Tahap 3: Server-Side Redirect

### 3.1 Buat Middleware Auth

Tambahkan di `src/index.ts` sebelum routes:

```typescript
const app = new Elysia()
  .use(cookie())
  .derive(async ({ cookies }) => {
    const { getTokenFromCookie, verifyToken } = await import('./services/session');
    const token = getTokenFromCookie(cookies);
    let user = null;
    if (token) {
      try {
        user = verifyToken(token);
      } catch {}
    }
    return { user };
  })
  
  // Public routes (tidak perlu auth)
  .get('/login', ...)
  .get('/register', ...)
  .get('/forgot-password', ...)
  .get('/health', ...)
  
  // Protected routes
  .get('/', ({ user }) => {
    if (!user) return new Response(null, { status: 302, headers: { Location: '/login' } });
    // render dashboard...
  })
  
  .get('/pos', ({ user }) => {
    if (!user) return new Response(null, { status: 302, headers: { Location: '/login' } });
    // render POS page...
  });
```

---

## Tahap 4: Testing

### 4.1 Test Login Flow

1. Buka `/login`
2. Isi form login
3. Submit - harus redirect ke `/`
4. Cek cookie `pos_session` di DevTools

### 4.2 Test Logout

1. Klik logout button
2. Harus redirect ke `/login`
3. Cookie harus dihapus

### 4.3 Test Protected Routes

1. Buka `/pos` tanpa login
2. Harus otomatis redirect ke `/login`

### 4.4 Test Session Expiry

1. Login
2. Tunggu 24 jam (atau ubah maxAge jadi 1 menit untuk test)
3. Buka halaman mana saja
4. Harus redirect ke `/login`

---

## Files yang Perlu Diubah

| File | Aksi |
|------|------|
| `src/services/session.ts` | Buat baru |
| `src/routes/auth.ts` | Update |
| `src/index.ts` | Update middleware + hapus client-side auth |

---

## Catatan Penting

- Cookie harus `httpOnly: true` agar tidak bisa diakses via JavaScript
- Gunakan `sameSite: 'lax'` untuk keamanan
- Semua protected route harus cek `user` dari context sebelum render
- Jangan lupa handle case saat cookie expired atau invalid

---

## Expected Result

- User bisa login dan session disimpan di cookie
- Tidak ada loading loop saat buka halaman
- Logout hapus session dengan baik
- Semua protected route redirect ke login kalau belum auth
