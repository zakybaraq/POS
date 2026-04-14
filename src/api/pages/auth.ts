import { Elysia } from 'elysia';
import { htmlResponse } from '../templates/html';

export const authPages = new Elysia()
  .get('/login', () => {
    return htmlResponse(`
      <div class="login-page">
        <div class="card" style="width: 400px;">
          <div class="card-header">
            <h2 style="text-align: center; color: var(--color-primary); margin: 0;">POS App</h2>
            <p class="text-center text-secondary" style="margin-top: 8px;">Login ke akun Anda</p>
          </div>
          <div style="padding: 0 var(--space-lg) var(--space-lg);">
            <form id="login-form">
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Email</label>
                <input type="email" name="email" class="input" placeholder="email@example.com" required>
              </div>
              <div class="input-group" style="margin-bottom: 24px;">
                <label class="input-label">Password</label>
                <input type="password" name="password" class="input" placeholder="••••••••" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
            </form>
            <div style="margin-top: var(--space-lg); text-align: center; font-size: 14px;">
              <p style="margin: var(--space-xs) 0;">Belum punya akun? <a href="/register">Register</a></p>
              <p style="margin: var(--space-xs) 0;"><a href="/forgot-password" class="text-secondary">Lupa Password?</a></p>
            </div>
          </div>
        </div>
      </div>
      <style>
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5427e 0%, #ff7da3 100%);
        }
      </style>
      <script>
        document.getElementById('login-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') }),
            credentials: 'include'
          });
          const data = await response.json();
          if (data.success) {
            window.location.href = '/';
          } else {
            alert(data.error || 'Login failed');
          }
        });
      </script>
    `);
  })

  .get('/register', () => {
    return htmlResponse(`
      <div class="login-page">
        <div class="card" style="width: 400px;">
          <div class="card-header">
            <h2 style="text-align: center; color: var(--color-primary); margin: 0;">POS App</h2>
            <p class="text-center text-secondary" style="margin-top: 8px;">Daftar akun baru</p>
          </div>
          <div style="padding: 0 var(--space-lg) var(--space-lg);">
            <form id="register-form">
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Nama</label>
                <input type="text" name="name" class="input" placeholder="Nama lengkap" required>
              </div>
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Email</label>
                <input type="email" name="email" class="input" placeholder="email@example.com" required>
              </div>
              <div class="input-group" style="margin-bottom: 24px;">
                <label class="input-label">Password</label>
                <input type="password" name="password" class="input" placeholder="••••••••" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Register</button>
            </form>
            <div style="margin-top: var(--space-lg); text-align: center; font-size: 14px;">
              <p style="margin: var(--space-xs) 0;">Sudah punya akun? <a href="/login">Login</a></p>
            </div>
          </div>
        </div>
      </div>
      <style>
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5427e 0%, #ff7da3 100%);
        }
      </style>
      <script>
        document.getElementById('register-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password') })
          });
          const data = await response.json();
          if (data.success) {
            alert('Registration successful! Please login.');
            window.location.href = '/login';
          } else {
            alert(data.error || 'Registration failed');
          }
        });
      </script>
    `);
  })

  .get('/forgot-password', () => {
    return htmlResponse(`
      <div class="login-page">
        <div class="card" style="width: 400px;">
          <div class="card-header">
            <h2 style="text-align: center; color: var(--color-primary); margin: 0;">Reset Password</h2>
            <p class="text-center text-secondary" style="margin-top: 8px;">Masukkan email dan password baru</p>
          </div>
          <div style="padding: 0 var(--space-lg) var(--space-lg);">
            <form id="forgot-form">
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Email</label>
                <input type="email" name="email" class="input" placeholder="email@example.com" required>
              </div>
              <div class="input-group" style="margin-bottom: 24px;">
                <label class="input-label">Password Baru</label>
                <input type="password" name="newPassword" class="input" placeholder="••••••••" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Reset Password</button>
            </form>
            <div style="margin-top: var(--space-lg); text-align: center; font-size: 14px;">
              <p style="margin: var(--space-xs) 0;"><a href="/login">Kembali ke Login</a></p>
            </div>
          </div>
        </div>
      </div>
      <style>
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5427e 0%, #ff7da3 100%);
        }
      </style>
      <script>
        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.get('email'), newPassword: formData.get('newPassword') })
          });
          const data = await response.json();
          if (data.success) {
            alert('Password berhasil direset! Silakan login.');
            window.location.href = '/login';
          } else {
            alert(data.error || 'Reset password failed');
          }
        });
      </script>
    `);
  });
