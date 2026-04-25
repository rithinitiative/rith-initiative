import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { MediaManager, MediaItem } from '@/components/admin/MediaManager';
import { FormBuilder, FormBuilderHandle, FormData as BlogFormData } from '@/components/admin/FormBuilder';

interface PostFormData {
  title: string;
  content: string;
  excerpt: string;
  author_name: string;
  category: string;
  featured_image_url: string;
  is_published: boolean;
}

export default function AdminPostForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
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
    if (isEditing && id) {
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
              content: data.content || '',
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
    }
  }, [id, isEditing, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMediaChange = useCallback((media: MediaItem[]) => {
    setMediaItems(media);
  }, []);

  const handleFormChange = useCallback((form: BlogFormData | null) => {
    setBlogFormData(form);
  }, []);

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

    // Validate form fields if form exists
    if (currentBlogFormData && currentBlogFormData.fields.length > 0) {
      for (const field of currentBlogFormData.fields) {
        if (field.field_type === 'section') continue;

        if (field.field_type === 'multiple_choice' || field.field_type === 'checkbox') {
          const validOptions = (field.options || []).filter(opt => opt.trim() !== '');
          if (validOptions.length === 0) {
            toast({
              title: 'Invalid form field',
              description: `The ${field.field_type === 'checkbox' ? 'checkbox' : 'multiple choice'} field "${field.label || 'Untitled'}" must have at least one option.`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    setIsLoading(true);

    try {
      const postData = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || null,
        author_name: formData.author_name || null,
        category: formData.category || null,
        featured_image_url: formData.featured_image_url || null,
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
      } else {
        const { data, error } = await supabase
          .from('blog_posts')
          .insert([postData])
          .select('id')
          .single();

        if (error) throw error;
        postId = data.id;
      }

      // Save media items
      if (postId) {
        // Get existing media to compare
        const { data: existingMedia } = await supabase
          .from('media')
          .select('id')
          .eq('entity_type', 'blog_post')
          .eq('entity_id', postId);

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
            entity_type: 'blog_post' as const,
            entity_id: postId,
            media_type: item.media_type,
            url: item.url,
            title: item.title || null,
            description: item.description || null,
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

        // Save form if present
        if (postId && currentBlogFormData) {
          // Check if form exists
          const { data: existingForm, error: existingFormError } = await supabase
            .from('blog_post_forms')
            .select('id')
            .eq('post_id', postId)
            .maybeSingle();

          if (existingFormError) throw existingFormError;

          let formId = existingForm?.id || currentBlogFormData.id;

          if (formId) {
            // Update existing form
            const { error: updateFormError } = await supabase
              .from('blog_post_forms')
              .update({
                title: currentBlogFormData.title,
                description: currentBlogFormData.description || null,
                is_active: currentBlogFormData.is_active,
                updated_at: new Date().toISOString(),
              })
              .eq('id', formId);

            if (updateFormError) throw updateFormError;
          } else {
            // Create new form
            const { data: newForm, error: formError } = await supabase
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

            if (formError) throw formError;
            formId = newForm.id;
          }

          if (formId) {
            // Get existing fields
            const { data: existingFields, error: existingFieldsError } = await supabase
              .from('blog_form_fields')
              .select('id')
              .eq('form_id', formId);

            if (existingFieldsError) throw existingFieldsError;

            const existingFieldIds = new Set((existingFields || []).map(f => f.id));
            const currentFieldIds = new Set(currentBlogFormData.fields.filter(f => f.id).map(f => f.id));

            // Delete removed fields
            const fieldsToDelete = [...existingFieldIds].filter(id => !currentFieldIds.has(id));
            if (fieldsToDelete.length > 0) {
              const { error: deleteFieldsError } = await supabase.from('blog_form_fields').delete().in('id', fieldsToDelete);
              if (deleteFieldsError) throw deleteFieldsError;
            }

            // Insert/update fields
            for (const field of currentBlogFormData.fields) {
              const validOptions = field.options?.filter(opt => opt.trim() !== '');
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
                const { error: updateFieldError } = await supabase
                  .from('blog_form_fields')
                  .update(fieldData)
                  .eq('id', field.id);
                if (updateFieldError) throw updateFieldError;
              } else {
                const { error: insertFieldError } = await supabase.from('blog_form_fields').insert([fieldData]);
                if (insertFieldError) throw insertFieldError;
              }
            }
          }
        } else if (postId && !currentBlogFormData) {
          // Delete form if it was removed
          const { error: deleteFormError } = await supabase
            .from('blog_post_forms')
            .delete()
            .eq('post_id', postId);
          if (deleteFormError) throw deleteFormError;
        }
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
            {isEditing ? 'Update post details' : 'Write a new blog post'}
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
            label="Blog Post Image"
          />


          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Write your post content here..."
              rows={12}
              required
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
                placeholder="e.g., News, Events, Community"
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
                Publish immediately
              </Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_published
                  ? 'This post will be visible on the website.'
                  : 'This post will be saved as a draft.'}
              </p>
            </div>
          </div>

          {/* Additional Media Section */}
          <div className="pt-4 border-t border-border">
            <MediaManager
              entityType="blog_post"
              entityId={id}
              onMediaChange={handleMediaChange}
            />
          </div>

          {/* Interactive Form Section */}
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
