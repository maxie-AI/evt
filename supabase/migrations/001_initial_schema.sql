-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extractions table
CREATE TABLE IF NOT EXISTS extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Create export_jobs table
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_id UUID NOT NULL REFERENCES extractions(id) ON DELETE CASCADE,
  format VARCHAR(10) NOT NULL CHECK (format IN ('txt', 'srt', 'vtt', 'json')),
  file_path TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_extractions_user_id ON extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_extractions_status ON extractions(status);
CREATE INDEX IF NOT EXISTS idx_extractions_created_at ON extractions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_extraction_id ON export_jobs(extraction_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Create RLS policies for extractions table
CREATE POLICY "Users can view own extractions" ON extractions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own extractions" ON extractions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own extractions" ON extractions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own extractions" ON extractions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for export_jobs table
CREATE POLICY "Users can view own export jobs" ON export_jobs
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own export jobs" ON export_jobs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own export jobs" ON export_jobs
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own export jobs" ON export_jobs
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for subscriptions table
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extractions_updated_at BEFORE UPDATE ON extractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_jobs_updated_at BEFORE UPDATE ON export_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO users (id, email, password_hash, full_name, subscription_tier) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'demo@example.com', '$2b$10$example.hash.here', 'Demo User', 'pro'),
  ('550e8400-e29b-41d4-a716-446655440001', 'test@example.com', '$2b$10$example.hash.here', 'Test User', 'free')
ON CONFLICT (email) DO NOTHING;

-- Insert sample extractions
INSERT INTO extractions (id, user_id, video_url, video_platform, video_title, video_duration, transcript_text, status) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'Sample YouTube Video', 212, 'This is a sample transcript text for testing purposes.', 'completed'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'https://www.bilibili.com/video/BV1234567890', 'bilibili', 'Sample Bilibili Video', 180, 'Another sample transcript for testing.', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON users TO anon, authenticated;
GRANT ALL PRIVILEGES ON users TO authenticated;

GRANT SELECT ON extractions TO anon, authenticated;
GRANT ALL PRIVILEGES ON extractions TO authenticated;

GRANT SELECT ON export_jobs TO anon, authenticated;
GRANT ALL PRIVILEGES ON export_jobs TO authenticated;

GRANT SELECT ON subscriptions TO anon, authenticated;
GRANT ALL PRIVILEGES ON subscriptions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;