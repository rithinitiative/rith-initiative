-- Global, admin-editable site settings (simple key/value store).
-- First use: a single shared Zelle QR code image ('zelle_qr_url') used for
-- every Zelle payment across the site (Donate page + sponsorship cards).

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings (needed to render the QR on public pages).
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the Zelle QR row (empty until the admin uploads the image).
INSERT INTO public.site_settings (key, value)
VALUES ('zelle_qr_url', NULL)
ON CONFLICT (key) DO NOTHING;
