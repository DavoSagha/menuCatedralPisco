-- =============================================================================
-- CORRECCIÓN DE SEGURIDAD CRÍTICA — escalación de privilegios
-- =============================================================================
--
-- PROBLEMA
-- --------
-- Las políticas de 001 y 002 autorizan leyendo `user_metadata` del JWT:
--
--     (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
--
-- En Supabase, `user_metadata` (raw_user_meta_data) es ESCRIBIBLE POR EL
-- PROPIO USUARIO. Cualquiera con una sesión válida puede ejecutar desde el
-- navegador, con la anon key que ya viaja en el bundle:
--
--     await supabase.auth.updateUser({ data: { role: 'admin' } })
--
-- Al refrescarse el token, el JWT sale con user_metadata.role = 'admin' y esa
-- persona pasa a tener escritura total sobre branches, categories,
-- subcategories, items e item_availability. Es un takeover completo de la base
-- desde cualquier cuenta registrada.
--
-- SOLUCIÓN
-- --------
-- Usar `app_metadata` (raw_app_meta_data), que SOLO puede escribir la
-- service_role y nunca el usuario. También viaja en el JWT, así que no hace
-- falta consultar auth.users desde las políticas.
--
-- MIGRACIÓN DE DATOS REQUERIDA (paso manual, ver el bloque final)
-- ---------------------------------------------------------------
-- Los roles existentes viven hoy en user_metadata. Hay que copiarlos a
-- app_metadata ANTES de aplicar las políticas nuevas, o los admins actuales
-- pierden el acceso.
-- =============================================================================


-- 1. PASO PREVIO: copiar roles de user_metadata a app_metadata
--    Requiere service_role (ejecutar desde el SQL Editor de Supabase, que ya
--    corre con privilegios elevados).

UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'role',      raw_user_meta_data ->> 'role',
       'branch_id', raw_user_meta_data ->> 'branch_id'
     ))
WHERE raw_user_meta_data ->> 'role' IN ('admin', 'staff');


-- 2. Limpiar el rol de user_metadata para que no quede una fuente de verdad
--    paralela y editable por el usuario.

UPDATE auth.users
SET raw_user_meta_data = (raw_user_meta_data - 'role' - 'branch_id')
WHERE raw_user_meta_data ? 'role' OR raw_user_meta_data ? 'branch_id';


-- 3. Helpers: leen SIEMPRE de app_metadata.

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

CREATE OR REPLACE FUNCTION public.auth_branch_id()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'branch_id', '')::bigint;
$$;


-- 4. Rehacer todas las políticas de escritura sobre app_metadata.
--    WITH CHECK explícito: sin él, Postgres reutiliza USING para el INSERT,
--    pero dejarlo escrito evita sorpresas si alguien edita la política.

DROP POLICY IF EXISTS "branches_write_admin" ON branches;
CREATE POLICY "branches_write_admin" ON branches FOR ALL
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

DROP POLICY IF EXISTS "categories_write_admin" ON categories;
CREATE POLICY "categories_write_admin" ON categories FOR ALL
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

DROP POLICY IF EXISTS "subcategories_write_admin" ON subcategories;
CREATE POLICY "subcategories_write_admin" ON subcategories FOR ALL
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

DROP POLICY IF EXISTS "items_write_admin" ON items;
CREATE POLICY "items_write_admin" ON items FOR ALL
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

DROP POLICY IF EXISTS "availability_write_admin" ON item_availability;
CREATE POLICY "availability_write_admin" ON item_availability FOR ALL
  USING (public.auth_role() = 'admin')
  WITH CHECK (public.auth_role() = 'admin');

DROP POLICY IF EXISTS "availability_write_staff" ON item_availability;
CREATE POLICY "availability_write_staff" ON item_availability FOR ALL
  USING (
    public.auth_role() = 'staff'
    AND branch_id = public.auth_branch_id()
  )
  WITH CHECK (
    public.auth_role() = 'staff'
    AND branch_id = public.auth_branch_id()
  );


-- 5. VERIFICACIÓN — no debe quedar ninguna política mirando user_metadata.
--
--   SELECT tablename, policyname, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND (qual::text LIKE '%user_metadata%' OR with_check::text LIKE '%user_metadata%');
--
-- Debe devolver 0 filas.


-- 6. ASIGNAR ROLES DE AHORA EN ADELANTE
--
-- Nunca desde el cliente. Solo con service_role, por ejemplo:
--
--   await admin.auth.admin.updateUserById(userId, {
--     app_metadata: { role: 'staff', branch_id: 2 },
--   })
--
-- o directo en SQL desde el editor de Supabase:
--
--   UPDATE auth.users
--   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
--                           || '{"role":"staff","branch_id":2}'::jsonb
--   WHERE email = 'persona@tucson.com';
--
-- El usuario debe cerrar y volver a abrir sesión para recibir el JWT nuevo.
