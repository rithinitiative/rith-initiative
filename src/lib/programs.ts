export interface EventProgram {
  id: string;
  event_id?: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  registration_enabled: boolean;
  registration_url: string | null;
  display_order: number;
}

export interface EventRegistrationInput {
  event_id: string;
  program_id: string;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
}

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
