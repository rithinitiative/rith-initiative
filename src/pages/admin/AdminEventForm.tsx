import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { SimpleMediaUpload, SimpleMediaItem } from '@/components/admin/SimpleMediaUpload';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  EventRegistrationLink,
  parseEventRegistrationLinks,
  serializeEventRegistrationLinks,
} from '@/lib/events';
import { AdminFormSkeleton } from "@/components/shared/skeletons";

interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  time: string;
  location: string;
  category: string;
  registration_links: EventRegistrationLink[];
  capacity: string;
  featured_image_url: string;
}

interface ProgramFormData {
  id?: string;
  title: string;
  description: string;
  poster_url: string;
  registration_enabled: boolean;
  registration_url: string;
  display_order: number;
  is_published: boolean;
}

interface RegistrationRow {
  id: string;
  program_id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

const emptyProgram = (displayOrder: number): ProgramFormData => ({
  title: '',
  description: '',
  poster_url: '',
  registration_enabled: true,
  registration_url: '',
  display_order: displayOrder,
  is_published: true,
});

function RegistrationsList({ registrations }: { registrations: RegistrationRow[] }) {
  if (registrations.length === 0) {
    return (
      <p className="rounded-md bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
        No registrations yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border/60">
      <div className="border-b border-border/60 bg-secondary/20 px-3 py-2 text-xs font-semibold text-foreground">
        Registrations ({registrations.length})
      </div>
      <div className="max-h-60 divide-y divide-border/60 overflow-y-auto">
        {registrations.map((registration) => (
          <div key={registration.id} className="px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{registration.name}</span>
              <span className="text-muted-foreground">
                {new Date(registration.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="text-muted-foreground">
              {registration.email}
              {registration.phone ? ` · ${registration.phone}` : ''}
            </div>
            {registration.notes && (
              <div className="mt-1 italic text-muted-foreground">{registration.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminEventForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [mediaItems, setMediaItems] = useState<SimpleMediaItem[]>([]);
  const [programs, setPrograms] = useState<ProgramFormData[]>([]);
  const [deletedProgramIds, setDeletedProgramIds] = useState<string[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    time: '',
    location: '',
    category: '',
    registration_links: [],
    capacity: '',
    featured_image_url: '',
  });

  useEffect(() => {
    if (isEditing && id) {
      const fetchEvent = async () => {
        try {
          const [
            { data, error },
            { data: programData, error: programError },
            { data: registrationData, error: registrationError },
          ] = await Promise.all([
            supabase.from('events').select('*').eq('id', id).maybeSingle(),
            supabase
              .from('event_programs')
              .select('*')
              .eq('event_id', id)
              .order('display_order', { ascending: true }),
            supabase
              .from('event_registrations')
              .select('id, program_id, name, email, phone, notes, created_at')
              .eq('event_id', id)
              .order('created_at', { ascending: false }),
          ]);

          if (error) throw error;
          if (programError) throw programError;
          if (registrationError) throw registrationError;

          if (data) {
            setFormData({
              title: data.title || '',
              description: data.description || '',
              start_date: data.start_date ? data.start_date.split('T')[0] : '',
              end_date: data.end_date ? data.end_date.split('T')[0] : '',
              time: data.time || '',
              location: data.location || '',
              category: data.category || '',
              registration_links: parseEventRegistrationLinks(data.registration_link),
              capacity: data.capacity?.toString() || '',
              featured_image_url: data.featured_image_url || '',
            });
          }

          setPrograms((programData || []).map((program) => ({
            id: program.id,
            title: program.title || '',
            description: program.description || '',
            poster_url: program.poster_url || '',
            registration_enabled: program.registration_enabled,
            registration_url: program.registration_url || '',
            display_order: program.display_order || 0,
            is_published: program.is_published,
          })));
          setRegistrations((registrationData || []) as RegistrationRow[]);
        } catch (error) {
          console.error('Error fetching event:', error);
          toast({
            title: 'Error',
            description: 'Failed to load event.',
            variant: 'destructive',
          });
        } finally {
          setIsFetching(false);
        }
      };

      fetchEvent();
    }
  }, [id, isEditing, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegistrationLinkChange = (
    index: number,
    field: keyof EventRegistrationLink,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      registration_links: prev.registration_links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleAddRegistrationLink = () => {
    setFormData((prev) => ({
      ...prev,
      registration_links: [
        ...prev.registration_links,
        { label: `Registration Link ${prev.registration_links.length + 1}`, url: '' },
      ],
    }));
  };

  const handleRemoveRegistrationLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      registration_links: prev.registration_links.filter((_, linkIndex) => linkIndex !== index),
    }));
  };

  const handleMediaChange = useCallback((media: SimpleMediaItem[]) => {
    setMediaItems(media);
  }, []);

  // ---------- Event programs ----------
  const updateProgram = (index: number, updates: Partial<ProgramFormData>) => {
    setPrograms((prev) => prev.map((program, i) => (i === index ? { ...program, ...updates } : program)));
  };

  const addProgram = () => {
    setPrograms((prev) => [...prev, emptyProgram(prev.length)]);
  };

  const removeProgram = (index: number) => {
    const program = programs[index];
    if (program.id) {
      setDeletedProgramIds((prev) => [...prev, program.id as string]);
    }
    setPrograms((prev) => prev.filter((_, i) => i !== index).map((item, order) => ({
      ...item,
      display_order: order,
    })));
  };

  const moveProgram = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= programs.length) return;
    setPrograms((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((program, order) => ({ ...program, display_order: order }));
    });
  };

  const savePrograms = async (eventId: string) => {
    if (deletedProgramIds.length > 0) {
      const { error } = await supabase
        .from('event_programs')
        .delete()
        .in('id', deletedProgramIds);
      if (error) throw error;
    }

    for (const [index, program] of programs.entries()) {
      if (!program.title.trim()) continue;

      const programData = {
        event_id: eventId,
        title: program.title.trim(),
        description: program.description.trim() || null,
        poster_url: program.poster_url || null,
        registration_enabled: program.registration_enabled,
        registration_url: program.registration_url.trim() || null,
        display_order: index,
        is_published: program.is_published,
        created_by: user?.id,
      };

      if (program.id) {
        const { error } = await supabase
          .from('event_programs')
          .update(programData)
          .eq('id', program.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('event_programs')
          .insert([programData])
          .select('id')
          .single();
        if (error) throw error;
        program.id = data.id;
      }
    }
  };

  // Helper function to convert date string to ISO without timezone shift
  const dateToISO = (dateStr: string): string => {
    // Append T12:00:00 to avoid timezone boundary issues
    return new Date(`${dateStr}T12:00:00`).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.start_date) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the title and start date.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.capacity && (isNaN(Number(formData.capacity)) || parseInt(formData.capacity) <= 0)) {
      toast({
        title: 'Invalid capacity',
        description: 'Capacity must be a positive number.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.end_date && formData.end_date < formData.start_date) {
      toast({
        title: 'Invalid dates',
        description: 'End date cannot be before the start date.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        start_date: dateToISO(formData.start_date),
        end_date: formData.end_date ? dateToISO(formData.end_date) : null,
        time: formData.time || null,
        location: formData.location || null,
        category: formData.category || null,
        registration_link: serializeEventRegistrationLinks(formData.registration_links),
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        featured_image_url: formData.featured_image_url || null,
        created_by: user?.id,
      };

      let eventId = id;

      if (isEditing && id) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select('id')
          .single();

        if (error) throw error;
        eventId = data.id;
      }

      if (eventId) {
        const { data: existingMedia } = await supabase
          .from('media')
          .select('id')
          .eq('entity_type', 'event')
          .eq('entity_id', eventId);

        const existingIds = new Set((existingMedia || []).map((media) => media.id));
        const currentIds = new Set(mediaItems.filter((media) => media.id).map((media) => media.id as string));
        const toDelete = [...existingIds].filter((mediaId) => !currentIds.has(mediaId));

        if (toDelete.length > 0) {
          const { error } = await supabase.from('media').delete().in('id', toDelete);
          if (error) throw error;
        }

        for (const item of mediaItems) {
          if (!item.url) continue;

          const mediaData = {
            entity_type: 'event' as const,
            entity_id: eventId,
            media_type: item.media_type,
            url: item.url,
            title: null,
            description: null,
            display_order: item.display_order,
            created_by: user?.id,
          };

          if (item.id) {
            const { error } = await supabase
              .from('media')
              .update(mediaData)
              .eq('id', item.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('media').insert([mediaData]);
            if (error) throw error;
          }
        }

        await savePrograms(eventId);
      }

      toast({
        title: isEditing ? 'Event updated' : 'Event created',
        description: `The event has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      navigate('/admin/events');
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <AdminFormSkeleton />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/events">
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {isEditing ? 'Edit Event' : 'Create Event'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? 'Update event details' : 'Add a new event to the calendar'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              id="description"
              value={formData.description}
              onChange={(description) => setFormData((prev) => ({ ...prev, description }))}
              placeholder="A full description of the event..."
            />
          </div>

          <ImageUpload
            value={formData.featured_image_url}
            onChange={(url) => setFormData(prev => ({ ...prev, featured_image_url: url }))}
            label="Hero Image"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              placeholder="e.g., 10:00 AM - 2:00 PM"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Event location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Festival, Workshop, Music"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Registration / Survey Links</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add one or more buttons visitors can use to register or open surveys.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRegistrationLink}
                className="gap-2 shrink-0"
              >
                <Plus size={16} />
                Add Link
              </Button>
            </div>

            {formData.registration_links.length === 0 ? (
              <div className="rounded-md bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                No registration or survey links added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.registration_links.map((link, index) => (
                  <div key={index} className="grid gap-3 rounded-md bg-secondary/20 p-3 sm:grid-cols-[1fr_1.5fr_auto]">
                    <div className="space-y-2">
                      <Label htmlFor={`registration_label_${index}`}>Button Label</Label>
                      <Input
                        id={`registration_label_${index}`}
                        value={link.label}
                        onChange={(e) => handleRegistrationLinkChange(index, 'label', e.target.value)}
                        placeholder={`Survey ${index + 1}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`registration_url_${index}`}>Link URL</Label>
                      <Input
                        id={`registration_url_${index}`}
                        type="url"
                        value={link.url}
                        onChange={(e) => handleRegistrationLinkChange(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRegistrationLink(index)}
                        aria-label={`Remove registration link ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={handleChange}
              placeholder="Maximum attendees"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <SimpleMediaUpload
              entityType="event"
              entityId={id}
              onMediaChange={handleMediaChange}
            />
          </div>
        </div>

        {/* Programs */}
        <section className="space-y-4 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Programs</h2>
              <p className="text-sm text-muted-foreground">
                Programs shown in the event card's "View Program Details" pop-up, each with its own poster and
                on-site registration.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addProgram}>
              <Plus size={16} />
              Add Program
            </Button>
          </div>

          {programs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No programs added yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {programs.map((program, index) => (
                <div key={program.id || index} className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <GripVertical size={16} />
                      Program #{index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => moveProgram(index, index - 1)} disabled={index === 0}>
                        Up
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => moveProgram(index, index + 1)} disabled={index === programs.length - 1}>
                        Down
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeProgram(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Program Title</Label>
                    <Input
                      value={program.title}
                      onChange={(e) => updateProgram(index, { title: e.target.value })}
                      placeholder="e.g., Meet the Panel"
                    />
                  </div>

                  <ImageUpload
                    value={program.poster_url}
                    onChange={(url) => updateProgram(index, { poster_url: url })}
                    label="Poster"
                  />

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <RichTextEditor
                      value={program.description}
                      onChange={(description) => updateProgram(index, { description })}
                      placeholder="Details about this program..."
                      minHeightClassName="min-h-[150px]"
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                    <Switch
                      checked={program.registration_enabled}
                      onCheckedChange={(checked) => updateProgram(index, { registration_enabled: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {program.registration_enabled ? 'On-site registration is open' : 'Registration is closed'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label>External Registration Link (optional)</Label>
                    <Input
                      type="url"
                      value={program.registration_url}
                      onChange={(e) => updateProgram(index, { registration_url: e.target.value })}
                      placeholder="https://... (shown as an alternative to the on-site form)"
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                    <Switch
                      checked={program.is_published}
                      onCheckedChange={(checked) => updateProgram(index, { is_published: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {program.is_published ? 'Show this program on the website' : 'Keep this program hidden'}
                    </span>
                  </div>

                  {program.id && (
                    <RegistrationsList
                      registrations={registrations.filter((r) => r.program_id === program.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-4">
          <Button type="submit" variant="hero" disabled={isLoading}>
            {isLoading ? (
              'Saving...'
            ) : (
              <>
                <Save size={18} />
                {isEditing ? 'Update Event' : 'Create Event'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/events">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
