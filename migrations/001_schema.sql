-- Tucson database schema
-- Run this in Supabase SQL Editor

-- 1. TABLES

CREATE TABLE branches (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE
);

CREATE TABLE categories (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  image     TEXT,
  name      JSONB NOT NULL
);

CREATE TABLE subcategories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        JSONB NOT NULL,
  description JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE items (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subcategory_id BIGINT NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  name           JSONB NOT NULL,
  description    JSONB NOT NULL,
  price          INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'ARS',
  ingredients    JSONB NOT NULL DEFAULT '{}',
  allergens      TEXT[] NOT NULL DEFAULT '{}',
  diet_tags      TEXT[] NOT NULL DEFAULT '{}',
  spicy          BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE item_availability (
  item_id   BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  available BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (item_id, branch_id)
);

-- 2. ROW LEVEL SECURITY

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_availability ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES
-- auth.jwt() -> 'user_metadata' extracts the user metadata from the JWT
-- This avoids querying auth.users which requires elevated privileges.

-- Branches: public read, admin write
CREATE POLICY "branches_read_all" ON branches FOR SELECT USING (true);
CREATE POLICY "branches_write_admin" ON branches FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Categories: public read, admin write
CREATE POLICY "categories_read_all" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_write_admin" ON categories FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Subcategories: public read, admin write
CREATE POLICY "subcategories_read_all" ON subcategories FOR SELECT USING (true);
CREATE POLICY "subcategories_write_admin" ON subcategories FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Items: public read, admin write
CREATE POLICY "items_read_all" ON items FOR SELECT USING (true);
CREATE POLICY "items_write_admin" ON items FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Item availability:
--   - Public can read any
--   - Admin can write any
--   - Staff can read/write only rows matching their own branch_id
CREATE POLICY "availability_read_all" ON item_availability FOR SELECT USING (true);

CREATE POLICY "availability_write_admin" ON item_availability FOR ALL USING(
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "availability_write_staff" ON item_availability FOR ALL USING(
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
  AND branch_id = ((auth.jwt() -> 'user_metadata' ->> 'branch_id'))::bigint
);

-- 4. INDEXES

CREATE INDEX idx_subcategories_category ON subcategories(category_id);
CREATE INDEX idx_items_subcategory ON items(subcategory_id);
CREATE INDEX idx_availability_item ON item_availability(item_id);
CREATE INDEX idx_availability_branch ON item_availability(branch_id);

-- 5. PERMISSIONS (ensure service_role bypasses RLS)

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, anon, authenticated;
