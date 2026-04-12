-- Migration: Add customer_id to orders table
-- Run this SQL in your MySQL database

-- Add customer_id column to orders table
ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER user_id;

-- Add index for faster customer order lookups
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
