ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS project_slug TEXT,
ADD COLUMN IF NOT EXISTS project_display_order INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_posts_project_slug_unique
ON public.blog_posts(project_slug)
WHERE project_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_project_public
ON public.blog_posts(is_published, is_archived, project_display_order, published_at DESC);

CREATE TABLE IF NOT EXISTS public.project_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  interviewee_name TEXT,
  interviewee_description TEXT,
  portrait_url TEXT,
  audio_url TEXT,
  transcript TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published project interviews" ON public.project_interviews;
CREATE POLICY "Anyone can view published project interviews"
ON public.project_interviews
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.blog_posts p
    WHERE p.id = project_interviews.project_id
      AND p.is_published = true
      AND p.is_archived = false
  )
);

DROP POLICY IF EXISTS "Admins can view all project interviews" ON public.project_interviews;
CREATE POLICY "Admins can view all project interviews"
ON public.project_interviews
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert project interviews" ON public.project_interviews;
CREATE POLICY "Admins can insert project interviews"
ON public.project_interviews
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update project interviews" ON public.project_interviews;
CREATE POLICY "Admins can update project interviews"
ON public.project_interviews
FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete project interviews" ON public.project_interviews;
CREATE POLICY "Admins can delete project interviews"
ON public.project_interviews
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_project_interviews_project
ON public.project_interviews(project_id, is_published, display_order);

DROP TRIGGER IF EXISTS update_project_interviews_updated_at ON public.project_interviews;
CREATE TRIGGER update_project_interviews_updated_at
BEFORE UPDATE ON public.project_interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.blog_posts (
  title,
  content,
  excerpt,
  featured_image_url,
  author_name,
  category,
  is_published,
  published_at,
  created_by,
  project_slug,
  project_display_order
)
SELECT
  e.title,
  COALESCE(NULLIF(e.project_content, ''), NULLIF(e.description, ''), 'Project details coming soon.'),
  NULLIF(e.project_summary, ''),
  COALESCE(NULLIF(e.project_featured_image_url, ''), e.featured_image_url),
  NULL,
  'Project',
  e.project_is_published,
  now(),
  e.created_by,
  NULLIF(e.project_slug, ''),
  e.project_display_order
FROM public.events e
WHERE e.is_project = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.blog_posts p
    WHERE p.project_slug = e.project_slug
      OR p.title = e.title
  );
