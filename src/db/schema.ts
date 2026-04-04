// src/db/schema.ts

import { mysqlTable, serial, varchar, int, boolean, datetime, mysqlEnum, index, uniqueIndex } from 'drizzle-orm/mysql-core';
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