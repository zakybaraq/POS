# Phase 7 Context - Inventory Alert System

**Status:** Discussion Complete ✅ | **Phase:** 7 of 10 | **Effort:** 10 hours
**Prerequisites:** Phase 6 (WebSocket) Complete ✅
**Discussion Date:** 2026-04-13
**Next Step:** Ready for Planning & Execution

---

## Executive Summary

Phase 7 implements real-time inventory monitoring and alerting system to prevent stockouts. The system monitors stock levels against configurable thresholds and emits alerts when inventory falls below safe levels.

---

## Decisions Made

### 1. Low Stock Threshold Configuration
**Decision:** Use existing `minStock` field (already in schema) as threshold

**Discovery:** Database already has `minStock` field (line 150 in schema.ts), no migration needed for threshold field.

**Default Threshold Strategy:**
- ✅ **Use existing `minStock` field** - Already exists in database
- ✅ **Per-ingredient configurable** - Each ingredient can have custom threshold
- ✅ **Minimum threshold: 1 unit** - Prevent zero/negative values
- ✅ **Maximum threshold: 10000 units** - Reasonable upper limit for restaurants

**Rationale:**
- Avoid duplicate fields (minStock already serves threshold purpose)
- Existing `getLowStockIngredients()` query already uses this field
- Simpler migration path - no schema changes needed
- Per-ingredient flexibility allows customization for fast-moving vs slow-moving items

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
**Status:** No schema changes needed ✅

Field `minStock` already exists in `ingredients` table (line 150 in schema.ts) and is used by existing `getLowStockIngredients()` function.

**Validation:**
- Minimum: 1 unit
- Maximum: 10000 units
- Default: 0 (existing behavior)

### New Files
1. `src/services/inventory-monitor.ts` - Stock monitoring logic
2. `src/websocket/events/inventory-events.ts` - WebSocket event emitters

### Modified Files
1. `src/repositories/inventory.ts` - Add threshold check + update method
2. `src/routes/inventory.ts` - Add threshold update endpoint
3. `src/pages/inventory.ts` - Add threshold UI
4. `src/pages/dashboard.ts` - Add low stock widget
5. `src/db/schema.ts` - Add index on minStock (optional optimization)

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

1. ✅ Verify `minStock` field exists (DONE - already exists)
2. Create inventory monitoring service
3. Integrate threshold checks with stock operations
4. Add threshold update endpoint
5. Add threshold UI in inventory page
6. Create dashboard low stock widget
7. Add WebSocket inventory events
8. Test alert flow end-to-end

## Implementation Notes

### Schema Compatibility
- Using existing `minStock` field (already in database since early development)
- No breaking changes to existing data
- Existing `getLowStockIngredients()` query works immediately

### WebSocket Integration
- Phase 6 WebSocket infrastructure is ready
- Socket.io already configured with auth and rooms
- Can emit to 'admin' and 'kitchen' rooms immediately

### Alert Logic
- Check after every stock decrement (decrementStockForOrderTx)
- Check after manual stock adjustments (adjustStock)
- In-memory Set for tracking alerted ingredients
- 5-minute cooldown using timestamp comparison

---

**Context Locked:** 2026-04-13
**Ready for Planning:** Yes

---

## Discussion Summary

**Phase 7 telah didiskusikan ulang dan keputusan dikonfirmasi:**

### Keputusan Utama:
1. ✅ **Gunakan field `minStock` yang sudah ada** - Tidak perlu field baru
2. ✅ **5 menit cooldown dengan in-memory tracking** - Cukup untuk MVP
3. ✅ **WebSocket only** - Email/SMS deferred ke v2.1
4. ✅ **Simple acknowledgment** - In-memory Set, reset saat restart
5. ✅ **No alert history database** - In-memory only untuk MVP

### Temuan Penting dari Codebase:
- Field `minStock` sudah ada sejak awal development
- WebSocket infrastructure (Phase 6) sudah siap pakai
- Repository pattern sudah established
- Stock operations sudah transactional

### Risks Identified:
- Server restart akan clear acknowledged alerts (acceptable untuk MVP)
- No persistent alert history (deferred ke v2.1)
- Only one severity level (future: WARNING vs CRITICAL)

**Status:** Siap untuk planning dan execution
