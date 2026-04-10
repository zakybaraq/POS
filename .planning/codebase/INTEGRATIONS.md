# External Integrations

**Analysis Date:** 2026-04-11

## APIs & External Services

**Current Status:**
- No third-party API integrations detected
- No payment gateways (Stripe, PayPal, etc.)
- No SMS/email notification services
- No cloud services (AWS, GCP, Azure)
- No analytics or monitoring services

**Payment Processing:**
- Internal implementation only
- Service: `src/services/payment.ts`
- Features: Change calculation, order status completion on payment
- Integration: Called from `src/routes/orders.ts`
- Supported: Cash payments only (extensible to other methods via `paymentMethods` table)

## Data Storage

**Primary Database:**
- Type: MySQL 5.7+
- Driver: mysql2/promise 3.20.0
- Connection pool: 5 connections max, unlimited queue
- Configuration:
  ```
  Host: process.env.DB_HOST (default: localhost)
  User: process.env.DB_USER (default: root)
  Password: process.env.DB_PASSWORD (default: empty)
  Database: process.env.DB_NAME (default: pos_db)
  ```
- ORM: Drizzle ORM 0.45.2
- Schema file: `src/db/schema.ts` (429 lines with relations)
- Connection manager: `src/db/index.ts`

**Database Schema:**
- `users` - User accounts with roles (super_admin, admin_restoran, kasir, waitress, chef)
- `categories` - Menu categories (makanan, minuman)
- `menus` - Menu items with pricing and availability
- `tables` - Restaurant table configuration with capacity/area
- `orders` - Order records with status tracking (draft, active, completed, cancelled)
- `orderItems` - Line items with cooking status tracking
- `ingredients` - Inventory ingredient master data
- `recipes` - Menu-to-ingredient mappings with quantities
- `stockMovements` - Stock transaction audit trail (in, out, adjustment, waste)
- `customers` - Customer profiles with loyalty tier and points
- `loyaltyTransactions` - Point earn/redeem history
- `suppliers` - Supplier contact information
- `purchaseOrders` - Procurement orders with status tracking
- `purchaseOrderItems` - PO line items with received quantities
- `supplierPrices` - Supplier pricing for ingredients
- `employeeProfiles` - Employee details linked to users
- `shifts` - Cash drawer shift tracking with reconciliation
- `attendance` - Employee attendance and clock in/out
- `auditLogs` - User action audit trail
- `businessSettings` - Business name, currency, timezone, language
- `taxSettings` - Tax configuration (exclusive/inclusive, percentage)
- `paymentMethods` - Available payment method registry
- `receiptSettings` - Receipt format and content configuration
- `operatingHours` - Business hours by day of week

**File Storage:**
- Local filesystem only - No cloud storage
- Static assets: `src/public/styles/` (CSS files)
- Templates: `src/pages/` (server-rendered HTML)
- Logo storage: Stored as URL string in `businessSettings.logo` column

**Caching:**
- None detected
- All queries execute directly to MySQL

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no OAuth, Auth0, or third-party provider)
  - Service: `src/services/auth.ts`
  - Utilities: `src/utils/auth.ts`

**Implementation Details:**
- JWT tokens: jsonwebtoken 9.0.3
- Token secret: `JWT_SECRET` environment variable
- Development default: 'pos-secret-key-change-in-production'
- Token payload:
  ```typescript
  {
    userId: number,
    email: string,
    name: string,
    role: 'super_admin' | 'admin_restoran' | 'kasir' | 'waitress' | 'chef'
  }
  ```
- Token storage: `pos_session` HTTP cookie (HttpOnly, Secure in production)

**User Roles:**
- `super_admin` - Full system access
- `admin_restoran` - Business administration
- `kasir` - Cashier/payment processing
- `waitress` - Customer service/orders
- `chef` - Kitchen operations

**Password Security:**
- Hashing: bcryptjs 3.0.3
- Storage: `users.password` column (never plaintext)

**Authorization:**
- Middleware: `src/middleware/authorization.ts`
- Cookie-based session management: `@elysiajs/cookie` 0.8.0

## Monitoring & Observability

**Error Tracking:**
- Not implemented - No Sentry, DataDog, or similar
- Errors logged to console via console.error()

**Application Logging:**
- Console logging: `console.log()` and `console.error()`
- Audit logging: Database table `audit_logs`
  - Tracks: userId, userName, action, details, timestamp
  - All user operations logged for compliance

**Distributed Tracing:**
- Not implemented

## CI/CD & Deployment

**Hosting:**
- Self-hosted required
- Any server with Bun 1.0+ and MySQL 5.7+
- No specific platform requirement

**CI Pipeline:**
- Not detected - Manual deployment

**Deployment Methods:**
- Direct: `bun run start` on server
- Process manager: Can use pm2, systemd, or container orchestration

**Environment Management:**
- Configuration via environment variables
- Example provided: `.env.example`
- No external configuration management service

## Environment Configuration

**Required Variables:**
```
DB_HOST              # MySQL server hostname
DB_USER              # MySQL username
DB_PASSWORD          # MySQL password
DB_NAME              # Database name
JWT_SECRET           # Token signing secret
PORT                 # HTTP server port (optional, default 3000)
NODE_ENV             # Environment mode (development/production)
```

**Secrets Management:**
- Environment variables only
- `.env` file (git-ignored, not committed)
- No third-party secrets manager (Vault, AWS Secrets Manager, etc.)

**Configuration Files:**
- `.env` - Runtime configuration
- `tsconfig.json` - TypeScript compilation settings
- `drizzle.config.ts` - ORM migration settings
- `package.json` - Dependencies and scripts

## Webhooks & Callbacks

**Incoming Webhooks:**
- None detected - No external services call this API

**Outgoing Webhooks:**
- None detected - No callbacks to external systems

## Internal Integration Points

**Frontend to Backend:**
- All via RESTful HTTP API
- Content-Type: application/json
- Authentication: Cookie-based JWT
- Credentials: included in requests

**API Endpoint Suites:**
- `/api/auth/*` - Login, logout, token verification
- `/api/orders/*` - Order CRUD and status management
- `/api/menus/*` - Menu item operations
- `/api/categories/*` - Category management
- `/api/customers/*` - Customer profiles and loyalty
- `/api/inventory/*` - Stock and recipe management
- `/api/employees/*` - Staff management
- `/api/reports/*` - Sales and analytics
- `/api/settings/*` - Business configuration
- `/api/suppliers/*` - Supplier management
- `/api/tables/*` - Table management
- `/api/kitchen/*` - Kitchen display system
- `/api/shifts/*` - Cash drawer operations
- `/api/attendance/*` - Employee attendance

**Page Rendering:**
- All pages server-rendered via Elysia routes
- Response type: HTML with embedded JavaScript
- Client-side scripts: Fetch API for backend calls

## Payment Methods Infrastructure

**Database Schema:**
- Table: `paymentMethods` - Extensible registry
  - Fields: id, code, name, icon, isActive, sortOrder, createdAt
  - Current implementation: Cash only
  - Future ready: Can add credit card, e-wallet, mobile payment

**Payment Processing:**
- Service: `src/services/payment.ts`
- Process: Change calculation → Order completion
- Workflow: All payments currently cash-based
- No external payment gateway integration

## Third-Party Libraries (Types Only)

**Type Definitions (No Runtime Dependency):**
- @types/bun (latest)
- @types/bcryptjs 3.0.0
- @types/jsonwebtoken 9.0.10
- @types/cookie 0.5.x (via @elysiajs/cookie dependencies)

---

*Integration audit: 2026-04-11*