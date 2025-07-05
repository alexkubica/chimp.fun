-- Create activity_type enum
CREATE TYPE activity_type AS ENUM ('generation', 'download', 'copy', 'share');

-- Create output_type enum
CREATE TYPE output_type AS ENUM ('gif', 'mp4', 'image');

-- Create editor_activities table
CREATE TABLE editor_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_wallet TEXT NULL,
    session_id TEXT NOT NULL,
    activity_type activity_type NOT NULL,
    nft_collection TEXT NULL,
    nft_token_id TEXT NULL,
    nft_image_url TEXT NULL,
    reaction_type TEXT NULL,
    output_type output_type NOT NULL,
    output_url TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_editor_activities_user_wallet ON editor_activities(user_wallet);
CREATE INDEX idx_editor_activities_session_id ON editor_activities(session_id);
CREATE INDEX idx_editor_activities_activity_type ON editor_activities(activity_type);
CREATE INDEX idx_editor_activities_created_at ON editor_activities(created_at DESC);
CREATE INDEX idx_editor_activities_nft_collection ON editor_activities(nft_collection);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_editor_activities_updated_at
    BEFORE UPDATE ON editor_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE editor_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (allowing read access for all, write access for authenticated users)
CREATE POLICY "Allow read access for all users" ON editor_activities
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for all users" ON editor_activities
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for session or wallet owner" ON editor_activities
    FOR UPDATE USING (
        session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
        OR user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
    );

CREATE POLICY "Allow delete for session or wallet owner" ON editor_activities
    FOR DELETE USING (
        session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
        OR user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet'
    );