# POS Application v2.1 Roadmap

**Status:** Planning  
**Version:** 2.1.0  
**Theme:** Advanced Inventory Management  
**Date:** 2026-04-14  
**Previous:** v2.0 Complete ✅

---

## Executive Summary

Milestone v2.1 advances inventory management with supplier relationships, purchase order workflows, cost tracking, and automated reordering. This builds on the basic inventory tracking from v1.0.

---

## Phased Implementation Plan

### Phase 11: Supplier Management
**Priority:** HIGH | Effort: 3-4 days | Risk: Low | **Status:** ✅ Complete

**Why:** Establish supplier relationships to enable purchase orders and cost tracking.

**Plans:**
- [x] `11-01-PLAN.md` — Supplier Database & CRUD Operations

**Requirements:** REQ-001, REQ-002

#### 11.1 Supplier Database & CRUD
**What:** Create supplier management infrastructure

**How:**
1. Add `suppliers` table schema
2. Create supplier repository methods
3. Build API endpoints for CRUD
4. Add supplier UI page
5. Connect ingredients to preferred suppliers

**Files to create:**
- `src/db/schema.ts` - Add suppliers table
- `src/repositories/supplier.ts` - Supplier repository
- `src/routes/suppliers.ts` - Supplier API routes
- `src/pages/suppliers.ts` - Supplier management UI

**Files to modify:**
- `src/db/schema.ts` - Add supplier_id to ingredients
- `src/repositories/inventory.ts` - Link to preferred supplier
- `src/pages/admin.ts` - Add supplier link

**Success Criteria:**
- [x] Suppliers CRUD functional
- [x] Each ingredient has preferred supplier
- [x] Lead time tracked
- [x] Rating system working
- [x] Purchase order workflow complete through received
- [x] 15 new tests passing

**Estimate:** 8 hours
**Actual:** ~2 hours (pre-implemented)

---

### Phase 12: Purchase Order System
**Priority:** HIGH | Effort: 4-5 days | Risk: Medium | **Status:** ✅ Complete

**Why:** Formalize purchasing workflow from supplier to inventory.

**Plans:**
- [x] `12-01-PLAN.md` — PO Infrastructure & Notifications (Complete)
- [x] `12-02-PLAN.md` — PO Approval Workflow (Complete)

**Requirements:** REQ-002

#### 12.1 Purchase Order Schema & API
**What:** Core PO infrastructure and endpoints

**How:**
1. Add `purchase_orders` and `purchase_order_items` tables
2. Create PO repository methods
3. Build API endpoints (create, list, update, delete)
4. Add status transitions
5. Add search/filter endpoints

**Schema:**
- purchase_orders: id, supplier_id, status, total_amount, created_by, approved_by, created_at, updated_at
- purchase_order_items: id, po_id, ingredient_id, quantity, unit_cost, received_qty

**Files to create:**
- `src/repositories/purchase-order.ts` - PO repository
- `src/routes/purchase-orders.ts` - PO API routes

**Estimate:** 10 hours

---

#### 12.2 PO Workflow & Receiving
**What:** Complete PO workflow with receiving

**How:**
1. Implement status transitions (draft→submitted→approved→received)
2. Add approval endpoint
3. Create receiving flow (update inventory on receive)
4. Partial receiving support
5. Add PO history tracking

**Files to modify:**
- `src/repositories/purchase-order.ts` - Add status methods
- `src/repositories/inventory.ts` - Update stock on receive
- `src/pages/purchase-orders.ts` - Add workflow UI

**Success Criteria:**
- [ ] Full PO lifecycle
- [ ] Partial receiving
- [ ] Inventory auto-updates
- [ ] Approval workflow

**Estimate:** 12 hours

---

**Total Phase 12:** ~22 hours | Risk reduction: Medium | Feature: Purchase orders

---

### Phase 13: Cost Analytics
**Priority:** MEDIUM-HIGH | Effort: 3-4 days | Risk: Low | **Status:** ✅ Complete

**Why:** Visibility into costs and supplier pricing.

**Plans:**
- [x] `13-01-PLAN.md` — Cost Tracking & History (Complete)

**Requirements:** REQ-003

**Success Criteria:**
- [x] Price history per ingredient
- [x] Cost variance alerts
- [x] Supplier price comparison
- [x] Monthly reports

**Estimate:** 8 hours | **Actual:** ~4 hours

---

**Total Phase 13:** ~8 hours | Risk reduction: Low | Feature: Cost analytics

---

### Phase 14: Auto-Reorder System
**Priority:** MEDIUM | Effort: 2-3 days | Risk: Low | **Status:** ✅ Complete

**Why:** Reduce manual monitoring with automated suggestions.

**Plans:**
- [ ] `14-01-PLAN.md` — Reorder Suggestions & EOQ

**Requirements:** REQ-004

#### 14.1 Reorder Suggestions & EOQ
**What:** Automated reorder recommendations

**How:**
1. Calculate reorder points per ingredient
2. Implement EOQ formula
3. Create suggestion service
4. Auto-generate draft PO from suggestions
5. Add dashboard widget

**Formulas:**
- Reorder Point = (Lead Time Days × Avg Daily Usage) + Safety Stock
- EOQ = √((2 × Annual Demand × Order Cost) / Holding Cost %)

**Files to create:**
- `src/services/reorder.ts` - Reorder service
- `src/routes/reorder.ts` - Reorder API

**Files to modify:**
- `src/repositories/inventory.ts` - Usage calculations
- `src/repositories/supplier.ts` - Get supplier lead times

**Success Criteria:**
- [ ] Reorder suggestions display
- [ ] EOQ calculated
- [ ] Auto-generate PO draft
- [ ] Manual override works

**Estimate:** 6 hours

---

**Total Phase 14:** ~6 hours | Risk reduction: Low | Feature: Auto-reorder

---

## Quick Wins (0.5-1 hour each)

1. **Supplier export** - Export supplier list to CSV
2. **PO email notification** - Email on PO approval/receiving
3. **Low stock → auto PO** - Trigger PO from low stock threshold
4. **Cost alerts dashboard** - Show cost variance alerts

---

## Success Criteria

- [ ] 4 phases complete
- [ ] All 78 existing tests still passing
- [ ] No regression in existing features
- [ ] Supplier management working
- [ ] PO workflow complete
- [ ] Cost analytics accessible

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 11 | 1 day | Week 1 | Week 1 |
| Phase 12 | 2-3 days | Week 1 | Week 2 |
| Phase 13 | 1-2 days | Week 2 | Week 2 |
| Phase 14 | 1 day | Week 2 | Week 2 |
| **Total** | **~5 days** | | |

---

**Next:** Plan and execute Phase 15 - File Cleanup (v2.2 Refactoring)

---

## Milestone v2.2: Codebase Refactoring

**Status:** 📝 Planning
**Start Date:** 2026-04-14
**Theme:** Architecture improvement and code organization

---

### Phase 15: File Cleanup
**Priority:** HIGH | Effort: 0.5 day | Risk: Low | **Status:** 📝 Planned

**Why:** Remove temporary files and clutter before major restructuring.

**Plans:**
- [ ] `15-01-PLAN.md` — File Cleanup & Gitignore Update

**Requirements:** REQ-001

#### 15.1 File Cleanup
**What:** Delete temporary files and update .gitignore

**How:**
1. Delete 6 temporary .md files (login-*.md, PR_BODY.md, issue.md, LOYALTY_IMPLEMENTATION.md)
2. Archive CONTEXT.md to .planning/archive/
3. Update .gitignore with test-results/, playwright-report/, *.log
4. Verify clean git status

**Files to delete:**
- login-page-snapshot.md
- login-snapshot.md  
- login-after-submit.md
- PR_BODY.md
- issue.md
- LOYALTY_IMPLEMENTATION.md

**Files to archive:**
- CONTEXT.md → .planning/archive/CONTEXT-v1.0.md

**Files to modify:**
- .gitignore - Add test results and log patterns

**Success Criteria:**
- [ ] All temporary files deleted
- [ ] CONTEXT.md archived
- [ ] .gitignore updated
- [ ] Clean git status
- [ ] No functional impact
- [ ] All tests passing

**Estimate:** 2 hours

**Previous Milestone:** [v2.0 ROADMAP](./milestones/v2.0-ROADMAP.md)