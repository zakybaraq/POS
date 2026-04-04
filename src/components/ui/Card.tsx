export function Card({ title, children, footer }) {
  return `
    <div class="card">
      ${title ? `<div class="card-header"><h3 class="card-title">${title}</h3></div>` : ''}
      <div class="card-body">${children}</div>
      ${footer ? `<div class="card-footer">${footer}</div>` : ''}
    </div>
  `;
}