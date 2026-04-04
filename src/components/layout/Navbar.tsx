export function Navbar({ title, user }) {
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  return `
    <header class="navbar">
      <h1 class="navbar-title">${title}</h1>
      <div class="navbar-right">
        <div class="navbar-user">
          <div class="navbar-user-avatar">${initial}</div>
          <span class="navbar-user-name">${user?.name || 'User'}</span>
        </div>
      </div>
    </header>
  `;
}