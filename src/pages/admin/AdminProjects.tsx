import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Edit, ExternalLink, FolderKanban } from 'lucide-react';
import { formatEventDateRange } from '@/lib/events';
import { getProjectPath, sortProjects } from '@/lib/projects';

interface ProjectEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  project_slug: string | null;
  project_summary: string | null;
  project_is_published: boolean | null;
  project_display_order: number | null;
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_date, end_date, project_slug, project_summary, project_is_published, project_display_order')
          .eq('is_project', true)
          .order('project_display_order', { ascending: true })
          .order('start_date', { ascending: true });

        if (error) throw error;
        setProjects(sortProjects((data || []) as ProjectEvent[]));
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Projects</h1>
        <p className="text-muted-foreground text-sm">
          Customize long-term project pages created from selected events.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-8 text-center shadow-soft">
          <FolderKanban className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="font-heading text-lg font-semibold text-foreground">No projects selected yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Go to Events and check the Project box on any event that should get its own long-term project page.
          </p>
          <Button className="mt-5" variant="hero" asChild>
            <Link to="/admin/events">Go to Events</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {project.project_is_published === false ? 'Draft' : 'Published'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={13} />
                    {formatEventDateRange(project)}
                  </span>
                </div>
                <h2 className="font-heading text-lg font-semibold text-foreground">{project.title}</h2>
                {project.project_summary && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.project_summary}</p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/admin/projects/${project.id}`} className="gap-2">
                    <Edit size={15} />
                    Edit Page
                  </Link>
                </Button>
                {project.project_is_published !== false && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={getProjectPath(project)} className="gap-2">
                      <ExternalLink size={15} />
                      View
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
