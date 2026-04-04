# Sub-Issue 1.3: Reporting & Analytics

## Parent Issue
[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Owner/restaurateur butuh data untuk mengambil keputusan bisnis. Tanpa reporting:
- Tidak tahu penjualan harian/mingguan/bulanan
- Tidak tahu menu apa yang paling menguntungkan
- Tidak tahu performa kasir mana yang terbaik
- Tidak tahu tren penjualan (naik/turun)
- Tidak ada data untuk forecast stok bahan baku
- Tidak bisa hitung profit/loss

Modul ini adalah **modul ketiga terpenting** setelah Inventory dan Customer Management.

---

## Scope

### Yang HARUS ada (MVP)
1. **Laporan Penjualan** — Harian, mingguan, bulanan, custom date range
2. **Laporan Menu Terlaris** — Best seller by quantity dan by revenue
3. **Laporan Kasir** — Performa per kasir (total transaksi, rata-rata, total penjualan)
4. **Laporan Okupansi** — Tingkat hunian meja per hari/minggu
5. **Grafik Penjualan** — Bar chart harian, line chart tren bulanan
6. **Export Laporan** — Download ke CSV/PDF

### Yang NANTI bisa ditambahkan (Phase 2)
- Laporan profit/loss (pendapatan - pengeluaran - COGS)
- Laporan inventory usage vs actual
- Customer analytics (pelanggan paling sering datang, rata-rata belanja)
- Hourly traffic analysis (jam paling ramai)
- Comparative reports (bulan ini vs bulan lalu)
- Dashboard executive summary

---

## Tahap 1: Repository Functions

Buat `src/repositories/report.ts`:

```typescript
// Sales Reports
export async function getDailySales(date: string) // Penjualan per hari
export async function getWeeklySales(startDate: string, endDate: string) // Penjualan mingguan
export async function getMonthlySales(year: number, month: number) // Penjualan bulanan
export async function getSalesByDateRange(startDate: string, endDate: string) // Custom range

// Menu Reports
export async function getTopMenusByQuantity(startDate: string, endDate: string, limit?: number)
export async function getTopMenusByRevenue(startDate: string, endDate: string, limit?: number)
export async function getMenuCategoryBreakdown(startDate: string, endDate: string)

// Cashier Reports
export async function getCashierPerformance(startDate: string, endDate: string)

// Table Reports
export async function getTableOccupancy(startDate: string, endDate: string)

// Summary
export async function getSalesSummary(startDate: string, endDate: string)
// Returns: totalSales, totalOrders, avgOrderValue, totalTax, completedOrders, cancelledOrders
```

---

## Tahap 2: API Endpoints

Buat `src/routes/reports.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/reports/sales/daily` | super_admin, admin_restoran | Penjualan harian |
| GET | `/api/reports/sales/weekly` | super_admin, admin_restoran | Penjualan mingguan |
| GET | `/api/reports/sales/monthly` | super_admin, admin_restoran | Penjualan bulanan |
| GET | `/api/reports/sales/custom` | super_admin, admin_restoran | Custom date range |
| GET | `/api/reports/menus/top-quantity` | super_admin, admin_restoran | Menu terlaris (qty) |
| GET | `/api/reports/menus/top-revenue` | super_admin, admin_restoran | Menu terlaris (revenue) |
| GET | `/api/reports/menus/category` | super_admin, admin_restoran | Breakdown per kategori |
| GET | `/api/reports/cashiers` | super_admin, admin_restoran | Performa kasir |
| GET | `/api/reports/tables/occupancy` | super_admin, admin_restoran | Okupansi meja |
| GET | `/api/reports/summary` | super_admin, admin_restoran | Ringkasan lengkap |

---

## Tahap 3: UI — Halaman Reports

Buat `src/pages/reports.ts` dengan 4 tab:

### Tab 1: Laporan Penjualan
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Periode: [Hari Ini ▼]  [📅 01/04/2026] - [📅 04/04/2026]  [Export CSV] │
├─────────────────────────────────────────────────────────────────────────┤
│ Total Penjualan: Rp 12.500.000    Total Pesanan: 156                    │
│ Rata-rata/Order: Rp 80.128        Pesanan Selesai: 148 (95%)            │
├─────────────────────────────────────────────────────────────────────────┤
│ 📊 Grafik Penjualan Harian                                              │
│ ███████████████████████████████████████████████████████████████████████ │
│  01/04    02/04    03/04    04/04                                      │
│  2.8jt    3.2jt    3.5jt    3.0jt                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ Tanggal    │ Pesanan │ Selesai │ Dibatalkan │ Total Penjualan           │
│ 04/04/2026 │    42   │   40    │      2     │ Rp 3.000.000             │
│ 03/04/2026 │    38   │   37    │      1     │ Rp 3.500.000             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 2: Menu Terlaris
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Periode: [Bulan Ini ▼]                              [Export CSV]        │
├─────────────────────────────────────────────────────────────────────────┤
│ # │ Menu          │ Kategori │ Qty Terjual │ Revenue    │ % dari Total  │
│ 1 │ Nasi Goreng   │ Makanan  │    245      │ Rp 3.675K  │    18.5%      │
│ 2 │ Es Teh Manis  │ Minuman  │    198      │ Rp   990K  │    14.9%      │
│ 3 │ Ayam Goreng   │ Makanan  │    156      │ Rp 2.808K  │    11.7%      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 3: Performa Kasir
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Periode: [Bulan Ini ▼]                              [Export CSV]        │
├─────────────────────────────────────────────────────────────────────────┤
│ Kasir        │ Transaksi │ Rata-rata/Order │ Total Penjualan │ % Selesai │
│ Muhammad Zaki│    89     │ Rp 85.000       │ Rp 7.565.000    │   97%     │
│ Kasir 1      │    67     │ Rp 72.000       │ Rp 4.824.000    │   94%     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab 4: Okupansi Meja
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Periode: [Minggu Ini ▼]                             [Export CSV]        │
├─────────────────────────────────────────────────────────────────────────┤
│ Rata-rata Okupansi: 42%    Peak Hour: 12:00-13:00 (85%)                │
├─────────────────────────────────────────────────────────────────────────┤
│ Tanggal    │ Meja Terpakai │ Total Meja │ % Okupansi │ Peak Hour        │
│ 04/04/2026 │      5        │     12     │    42%     │ 12:00-13:00      │
│ 03/04/2026 │      7        │     12     │    58%     │ 19:00-20:00      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tahap 4: Grafik dengan Vanilla JS

Gunakan CSS bar chart (tanpa library eksternal):

```html
<div class="bar-chart">
  <div class="bar-chart-bars">
    <div class="bar" style="height: 60%;" data-value="2.8jt">
      <div class="bar-label">01/04</div>
    </div>
    <div class="bar" style="height: 75%;" data-value="3.2jt">
      <div class="bar-label">02/04</div>
    </div>
  </div>
  <div class="bar-chart-axis">
    <div class="axis-label">Rp 4jt</div>
    <div class="axis-label">Rp 2jt</div>
    <div class="axis-label">Rp 0</div>
  </div>
</div>
```

---

## Tahap 5: Export CSV

Fungsi export di setiap tab:

```javascript
function exportSalesReport() {
  const rows = [['Tanggal', 'Pesanan', 'Selesai', 'Dibatalkan', 'Total Penjualan']];
  // ... collect data from table ...
  downloadCSV(rows, 'sales-report-' + dateRange + '.csv');
}
```

---

## Tahap 6: Integrasi dengan Dashboard

Tambahkan link "Lihat Laporan Lengkap" di dashboard stats cards:

```html
<div class="stats-card">
  <div class="stats-label">Total Penjualan</div>
  <div class="stats-value">Rp 12.500.000</div>
  <a href="/reports" class="stats-link">Lihat Laporan →</a>
</div>
```

---

## Tahap 7: Testing

### Skenario Test
1. **Laporan harian** — Data penjualan hari ini akurat
2. **Laporan mingguan** — 7 hari terakhir terhitung benar
3. **Laporan bulanan** — Bulan berjalan terhitung benar
4. **Custom date range** — Pilih tanggal awal/akhir → data benar
5. **Menu terlaris** — Ranking by quantity dan revenue benar
6. **Performa kasir** — Total transaksi dan rata-rata benar
7. **Okupansi meja** — Persentase hunian akurat
8. **Export CSV** — File ter-download dengan data yang benar
9. **Grafik** — Bar chart menampilkan data yang benar
10. **Date range kosong** — Tidak ada data → tampil pesan "Tidak ada data"

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/repositories/report.ts` | **BARU** — semua fungsi report |
| `src/routes/reports.ts` | **BARU** — API endpoints |
| `src/routes/index.ts` | **Update** — register report routes |
| `src/pages/reports.ts` | **BARU** — halaman reports (4 tab) |
| `src/templates/sidebar.ts` | **Update** — tambah menu Reports |
| `src/pages/dashboard.ts` | **Update** — tambah link ke reports |

## Catatan Penting

- **Grafik pakai CSS murni** — tanpa library eksternal (Chart.js, dll)
- **Semua laporan bisa di-export** ke CSV
- **Default period** = hari ini, user bisa ganti
- **Tidak ada data** → tampil pesan "Tidak ada data untuk periode ini"
- **Estimasi total**: 8-10 jam kerja
