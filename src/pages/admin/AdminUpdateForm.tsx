import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Image as ImageIcon, Video, Link as LinkIcon, X, Loader2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { AdminFormSkeleton } from "@/components/shared/skeletons";

interface UpdateFormData {
  title: string;
  description: string;
  media_url: string;
  media_type: 'image' | 'video' | 'link';
  thumbnail_url: string;
  is_published: boolean;
}

export default function AdminUpdateForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<UpdateFormData>({
    title: '',
    description: '',
    media_url: '',
    media_type: 'image',
    thumbnail_url: '',
    is_published: false,
  });

  useEffect(() => {
    if (isEditing && id) {
      const fetchUpdate = async () => {
        try {
          const { data, error } = await supabase
            .from('updates')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setFormData({
              title: data.title || '',
              description: data.description || '',
              media_url: data.media_url || '',
              media_type: (data.media_type as 'image' | 'video' | 'link') || 'image',
              thumbnail_url: data.thumbnail_url || '',
              is_published: data.is_published || false,
            });
          }
        } catch (error) {
          console.error('Error fetching update:', error);
          toast({
            title: 'Error',
            description: 'Failed to load update.',
            variant: 'destructive',
          });
        } finally {
          setIsFetching(false);
        }
      };

      fetchUpdate();
    }
  }, [id, isEditing, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isThumbnail = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For thumbnail, always require image
    if (isThumbnail && !file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file for the thumbnail.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type based on selected media type (for non-thumbnail uploads)
    if (!isThumbnail) {
      if (formData.media_type === 'image' && !file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.media_type === 'video' && !file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a video file.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB.',
        variant: 'destructive',
      });
      return;
    }

    if (isThumbnail) {
      setIsUploadingThumbnail(true);
    } else {
      setIsUploading(true);
    }

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

      if (isThumbnail) {
        setFormData((prev) => ({ ...prev, thumbnail_url: publicUrl }));
      } else {
        setFormData((prev) => ({ ...prev, media_url: publicUrl }));
      }

      toast({
        title: 'File uploaded',
        description: 'The file has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (isThumbnail) {
        setIsUploadingThumbnail(false);
        if (thumbnailInputRef.current) {
          thumbnailInputRef.current.value = '';
        }
      } else {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in the title.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const updateData = {
        title: formData.title,
        description: formData.description || null,
        media_url: formData.media_url || null,
        media_type: formData.media_type,
        thumbnail_url: formData.thumbnail_url || null,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        created_by: user?.id,
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from('updates')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('updates')
          .insert([updateData]);

        if (error) throw error;
      }

      toast({
        title: isEditing ? 'Update saved' : 'Update created',
        description: `The update has been ${isEditing ? 'saved' : 'created'} successfully.`,
      });

      navigate('/admin/updates');
    } catch (error) {
      console.error('Error saving update:', error);
      toast({
        title: 'Error',
        description: 'Failed to save update. Please try again.',
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
          <Link to="/admin/updates">
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {isEditing ? 'Edit Update' : 'Create Update'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing ? 'Update details' : 'Create a new homepage update'}
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
              placeholder="Update title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              id="description"
              value={formData.description}
              onChange={(description) => setFormData((prev) => ({ ...prev, description }))}
              placeholder="A brief description of the update..."
              minHeightClassName="min-h-[150px]"
            />
          </div>

          {/* Media Type Selection */}
          <div className="space-y-2">
            <Label>Media Type</Label>
            <div className="flex gap-2">
              {(['image', 'video', 'link'] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={formData.media_type === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, media_type: type, media_url: '', thumbnail_url: '' }))}
                  className="flex items-center gap-2"
                >
                  {type === 'image' && <ImageIcon size={16} />}
                  {type === 'video' && <Video size={16} />}
                  {type === 'link' && <LinkIcon size={16} />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Media Upload/Input */}
          <div className="space-y-2">
            <Label>{formData.media_type === 'link' ? 'Link URL' : 'Media'}</Label>
            
            {formData.media_type === 'link' ? (
              <Input
                name="media_url"
                value={formData.media_url}
                onChange={handleChange}
                placeholder="https://example.com"
                type="url"
              />
            ) : formData.media_url ? (
              <div className="relative group">
                {formData.media_type === 'video' ? (
                  <video
                    src={formData.media_url}
                    className="w-full h-48 object-cover rounded-lg border border-border"
                    controls
                  />
                ) : (
                  <img
                    src={formData.media_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, media_url: '' }))}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors ${isUploading ? 'cursor-wait' : ''}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload {formData.media_type}
                    </span>
                    <span className="text-xs text-muted-foreground/70">Max 50MB</span>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={formData.media_type === 'video' ? 'video/*' : 'image/*'}
              onChange={(e) => handleFileUpload(e, false)}
              className="hidden"
            />
          </div>

          {/* Thumbnail Upload for Links */}
          {formData.media_type === 'link' && (
            <div className="space-y-2">
              <Label>Thumbnail Image (for preview)</Label>
              {formData.thumbnail_url ? (
                <div className="relative group">
                  <img
                    src={formData.thumbnail_url}
                    alt="Thumbnail preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-border bg-secondary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, thumbnail_url: '' }))}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => !isUploadingThumbnail && thumbnailInputRef.current?.click()}
                  className={`w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors ${isUploadingThumbnail ? 'cursor-wait' : ''}`}
                >
                  {isUploadingThumbnail ? (
                    <>
                      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload preview image
                      </span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, true)}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                This image will be shown as a preview on the homepage
              </p>
            </div>
          )}

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
                  ? 'This update will be visible on the website.'
                  : 'This update will be saved as a draft.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" variant="hero" disabled={isLoading}>
            {isLoading ? (
              'Saving...'
            ) : (
              <>
                <Save size={18} />
                {isEditing ? 'Update' : 'Create Update'}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/updates">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
