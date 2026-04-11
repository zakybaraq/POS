# TODO: Add Stock Before/After Columns

**Created:** 2026-04-11
**Priority:** Medium
**Area:** Inventory / Database

## Description

Tambahkan kolom baru di tabel `stock_movements` untuk menyimpan jumlah stok sebelum dan sesudah adjustment di halaman riwayat stok inventory.

## Requirements

- [ ] Add `stockBefore` column to `stock_movements` table
- [ ] Add `stockAfter` column to `stock_movements` table
- [ ] Create database migration
- [ ] Update `adjustStock()` function in `src/repositories/inventory.ts` to save before/after values
- [ ] Update `getStockMovements()` to include new columns
- [ ] Update frontend in `src/pages/inventory.ts` to display new columns
- [ ] Update stock movement table UI to show before/after values

## Technical Details

### Database Changes
```sql
ALTER TABLE stock_movements 
ADD COLUMN stock_before DECIMAL(10,2) AFTER quantity,
ADD COLUMN stock_after DECIMAL(10,2) AFTER stock_before;
```

### Schema Update
Update `src/db/schema.ts`:
```typescript
stockBefore: decimal('stock_before', { precision: 10, scale: 2 }),
stockAfter: decimal('stock_after', { precision: 10, scale: 2 }),
```

### Repository Changes
Update `src/repositories/inventory.ts`:
- Modify `adjustStock()` to capture current stock before update
- Store `currentStock` as `stockBefore`
- Store `newStock` as `stockAfter`

### Frontend Changes
Update `src/pages/inventory.ts`:
- Add new columns in stock movements table
- Display before/after values with visual indicator (arrow or color)

## UI Mockup

| Tanggal | Bahan | Tipe | Jumlah | Sebelum | Sesudah | Keterangan |
|---------|-------|------|--------|---------|---------|------------|
| 2024-01-15 | Beras | In | 10 | 40.00 | 50.00 | Pembelian |
| 2024-01-16 | Beras | Out | 5 | 50.00 | 45.00 | Pesanan #123 |

## Notes

- Consider adding color coding (green for increase, red for decrease)
- May need to backfill existing records with calculated values
- Ensure migration is reversible
