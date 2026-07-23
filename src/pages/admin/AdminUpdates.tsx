import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Archive, Trash2, RotateCcw, Globe, GlobeLock, Image, Video, Link as LinkIcon, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { htmlToPlainText } from '@/lib/richText';
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

interface Update {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  media_type: string | null;
  is_published: boolean;
  is_archived: boolean;
  published_at: string | null;
  created_at: string;
}

export default function AdminUpdates() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load updates.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      const { error } = await supabase
        .from('updates')
        .update({
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: publish ? 'Update published' : 'Update unpublished',
        description: publish
          ? 'The update is now visible on the website.'
          : 'The update is now hidden from the website.',
      });

      fetchUpdates();
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: 'Error',
        description: 'Failed to update.',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('updates')
        .update({ is_archived: archive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: archive ? 'Update archived' : 'Update restored',
        description: archive
          ? 'The update has been archived.'
          : 'The update has been restored.',
      });

      fetchUpdates();
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: 'Error',
        description: 'Failed to update.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('updates').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Update deleted',
        description: 'The update has been permanently deleted.',
      });

      fetchUpdates();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete.',
        variant: 'destructive',
      });
    }
  };

  const publishedUpdates = updates.filter((u) => u.is_published && !u.is_archived);
  const draftUpdates = updates.filter((u) => !u.is_published && !u.is_archived);
  const archivedUpdates = updates.filter((u) => u.is_archived);

  const getMediaIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case 'video':
        return <Video size={14} />;
      case 'link':
        return <LinkIcon size={14} />;
      default:
        return <Image size={14} />;
    }
  };

  if (isLoading) {
    return (
      <AdminListSkeleton />
    );
  }

  const UpdateCard = ({ update }: { update: Update }) => (
    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {update.media_type && (
              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium flex items-center gap-1">
                {getMediaIcon(update.media_type)}
                {update.media_type}
              </span>
            )}
            {update.is_published ? (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                Published
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                Draft
              </span>
            )}
            {update.is_archived && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                Archived
              </span>
            )}
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2 truncate">
            {update.title}
          </h3>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              {update.published_at
                ? format(new Date(update.published_at), 'MMM d, yyyy')
                : format(new Date(update.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          {update.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {htmlToPlainText(update.description)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="icon" asChild title="Edit">
            <Link to={`/admin/updates/${update.id}`}>
              <Edit size={16} />
            </Link>
          </Button>

          {!update.is_archived && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePublish(update.id, !update.is_published)}
              title={update.is_published ? 'Unpublish' : 'Publish'}
            >
              {update.is_published ? <GlobeLock size={16} /> : <Globe size={16} />}
            </Button>
          )}

          {update.is_archived ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(update.id, false)}
              title="Restore"
            >
              <RotateCcw size={16} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(update.id, true)}
              title="Archive"
            >
              <Archive size={16} />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Update</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete "{update.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(update.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Updates</h1>
          <p className="text-muted-foreground text-sm">Manage homepage updates</p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/admin/updates/new">
            <Plus size={18} />
            Add Update
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published">
            Published ({publishedUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts ({draftUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedUpdates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="space-y-4 mt-6">
          {publishedUpdates.length > 0 ? (
            publishedUpdates.map((update) => <UpdateCard key={update.id} update={update} />)
          ) : (
            <EmptyState message="No published updates yet." />
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4 mt-6">
          {draftUpdates.length > 0 ? (
            draftUpdates.map((update) => <UpdateCard key={update.id} update={update} />)
          ) : (
            <EmptyState message="No draft updates. Create one to get started!" />
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-6">
          {archivedUpdates.length > 0 ? (
            archivedUpdates.map((update) => <UpdateCard key={update.id} update={update} />)
          ) : (
            <EmptyState message="No archived updates." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
