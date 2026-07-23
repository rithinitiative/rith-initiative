-- Programs belonging to an event (e.g. "Meet the Panel", "Exhibition" under the
-- Threads & Bridges Festival), shown in a pop-up from the event card, each with
-- its own on-site registration.

CREATE TABLE IF NOT EXISTS public.event_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  registration_enabled BOOLEAN NOT NULL DEFAULT true,
  registration_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.event_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- ---------- event_programs policies ----------
DROP POLICY IF EXISTS "Anyone can view published event programs" ON public.event_programs;
CREATE POLICY "Anyone can view published event programs"
ON public.event_programs
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = event_programs.event_id
      AND e.is_archived = false
  )
);

DROP POLICY IF EXISTS "Admins can view all event programs" ON public.event_programs;
CREATE POLICY "Admins can view all event programs"
ON public.event_programs
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert event programs" ON public.event_programs;
CREATE POLICY "Admins can insert event programs"
ON public.event_programs
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can update event programs" ON public.event_programs;
CREATE POLICY "Admins can update event programs"
ON public.event_programs
FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete event programs" ON public.event_programs;
CREATE POLICY "Admins can delete event programs"
ON public.event_programs
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- ---------- event_registrations policies ----------
-- Anyone may register (public form), but only for programs open for registration.
DROP POLICY IF EXISTS "Anyone can register for an open program" ON public.event_registrations;
CREATE POLICY "Anyone can register for an open program"
ON public.event_registrations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.event_programs p
    JOIN public.events e ON e.id = p.event_id
    WHERE p.id = event_registrations.program_id
      AND p.event_id = event_registrations.event_id
      AND p.is_published = true
      AND p.registration_enabled = true
      AND e.is_archived = false
  )
);

-- Registrations carry personal data: only admins may read/manage them.
DROP POLICY IF EXISTS "Admins can view event registrations" ON public.event_registrations;
CREATE POLICY "Admins can view event registrations"
ON public.event_registrations
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete event registrations" ON public.event_registrations;
CREATE POLICY "Admins can delete event registrations"
ON public.event_registrations
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_event_programs_event
ON public.event_programs(event_id, is_published, display_order);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event
ON public.event_registrations(event_id, program_id, created_at DESC);

-- ---------- updated_at trigger ----------
DROP TRIGGER IF EXISTS update_event_programs_updated_at ON public.event_programs;
CREATE TRIGGER update_event_programs_updated_at
BEFORE UPDATE ON public.event_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
