-- Fix permissions for guest_usage table
-- Grant permissions to anon and authenticated roles

-- Allow anon role to read and write guest_usage table
GRANT SELECT, INSERT, UPDATE ON guest_usage TO anon;
GRANT SELECT, INSERT, UPDATE ON guest_usage TO authenticated;

-- Create RLS policies for guest_usage table
-- Allow anon users to manage their own usage records based on IP
CREATE POLICY "Allow anon users to manage guest usage" ON guest_usage
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read guest usage data
CREATE POLICY "Allow authenticated users to read guest usage" ON guest_usage
  FOR SELECT USING (true);