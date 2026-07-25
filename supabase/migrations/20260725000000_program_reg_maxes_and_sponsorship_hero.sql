-- 1. Per-registration attendee caps: how many adults / minors one email may
--    register in a single submission (drives the dropdowns on the form).
-- 2. Admin-editable hero text for the /sponsorship-options page.

-- ---------- event_programs: per-registration caps ----------
ALTER TABLE public.event_programs
  ADD COLUMN IF NOT EXISTS max_adults_per_registration INTEGER NOT NULL DEFAULT 10
    CHECK (max_adults_per_registration >= 0),
  ADD COLUMN IF NOT EXISTS max_minors_per_registration INTEGER NOT NULL DEFAULT 10
    CHECK (max_minors_per_registration >= 0);

-- ---------- sponsorship hero settings ----------
-- NULL means "use the built-in default" (the page falls back gracefully).
INSERT INTO public.site_settings (key, value)
VALUES
  ('sponsorship_hero_heading', NULL),
  ('sponsorship_hero_subtitle', NULL)
ON CONFLICT (key) DO NOTHING;
