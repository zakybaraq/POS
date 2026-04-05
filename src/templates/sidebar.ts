export function getSidebarHtml(activePage: string, user: { role: string; name: string }) {
  const roleMenuMap: Record<string, string[]> = {
    super_admin: ['dashboard', 'admin', 'pos', 'menu', 'tables', 'orders', 'inventory', 'customers', 'reports', 'settings', 'suppliers', 'purchase-orders', 'employees', 'shifts', 'attendance'],
    admin_restoran: ['pos', 'menu', 'tables', 'orders', 'inventory', 'customers', 'reports', 'settings', 'suppliers', 'purchase-orders', 'employees', 'shifts', 'attendance'],
    kasir: ['pos', 'customers', 'shifts', 'attendance'],
    waitress: ['orders', 'tables', 'shifts', 'attendance'],
    chef: ['orders', 'attendance']
  };

  const allowedMenus = roleMenuMap[user.role] || [];
  const isMenuAllowed = (menu: string): boolean => allowedMenus.includes(menu);

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
      ${isMenuAllowed('dashboard') ? `
      <li class="sidebar-menu-item">
        <a href="/" class="sidebar-menu-link ${activePage === 'dashboard' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span class="sidebar-menu-label">Dashboard</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('admin') ? `
      <li class="sidebar-menu-item">
        <a href="/admin" class="sidebar-menu-link ${activePage === 'admin' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span class="sidebar-menu-label">Admin</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('pos') ? `
      <li class="sidebar-menu-item">
        <a href="/pos" class="sidebar-menu-link ${activePage === 'pos' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          <span class="sidebar-menu-label">POS</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('menu') ? `
      <li class="sidebar-menu-item">
        <a href="/menu" class="sidebar-menu-link ${activePage === 'menu' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span class="sidebar-menu-label">Menu</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('tables') ? `
      <li class="sidebar-menu-item">
        <a href="/tables" class="sidebar-menu-link ${activePage === 'tables' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span class="sidebar-menu-label">Meja</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('orders') ? `
      <li class="sidebar-menu-item">
        <a href="/orders" class="sidebar-menu-link ${activePage === 'orders' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          <span class="sidebar-menu-label">Pesanan</span>
          <span class="menu-badge" id="order-badge" style="display: none;">0</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('inventory') ? `
      <li class="sidebar-menu-item">
        <a href="/inventory" class="sidebar-menu-link ${activePage === 'inventory' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          <span class="sidebar-menu-label">Inventory</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('customers') ? `
      <li class="sidebar-menu-item">
        <a href="/customers" class="sidebar-menu-link ${activePage === 'customers' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span class="sidebar-menu-label">Pelanggan</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('reports') ? `
      <li class="sidebar-menu-item">
        <a href="/reports" class="sidebar-menu-link ${activePage === 'reports' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          <span class="sidebar-menu-label">Laporan</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('settings') ? `
      <li class="sidebar-menu-item">
        <a href="/settings" class="sidebar-menu-link ${activePage === 'settings' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span class="sidebar-menu-label">Pengaturan</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('suppliers') ? `
      <li class="sidebar-menu-item">
        <a href="/suppliers" class="sidebar-menu-link ${activePage === 'suppliers' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 8v4"></path><path d="M20 10h4"></path></svg>
          <span class="sidebar-menu-label">Supplier</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('purchase-orders') ? `
      <li class="sidebar-menu-item">
        <a href="/purchase-orders" class="sidebar-menu-link ${activePage === 'purchase-orders' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span class="sidebar-menu-label">Purchase Order</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('employees') ? `
      <li class="sidebar-menu-item">
        <a href="/employees" class="sidebar-menu-link ${activePage === 'employees' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span class="sidebar-menu-label">Karyawan</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('shifts') ? `
      <li class="sidebar-menu-item">
        <a href="/shifts" class="sidebar-menu-link ${activePage === 'shifts' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span class="sidebar-menu-label">Shift</span>
        </a>
      </li>` : ''}

      ${isMenuAllowed('attendance') ? `
      <li class="sidebar-menu-item">
        <a href="/attendance" class="sidebar-menu-link ${activePage === 'attendance' ? 'active' : ''}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span class="sidebar-menu-label">Kehadiran</span>
        </a>
      </li>` : ''}
    </ul>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user-info">
      <div class="navbar-user-avatar">${user.name.charAt(0).toUpperCase()}</div>
      <div class="sidebar-user-details">
        <div class="sidebar-user-name">${user.name}</div>
        <div class="sidebar-user-role">${user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}</div>
      </div>
    </div>
    <button onclick="logout()" class="btn btn-secondary sidebar-footer-text" style="width: 100%;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      <span class="sidebar-menu-label">Logout</span>
    </button>
  </div>
</aside>`;
}
