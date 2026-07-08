-- Migration: add status timestamp columns to orders table
-- Run this in the Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS preparing_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivering_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ;
