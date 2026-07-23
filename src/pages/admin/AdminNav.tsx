import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { AdminListSkeleton } from '@/components/shared/skeletons';
import { NavItemRow, buildNavTree, NavNode } from '@/lib/nav';

interface EditNavItem {
  id: string; // real uuid, or a temp "new-*" id for unsaved rows
  label: string;
  url: string;
  parent_id: string | null;
  display_order: number;
  opens_new_tab: boolean;
  is_published: boolean;
  isNew?: boolean;
}

const isRealId = (id: string) => !id.startsWith('new-');
let tempCounter = 0;
const newTempId = () => `new-${Date.now()}-${tempCounter++}`;

export default function AdminNav() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<EditNavItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('nav_items')
        .select('id, label, url, parent_id, display_order, opens_new_tab, is_published')
        .order('display_order', { ascending: true });

      if (!error && data) {
        setItems(
          (data as NavItemRow[]).map((row) => ({
            id: row.id,
            label: row.label,
            url: row.url || '',
            parent_id: row.parent_id,
            display_order: row.display_order,
            opens_new_tab: row.opens_new_tab,
            is_published: row.is_published,
          })),
        );
      }
      setIsLoading(false);
    };
    fetchItems();
  }, []);

  const tree = useMemo<NavNode[]>(
    () =>
      buildNavTree(
        items.map((i) => ({
          id: i.id,
          label: i.label,
          url: i.url || null,
          parent_id: i.parent_id,
          display_order: i.display_order,
          opens_new_tab: i.opens_new_tab,
          is_published: i.is_published,
        })),
      ),
    [items],
  );

  // Ids that cannot be a given item's parent (itself + its descendants).
  const forbiddenParents = (id: string): Set<string> => {
    const result = new Set<string>([id]);
    const addChildren = (parentId: string) => {
      items
        .filter((i) => i.parent_id === parentId)
        .forEach((child) => {
          result.add(child.id);
          addChildren(child.id);
        });
    };
    addChildren(id);
    return result;
  };

  const update = (id: string, patch: Partial<EditNavItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const siblingsOf = (parentId: string | null) =>
    items
      .filter((i) => i.parent_id === parentId)
      .sort((a, b) => a.display_order - b.display_order);

  const addItem = (parentId: string | null) => {
    const order = siblingsOf(parentId).length;
    setItems((prev) => [
      ...prev,
      {
        id: newTempId(),
        label: 'New link',
        url: '',
        parent_id: parentId,
        display_order: order,
        opens_new_tab: false,
        is_published: true,
        isNew: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    const toDelete = forbiddenParents(id); // item + descendants
    setDeletedIds((prev) => [...prev, ...Array.from(toDelete).filter(isRealId)]);
    setItems((prev) => prev.filter((i) => !toDelete.has(i.id)));
  };

  const move = (id: string, direction: -1 | 1) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const siblings = prev
        .filter((i) => i.parent_id === item.parent_id)
        .sort((a, b) => a.display_order - b.display_order);
      const index = siblings.findIndex((i) => i.id === id);
      const swapWith = siblings[index + direction];
      if (!swapWith) return prev;
      return prev.map((i) => {
        if (i.id === item.id) return { ...i, display_order: swapWith.display_order };
        if (i.id === swapWith.id) return { ...i, display_order: item.display_order };
        return i;
      });
    });
  };

  const handleSave = async () => {
    // Basic validation.
    for (const item of items) {
      if (!item.label.trim()) {
        toast({ title: 'Every nav item needs a label.', variant: 'destructive' });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Normalize display_order per sibling group (0,1,2,...).
      const orderById = new Map<string, number>();
      const groups = new Map<string | null, EditNavItem[]>();
      items.forEach((i) => {
        const list = groups.get(i.parent_id) || [];
        list.push(i);
        groups.set(i.parent_id, list);
      });
      groups.forEach((list) => {
        list
          .sort((a, b) => a.display_order - b.display_order)
          .forEach((i, idx) => orderById.set(i.id, idx));
      });

      // Delete removed rows first.
      if (deletedIds.length > 0) {
        const { error } = await supabase.from('nav_items').delete().in('id', deletedIds);
        if (error) throw error;
      }

      // Insert new rows top-down so children can reference freshly created parents.
      const idMap = new Map<string, string>(); // temp id -> real id
      let pending = items.filter((i) => i.isNew);
      while (pending.length > 0) {
        const stillPending: EditNavItem[] = [];
        let progressed = false;
        for (const item of pending) {
          const rawParent = item.parent_id;
          let resolvedParent: string | null | undefined = null;
          if (rawParent) {
            resolvedParent = isRealId(rawParent) ? rawParent : idMap.get(rawParent);
            if (resolvedParent === undefined) {
              stillPending.push(item); // parent not inserted yet
              continue;
            }
          }
          const { data, error } = await supabase
            .from('nav_items')
            .insert({
              label: item.label.trim(),
              url: item.url.trim() || null,
              parent_id: resolvedParent,
              display_order: orderById.get(item.id) ?? 0,
              opens_new_tab: item.opens_new_tab,
              is_published: item.is_published,
              created_by: user?.id,
            })
            .select('id')
            .single();
          if (error) throw error;
          idMap.set(item.id, data.id);
          progressed = true;
        }
        if (!progressed) break; // guard against an impossible cycle
        pending = stillPending;
      }

      // Update existing rows (resolve any parent that points to a new item).
      for (const item of items.filter((i) => !i.isNew)) {
        const rawParent = item.parent_id;
        const resolvedParent = rawParent
          ? isRealId(rawParent)
            ? rawParent
            : idMap.get(rawParent) ?? null
          : null;
        const { error } = await supabase
          .from('nav_items')
          .update({
            label: item.label.trim(),
            url: item.url.trim() || null,
            parent_id: resolvedParent,
            display_order: orderById.get(item.id) ?? 0,
            opens_new_tab: item.opens_new_tab,
            is_published: item.is_published,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      toast({ title: 'Navigation saved.' });

      // Refresh from the DB so temp ids become real.
      const { data } = await supabase
        .from('nav_items')
        .select('id, label, url, parent_id, display_order, opens_new_tab, is_published')
        .order('display_order', { ascending: true });
      if (data) {
        setItems(
          (data as NavItemRow[]).map((row) => ({
            id: row.id,
            label: row.label,
            url: row.url || '',
            parent_id: row.parent_id,
            display_order: row.display_order,
            opens_new_tab: row.opens_new_tab,
            is_published: row.is_published,
          })),
        );
      }
      setDeletedIds([]);
    } catch (error) {
      console.error('Error saving nav:', error);
      toast({ title: 'Could not save navigation. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderNode = (node: NavNode, depth: number) => {
    const forbidden = forbiddenParents(node.id);
    const parentOptions = items.filter((i) => !forbidden.has(i.id));

    return (
      <div key={node.id} style={{ marginLeft: depth * 20 }} className="space-y-3">
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`label-${node.id}`}>Label</Label>
              <Input
                id={`label-${node.id}`}
                value={node.label}
                onChange={(e) => update(node.id, { label: e.target.value })}
                placeholder="Menu label"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`url-${node.id}`}>Link (path or URL)</Label>
              <Input
                id={`url-${node.id}`}
                value={node.url || ''}
                onChange={(e) => update(node.id, { url: e.target.value })}
                placeholder="/events or https://…  (leave blank for a header only)"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Parent</Label>
              <Select
                value={node.parent_id ?? 'root'}
                onValueChange={(value) =>
                  update(node.id, { parent_id: value === 'root' ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Top level</SelectItem>
                  {parentOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label || '(untitled)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={node.opens_new_tab}
                  onCheckedChange={(checked) => update(node.id, { opens_new_tab: checked })}
                />
                New tab
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={node.is_published}
                  onCheckedChange={(checked) => update(node.id, { is_published: checked })}
                />
                Visible
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => move(node.id, -1)}>
              <ArrowUp size={14} />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => move(node.id, 1)}>
              <ArrowDown size={14} />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addItem(node.id)}>
              <Plus size={14} /> Sub-link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => removeItem(node.id)}
            >
              <Trash2 size={14} /> Remove
            </Button>
          </div>
        </div>

        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (isLoading) return <AdminListSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Navigation</h1>
          <p className="text-sm text-muted-foreground">
            Edit the site's top navigation. Drag order with the arrows; nest items with a parent to
            create dropdowns.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => addItem(null)}>
            <Plus size={16} /> Add item
          </Button>
          <Button type="button" variant="hero" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save changes'}
          </Button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="rounded-md bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No navigation items yet. Click “Add item” to create your first link.
        </p>
      ) : (
        <div className="space-y-3">{tree.map((node) => renderNode(node, 0))}</div>
      )}
    </div>
  );
}
