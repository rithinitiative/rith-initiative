import { format } from "date-fns";

export interface EventDateFields {
  start_date: string;
  end_date: string | null;
}

export interface EventRegistrationLink {
  label: string;
  url: string;
}

const DEFAULT_REGISTRATION_LABEL = "Register Now";

const normalizeRegistrationLink = (
  link: Partial<EventRegistrationLink> | string,
  index: number
): EventRegistrationLink | null => {
  if (typeof link === "string") {
    const url = link.trim();
    return url ? { label: DEFAULT_REGISTRATION_LABEL, url } : null;
  }

  const url = link.url?.trim();
  if (!url) return null;

  return {
    label: link.label?.trim() || `Registration Link ${index + 1}`,
    url,
  };
};

export const parseEventRegistrationLinks = (
  registrationLink: string | null | undefined
): EventRegistrationLink[] => {
  const rawValue = registrationLink?.trim();
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    const links = Array.isArray(parsed) ? parsed : parsed?.links;

    if (Array.isArray(links)) {
      return links
        .map((link, index) => normalizeRegistrationLink(link, index))
        .filter((link): link is EventRegistrationLink => Boolean(link));
    }
  } catch {
    // Existing events store a single plain URL. Keep those working.
  }

  return [{ label: DEFAULT_REGISTRATION_LABEL, url: rawValue }];
};

export const serializeEventRegistrationLinks = (
  links: EventRegistrationLink[]
): string | null => {
  const cleanLinks = links
    .map((link, index) => normalizeRegistrationLink(link, index))
    .filter((link): link is EventRegistrationLink => Boolean(link));

  return cleanLinks.length > 0 ? JSON.stringify(cleanLinks) : null;
};

const getEventEndBoundary = (event: EventDateFields): Date => {
  const boundary = new Date(event.end_date ?? event.start_date);
  boundary.setHours(23, 59, 59, 999);
  return boundary;
};

export const isEventUpcoming = (
  event: EventDateFields,
  now: Date = new Date()
): boolean => getEventEndBoundary(event).getTime() >= now.getTime();

export const splitEventsByTimeline = <T extends EventDateFields>(
  events: T[],
  now: Date = new Date()
): { upcoming: T[]; past: T[] } => {
  const upcoming: T[] = [];
  const past: T[] = [];

  events.forEach((event) => {
    if (isEventUpcoming(event, now)) {
      upcoming.push(event);
      return;
    }
    past.push(event);
  });

  return { upcoming, past };
};

export const formatEventDateRange = (event: EventDateFields): string => {
  const startDate = new Date(event.start_date);

  if (!event.end_date) {
    return format(startDate, "MMMM d, yyyy");
  }

  const endDate = new Date(event.end_date);

  if (startDate.toDateString() === endDate.toDateString()) {
    return format(startDate, "MMMM d, yyyy");
  }

  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${format(startDate, "MMMM d")}-${format(endDate, "d, yyyy")}`;
    }

    return `${format(startDate, "MMMM d")} - ${format(endDate, "MMMM d, yyyy")}`;
  }

  return `${format(startDate, "MMMM d, yyyy")} - ${format(endDate, "MMMM d, yyyy")}`;
};
