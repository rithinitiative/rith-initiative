import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { FormBuilder, FormBuilderHandle, FormData as BlogFormData } from '@/components/admin/FormBuilder';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { getEditableRichText } from '@/lib/richText';

interface PostFormData {
  title: string;
  content: string;
  excerpt: string;
  author_name: string;
  category: string;
  featured_image_url: string;
  is_published: boolean;
}

export default function AdminBlogPostForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [blogFormData, setBlogFormData] = useState<BlogFormData | null>(null);
  const formBuilderRef = useRef<FormBuilderHandle>(null);

  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    category: '',
    featured_image_url: '',
    is_published: false,
  });

  useEffect(() => {
    if (!isEditing || !id) return;

    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setFormData({
            title: data.title || '',
            content: getEditableRichText(data.content || ''),
            excerpt: data.excerpt || '',
            author_name: data.author_name || '',
            category: data.category || '',
            featured_image_url: data.featured_image_url || '',
            is_published: data.is_published || false,
          });
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast({
          title: 'Error',
          description: 'Failed to load post.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchPost();
  }, [id, isEditing, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormChange = useCallback((form: BlogFormData | null) => {
    setBlogFormData(form);
  }, []);

  const saveForm = async (postId: string, currentBlogFormData: BlogFormData | null) => {
    if (!currentBlogFormData) {
      const { error } = await supabase
        .from('blog_post_forms')
        .delete()
        .eq('post_id', postId);
      if (error) throw error;
      return;
    }

    const { data: existingForm, error: existingFormError } = await supabase
      .from('blog_post_forms')
      .select('id')
      .eq('post_id', postId)
      .maybeSingle();

    if (existingFormError) throw existingFormError;

    let formId = existingForm?.id || currentBlogFormData.id;

    if (formId) {
      const { error } = await supabase
        .from('blog_post_forms')
        .update({
          title: currentBlogFormData.title,
          description: currentBlogFormData.description || null,
          is_active: currentBlogFormData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId);

      if (error) throw error;
    } else {
      const { data: newForm, error } = await supabase
        .from('blog_post_forms')
        .insert({
          post_id: postId,
          title: currentBlogFormData.title,
          description: currentBlogFormData.description || null,
          is_active: currentBlogFormData.is_active,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      formId = newForm.id;
    }

    const { data: existingFields, error: existingFieldsError } = await supabase
      .from('blog_form_fields')
      .select('id')
      .eq('form_id', formId);

    if (existingFieldsError) throw existingFieldsError;

    const existingFieldIds = new Set((existingFields || []).map((field) => field.id));
    const currentFieldIds = new Set(currentBlogFormData.fields.filter((field) => field.id).map((field) => field.id as string));
    const fieldsToDelete = [...existingFieldIds].filter((fieldId) => !currentFieldIds.has(fieldId));

    if (fieldsToDelete.length > 0) {
      const { error } = await supabase.from('blog_form_fields').delete().in('id', fieldsToDelete);
      if (error) throw error;
    }

    for (const field of currentBlogFormData.fields) {
      const validOptions = field.options?.filter((option) => option.trim() !== '');
      const fieldData = {
        form_id: formId,
        field_type: field.field_type,
        label: field.label || (field.field_type === 'section' ? 'Untitled section' : 'Untitled question'),
        description: field.description || null,
        options: field.field_type === 'multiple_choice' || field.field_type === 'checkbox'
          ? JSON.stringify({ choices: validOptions || [], allow_other: field.allow_other === true })
          : null,
        is_required: field.field_type === 'section' ? false : field.is_required,
        display_order: field.display_order,
      };

      if (field.id) {
        const { error } = await supabase
          .from('blog_form_fields')
          .update(fieldData)
          .eq('id', field.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_form_fields').insert([fieldData]);
        if (error) throw error;
      }
    }
  };

  const validateAttachedForm = (currentBlogFormData: BlogFormData | null) => {
    if (!currentBlogFormData || currentBlogFormData.fields.length === 0) return true;

    for (const field of currentBlogFormData.fields) {
      if (field.field_type === 'section') continue;

      if (field.field_type === 'multiple_choice' || field.field_type === 'checkbox') {
        const validOptions = (field.options || []).filter((option) => option.trim() !== '');
        if (validOptions.length === 0) {
          toast({
            title: 'Invalid form field',
            description: `The ${field.field_type === 'checkbox' ? 'checkbox' : 'multiple choice'} field "${field.label || 'Untitled'}" must have at least one option.`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the title and content.',
        variant: 'destructive',
      });
      return;
    }

    const currentBlogFormData = formBuilderRef.current?.getFormData() ?? blogFormData;
    if (!validateAttachedForm(currentBlogFormData)) return;

    setIsLoading(true);

    try {
      const postData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || null,
        author_name: formData.author_name || null,
        category: formData.category || null,
        featured_image_url: formData.featured_image_url || null,
        project_slug: null,
        project_display_order: 0,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        created_by: user?.id,
      };

      let postId = id;

      if (isEditing && id) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', id);

        if (error) throw error;

        const { error: deleteInterviewsError } = await supabase
          .from('project_interviews')
          .delete()
          .eq('project_id', id);

        if (deleteInterviewsError) throw deleteInterviewsError;
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert([postData])
          .select('id')
          .single();

        if (error) throw error;
        postId = data.id;
      }

      if (postId) {
        await saveForm(postId, currentBlogFormData);
      }

      toast({
        title: isEditing ? 'Post updated' : 'Post created',
        description: `The post has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      navigate('/admin/posts');
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Error',
        description: 'Failed to save post. Please try again.',
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
          <Link to="/admin/posts">
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {isEditing ? 'Edit Post' : 'Create Post'}
          </h1>
          <p className="text-muted-foreground text-sm">
            Write standalone blog content and attach optional reader forms.
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
              placeholder="Post title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="A brief summary of the post..."
              rows={2}
            />
          </div>

          <ImageUpload
            value={formData.featured_image_url}
            onChange={(url) => setFormData((prev) => ({ ...prev, featured_image_url: url }))}
            label="Hero Image"
          />

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <RichTextEditor
              id="content"
              value={formData.content}
              onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
              placeholder="Write your post content here..."
              minHeightClassName="min-h-[320px]"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author_name">Author Name</Label>
              <Input
                id="author_name"
                name="author_name"
                value={formData.author_name}
                onChange={handleChange}
                placeholder="Author name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g., News, Community, Survey"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/30">
            <Switch
              id="is_published"
              checked={formData.is_published}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_published: checked }))
              }
            />
            <div>
              <Label htmlFor="is_published" className="cursor-pointer">
                Publish post
              </Label>
              <p className="text-xs text-muted-foreground">
                This keeps the post available in admin. A public blog page can be connected later.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <FormBuilder
              ref={formBuilderRef}
              postId={id}
              onFormChange={handleFormChange}
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
                {isEditing ? 'Update Post' : 'Create Post'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/posts">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
