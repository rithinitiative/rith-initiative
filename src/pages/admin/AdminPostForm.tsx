import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, GripVertical, Headphones, Plus, Save, Trash2, Upload } from 'lucide-react';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { createProjectSlug } from '@/lib/projects';
import { getEditableRichText } from '@/lib/richText';
import { SubsectionType, createAnchorSlug } from '@/lib/subsections';
import { AdminFormSkeleton } from "@/components/shared/skeletons";

interface ProjectFormData {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  featured_image_url: string;
  project_slug: string;
  project_display_order: number;
  is_published: boolean;
}

interface InterviewFormData {
  id?: string;
  title: string;
  category: string;
  interviewee_name: string;
  interviewee_description: string;
  portrait_url: string;
  audio_url: string;
  transcript: string;
  display_order: number;
  is_published: boolean;
}

const emptyInterview = (displayOrder: number): InterviewFormData => ({
  title: '',
  category: '',
  interviewee_name: '',
  interviewee_description: '',
  portrait_url: '',
  audio_url: '',
  transcript: '',
  display_order: displayOrder,
  is_published: true,
});

interface TierFormData {
  id?: string;
  name: string;
  description: string;
  amount: string;
  display_order: number;
}

interface SubsectionFormData {
  id?: string;
  title: string;
  section_type: SubsectionType;
  body: string;
  payment_paypal_button_id: string;
  payment_note: string;
  display_order: number;
  is_published: boolean;
  tiers: TierFormData[];
}

const emptyTier = (displayOrder: number): TierFormData => ({
  name: '',
  description: '',
  amount: '',
  display_order: displayOrder,
});

const emptySubsection = (displayOrder: number): SubsectionFormData => ({
  title: '',
  section_type: 'rich_text',
  body: '',
  payment_paypal_button_id: '',
  payment_note: '',
  display_order: displayOrder,
  is_published: true,
  tiers: [],
});

export default function AdminPostForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [interviews, setInterviews] = useState<InterviewFormData[]>([]);
  const [interviewCategories, setInterviewCategories] = useState<string[]>([]);
  const [newInterviewCategory, setNewInterviewCategory] = useState('');
  const [deletedInterviewIds, setDeletedInterviewIds] = useState<string[]>([]);
  const [uploadingInterviewIndex, setUploadingInterviewIndex] = useState<number | null>(null);
  const audioInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [subsections, setSubsections] = useState<SubsectionFormData[]>([]);
  const [deletedSubsectionIds, setDeletedSubsectionIds] = useState<string[]>([]);
  const [deletedTierIds, setDeletedTierIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    content: '',
    excerpt: '',
    category: 'Project',
    featured_image_url: '',
    project_slug: '',
    project_display_order: 0,
    is_published: false,
  });

  useEffect(() => {
    if (!isEditing || !id) return;

    const fetchProject = async () => {
      try {
        const [
          { data: project, error: projectError },
          { data: interviewData, error: interviewError },
          { data: subsectionData, error: subsectionError },
        ] = await Promise.all([
          supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('project_interviews')
            .select('*')
            .eq('project_id', id)
            .order('display_order', { ascending: true }),
          supabase
            .from('project_subsections')
            .select('*, project_subsection_tiers(*)')
            .eq('project_id', id)
            .order('display_order', { ascending: true }),
        ]);

        if (projectError) throw projectError;
        if (interviewError) throw interviewError;
        if (subsectionError) throw subsectionError;

        if (project) {
          setFormData({
            title: project.title || '',
            content: getEditableRichText(project.content || ''),
            excerpt: project.excerpt || '',
            category: project.category || 'Project',
            featured_image_url: project.featured_image_url || '',
            project_slug: project.project_slug || '',
            project_display_order: project.project_display_order ?? 0,
            is_published: project.is_published || false,
          });
        }

        setInterviews((interviewData || []).map((interview) => ({
          id: interview.id,
          title: interview.title || '',
          category: interview.category || '',
          interviewee_name: interview.interviewee_name || '',
          interviewee_description: interview.interviewee_description || '',
          portrait_url: interview.portrait_url || '',
          audio_url: interview.audio_url || '',
          transcript: interview.transcript || '',
          display_order: interview.display_order || 0,
          is_published: interview.is_published,
        })));
        setInterviewCategories(Array.from(new Set((interviewData || [])
          .map((interview) => (interview.category || '').trim())
          .filter(Boolean))));

        setSubsections((subsectionData || []).map((subsection) => ({
          id: subsection.id,
          title: subsection.title || '',
          section_type: (subsection.section_type === 'sponsorship' ? 'sponsorship' : 'rich_text') as SubsectionType,
          body: subsection.body || '',
          payment_paypal_button_id: subsection.payment_paypal_button_id || '',
          payment_note: subsection.payment_note || '',
          display_order: subsection.display_order || 0,
          is_published: subsection.is_published,
          tiers: (subsection.project_subsection_tiers || [])
            .slice()
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            .map((tier) => ({
              id: tier.id,
              name: tier.name || '',
              description: tier.description || '',
              amount: tier.amount != null ? String(tier.amount) : '',
              display_order: tier.display_order || 0,
            })),
        })));
      } catch (error) {
        console.error('Error fetching project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchProject();
  }, [id, isEditing, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateInterview = (index: number, updates: Partial<InterviewFormData>) => {
    setInterviews((prev) => prev.map((interview, i) => (
      i === index ? { ...interview, ...updates } : interview
    )));
  };

  const addInterviewCategory = () => {
    const category = newInterviewCategory.trim();
    if (!category) return;

    setInterviewCategories((prev) => (
      prev.some((item) => item.toLowerCase() === category.toLowerCase())
        ? prev
        : [...prev, category]
    ));
    setNewInterviewCategory('');
  };

  const removeInterviewCategory = (category: string) => {
    setInterviewCategories((prev) => prev.filter((item) => item !== category));
    setInterviews((prev) => prev.map((interview) => (
      interview.category === category ? { ...interview, category: '' } : interview
    )));
  };

  const addInterview = () => {
    setInterviews((prev) => [...prev, emptyInterview(prev.length)]);
  };

  const removeInterview = (index: number) => {
    const interview = interviews[index];
    if (interview.id) {
      setDeletedInterviewIds((prev) => [...prev, interview.id as string]);
    }
    setInterviews((prev) => prev.filter((_, i) => i !== index).map((item, order) => ({
      ...item,
      display_order: order,
    })));
  };

  const moveInterview = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= interviews.length) return;

    setInterviews((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((interview, order) => ({ ...interview, display_order: order }));
    });
  };

  // ---------- Page subsections (jump-nav + sponsorship tiers) ----------
  const updateSubsection = (index: number, updates: Partial<SubsectionFormData>) => {
    setSubsections((prev) => prev.map((subsection, i) => (
      i === index ? { ...subsection, ...updates } : subsection
    )));
  };

  const addSubsection = () => {
    setSubsections((prev) => [...prev, emptySubsection(prev.length)]);
  };

  const removeSubsection = (index: number) => {
    const subsection = subsections[index];
    if (subsection.id) {
      setDeletedSubsectionIds((prev) => [...prev, subsection.id as string]);
    }
    setSubsections((prev) => prev.filter((_, i) => i !== index).map((item, order) => ({
      ...item,
      display_order: order,
    })));
  };

  const moveSubsection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= subsections.length) return;

    setSubsections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((subsection, order) => ({ ...subsection, display_order: order }));
    });
  };

  const addTier = (subsectionIndex: number) => {
    setSubsections((prev) => prev.map((subsection, i) => (
      i === subsectionIndex
        ? { ...subsection, tiers: [...subsection.tiers, emptyTier(subsection.tiers.length)] }
        : subsection
    )));
  };

  const updateTier = (subsectionIndex: number, tierIndex: number, updates: Partial<TierFormData>) => {
    setSubsections((prev) => prev.map((subsection, i) => (
      i === subsectionIndex
        ? {
            ...subsection,
            tiers: subsection.tiers.map((tier, t) => (t === tierIndex ? { ...tier, ...updates } : tier)),
          }
        : subsection
    )));
  };

  const removeTier = (subsectionIndex: number, tierIndex: number) => {
    const tier = subsections[subsectionIndex]?.tiers[tierIndex];
    if (tier?.id) {
      setDeletedTierIds((prev) => [...prev, tier.id as string]);
    }
    setSubsections((prev) => prev.map((subsection, i) => (
      i === subsectionIndex
        ? {
            ...subsection,
            tiers: subsection.tiers.filter((_, t) => t !== tierIndex).map((item, order) => ({
              ...item,
              display_order: order,
            })),
          }
        : subsection
    )));
  };

  const moveTier = (subsectionIndex: number, fromIndex: number, toIndex: number) => {
    const tiers = subsections[subsectionIndex]?.tiers ?? [];
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= tiers.length) return;

    setSubsections((prev) => prev.map((subsection, i) => {
      if (i !== subsectionIndex) return subsection;
      const next = [...subsection.tiers];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...subsection, tiers: next.map((tier, order) => ({ ...tier, display_order: order })) };
    }));
  };

  const handleAudioUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an audio file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an audio file smaller than 100MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingInterviewIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      updateInterview(index, { audio_url: publicUrl });
      toast({
        title: 'Audio uploaded',
        description: 'The interview audio is ready to save.',
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload the audio file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingInterviewIndex(null);
    }
  };

  const saveInterviews = async (projectId: string) => {
    if (deletedInterviewIds.length > 0) {
      const { error } = await supabase
        .from('project_interviews')
        .delete()
        .in('id', deletedInterviewIds);
      if (error) throw error;
    }

    for (const [index, interview] of interviews.entries()) {
      if (!interview.title.trim() && !interview.audio_url && !interview.transcript.trim()) continue;

      const interviewData = {
        project_id: projectId,
        title: interview.title.trim() || `Interview ${index + 1}`,
        category: interview.category.trim() || null,
        interviewee_name: interview.interviewee_name.trim() || null,
        interviewee_description: interview.interviewee_description.trim() || null,
        portrait_url: interview.portrait_url || null,
        audio_url: interview.audio_url || null,
        transcript: interview.transcript.trim() || null,
        display_order: index,
        is_published: interview.is_published,
        created_by: user?.id,
      };

      if (interview.id) {
        const { error } = await supabase
          .from('project_interviews')
          .update(interviewData)
          .eq('id', interview.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('project_interviews')
          .insert([interviewData])
          .select('id')
          .single();
        if (error) throw error;
        interview.id = data.id;
      }
    }
  };

  const saveSubsections = async (projectId: string) => {
    if (deletedTierIds.length > 0) {
      const { error } = await supabase
        .from('project_subsection_tiers')
        .delete()
        .in('id', deletedTierIds);
      if (error) throw error;
    }

    if (deletedSubsectionIds.length > 0) {
      const { error } = await supabase
        .from('project_subsections')
        .delete()
        .in('id', deletedSubsectionIds);
      if (error) throw error;
    }

    for (const [index, subsection] of subsections.entries()) {
      if (!subsection.title.trim()) continue;

      const isSponsorship = subsection.section_type === 'sponsorship';
      const subsectionData = {
        project_id: projectId,
        title: subsection.title.trim(),
        anchor_slug: createAnchorSlug(subsection.title),
        section_type: subsection.section_type,
        body: subsection.body.trim() || null,
        payment_paypal_button_id: isSponsorship ? (subsection.payment_paypal_button_id.trim() || null) : null,
        payment_note: isSponsorship ? (subsection.payment_note.trim() || null) : null,
        display_order: index,
        is_published: subsection.is_published,
        created_by: user?.id,
      };

      if (subsection.id) {
        const { error } = await supabase
          .from('project_subsections')
          .update(subsectionData)
          .eq('id', subsection.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('project_subsections')
          .insert([subsectionData])
          .select('id')
          .single();
        if (error) throw error;
        subsection.id = data.id;
      }

      // Persist tiers only for sponsorship subsections.
      if (!isSponsorship) continue;

      for (const [tierIndex, tier] of subsection.tiers.entries()) {
        if (!tier.name.trim()) continue;

        const tierData = {
          subsection_id: subsection.id as string,
          name: tier.name.trim(),
          description: tier.description.trim() || null,
          amount: Number(tier.amount) || 0,
          display_order: tierIndex,
        };

        if (tier.id) {
          const { error } = await supabase
            .from('project_subsection_tiers')
            .update(tierData)
            .eq('id', tier.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('project_subsection_tiers')
            .insert([tierData])
            .select('id')
            .single();
          if (error) throw error;
          tier.id = data.id;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the project title and main description.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const slug = createProjectSlug(formData.project_slug || formData.title);
      let displayOrder = formData.project_display_order;

      if (!isEditing) {
        const { data: orderData, error: orderError } = await supabase
          .from('blog_posts')
          .select('project_display_order')
          .order('project_display_order', { ascending: false })
          .limit(1);

        if (orderError) throw orderError;
        displayOrder = ((orderData?.[0]?.project_display_order ?? -1) as number) + 1;
      }

      const projectData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || null,
        author_name: null,
        category: formData.category || 'Project',
        featured_image_url: formData.featured_image_url || null,
        project_slug: slug,
        project_display_order: displayOrder,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        created_by: user?.id,
      };

      let projectId = id;

      if (isEditing && id) {
        const { error } = await supabase
          .from('blog_posts')
          .update(projectData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert([projectData])
          .select('id')
          .single();

        if (error) throw error;
        projectId = data.id;
      }

      if (projectId) {
        await saveInterviews(projectId);
        await saveSubsections(projectId);
      }

      toast({
        title: isEditing ? 'Project updated' : 'Project created',
        description: `The project has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      navigate('/admin/projects');
    } catch (error: unknown) {
      console.error('Error saving project:', error);
      const message = error && typeof error === 'object' && 'code' in error && error.code === '23505'
        ? 'That project URL is already in use. Please choose a different URL slug.'
        : 'Failed to save project. Please try again.';

      toast({
        title: 'Error',
        description: message,
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
          <Link to="/admin/projects">
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {isEditing ? 'Edit Project' : 'Create Project'}
          </h1>
          <p className="text-muted-foreground text-sm">
            Build a long-term project page with optional interviews, audio, and transcripts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
        <section className="space-y-4 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Threads & Bridges: Oral History Project"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_slug">Project URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-sm text-muted-foreground">/projects/</span>
              <Input
                id="project_slug"
                name="project_slug"
                value={formData.project_slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, project_slug: createProjectSlug(e.target.value) }))}
                onBlur={() => setFormData((prev) => ({ ...prev, project_slug: createProjectSlug(prev.project_slug || prev.title) }))}
                placeholder="threads-bridges-oral-history-project"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Short Description</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="A brief description shown on the Projects page and under the project title."
              rows={3}
            />
          </div>

          <ImageUpload
            value={formData.featured_image_url}
            onChange={(url) => setFormData((prev) => ({ ...prev, featured_image_url: url }))}
            label="Hero Image"
          />

          <div className="space-y-2">
            <Label htmlFor="content">Main Project Description *</Label>
            <RichTextEditor
              id="content"
              value={formData.content}
              onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
              placeholder="Write the full project description here..."
              minHeightClassName="min-h-[320px]"
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-4">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_published: checked }))
              }
            />
            <div>
              <Label htmlFor="is_published" className="cursor-pointer">
                Publish on website
              </Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_published
                  ? 'This project will appear under Projects.'
                  : 'This project will be saved as a draft.'}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Interviews</h2>
              <p className="text-sm text-muted-foreground">
                Add audio, transcript, portrait, and interviewee details only when this project needs them.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addInterview}>
              <Plus size={16} />
              Add Interview
            </Button>
          </div>

          <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
            <Label>Interview Categories</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Create categories visitors can use to browse interviews in this project.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={newInterviewCategory}
                onChange={(e) => setNewInterviewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInterviewCategory();
                  }
                }}
                placeholder="e.g., Weavers, Elders, Artists"
              />
              <Button type="button" variant="outline" onClick={addInterviewCategory}>
                <Plus size={16} />
                Add Category
              </Button>
            </div>
            {interviewCategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {interviewCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => removeInterviewCategory(category)}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Remove category"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {interviews.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <Headphones className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No interviews added yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {interviews.map((interview, index) => (
                <div key={interview.id || index} className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <GripVertical size={16} />
                      Interview #{index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveInterview(index, index - 1)}
                        disabled={index === 0}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => moveInterview(index, index + 1)}
                        disabled={index === interviews.length - 1}
                      >
                        Down
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeInterview(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Interview Title</Label>
                      <Input
                        value={interview.title}
                        onChange={(e) => updateInterview(index, { title: e.target.value })}
                        placeholder="Full Oral History Interview"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        value={interview.category}
                        onChange={(e) => updateInterview(index, { category: e.target.value })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">No category</option>
                        {interviewCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Interviewee Name</Label>
                      <Input
                        value={interview.interviewee_name}
                        onChange={(e) => updateInterview(index, { interviewee_name: e.target.value })}
                        placeholder="Person being interviewed"
                      />
                    </div>
                  </div>

                  <ImageUpload
                    value={interview.portrait_url}
                    onChange={(url) => updateInterview(index, { portrait_url: url })}
                    label="Interviewee Photo"
                  />

                  <div className="space-y-2">
                    <Label>Interviewee Description</Label>
                    <RichTextEditor
                      value={interview.interviewee_description}
                      onChange={(interviewee_description) => updateInterview(index, { interviewee_description })}
                      placeholder="Short bio or context about the person being interviewed."
                      minHeightClassName="min-h-[150px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Audio File</Label>
                    {interview.audio_url ? (
                      <div className="rounded-lg border border-border bg-secondary/30 p-4">
                        <audio src={interview.audio_url} controls className="w-full" />
                        <div className="mt-3 flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => audioInputRefs.current[index]?.click()}>
                            Replace Audio
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => updateInterview(index, { audio_url: '' })}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => audioInputRefs.current[index]?.click()}
                        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/30"
                      >
                        <Upload size={20} />
                        {uploadingInterviewIndex === index ? 'Uploading audio...' : 'Upload audio file'}
                      </button>
                    )}
                    <input
                      ref={(el) => { audioInputRefs.current[index] = el; }}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioUpload(index, file);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Transcript</Label>
                    <Textarea
                      value={interview.transcript}
                      onChange={(e) => updateInterview(index, { transcript: e.target.value })}
                      placeholder="Paste the interview transcript here. Paragraph breaks will be preserved."
                      rows={8}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                    <Switch
                      checked={interview.is_published}
                      onCheckedChange={(checked) => updateInterview(index, { is_published: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {interview.is_published ? 'Show this interview on the website' : 'Keep this interview hidden'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-border/50 bg-card p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">Page Subsections</h2>
              <p className="text-sm text-muted-foreground">
                Extra content blocks shown on the project page with a jump-to navigation panel. Use a Sponsorship
                block to list priced tiers with Zelle &amp; PayPal payment options.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addSubsection}>
              <Plus size={16} />
              Add Subsection
            </Button>
          </div>

          {subsections.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No subsections added yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {subsections.map((subsection, index) => (
                <div key={subsection.id || index} className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <GripVertical size={16} />
                      Subsection #{index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => moveSubsection(index, index - 1)} disabled={index === 0}>
                        Up
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => moveSubsection(index, index + 1)} disabled={index === subsections.length - 1}>
                        Down
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeSubsection(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subsection Title</Label>
                      <Input
                        value={subsection.title}
                        onChange={(e) => updateSubsection(index, { title: e.target.value })}
                        placeholder="e.g., Oral History Project"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select
                        value={subsection.section_type}
                        onChange={(e) => updateSubsection(index, { section_type: e.target.value as SubsectionType })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="rich_text">Text block</option>
                        <option value="sponsorship">Sponsorship</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{subsection.section_type === 'sponsorship' ? 'Intro Text' : 'Content'}</Label>
                    <RichTextEditor
                      value={subsection.body}
                      onChange={(body) => updateSubsection(index, { body })}
                      placeholder={subsection.section_type === 'sponsorship'
                        ? 'Short intro shown above the sponsorship tiers.'
                        : 'Write the content for this subsection...'}
                      minHeightClassName="min-h-[150px]"
                    />
                  </div>

                  {subsection.section_type === 'sponsorship' && (
                    <div className="space-y-4 rounded-lg border border-border/60 bg-secondary/20 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>PayPal Hosted Button ID</Label>
                          <Input
                            value={subsection.payment_paypal_button_id}
                            onChange={(e) => updateSubsection(index, { payment_paypal_button_id: e.target.value })}
                            placeholder="e.g., 4GFPQY2QTTJBQ"
                          />
                          <p className="text-xs text-muted-foreground">
                            From the PayPal donate button code. Leave blank to hide the PayPal option.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Note (optional)</Label>
                          <Textarea
                            value={subsection.payment_note}
                            onChange={(e) => updateSubsection(index, { payment_note: e.target.value })}
                            placeholder="A short note shown under the tiers."
                            rows={3}
                          />
                        </div>
                      </div>

                      <p className="rounded-md bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                        Zelle payments use the shared QR code set in{' '}
                        <Link to="/admin/settings" className="font-medium text-primary underline underline-offset-2">
                          Settings
                        </Link>
                        . It's the same across the whole site.
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label>Sponsorship Tiers</Label>
                            <p className="text-xs text-muted-foreground">
                              Displayed highest amount first, automatically.
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addTier(index)}>
                            <Plus size={16} />
                            Add Tier
                          </Button>
                        </div>

                        {subsection.tiers.length === 0 ? (
                          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                            No tiers yet.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {subsection.tiers.map((tier, tierIndex) => (
                              <div key={tier.id || tierIndex} className="rounded-md border border-border bg-background p-3">
                                <div className="mb-3 flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">Tier #{tierIndex + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveTier(index, tierIndex, tierIndex - 1)} disabled={tierIndex === 0}>
                                      Up
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveTier(index, tierIndex, tierIndex + 1)} disabled={tierIndex === subsection.tiers.length - 1}>
                                      Down
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => removeTier(index, tierIndex)}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Name</Label>
                                    <Input
                                      value={tier.name}
                                      onChange={(e) => updateTier(index, tierIndex, { name: e.target.value })}
                                      placeholder="Presenting Sponsor"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                      value={tier.description}
                                      onChange={(e) => updateTier(index, tierIndex, { description: e.target.value })}
                                      placeholder="Half the year"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Amount ($)</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="1"
                                      value={tier.amount}
                                      onChange={(e) => updateTier(index, tierIndex, { amount: e.target.value })}
                                      placeholder="2500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                    <Switch
                      checked={subsection.is_published}
                      onCheckedChange={(checked) => updateSubsection(index, { is_published: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {subsection.is_published ? 'Show this subsection on the website' : 'Keep this subsection hidden'}
                    </span>
                  </div>
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
                {isEditing ? 'Update Project' : 'Create Project'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/projects">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
