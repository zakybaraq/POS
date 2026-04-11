# Customer Loyalty Integration - Implementation Summary

## Problem
Customer stats (totalSpent, totalVisits, loyaltyPoints) were not being updated when orders were completed with a customer selected from the POS.

## Solution
Integrated customer loyalty tracking into the order completion workflow.

## Changes Made

### 1. Database Schema (`src/db/schema.ts`)
- Added `customerId` column to `orders` table (nullable INT)
- Added index `idx_orders_customer_id` for faster lookups

### 2. Order Repository (`src/repositories/order.ts`)
- Updated `createOrder()` to accept optional `customerId` parameter
- Updated `completeOrder()` to automatically update customer stats when order has a customer:
  - Calls `updateCustomerVisitTx()` to increment totalSpent and totalVisits
  - Calls `addLoyaltyPointsTx()` to add loyalty points (1% of order total)
  - All operations run within the same transaction for data consistency

### 3. Customer Repository (`src/repositories/customer.ts`)
- Added transaction-aware versions of loyalty functions:
  - `addLoyaltyPointsTx(tx, customerId, points, orderId)`
  - `updateCustomerVisitTx(tx, customerId, amount)`
  - `updateCustomerTierTx(tx, customerId)`
- These functions accept a transaction object to run within the order completion transaction

### 4. Order Routes (`src/routes/orders.ts`)
- `/api/orders/with-items` endpoint already accepts `customerId` parameter
- Validates and passes customerId to order creation

### 5. POS Client (`src/pages/pos-client.ts`)
- Fixed: `onCustomerSelectChange` was not accessible globally (moved to `window.onCustomerSelectChange`)
- `processPayment()` now includes `customerId` in order creation data
- Removed duplicate loyalty API call (now handled by backend)
- `resetAfterPayment()` now clears selected customer

### 6. Inventory Repository (`src/repositories/inventory.ts`)
- Fixed: Changed `decrementStockForOrderTx` parameter type from `MySql2Database` to `any` for transaction compatibility

### 7. Migration (`drizzle/0002_add_customer_id_to_orders.sql`)
```sql
ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER user_id;
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

## Flow

1. User selects customer in POS payment modal (optional)
2. When creating order, `customerId` is included in the request body
3. Order is created with `customerId` stored in database
4. When payment is processed:
   - Order status changes to 'completed'
   - Stock is decremented
   - **NEW**: Customer stats are updated atomically:
     - `totalSpent += order.total`
     - `totalVisits += 1`
     - `loyaltyPoints += floor(order.total * 0.01)`
     - Customer tier is recalculated

## Data Consistency
- All operations (order completion, stock decrement, customer update) run in a single database transaction
- If any operation fails, the entire transaction is rolled back
- Loyalty points are calculated as 1% of order total (floor rounded)

## Bug Fixes
1. Fixed `onCustomerSelectChange` undefined error - moved function to `window` object at end of file
2. Fixed TypeScript type mismatch in `decrementStockForOrderTx` - changed param type to `any`
3. Fixed incorrect element ID in `resetAfterPayment()` - changed from `customer-select` to `payment-customer-select`

## Migration Required
To apply database changes, run:
```bash
bunx drizzle-kit push
```
Or manually execute the SQL in `drizzle/0002_add_customer_id_to_orders.sql`
