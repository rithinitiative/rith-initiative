import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Video, Loader2, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SimpleMediaItem {
  id?: string;
  media_type: 'image' | 'video';
  url: string;
  display_order: number;
}

interface SimpleMediaUploadProps {
  entityType: 'event';
  entityId?: string;
  onMediaChange?: (media: SimpleMediaItem[]) => void;
}

export function SimpleMediaUpload({ entityType, entityId, onMediaChange }: SimpleMediaUploadProps) {
  const [mediaItems, setMediaItems] = useState<SimpleMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (entityId) {
      fetchMedia();
    }
  }, [entityId]);

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
        media_type: item.media_type as 'image' | 'video',
        url: item.url,
        display_order: item.display_order || 0,
      })));
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setIsLoading(false);
    }
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

  const handleMultipleFileUpload = async (files: FileList) => {
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 50MB and was skipped.`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files',
        description: 'Please select image or video files under 50MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadCount({ current: 0, total: validFiles.length });
    setUploadProgress(0);

    const newMediaItems: SimpleMediaItem[] = [];
    const startOrder = mediaItems.length;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadCount(prev => ({ ...prev, current: i + 1 }));
      setUploadProgress(Math.round((i / validFiles.length) * 100));

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

        newMediaItems.push({
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          url: publicUrl,
          display_order: startOrder + i,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}.`,
          variant: 'destructive',
        });
      }
    }

    setUploadProgress(100);

    if (newMediaItems.length > 0) {
      setMediaItems(prev => [...prev, ...newMediaItems]);
      toast({
        title: 'Upload complete',
        description: `${newMediaItems.length} file${newMediaItems.length > 1 ? 's' : ''} uploaded successfully.`,
      });
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFileUpload(e.dataTransfer.files);
    }
  }, [mediaItems.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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
        <span className="text-base font-medium">Event Media</span>
      </div>

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isUploading
            ? 'border-primary bg-primary/5 cursor-wait'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
        }`}
      >
        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Uploading {uploadCount.current} of {uploadCount.total}...
              </p>
              <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              Drop photos & videos here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Select multiple files at once. Max 50MB per file.
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleMultipleFileUpload(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {mediaItems.map((item, index) => (
            <div key={item.id || index} className="relative group aspect-square">
              {item.media_type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
              ) : (
                <img
                  src={item.url}
                  alt={`Event media ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
              )}

              <div className="absolute bottom-2 left-2 p-1 rounded bg-background/80 backdrop-blur-sm">
                {item.media_type === 'video' ? (
                  <Video size={14} className="text-foreground" />
                ) : (
                  <ImageIcon size={14} className="text-foreground" />
                )}
              </div>

              <button
                type="button"
                onClick={() => removeMediaItem(index)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add more</span>
          </div>
        </div>
      )}
    </div>
  );
}

export type { SimpleMediaItem };
