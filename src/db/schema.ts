// src/db/schema.ts

import { mysqlTable, serial, varchar, int, boolean, datetime, mysqlEnum, index } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const categoryEnum = mysqlEnum('category', ['makanan', 'minuman']);
export const tableStatusEnum = mysqlEnum('table_status', ['available', 'occupied']);
export const orderStatusEnum = mysqlEnum('order_status', ['draft', 'active', 'completed', 'cancelled']);
export const itemStatusEnum = mysqlEnum('item_status', ['pending', 'cooking', 'ready', 'served']);
export const roleEnum = mysqlEnum('role', ['super_admin', 'admin_restoran', 'kasir', 'waitress', 'chef']);

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: roleEnum.notNull().default('kasir'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
  lastLogin: datetime('last_login'),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

export const menus = mysqlTable('menus', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: int('price').notNull(),
  description: varchar('description', { length: 500 }).default(''),
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
  status: mysqlEnum('table_status', ['available', 'occupied']).notNull().default('available'),
});

export const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  tableId: int('table_id').notNull(),
  userId: int('user_id').notNull(),
  servedBy: varchar('served_by', { length: 100 }).notNull().default(''),
  status: orderStatusEnum.notNull().default('draft'),
  subtotal: int('subtotal').notNull().default(0),
  tax: int('tax').notNull().default(0),
  discount: int('discount').default(0),
  discountType: mysqlEnum('discount_type', ['fixed', 'percentage']).default('fixed'),
  notes: varchar('notes', { length: 500 }),
  total: int('total').notNull().default(0),
  amountPaid: int('amount_paid'),
  changeDue: int('change_due'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  completedAt: datetime('completed_at'),
}, (table) => ({
  tableIdIdx: index('idx_orders_table_id').on(table.tableId),
  userIdIdx: index('idx_orders_user_id').on(table.userId),
  statusIdx: index('idx_orders_status').on(table.status),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
}));

export const orderItems = mysqlTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull(),
  menuId: int('menu_id').notNull(),
  quantity: int('quantity').notNull().default(1),
  priceAtOrder: int('price_at_order').notNull(),
  notes: varchar('notes', { length: 255 }).default(''),
  status: itemStatusEnum.notNull().default('pending'),
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
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
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

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const auditLogs = mysqlTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(),
  userName: varchar('user_name', { length: 100 }).notNull().default(''),
  action: varchar('action', { length: 100 }).notNull(),
  details: varchar('details', { length: 500 }),
  createdAt: datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  userIdIdx: index('idx_audit_logs_user_id').on(table.userId),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
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
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;