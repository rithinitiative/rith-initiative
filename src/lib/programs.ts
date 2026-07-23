export type RegistrationMode = "none" | "external" | "onsite";

export interface EventProgram {
  id: string;
  event_id?: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  registration_mode: RegistrationMode;
  registration_url: string | null;
  capacity: number | null;
  display_order: number;
}

export interface EventRegistrationInput {
  event_id: string;
  program_id: string;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  adults: number;
  minors: number;
}

/** Aggregate availability for a program (no personal data), from the
 * `get_program_availability` RPC. `capacity` null means unlimited. */
export interface ProgramAvailability {
  program_id: string;
  registered: number;
  capacity: number | null;
}

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** Spots remaining for a program, or null when capacity is unlimited. */
export const spotsRemaining = (
  availability: ProgramAvailability | undefined,
): number | null => {
  if (!availability || availability.capacity == null) return null;
  return Math.max(0, availability.capacity - availability.registered);
};
