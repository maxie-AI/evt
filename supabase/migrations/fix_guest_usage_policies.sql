-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon users to manage guest usage" ON guest_usage;
DROP POLICY IF EXISTS "Allow authenticated users to read guest usage" ON guest_usage;

-- Grant basic permissions
GRANT ALL ON guest_usage TO anon;
GRANT ALL ON guest_usage TO authenticated;

-- Create simple policies that allow all operations
CREATE POLICY "guest_usage_anon_policy" ON guest_usage
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "guest_usage_authenticated_policy" ON guest_usage
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);