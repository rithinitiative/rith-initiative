import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Plus, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { AdminListSkeleton } from "@/components/shared/skeletons";

interface GalleryImage {
  id: string;
  url: string;
  title: string | null;
  display_order: number;
}

export default function AdminGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCount, setUploadCount] = useState({ current: 0, total: 0 });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('site_gallery')
        .select('id, url, title, display_order')
        .eq('section_key', 'home_gallery')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gallery images.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileUpload = async (files: FileList) => {
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB and was skipped.`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      toast({
        title: 'No valid files',
        description: 'Please select image files under 10MB.',
        variant: 'destructive',
      });
      return;
    }

    // Limit to 8 total images
    const availableSlots = 8 - images.length;
    if (availableSlots <= 0) {
      toast({
        title: 'Gallery full',
        description: 'You can only have 8 images in the gallery. Remove some to add more.',
        variant: 'destructive',
      });
      return;
    }

    const filesToUpload = validFiles.slice(0, availableSlots);
    if (filesToUpload.length < validFiles.length) {
      toast({
        title: 'Some files skipped',
        description: `Only ${filesToUpload.length} images were added to fill the 8-image limit.`,
      });
    }

    setIsUploading(true);
    setUploadCount({ current: 0, total: filesToUpload.length });
    setUploadProgress(0);

    const startOrder = images.length;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadCount((prev) => ({ ...prev, current: i + 1 }));
      setUploadProgress(Math.round((i / filesToUpload.length) * 100));

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        // Insert into database
        const { error: insertError } = await supabase
          .from('site_gallery')
          .insert({
            section_key: 'home_gallery',
            url: publicUrl,
            display_order: startOrder + i,
            created_by: user?.id,
          });

        if (insertError) throw insertError;
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
    toast({
      title: 'Upload complete',
      description: `${filesToUpload.length} image${filesToUpload.length > 1 ? 's' : ''} uploaded successfully.`,
    });

    setIsUploading(false);
    setUploadProgress(0);
    fetchImages();
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    if (dragIndex === null || dragIndex === dropIndex) return;
    
    // Reorder images locally first
    const reorderedImages = [...images];
    const [draggedImage] = reorderedImages.splice(dragIndex, 1);
    reorderedImages.splice(dropIndex, 0, draggedImage);
    
    // Update display_order for each image
    const updatedImages = reorderedImages.map((img, idx) => ({
      ...img,
      display_order: idx,
    }));
    
    setImages(updatedImages);
    
    // Update in database
    try {
      for (const img of updatedImages) {
        await supabase
          .from('site_gallery')
          .update({ display_order: img.display_order })
          .eq('id', img.id);
      }
      
      toast({
        title: 'Order updated',
        description: 'Gallery order has been saved.',
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to save new order.',
        variant: 'destructive',
      });
      fetchImages(); // Revert to database state on error
    }
  }, [draggedIndex, images, toast]);

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('site_gallery')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Image removed',
        description: 'The image has been removed from the gallery.',
      });

      fetchImages();
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove image.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AdminListSkeleton />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Home Gallery
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage the "Moments From Our Events" gallery ({images.length}/8 images)
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onClick={() => !isUploading && images.length < 8 && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${images.length >= 8 
            ? 'border-muted cursor-not-allowed bg-muted/30' 
            : isUploading 
              ? 'border-primary bg-primary/5 cursor-wait' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/30 cursor-pointer'
          }
        `}
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
        ) : images.length >= 8 ? (
          <>
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              Gallery is full (8/8 images)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Remove an image to add more
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              Drop images here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Select multiple images • Max 10MB per file • {8 - images.length} slots available
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                relative group aspect-square transition-all duration-200
                ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-primary ring-offset-2' : ''}
              `}
            >
              <img
                src={image.url}
                alt={image.title || `Gallery image ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border pointer-events-none"
              />
              
              {/* Drag handle */}
              <div className="absolute top-2 left-2 p-1.5 rounded bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={14} className="text-foreground" />
              </div>
              
              {/* Order indicator */}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-background/80 backdrop-blur-sm text-xs font-medium">
                {index + 1}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {/* Add more button if less than 8 */}
          {images.length < 8 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
            >
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add more</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border border-border/50">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No gallery images yet. Upload some to get started!
          </p>
        </div>
      )}
    </div>
  );
}
