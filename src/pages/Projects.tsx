import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FolderKanban, Headphones } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { PlaceholderImage } from "@/components/shared/PlaceholderImage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import { getProjectPath, sortProjects } from "@/lib/projects";
import { isProjectRecord } from "@/lib/postClassification";

interface Project {
  id: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string | null;
  project_slug: string | null;
  project_display_order: number | null;
  published_at: string | null;
  created_at: string | null;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [interviewCounts, setInterviewCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id, title, excerpt, featured_image_url, category, project_slug, project_display_order, published_at, created_at")
          .eq("is_published", true)
          .eq("is_archived", false)
          .order("project_display_order", { ascending: true })
          .order("published_at", { ascending: false });

        if (error) throw error;

        const projectList = sortProjects(((data || []) as Project[]).filter(isProjectRecord));
        setProjects(projectList);

        if (projectList.length > 0) {
          const { data: interviews } = await supabase
            .from("project_interviews")
            .select("project_id")
            .eq("is_published", true)
            .in("project_id", projectList.map((project) => project.id));

          const counts = (interviews || []).reduce<Record<string, number>>((acc, interview) => {
            acc[interview.project_id] = (acc[interview.project_id] || 0) + 1;
            return acc;
          }, {});
          setInterviewCounts(counts);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const pageTitle = "Projects";
  const pageDescription =
    "Explore long-term cultural projects from The Rith Initiative, including collections, interviews, oral histories, and community storytelling.";
  const projectsPageSchema = createWebPageSchema({
    title: `${pageTitle} | The Rith Initiative`,
    description: pageDescription,
    path: "/projects",
    type: "CollectionPage",
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
  ]);

  return (
    <Layout>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        keywords="Indian American projects, oral history project, cultural projects Virginia, Indian heritage interviews, community storytelling"
        path="/projects"
        jsonLd={[projectsPageSchema, breadcrumbSchema]}
      />

      <section className="section-padding bg-secondary/20">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
                Projects
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed italic">
                Long-term initiatives, collections, interviews, and community stories from The Rith Initiative.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <SectionDivider />

      <section className="section-padding">
        <div className="container-wide">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <ScrollReveal key={project.id} variant="fade-up" delay={(index % 3) * 100}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-soft transition-all duration-300 hover:shadow-elevated">
                    {project.featured_image_url ? (
                      <img src={project.featured_image_url} alt={project.title} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <PlaceholderImage aspectRatio="video" label={project.title} className="rounded-none" />
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      {interviewCounts[project.id] > 0 && (
                        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                          <Headphones size={15} />
                          {interviewCounts[project.id]} interview{interviewCounts[project.id] === 1 ? "" : "s"}
                        </p>
                      )}
                      <h2 className="font-heading text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                        {project.title}
                      </h2>
                      {project.excerpt && (
                        <p className="mt-3 line-clamp-6 text-sm leading-relaxed text-muted-foreground">
                          {project.excerpt}
                        </p>
                      )}
                      <Button className="mt-6 w-fit" variant="subtle" asChild>
                        <Link to={getProjectPath(project)}>
                          View Project
                          <ArrowRight size={16} />
                        </Link>
                      </Button>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 bg-card p-10 text-center shadow-soft">
              <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h2 className="font-heading text-xl font-semibold text-foreground">No projects yet</h2>
              <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
                Check back soon for long-term projects and collections.
              </p>
              <Button className="mt-6" variant="subtle" asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
