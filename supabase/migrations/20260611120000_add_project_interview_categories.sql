ALTER TABLE public.project_interviews
ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_project_interviews_project_category
ON public.project_interviews(project_id, category, is_published, display_order);
