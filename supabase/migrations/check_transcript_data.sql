-- Check all extractions to see what data exists
SELECT 
  id,
  video_title,
  status,
  LENGTH(transcript_text) as transcript_length,
  created_at
FROM extractions 
ORDER BY created_at DESC
LIMIT 10;

-- Check if there are any extractions with similar patterns
SELECT 
  id,
  video_title,
  status,
  created_at
FROM extractions 
WHERE video_title ILIKE '%guest%' OR id::text ILIKE '%guest%'
ORDER BY created_at DESC;