export function Layout({ children, sidebar, navbar }) {
  return `
    <div class="app-layout">
      ${sidebar || ''}
      <div class="app-content">
        ${navbar || ''}
        <main class="app-main">
          ${children || ''}
        </main>
      </div>
    </div>
  `;
}

export function getLayoutWrapper(sidebarHtml, navbarHtml, contentHtml) {
  return `
    <div class="app-layout">
      ${sidebarHtml}
      <div class="app-content">
        ${navbarHtml}
        <main class="app-main">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;
}