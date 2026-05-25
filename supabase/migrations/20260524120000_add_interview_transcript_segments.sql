ALTER TABLE public.project_interviews
ADD COLUMN IF NOT EXISTS transcript_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS transcript_generated_at TIMESTAMPTZ;
