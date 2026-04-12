-- Add customer_id column to orders table
-- This allows tracking which customer made an order for loyalty points
ALTER TABLE orders ADD COLUMN customer_id INT NULL AFTER user_id;

-- Add index for faster customer order lookups
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Optional: Add foreign key constraint (uncomment if customers table exists)
-- ALTER TABLE orders ADD CONSTRAINT fk_orders_customer 
-- FOREIGN KEY (customer_id) REFERENCES customers(id) 
-- ON DELETE SET NULL;
