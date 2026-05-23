import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bold, Italic, Link as LinkIcon, List, ListOrdered, Save, Underline } from 'lucide-react';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { SimpleMediaItem, SimpleMediaUpload } from '@/components/admin/SimpleMediaUpload';
import { createProjectSlug } from '@/lib/projects';
import { getEditableRichText } from '@/lib/richText';

interface ProjectFormData {
  title: string;
  slug: string;
  summary: string;
  content: string;
  featuredImageUrl: string;
  isPublished: boolean;
  displayOrder: string;
}

export default function AdminProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaItems, setMediaItems] = useState<SimpleMediaItem[]>([]);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    slug: '',
    summary: '',
    content: '',
    featuredImageUrl: '',
    isPublished: true,
    displayOrder: '0',
  });

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, description, featured_image_url, project_slug, project_summary, project_content, project_featured_image_url, project_is_published, project_display_order')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Project event not found');

        const nextContent = data.project_content || data.description || '';
        setFormData({
          title: data.title || '',
          slug: data.project_slug || createProjectSlug(data.title || ''),
          summary: data.project_summary || '',
          content: nextContent,
          featuredImageUrl: data.project_featured_image_url || data.featured_image_url || '',
          isPublished: data.project_is_published !== false,
          displayOrder: String(data.project_display_order ?? 0),
        });

        window.setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.innerHTML = getEditableRichText(nextContent);
          }
        }, 0);
      } catch (error) {
        console.error('Error loading project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project.',
          variant: 'destructive',
        });
        navigate('/admin/projects');
      } finally {
        setIsFetching(false);
      }
    };

    fetchProject();
  }, [id, navigate, toast]);

  const updateContentFromEditor = () => {
    const html = contentRef.current?.innerHTML || '';
    setFormData((prev) => ({ ...prev, content: html }));
  };

  const applyContentFormat = (format: 'bold' | 'italic' | 'underline' | 'bullet' | 'numbered' | 'link') => {
    const editor = contentRef.current;
    if (!editor) return;

    editor.focus();

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

    updateContentFromEditor();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const title = formData.title.trim();
    const slug = createProjectSlug(formData.slug || title);
    const displayOrder = Number(formData.displayOrder);

    if (!title) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      toast({
        title: 'Display order must be a whole number',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('events')
        .update({
          title,
          is_project: true,
          project_slug: slug,
          project_summary: formData.summary.trim() || null,
          project_content: contentRef.current?.innerHTML || formData.content || null,
          project_featured_image_url: formData.featuredImageUrl.trim() || null,
          project_is_published: formData.isPublished,
          project_display_order: displayOrder,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Project updated',
        description: 'The project page has been saved.',
      });

      navigate('/admin/projects');
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save project. Make sure the slug is unique.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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
          <Link to="/admin/projects">
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Edit Project Page</h1>
          <p className="text-muted-foreground text-sm">
            Customize how this selected event appears under Projects.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="project-title">Project Title *</Label>
            <Input
              id="project-title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-slug">Project URL Slug</Label>
            <Input
              id="project-slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              onBlur={() => setFormData((prev) => ({ ...prev, slug: createProjectSlug(prev.slug || prev.title) }))}
              placeholder="threads-and-bridges"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-summary">Short Summary</Label>
          <Textarea
            id="project-summary"
            value={formData.summary}
            onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
            rows={3}
            placeholder="A short introduction shown on the Projects page."
          />
        </div>

        <ImageUpload
          value={formData.featuredImageUrl}
          onChange={(url) => setFormData((prev) => ({ ...prev, featuredImageUrl: url }))}
          label="Project Hero Image"
        />

        <div className="space-y-2">
          <Label>Project Page Content</Label>
          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-secondary/20 p-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => applyContentFormat('bold')} aria-label="Bold selected text">
              <Bold size={16} />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyContentFormat('italic')} aria-label="Italicize selected text">
              <Italic size={16} />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyContentFormat('underline')} aria-label="Underline selected text">
              <Underline size={16} />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyContentFormat('bullet')} aria-label="Create bullet list">
              <List size={16} />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyContentFormat('numbered')} aria-label="Create numbered list">
              <ListOrdered size={16} />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyContentFormat('link')} aria-label="Add link">
              <LinkIcon size={16} />
            </Button>
          </div>
          <div
            ref={contentRef}
            contentEditable
            role="textbox"
            aria-multiline="true"
            className="min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5"
            onBlur={updateContentFromEditor}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="project-order">Project Menu Order</Label>
            <Input
              id="project-order"
              type="number"
              min={0}
              step={1}
              value={formData.displayOrder}
              onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first in the Projects dropdown.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="project-published">Published</Label>
              <p className="text-xs text-muted-foreground">Show this project on the public website.</p>
            </div>
            <Switch
              id="project-published"
              checked={formData.isPublished}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPublished: checked }))}
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <SimpleMediaUpload entityType="event" entityId={id} onMediaChange={setMediaItems} />
          {mediaItems.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              These media items will appear in the project gallery and still remain attached to the event.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="hero" disabled={isSaving}>
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save Project'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/projects">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
