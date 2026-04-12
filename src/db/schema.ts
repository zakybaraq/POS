// src/db/schema.ts

import { mysqlTable, serial, varchar, int, boolean, datetime, mysqlEnum, index, decimal, date } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const categoryEnum = mysqlEnum('category', ['makanan', 'minuman']);
export const categories = mysqlTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: int('sort_order').default(0),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

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
  category: varchar('category', { length: 100 }).notNull().default('makanan'),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  categoryIdx: index('idx_menus_category').on(table.category),
  availableIdx: index('idx_menus_available').on(table.isAvailable),
}));

export const tables = mysqlTable('tables', {
  id: serial('id').primaryKey(),
  tableNumber: int('table_number').notNull().unique(),
  capacity: int('capacity').default(4),
  area: mysqlEnum('area', ['indoor', 'outdoor', 'vip']).default('indoor'),
  status: varchar('table_status', { length: 20 }).notNull().default('available'),
});

export const orders = mysqlTable('orders', {
  id: serial('id').primaryKey(),
  tableId: int('table_id').notNull(),
  userId: int('user_id').notNull(),
  customerId: int('customer_id'),
  servedBy: varchar('served_by', { length: 100 }).notNull().default(''),
  status: orderStatusEnum.notNull().default('draft'),
  kitchenStatus: mysqlEnum('kitchen_status', ['pending', 'cooking', 'ready', 'served']).notNull().default('pending'),
  cookingStartedAt: datetime('cooking_started_at'),
  readyAt: datetime('ready_at'),
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
  customerIdIdx: index('idx_orders_customer_id').on(table.customerId),
  statusIdx: index('idx_orders_status').on(table.status),
  kitchenStatusIdx: index('idx_orders_kitchen_status').on(table.kitchenStatus),
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

export const ingredients = mysqlTable('ingredients', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).notNull().default('0'),
  minStock: decimal('min_stock', { precision: 10, scale: 2 }).notNull().default('0'),
  costPerUnit: int('cost_per_unit').notNull().default(0),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  nameIdx: index('idx_ingredients_name').on(table.name),
}));

export const recipes = mysqlTable('recipes', {
  id: serial('id').primaryKey(),
  menuId: int('menu_id').notNull(),
  ingredientId: int('ingredient_id').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  menuIdx: index('idx_recipes_menu_id').on(table.menuId),
  ingredientIdx: index('idx_recipes_ingredient_id').on(table.ingredientId),
}));

export const stockMovements = mysqlTable('stock_movements', {
  id: serial('id').primaryKey(),
  ingredientId: int('ingredient_id').notNull(),
  type: mysqlEnum('type', ['in', 'out', 'adjustment', 'waste']).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  stockBefore: decimal('stock_before', { precision: 10, scale: 2 }),
  stockAfter: decimal('stock_after', { precision: 10, scale: 2 }),
  reason: varchar('reason', { length: 255 }),
  referenceId: int('reference_id'),
  userId: int('user_id'),
  createdAt: datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  ingredientIdx: index('idx_stock_movements_ingredient_id').on(table.ingredientId),
  createdAtIdx: index('idx_stock_movements_created_at').on(table.createdAt),
}));

export const customers = mysqlTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 500 }),
  birthDate: date('birth_date'),
  totalSpent: int('total_spent').notNull().default(0),
  totalVisits: int('total_visits').notNull().default(0),
  loyaltyPoints: int('loyalty_points').notNull().default(0),
  tier: mysqlEnum('tier', ['regular', 'silver', 'gold']).notNull().default('regular'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  phoneIdx: index('idx_customers_phone').on(table.phone),
  tierIdx: index('idx_customers_tier').on(table.tier),
}));

export const loyaltyTransactions = mysqlTable('loyalty_transactions', {
  id: serial('id').primaryKey(),
  customerId: int('customer_id').notNull(),
  type: mysqlEnum('type', ['earn', 'redeem']).notNull(),
  points: int('points').notNull(),
  referenceId: int('reference_id'),
  reason: varchar('reason', { length: 255 }),
  createdAt: datetime('created_at').notNull().default(new Date()),
}, (table) => ({
  customerIdx: index('idx_loyalty_customer_id').on(table.customerId),
  createdAtIdx: index('idx_loyalty_created_at').on(table.createdAt),
}));

export const businessSettings = mysqlTable('business_settings', {
  id: serial('id').primaryKey(),
  businessName: varchar('business_name', { length: 255 }).notNull().default('My Restaurant'),
  businessTagline: varchar('business_tagline', { length: 255 }).default(''),
  address: varchar('address', { length: 500 }).default(''),
  phone: varchar('phone', { length: 20 }).default(''),
  email: varchar('email', { length: 255 }).default(''),
  logo: varchar('logo', { length: 500 }).default(''),
  currency: varchar('currency', { length: 10 }).notNull().default('IDR'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Jakarta'),
  language: varchar('language', { length: 10 }).notNull().default('id'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
});

export const taxSettings = mysqlTable('tax_settings', {
  id: serial('id').primaryKey(),
  taxName: varchar('tax_name', { length: 50 }).notNull().default('Pajak'),
  taxPercentage: decimal('tax_percentage', { precision: 5, scale: 2 }).notNull().default('10.00'),
  taxType: mysqlEnum('tax_type', ['exclusive', 'inclusive']).notNull().default('exclusive'),
  isTaxEnabled: boolean('is_tax_enabled').notNull().default(true),
  updatedAt: datetime('updated_at'),
});

export const paymentMethods = mysqlTable('payment_methods', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 100 }).default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: datetime('created_at').notNull().default(new Date()),
});

export const receiptSettings = mysqlTable('receipt_settings', {
  id: serial('id').primaryKey(),
  paperSize: mysqlEnum('paper_size', ['58mm', '80mm']).notNull().default('80mm'),
  headerText: varchar('header_text', { length: 500 }).default(''),
  footerText: varchar('footer_text', { length: 500 }).default('Terima kasih atas kunjungan Anda!'),
  showBusinessName: boolean('show_business_name').notNull().default(true),
  showAddress: boolean('show_address').notNull().default(true),
  showPhone: boolean('show_phone').notNull().default(true),
  showCashierName: boolean('show_cashier_name').notNull().default(true),
  showTableNumber: boolean('show_table_number').notNull().default(true),
  showOrderTime: boolean('show_order_time').notNull().default(true),
  showTaxBreakdown: boolean('show_tax_breakdown').notNull().default(true),
  showThankYouMessage: boolean('show_thank_you').notNull().default(true),
  receiptPrefix: varchar('receipt_prefix', { length: 20 }).default('INV'),
  receiptSuffix: varchar('receipt_suffix', { length: 20 }).default(''),
  nextReceiptNumber: int('next_receipt_number').notNull().default(1),
  updatedAt: datetime('updated_at'),
});

export const operatingHours = mysqlTable('operating_hours', {
  id: serial('id').primaryKey(),
  dayOfWeek: int('day_of_week').notNull(),
  openTime: varchar('open_time', { length: 5 }).notNull().default('09:00'),
  closeTime: varchar('close_time', { length: 5 }).notNull().default('22:00'),
  isOpen: boolean('is_open').notNull().default(true),
});

export const suppliers = mysqlTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 100 }).default(''),
  phone: varchar('phone', { length: 20 }).default(''),
  email: varchar('email', { length: 255 }).default(''),
  address: varchar('address', { length: 500 }).default(''),
  category: varchar('category', { length: 100 }).default(''),
  notes: varchar('notes', { length: 500 }).default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  nameIdx: index('idx_suppliers_name').on(table.name),
}));

export const purchaseOrders = mysqlTable('purchase_orders', {
  id: serial('id').primaryKey(),
  poNumber: varchar('po_number', { length: 50 }).notNull().unique(),
  supplierId: int('supplier_id').notNull(),
  orderDate: datetime('order_date').notNull().default(new Date()),
  expectedDeliveryDate: datetime('expected_delivery_date'),
  status: mysqlEnum('status', ['draft', 'ordered', 'received', 'cancelled']).notNull().default('draft'),
  subtotal: int('subtotal').notNull().default(0),
  notes: varchar('notes', { length: 500 }).default(''),
  receivedDate: datetime('received_date'),
  receivedBy: int('received_by'),
  createdBy: int('created_by').notNull(),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  supplierIdIdx: index('idx_po_supplier_id').on(table.supplierId),
  statusIdx: index('idx_po_status').on(table.status),
  orderDateIdx: index('idx_po_order_date').on(table.orderDate),
}));

export const purchaseOrderItems = mysqlTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  poId: int('po_id').notNull(),
  ingredientId: int('ingredient_id').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  unitPrice: int('unit_price').notNull(),
  totalPrice: int('total_price').notNull(),
  quantityReceived: decimal('quantity_received', { precision: 10, scale: 2 }).default('0'),
  notes: varchar('notes', { length: 255 }).default(''),
}, (table) => ({
  poIdIdx: index('idx_poi_po_id').on(table.poId),
  ingredientIdIdx: index('idx_poi_ingredient_id').on(table.ingredientId),
}));

export const supplierPrices = mysqlTable('supplier_prices', {
  id: serial('id').primaryKey(),
  supplierId: int('supplier_id').notNull(),
  ingredientId: int('ingredient_id').notNull(),
  price: int('price').notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  lastOrderedAt: datetime('last_ordered_at').notNull().default(new Date()),
}, (table) => ({
  supplierIngredientIdx: index('idx_sp_supplier_ingredient').on(table.supplierId, table.ingredientId),
}));

export const employeeProfiles = mysqlTable('employee_profiles', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull().unique(),
  position: varchar('position', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).default(''),
  salary: int('salary').notNull().default(0),
  hireDate: datetime('hire_date').notNull().default(new Date()),
  emergencyContact: varchar('emergency_contact', { length: 255 }).default(''),
  notes: varchar('notes', { length: 500 }).default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at'),
}, (table) => ({
  userIdIdx: index('idx_emp_user_id').on(table.userId),
  positionIdx: index('idx_emp_position').on(table.position),
}));

export const shifts = mysqlTable('shifts', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(),
  openedAt: datetime('opened_at').notNull().default(new Date()),
  closedAt: datetime('closed_at'),
  startingCash: int('starting_cash').notNull().default(0),
  expectedCash: int('expected_cash'),
  actualCash: int('actual_cash'),
  cashDifference: int('cash_difference'),
  notes: varchar('notes', { length: 500 }).default(''),
  status: mysqlEnum('status', ['open', 'closed']).notNull().default('open'),
  closedBy: int('closed_by'),
}, (table) => ({
  userIdIdx: index('idx_shifts_user_id').on(table.userId),
  statusIdx: index('idx_shifts_status').on(table.status),
  openedAtIdx: index('idx_shifts_opened_at').on(table.openedAt),
}));

export const attendance = mysqlTable('attendance', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull(),
  clockIn: datetime('clock_in').notNull().default(new Date()),
  clockOut: datetime('clock_out'),
  totalHours: decimal('total_hours', { precision: 5, scale: 2 }),
  notes: varchar('notes', { length: 255 }).default(''),
  status: mysqlEnum('status', ['present', 'late', 'absent', 'leave', 'sick']).notNull().default('present'),
}, (table) => ({
  userIdIdx: index('idx_attendance_user_id').on(table.userId),
  clockInIdx: index('idx_attendance_clock_in').on(table.clockIn),
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
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type NewLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type NewBusinessSettings = typeof businessSettings.$inferInsert;
export type TaxSettings = typeof taxSettings.$inferSelect;
export type NewTaxSettings = typeof taxSettings.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
export type ReceiptSettings = typeof receiptSettings.$inferSelect;
export type NewReceiptSettings = typeof receiptSettings.$inferInsert;
export type OperatingHour = typeof operatingHours.$inferSelect;
export type NewOperatingHour = typeof operatingHours.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type NewSupplierPrice = typeof supplierPrices.$inferInsert;
export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfiles.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;