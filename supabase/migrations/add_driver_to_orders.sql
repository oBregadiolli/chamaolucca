-- Migration: add driver columns to orders table
-- Run this in the Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS driver_id    UUID REFERENCES drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS driver_name  TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT;

-- Index for quick lookup of orders by driver
CREATE INDEX IF NOT EXISTS orders_driver_id_idx ON orders(driver_id);
