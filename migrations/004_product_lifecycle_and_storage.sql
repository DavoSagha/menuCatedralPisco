-- Product lifecycle and Supabase Storage support.
-- Apply after 001_schema.sql, 002_add_visible.sql and 003_add_item_image.sql.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- NOT VALID keeps this migration compatible with historical rows while enforcing
-- non-negative prices for every new insert/update immediately.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'items_price_nonnegative'
      AND conrelid = 'public.items'::regclass
  ) THEN
    ALTER TABLE public.items
      ADD CONSTRAINT items_price_nonnegative CHECK (price >= 0) NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_items_active_subcategory
  ON public.items(subcategory_id, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_deleted_at
  ON public.items(deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

-- Anonymous users and regular authenticated users must never receive deleted
-- products. The existing items_write_admin FOR ALL policy still lets admins read
-- and restore them.
DROP POLICY IF EXISTS "items_read_all" ON public.items;
DROP POLICY IF EXISTS "items_read_active" ON public.items;
CREATE POLICY "items_read_active"
  ON public.items
  FOR SELECT
  USING (deleted_at IS NULL);

-- Creates the item and its state for every existing branch atomically. Category
-- is deliberately absent: it is derived through the selected subcategory FK.
CREATE OR REPLACE FUNCTION public.create_dish_with_availability(
  p_subcategory_id BIGINT,
  p_name JSONB,
  p_description JSONB,
  p_price INTEGER,
  p_currency TEXT,
  p_ingredients JSONB,
  p_allergens TEXT[],
  p_diet_tags TEXT[],
  p_spicy BOOLEAN,
  p_image TEXT,
  p_visible BOOLEAN,
  p_available BOOLEAN
)
RETURNS public.items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  created_item public.items;
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subcategories WHERE id = p_subcategory_id
  ) THEN
    RAISE EXCEPTION 'Invalid subcategory' USING ERRCODE = '23503';
  END IF;

  IF p_name IS NULL OR jsonb_typeof(p_name) <> 'object' OR p_name = '{}'::jsonb THEN
    RAISE EXCEPTION 'Name is required' USING ERRCODE = '23514';
  END IF;

  IF p_description IS NULL OR jsonb_typeof(p_description) <> 'object' THEN
    RAISE EXCEPTION 'Description must be a JSON object' USING ERRCODE = '23514';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Price must be non-negative' USING ERRCODE = '23514';
  END IF;

  IF p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Currency must be a three-letter code' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.items (
    subcategory_id,
    name,
    description,
    price,
    currency,
    ingredients,
    allergens,
    diet_tags,
    spicy,
    image
  ) VALUES (
    p_subcategory_id,
    p_name,
    p_description,
    p_price,
    p_currency,
    COALESCE(p_ingredients, '[]'::jsonb),
    COALESCE(p_allergens, '{}'::text[]),
    COALESCE(p_diet_tags, '{}'::text[]),
    COALESCE(p_spicy, false),
    NULLIF(BTRIM(p_image), '')
  )
  RETURNING * INTO created_item;

  INSERT INTO public.item_availability (item_id, branch_id, available, visible)
  SELECT created_item.id, branch.id, COALESCE(p_available, true), COALESCE(p_visible, true)
  FROM public.branches AS branch;

  RETURN created_item;
END
$$;

REVOKE ALL ON FUNCTION public.create_dish_with_availability(
  BIGINT, JSONB, JSONB, INTEGER, TEXT, JSONB, TEXT[], TEXT[], BOOLEAN, TEXT, BOOLEAN, BOOLEAN
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dish_with_availability(
  BIGINT, JSONB, JSONB, INTEGER, TEXT, JSONB, TEXT[], TEXT[], BOOLEAN, TEXT, BOOLEAN, BOOLEAN
) TO authenticated;

-- Product images stay outside Postgres. items.image stores the object path; old
-- absolute URLs remain valid and are resolved unchanged by the frontend.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_read_public" ON storage.objects;
CREATE POLICY "product_images_read_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_insert_admin" ON storage.objects;
CREATE POLICY "product_images_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "product_images_update_admin" ON storage.objects;
CREATE POLICY "product_images_update_admin"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "product_images_delete_admin" ON storage.objects;
CREATE POLICY "product_images_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
