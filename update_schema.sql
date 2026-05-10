-- RUN THIS IN SUPABASE SQL EDITOR TO FIX IMAGE UPLOADS
-- Adds missing columns to network_properties table to match Android model

ALTER TABLE public.network_properties 
ADD COLUMN IF NOT EXISTS image_urls TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS is_photos_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_location_exact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS public_location TEXT,
ADD COLUMN IF NOT EXISTS public_location_radius TEXT DEFAULT '200.0';

-- Refresh the view to include new columns
CREATE OR REPLACE VIEW public.network_properties_view AS
SELECT 
  p.*,
  u.name AS owner_name,
  u.phone AS owner_phone,
  u.firm_name AS owner_firm_name
FROM public.network_properties p
LEFT JOIN public.network_users u ON p.owner_id = u.id;
