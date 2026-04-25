import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Edit, Archive, Trash2, RotateCcw, Eye, EyeOff, Globe, GlobeLock } from 'lucide-react';
import { FormSubmissionsViewer } from '@/components/admin/FormSubmissionsViewer';
import { BlogDetailModal } from '@/components/shared/BlogDetailModal';
import { format } from 'date-fns';
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

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_name: string | null;
  category: string | null;
  featured_image_url: string | null;
  is_published: boolean;
  is_archived: boolean;
  published_at: string | null;
  created_at: string;
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog posts.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: publish ? 'Post published' : 'Post unpublished',
        description: publish
          ? 'The post is now visible on the website.'
          : 'The post is now hidden from the website.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to update post.',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ is_archived: archive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: archive ? 'Post archived' : 'Post restored',
        description: archive
          ? 'The post has been archived.'
          : 'The post has been restored.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to update post.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Post deleted',
        description: 'The post has been permanently deleted.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post.',
        variant: 'destructive',
      });
    }
  };

  const publishedPosts = posts.filter((p) => p.is_published && !p.is_archived);
  const draftPosts = posts.filter((p) => !p.is_published && !p.is_archived);
  const archivedPosts = posts.filter((p) => p.is_archived);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const PostCard = ({ post }: { post: BlogPost }) => (
    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.category && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {post.category}
              </span>
            )}
            {post.is_published ? (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                Published
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                Draft
              </span>
            )}
            {post.is_archived && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                Archived
              </span>
            )}
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2 truncate">
            {post.title}
          </h3>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {post.author_name && <span>By {post.author_name}</span>}
            <span>
              {post.published_at
                ? format(new Date(post.published_at), 'MMM d, yyyy')
                : format(new Date(post.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {post.excerpt}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setPreviewPost(post);
              setIsPreviewOpen(true);
            }}
            title="Preview"
          >
            <Eye size={16} />
          </Button>
          
          <FormSubmissionsViewer postId={post.id} postTitle={post.title} />
          
          <Button variant="ghost" size="icon" asChild title="Edit">
            <Link to={`/admin/posts/${post.id}`}>
              <Edit size={16} />
            </Link>
          </Button>

          {!post.is_archived && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePublish(post.id, !post.is_published)}
              title={post.is_published ? 'Unpublish' : 'Publish'}
            >
              {post.is_published ? <GlobeLock size={16} /> : <Globe size={16} />}
            </Button>
          )}

          {post.is_archived ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(post.id, false)}
            >
              <RotateCcw size={16} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(post.id, true)}
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
                <AlertDialogTitle>Delete Post</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete "{post.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(post.id)}
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
      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Blog Posts</h1>
          <p className="text-muted-foreground text-sm">Manage your blog content</p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/admin/posts/new">
            <Plus size={18} />
            Add Post
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published">
            Published ({publishedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts ({draftPosts.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="space-y-4 mt-6">
          {publishedPosts.length > 0 ? (
            publishedPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <EmptyState message="No published posts yet." />
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4 mt-6">
          {draftPosts.length > 0 ? (
            draftPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <EmptyState message="No draft posts. Create one to get started!" />
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-6">
          {archivedPosts.length > 0 ? (
            archivedPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <EmptyState message="No archived posts." />
          )}
        </TabsContent>
      </Tabs>

      <BlogDetailModal 
        post={previewPost}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
      />
    </div>
  );
}
