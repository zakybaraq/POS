# Sub-Issue 1.6: Employee/Shift Management — Manajemen Karyawan dan Shift

## Parent Issue

[#35 — Roadmap: Transform POS ke Production-Ready Business System](https://github.com/zakybaraq/POS/issues/35)

## Latar Belakang

Restoran yang beroperasi membutuhkan manajemen karyawan dan shift yang terstruktur. Tanpa modul ini:

- Tidak ada data karyawan terpusat (jabatan, gaji, telepon)
- Tidak ada tracking shift buka/tutup — kasir bisa bawa uang tanpa accountability
- Tidak ada cash count saat tutup shift → selisih uang tidak terdeteksi
- Tidak ada data attendance (clock in/clock out) → sulit hitung jam kerja
- Tidak ada laporan performa kasir → tidak tahu siapa yang paling produktif
- Tidak ada sistem komisi/tips → karyawan tidak termotivasi
- Owner tidak bisa audit siapa yang bekerja kapan

Modul ini terintegrasi dengan **Users** (tabel users sudah ada) dan **POS** (setiap transaksi tercatat user_id-nya).

---

## Scope

### Yang HARUS ada (MVP)

1. **Data Karyawan** — Extend tabel users dengan jabatan, telepon, gaji, tanggal masuk
2. **Shift Management** — Buka shift, tutup shift, cash count, selisih kas
3. **Attendance** — Clock in/clock out, riwayat kehadiran
4. **Performa Kasir** — Total transaksi, rata-rata per transaksi, total penjualan per kasir
5. **Daftar Karyawan** — CRUD karyawan, filter by jabatan, status aktif/nonaktif

### Yang NANTI bisa ditambahkan (Phase 2)

- Komisi per transaksi atau per penjualan
- Tips management
- Schedule/jadwal kerja (assign shift ke hari tertentu)
- Leave management (cuti, sakit, izin)
- Payroll integration
- Overtime tracking
- Performance rating
- Employee self-service portal

---

## Tahap 1: Database Schema

Tambahkan ke `src/db/schema.ts`:

```typescript
// employee_profiles — extend tabel users dengan info karyawan
export const employeeProfiles = mysqlTable('employee_profiles', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull().unique(), // FK ke users
  position: varchar('position', { length: 100 }).notNull(), // Kasir, Waiter, Chef, Manager, dll
  phone: varchar('phone', { length: 20 }).default(''),
  salary: int('salary').notNull().default(0),
  hireDate: datetime('hire_date').notNull().default(new Date()),
  emergencyContact: varchar('emergency_contact', { length: 255 }).default(''),
  notes: varchar('notes', { length: 500 }).default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  userIdIdx: index('idx_emp_user_id').on(table.userId),
  positionIdx: index('idx_emp_position').on(table.position),
}));

// shifts — sesi kerja kasir
export const shifts = mysqlTable('shifts', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(), // kasir yang membuka shift
  openedAt: datetime('opened_at').notNull().default(new Date()),
  closedAt: datetime('closed_at'),
  startingCash: int('starting_cash').notNull().default(0), // modal awal kas
  expectedCash: int('expected_cash'), // seharusnya ada di kas
  actualCash: int('actual_cash'), // hasil hitung fisik
  cashDifference: int('cash_difference'), // selisih (bisa minus)
  notes: varchar('notes', { length: 500 }).default(''),
  status: mysqlEnum('status', ['open', 'closed']).notNull().default('open'),
  closedBy: int('closed_by'), // user yang menutup (bisa sama atau berbeda)
}, (table) => ({
  userIdIdx: index('idx_shifts_user_id').on(table.userId),
  statusIdx: index('idx_shifts_status').on(table.status),
  openedAtIdx: index('idx_shifts_opened_at').on(table.openedAt),
}));

// attendance — clock in/clock out
export const attendance = mysqlTable('attendance', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(),
  clockIn: datetime('clock_in').notNull().default(new Date()),
  clockOut: datetime('clock_out'),
  totalHours: decimal('total_hours', { precision: 5, scale: 2 }),
  notes: varchar('notes', { length: 255 }).default(''),
  status: mysqlEnum('status', ['present', 'late', 'absent', 'leave', 'sick']).notNull().default('present'),
}, (table) => ({
  userIdIdx: index('idx_attendance_user_id').on(table.userId),
  clockInIdx: index('idx_attendance_clock_in').on(table.clockIn),
}));
```

---

## Tahap 2: Repository Functions

Buat `src/repositories/employee.ts`:

```typescript
// Employee Profiles
export async function getAllEmployees()
export async function getEmployeeByUserId(userId: number)
export async function getEmployeeById(id: number)
export async function createEmployeeProfile(data: NewEmployeeProfile)
export async function updateEmployeeProfile(id: number, data: Partial<EmployeeProfile>)
export async function deactivateEmployee(id: number)
export async function getEmployeesByPosition(position: string)

// Shifts
export async function getOpenShift(userId: number) // Cek apakah kasir sudah buka shift
export async function openShift(userId: number, startingCash: number)
export async function closeShift(shiftId: number, actualCash: number, closedBy: number, notes: string)
export async function getShiftById(id: number)
export async function getShiftsByDateRange(startDate: string, endDate: string)
export async function getShiftsByUser(userId: number)
export async function getAllOpenShifts() // Shift yang masih terbuka

// Attendance
export async function clockIn(userId: number, notes?: string)
export async function clockOut(userId: number, notes?: string)
export async function getTodayAttendance(userId: number)
export async function getAttendanceByDateRange(startDate: string, endDate: string)
export async function getAttendanceByUser(userId: number, startDate: string, endDate: string)

// Performance
export async function getCashierPerformance(startDate: string, endDate: string)
export async function getCashierPerformanceByUser(userId: number, startDate: string, endDate: string)
```

---

## Tahap 3: API Endpoints

Buat `src/routes/employees.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/employees` | super_admin, admin_restoran | Get semua karyawan |
| GET | `/api/employees/:id` | super_admin, admin_restoran | Get detail karyawan |
| POST | `/api/employees` | super_admin, admin_restoran | Buat profile karyawan |
| PUT | `/api/employees/:id` | super_admin, admin_restoran | Update profile karyawan |
| DELETE | `/api/employees/:id` | super_admin, admin_restoran | Nonaktifkan karyawan |
| GET | `/api/employees/performance` | super_admin, admin_restoran | Get performa kasir (date range) |

Buat `src/routes/shifts.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| GET | `/api/shifts/open` | super_admin, admin_restoran, kasir | Get shift terbuka user |
| GET | `/api/shifts/all-open` | super_admin, admin_restoran | Get semua shift terbuka |
| POST | `/api/shifts/open` | kasir, admin_restoran, super_admin | Buka shift baru |
| POST | `/api/shifts/:id/close` | kasir, admin_restoran, super_admin | Tutup shift |
| GET | `/api/shifts/:id` | super_admin, admin_restoran | Get detail shift |
| GET | `/api/shifts` | super_admin, admin_restoran | Get semua shift (date range) |

Buat `src/routes/attendance.ts`:

| Method | Path | Auth | Fungsi |
|--------|------|------|--------|
| POST | `/api/attendance/clock-in` | All authenticated | Clock in |
| POST | `/api/attendance/clock-out` | All authenticated | Clock out |
| GET | `/api/attendance/today` | All authenticated | Get attendance hari ini |
| GET | `/api/attendance` | super_admin, admin_restoran | Get attendance (date range) |

---

## Tahap 4: UI — Halaman Employees

Buat `src/pages/employees.ts`:

### Daftar Karyawan
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Karyawan                                              [➕ Tambah Karyawan]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Cari karyawan...                              [Filter: Semua Jabatan ▼]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Nama         │ Jabatan  │ Telepon      │ Gaji        │ Masuk      │ Aksi        │
│──────────────┼──────────┼──────────────┼─────────────┼────────────┼─────────────│
│ Zaki         │ Kasir    │ 0812-xxxx    │ Rp 5.000.000│ 01/01/2026 │ [Edit]      │
│ Budi         │ Waiter   │ 0813-xxxx    │ Rp 4.500.000│ 15/01/2026 │ [Edit]      │
│ Siti         │ Chef     │ 0857-xxxx    │ Rp 7.000.000│ 01/02/2026 │ [Edit]      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Performa Kasir
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Performa Kasir                                    [📅 01/04/2026 - 05/04/2026]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Kasir        │ Transaksi │ Rata-rata/Order │ Total Penjualan │ % Selesai        │
│──────────────┼───────────┼─────────────────┼─────────────────┼──────────────────│
│ Zaki         │ 150       │ Rp 85.000       │ Rp 12.750.000   │ 98%              │
│ Budi         │ 120       │ Rp 72.000       │ Rp 8.640.000    │ 95%              │
│ Siti         │ 90        │ Rp 95.000       │ Rp 8.550.000    │ 97%              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tahap 5: UI — Halaman Shifts

Buat `src/pages/shifts.ts`:

### Shift Aktif Saya
```
┌─────────────────────────────────────────────────────────────────┐
│ Shift Saya                                                      │
├─────────────────────────────────────────────────────────────────┤
│ Status: 🟢 SHIFT TERBUKA                                        │
│ Dibuka: 05/04/2026 08:00                                        │
│ Modal Awal: Rp 500.000                                          │
│                                                                 │
│ Transaksi Hari Ini: 25                                          │
│ Total Penjualan: Rp 2.150.000                                   │
│                                                                 │
│              [Tutup Shift]                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Modal Buka Shift
```
┌─────────────────────────────────────────────────────────┐
│ Buka Shift Baru                                         │
├─────────────────────────────────────────────────────────┤
│ Modal Awal (Rp)    [  500000  ] *                       │
│ Catatan            [  Shift pagi  ]                     │
│                                                         │
│           [Batal]          [Buka Shift]                 │
└─────────────────────────────────────────────────────────┘
```

### Modal Tutup Shift
```
┌─────────────────────────────────────────────────────────┐
│ Tutup Shift                                             │
├─────────────────────────────────────────────────────────┤
│ Shift dibuka: 05/04/2026 08:00                          │
│ Modal Awal:      Rp 500.000                             │
│ Total Penjualan: Rp 2.150.000                           │
│ Seharusnya Ada:  Rp 2.650.000                           │
│                                                         │
│ Hitung Fisik (Rp)  [  2640000  ] *                      │
│                                                         │
│ Selisih: 🔴 -Rp 10.000 (Kurang)                         │
│ Catatan: [  Ada kembalian yang kurang hitung  ]         │
│                                                         │
│           [Batal]          [Konfirmasi Tutup Shift]    │
└─────────────────────────────────────────────────────────┘
```

### Daftar Semua Shift
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Riwayat Shift                                     [📅 01/04/2026 - 05/04/2026]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Kasir     │ Buka         │ Tutup        │ Modal      │ Seharusnya │ Fisik      │ Selisih    │
│───────────┼──────────────┼──────────────┼────────────┼────────────┼────────────┼────────────│
│ Zaki      │ 05/04 08:00  │ 05/04 16:00  │ Rp 500.000 │ Rp 2.650.000│ Rp 2.640.000│ -Rp 10.000│
│ Budi      │ 05/04 16:00  │ -            │ Rp 500.000 │ -          │ -          │ -          │
│ Zaki      │ 04/04 08:00  │ 04/04 16:00  │ Rp 500.000 │ Rp 3.100.000│ Rp 3.100.000│ Rp 0      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tahap 6: UI — Halaman Attendance

Buat `src/pages/attendance.ts` atau gabung ke halaman employees sebagai tab:

### Clock In/Out
```
┌─────────────────────────────────────────────────────────┐
│ Kehadiran Hari Ini                                      │
├─────────────────────────────────────────────────────────┤
│ Status: 🟢 SUDAH CLOCK IN                               │
│ Clock In: 08:00:15                                      │
│ Jam Kerja: 4 jam 30 menit                               │
│                                                         │
│              [Clock Out]                                │
└─────────────────────────────────────────────────────────┘
```

### Riwayat Kehadiran (Admin View)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Riwayat Kehadiran                                 [📅 01/04/2026 - 05/04/2026]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Karyawan  │ Tanggal   │ Clock In  │ Clock Out │ Total Jam │ Status              │
│───────────┼───────────┼───────────┼───────────┼───────────┼─────────────────────│
│ Zaki      │ 05/04/2026│ 08:00:15  │ -         │ -         │ 🟢 Present          │
│ Budi      │ 05/04/2026│ 07:55:00  │ 16:05:00  │ 8.17      │ 🟢 Present          │
│ Siti      │ 05/04/2026│ 08:15:00  │ 16:00:00  │ 7.75      │ 🟡 Late             │
│ Zaki      │ 04/04/2026│ 08:00:00  │ 16:00:00  │ 8.00      │ 🟢 Present          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tahap 7: Integrasi dengan Modul Lain

### POS Module
- Saat kasir buka POS, cek apakah ada shift terbuka → jika tidak, redirect ke buka shift
- Setiap transaksi POS mencatat `userId` kasir yang sedang aktif
- Saat tutup shift, hitung `expectedCash` dari semua transaksi shift tersebut

### Dashboard
- Tampilkan ringkasan: shift aktif saat ini, karyawan on-duty
- Alert: shift yang sudah terbuka > 12 jam belum ditutup

### Admin/User Management
- Saat buat user baru dengan role kasir/waitress/chef, otomatis buat employee profile
- Jabatan di employee profile sinkron dengan role di users table

### Reporting (Phase 2)
- Laporan kehadiran bulanan
- Laporan performa kasir per periode
- Laporan selisih kas per shift

---

## Tahap 8: Testing

### Skenario Test

1. **CRUD Karyawan** — Tambah, edit, nonaktifkan karyawan berhasil
2. **Buka Shift** — Kasir buka shift dengan modal awal → shift status 'open'
3. **Cek Shift Terbuka** — Kasir yang sudah buka shift tidak bisa buka shift kedua
4. **Tutup Shift** — Input hitung fisik → selisih dihitung otomatis → shift status 'closed'
5. **Clock In** — Karyawan clock in → attendance tercatat dengan waktu
6. **Clock Out** — Karyawan clock out → total jam dihitung otomatis
7. **Double Clock In** — Karyawan yang sudah clock in tidak bisa clock in lagi
8. **Performa Kasir** — Data transaksi per kasir akurat sesuai date range
9. **Role Access** — Kasir hanya bisa lihat shift & attendance sendiri, admin bisa lihat semua
10. **Integrasi POS** — Transaksi POS hanya bisa dibuat jika ada shift terbuka

---

## File yang Perlu Diubah/Dibuat

| File | Perubahan |
|------|-----------|
| `src/db/schema.ts` | **Update** — tambah 3 tabel baru |
| `src/repositories/employee.ts` | **BARU** — semua fungsi employee, shift, attendance |
| `src/routes/employees.ts` | **BARU** — API endpoints karyawan |
| `src/routes/shifts.ts` | **BARU** — API endpoints shift |
| `src/routes/attendance.ts` | **BARU** — API endpoints attendance |
| `src/routes/index.ts` | **Update** — register routes |
| `src/pages/employees.ts` | **BARU** — halaman karyawan + performa |
| `src/pages/shifts.ts` | **BARU** — halaman shift management |
| `src/pages/attendance.ts` | **BARU** — halaman attendance |
| `src/index.ts` | **Update** — register pages |
| `src/templates/sidebar.ts` | **Update** — tambah menu Karyawan & Shift |
| `src/pages/pos.ts` | **Update** — cek shift terbuka sebelum transaksi |

---

## Catatan Penting

- **Satu kasir hanya bisa punya 1 shift terbuka** — harus tutup shift sebelumnya untuk buka baru
- **Selisih kas bisa negatif atau positif** — negatif berarti uang kurang, positif berarti kelebihan
- **Clock in/out otomatis** — bisa dipanggil dari API saat login/logout sebagai fallback
- **Performa kasir dihitung dari orders table** — gunakan `userId` dan `createdAt` untuk filter
- **Estimasi total**: 6-8 jam kerja
