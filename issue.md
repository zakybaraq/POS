# Issue: Restaurant POS (Point of Sale) System

## Tech Stack Recommendation

### Production-Ready Stack

| Layer | Technology | Version | Reasoning |
|-------|------------|---------|-----------|
| Runtime | Bun | >= 1.0 | Fast startup, built-in package manager |
| Backend | ElysiaJS | >= 1.0 | Fastest Node.js framework, type-safe |
| Database | MySQL | 8.0+ | Reliable, widely used, good driver support |
| ORM | Drizzle ORM | >= 0.35 | Lightweight, type-safe, minimal overhead |
| Frontend | HTMX | 1.9+ | No JavaScript required, server-side rendering |
| Styling | Tailwind CSS | 3.4+ | Utility-first, no custom CSS file |

### Why This Stack?

| Concern | Solution |
|---------|----------|
| **Performance** | Bun + ElysiaJS = fastest JS stack |
| **Stability** | MySQL 8.0 = battle-tested |
| **Type Safety** | Drizzle + TypeScript = compile-time errors |
| **Lightweight** | HTMX = 14KB, no React/Vue bundle |
| **Development Speed** | Bun = 1 tool untuk semua |
| **No Build Step** | HTMX from CDN + Tailwind from CDN |

### What We Avoid & Why

| Avoid | Reason |
|-------|--------|
| React/Vue/Angular | Overkill untuk simple POS UI |
| Webpack/Vite | Tidak perlu, cukup serve static |
| Prisma | Heavy, slow migrations |
| PostgreSQL (for now) | MySQL lebih ringan untuk small scale |
| Redis (for now) | Tidak perlu, MySQL cukup |

---

## Architecture Overview

### System Architecture

```
                                    ┌─────────────────────┐
                                    │     BROWSER         │
                                    │   (HTMX + Tailwind)  │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   ElysiaJS Server   │
                                    │      (Bun)          │
                                    │                     │
                                    │  ┌────────────────┐  │
                                    │  │  Router        │  │
                                    │  │  /api/* → handler│
                                    │  │  /*    → static │  │
                                    │  └───────┬────────┘  │
                                    │          │           │
                                    │  ┌───────▼────────┐  │
                                    │  │  Services      │  │
                                    │  │  Repositories  │  │
                                    │  └───────┬────────┘  │
                                    │          │           │
                                    └──────────┼──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │    Drizzle ORM       │
                                    │    (MySQL Driver)   │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │      MySQL 8.0       │
                                    │   (pos Database)    │
                                    └─────────────────────┘
```

### Server Components

| Component | File | Responsibility |
|-----------|------|-----------------|
| Router | `src/index.ts` | Route matching, middleware |
| API Handlers | `src/routes/*.ts` | Request/response handling |
| Services | `src/services/*.ts` | Business logic |
| Repositories | `src/repositories/*.ts` | Database queries |
| Schema | `src/db/schema.ts` | Type definitions |

### Request Flow (Detail)

```
GET /pos
├── ElysiaJS matches route /* 
├── Serves static HTML (layout.html + pos.html)
├── Browser loads HTMX + Tailwind from CDN
└── User sees POS UI

POST /api/menus (Add menu)
├── ElysiaJS matches POST /api/menus
├── Validate input (name, price, category)
├── Call menuRepository.createMenu()
├── Drizzle inserts to MySQL
├── Return { success: true, id: x }
└── HTMX swap: refresh menu list

POST /api/orders/:id/items (Add to cart)
├── ElysiaJS matches POST /api/orders/:id/items
├── Validate: order exists, menu exists, is_available
├── Check: order status == 'active'
├── Call orderItemRepository.addItem()
├── Recalculate totals (subtotal + 10% tax)
├── Return new cart HTML
└── HTMX swap: #cart-zone

POST /api/orders/:id/pay (Payment)
├── ElysiaJS matches POST /api/orders/:id/pay
├── Validate: amount_paid >= total
├── Update order: status='completed', amount_paid, change_due
├── Update table: status='available'
├── Generate receipt HTML
├── Return { success: true, receipt }
└── HTMX swap: print dialog + reset cart
```

### Error Handling

| Error Type | Handling | Response |
|------------|----------|----------|
| Validation Error | Return early with error message | `400 { error: "..." }` |
| Not Found | Check existence before operation | `404 { error: "..." }` |
| Database Error | Log error, return generic message | `500 { error: "Server error" }` |
| Payment Failed | Rollback transaction | `400 { error: "Payment failed" }` |

### Stability Measures

| Measure | Implementation |
|---------|----------------|
| **Connection Pool** | Drizzle with 2-5 connections |
| **Input Validation** | Zod or manual validation on every input |
| **Transaction** | Payment in transaction (atomic) |
| **Health Check** | GET /health returns DB ping |
| **Graceful Shutdown** | Bun signal handler to close DB pool |

### Security (Basic)

| Concern | Solution |
|----------|----------|
| SQL Injection | Drizzle parameterized queries |
| XSS | HTMX escapes output by default |
| CSRF | Same-origin requests only |
| Rate Limiting | Optional: basic rate limit on API |
| Secrets | DATABASE_URL in env, not in code |

### Caching Strategy

| Data | Cache? | Duration |
|------|--------|----------|
| Menus | Yes | 1 minute, refresh on edit |
| Tables | No | Always fresh |
| Orders Today | No | Always fresh |
| Order Items | No | Always fresh |

> **Note**: Cache only for read-heavy, write-rare data (menus). Everything else is dynamic.

### Performance Targets

| Metric | Target |
|--------|--------|
| Server Start | < 1 second |
| API Response | < 100ms (MySQL) |
| Page Load | < 2 seconds |
| HTMX Swap | < 200ms |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RAILWAY / RENDER / FLY                  │
│                     ┌─────────────────────┐                  │
│                     │  Bun + ElysiaJS     │                  │
│                     │  (Single process)  │                  │
│                     └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │      MySQL        │
                    │  (PlanetScale/    │
                    │   Supabase/      │
                    │   CloudSQL)       │
                    └───────────────────┘
```

### Environment Variables

```env
# Required
DATABASE_URL=mysql://user:password@host:3306/pos_db

# Optional
PORT=3000           # Default: 3000
NODE_ENV=production # or development
```

---

## Directory Structure

```
src/
├── db/
│   ├── schema.ts      # Module 1: Schema definitions
│   └── index.ts       # Module 2: Database connection
├── repositories/
│   ├── menu.ts        # Module 3: Menu CRUD
│   ├── table.ts       # Module 4: Table CRUD
│   ├── order.ts       # Module 5: Order CRUD
│   └── order-item.ts  # Module 6: Order item CRUD
├── services/
│   └── payment.ts     # Module 7: Payment logic
├── routes/
│   ├── menus.ts       # API: /api/menus
│   ├── tables.ts      # API: /api/tables
│   ├── orders.ts      # API: /api/orders
│   └── index.ts       # Route registration
├── views/
│   ├── layout.html    # Base template
│   ├── pos.html      # POS page
│   ├── menu.html     # Menu management
│   ├── tables.html   # Table management
│   └── orders.html   # Today's orders
└── index.ts           # Module 10: App bootstrap
```

---

## Modules (Wajib untuk Stabilitas)

### Module 1: Database & Schema
- **File**: `src/db/schema.ts`
- **Isi**: 
  - Schema menus, tables, orders, order_items
  - Enum types (category, table_status, order_status)
- **Output**: Type-safe schema untuk semua tabel

### Module 2: Database Connection
- **File**: `src/db/index.ts`
- **Isi**: 
  - MySQL connection via Drizzle
  - Connection pool management
- **Output**: `db` instance untuk query

### Module 3: Menu Repository
- **File**: `src/repositories/menu.ts`
- **Methods**:
  - `getAllMenus()` - Ambil semua menu
  - `getMenuById(id)` - Ambil 1 menu
  - `createMenu(data)` - Tambah menu
  - `updateMenu(id, data)` - Edit menu
  - `deleteMenu(id)` - Hapus menu
  - `toggleAvailability(id)` - Toggle tersedia/tidak
- **Validation**:
  - name: required, max 255 char
  - price: required, > 0
  - category: required, enum [makanan,minuman]

### Module 4: Table Repository
- **File**: `src/repositories/table.ts`
- **Methods**:
  - `getAllTables()` - Semua meja + status
  - `getTableById(id)` - Ambil 1 meja
  - `createTable(data)` - Tambah meja
  - `updateTableStatus(id, status)` - Update status meja
- **Validation**:
  - table_number: required, unique

### Module 5: Order Repository
- **File**: `src/repositories/order.ts`
- **Methods**:
  - `createOrder(tableId, servedBy)` - Buat pesanan baru
  - `getOrderById(id)` - Ambil pesanan + items
  - `getOrdersToday()` - Semua pesanan hari ini
  - `updateOrderStatus(id, status)` - Update status
  - `calculateTotals(orderId)` - Hitung subtotal + tax + total
- **Validation**:
  - served_by: required, max 100 char

### Module 6: Order Item Repository
- **File**: `src/repositories/order-item.ts`
- **Methods**:
  - `addItem(orderId, menuId, quantity)` - Tambah item ke pesanan
  - `updateQuantity(itemId, quantity)` - Ubah jumlah
  - `removeItem(itemId)` - Hapus item
  - `getItemsByOrderId(orderId)` - Semua items dalam pesanan
- **Validation**:
  - quantity: required, >= 1
  - menu_id: must exist in menus

### Module 7: Payment Service
- **File**: `src/services/payment.ts`
- **Methods**:
  - `processPayment(orderId, amountPaid)` - Proses pembayaran
  - `calculateChange(total, amountPaid)` - Hitung kembalian
  - `generateReceipt(order)` - Generate struk untuk print
- **Validation**:
  - amount_paid: required, >= total

### Module 8: API Routes
- **File**: `src/routes/*.ts`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/menus` | Ambil semua / tambah menu |
| PUT/DELETE | `/api/menus/:id` | Edit / hapus menu |
| GET/POST | `/api/tables` | Ambil semua / tambah meja |
| PUT | `/api/tables/:id` | Update status meja |
| GET/POST | `/api/orders` | Ambil pesanan / buat baru |
| GET | `/api/orders/today` | Pesanan hari ini |
| PUT | `/api/orders/:id` | Update status pesanan |
| POST | `/api/orders/:id/items` | Tambah item |
| DELETE | `/api/orders/:id/items/:itemId` | Hapus item |
| POST | `/api/orders/:id/pay` | Proses pembayaran |

### Module 9: HTML Templates (HTMX)
- **File**: `src/views/*.html`
  - `layout.html` - Template dasar + Tailwind CDN
  - `pos.html` - Halaman POS utama
  - `menu.html` - Halaman manajemen menu
  - `tables.html` - Halaman manajemen meja
  - `orders.html` - Daftar pesanan hari ini

### Module 10: App Bootstrap
- **File**: `src/index.ts`
- **Isi**:
  - Setup ElysiaJS
  - Register routes
  - Serve static HTML
  - Health check: GET /health

---

## POS Layout

### Design Principles

| Principle | Reasoning |
|-----------|-----------|
| **Single Page** | No navigation, semua dalam 1 layar |
| **Zone-based** | Clear separation: Tables → Menu → Cart |
| **Keyboard-friendly** | Quick action via keyboard (optional) |
| **Auto-save** | Cart tersimpan di localStorage sebagai backup |
| **Minimal requests** | HTMX swap hanya bagian yang berubah |

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: TODAY: Rp 450.000  │  12 orders  │  [MENU] [ORDERS]       │
├────────────────┬────────────────────────────┬──────────────────────┤
│                │                            │                      │
│   TABLES       │       MENU                 │      CART             │
│                │                            │                      │
│  ┌───┐ ┌───┐   │  KATEGORI: [Mkn] [Mnm]    │  Meja: 1              │
│  │ 1 │ │ 2 │   │                            │  ─────────────────    │
│  └───┘ └───┘   │  ┌────┐ ┌────┐ ┌────┐     │  🍲 Nasi G x2  30.000│
│  ┌───┐ ┌───┐   │  │15k │ │15k │ │ 5k │     │  🥤 Es Teh x1   5.000│
│  │ 3 │ │ 4 │   │  └────┘ └────┘ └────┘     │  ─────────────────    │
│  └───┘ └───┘   │                            │  Subtotal:   35.000    │
│                │  ┌────┐ ┌────┐ ┌────┐     │  Pajak:      3.500    │
│  [+] Tambah   │  │ 5k │ │ 7k │ │ 8k │     │  ═══════════════════   │
│                │  └────┘ └────┘ └────┘     │  TOTAL:      38.500    │
│                │                            │                      │
│                │                            │  💵 Bayar: [_____]    │
│                │                            │                      │
│                │                            │  [BATAL] [STRUK][BAYAR]│
└────────────────┴────────────────────────────┴──────────────────────┘
```

### Zone Details

#### 1. Header (Fixed Top)
- **Today Total**: Total penjualan hari ini
- **Order Count**: Jumlah pesanan hari ini
- **Nav Links**: MENU (manage), ORDERS (history)

#### 2. Tables Zone (Left Sidebar)
- **Grid Meja**: 2x2 atau 3x3, click untuk pilih
- **Status**: Green = available, Red = occupied
- **Active Indicator**: Border kuning untuk meja aktif
- **Quick Add**: Tombol "+" untuk tambah meja baru
- **Width**: ~120px fixed

#### 3. Menu Zone (Center)
- **Category Tabs**: [Makanan] [Minuman] - click untuk filter
- **Menu Grid**: 3-4 kolom, card menu
- **Card Content**: Nama + Harga
- **Click Action**: Tambah ke cart langsung
- **Available Only**: Menu tidak tersedia tidak ditampilkan

#### 4. Cart Zone (Right Sidebar)
- **Meja Info**: Nomor meja yang sedang aktif
- **Item List**: Scrollable, nama + qty + harga
- **Qty Controls**: [+][-] per item
- **Delete**: Click item untuk hapus
- **Totals**: Subtotal, Pajak (10%), Total
- **Payment Input**: Input uang diterima
- **Quick Actions**: BATAL (batal pesanan), STRUK (print), BAYAR (proses)

### User Flow

```
1. Klik MEJA → Meja aktif, cart kosong
2. Klik MENU → Item masuk ke cart
3. Klik [+][-] → Adjust quantity
4. Input UANG DITERIMA → Kembalian otomatis
5. Klik BAYAR → Payment proses, struk print
6. Meja otomatis Jadi available
```

### State Management (HTMX)

| Trigger | HTMX Swap | Response |
|---------|-----------|----------|
| Klik meja | `#cart-zone` | Load cart untuk meja tersebut |
| Klik menu | `#cart-items` | Tambah item ke cart |
| Klik [+][-] | `#cart-items` | Update quantity |
| Input uang | `#change-due` | Hitung kembalian |
| Klik BAYAR | `#full-layout` | Proses & reset |

### Performance Considerations

1. **Initial Load**: Semua data (tables, menus, today orders) dimuatsekaligus
2. **HTMX Swap**: Hanya zona yang berubah di-update
3. **No Polling**: Tidak ada auto-refresh, manual refresh saja
4. **LocalStorage**: Cart backup jika browser crash
5. **Minimal JavaScript**: Hanya HTMX + 1 helper function hitung kembalian

### Receipt Print Format

```
================================
       RM NAME - KASIR TONO
================================
Meja: 1          Waktu: 12:30
--------------------------------
Nasi Goreng    x2   30.000
Es Teh         x1    5.000
--------------------------------
Subtotal             35.000
Pajak (10%)          3.500
--------------------------------
TOTAL                38.500
--------------------------------
Uang Diterima        50.000
Kembalian            11.500
================================
      TERIMA KASIH
================================
```

---

## Database Schema

### Schema Design Principles

| Principle | Implementation |
|------------|----------------|
| **Minimal Columns** | Hanya kolom yang benar-benar dibutuhkan |
| **Denormalized Totals** | Simpan subtotal/tax/total di orders (cache) |
| **Soft Delete** | Tidak perlu, hapus langsung saja |
| **Timestamps** | created_at saja, updated_at tidak perlu |
| **Index Strategy** | Index pada foreign keys dan status |

### Drizzle Schema Definition

```typescript
// src/db/schema.ts

import { mysqlTable, serial, varchar, int, boolean, datetime, mysqlEnum, index } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ENUMS
export const categoryEnum = mysqlEnum('category', ['makanan', 'minuman']);
export const tableStatusEnum = mysqlEnum('table_status', ['available', 'occupied']);
export const orderStatusEnum = mysqlEnum('order_status', ['active', 'completed', 'cancelled']);

// TABLES
export const menus = mysqlTable('menus', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: int('price').notNull(),
  category: categoryEnum.notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  categoryIdx: index('idx_menus_category').on(table.category),
  availableIdx: index('idx_menus_available').on(table.isAvailable),
}));

export const tables = mysqlTable('tables', {
  id: serial('id').primaryKey(),
  tableNumber: int('table_number').notNull().unique(),
  status: tableStatusEnum.notNull().default('available'),
});

export const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  tableId: int('table_id').notNull(),
  servedBy: varchar('served_by', { length: 100 }).notNull(),
  status: orderStatusEnum.notNull().default('active'),
  subtotal: int('subtotal').notNull().default(0),
  tax: int('tax').notNull().default(0),
  total: int('total').notNull().default(0),
  amountPaid: int('amount_paid'),
  changeDue: int('change_due'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  completedAt: datetime('completed_at'),
}, (table) => ({
  tableIdIdx: index('idx_orders_table_id').on(table.tableId),
  statusIdx: index('idx_orders_status').on(table.status),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
}));

export const orderItems = mysqlTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull(),
  menuId: int('menu_id').notNull(),
  quantity: int('quantity').notNull().default(1),
  priceAtOrder: int('price_at_order').notNull(),
}, (table) => ({
  orderIdIdx: index('idx_order_items_order_id').on(table.orderId),
  menuIdIdx: index('idx_order_items_menu_id').on(table.menuId),
}));

// RELATIONS
export const menusRelations = relations(menus, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const tablesRelations = relations(tables, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menu: one(menus, {
    fields: [orderItems.menuId],
    references: [menus.id],
  }),
}));

// TYPE EXPORTS
export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
```

### Indexes

| Table | Index Name | Columns | Purpose |
|-------|------------|---------|---------|
| menus | idx_menus_category | category | Filter by category |
| menus | idx_menus_available | is_available | Filter available only |
| tables | - | table_number | UNIQUE constraint |
| orders | idx_orders_table_id | table_id | Join with tables |
| orders | idx_orders_status | status | Filter by status |
| orders | idx_orders_created_at | created_at | Today's orders query |
| order_items | idx_order_items_order_id | order_id | Get items by order |
| order_items | idx_order_items_menu_id | menu_id | Get items by menu |

### Foreign Keys

| Child Table | Column | Parent Table | On Delete |
|------------|--------|--------------|-----------|
| orders | table_id | tables | CASCADE |
| order_items | order_id | orders | CASCADE |
| order_items | menu_id | menus | RESTRICT |

> **Note**: RESTRICT on menu_id prevents deletion of menu that has been ordered.

### Query Patterns

```typescript
// Get all available menus
const availableMenus = await db.select()
  .from(menus)
  .where(eq(menus.isAvailable, true));

// Get order with items
const orderWithItems = await db.select()
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .where(eq(orders.id, orderId));

// Get today's orders (simplified query)
const todayOrders = await db.select()
  .from(orders)
  .leftJoin(tables, eq(orders.tableId, tables.id))
  .where(gte(orders.createdAt, todayStart()));

// Calculate daily total
const dailyTotal = await db.select({ total: sum(orders.total) })
  .from(orders)
  .where(and(
    gte(orders.createdAt, todayStart()),
    eq(orders.status, 'completed')
  ));
```

### Migration (Drizzle)

```bash
# Generate migration
bunx drizzle-kit generate:mysql

# Push to database
bunx drizzle-kit push:mysql
```

### Schema Validation Rules

| Table | Column | Rule |
|-------|--------|------|
| menus | name | NOT NULL, max 255 |
| menus | price | NOT NULL, > 0 |
| menus | category | NOT NULL, enum |
| tables | table_number | NOT NULL, UNIQUE |
| orders | served_by | NOT NULL, max 100 |
| orders | total | NOT NULL, >= 0 |
| order_items | quantity | NOT NULL, >= 1 |
| order_items | price_at_order | NOT NULL, > 0 |

### Performance Considerations

| Concern | Solution |
|---------|----------|
| Slow queries | Index pada status dan foreign keys |
| Large order history | Partition by month (future) |
| Connection pool | 2-5 connections cukup untuk POS |
| N+1 queries | Use eager loading with relations |

### Database Connection

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema });
export { schema };
```

---

## Development Phase

### Day 1: Setup & Core
- Init Bun + ElysiaJS + Drizzle + MySQL
- Setup HTMX + Tailwind
- Module 1-2: Database & Connection
- Module 3-4: Menu & Table Repository
- Module 9: Basic HTML templates
- Test: Menu & Table CRUD works

### Day 2: Order & Payment
- Module 5-6: Order & Order Item Repository
- Module 7: Payment Service
- Module 8: All API Routes
- Test: Full order flow works

### Day 3: Polish
- Connect POS UI ke API
- Print struk functionality
- Today's orders list
- Test: End-to-end flow

---

## Catatan Efficiency

1. **Module First**: Build per-module, test per-module
2. **No Build Step**: HTMX dari CDN, Tailwind via CDN
3. **Bun**: Satu tool untuk runtime, package manager, test
4. **ElysiaJS**: Type-safe, serving static + API
5. **Drizzle**: Schema-driven, migrate ringan

---

## Deployment

- **All-in-One**: Bun + ElysiaJS → Railway / Render / Fly.io
- **Database**: MySQL → PlanetScale / Supabase MySQL / hosting lain
- **Environment**: `.env` untuk DATABASE_URL
