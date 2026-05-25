import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, X, Image as ImageIcon, Video, Link as LinkIcon, 
  Loader2, Plus, Trash2, GripVertical, Music 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MediaItem {
  id?: string;
  media_type: 'image' | 'video' | 'link' | 'audio';
  url: string;
  title: string;
  description: string;
  display_order: number;
  isNew?: boolean;
}

interface MediaManagerProps {
  entityType: 'event' | 'blog_post';
  entityId?: string;
  onMediaChange?: (media: MediaItem[]) => void;
}

export function MediaManager({ entityType, entityId, onMediaChange }: MediaManagerProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const { toast } = useToast();

  // Fetch existing media when entityId is provided
  useEffect(() => {
    if (entityId) {
      fetchMedia();
    }
  }, [entityId]);

  // Notify parent of changes
  useEffect(() => {
    onMediaChange?.(mediaItems);
  }, [mediaItems, onMediaChange]);

  const fetchMedia = async () => {
    if (!entityId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setMediaItems((data || []).map(item => ({
        id: item.id,
        media_type: item.media_type as 'image' | 'video' | 'link' | 'audio',
        url: item.url,
        title: item.title || '',
        description: item.description || '',
        display_order: item.display_order || 0,
      })));
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMediaItem = () => {
    setMediaItems(prev => [...prev, {
      media_type: 'image',
      url: '',
      title: '',
      description: '',
      display_order: prev.length,
      isNew: true,
    }]);
  };

  const removeMediaItem = async (index: number) => {
    const item = mediaItems[index];
    
    if (item.id) {
      try {
        const { error } = await supabase
          .from('media')
          .delete()
          .eq('id', item.id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting media:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete media item.',
          variant: 'destructive',
        });
        return;
      }
    }

    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateMediaItem = (index: number, updates: Partial<MediaItem>) => {
    setMediaItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  const moveMediaItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setMediaItems(prev => {
      const newItems = [...prev];
      const [moved] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, moved);
      return newItems.map((item, i) => ({ ...item, display_order: i }));
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image, video, or audio file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingIndex(index);

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

      const detectedType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
      updateMediaItem(index, {
        url: publicUrl,
        media_type: detectedType,
      });

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
      setUploadingIndex(null);
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={16} />;
      case 'audio': return <Music size={16} />;
      case 'link': return <LinkIcon size={16} />;
      default: return <ImageIcon size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Additional Media</Label>
        <Button type="button" variant="outline" size="sm" onClick={addMediaItem}>
          <Plus size={16} />
          Add Media
        </Button>
      </div>

      {mediaItems.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No media added yet</p>
          <Button type="button" variant="ghost" size="sm" onClick={addMediaItem} className="mt-2">
            Add your first media item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {mediaItems.map((item, index) => (
            <div
              key={item.id || index}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index.toString());
                (e.target as HTMLElement).classList.add('opacity-50');
              }}
              onDragEnd={(e) => {
                (e.target as HTMLElement).classList.remove('opacity-50');
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                moveMediaItem(fromIndex, index);
              }}
              className="p-4 border border-border rounded-lg bg-card space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical size={16} className="cursor-grab active:cursor-grabbing" />
                  {getMediaIcon(item.media_type)}
                  <span className="text-sm font-medium">Media #{index + 1}</span>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeMediaItem(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={item.media_type}
                    onValueChange={(value: 'image' | 'video' | 'link' | 'audio') => 
                      updateMediaItem(index, { media_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Title (optional)</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateMediaItem(index, { title: e.target.value })}
                    placeholder="Media title"
                  />
                </div>
              </div>

              {item.media_type === 'link' ? (
                <div className="space-y-2">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={item.url}
                    onChange={(e) => updateMediaItem(index, { url: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">{item.media_type === 'image' ? 'Upload or URL' : 'Upload'}</Label>
                  {item.url ? (
                    <div className="relative group">
                      {item.media_type === 'video' ? (
                        <video
                          src={item.url}
                          className="w-full max-h-64 object-contain rounded-lg border border-border bg-secondary/30"
                          controls
                        />
                      ) : item.media_type === 'audio' ? (
                        <div className="p-4 rounded-lg border border-border bg-secondary/30 flex flex-col items-center gap-2">
                          <Music className="h-8 w-8 text-muted-foreground" />
                          <audio src={item.url} controls className="w-full" />
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.title || 'Media preview'}
                          className="w-full max-h-64 object-contain rounded-lg border border-border bg-secondary/30"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => updateMediaItem(index, { url: '' })}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div
                        onClick={() => fileInputRefs.current[index]?.click()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileUpload(index, file);
                        }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="flex-1 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                      >
                        {uploadingIndex === index ? (
                          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Drop or click to upload</span>
                          </>
                        )}
                      </div>
                      <input
                        ref={el => fileInputRefs.current[index] = el}
                        type="file"
                        accept={item.media_type === 'video' ? 'video/*' : item.media_type === 'audio' ? 'audio/*' : 'image/*'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(index, file);
                        }}
                        className="hidden"
                      />
                      {item.media_type === 'image' && (
                        <div className="flex-1">
                          <Input
                            value={item.url}
                            onChange={(e) => updateMediaItem(index, { url: e.target.value })}
                            placeholder="Or paste image URL"
                            className="h-24"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateMediaItem(index, { description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { MediaItem };
