-- Migration: Add Large Movement Alerts Feature
-- This adds support for alerting Pro users when TSLA moves 10%+ in a day

-- Add large_movement_alert_enabled column to alert_settings
ALTER TABLE public.alert_settings 
ADD COLUMN IF NOT EXISTS large_movement_alert_enabled BOOLEAN DEFAULT FALSE;

-- Update the alert_history check constraint to include 'large_movement' alert type
-- First, drop the existing constraint
ALTER TABLE public.alert_history 
DROP CONSTRAINT IF EXISTS alert_history_alert_type_check;

-- Add the updated constraint with the new alert type
ALTER TABLE public.alert_history 
ADD CONSTRAINT alert_history_alert_type_check 
CHECK (alert_type IN ('price_high', 'price_low', 'valuation_change', 'daily_digest', 'large_movement'));

-- Add a column to track the last price we checked (to avoid duplicate alerts)
ALTER TABLE public.alert_settings 
ADD COLUMN IF NOT EXISTS last_price_checked DECIMAL(10, 2);

-- Add a column to track when we last sent a large movement alert (to prevent spam)
ALTER TABLE public.alert_settings 
ADD COLUMN IF NOT EXISTS last_large_movement_alert_at TIMESTAMPTZ;


