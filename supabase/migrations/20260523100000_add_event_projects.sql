-- Long-term projects are selected events with project-specific public content.
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_project BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS project_slug TEXT,
ADD COLUMN IF NOT EXISTS project_summary TEXT,
ADD COLUMN IF NOT EXISTS project_content TEXT,
ADD COLUMN IF NOT EXISTS project_featured_image_url TEXT,
ADD COLUMN IF NOT EXISTS project_is_published BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS project_display_order INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS events_project_slug_unique_idx
ON public.events (project_slug)
WHERE project_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_project_public_idx
ON public.events (is_project, project_is_published, project_display_order, start_date);
