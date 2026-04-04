import { Elysia } from 'elysia';
import { cookie } from '@elysiajs/cookie';
import { routes } from './routes';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pos-secret-key-change-in-production';

const layoutHtml = existsSync(join(__dirname, 'views/layout.html')) 
  ? readFileSync(join(__dirname, 'views/layout.html'), 'utf-8')
  : `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restaurant POS</title>
  <link rel="stylesheet" href="/styles/global.css">
</head>
<body>
  {{ content }}
</body>
</html>`;

function htmlResponse(content: string) {
  const html = layoutHtml.replace('{{ content }}', content);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function redirectToLogin() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/login' }
  });
}

function getTokenFromCookies(cookies: any, headers: any): string | null {
  if (cookies?.pos_session) {
    const sessionCookie = cookies.pos_session;
    const token = sessionCookie?.value || sessionCookie;
    if (token) {
      try {
        jwt.verify(token, JWT_SECRET);
        return token;
      } catch {}
    }
  }
  
  const cookieHeader = headers?.cookie;
  if (!cookieHeader) return null;
  
  const match = cookieHeader.match(/pos_session=([^;]+)/);
  if (!match) return null;
  
  const token = match[1];
  try {
    jwt.verify(token, JWT_SECRET);
    return token;
  } catch {
    return null;
  }
}

function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

function getSidebarHtml(activePage: string, user: any) {
  return `
<aside class="sidebar" id="app-sidebar">
  <button class="sidebar-toggle" onclick="toggleSidebar()" title="Toggle Sidebar">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M15 18l-6-6 6-6"></path>
    </svg>
  </button>
  <div class="sidebar-header">
    <div class="sidebar-logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
      </svg>
      <span class="sidebar-logo-text">POS App</span>
    </div>
  </div>
  <nav class="sidebar-nav">
    <ul class="sidebar-menu">
      <li class="sidebar-menu-item">
        <a href="/" class="sidebar-menu-link ${activePage === 'dashboard' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span class="sidebar-menu-label">Dashboard</span>
        </a>
      </li>
      <li class="sidebar-menu-item">
        <a href="/pos" class="sidebar-menu-link ${activePage === 'pos' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          <span class="sidebar-menu-label">POS</span>
        </a>
      </li>
      <li class="sidebar-menu-item">
        <a href="/menu" class="sidebar-menu-link ${activePage === 'menu' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span class="sidebar-menu-label">Menu</span>
        </a>
      </li>
      <li class="sidebar-menu-item">
        <a href="/tables" class="sidebar-menu-link ${activePage === 'tables' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span class="sidebar-menu-label">Meja</span>
        </a>
      </li>
      <li class="sidebar-menu-item">
        <a href="/orders" class="sidebar-menu-link ${activePage === 'orders' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          <span class="sidebar-menu-label">Pesanan</span>
          <span class="menu-badge" id="order-badge" style="display: none;">0</span>
        </a>
      </li>
    </ul>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user-info">
      <div class="navbar-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
      <div class="sidebar-user-details">
        <div class="sidebar-user-name">${user.name}</div>
        <div class="sidebar-user-role">Admin</div>
      </div>
    </div>
    <button onclick="logout()" class="btn btn-secondary sidebar-footer-text" style="width: 100%;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span class="sidebar-menu-label">Logout</span>
    </button>
  </div>
</aside>`;
}

function getNavbarHtml(title: string, activePage: string, user: any) {
  return `
<header class="navbar">
  <div class="navbar-left">
    <button class="menu-toggle" onclick="toggleMobileSidebar()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18M3 6h18M3 18h18"></path>
      </svg>
    </button>
    <div class="breadcrumb">
      <a href="/">Home</a>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item current">${title}</span>
    </div>
  </div>
  <div class="navbar-center">
    <div class="navbar-search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
      </svg>
      <input type="text" placeholder="Cari..." id="global-search">
    </div>
  </div>
  <div class="navbar-right">
    <div class="navbar-notification">
      <button class="notification-btn" onclick="toggleNotifications()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="notification-badge" id="notif-count" style="display: none;">0</span>
      </button>
      <div class="notification-dropdown" id="notif-dropdown">
        <div class="notification-header">Notifikasi</div>
        <div class="notification-list" id="notif-list">
          <div class="notification-empty">Tidak ada notifikasi</div>
        </div>
      </div>
    </div>
    <div class="user-dropdown">
      <div class="navbar-user" onclick="toggleUserMenu()">
        <div class="navbar-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <span class="navbar-user-name">${user.name}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"></path>
        </svg>
      </div>
      <div class="user-dropdown-menu" id="user-dropdown">
        <a href="/profile" class="user-dropdown-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profil
        </a>
        <a href="/settings" class="user-dropdown-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Pengaturan
        </a>
        <div class="user-dropdown-divider"></div>
        <div class="user-dropdown-item danger" onclick="logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Keluar
        </div>
      </div>
    </div>
  </div>
</header>`;
}

function getFooterHtml() {
  return `
<div class="app-footer">
  <div class="footer-left">
    <span>&copy; 2026 POS App</span>
    <span class="footer-divider">|</span>
    <span>v1.0.0</span>
  </div>
  <div class="footer-right">
    <a href="/help">Bantuan</a>
    <a href="/terms">Ketentuan</a>
    <a href="/privacy">Privasi</a>
  </div>
</div>`;
}

function getCommonScripts() {
  return `
<script>
function toggleSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const content = document.querySelector('.app-content');
  sidebar.classList.toggle('collapsed');
  if (content) {
    content.classList.toggle('collapsed-adjusted');
  }
  localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  sidebar.classList.toggle('show');
}

function toggleNotifications() {
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.classList.toggle('show');
  document.getElementById('user-dropdown').classList.remove('show');
}

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  dropdown.classList.toggle('show');
  document.getElementById('notif-dropdown').classList.remove('show');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.navbar-notification')) {
    document.getElementById('notif-dropdown').classList.remove('show');
  }
  if (!e.target.closest('.user-dropdown')) {
    document.getElementById('user-dropdown').classList.remove('show');
  }
  if (window.innerWidth <= 1024) {
    const sidebar = document.getElementById('app-sidebar');
    if (!e.target.closest('.sidebar') && !e.target.closest('.menu-toggle')) {
      sidebar.classList.remove('show');
    }
  }
});

document.getElementById('global-search').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    const query = this.value.trim();
    if (query) {
      window.location.href = '/orders?search=' + encodeURIComponent(query);
    }
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (isCollapsed) {
    document.getElementById('app-sidebar').classList.add('collapsed');
  }
});

function logout() {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    .then(() => window.location.href = '/login');
}
</script>`;
}

const app = new Elysia()
  .use(routes)
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/styles/:path', ({ params }) => {
    const stylesDir = join(__dirname, 'public/styles');
    const filePath = join(stylesDir, params.path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'text/css' } });
    }
    return new Response('Not found', { status: 404 });
  })
  
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
  })
  
  .get('/', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('dashboard', user)}
        
        <div class="app-content">
          ${getNavbarHtml('Dashboard', 'dashboard', user)}
          
          <main class="app-main">
            <div class="stats-grid">
              <div class="stats-card">
                <div class="stats-label">Total Penjualan</div>
                <div class="stats-value">Rp 0</div>
                <div class="stats-change">Hari ini</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Total Pesanan</div>
                <div class="stats-value">0</div>
                <div class="stats-change">Hari ini</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Meja Terpakai</div>
                <div class="stats-value">0</div>
                <div class="stats-change">Dari 0 total</div>
              </div>
              <div class="stats-card">
                <div class="stats-label">Menu Tersedia</div>
                <div class="stats-value">0</div>
                <div class="stats-change">Total menu</div>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Menu Cepat</h3>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                <a href="/pos" class="quick-link">
                  <div class="quick-icon" style="background: var(--color-primary-10);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  </div>
                  <span>Buka POS</span>
                </a>
                <a href="/menu" class="quick-link">
                  <div class="quick-icon" style="background: rgba(16, 185, 129, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-success)" stroke="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  </div>
                  <span>Kelola Menu</span>
                </a>
                <a href="/tables" class="quick-link">
                  <div class="quick-icon" style="background: rgba(245, 158, 11, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-warning)" stroke="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <span>Kelola Meja</span>
                </a>
                <a href="/orders" class="quick-link">
                  <div class="quick-icon" style="background: rgba(139, 92, 246, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#8b5cf6" stroke="none"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
                  </div>
                  <span>Lihat Pesanan</span>
                </a>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px;
          border-radius: var(--radius-lg);
          background: var(--color-bg-alt);
          transition: var(--transition);
          text-decoration: none;
          color: var(--color-text);
        }
        .quick-link:hover {
          background: var(--color-bg-hover);
          transform: translateY(-2px);
        }
        .quick-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .quick-link span {
          font-weight: 500;
        }
      </style>
      ${getCommonScripts()}
    `);
  })
  
  .get('/pos', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    const { getAllTables } = await import('./repositories/table');
    const { getAvailableMenus } = await import('./repositories/menu');
    const { getOrdersToday } = await import('./repositories/order');
    
    const tables = await getAllTables();
    const menus = await getAvailableMenus();
    const orders = await getOrdersToday();
    
    const todayTotal = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
    
    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('pos', user)}
        
        <div class="app-content">
          ${getNavbarHtml('Point of Sale', 'pos', user)}
          
          <main class="app-main pos-main">
            <div class="pos-tables">
              <div class="pos-tables-header">
                <h3>Meja</h3>
                <button class="btn btn-sm btn-secondary" onclick="addTable()" title="Tambah Meja">+</button>
              </div>
              <div class="tables-grid">
                ${tables.map(t => `<button class="table-btn ${t.status === 'available' ? 'available' : 'occupied'}" data-table-id="${t.id}" data-status="${t.status}" onclick="selectTable(${t.id}, ${t.tableNumber}, '${t.status}')">${t.tableNumber}</button>`).join('')}
              </div>
              ${tables.length === 0 ? '<p class="text-secondary text-center" style="padding: 16px;">Belum ada meja</p>' : ''}
            </div>
            
            <div class="pos-menu-area">
              <div class="pos-menu-header">
                <div class="category-tabs">
                  <button class="category-tab active" onclick="filterMenu('all', this)">Semua</button>
                  <button class="category-tab" onclick="filterMenu('makanan', this)">Makanan</button>
                  <button class="category-tab" onclick="filterMenu('minuman', this)">Minuman</button>
                </div>
                <div class="pos-search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                  <input type="text" id="menu-search" placeholder="Cari menu..." oninput="searchMenu(this.value)">
                </div>
              </div>
              <div class="menu-grid" id="menu-grid">
                ${menus.map(m => `
                  <button class="menu-item" data-category="${m.category}" data-name="${m.name.toLowerCase()}" onclick="addToCart(${m.id}, '${m.name.replace(/'/g, "\\'")}', ${m.price})">
                    <div class="menu-item-name">${m.name}</div>
                    <div class="menu-item-price">${m.price.toLocaleString('id-ID')}</div>
                  </button>
                `).join('')}
              </div>
              ${menus.length === 0 ? '<p class="text-center text-secondary" style="padding: 40px;">Menu kosong</p>' : ''}
            </div>
            
            <div class="pos-cart">
              <div class="cart-header">
                <h3>Cart</h3>
                <span class="cart-count" id="cart-count" style="display: none;">0</span>
              </div>
              <div class="cart-zone" id="cart-zone">
                <div class="cart-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;">
                    <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <p>Pilih meja terlebih dahulu</p>
                </div>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <style>
        .pos-main {
          padding: 0;
          display: flex;
          height: calc(100vh - 128px);
          gap: 0;
        }
        
        .pos-tables {
          width: 140px;
          background: var(--color-bg-alt);
          padding: 16px;
          border-right: 1px solid var(--color-border);
          overflow-y: auto;
          flex-shrink: 0;
        }
        
        .pos-tables-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .pos-tables-header h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        
        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }
        
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .table-btn {
          aspect-ratio: 1;
          border-radius: 12px;
          border: 2px solid transparent;
          cursor: pointer;
          font-weight: 700;
          font-size: 18px;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .table-btn.available {
          background: var(--color-success);
          color: white;
        }
        
        .table-btn.occupied {
          background: var(--color-error);
          color: white;
        }
        
        .table-btn.selected {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-30);
        }
        
        .table-btn:hover {
          transform: scale(1.05);
        }
        
        .pos-menu-area {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: var(--color-bg);
        }
        
        .pos-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 16px;
        }
        
        .category-tabs {
          display: flex;
          gap: 8px;
        }
        
        .category-tab {
          padding: 8px 16px;
          border: none;
          background: var(--color-bg-alt);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          transition: var(--transition);
        }
        
        .category-tab:hover {
          background: var(--color-bg-hover);
        }
        
        .category-tab.active {
          background: var(--color-primary);
          color: white;
        }
        
        .pos-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-bg-alt);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          width: 200px;
        }
        
        .pos-search svg {
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }
        
        .pos-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          width: 100%;
        }
        
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
        
        .menu-item {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 16px;
          cursor: pointer;
          transition: var(--transition);
          text-align: center;
        }
        
        .menu-item:hover {
          border-color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .menu-item:active {
          transform: scale(0.98);
        }
        
        .menu-item-name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          color: var(--color-text);
        }
        
        .menu-item-price {
          color: var(--color-primary);
          font-weight: 700;
          font-size: 16px;
        }
        
        .pos-cart {
          width: 300px;
          background: var(--color-bg);
          border-left: 1px solid var(--color-border);
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        
        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 16px;
        }
        
        .cart-header h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .cart-count {
          background: var(--color-primary);
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
        }
        
        .cart-zone {
          flex: 1;
          overflow-y: auto;
        }
        
        .cart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
        }
        
        .cart-empty p {
          color: var(--color-text-secondary);
          margin: 0;
        }
        
        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--color-border);
        }
        
        .cart-item:last-child {
          border-bottom: none;
        }
        
        .cart-item-info {
          flex: 1;
        }
        
        .cart-item-name {
          font-weight: 600;
          font-size: 14px;
        }
        
        .cart-item-qty {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        
        .cart-item-price {
          font-weight: 600;
          font-size: 14px;
          text-align: right;
        }
        
        .cart-item-actions {
          margin-left: 8px;
        }
        
        .cart-item-btn {
          background: none;
          border: none;
          color: var(--color-error);
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
        }
        
        .cart-summary {
          border-top: 1px solid var(--color-border);
          padding-top: 16px;
          margin-top: 16px;
        }
        
        .cart-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .cart-row.total {
          font-size: 18px;
          font-weight: 700;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
        }
        
        .cart-input-group {
          margin-top: 16px;
        }
        
        .cart-input-group label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .cart-input-group input {
          width: 100%;
        }
        
        .cart-change {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin-top: 8px;
          text-align: right;
        }
        
        .cart-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        
        .cart-actions .btn {
          flex: 1;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        
        .menu-item.added {
          animation: pulse 0.2s ease;
          background: var(--color-primary-10);
        }
      </style>
      <script>
        let currentOrderId = null;
        let currentUserId = ${user.userId};
        let selectedTableId = null;
        let currentTableNumber = null;
        
        function filterMenu(category, btn) {
          document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
          btn.classList.add('active');
          
          document.querySelectorAll('.menu-item').forEach(item => {
            const matchesCategory = category === 'all' || item.dataset.category === category;
            const matchesSearch = !document.getElementById('menu-search')?.value || 
              item.dataset.name.includes(document.getElementById('menu-search').value.toLowerCase());
            item.style.display = (matchesCategory && matchesSearch) ? '' : 'none';
          });
        }
        
        function searchMenu(query) {
          query = query.toLowerCase();
          document.querySelectorAll('.menu-item').forEach(item => {
            const activeTab = document.querySelector('.category-tab.active');
            const category = activeTab?.textContent === 'Makanan' ? 'makanan' : 
                           activeTab?.textContent === 'Minuman' ? 'minuman' : 'all';
            const matchesCategory2 = category === 'all' || item.dataset.category === category;
            item.style.display = (!query || item.dataset.name.includes(query)) && matchesCategory2 ? '' : 'none';
          });
        }
        
        async function selectTable(tableId, tableNumber, status) {
          document.querySelectorAll('.table-btn').forEach(btn => btn.classList.remove('selected'));
          document.querySelector(\`[data-table-id="\${tableId}"]\`).classList.add('selected');
          
          selectedTableId = tableId;
          currentTableNumber = tableNumber;
          
          if (status === 'occupied') {
            const orderRes = await fetch('/api/orders/table/' + tableId);
            const orderData = await orderRes.json();
            if (orderData.order) { 
              currentOrderId = orderData.order.id; 
              renderCart(orderData.order, orderData.items); 
            }
            return;
          }
          
          const createRes = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableId: parseInt(tableId), userId: currentUserId })
          });
          const newOrder = await createRes.json();
          currentOrderId = newOrder.id;
          renderCart(newOrder, []);
        }
        
        async function addToCart(menuId, name, price) {
          if (!currentOrderId) { 
            alert('Pilih meja terlebih dahulu!'); 
            return; 
          }
          
          const btn = event.target.closest('.menu-item');
          if (btn) {
            btn.classList.add('added');
            setTimeout(() => btn.classList.remove('added'), 200);
          }
          
          const response = await fetch('/api/orders/' + currentOrderId + '/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuId, quantity: 1 })
          });
          if (response.ok) { 
            const data = await response.json(); 
            renderCart(data.order, data.items); 
          }
        }
        
        function renderCart(order, items) {
          const cartZone = document.getElementById('cart-zone');
          const cartCount = document.getElementById('cart-count');
          
          if (!order || !items.length) {
            cartZone.innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Cart kosong</p></div>';
            cartCount.style.display = 'none';
            return;
          }
          
          cartCount.style.display = 'inline';
          cartCount.textContent = items.length;
          
          let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
          items.forEach(item => {
            html += \`<div class="cart-item">
              <div class="cart-item-info">
                <div class="cart-item-name">\${item.menuName || 'Item'}</div>
                <div class="cart-item-qty">x\${item.quantity}</div>
              </div>
              <div class="cart-item-price">\${(item.priceAtOrder * item.quantity).toLocaleString('id-ID')}</div>
              <div class="cart-item-actions">
                <button class="cart-item-btn" onclick="removeItem(\${item.id})" title="Hapus">x</button>
              </div>
            </div>\`;
          });
          html += '</div>';
          
          const subtotal = order.subtotal || 0, tax = order.tax || 0, total = order.total || 0;
          html += \`<div class="cart-summary">
            <div class="cart-row"><span>Subtotal</span><span>\${subtotal.toLocaleString('id-ID')}</span></div>
            <div class="cart-row"><span>Pajak (10%)</span><span>\${tax.toLocaleString('id-ID')}</span></div>
            <div class="cart-row total"><span>Total</span><span>\${total.toLocaleString('id-ID')}</span></div>
          </div>\`;
          
          html += \`<div class="cart-input-group">
            <label>Uang Diterima</label>
            <input type="number" id="amount-paid" class="input" placeholder="0">
            <div class="cart-change">Kembalian: <span id="change-due">0</span></div>
          </div>\`;
          
          html += \`<div class="cart-actions">
            <button onclick="cancelOrder()" class="btn btn-danger">Batal</button>
            <button onclick="processPayment()" class="btn btn-primary">Bayar</button>
          </div>\`;
          
          cartZone.innerHTML = html;
          document.getElementById('amount-paid').addEventListener('input', function() {
            const paid = parseInt(this.value) || 0;
            document.getElementById('change-due').textContent = (paid - total >= 0 ? (paid - total).toLocaleString('id-ID') : 'Kurang ' + (total - paid).toLocaleString('id-ID'));
          });
        }
        
        async function removeItem(itemId) {
          if (!currentOrderId) return;
          await fetch('/api/orders/' + currentOrderId + '/items/' + itemId, { method: 'DELETE' });
          const response = await fetch('/api/orders/' + currentOrderId);
          const data = await response.json();
          if (data.order) renderCart(data.order, data.items);
        }
        
        async function processPayment() {
          const amount = parseInt(document.getElementById('amount-paid').value);
          if (!amount || amount <= 0) { alert('Masukkan jumlah uang yang dibayar!'); return; }
          const response = await fetch('/api/orders/' + currentOrderId + '/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountPaid: amount })
          });
          const data = await response.json();
          if (data.error) { alert(data.error); }
          else { alert('Pembayaran berhasil!\\n\\n' + data.receipt); currentOrderId = null; document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>'; location.reload(); }
        }
        
        async function cancelOrder() {
          if (!currentOrderId || !confirm('Batalkan pesanan?')) return;
          await fetch('/api/orders/' + currentOrderId + '/cancel', { method: 'POST' });
          currentOrderId = null;
          document.getElementById('cart-zone').innerHTML = '<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-text-secondary); margin-bottom: 12px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><p>Pilih meja terlebih dahulu</p></div>';
          location.reload();
        }
        
        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          location.reload();
        }
      </script>
      ${getCommonScripts()}
    `);
  })
  
  .get('/menu', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    const { getAllMenus } = await import('./repositories/menu');
    const menus = await getAllMenus();
    
    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('menu', user)}
        
        <div class="app-content">
          ${getNavbarHtml('Kelola Menu', 'menu', user)}
          
          <main class="app-main">
            <div class="card">
              <div class="card-header">
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary" onclick="filterMenus('all')">Semua</button>
                  <button class="btn btn-secondary" onclick="filterMenus('makanan')">Makanan</button>
                  <button class="btn btn-secondary" onclick="filterMenus('minuman')">Minuman</button>
                </div>
              </div>
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr><th>Nama</th><th>Harga</th><th>Kategori</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    ${menus.map(m => `
                      <tr class="menu-row" data-category="${m.category}">
                        <td><strong>${m.name}</strong></td>
                        <td>Rp ${m.price.toLocaleString('id-ID')}</td>
                        <td><span class="badge ${m.category === 'makanan' ? 'badge-warning' : 'badge-primary'}">${m.category}</span></td>
                        <td><button onclick="toggleMenu(${m.id})" class="badge ${m.isAvailable ? 'badge-success' : 'badge-error'}">${m.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}</button></td>
                        <td>
                          <button onclick="editMenu(${m.id}, '${m.name}', ${m.price})" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Edit</button>
                          <button onclick="deleteMenu(${m.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;">Hapus</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <script>
        function filterMenus(cat) {
          document.querySelectorAll('.menu-row').forEach(row => { row.style.display = (cat === 'all' || row.dataset.category === cat) ? '' : 'none'; });
        }
        async function toggleMenu(id) { await fetch('/api/menus/' + id + '/toggle', { method: 'PATCH' }); location.reload(); }
        async function deleteMenu(id) { if (!confirm('Hapus menu?')) return; await fetch('/api/menus/' + id, { method: 'DELETE' }); location.reload(); }
        function showAddMenuModal() {
          const name = prompt('Nama Menu:');
          if (!name) return;
          const price = parseInt(prompt('Harga:') || '0');
          if (price <= 0) { alert('Harga tidak valid'); return; }
          const category = prompt('Kategori (makanan/minuman):');
          if (category !== 'makanan' && category !== 'minuman') { alert('Kategori tidak valid'); return; }
          fetch('/api/menus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, price, category }) }).then(() => location.reload());
        }
        function editMenu(id, name, price) {
          const newName = prompt('Nama Menu:', name);
          if (!newName) return;
          const newPrice = parseInt(prompt('Harga:', price) || '0');
          if (newPrice <= 0) { alert('Harga tidak valid'); return; }
          fetch('/api/menus/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, price: newPrice }) }).then(() => location.reload());
        }
      </script>
      ${getCommonScripts()}
    `);
  })
  
  .get('/tables', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    const { getAllTables } = await import('./repositories/table');
    const tables = await getAllTables();
    
    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('tables', user)}
        
        <div class="app-content">
          ${getNavbarHtml('Kelola Meja', 'tables', user)}
          
          <main class="app-main">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              ${tables.map(t => `
                <div class="card" style="text-align: center;">
                  <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px; color: var(--color-text);">Meja ${t.tableNumber}</div>
                  <div style="margin-bottom: 16px;">
                    <span class="badge ${t.status === 'available' ? 'badge-success' : 'badge-error'}">${t.status === 'available' ? 'Tersedia' : 'Terisi'}</span>
                  </div>
                  <button onclick="deleteTable(${t.id})" class="btn btn-danger" style="padding: 8px 16px; font-size: 13px;">Hapus</button>
                </div>
              `).join('')}
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      <script>
        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          const res = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          const data = await res.json();
          if (data.error) { alert(data.error); return; }
          location.reload();
        }
        async function deleteTable(id) {
          if (!confirm('Hapus meja?')) return;
          await fetch('/api/tables/' + id, { method: 'DELETE' });
          location.reload();
        }
      </script>
      ${getCommonScripts()}
    `);
  })
  
  .get('/orders', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    const { getOrdersTodayWithTables } = await import('./repositories/order');
    const { getUserById } = await import('./repositories/user');
    const orders = await getOrdersTodayWithTables();
    
    const ordersWithUser = await Promise.all(orders.map(async (o: any) => {
      const user = o.orders?.userId ? await getUserById(o.orders.userId) : null;
      return { ...o, userName: user?.name || 'Unknown' };
    }));
    
    const todayTotal = ordersWithUser.filter((o: any) => o.orders?.status === 'completed').reduce((sum: number, o: any) => sum + (o.orders?.total || 0), 0);
    
    return htmlResponse(`
      <div class="app-layout">
        ${getSidebarHtml('orders', user)}
        
        <div class="app-content">
          ${getNavbarHtml('Pesanan Hari Ini', 'orders', user)}
          
          <main class="app-main">
            <div class="card">
              ${ordersWithUser.length === 0 ? '<p class="text-center text-secondary" style="padding: 40px;">Belum ada pesanan hari ini</p>' : `
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr><th>Meja</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Waktu</th></tr>
                    </thead>
                    <tbody>
                      ${ordersWithUser.map((o: any) => `
                        <tr>
                          <td><strong>Meja ${o.tables?.tableNumber || '-'}</strong></td>
                          <td>${o.userName}</td>
                          <td>Rp ${(o.orders?.total || 0).toLocaleString('id-ID')}</td>
                          <td><span class="badge ${o.orders?.status === 'completed' ? 'badge-success' : o.orders?.status === 'cancelled' ? 'badge-error' : 'badge-warning'}">${o.orders?.status === 'active' ? 'Aktif' : o.orders?.status === 'completed' ? 'Selesai' : 'Dibatal'}</span></td>
                          <td>${new Date(o.orders?.createdAt).toLocaleString('id-ID')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </main>
          ${getFooterHtml()}
        </div>
      </div>
      ${getCommonScripts()}
    `);
  })
  
  .get('/products', async ({ cookie, headers }) => {
    const token = getTokenFromCookies(cookie, headers);
    if (!token) return redirectToLogin();
    
    let user = null;
    try {
      user = verifyToken(token);
    } catch {
      return redirectToLogin();
    }
    
    const { getAllMenus } = await import('./repositories/menu');
    const menus = await getAllMenus();
    
    return htmlResponse(`
      <div class="app-layout">
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
                <a href="/" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Dashboard
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/pos" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                  POS
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/menu" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Menu
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/products" class="sidebar-menu-link active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Produk
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/tables" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Meja
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/orders" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Pesanan
                </a>
              </li>
            </ul>
          </nav>
          <div class="sidebar-footer">
            <div class="navbar-user" onclick="logout()" style="cursor: pointer;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Logout</span>
            </div>
          </div>
        </aside>
        
        <div class="app-content">
          <header class="navbar">
            <h1 class="navbar-title">Kelola Produk</h1>
            <div class="navbar-right">
              <button class="btn btn-primary" onclick="showAddProductModal()">+ Tambah Produk</button>
            </div>
          </header>
          
          <main class="app-main">
            <div class="card" style="margin-bottom: 24px;">
              <div style="display: flex; gap: 16px;">
                <input type="text" id="search-product" class="input input-search" placeholder="Cari produk..." style="flex: 1;">
                <select id="filter-category" class="input" style="width: 200px;">
                  <option value="all">Semua Kategori</option>
                  <option value="makanan">Makanan</option>
                  <option value="minuman">Minuman</option>
                </select>
              </div>
            </div>
            
            <div class="card">
              <div class="table-container">
                <table class="table">
                  <thead>
                    <tr><th>Gambar</th><th>Nama Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody id="products-table-body">
                    ${menus.map(m => `
                      <tr class="product-row" data-category="${m.category}">
                        <td>
                          <div style="width: 50px; height: 50px; background: var(--color-bg-alt); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                          </div>
                        </td>
                        <td><strong>${m.name}</strong></td>
                        <td><span class="badge ${m.category === 'makanan' ? 'badge-warning' : 'badge-primary'}">${m.category}</span></td>
                        <td>Rp ${m.price.toLocaleString('id-ID')}</td>
                        <td><span class="badge ${m.isAvailable ? 'badge-success' : 'badge-error'}">${m.isAvailable ? 'Tersedia' : 'Kosong'}</span></td>
                        <td><button onclick="toggleProduct(${m.id})" class="badge ${m.isAvailable ? 'badge-success' : 'badge-error'}">${m.isAvailable ? 'Aktif' : 'Nonaktif'}</button></td>
                        <td>
                          <button onclick="editProduct(${m.id}, '${m.name}', ${m.price}, '${m.category}')" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">Edit</button>
                          <button onclick="deleteProduct(${m.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;">Hapus</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <div id="add-product-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Tambah Produk</h3>
            <button class="modal-close" onclick="document.getElementById('add-product-modal').style.display='none'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body">
            <form id="add-product-form">
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Nama Produk</label>
                <input type="text" name="name" class="input" placeholder="Nama produk" required>
              </div>
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Harga</label>
                <input type="number" name="price" class="input" placeholder="0" required>
              </div>
              <div class="input-group" style="margin-bottom: 16px;">
                <label class="input-label">Kategori</label>
                <select name="category" class="input" required>
                  <option value="makanan">Makanan</option>
                  <option value="minuman">Minuman</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Simpan</button>
            </form>
          </div>
        </div>
      </div>
      
      <script>
        document.getElementById('search-product').addEventListener('input', function(e) {
          const search = e.target.value.toLowerCase();
          document.querySelectorAll('.product-row').forEach(row => {
            const name = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            row.style.display = name.includes(search) ? '' : 'none';
          });
        });
        
        document.getElementById('filter-category').addEventListener('change', function(e) {
          const category = e.target.value;
          document.querySelectorAll('.product-row').forEach(row => {
            row.style.display = (category === 'all' || row.dataset.category === category) ? '' : 'none';
          });
        });
        
        function showAddProductModal() {
          document.getElementById('add-product-modal').style.display = 'flex';
        }
        
        document.getElementById('add-product-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const response = await fetch('/api/menus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.get('name'),
              price: parseInt(formData.get('price')),
              category: formData.get('category')
            })
          });
          const data = await response.json();
          if (data.error) { alert(data.error); return; }
          document.getElementById('add-product-modal').style.display = 'none';
          location.reload();
        });
        
        async function toggleProduct(id) {
          await fetch('/api/menus/' + id + '/toggle', { method: 'PATCH' });
          location.reload();
        }
        
        function editProduct(id, name, price, category) {
          const newName = prompt('Nama Produk:', name);
          if (!newName) return;
          const newPrice = parseInt(prompt('Harga:', price));
          if (isNaN(newPrice) || newPrice <= 0) { alert('Harga tidak valid'); return; }
          const newCategory = prompt('Kategori (makanan/minuman):', category);
          if (newCategory !== 'makanan' && newCategory !== 'minuman') { alert('Kategori tidak valid'); return; }
          fetch('/api/menus/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, price: newPrice, category: newCategory })
          }).then(() => location.reload());
        }
        
        async function deleteProduct(id) {
          if (!confirm('Hapus produk?')) return;
          await fetch('/api/menus/' + id, { method: 'DELETE' });
          location.reload();
        }
        
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/login');
        }
      </script>
    `);
  })
  .listen(process.env.PORT || 3000);

console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);

export type App = typeof app;
