# Phase 14 Context - Auto-Reorder System

**Status:** New Implementation  
**Date:** 2026-04-14

---

## Prior Context

Phase 14 (Auto-Reorder System) starts after Phase 13 completes. Phase 13 added:
- Cost analytics API
- Price history tracking
- Variance alerts
- Monthly cost reports

---

## What's Already Built

### Existing Data Sources
- [x] `inventory` table - current stock, min_stock, safety_stock per ingredient
- [x] `suppliers` table - lead time tracking
- [x] `purchase_orders` table - PO workflow
- [x] `supplierPrices` table - current prices

### Existing Services
- [x] `src/services/cost-analytics.ts` - Cost tracking
- [x] `src/repositories/inventory.ts` - Stock management
- [x] `src/repositories/supplier.ts` - Supplier data
- [x] `src/repositories/purchase-order.ts` - PO creation

---

## What's NOT Yet Implemented (New for Phase 14)

### Gap 1: Reorder Calculation Engine
- No reorder point calculation per ingredient
- No EOQ (Economic Order Quantity) calculation
- No daily usage/usage rate tracking

### Gap 2: Auto-Reorder Service
- No service to check stock levels
- No auto-generate draft PO functionality
- No notification for low stock

### Gap 3: Dashboard Widget
- No reorder suggestions display
- No pending reorder list
- No "create PO from suggestion" action

---

## Implementation Decisions Needed

1. **Usage Tracking Strategy:**
   - Option A: Calculate from order history (last 30 days)
   - Option B: Manual entry per ingredient
   - Recommendation: Option A with override capability

2. **EOQ Parameters:**
   - Default ordering cost: $25 per order
   - Default holding cost: 20% of item value annually
   - Make configurable

3. **Auto-Trigger Threshold:**
   - Draft PO auto-generated when stock <= min_stock
   - Manual approval required before submission
   - Default: disabled, admin enables per ingredient

---

## Gray Areas to Decide

Q1: Should auto-PO generation be automatic or manual-approval only?
Q2: How to handle multiple suppliers per ingredient for EOQ?

---

## Next Steps

1. Add reorder calculation to inventory repository
2. Create auto-reorder service
3. Add reorder widget to dashboard
4. Add API endpoints for reorder management

---

## Requirements Reference

From REQUIREMENTS.md (REQ-004):
- Reorder Point = (Lead Time × Daily Usage) + Safety Stock
- EOQ = √(2 × Annual Demand × Ordering Cost / Holding Cost)
- Auto-generate draft PO when stock hits reorder point
- Manual override/approval before submission