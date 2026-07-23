import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Image as ImageIcon, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeRichText } from "@/lib/richText";
import {
  EventProgram,
  ProgramAvailability,
  isValidEmail,
  spotsRemaining,
} from "@/lib/programs";

interface EventProgramsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  programs: EventProgram[];
  availability?: Record<string, ProgramAvailability>;
  onRegistered?: (programId: string, attendees: number) => void;
}

function ProgramRegistrationForm({
  program,
  eventTitle,
  availability,
  onRegistered,
}: {
  program: EventProgram;
  eventTitle: string;
  availability?: ProgramAvailability;
  onRegistered?: (programId: string, attendees: number) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", adults: 1, minors: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const remaining = spotsRemaining(availability);
  const isFull = remaining !== null && remaining <= 0;
  const requested = form.adults + form.minors;
  const overCapacity = remaining !== null && requested > remaining;

  const updateText = (field: "name" | "email" | "phone" | "notes") => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateCount = (field: "adults" | "minors") => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = parseInt(e.target.value, 10);
    const value = Number.isNaN(raw) ? 0 : Math.max(0, raw);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !isValidEmail(form.email)) {
      toast.error("Please enter your name and a valid email address.");
      return;
    }
    if (requested < 1) {
      toast.error("Please register at least one attendee.");
      return;
    }
    if (overCapacity) {
      toast.error(
        remaining === 0
          ? "This program is full."
          : `Only ${remaining} spot${remaining === 1 ? "" : "s"} left.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: program.event_id as string,
        program_id: program.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        adults: form.adults,
        minors: form.minors,
      });

      if (error) throw error;

      // Best-effort email notification (reuses the contact-form function).
      // Never blocks a successful registration if it fails or is rate-limited.
      supabase.functions
        .invoke("send-contact-email", {
          body: {
            name: form.name.trim(),
            email: form.email.trim(),
            subject: `Event registration: ${program.title} — ${eventTitle}`,
            message:
              `${form.name.trim()} registered for "${program.title}" (${eventTitle}).\n` +
              `Email: ${form.email.trim()}\n` +
              `Phone: ${form.phone.trim() || "—"}\n` +
              `Attendees: ${form.adults} adult(s), ${form.minors} minor(s)\n` +
              `Notes: ${form.notes.trim() || "—"}`,
          },
        })
        .catch(() => {
          /* notification is best-effort */
        });

      onRegistered?.(program.id, requested);
      setSubmitted(true);
      toast.success(`You're registered for ${program.title}!`);
    } catch (error) {
      console.error("Error registering:", error);
      const message = (error as { message?: string })?.message || "";
      if (message.toLowerCase().includes("full") || message.toLowerCase().includes("capacity")) {
        toast.error("Sorry — this program just filled up.");
      } else {
        toast.error("Could not complete your registration. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode: no registration at all.
  if (program.registration_mode === "none") {
    return (
      <p className="rounded-md bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        No registration is required for this program — just come along.
      </p>
    );
  }

  // Mode: register through an external link only.
  if (program.registration_mode === "external") {
    return (
      <div className="rounded-md bg-secondary/30 px-4 py-4">
        <p className="mb-3 text-sm text-muted-foreground">
          Registration for this program is handled on an external page.
        </p>
        {program.registration_url ? (
          <Button variant="hero" asChild>
            <a href={program.registration_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              Register for {program.title}
              <ExternalLink size={16} />
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Registration link coming soon.</p>
        )}
      </div>
    );
  }

  // Mode: on-site form.
  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
        <CheckCircle2 size={18} />
        Thanks! Your registration for {program.title} has been received.
      </div>
    );
  }

  if (isFull) {
    return (
      <p className="rounded-md bg-secondary/40 px-4 py-3 text-sm font-medium text-muted-foreground">
        Registration for {program.title} is full. Thank you for your interest!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {remaining !== null && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Users size={13} />
          {remaining} spot{remaining === 1 ? "" : "s"} left
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${program.id}`}>Name *</Label>
          <Input id={`name-${program.id}`} value={form.name} onChange={updateText("name")} placeholder="Your name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`email-${program.id}`}>Email *</Label>
          <Input id={`email-${program.id}`} type="email" value={form.email} onChange={updateText("email")} placeholder="you@example.com" required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`adults-${program.id}`}>Adults *</Label>
          <Input
            id={`adults-${program.id}`}
            type="number"
            min={0}
            max={remaining ?? undefined}
            value={form.adults}
            onChange={updateCount("adults")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`minors-${program.id}`}>Minors</Label>
          <Input
            id={`minors-${program.id}`}
            type="number"
            min={0}
            max={remaining ?? undefined}
            value={form.minors}
            onChange={updateCount("minors")}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`phone-${program.id}`}>Phone (optional)</Label>
        <Input id={`phone-${program.id}`} value={form.phone} onChange={updateText("phone")} placeholder="(555) 555-5555" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${program.id}`}>Anything we should know? (optional)</Label>
        <Textarea id={`notes-${program.id}`} value={form.notes} onChange={updateText("notes")} rows={2} placeholder="Dietary needs, accessibility, etc." />
      </div>
      {overCapacity && (
        <p className="text-xs font-medium text-destructive">
          Only {remaining} spot{remaining === 1 ? "" : "s"} left — please reduce your party size.
        </p>
      )}
      <Button type="submit" variant="hero" disabled={isSubmitting || overCapacity} className="w-full sm:w-auto">
        {isSubmitting ? "Registering..." : `Register for ${program.title}`}
      </Button>
    </form>
  );
}

export function EventProgramsModal({
  open,
  onOpenChange,
  eventTitle,
  programs,
  availability,
  onRegistered,
}: EventProgramsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eventTitle} — Programs</DialogTitle>
          <DialogDescription>
            Explore each program and register directly below.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-8">
          {programs.map((program) => (
            <div key={program.id} className="rounded-lg border border-border/60 bg-card p-4 sm:p-6">
              <div className="space-y-5">
                {program.poster_url ? (
                  <div className="flex justify-center">
                    <img
                      src={program.poster_url}
                      alt={`${program.title} poster`}
                      className="max-h-[70vh] w-auto max-w-full rounded-md border border-border/50 object-contain"
                    />
                  </div>
                ) : (
                  <div className="mx-auto flex aspect-[3/4] w-full max-w-[220px] items-center justify-center rounded-md border border-border/50 bg-secondary/30 text-muted-foreground/60">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-semibold text-foreground">{program.title}</h3>
                  {program.description && (
                    <div
                      className="mt-2 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-2 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(program.description) }}
                    />
                  )}

                  <div className="mt-4 border-t border-border/60 pt-4">
                    {program.registration_mode !== "none" && (
                      <p className="mb-3 text-sm font-semibold text-foreground">Register for {program.title}</p>
                    )}
                    <ProgramRegistrationForm
                      program={program}
                      eventTitle={eventTitle}
                      availability={availability?.[program.id]}
                      onRegistered={onRegistered}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
