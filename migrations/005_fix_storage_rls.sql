-- =============================================================================
-- CORRECCIÓN RLS STORAGE — el rol se lee de app_metadata, no de user_metadata
-- =============================================================================
--
-- PROBLEMA
-- --------
-- Las políticas de storage de 004_product_lifecycle_and_storage.sql validaban:
--
--     (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
--
-- Pero 004_fix_rls_privilege_escalation.sql movió el rol a `app_metadata`
-- (raw_app_meta_data, solo escribible por service_role) y limpió user_metadata.
-- Resultado: subir una imagen hace INSERT en storage.objects, el WITH CHECK
-- lee user_metadata.role = NULL y Postgres rechaza con:
--
--     new row violates row-level security policy
--
-- SOLUCIÓN
-- --------
-- Recrear las políticas de storage usando public.auth_role() (app_metadata).
-- También se dropean las políticas viejas que usen user_metadata, incluidas
-- las que pudieran haber quedado de una versión anterior del fix.
-- =============================================================================

-- Limpieza de políticas (por si existen con cualquiera de los dos esquemas)
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "product_images_read_public" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete_admin" ON storage.objects;

-- Lectura pública
CREATE POLICY "product_images_read_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- Insert (subir): rol admin desde app_metadata
CREATE POLICY "product_images_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND public.auth_role() = 'admin'
  );

-- Update (reemplazar)
CREATE POLICY "product_images_update_admin"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND public.auth_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND public.auth_role() = 'admin'
  );

-- Delete (quitar imagen)
CREATE POLICY "product_images_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND name LIKE 'items/%'
    AND public.auth_role() = 'admin'
  );

-- VERIFICACIÓN: no debe quedar ninguna política de storage mirando user_metadata.
--
--   SELECT policyname, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'storage'
--     AND tablename = 'objects'
--     AND (qual::text LIKE '%user_metadata%' OR with_check::text LIKE '%user_metadata%');
--
-- Debe devolver 0 filas.
