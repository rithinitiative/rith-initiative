-- Admin-managed subsections for project pages (jump-nav + sponsorship tiers).
-- A subsection is a titled content block on a project page. Two types:
--   'rich_text'   -> renders sanitized HTML body
--   'sponsorship' -> renders a sponsorship card with priced tiers + payment
-- Each sponsorship subsection carries one payment target (Zelle QR + PayPal
-- hosted button); its tiers share that target (per-category, not per-amount).

CREATE TABLE IF NOT EXISTS public.project_subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  anchor_slug TEXT,
  section_type TEXT NOT NULL DEFAULT 'rich_text'
    CHECK (section_type IN ('rich_text', 'sponsorship')),
  body TEXT,
  payment_zelle_qr_url TEXT,
  payment_paypal_button_id TEXT,
  payment_note TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_subsection_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsection_id UUID NOT NULL REFERENCES public.project_subsections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_subsection_tiers ENABLE ROW LEVEL SECURITY;

-- ---------- project_subsections policies ----------
DROP POLICY IF EXISTS "Anyone can view published project subsections" ON public.project_subsections;
CREATE POLICY "Anyone can view published project subsections"
ON public.project_subsections
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.blog_posts p
    WHERE p.id = project_subsections.project_id
      AND p.is_published = true
      AND p.is_archived = false
  )
);

DROP POLICY IF EXISTS "Admins can view all project subsections" ON public.project_subsections;
CREATE POLICY "Admins can view all project subsections"
ON public.project_subsections
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert project subsections" ON public.project_subsections;
CREATE POLICY "Admins can insert project subsections"
ON public.project_subsections
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update project subsections" ON public.project_subsections;
CREATE POLICY "Admins can update project subsections"
ON public.project_subsections
FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete project subsections" ON public.project_subsections;
CREATE POLICY "Admins can delete project subsections"
ON public.project_subsections
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- ---------- project_subsection_tiers policies ----------
DROP POLICY IF EXISTS "Anyone can view tiers of published subsections" ON public.project_subsection_tiers;
CREATE POLICY "Anyone can view tiers of published subsections"
ON public.project_subsection_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.project_subsections s
    JOIN public.blog_posts p ON p.id = s.project_id
    WHERE s.id = project_subsection_tiers.subsection_id
      AND s.is_published = true
      AND p.is_published = true
      AND p.is_archived = false
  )
);

DROP POLICY IF EXISTS "Admins can view all subsection tiers" ON public.project_subsection_tiers;
CREATE POLICY "Admins can view all subsection tiers"
ON public.project_subsection_tiers
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert subsection tiers" ON public.project_subsection_tiers;
CREATE POLICY "Admins can insert subsection tiers"
ON public.project_subsection_tiers
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update subsection tiers" ON public.project_subsection_tiers;
CREATE POLICY "Admins can update subsection tiers"
ON public.project_subsection_tiers
FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete subsection tiers" ON public.project_subsection_tiers;
CREATE POLICY "Admins can delete subsection tiers"
ON public.project_subsection_tiers
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_project_subsections_project
ON public.project_subsections(project_id, is_published, display_order);

CREATE INDEX IF NOT EXISTS idx_project_subsection_tiers_subsection
ON public.project_subsection_tiers(subsection_id, amount DESC, display_order);

-- ---------- updated_at triggers ----------
DROP TRIGGER IF EXISTS update_project_subsections_updated_at ON public.project_subsections;
CREATE TRIGGER update_project_subsections_updated_at
BEFORE UPDATE ON public.project_subsections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_subsection_tiers_updated_at ON public.project_subsection_tiers;
CREATE TRIGGER update_project_subsection_tiers_updated_at
BEFORE UPDATE ON public.project_subsection_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
