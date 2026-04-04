export function getFooterHtml() {
  return `
<div class="app-footer">
  <div class="footer-left">
    <span>&copy; 2026 POS App</span>
    <span class="footer-divider">|</span>
    <span>v1.0.0</span>
  </div>
  <div class="footer-right">
    <a href="javascript:void(0)" onclick="showHelpModal()">Bantuan</a>
    <a href="javascript:void(0)" onclick="showTermsModal()">Ketentuan</a>
    <a href="javascript:void(0)" onclick="showPrivacyModal()">Privasi</a>
  </div>
</div>`;
}
