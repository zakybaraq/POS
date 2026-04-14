# Phase 7 UAT - Inventory Alert System

**Status:** Ready for Testing | **Date:** 2026-04-13

---

## Test Scenarios

### Test 1: Threshold Configuration
**Steps:**
1. Go to Inventory page
2. Click "Batas" button on any ingredient
3. Enter threshold value (e.g., 10)
4. Save

**Expected:**
- Threshold saved successfully
- Ingredient displays new threshold

**Status:** ⏳ Not Tested

---

### Test 2: Low Stock Alert Trigger
**Steps:**
1. Set ingredient threshold to 10
2. Set current stock to 8 (below threshold)
3. Complete an order that uses this ingredient

**Expected:**
- WebSocket alert emitted to admin/kitchen
- Dashboard shows low stock warning
- Alert appears in real-time

**Status:** ⏳ Not Tested

---

### Test 3: Alert Acknowledgment
**Steps:**
1. Trigger low stock alert
2. Click "Acknowledge" button
3. Check if alert disappears

**Expected:**
- Alert acknowledged
- Alert no longer shows in dashboard
- 5-minute cooldown prevents immediate re-alert

**Status:** ⏳ Not Tested

---

### Test 4: Stock Adjustment Flow
**Steps:**
1. Go to Inventory > Riwayat Stok tab
2. Click "Tambah Stok"
3. Select ingredient, enter quantity
4. Submit

**Expected:**
- Stock adjusted successfully
- No 500 error
- If new stock > threshold, alert clears

**Status:** ⏳ Not Tested

---

### Test 5: Dashboard Widget
**Steps:**
1. Go to Dashboard
2. Check Low Stock section

**Expected:**
- Shows list of ingredients below threshold
- Shows current stock and threshold values
- Acknowledge buttons work

**Status:** ⏳ Not Tested

---

## Summary

| Test | Status | Notes |
|------|--------|-------|
| Threshold Configuration | ⏳ | - |
| Low Stock Alert | ⏳ | - |
| Alert Acknowledgment | ⏳ | - |
| Stock Adjustment | ⏳ | - |
| Dashboard Widget | ⏳ | - |

**Overall Status:** Ready for User Testing
