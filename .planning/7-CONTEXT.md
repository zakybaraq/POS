# Phase 7 Context - Inventory Alert System

**Status:** Discussion Complete | **Phase:** 7 of 10 | **Effort:** 10 hours  
**Prerequisites:** Phase 6 (WebSocket) Complete ✅

---

## Executive Summary

Phase 7 implements real-time inventory monitoring and alerting system to prevent stockouts. The system monitors stock levels against configurable thresholds and emits alerts when inventory falls below safe levels.

---

## Decisions Made

### 1. Low Stock Threshold Configuration
**Decision:** Add `minStockThreshold` field to ingredients table

**Default Threshold Strategy:**
- ✅ **Default: 10 units** (or 20% of current stock, whichever is higher)
- ✅ **Per-ingredient configurable** - Each ingredient can have custom threshold
- ✅ **Minimum threshold: 1 unit** - Prevent zero/negative values
- ✅ **Maximum threshold: 1000 units** - Prevent unrealistic values

**Rationale:**
- 10 units is a reasonable default for most restaurant ingredients
- Per-ingredient flexibility allows customization for fast-moving vs slow-moving items
- Validation prevents data errors

---

### 2. Alert Trigger Strategy
**Decision:** Check threshold after stock decrement operations

**When to Check:**
- ✅ After `decrementStockForOrder()` - When order is completed
- ✅ After manual stock adjustment - Admin updates stock
- ✅ After stock receipt - When new stock arrives (to clear alerts)

**Alert Cooldown:**
- ✅ **5-minute cooldown** per ingredient - Prevent spam
- ✅ Alert only re-triggers if stock goes back above threshold then drops again
- ✅ Manual refresh can bypass cooldown

**Rationale:**
- Checking after decrement catches the critical moment
- Cooldown prevents notification spam during busy periods
- Manual adjustment allows immediate re-check

---

### 3. Alert Channels
**Decision:** WebSocket only for MVP (v2.0)

**Phase 7 (Current):**
- ✅ WebSocket events to `admin` and `kitchen` rooms
- ✅ Dashboard widget showing low stock list
- ✅ Visual indicator in inventory page

**Future Enhancement (v2.1):**
- ⏳ Email notifications for critical items
- ⏳ Push notifications for mobile app
- ⏳ SMS for critical alerts

**Rationale:**
- WebSocket sufficient for real-time dashboard
- Email/SMS adds complexity (SMTP server, rate limits)
- Can add in v2.1 if needed

---

### 4. Alert Acknowledgment
**Decision:** Simple acknowledgment system

**Features:**
- ✅ **Acknowledge button** - Dismiss alert for current low stock
- ✅ **Auto-clear** - When stock goes back above threshold
- ✅ **Alert history** - Track past alerts (last 30 days)
- ❌ **No escalation** - No multiple levels for MVP

**Database Schema Addition:**
```typescript
// alerts table (optional, can use in-memory first)
{
  id: number;
  ingredientId: number;
  alertType: 'low-stock';
  acknowledged: boolean;
  acknowledgedBy: number;
  acknowledgedAt: Date;
  createdAt: Date;
}
```

**Simpler Approach (MVP):**
- In-memory tracking of acknowledged alerts
- Reset on server restart (acceptable for MVP)

---

## Technical Implementation

### Database Changes
**File:** `src/db/schema.ts`

```typescript
export const ingredients = mysqlTable('ingredients', {
  // ... existing fields
  minStockThreshold: decimal('min_stock_threshold', { 
    precision: 10, 
    scale: 2 
  }).notNull().default('10'),
}, (table) => ({
  nameIdx: index('idx_ingredients_name').on(table.name),
  thresholdIdx: index('idx_ingredients_threshold').on(table.minStockThreshold),
}));
```

### New Files
1. `src/services/inventory-monitor.ts` - Stock monitoring logic
2. `src/websocket/events/inventory-events.ts` - WebSocket event emitters
3. Migration file for `min_stock_threshold` column

### Modified Files
1. `src/repositories/inventory.ts` - Add threshold check
2. `src/routes/inventory.ts` - Add threshold update endpoint
3. `src/pages/inventory.ts` - Add threshold UI
4. `src/pages/dashboard.ts` - Add low stock widget

---

## Event Structure

**Event Name:** `inventory:low-stock`

**Payload:**
```typescript
{
  namespace: 'inventory',
  event: 'low-stock',
  payload: {
    ingredientId: number,
    name: string,
    currentStock: number,
    threshold: number,
    shortfall: number, // threshold - currentStock
    unit: string,
  },
  timestamp: string,
}
```

---

## Success Criteria

- [ ] Thresholds configurable per ingredient
- [ ] Alerts trigger when stock below threshold
- [ ] No duplicate alerts within 5-minute window
- [ ] Acknowledgment clears alert
- [ ] Alerts display in dashboard and inventory page
- [ ] All 78 existing tests still passing

---

## Out of Scope (v2.1)

- Email notifications
- SMS alerts
- Predictive stock forecasting
- Automatic reorder suggestions
- Supplier integration

---

## Next Steps

1. Add `minStockThreshold` to schema
2. Create migration
3. Create inventory monitoring service
4. Add threshold update endpoint
5. Add threshold UI in inventory page
6. Create dashboard low stock widget
7. Test alert flow end-to-end

---

**Context Locked:** 2026-04-13  
**Ready for Planning:** Yes
