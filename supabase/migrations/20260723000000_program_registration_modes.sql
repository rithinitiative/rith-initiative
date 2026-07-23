-- Registration overhaul for event programs.
-- 1. Each program has exactly ONE registration mode: 'none' | 'external' | 'onsite'
--    (a program never offers an on-site form AND an external link at the same
--    time — you register in one place only).
-- 2. Programs can carry an optional capacity (total attendees). NULL = unlimited.
-- 3. On-site registrations record how many adults and minors are attending;
--    capacity counts total heads (adults + minors), enforced server-side.

-- ---------- event_programs: mode + capacity ----------
ALTER TABLE public.event_programs
  ADD COLUMN IF NOT EXISTS registration_mode TEXT NOT NULL DEFAULT 'onsite'
    CHECK (registration_mode IN ('none', 'external', 'onsite')),
  ADD COLUMN IF NOT EXISTS capacity INTEGER
    CHECK (capacity IS NULL OR capacity >= 0);

-- Backfill mode from the previous two-flag model:
--   external link present -> external; else registration on -> onsite; else none.
UPDATE public.event_programs
SET registration_mode = CASE
  WHEN registration_url IS NOT NULL AND btrim(registration_url) <> '' THEN 'external'
  WHEN registration_enabled THEN 'onsite'
  ELSE 'none'
END;

-- ---------- event_registrations: attendee counts ----------
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS adults INTEGER NOT NULL DEFAULT 1
    CHECK (adults >= 0),
  ADD COLUMN IF NOT EXISTS minors INTEGER NOT NULL DEFAULT 0
    CHECK (minors >= 0);

-- At least one attendee per registration.
ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_attendees_positive;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_attendees_positive
  CHECK (adults + minors >= 1);

-- ---------- capacity enforcement (atomic on insert) ----------
CREATE OR REPLACE FUNCTION public.enforce_program_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INTEGER;
  v_current  INTEGER;
BEGIN
  SELECT capacity INTO v_capacity
  FROM public.event_programs
  WHERE id = NEW.program_id;

  -- No cap set -> unlimited.
  IF v_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lock existing registrations for this program to serialize concurrent inserts.
  SELECT COALESCE(SUM(adults + minors), 0) INTO v_current
  FROM public.event_registrations
  WHERE program_id = NEW.program_id
  FOR UPDATE;

  IF v_current + NEW.adults + NEW.minors > v_capacity THEN
    RAISE EXCEPTION 'Program is full (capacity % reached).', v_capacity
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_program_capacity_trigger ON public.event_registrations;
CREATE TRIGGER enforce_program_capacity_trigger
BEFORE INSERT ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_program_capacity();

-- ---------- public availability lookup ----------
-- Public visitors cannot read event_registrations (personal data), but the
-- registration form needs to show remaining spots. This SECURITY DEFINER
-- function exposes ONLY aggregate counts, never any personal fields.
CREATE OR REPLACE FUNCTION public.get_program_availability(p_program_ids UUID[])
RETURNS TABLE(program_id UUID, registered INTEGER, capacity INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(SUM(r.adults + r.minors), 0)::INTEGER AS registered,
    p.capacity
  FROM public.event_programs p
  LEFT JOIN public.event_registrations r ON r.program_id = p.id
  WHERE p.id = ANY(p_program_ids)
  GROUP BY p.id, p.capacity;
$$;

GRANT EXECUTE ON FUNCTION public.get_program_availability(UUID[]) TO anon, authenticated;

-- ---------- tighten the public insert policy ----------
-- Registrations are only accepted for programs whose mode is 'onsite'.
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
      AND p.registration_mode = 'onsite'
      AND e.is_archived = false
  )
);
