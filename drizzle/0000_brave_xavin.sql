CREATE TABLE `audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`user_name` varchar(100) NOT NULL DEFAULT '',
	`action` varchar(100) NOT NULL,
	`details` varchar(500),
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.521',
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`business_name` varchar(255) NOT NULL DEFAULT 'My Restaurant',
	`business_tagline` varchar(255) DEFAULT '',
	`address` varchar(500) DEFAULT '',
	`phone` varchar(20) DEFAULT '',
	`email` varchar(255) DEFAULT '',
	`logo` varchar(500) DEFAULT '',
	`currency` varchar(10) NOT NULL DEFAULT 'IDR',
	`timezone` varchar(50) NOT NULL DEFAULT 'Asia/Jakarta',
	`language` varchar(10) NOT NULL DEFAULT 'id',
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.522',
	`updated_at` datetime,
	CONSTRAINT `business_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(255),
	`address` varchar(500),
	`birth_date` date,
	`total_spent` int NOT NULL DEFAULT 0,
	`total_visits` int NOT NULL DEFAULT 0,
	`loyalty_points` int NOT NULL DEFAULT 0,
	`tier` enum('regular','silver','gold') NOT NULL DEFAULT 'regular',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.521',
	`updated_at` datetime,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`current_stock` decimal(10,2) NOT NULL DEFAULT '0',
	`min_stock` decimal(10,2) NOT NULL DEFAULT '0',
	`cost_per_unit` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.521',
	`updated_at` datetime,
	CONSTRAINT `ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`type` enum('earn','redeem') NOT NULL,
	`points` int NOT NULL,
	`reference_id` int,
	`reason` varchar(255),
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.522',
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` int NOT NULL,
	`description` varchar(500) DEFAULT '',
	`category` enum('makanan','minuman') NOT NULL,
	`is_available` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.521',
	CONSTRAINT `menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operating_hours` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`day_of_week` int NOT NULL,
	`open_time` varchar(5) NOT NULL DEFAULT '09:00',
	`close_time` varchar(5) NOT NULL DEFAULT '22:00',
	`is_open` boolean NOT NULL DEFAULT true,
	CONSTRAINT `operating_hours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`menu_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`price_at_order` int NOT NULL,
	`notes` varchar(255) DEFAULT '',
	`item_status` enum('pending','cooking','ready','served') NOT NULL DEFAULT 'pending',
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`table_id` int NOT NULL,
	`user_id` int NOT NULL,
	`served_by` varchar(100) NOT NULL DEFAULT '',
	`order_status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`subtotal` int NOT NULL DEFAULT 0,
	`tax` int NOT NULL DEFAULT 0,
	`discount` int DEFAULT 0,
	`discount_type` enum('fixed','percentage') DEFAULT 'fixed',
	`notes` varchar(500),
	`total` int NOT NULL DEFAULT 0,
	`amount_paid` int,
	`change_due` int,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.521',
	`completed_at` datetime,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`icon` varchar(100) DEFAULT '',
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.522',
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `receipt_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`paper_size` enum('58mm','80mm') NOT NULL DEFAULT '80mm',
	`header_text` varchar(500) DEFAULT '',
	`footer_text` varchar(500) DEFAULT 'Terima kasih atas kunjungan Anda!',
	`show_business_name` boolean NOT NULL DEFAULT true,
	`show_address` boolean NOT NULL DEFAULT true,
	`show_phone` boolean NOT NULL DEFAULT true,
	`show_cashier_name` boolean NOT NULL DEFAULT true,
	`show_table_number` boolean NOT NULL DEFAULT true,
	`show_order_time` boolean NOT NULL DEFAULT true,
	`show_tax_breakdown` boolean NOT NULL DEFAULT true,
	`show_thank_you` boolean NOT NULL DEFAULT true,
	`receipt_prefix` varchar(20) DEFAULT 'INV',
	`receipt_suffix` varchar(20) DEFAULT '',
	`next_receipt_number` int NOT NULL DEFAULT 1,
	`updated_at` datetime,
	CONSTRAINT `receipt_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`menu_id` int NOT NULL,
	`ingredient_id` int NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	CONSTRAINT `recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`ingredient_id` int NOT NULL,
	`type` enum('in','out','adjustment','waste') NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`reason` varchar(255),
	`reference_id` int,
	`user_id` int,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.521',
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`table_number` int NOT NULL,
	`capacity` int DEFAULT 4,
	`area` enum('indoor','outdoor','vip') DEFAULT 'indoor',
	`table_status` enum('available','occupied') NOT NULL DEFAULT 'available',
	CONSTRAINT `tables_id` PRIMARY KEY(`id`),
	CONSTRAINT `tables_table_number_unique` UNIQUE(`table_number`)
);
--> statement-breakpoint
CREATE TABLE `tax_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`tax_name` varchar(50) NOT NULL DEFAULT 'Pajak',
	`tax_percentage` decimal(5,2) NOT NULL DEFAULT '10.00',
	`tax_type` enum('exclusive','inclusive') NOT NULL DEFAULT 'exclusive',
	`is_tax_enabled` boolean NOT NULL DEFAULT true,
	`updated_at` datetime,
	CONSTRAINT `tax_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`role` enum('super_admin','admin_restoran','kasir','waitress','chef') NOT NULL DEFAULT 'kasir',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2026-04-05 04:25:48.520',
	`updated_at` datetime,
	`last_login` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user_id` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_customers_phone` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_customers_tier` ON `customers` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_ingredients_name` ON `ingredients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_loyalty_customer_id` ON `loyalty_transactions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_loyalty_created_at` ON `loyalty_transactions` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_menus_category` ON `menus` (`category`);--> statement-breakpoint
CREATE INDEX `idx_menus_available` ON `menus` (`is_available`);--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_menu_id` ON `order_items` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_table_id` ON `orders` (`table_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_user_id` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`order_status`);--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_recipes_menu_id` ON `recipes` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_recipes_ingredient_id` ON `recipes` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_ingredient_id` ON `stock_movements` (`ingredient_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_created_at` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);