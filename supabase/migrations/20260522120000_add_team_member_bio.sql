-- Optional bios for team members shown on the About page
ALTER TABLE public.team_members
ADD COLUMN bio TEXT;
