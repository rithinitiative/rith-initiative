import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Edit, Archive, Trash2, RotateCcw, Eye, Globe, GlobeLock, ArrowUp, ArrowDown } from 'lucide-react';
import { BlogDetailModal } from '@/components/shared/BlogDetailModal';
import { format } from 'date-fns';
import { getProjectPath } from '@/lib/projects';
import { isProjectRecord } from '@/lib/postClassification';
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
  project_slug: string | null;
  project_display_order: number | null;
  published_at: string | null;
  created_at: string;
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [movingPostId, setMovingPostId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(((data || []) as BlogPost[]).filter(isProjectRecord));
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects.',
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
        title: publish ? 'Project published' : 'Project unpublished',
        description: publish
          ? 'The project is now visible on the website.'
          : 'The project is now hidden from the website.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project.',
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
        title: archive ? 'Project archived' : 'Project restored',
        description: archive
          ? 'The project has been archived.'
          : 'The project has been restored.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Project deleted',
        description: 'The project has been permanently deleted.',
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project.',
        variant: 'destructive',
      });
    }
  };

  const sortProjectList = (projectList: BlogPost[]) =>
    [...projectList].sort((a, b) => {
      const orderDiff = (a.project_display_order ?? 0) - (b.project_display_order ?? 0);
      if (orderDiff !== 0) return orderDiff;

      return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
    });

  const handleMoveProject = async (orderedProjects: BlogPost[], projectId: string, direction: 'up' | 'down') => {
    const currentIndex = orderedProjects.findIndex((project) => project.id === projectId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedProjects.length) return;

    const reordered = [...orderedProjects];
    const [movedProject] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedProject);

    setPosts((prev) => {
      const orderById = new Map(reordered.map((project, index) => [project.id, index]));
      return prev.map((project) => (
        orderById.has(project.id)
          ? { ...project, project_display_order: orderById.get(project.id) ?? project.project_display_order }
          : project
      ));
    });
    setMovingPostId(projectId);

    try {
      for (const [index, project] of reordered.entries()) {
        const { error } = await supabase
          .from('blog_posts')
          .update({ project_display_order: index })
          .eq('id', project.id);

        if (error) throw error;
      }

      toast({
        title: 'Project order updated',
        description: 'The website will show projects in this order.',
      });
    } catch (error) {
      console.error('Error reordering projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder projects. Please try again.',
        variant: 'destructive',
      });
      fetchPosts();
    } finally {
      setMovingPostId(null);
    }
  };

  const publishedPosts = sortProjectList(posts.filter((p) => p.is_published && !p.is_archived));
  const draftPosts = sortProjectList(posts.filter((p) => !p.is_published && !p.is_archived));
  const archivedPosts = sortProjectList(posts.filter((p) => p.is_archived));

  if (isLoading) {
    return (
      <AdminListSkeleton />
    );
  }

  const PostCard = ({
    post,
    orderedPosts,
    canReorder = true,
  }: {
    post: BlogPost;
    orderedPosts: BlogPost[];
    canReorder?: boolean;
  }) => {
    const postIndex = orderedPosts.findIndex((item) => item.id === post.id);
    const isMoving = movingPostId === post.id;

    return (
    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              {htmlToPlainText(post.excerpt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canReorder && orderedPosts.length > 1 && (
            <div className="flex flex-col rounded-md border border-border/70 bg-background/80 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => handleMoveProject(orderedPosts, post.id, 'up')}
                disabled={postIndex <= 0 || isMoving}
                aria-label={`Move ${post.title} up`}
                title="Move up"
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-t border-border/70"
                onClick={() => handleMoveProject(orderedPosts, post.id, 'down')}
                disabled={postIndex === orderedPosts.length - 1 || isMoving}
                aria-label={`Move ${post.title} down`}
                title="Move down"
              >
                <ArrowDown size={14} />
              </Button>
            </div>
          )}

          {post.is_published && !post.is_archived ? (
            <Button variant="ghost" size="icon" asChild title="View on website">
              <Link to={getProjectPath(post)}>
                <Eye size={16} />
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPreviewPost(post);
                setIsPreviewOpen(true);
              }}
              title="Preview draft"
            >
              <Eye size={16} />
            </Button>
          )}
          
          <Button variant="ghost" size="icon" asChild title="Edit">
            <Link to={`/admin/projects/${post.id}`}>
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
                  Are you sure you want to permanently delete "{post.title}"? This also deletes any project interviews attached to it.
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
  };

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
          <h1 className="font-heading text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm">Create long-term project pages and interview collections</p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/admin/projects/new">
            <Plus size={18} />
            Add Project
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
            publishedPosts.map((post) => <PostCard key={post.id} post={post} orderedPosts={publishedPosts} />)
          ) : (
            <EmptyState message="No published projects yet." />
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4 mt-6">
          {draftPosts.length > 0 ? (
            draftPosts.map((post) => <PostCard key={post.id} post={post} orderedPosts={draftPosts} />)
          ) : (
            <EmptyState message="No draft projects. Create one to get started!" />
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-6">
          {archivedPosts.length > 0 ? (
            archivedPosts.map((post) => <PostCard key={post.id} post={post} orderedPosts={archivedPosts} canReorder={false} />)
          ) : (
            <EmptyState message="No archived projects." />
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
