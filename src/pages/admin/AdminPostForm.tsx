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
        const [{ data: project, error: projectError }, { data: interviewData, error: interviewError }] = await Promise.all([
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
        ]);

        if (projectError) throw projectError;
        if (interviewError) throw interviewError;

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
