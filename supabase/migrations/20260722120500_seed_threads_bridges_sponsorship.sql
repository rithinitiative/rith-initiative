-- Seed the Threads & Bridges – Oral History Project sponsorship subsections.
-- Amounts and PayPal button IDs confirmed from Changes.pdf + FILE_3380 conv.pdf.
-- Sustainability Partnership is intentionally omitted (client dropped it).
-- Zelle QR URL is left NULL until the client provides the image (card shows a
-- "QR coming soon" placeholder in the meantime).
-- Safe no-op if the project does not exist or already has sponsorship content.

DO $$
DECLARE
  v_project_id UUID;
  v_next_order INTEGER;
  v_exhibition_id UUID;
  v_oral_id UUID;
BEGIN
  -- Locate the Oral History project (blog_posts row acting as a project).
  SELECT id INTO v_project_id
  FROM public.blog_posts
  WHERE project_slug IS NOT NULL
    AND (project_slug ILIKE '%oral-history%' OR title ILIKE '%oral history%')
  ORDER BY project_display_order ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Oral History project not found; skipping sponsorship seed.';
    RETURN;
  END IF;

  -- Don't double-seed.
  IF EXISTS (
    SELECT 1 FROM public.project_subsections
    WHERE project_id = v_project_id AND section_type = 'sponsorship'
  ) THEN
    RAISE NOTICE 'Sponsorship subsections already exist; skipping seed.';
    RETURN;
  END IF;

  SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_next_order
  FROM public.project_subsections
  WHERE project_id = v_project_id;

  -- Exhibition Sponsorship (mockup values: $1,000 / $350)
  INSERT INTO public.project_subsections
    (project_id, title, anchor_slug, section_type, body, payment_paypal_button_id, display_order, is_published)
  VALUES
    (v_project_id, 'Exhibition Sponsorship', 'exhibition-sponsorship', 'sponsorship',
     'Each station carries a specific object and a specific family''s memory. Sponsoring a station means your name is part of that story.',
     '6JVM4BZKSCGSU', v_next_order, true)
  RETURNING id INTO v_exhibition_id;

  INSERT INTO public.project_subsection_tiers (subsection_id, name, description, amount, display_order) VALUES
    (v_exhibition_id, 'Presenting Sponsor', 'Full exhibition · 3–4 available', 1000, 0),
    (v_exhibition_id, 'Station Sponsor', 'Per station · choose the one most meaningful to you', 350, 1);

  -- Oral History Project (Changes.pdf: $5,000 new / $2,500 / $1,000 / $250)
  INSERT INTO public.project_subsections
    (project_id, title, anchor_slug, section_type, body, payment_paypal_button_id, payment_note, display_order, is_published)
  VALUES
    (v_project_id, 'Oral History Project', 'oral-history-sponsorship', 'sponsorship',
     'Your support gives the archive a permanent home — transcribed, indexed, and shareable — for the stories we have and every story still to come.',
     '4GFPQY2QTTJBQ',
     'Presented in partnership with TheirStory. Every tier goes directly toward hosting, transcription, indexing, and shareable clips for the full archive.',
     v_next_order + 1, true)
  RETURNING id INTO v_oral_id;

  INSERT INTO public.project_subsection_tiers (subsection_id, name, description, amount, display_order) VALUES
    (v_oral_id, 'Founding Sponsor', 'Underwrite the full archive for a year', 5000, 0),
    (v_oral_id, 'Presenting Sponsor', 'Half the year', 2500, 1),
    (v_oral_id, 'Contributing Sponsor', 'A meaningful share', 1000, 2),
    (v_oral_id, 'Supporting Sponsor', 'A slice of the year', 250, 3);

  RAISE NOTICE 'Seeded sponsorship subsections for project %.', v_project_id;
END $$;
