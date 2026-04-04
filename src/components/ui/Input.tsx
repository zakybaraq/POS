export function Input({ label, type = 'text', name, placeholder, required }) {
  return `
    <div class="input-group">
      ${label ? `<label class="input-label">${label}</label>` : ''}
      <input type="${type}" name="${name}" class="input" placeholder="${placeholder || ''}" ${required ? 'required' : ''}>
    </div>
  `;
}