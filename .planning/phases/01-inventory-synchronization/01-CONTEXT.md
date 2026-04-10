# Phase 01: Inventory Synchronization - Context

GATHERED: 2026-04-10
STATUS: Ready for planning

Domain boundary
- Tujuan fase ini adalah menetapkan keputusan implementasi terkait sinkronisasi riwayat stok dengan pesanan pada modul inventory. Keputusan harus menghindari oversell, menjaga konsistensi stok ketika pesanan dibuat/diubah/dibayar, serta menyediakan jejak pergerakan stok untuk audit.


Prior decisions (dari fase sebelumnya)
- Tidak ada CONTEXT.md sebelumnya untuk fase ini. Referensi kebijakan prioritas akan diambil dari ROADMAP.md, REQUIREMENTS.md, PROJECT.md jika ada di masa mendatang.


Codebase context (insights yang relevan untuk decisions)
- Lokasi utama terkait stok dan pesanan:
  - src/repositories/inventory.ts: logika manajemen stok, pergerakan stok, dan penyesuaian stok.
  - src/pages/inventory.ts: tampilan riwayat stok dan aksi terkait stok di UI.
  - src/routes/inventory.ts: surface API untuk bahan, resep, dan pergerakan stok.
  - src/repositories/order-item.ts: (referensi eksternal) untuk detail pesanan per item yang berpotensi mempengaruhi stok.
- Tipe pergerakan stok yang ada: in, out, adjustment, waste (tidak ada tipe reservasi saat ini).

<canonical_refs>
## Canonical References
- src/repositories/inventory.ts — Logika stok dan pergerakan stok (decrement, adjust, getMovements)
- src/pages/inventory.ts — Halaman inventory, riwayat stok, dan UI terkait stok
- src/routes/inventory.ts — API untuk bahan, resep, stok-movement
- src/repositories/order-item.ts — Fungsi terkait item pesanan yang digunakan untuk menghitung dampak stok
- ROADMAP.md (referensi domain fase, jika tersedia)
- REQUIREMENTS.md / PROJECT.md (referensi prinsip dan constraint, jika tersedia)
</canonical_refs>

<decisions>
## Implementation Decisions

- D-01: Kapan stok didecrement terkait pesanan
 - Keputusan: Dekrement stok dilakukan pada konfirmasi pesanan (status "confirmed"/paid), bukan pada saat pembuatan.
 - Rationale: Menghindari over-commitment saat pesanan masih dalam proses dan memastikan ketersediaan stok sebelum finalisasi pelanggan membayar.
 - Acceptance criteria:
   - Ada transisi status pesanan yang memicu pemutusan stok hanya jika pesanan mencapai konfirmasi/pembayaran.
   - Penerapan guard agar tidak terjadi pengurangan stok ganda untuk pesanan yang sama.

- D-02: Penanganan pembatalan/pengembalian pesanan
 - Keputusan: Jika pesanan dibatalkan sebelum konfirmasi, tidak ada perubahan stok. Jika pesanan telah didecrement, lakukan pemulihan stok melalui pergerakan balik (reversion) dengan referensi pesanan.
 - Rationale: Memastikan akuntabilitas stok dan integritas data saat pesanan berubah status.
 - Acceptance criteria:
   - Pembatalan pesanan memicu penyesuaian stok balik sesuai jumlah pesanan yang terkait.
   - Perubahan status pesanan terdokumentasi dan dapat diaudit.

- D-03: Mengaitkan pergerakan stok dengan pesanan untuk audit
 - Keputusan: Setiap pergerakan stok terkait pesanan wajib memiliki referenceId berupa orderId.
 - Rationale: Memudahkan pelacakan asal-usul pergerakan stok dan audit lintas pesanan.
 - Acceptance criteria:
   - Semua pergerakan stok (in, out, adjustment, waste, dan reversal) memiliki referenceId yang mengacu ke pesanan terkait (jika ada).

- D-04: Keterbatasan konkurensi dan integritas transaksional
 - Keputusan: Pembaruan stok dan pergerakan stok harus dibungkus dalam transaksi DB yang konsisten; gunakan locking baris saat mengubah stok langsung jika diperlukan.
 - Rationale: Mencegah race condition saat beberapa pesanan memerbarui stok yang sama secara bersamaan.
 - Acceptance criteria:
   - Satu operasi stok menggunakan transaksi atomik; tidak ada partial commit saat ada kegagalan.

- D-05: Reservasi stok vs pergerakan
 - Keputusan: Perlu dipertimbangkan mekanisme reservasi stok per pesanan.
 - Rationale: Menghindari oversell ketika pesanan tidak segera dipakai/diproses. Implementasi dapat dilakukan dengan menambahkan tabel reservasi stok atau dengan tipe pergerakan baru.
 - Acceptance criteria:
   - Opsional: tambahkan desain reservasi (tabel stock_reservations) atau tipe "reservation" pada stockMovements. Ini dapat diadopsi secara bertahap.

- D-06: Pengujian dan observabilitas
 - Keputusan: Tambahkan test-unit untuk logika penyesuaian stok dan test integrasi untuk simulasi concurrency; tambahkan logging terstruktur untuk perubahan stok dan transisi status pesanan.
 - Rationale: Menjamin kehandalan dan mempermudah debugging saat migrasi/inkrementasi fitur stok.

## Folded Todos / Deferred
- (Belum ada todos yang difold dalam konteks ini)
- Jika ada, tempatkan di bagian Deferred ideas.
</decisions>

<deferred>
## Deferred Ideas
- Reservasi stok dapat jadi fase terpisah jika diperlukan — contoh: tambahkan module reservasi/stock
- Infrastruktur untuk analitik stok (event sourcing untuk pergerakan stok)
</deferred>

<status>
Domain Boundary and Decisions Locked
The decisions above lock the approach for inventory-pesanan synchronization. Jika di masa depan dibutuhkan perubahan, perubahan tersebut bisa dilakukan melalui fase perencanaan berikutnya dengan pembaruan CONTEXT.md ini.
</status>

<how_to_write_context>
Saat ini, area abu-abu telah didiskusikan semua. File CONTEXT.md ini siap untuk dibaca para peneliti dan perencana. Next step: lanjutkan ke fase analisis mendalam pada area-area yang dipilih, lalu buat CONTEXT.md final untuk fase ini.
</how_to_write_context>

---
*
Phase 01-inventory-synchronization - Context
Date: 2026-04-10
</patch-placeholder>
