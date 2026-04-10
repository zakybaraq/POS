# External Integrations

**Analysis Date:** 2026-04-10

## APIs & External Services

This is a self-contained POS (Point of Sale) application with no external API integrations. All functionality is built-in.

## Data Storage

**Database:**
- MySQL 8.x (compatible)
- Connection via `mysql2/promise` with connection pooling
- Config:
  ```
  host: process.env.DB_HOST || 'localhost'
  user: process.env.DB_USER || 'root'
  password: process.env.DB_PASSWORD || ''
  database: process.env.DB_NAME || 'pos_db'
  connectionLimit: 5
  ```
- ORM: Drizzle ORM with schema defined in `src/db/schema.ts`
- Location: `src/db/index.ts`

**Database Schema Tables:**
- `users` - User accounts with roles (super_admin, admin_restoran, kasir, waitress, chef)
- `categories` - Menu categories (makanan, minuman)
- `menus` - Menu items with pricing
- `tables` - Restaurant tables with capacity and area
- `orders` - Order records with status tracking
- `orderItems` - Individual order line items
- `ingredients` - Inventory ingredients
- `recipes` - Menu item recipes (ingredient quantities)
- `stockMovements` - Stock in/out tracking
- `customers` - Customer profiles with loyalty points
- `loyaltyTransactions` - Customer loyalty point transactions
- `businessSettings` - Business configuration
- `taxSettings` - Tax configuration
- `paymentMethods` - Available payment methods
- `receiptSettings` - Receipt printing configuration
- `operatingHours` - Business hours
- `suppliers` - Supplier contacts
- `purchaseOrders` - Purchase orders for inventory
- `purchaseOrderItems` - PO line items
- `supplierPrices` - Supplier pricing for ingredients
- `employeeProfiles` - Employee details
- `shifts` - Cash drawer shifts
- `attendance` - Employee attendance records
- `auditLogs` - Audit trail for actions

**File Storage:**
- Local filesystem only
- Static assets served from `src/public/styles/`
- Page templates served from `src/pages/`

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Custom implementation using JWT
- Package: `jsonwebtoken`
- Implementation:
  - Token stored in `pos_session` cookie
  - JWT payload contains: `userId`, `email`, `name`, `role`
  - Token expiration: 24 hours
  - Roles: super_admin, admin_restoran, kasir, waitress, chef

**Password Security:**
- bcryptjs for password hashing
- Stored in `users.password` column

**Cookie Configuration:**
```javascript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
}
```

## Monitoring & Observability

**Error Tracking:**
- None detected (no external error tracking service)

**Logs:**
- Console logging via `console.log/error`
- Audit logs stored in database (`audit_logs` table)

## CI/CD & Deployment

**Hosting:**
- Self-hosted (runs on any server with Bun and MySQL)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret (should be changed in production)
- `PORT` - Server port (optional, defaults to 3000)
- `NODE_ENV` - Environment (production/development)

**Secrets location:**
- Environment variables (never committed to git)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-04-10*