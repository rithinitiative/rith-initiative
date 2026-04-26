import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bold, Italic, Link as LinkIcon, List, ListOrdered, Plus, Save, Trash2, Underline } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { SimpleMediaUpload, SimpleMediaItem } from '@/components/admin/SimpleMediaUpload';
import {
  EventRegistrationLink,
  parseEventRegistrationLinks,
  serializeEventRegistrationLinks,
} from '@/lib/events';

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

export default function AdminEventForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [mediaItems, setMediaItems] = useState<SimpleMediaItem[]>([]);

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

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const plainTextToHtml = (value: string) =>
    value
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
      .join('');

  const markdownToHtml = (value: string) => {
    const escaped = plainTextToHtml(value)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/__([^_]+)__/g, '<u>$1</u>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    return escaped;
  };

  const getEditableDescription = (value: string) =>
    /<\/?[a-z][\s\S]*>/i.test(value) ? value : markdownToHtml(value);

  useEffect(() => {
    if (isEditing && id) {
      const fetchEvent = async () => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (error) throw error;

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

  const updateDescriptionFromEditor = () => {
    const html = descriptionRef.current?.innerHTML || '';
    setFormData((prev) => ({ ...prev, description: html }));
  };

  const applyDescriptionFormat = (format: 'bold' | 'italic' | 'underline' | 'bullet' | 'numbered' | 'link') => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    textarea.focus();

    if (format === 'link') {
      const url = window.prompt('Enter the link URL');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else {
      const commandByFormat = {
        bold: 'bold',
        italic: 'italic',
        underline: 'underline',
        bullet: 'insertUnorderedList',
        numbered: 'insertOrderedList',
      } as const;

      document.execCommand(commandByFormat[format]);
    }

    updateDescriptionFromEditor();
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

  // Helper function to convert date string to ISO without timezone shift
  const dateToISO = (dateStr: string): string => {
    // Append T12:00:00 to avoid timezone boundary issues
    return new Date(`${dateStr}T12:00:00`).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentDescription = descriptionRef.current?.innerHTML || formData.description;

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
        description: currentDescription || null,
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

      // Save media items
      if (eventId) {
        // Get existing media to compare
        const { data: existingMedia } = await supabase
          .from('media')
          .select('id')
          .eq('entity_type', 'event')
          .eq('entity_id', eventId);

        const existingIds = new Set((existingMedia || []).map(m => m.id));
        const currentIds = new Set(mediaItems.filter(m => m.id).map(m => m.id));

        // Delete removed media
        const toDelete = [...existingIds].filter(id => !currentIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('media').delete().in('id', toDelete);
        }

        // Insert/update media items
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
            await supabase
              .from('media')
              .update(mediaData)
              .eq('id', item.id);
          } else {
            await supabase.from('media').insert([mediaData]);
          }
        }
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
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
            <div className="flex flex-wrap gap-2 rounded-md border border-border bg-secondary/20 p-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => applyDescriptionFormat('bold')} aria-label="Bold selected text">
                <Bold size={16} />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyDescriptionFormat('italic')} aria-label="Italicize selected text">
                <Italic size={16} />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyDescriptionFormat('underline')} aria-label="Underline selected text">
                <Underline size={16} />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyDescriptionFormat('bullet')} aria-label="Create bullet list">
                <List size={16} />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyDescriptionFormat('numbered')} aria-label="Create numbered list">
                <ListOrdered size={16} />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => applyDescriptionFormat('link')} aria-label="Add link">
                <LinkIcon size={16} />
              </Button>
            </div>
            <div
              ref={descriptionRef}
              id="description"
              contentEditable
              role="textbox"
              aria-multiline="true"
              className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: getEditableDescription(formData.description) }}
              onBlur={updateDescriptionFromEditor}
            />
            <p className="text-xs text-muted-foreground">
              Select text and use the formatting buttons. Blank lines, lists, bold, italics, underlines, and links will show on the public event details.
            </p>
          </div>

          {/* Featured Image Upload */}
          <ImageUpload
            value={formData.featured_image_url}
            onChange={(url) => setFormData(prev => ({ ...prev, featured_image_url: url }))}
            label="Featured Image (Hero Image)"
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

          {/* Additional Media Section */}
          <div className="pt-4 border-t border-border">
            <SimpleMediaUpload
              entityType="event"
              entityId={id}
              onMediaChange={handleMediaChange}
            />
          </div>
        </div>

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
