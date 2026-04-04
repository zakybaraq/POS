export function Button({ children, variant = 'primary', onClick, type = 'button' }) {
  return `<button class="btn btn-${variant}" type="${type}" onclick="${onClick || ''}">${children}</button>`;
}