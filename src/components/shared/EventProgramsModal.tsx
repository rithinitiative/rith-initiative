import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Image as ImageIcon } from "lucide-react";
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
import { EventProgram, isValidEmail } from "@/lib/programs";

interface EventProgramsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  programs: EventProgram[];
}

function ProgramRegistrationForm({
  program,
  eventTitle,
}: {
  program: EventProgram;
  eventTitle: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !isValidEmail(form.email)) {
      toast.error("Please enter your name and a valid email address.");
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
              `Notes: ${form.notes.trim() || "—"}`,
          },
        })
        .catch(() => {
          /* notification is best-effort */
        });

      setSubmitted(true);
      toast.success(`You're registered for ${program.title}!`);
    } catch (error) {
      console.error("Error registering:", error);
      toast.error("Could not complete your registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!program.registration_enabled) {
    return (
      <p className="rounded-md bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
        Registration for this program is not open yet.
      </p>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
        <CheckCircle2 size={18} />
        Thanks! Your registration for {program.title} has been received.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {program.registration_url && (
        <p className="text-xs text-muted-foreground">
          Prefer to register elsewhere?{" "}
          <a
            href={program.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2"
          >
            Open external registration <ExternalLink size={12} />
          </a>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${program.id}`}>Name *</Label>
          <Input id={`name-${program.id}`} value={form.name} onChange={update("name")} placeholder="Your name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`email-${program.id}`}>Email *</Label>
          <Input id={`email-${program.id}`} type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`phone-${program.id}`}>Phone (optional)</Label>
        <Input id={`phone-${program.id}`} value={form.phone} onChange={update("phone")} placeholder="(555) 555-5555" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${program.id}`}>Anything we should know? (optional)</Label>
        <Textarea id={`notes-${program.id}`} value={form.notes} onChange={update("notes")} rows={2} placeholder="Dietary needs, number of guests, etc." />
      </div>
      <Button type="submit" variant="hero" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Registering..." : `Register for ${program.title}`}
      </Button>
    </form>
  );
}

export function EventProgramsModal({ open, onOpenChange, eventTitle, programs }: EventProgramsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{eventTitle} — Programs</DialogTitle>
          <DialogDescription>
            Explore each program and register directly below.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-8">
          {programs.map((program) => (
            <div key={program.id} className="rounded-lg border border-border/60 bg-card p-4 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-md border border-border/50 bg-secondary/30">
                  {program.poster_url ? (
                    <img src={program.poster_url} alt={`${program.title} poster`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-muted-foreground/60">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-heading text-xl font-semibold text-foreground">{program.title}</h3>
                  {program.description && (
                    <div
                      className="mt-2 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-2 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(program.description) }}
                    />
                  )}

                  <div className="mt-4 border-t border-border/60 pt-4">
                    <p className="mb-3 text-sm font-semibold text-foreground">Register for {program.title}</p>
                    <ProgramRegistrationForm program={program} eventTitle={eventTitle} />
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
