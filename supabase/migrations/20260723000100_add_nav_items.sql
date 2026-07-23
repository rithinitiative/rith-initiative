-- Admin-editable site navigation. The public header is driven entirely by this
-- table: top-level items plus nested children (dropdowns). Each item links to an
-- internal path (e.g. '/events') or an external URL (e.g. 'https://...').
-- Seeded with the current hard-coded nav so nothing changes on day one.

CREATE TABLE IF NOT EXISTS public.nav_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT,                       -- internal path or external URL; NULL = pure dropdown header
  parent_id UUID REFERENCES public.nav_items(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  opens_new_tab BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published nav items" ON public.nav_items;
CREATE POLICY "Anyone can view published nav items"
ON public.nav_items
FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Admins can view all nav items" ON public.nav_items;
CREATE POLICY "Admins can view all nav items"
ON public.nav_items
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert nav items" ON public.nav_items;
CREATE POLICY "Admins can insert nav items"
ON public.nav_items
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update nav items" ON public.nav_items;
CREATE POLICY "Admins can update nav items"
ON public.nav_items
FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete nav items" ON public.nav_items;
CREATE POLICY "Admins can delete nav items"
ON public.nav_items
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_nav_items_tree
ON public.nav_items(parent_id, is_published, display_order);

DROP TRIGGER IF EXISTS update_nav_items_updated_at ON public.nav_items;
CREATE TRIGGER update_nav_items_updated_at
BEFORE UPDATE ON public.nav_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- seed the current navigation ----------
-- Safe no-op if the nav has already been seeded/edited.
DO $$
DECLARE
  v_projects_id UUID;
  v_project_id UUID;
  v_project_slug TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.nav_items) THEN
    RAISE NOTICE 'nav_items already populated; skipping seed.';
    RETURN;
  END IF;

  -- Top-level links (order matches the previous hard-coded header).
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('Home', '/', 0);
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('About', '/about', 1);
  INSERT INTO public.nav_items (label, url, display_order)
    VALUES ('Projects', '/projects', 2)
    RETURNING id INTO v_projects_id;
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('Events', '/events', 3);
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('Blogs', '/blogs', 4);
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('Shop', '/shop', 5);
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('Donate', '/donate', 6);
  INSERT INTO public.nav_items (label, url, display_order) VALUES ('Contact', '/contact', 7);

  -- Projects dropdown: "All Projects" + the Threads & Bridges (Oral History)
  -- project with its two curated sub-links.
  INSERT INTO public.nav_items (label, url, parent_id, display_order)
    VALUES ('All Projects', '/projects', v_projects_id, 0);

  SELECT id, project_slug INTO v_project_id, v_project_slug
  FROM public.blog_posts
  WHERE project_slug IS NOT NULL
    AND (project_slug ILIKE '%oral-history%' OR title ILIKE '%oral history%')
  ORDER BY project_display_order ASC
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    DECLARE
      v_th_id UUID;
    BEGIN
      INSERT INTO public.nav_items (label, url, parent_id, display_order)
        VALUES ('Threads & Bridges', '/projects/' || v_project_slug, v_projects_id, 1)
        RETURNING id INTO v_th_id;

      INSERT INTO public.nav_items (label, url, parent_id, display_order) VALUES
        ('Overview', '/projects/' || v_project_slug, v_th_id, 0),
        ('Sponsorship Options', '/sponsorship-options', v_th_id, 1);
    END;
  END IF;
END $$;
