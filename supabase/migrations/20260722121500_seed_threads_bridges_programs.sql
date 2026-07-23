-- Seed the two programs for the Threads & Bridges Festival event:
--   "Meet the Panel" and "Exhibition".
-- Posters and full descriptions are left for the admin to fill in (the images
-- Ruchi shared aren't available here), so poster_url is NULL and descriptions
-- are short placeholders. Registration is enabled so the on-site form works
-- immediately once posters/copy are added.
-- Safe no-op if the festival event does not exist or already has programs.

DO $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Locate the Threads & Bridges Festival event (events table, not the project).
  SELECT id INTO v_event_id
  FROM public.events
  WHERE is_archived = false
    AND title ILIKE '%threads%'
    AND title ILIKE '%bridges%'
    AND title ILIKE '%festival%'
  ORDER BY start_date DESC
  LIMIT 1;

  -- Fallback: any non-archived "Threads ... Bridges" event.
  IF v_event_id IS NULL THEN
    SELECT id INTO v_event_id
    FROM public.events
    WHERE is_archived = false
      AND title ILIKE '%threads%'
      AND title ILIKE '%bridges%'
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  IF v_event_id IS NULL THEN
    RAISE NOTICE 'Threads & Bridges Festival event not found; skipping program seed.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.event_programs WHERE event_id = v_event_id) THEN
    RAISE NOTICE 'Event already has programs; skipping seed.';
    RETURN;
  END IF;

  INSERT INTO public.event_programs
    (event_id, title, description, poster_url, registration_enabled, display_order, is_published)
  VALUES
    (v_event_id, 'Meet the Panel',
     'Details coming soon — add the poster and full description in the admin dashboard.',
     NULL, true, 0, true),
    (v_event_id, 'Exhibition',
     'Details coming soon — add the poster and full description in the admin dashboard.',
     NULL, true, 1, true);

  RAISE NOTICE 'Seeded festival programs for event %.', v_event_id;
END $$;
