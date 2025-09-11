-- Add guest_usage table for tracking IP-based usage
CREATE TABLE IF NOT EXISTS guest_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  extraction_count INTEGER DEFAULT 0,
  last_extraction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ip_address, usage_date)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_guest_usage_ip_date ON guest_usage(ip_address, usage_date);
CREATE INDEX IF NOT EXISTS idx_guest_usage_date ON guest_usage(usage_date);

-- Enable Row Level Security (RLS)
ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for guest_usage table (allow all operations for service role)
CREATE POLICY "Allow all operations on guest_usage" ON guest_usage
  FOR ALL USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_guest_usage_updated_at BEFORE UPDATE ON guest_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON guest_usage TO anon, authenticated;

-- Add guest_extractions table to track guest extractions separately
CREATE TABLE IF NOT EXISTS guest_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL,
  video_url TEXT NOT NULL,
  video_platform VARCHAR(20) NOT NULL CHECK (video_platform IN ('youtube', 'bilibili', 'redbook')),
  video_title VARCHAR(500),
  video_duration INTEGER, -- in seconds
  video_thumbnail TEXT,
  transcript_text TEXT,
  transcript_segments JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for guest_extractions
CREATE INDEX IF NOT EXISTS idx_guest_extractions_ip ON guest_extractions(ip_address);
CREATE INDEX IF NOT EXISTS idx_guest_extractions_status ON guest_extractions(status);
CREATE INDEX IF NOT EXISTS idx_guest_extractions_created_at ON guest_extractions(created_at DESC);

-- Enable Row Level Security (RLS) for guest_extractions
ALTER TABLE guest_extractions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for guest_extractions table
CREATE POLICY "Allow all operations on guest_extractions" ON guest_extractions
  FOR ALL USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_guest_extractions_updated_at BEFORE UPDATE ON guest_extractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON guest_extractions TO anon, authenticated;

-- Function to check and update guest usage
CREATE OR REPLACE FUNCTION check_guest_usage(p_ip_address INET)
RETURNS TABLE(
  can_extract BOOLEAN,
  remaining_extractions INTEGER,
  reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_usage INTEGER := 0;
  daily_limit INTEGER := 1;
  usage_record RECORD;
BEGIN
  -- Get or create usage record for today
  SELECT * INTO usage_record
  FROM guest_usage
  WHERE ip_address = p_ip_address AND usage_date = CURRENT_DATE;
  
  IF NOT FOUND THEN
    -- Create new usage record
    INSERT INTO guest_usage (ip_address, usage_date, extraction_count)
    VALUES (p_ip_address, CURRENT_DATE, 0)
    RETURNING * INTO usage_record;
  END IF;
  
  current_usage := COALESCE(usage_record.extraction_count, 0);
  
  RETURN QUERY SELECT
    (current_usage < daily_limit) AS can_extract,
    GREATEST(0, daily_limit - current_usage) AS remaining_extractions,
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE AS reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment guest usage
CREATE OR REPLACE FUNCTION increment_guest_usage(p_ip_address INET)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER := 0;
  daily_limit INTEGER := 1;
BEGIN
  -- Get current usage
  SELECT COALESCE(extraction_count, 0) INTO current_usage
  FROM guest_usage
  WHERE ip_address = p_ip_address AND usage_date = CURRENT_DATE;
  
  -- Check if limit exceeded
  IF current_usage >= daily_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update usage record
  INSERT INTO guest_usage (ip_address, usage_date, extraction_count, last_extraction_at)
  VALUES (p_ip_address, CURRENT_DATE, 1, NOW())
  ON CONFLICT (ip_address, usage_date)
  DO UPDATE SET
    extraction_count = guest_usage.extraction_count + 1,
    last_extraction_at = NOW(),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_guest_usage(INET) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_guest_usage(INET) TO anon, authenticated;