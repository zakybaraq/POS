export function getSidebarHtml(activePage: string, user: { role: string; name: string }) {
  const roleMenuMap: Record<string, string[]> = {
    super_admin: ['dashboard', 'admin', 'pos', 'menu', 'tables', 'orders'],
    admin_restoran: ['pos', 'menu', 'tables', 'orders'],
    kasir: ['pos'],
    waitress: ['orders', 'tables'],
    chef: ['orders']
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
