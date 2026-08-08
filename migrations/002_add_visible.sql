-- Add visible column to item_availability
ALTER TABLE item_availability ADD COLUMN visible BOOLEAN NOT NULL DEFAULT true;

-- Update RLS: staff can update visible too
DROP POLICY IF EXISTS "availability_write_staff" ON item_availability;
CREATE POLICY "availability_write_staff" ON item_availability FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff'
  AND branch_id = ((auth.jwt() -> 'user_metadata' ->> 'branch_id'))::bigint
);
  