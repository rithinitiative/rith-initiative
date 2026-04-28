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

export const EVENT_ORDER_ENTITY_TYPE = "site_settings";
export const EVENT_ORDER_ENTITY_ID = "00000000-0000-0000-0000-000000000001";
export const EVENT_ORDER_MEDIA_TYPE = "event_order";

export const parseEventOrder = (value: string | null | undefined): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const serializeEventOrder = (eventIds: string[]): string =>
  JSON.stringify(Array.from(new Set(eventIds)));

export const sortEventsByManualOrder = <T extends EventDateFields & { id: string; created_at?: string }>(
  events: T[],
  eventOrder: string[]
): T[] => {
  const orderIndex = new Map(eventOrder.map((id, index) => [id, index]));

  return [...events].sort((a, b) => {
    const aOrder = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;

    const dateComparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    if (dateComparison !== 0) return dateComparison;

    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });
};

export const sortEventsByDisplayOrder = <T extends EventDateFields & { id: string; created_at?: string }>(
  events: T[],
  eventOrder: string[] = []
): T[] =>
  eventOrder.length > 0 ? sortEventsByManualOrder(events, eventOrder) :
  [...events].sort((a, b) => {
    const dateComparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    if (dateComparison !== 0) return dateComparison;

    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });

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
