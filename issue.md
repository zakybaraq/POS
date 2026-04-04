# Rencana Implementasi: Modal Bantuan, Ketentuan & Privasi

## Latar Belakang

Footer aplikasi sudah memiliki 3 link: **Bantuan**, **Ketentuan**, dan **Privasi**. Saat ini link tersebut mengarah ke `/help`, `/terms`, `/privacy` yang belum ada (404).

## Tujuan

Ubah 3 link footer agar membuka **modal pop-up** (bukan navigasi ke halaman baru).

---

## Tahap 1: Update Footer Links

Di `src/index.ts`, fungsi `getFooterHtml()` — ubah href dari URL ke JavaScript:

```typescript
// Sebelum
<a href="/help">Bantuan</a>
<a href="/terms">Ketentuan</a>
<a href="/privacy">Privasi</a>

// Sesudah
<a href="javascript:void(0)" onclick="showHelpModal()">Bantuan</a>
<a href="javascript:void(0)" onclick="showTermsModal()">Ketentuan</a>
<a href="javascript:void(0)" onclick="showPrivacyModal()">Privasi</a>
```

---

## Tahap 2: Tambah 3 Modal HTML

Tambahkan 3 modal di **setiap halaman**. Cara paling efisien: masukkan ke `getCommonScripts()` atau buat fungsi baru `getModalsHtml()` yang dipanggil di setiap `htmlResponse()`.

### Modal Bantuan (`#help-modal`)

Konten:
- **Cara Menggunakan POS**: Langkah-langkah buka pesanan, tambah menu, proses pembayaran
- **FAQ**: Pertanyaan umum (cara reset password, cara tambah meja, dll)
- **Kontak Support**: Email/telepon support

### Modal Ketentuan (`#terms-modal`)

Konten:
- Syarat penggunaan aplikasi
- Kebijakan akun dan akses
- Batasan tanggung jawab

### Modal Privasi (`#privacy-modal`)

Konten:
- Data yang dikumpulkan (nama, email, riwayat transaksi)
- Cara data digunakan
- Kebijakan penyimpanan data
- Hak pengguna

### Pattern Modal (ikuti yang sudah ada di `/admin`)

```html
<div class="modal" id="help-modal">
  <div class="modal-backdrop" onclick="closeHelpModal()"></div>
  <div class="modal-content" style="max-width: 600px;">
    <div class="modal-header">
      <h3>Bantuan</h3>
      <button class="modal-close" onclick="closeHelpModal()">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Konten di sini -->
    </div>
    <div class="modal-footer">
      <button onclick="closeHelpModal()" class="btn btn-secondary">Tutup</button>
    </div>
  </div>
</div>
```

---

## Tahap 3: Tambah JavaScript Functions

Di `getCommonScripts()` atau di dalam `<script>` yang sama, tambahkan:

```javascript
function showHelpModal() {
  document.getElementById('help-modal').classList.add('show');
}
function closeHelpModal() {
  document.getElementById('help-modal').classList.remove('show');
}

function showTermsModal() {
  document.getElementById('terms-modal').classList.add('show');
}
function closeTermsModal() {
  document.getElementById('terms-modal').classList.remove('show');
}

function showPrivacyModal() {
  document.getElementById('privacy-modal').classList.add('show');
}
function closePrivacyModal() {
  document.getElementById('privacy-modal').classList.remove('show');
}
```

---

## Tahap 4: Tambah CSS untuk Modal

Pastikan class `.modal`, `.modal-backdrop`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-close` sudah ada di CSS. Cek `src/public/styles/global.css` — jika belum ada, tambahkan.

Pattern yang sudah ada di halaman `/admin` bisa dijadikan referensi.

---

## Catatan Penting

- **JANGAN buat route baru** (`/help`, `/terms`, `/privacy`) — ini harus modal, bukan halaman
- **Ikuti pattern** modal yang sudah ada di halaman `/admin` (class, style, behavior)
- **Modal harus bisa ditutup** dengan klik backdrop, klik tombol X, atau klik tombol Tutup
- **Konten modal** bisa hardcoded dalam HTML (tidak perlu API)
- **JANGAN hapus atau ubah** fungsionalitas yang sudah ada
