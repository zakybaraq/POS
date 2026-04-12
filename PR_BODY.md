## Summary
Integrates customer loyalty tracking with the POS system. Customer stats (totalSpent, totalVisits, loyaltyPoints) now update automatically when orders are completed with a customer selected.

## Changes

### Database
- Added `customer_id` column to `orders` table
- Created index `idx_orders_customer_id`

### Backend
- Updated `createOrder()` to accept optional `customerId` parameter
- Modified `completeOrder()` to automatically update customer stats in transaction:
  - Increments `totalSpent` by order total
  - Increments `totalVisits` by 1
  - Adds loyalty points (1% of order total)
  - Recalculates customer tier
- Added transaction-safe customer repository functions:
  - `updateCustomerVisitTx()`
  - `addLoyaltyPointsTx()`
  - `updateCustomerTierTx()`
- Fixed `getCustomerOrderHistory()` to filter by `customerId` instead of `userId`

### Frontend
- Added customer dropdown in POS payment modal
- Order creation now includes `customerId` when customer is selected
- Removed duplicate loyalty API call from frontend
- Fixed `onCustomerSelectChange` scope issue

### Bug Fixes
- Fixed TypeScript type mismatch in `decrementStockForOrderTx`
- Fixed incorrect element ID in `resetAfterPayment()`

## Testing
1. Open POS page
2. Create order with customer selected
3. Complete payment
4. Check customer detail page - stats should update automatically

## Migration Required
Run the SQL in `apply-migration.sql` or:
```sql
ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER user_id;
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```
