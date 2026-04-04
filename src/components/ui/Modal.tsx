export function Modal({ id, title, children, footer, onClose }) {
  return `
    <div id="${id}" class="modal-overlay" onclick="if(event.target === this) document.getElementById('${id}').style.display='none'">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="document.getElementById('${id}').style.display='none'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${children}
        </div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    </div>
  `;
}

export function showModal(id) {
  return `document.getElementById('${id}').style.display = 'flex'`;
}

export function hideModal(id) {
  return `document.getElementById('${id}').style.display = 'none'`;
}