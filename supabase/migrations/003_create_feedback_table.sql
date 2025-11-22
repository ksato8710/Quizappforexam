-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
  subject TEXT,
  message TEXT NOT NULL,
  page_context TEXT,
  quiz_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'closed'))
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can view all feedback (for admin purposes)
CREATE POLICY "Service role can view all feedback"
  ON feedback
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Service role can update feedback status (for admin purposes)
CREATE POLICY "Service role can update feedback"
  ON feedback
  FOR UPDATE
  TO service_role
  USING (true);
