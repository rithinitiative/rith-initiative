import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

export default function AdminShopItemForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [category, setCategory] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  useEffect(() => {
    if (isEditing) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setDescription(data.description || '');
        setPrice(String(data.price));
        setImageUrl(data.image_url || '');
        setPurchaseLink(data.purchase_link || '');
        setCategory(data.category || '');
        setIsPublished(data.is_published);
        setDisplayOrder(data.display_order || 0);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      toast({ title: 'Error', description: 'Failed to load item.', variant: 'destructive' });
      navigate('/admin/shop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 10MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `shop/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      setImageUrl(publicUrl);
      toast({ title: 'Image uploaded' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum < 0 || priceNum > 999999.99) {
      toast({ title: 'Valid price is required', description: 'Price must be between $0.00 and $999,999.99', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const itemData = {
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        image_url: imageUrl.trim() || null,
        purchase_link: purchaseLink.trim() || null,
        category: category.trim() || null,
        is_published: isPublished,
        display_order: displayOrder,
      };

      if (isEditing) {
        const { error } = await supabase.from('shop_items').update(itemData).eq('id', id);
        if (error) throw error;
        toast({ title: 'Item updated' });
      } else {
        const { error } = await supabase.from('shop_items').insert(itemData);
        if (error) throw error;
        toast({ title: 'Item created' });
      }

      navigate('/admin/shop');
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Failed to save item.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/shop')}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="font-heading text-2xl font-semibold">
          {isEditing ? 'Edit Shop Item' : 'Add Shop Item'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item name" required />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            id="description"
            value={description}
            onChange={setDescription}
            placeholder="Describe this item..."
            minHeightClassName="min-h-[170px]"
          />
        </div>

        {/* Price & Category */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price ($) *</Label>
            <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Books, Apparel" />
          </div>
        </div>

        {/* Purchase Link */}
        <div className="space-y-2">
          <Label htmlFor="purchaseLink">Purchase Link</Label>
          <Input id="purchaseLink" type="url" value={purchaseLink} onChange={(e) => setPurchaseLink(e.target.value)} placeholder="https://..." />
          <p className="text-xs text-muted-foreground">External link where users can buy this item</p>
        </div>

        {/* Image */}
        <div className="space-y-2">
          <Label>Product Image</Label>
          {imageUrl ? (
            <div className="relative group">
              <img src={imageUrl} alt="Product" className="w-full max-h-64 object-contain rounded-lg border border-border bg-secondary/30" />
              <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="flex-1 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Drop or click to upload</span>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
              <div className="flex-1">
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Or paste image URL" className="h-32" />
              </div>
            </div>
          )}
        </div>

        {/* Display Order */}
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input id="displayOrder" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} placeholder="0" />
          <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
        </div>

        {/* Published */}
        <div className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border/50">
          <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
          <Label htmlFor="published" className="cursor-pointer">
            Publish this item
            <span className="block text-xs text-muted-foreground font-normal">Published items are visible on the Shop page</span>
          </Label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : isEditing ? 'Update Item' : 'Create Item'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/shop')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
