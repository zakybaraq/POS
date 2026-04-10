# Roadmap - POS Application

**Generated:** 2026-04-10

## Phase 1: Improve UI Halaman Kategori

**Status:** Planned

### Description
Samakan UI halaman kategori dengan pattern halaman pesanan/menu.

### Requirements
- UI match dengan halaman Pesanan/Menu
- Card structure, toolbar, table, modal pattern
- Search functionality works

### Tasks

| # | Task | Dependencies |
|---|------|--------------|
| 1.1 | Update HTML structure di `src/pages/categories.ts` | - |
| 1.2 | Update modal structure | 1.1 |
| 1.3 | Update JavaScript functions (filter, render) | 1.1 |
| 1.4 | Verify visual match dengan halaman lain | 1.3 |
| 1.5 | Test functionality (search, CRUD) | 1.4 |

### Success Criteria
- [ ] Halaman kategori terlihat sama dengan halaman pesanan/menu
- [ ] Card, toolbar, table, modal patterns applied
- [ ] Search dan filter berfungsi
- [ ] Tidak ada regression di fitur existing

---

## Phase 2: Fix Orders Page Empty Data

**Status:** Planned

### Description
Halaman `/orders` tidak menampilkan data - kosong padahal seharusnya ada pesanan. Root cause: timezone bug di `todayStart()` function.

### Requirements
- Halaman /orders menampilkan pesanan hari ini
- Query getOrdersTodayWithTables() mengembalikan data yang benar
- Tidak ada pesanan yang terlewat karena timezone bug

### Tasks

| # | Task | Dependencies |
|---|------|--------------|
| 2.1 | Fix todayStart() timezone bug | - |
| 2.2 | Verify fix dengan LSP | 2.1 |

### Success Criteria
- [ ] Orders page menampilkan pesanan hari ini dengan benar
- [ ] Timezone bug di todayStart() sudah diperbaiki
- [ ] Build passes tanpa errors

---

**Plans:** 2 plan(s)

- [ ] 01-01-PLAN.md — Match UI dengan pattern pesanan/menu
- [ ] 02-01-PLAN.md — Fix timezone bug di todayStart()