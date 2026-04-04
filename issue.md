# Issue: Loading Loop pada Halaman Utama Meskipun Sudah Login

## Overview

Ketika user sudah login dan membuka halaman `/`, aplikasi terus-menerus menampilkan "Loading..." tanpa pernah selesai. User tidak pernah sampai ke halaman dashboard.

## Masalah Saat Ini

1. **Gejala**: Setelah login berhasil, user diarahkan ke `/` tapi stuck di "Loading..."
2. **Penyebab**: Aplikasi melakukan fetch ke `/api/auth/me` untuk mendapatkan data user, tapi response tidak pernah diproses dengan benar
3. **Loop**: Kemungkinan ada infinite loop atau response tidak handled dengan baik

## Cara Reproduksi

1. Buka `http://localhost:3000/login`
2. Login dengan email dan password yang benar
3. Setelah login berhasil, otomatis redirect ke `/`
4. Halaman stuck di "Loading..." selamanya

## Solusi yang Dibutuhkan

Debug dan perbaiki mengapa response dari `/api/auth/me` tidak diproses dengan benar, atau ganti dengan pendekatan lain.

---

## Tahap 1: Analisis Kode Saat Ini

Buka `src/index.ts` dan cari bagian ini:

```javascript
// Di dalam route '/'
<script>
  const token = localStorage.getItem('token');
  fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
    .then(res => res.json())
    .then(data => {
      if (data.error) { window.location.href = '/login'; return; }
      const user = data.user;
      document.getElementById('content').innerHTML = 
        '<div class="flex justify-between items-center mb-4">...</div>';
    })
    .catch(() => window.location.href = '/login');
</script>
```

Perhatikan:
- Apakah `localStorage.getItem('token')` mengembalikan token?
- Apakah fetch ke `/api/auth/me` berhasil?
- Apakah response di-parse dengan benar?

---

## Tahap 2: Cek Endpoint /api/auth/me

Buka `src/routes/auth.ts` dan lihat bagaimana `/me` endpoint bekerja:

```typescript
.get('/me', async ({ headers }) => {
  const authHeader = headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided' };
  }
  
  const token = authHeader.slice(7);
  
  try {
    const user = authService.verifyToken(token);
    return { user };
  } catch (e: any) {
    return { error: 'Invalid token' };
  }
});
```

Cek apakah:
- Header `Authorization` dikirim dengan benar
- Token valid
- Response format benar

---

## Tahap 3: Testing Manual

Test endpoint secara langsung:

```bash
# Login dulu untuk dapat token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Gunakan token dari response untuk test /me
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token_disini>"
```

Cek apakah response berisi `{"user": {...}}` atau `{"error": "..."}`.

---

## Tahap 4: Possible Solutions

### Solution A: Fix Token Storage
Pastikan token disimpan dengan benar di localStorage setelah login.

Di `/login` route, cek script login:

```javascript
// Cek apakah data.token ada
if (data.token) {
  localStorage.setItem('token', data.token);
  window.location.href = '/';
}
```

### Solution B: Use Cookie-Based Session (Recommended)
Hapus localStorage dan gunakan cookie untuk session:

1. Install cookie plugin: `bun add @elysiajs/cookie`
2. Setup cookie di app
3. Di login, server set cookie langsung
4. Hapus semua client-side fetch ke `/api/auth/me`

### Solution C: Fix Server-Side Redirect
Ganti client-side redirect dengan server-side redirect:

```typescript
.get('/', async ({ headers }) => {
  // Cek auth di server, bukan di client
  const token = getTokenFromCookie(headers);
  if (!token) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });
  }
  
  // Render halaman langsung
  return htmlResponse(`...`);
})
```

---

## Tahap 5: Implementasi Solution B (Recommended)

Ini adalah solusi terbaik karena:
- Tidak perlu client-side fetch
- Lebih aman (cookie httpOnly)
- Tidak ada loading loop

Ikui langkah-langkah di issue lain untuk implement cookie-based session.

---

## Tahap 6: Verifikasi

Setelah fix, test:
1. Login → harus langsung ke dashboard tanpa loading
2. Refresh halaman `/` → harus tetap login
3. Logout → harus ke halaman login
4. Buka `/` tanpa login → harus ke halaman login

---

## Catatan

- Masalah ini terjadi karena aplikasi bergantung pada client-side JavaScript untuk cek auth
- Solusi terbaik adalah Pindahkan logic auth ke server-side
- Cookie-based session adalah approach yang direkomendasikan
