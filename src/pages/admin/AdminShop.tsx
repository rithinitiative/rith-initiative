import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Archive, Trash2, RotateCcw, ExternalLink, DollarSign } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminListSkeleton } from "@/components/shared/skeletons";

interface ShopItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  purchase_link: string | null;
  category: string | null;
  is_published: boolean;
  is_archived: boolean;
  display_order: number;
  created_at: string;
}

export default function AdminShop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching shop items:', error);
      toast({ title: 'Error', description: 'Failed to load shop items.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const toggleArchive = async (item: ShopItem) => {
    try {
      const { error } = await supabase
        .from('shop_items')
        .update({ is_archived: !item.is_archived, is_published: false })
        .eq('id', item.id);
      if (error) throw error;
      toast({ title: item.is_archived ? 'Item restored' : 'Item archived' });
      fetchItems();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update item.', variant: 'destructive' });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('shop_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Item deleted' });
      fetchItems();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete item.', variant: 'destructive' });
    }
  };

  const activeItems = items.filter(i => !i.is_archived);
  const archivedItems = items.filter(i => i.is_archived);

  const renderItem = (item: ShopItem) => (
    <div key={item.id} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50">
      {item.image_url ? (
        <img src={item.image_url} alt={item.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <DollarSign className="text-muted-foreground" size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate">{item.title}</h3>
          {item.is_published ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Published</span>
          ) : (
            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="font-medium">${Number(item.price).toFixed(2)}</span>
          {item.category && <span>• {item.category}</span>}
          {item.purchase_link && (
            <a href={item.purchase_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <ExternalLink size={12} /> Link
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/admin/shop/${item.id}`}><Edit size={16} /></Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => toggleArchive(item)}>
          {item.is_archived ? <RotateCcw size={16} /> : <Archive size={16} />}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 size={16} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{item.title}"?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteItem(item.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AdminListSkeleton />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Shop Items</h1>
        <Button asChild>
          <Link to="/admin/shop/new"><Plus size={16} /> Add Item</Link>
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeItems.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-3 mt-4">
          {activeItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No shop items yet. Add your first item!</p>
          ) : activeItems.map(renderItem)}
        </TabsContent>
        <TabsContent value="archived" className="space-y-3 mt-4">
          {archivedItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No archived items.</p>
          ) : archivedItems.map(renderItem)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
