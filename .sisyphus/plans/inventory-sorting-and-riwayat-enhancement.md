# Inventory Sorting & Riwayat Stok Enhancement

## Requirements
1. **Add sortable column headers to "Bahan Baku" tab** - Click column names to sort ascending/descending (like orders page)
2. **Replace "Keterangan" column with "ID Pesanan" in "Riwayat Stok" tab** - Show order ID, clickable to view order details
3. **Remove "Keterangan" column from Riwayat Stok** - Simplify display

## Implementation Decisions

### Decision 1: Sortable Columns (Bahan Baku Tab)
**Columns to make sortable:** Nama, Stok, Min Stok, Harga/Satuan (user selected "kolom utama saja")
- Satuan and Status columns remain non-sortable
- Aksi column always stays at end (non-sortable)
- Default sort: By "Nama" ascending

**Pattern:** Mirror orders.ts implementation
- Add `sortField` and `sortDir` state variables in JavaScript
- Wire headers with `onclick="sortIngredients('fieldName')"`
- Implement `sortIngredients(field)` function that sorts DOM rows
- Add sort direction indicators (↑ ↓) next to column names
- Persist state during filtering (sort + filter work together)

### Decision 2: Riwayat Stok Column Changes
**Replace "Keterangan" column with "ID Pesanan"**
- Show format: "#86", "#85", etc. (with # prefix like orders page)
- Make ID clickable: `onclick="showOrderDetail(referenceId)"`
- Extract referenceId from stock_movements.reference_id
- If reference_id is NULL (for non-order movements like manual adjustments), show "-"

**Data source:** stock_movements.referenceId field
- Already populated by decrementStockForOrder() with orderId
- For manual adjustments/waste entries, reference_id stays NULL

### Decision 3: UI Consistency
- Use same sorting indicators as orders page (↑ for ascending, ↓ for descending)
- Same styling: `cursor: pointer` on sortable headers
- Same function pattern: Click same column to toggle direction, different column defaults to asc (except time would default to desc if it existed)

## Files to Modify
- `src/pages/inventory.ts` - Add sorting logic and replace Keterangan with ID Pesanan

## Implementation Approach
1. Update Bahan Baku table headers - make sortable with onclick handlers
2. Add sortIngredients() function - mirrors sortOrders() pattern
3. Add sortField/sortDir state variables
4. Update Riwayat Stok column header - replace "Keterangan" with "ID Pesanan"
5. Update movement row rendering - extract referenceId, make clickable
6. Keep existing filterIngredients() and filterMovements() - sort and filter work independently

## Success Criteria
- ✅ Click column header in Bahan Baku → sorts by that column
- ✅ Click same header again → reverses sort direction
- ✅ Sort direction shown with ↑ ↓ arrows
- ✅ Riwayat Stok shows "ID Pesanan" instead of "Keterangan"
- ✅ ID Pesanan is clickable → opens order detail modal
- ✅ Manual adjustments (no referenceId) show "-"
- ✅ Sorting persists when filter is applied
- ✅ Code follows existing patterns from orders.ts

## Technical Notes
- Sort happens client-side on DOM rows (like orders.ts)
- Each row needs data attributes: data-name, data-stock, data-min, data-cost
- Use dataset properties to extract sort values (already partially in place)
- Type handling: strings use localeCompare, numbers use numeric comparison
- DateTime: not sortable in inventory (unlike orders page)
