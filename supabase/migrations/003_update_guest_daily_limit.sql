-- Update guest daily limit from 5 to 100
CREATE OR REPLACE FUNCTION check_guest_usage(p_ip_address INET)
RETURNS TABLE(
  can_extract BOOLEAN,
  remaining_extractions INTEGER,
  reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_usage INTEGER := 0;
  daily_limit INTEGER := 100;
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
    (current_usage < daily_limit) as can_extract,
    GREATEST(0, daily_limit - current_usage) as remaining_extractions,
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE as reset_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the updated function
GRANT EXECUTE ON FUNCTION check_guest_usage(INET) TO anon, authenticated;