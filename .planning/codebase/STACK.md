# Technology Stack

**Analysis Date:** 2026-04-12

## Languages

**Primary:**
- TypeScript 5.x - Core language for all source code with strict type checking enabled
- JavaScript (via Bun) - Runtime execution

**Secondary:**
- HTML/CSS - Generated via templates in `src/templates/`

## Runtime

**Environment:**
- Bun (latest) - JavaScript runtime and package manager
- Node.js compatibility layer provided via Bun

**Package Manager:**
- Bun - Primary package manager
- Lockfile: `bun.lock` present

## Frameworks

**Core Framework:**
- Elysia 1.4.28 - Lightweight TypeScript HTTP framework/router
  - Location: `src/index.ts` (main app initialization)
  - Used for: HTTP routing, middleware composition, request/response handling
  - Pattern: Modular route registration via `.use()` chains

**Cookie Management:**
- @elysiajs/cookie 0.8.0 - Cookie handling for sessions
  - Integrated in: `src/index.ts`, `src/routes/index.ts`
  - Used for: JWT session token storage and retrieval
  - Pattern: `.use(cookie())` in Elysia app initialization

**ORM:**
- Drizzle ORM 0.45.2 - Type-safe database query builder for MySQL
  - Configuration: `drizzle.config.ts`
  - Schema: `src/db/schema.ts` (21 tables with 38+ type exports)
  - Database connection: `src/db/index.ts`
  - Pattern: Direct `db` instance exported for use in repositories

**Database:**
- MySQL 5.7+ (via mysql2 package)
- Connection: Pool-based with `mysql2/promise`
- Configuration via environment variables (see Environment section)

**Testing:**
- Not detected (no test framework installed)

**Build/Dev:**
- TypeScript compiler (built into Bun)
- drizzle-kit 0.31.10 - Schema management and migrations
  - Commands: `db:generate`, `db:push`
  - Schema file: `src/db/schema.ts`
  - Output migrations: `drizzle/` directory

## Key Dependencies

**Critical:**
- bcryptjs 3.0.3 - Password hashing for user authentication
  - Used in: `src/repositories/user.ts`
  - Purpose: Secure password storage and verification

- jsonwebtoken 9.0.3 - JWT token generation and verification
  - Used in: `src/utils/auth.ts`, `src/services/auth.ts`, `src/services/session.ts`
  - Purpose: Session token creation and validation for stateless authentication
  - Config: JWT_SECRET via environment or fallback

- mysql2 3.20.0 - MySQL database driver
  - Used in: `src/db/index.ts`
  - Pool configuration: 5 connection limit, queue-based waiting

**Infrastructure:**
- zod 4.3.6 - Runtime type validation (installed but NOT used in current implementation)
  - Note: Validation currently handled via Elysia's `t.*` type validators instead

## Type Definitions

**Development Dependencies:**
- @types/bcryptjs 3.0.0 - bcryptjs TypeScript types
- @types/bun latest - Bun runtime types for proper IDE support
- @types/jsonwebtoken 9.0.10 - JWT TypeScript types

## Configuration

**TypeScript Configuration (`tsconfig.json`):**
- Target: ESNext
- Module resolution: bundler (Bun-optimized)
- Strict mode: enabled
- Features:
  - `verbatimModuleSyntax` - Preserves import/export syntax for Bun
  - `allowImportingTsExtensions` - Direct TypeScript file imports
  - `jsx: react-jsx` - JSX support (though mainly used for template generation)

**Database Configuration (`drizzle.config.ts`):**
- Dialect: mysql
- Schema location: `./src/db/schema.ts`
- Migrations output: `./drizzle/`
- Connection credentials: Environment variables with localhost defaults
  - DB_HOST (default: localhost)
  - DB_USER (default: root)
  - DB_PASSWORD (default: empty)
  - DB_NAME (default: pos_db)

**Drizzle ORM Configuration (`src/db/index.ts`):**
- Mode: default (not strict)
- Schema: Full schema export from `./schema.ts`
- Connection pool: 5 max connections, unlimited queue

**Environment Configuration:**
- Server: PORT (default: 3000)
- Database: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
- Authentication: JWT_SECRET (default: 'pos-secret-key-change-in-production')

## Platform Requirements

**Development:**
- Bun 1.x or later
- MySQL 5.7+ or MariaDB 10.2+
- TypeScript 5.x (peer dependency)

**Production:**
- Same as development (Bun is production-capable)
- MySQL database instance
- Environment variables properly configured

## Running Commands

```bash
# Development
bun run dev                  # Start dev server at http://localhost:3000

# Database Management
bunx drizzle-kit generate:mysql  # Generate migrations from schema changes
bunx drizzle-kit push:mysql      # Push schema changes to database

# Production
bun run start                # Start production server
```

## Database Schema Overview

**Core Tables (23 primary + 2 settings):**
1. Users - Authentication and roles
2. Orders - Main order records with status tracking
3. OrderItems - Line items in orders
4. Menus - Menu items/products
5. Tables - Dining tables
6. Categories - Menu categories (makanan/minuman)
7. Customers - Customer profiles and loyalty
8. LoyaltyTransactions - Loyalty points tracking
9. Ingredients - Stock inventory items
10. Recipes - Menu item recipes (ingredient requirements)
11. StockMovements - Inventory transaction log
12. AuditLogs - User action audit trail
13. Suppliers - Vendor information
14. PurchaseOrders - Purchase order management
15. PurchaseOrderItems - PO line items
16. SupplierPrices - Vendor pricing
17. EmployeeProfiles - Employee details
18. Shifts - Cashier shift tracking
19. Attendance - Employee attendance records
20. BusinessSettings - Configuration data
21. TaxSettings - Tax calculation settings
22. PaymentMethods - Payment options
23. ReceiptSettings - Receipt formatting
24. OperatingHours - Business hours

## Dependency Relationships

```
Elysia + @elysiajs/cookie (HTTP + Session)
    ↓
Routes (src/routes/*.ts)
    ↓
Services (src/services/*.ts) + Repositories (src/repositories/*.ts)
    ↓
Drizzle ORM (Type-safe queries)
    ↓
mysql2 (Connection pool)
    ↓
MySQL Database

Authentication Layer:
    bcryptjs (password hashing) + jsonwebtoken (token management)
    ↓
    src/utils/auth.ts + src/middleware/authorization.ts
    ↓
    Applied to routes via role-based middleware
```

---

*Technology stack analysis: 2026-04-12*
