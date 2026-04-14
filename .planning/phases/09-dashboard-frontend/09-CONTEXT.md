# Phase 9 Context - Dashboard Frontend

**Status:** Discussion Started | **Phase:** 9 of 10 | **Effort:** 18 hours  
**Prerequisites:** Phase 8 (Dashboard Backend) Complete ✅

---

## Executive Summary

Phase 9 enhances the existing dashboard with interactive features, charts, export, and mobile improvements. Phase 8 already built the backend API and WebSocket streaming - this phase focuses on frontend enhancements.

---

## Current State

### What's Already Done (Phase 8)
- Dashboard page at `/` (not `/dashboard`)
- Basic stats cards (Sales, Orders, Tables, Menu)
- Real-time polling (10 second interval)
- WebSocket client integration
- Kitchen queue display (via WebSocket)
- Recent orders list
- Top selling items list
- Table status bar

### What's Missing (Phase 9)
1. **Charts** - Hourly sales trend chart, top items bar chart
2. **Date Filters** - Today/Yesterday/Custom date range
3. **Export** - CSV/PDF export functionality
4. **Mobile Responsive** - Grid layout for mobile screens
5. **Interactive Widgets** - Click to drill down

---

## Decisions Made

### 1. Route Decision
**Decision:** Keep dashboard at root `/` path (not `/dashboard`)

**Rationale:** Already running at root, changing breaks existing links. Admin users see dashboard immediately on login.

---

### 2. Chart Library Decision
**Decision:** Inline SVG charts (no external library for MVP)

**Rationale:**
- Reduce external dependencies
- SVG works with existing styling
- Chart.js adds ~200KB bundle
- Can add in v2.1 if needed

---

### 3. Export Format Decision
**Decision:** CSV only for Phase 9

**Rationale:**
- CSV is simple to generate server-side
- PDF requires external library (jsPDF, puppeteer)
- Users can open CSV in Excel/Sheet
- PDF deferred to v2.1

---

### 4. Responsive Design Decision
**Decision:** CSS Grid with media queries

**Rationale:**
- CSS Grid already used in existing pages
- Simpler than switching to flexbox
- Mobile-first approach not needed - just responsive at 768px

---

## Technical Implementation

### Files to Modify

1. `src/pages/dashboard.ts` - Add charts, filters, export
2. `src/routes/dashboard.ts` - Add date range endpoints
3. `src/services/reports.ts` - Add CSV export

### New Features Implementation

#### Charts (Inline SVG approach)
```typescript
function renderHourlySalesChart(data) { ... }
function renderTopItemsBarChart(data) { ... }
```

#### Date Filter
- Add dropdown in header
- Options: Today, Yesterday, Last 7 Days, Custom
- Updates both API calls with date range

#### Export
- Add "Export CSV" button on reports link
- CSV includes: date, sales, orders, top items

#### Mobile Improvements
- @media (max-width: 768px) query
- Single column layout for stats-grid on mobile

---

## Event Structure

**No new WebSocket events needed** - Phase 8 events sufficient:
- `dashboard:metrics-batch` (every 5s)
- `kitchen:queue-update` (immediate)
- `orders:new` (immediate)

---

## Success Criteria

- [ ] Dashboard loads < 3 seconds
- [ ] Charts render with hourly data
- [ ] Date filter updates all widgets
- [ ] Export generates valid CSV
- [ ] Mobile layout works at 768px
- [ ] All existing functionality preserved
- [ ] No LSP errors

---

## Out of Scope (v2.1)

- PDF export
- Interactive drill-down modals
- Chart.js or D3.js integration
- Fullscreen mode
- Historical comparison view

---

## Next Steps

1. Add charts to dashboard (hourly + top items)
2. Add date filter dropdown
3. Add CSV export endpoint
4. Add mobile responsive styles
5. Test all changes

---

**Context Discussion:** Complete - ready for planning