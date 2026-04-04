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
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-logo">POS App</h1>
            <p class="text-center text-secondary">Login ke akun Anda</p>
          </div>
          <form id="login-form">
            <div class="input-group">
              <label class="input-label">Email</label>
              <input type="email" name="email" class="input" placeholder="email@example.com" required>
            </div>
            <div class="input-group">
              <label class="input-label">Password</label>
              <input type="password" name="password" class="input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 24px;">Login</button>
          </form>
          <div class="login-footer">
            <p>Belum punya akun? <a href="/register">Register</a></p>
            <p><a href="/forgot-password" class="text-secondary">Lupa Password?</a></p>
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
        .login-card {
          background: var(--color-bg);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          width: 400px;
          box-shadow: var(--shadow-lg);
        }
        .login-header {
          text-align: center;
          margin-bottom: var(--space-lg);
        }
        .login-logo {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
        }
        .login-footer {
          margin-top: var(--space-lg);
          text-align: center;
          font-size: 14px;
        }
        .login-footer p {
          margin: var(--space-xs) 0;
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
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-logo">POS App</h1>
            <p class="text-center text-secondary">Daftar akun baru</p>
          </div>
          <form id="register-form">
            <div class="input-group">
              <label class="input-label">Nama</label>
              <input type="text" name="name" class="input" placeholder="Nama lengkap" required>
            </div>
            <div class="input-group">
              <label class="input-label">Email</label>
              <input type="email" name="email" class="input" placeholder="email@example.com" required>
            </div>
            <div class="input-group">
              <label class="input-label">Password</label>
              <input type="password" name="password" class="input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 24px;">Register</button>
          </form>
          <div class="login-footer">
            <p>Sudah punya akun? <a href="/login">Login</a></p>
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
        .login-card {
          background: var(--color-bg);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          width: 400px;
          box-shadow: var(--shadow-lg);
        }
        .login-header {
          text-align: center;
          margin-bottom: var(--space-lg);
        }
        .login-logo {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
        }
        .login-footer {
          margin-top: var(--space-lg);
          text-align: center;
          font-size: 14px;
        }
        .login-footer p {
          margin: var(--space-xs) 0;
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
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-logo">POS App</h1>
            <p class="text-center text-secondary">Reset password</p>
          </div>
          <form id="forgot-form">
            <div class="input-group">
              <label class="input-label">Email</label>
              <input type="email" name="email" class="input" placeholder="email@example.com" required>
            </div>
            <div class="input-group">
              <label class="input-label">Password Baru</label>
              <input type="password" name="newPassword" class="input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 24px;">Reset Password</button>
          </form>
          <div class="login-footer">
            <p><a href="/login">Kembali ke Login</a></p>
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
        .login-card {
          background: var(--color-bg);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          width: 400px;
          box-shadow: var(--shadow-lg);
        }
        .login-header {
          text-align: center;
          margin-bottom: var(--space-lg);
        }
        .login-logo {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: var(--space-sm);
        }
        .login-footer {
          margin-top: var(--space-lg);
          text-align: center;
          font-size: 14px;
        }
        .login-footer p {
          margin: var(--space-xs) 0;
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
                <a href="/tables" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
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
              <span>Logout (${user.name})</span>
            </div>
          </div>
        </aside>
        
        <div class="app-content">
          <header class="navbar">
            <h1 class="navbar-title">Dashboard</h1>
            <div class="navbar-right">
              <div class="navbar-user">
                <div class="navbar-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <span class="navbar-user-name">${user.name}</span>
              </div>
            </div>
          </header>
          
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
      <script>
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/login');
        }
      </script>
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
                <a href="/pos" class="sidebar-menu-link active">
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
        
        <div class="app-content" style="margin-left: 0; width: 100%;">
          <header class="navbar" style="left: 0;">
            <h1 class="navbar-title">Point of Sale</h1>
          </header>
          
          <main class="app-main" style="padding: 0; display: flex; height: calc(100vh - 64px);">
            <div class="pos-tables" style="width: 200px; background: var(--color-text); padding: 16px; overflow-y: auto;">
              <h3 style="color: white; margin-bottom: 16px; font-size: 16px;">Meja</h3>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${tables.map(t => `<button class="table-btn" data-table-id="${t.id}" style="padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; ${t.status === 'available' ? 'background: var(--color-success); color: white;' : 'background: var(--color-error); color: white;'}">${t.tableNumber}</button>`).join('')}
              </div>
              <button onclick="addTable()" style="margin-top: 16px; width: 100%; padding: 12px; background: var(--color-text-secondary); color: white; border: none; border-radius: 8px; cursor: pointer;">+ Tambah</button>
            </div>
            
            <div class="pos-menu" style="flex: 1; padding: 16px; overflow-y: auto;">
              <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                <button class="btn btn-primary" onclick="filterMenu('all')">Semua</button>
                <button class="btn btn-secondary" onclick="filterMenu('makanan')">Makanan</button>
                <button class="btn btn-secondary" onclick="filterMenu('minuman')">Minuman</button>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                ${menus.map(m => `<button class="menu-item" data-category="${m.category}" onclick="addToCart(${m.id}, '${m.name}', ${m.price})" style="padding: 16px; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-lg); cursor: pointer; text-align: center; transition: var(--transition);"><div style="font-weight: 600; margin-bottom: 4px;">${m.name}</div><div style="color: var(--color-primary); font-weight: 700;">${m.price.toLocaleString('id-ID')}</div></button>`).join('')}
              </div>
            </div>
            
            <div class="pos-cart" style="width: 320px; background: var(--color-bg); border-left: 1px solid var(--color-border); padding: 16px; display: flex; flex-direction: column;">
              <h3 style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border);">Cart</h3>
              <div id="cart-zone" style="flex: 1; overflow-y: auto;">
                <p class="text-center text-secondary" style="padding: 40px 0;">Pilih meja terlebih dahulu</p>
              </div>
            </div>
          </main>
        </div>
      </div>
      <style>
        .menu-item:hover { border-color: var(--color-primary) !important; transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .table-btn:hover { opacity: 0.9; }
      </style>
      <script>
        let currentOrderId = null;
        let currentUserId = ${user.userId};
        
        function filterMenu(category) {
          document.querySelectorAll('.menu-item').forEach(item => {
            item.style.display = (category === 'all' || item.dataset.category === category) ? 'block' : 'none';
          });
        }
        
        async function addToCart(menuId, name, price) {
          if (!currentOrderId) { alert('Pilih meja terlebih dahulu!'); return; }
          const response = await fetch('/api/orders/' + currentOrderId + '/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuId, quantity: 1 })
          });
          if (response.ok) { const data = await response.json(); renderCart(data.order, data.items); }
        }
        
        function renderCart(order, items) {
          const cartZone = document.getElementById('cart-zone');
          if (!order || !items.length) { cartZone.innerHTML = '<p class="text-center text-secondary" style="padding: 40px 0;">Cart kosong</p>'; return; }
          
          let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
          items.forEach(item => {
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--color-border);"><div><div style="font-weight: 600;">' + (item.menuName || 'Item') + '</div><div style="font-size: 13px; color: var(--color-text-secondary);">x' + item.quantity + '</div></div><div style="display: flex; align-items: center; gap: 12px;"><span style="font-weight: 600;">' + (item.priceAtOrder * item.quantity).toLocaleString('id-ID') + '</span><button onclick="removeItem(' + item.id + ')" style="color: var(--color-error); background: none; border: none; cursor: pointer; font-size: 18px;">x</button></div></div>';
          });
          html += '</div>';
          
          const subtotal = order.subtotal || 0, tax = order.tax || 0, total = order.total || 0;
          html += '<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);"><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Subtotal:</span><span>' + subtotal.toLocaleString('id-ID') + '</span></div><div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Pajak (10%):</span><span>' + tax.toLocaleString('id-ID') + '</span></div><div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 18px;"><span>Total:</span><span>' + total.toLocaleString('id-ID') + '</span></div></div>';
          html += '<div style="margin-top: 16px;"><label style="display: block; font-weight: 600; margin-bottom: 8px;">Uang Diterima:</label><input type="number" id="amount-paid" class="input" placeholder="0" style="width: 100%;"><div style="margin-top: 8px; font-size: 13px;">Kembalian: <span id="change-due">0</span></div></div>';
          html += '<div style="margin-top: 16px; display: flex; gap: 8px;"><button onclick="cancelOrder()" class="btn btn-danger" style="flex: 1;">Batal</button><button onclick="processPayment()" class="btn btn-primary" style="flex: 1;">Bayar</button></div>';
          
          cartZone.innerHTML = html;
          document.getElementById('amount-paid').addEventListener('input', function() {
            const paid = parseInt(this.value) || 0;
            document.getElementById('change-due').textContent = (paid - total >= 0 ? paid - total : 'Kurang ' + (total - paid)).toLocaleString('id-ID');
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
          else { alert('Pembayaran berhasil!\\n\\n' + data.receipt); currentOrderId = null; document.getElementById('cart-zone').innerHTML = '<p class="text-center text-secondary" style="padding: 40px 0;">Pilih meja terlebih dahulu</p>'; location.reload(); }
        }
        
        async function cancelOrder() {
          if (!currentOrderId || !confirm('Batalkan pesanan?')) return;
          await fetch('/api/orders/' + currentOrderId + '/cancel', { method: 'POST' });
          currentOrderId = null;
          document.getElementById('cart-zone').innerHTML = '<p class="text-center text-secondary" style="padding: 40px 0;">Pilih meja terlebih dahulu</p>';
          location.reload();
        }
        
        async function addTable() {
          const num = parseInt(prompt('Nomor Meja:'));
          if (!num) return;
          await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: num }) });
          location.reload();
        }
        
        document.addEventListener('click', function(e) {
          if (e.target.classList.contains('table-btn')) selectTable(e.target.dataset.tableId);
        });
        
        async function selectTable(tableId) {
          const response = await fetch('/api/tables/' + tableId);
          const table = await response.json();
          if (table.status === 'occupied') {
            const orderRes = await fetch('/api/orders/table/' + tableId);
            const orderData = await orderRes.json();
            if (orderData.order) { currentOrderId = orderData.order.id; renderCart(orderData.order, orderData.items); }
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
        
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/login');
        }
      </script>
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
                <a href="/menu" class="sidebar-menu-link active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                  Menu
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
            <h1 class="navbar-title">Kelola Menu</h1>
            <div class="navbar-right">
              <button class="btn btn-primary" onclick="showAddMenuModal()">+ Tambah Menu</button>
            </div>
          </header>
          
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
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/login');
        }
      </script>
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
                <a href="/tables" class="sidebar-menu-link active">
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
            <h1 class="navbar-title">Kelola Meja</h1>
            <div class="navbar-right">
              <button class="btn btn-primary" onclick="addTable()">+ Tambah Meja</button>
            </div>
          </header>
          
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
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/login');
        }
      </script>
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
                <a href="/tables" class="sidebar-menu-link">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Meja
                </a>
              </li>
              <li class="sidebar-menu-item">
                <a href="/orders" class="sidebar-menu-link active">
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
            <h1 class="navbar-title">Pesanan Hari Ini</h1>
            <div class="navbar-right">
              <div style="font-size: 18px; font-weight: 600;">Total: Rp ${todayTotal.toLocaleString('id-ID')}</div>
            </div>
          </header>
          
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
        </div>
      </div>
      <script>
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
