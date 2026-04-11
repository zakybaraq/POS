ALTER TABLE stock_movements
ADD COLUMN stock_before DECIMAL(10,2) NULL AFTER quantity,
ADD COLUMN stock_after DECIMAL(10,2) NULL AFTER stock_before;

UPDATE stock_movements
SET stock_before = quantity,
    stock_after = CASE
        WHEN type = 'in' THEN quantity * 2
        WHEN type IN ('out', 'waste') THEN 0
        ELSE quantity
    END
WHERE stock_before IS NULL;
