import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Image as ImageIcon, MapPin } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import { formatEventDateRange } from "@/lib/events";
import { sanitizeRichText } from "@/lib/richText";

interface ProjectEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  project_slug: string | null;
  project_summary: string | null;
  project_content: string | null;
  project_featured_image_url: string | null;
  featured_image_url: string | null;
}

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  title: string | null;
  description: string | null;
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState<ProjectEvent | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, description, start_date, end_date, location, project_slug, project_summary, project_content, project_featured_image_url, featured_image_url")
          .eq("is_project", true)
          .eq("project_is_published", true)
          .eq("is_archived", false)
          .or(`project_slug.eq.${slug},id.eq.${slug}`)
          .maybeSingle();

        if (error) throw error;
        setProject((data || null) as ProjectEvent | null);

        if (data?.id) {
          const { data: mediaData, error: mediaError } = await supabase
            .from("media")
            .select("id, url, media_type, title, description")
            .eq("entity_type", "event")
            .eq("entity_id", data.id)
            .order("display_order", { ascending: true });

          if (!mediaError) {
            setMedia((mediaData || []) as MediaItem[]);
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [slug]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <section className="section-padding">
          <div className="container-narrow text-center">
            <h1 className="font-heading text-3xl font-semibold text-foreground">Project not found</h1>
            <p className="mt-3 text-muted-foreground">This project may be unpublished or no longer available.</p>
            <Button className="mt-6" variant="hero" asChild>
              <Link to="/projects">Back to Projects</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const imageUrl = project.project_featured_image_url || project.featured_image_url;
  const content = project.project_content || project.description || "";
  const pageDescription = project.project_summary || `Explore ${project.title}, a long-term project from The Rith Initiative.`;
  const projectPath = `/projects/${project.project_slug || project.id}`;
  const projectPageSchema = createWebPageSchema({
    title: `${project.title} | The Rith Initiative`,
    description: pageDescription,
    path: projectPath,
    type: "Article",
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.title, path: projectPath },
  ]);

  return (
    <Layout>
      <PageMeta
        title={project.title}
        description={pageDescription}
        keywords={`${project.title}, Rith Initiative project, Indian American oral history, cultural interviews`}
        path={projectPath}
        ogImage={imageUrl || undefined}
        jsonLd={[projectPageSchema, breadcrumbSchema]}
      />

      <section className="relative min-h-[70vh] overflow-hidden bg-foreground text-background">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="container-wide relative z-10 flex min-h-[70vh] items-end pb-14 pt-32">
          <ScrollReveal variant="fade-up" className="max-w-4xl">
            <Button variant="ghost" className="mb-8 text-background hover:bg-background/10 hover:text-background" asChild>
              <Link to="/projects">
                <ArrowLeft size={17} />
                Projects
              </Link>
            </Button>
            <p className="mb-4 flex flex-wrap items-center gap-4 text-sm text-background/75">
              <span className="flex items-center gap-2">
                <Calendar size={16} />
                {formatEventDateRange(project)}
              </span>
              {project.location && (
                <span className="flex items-center gap-2">
                  <MapPin size={16} />
                  {project.location}
                </span>
              )}
            </p>
            <h1 className="font-heading text-4xl font-semibold md:text-5xl lg:text-6xl">{project.title}</h1>
            {project.project_summary && (
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-background/80">{project.project_summary}</p>
            )}
          </ScrollReveal>
        </div>
      </section>

      <SectionDivider />

      <section className="section-padding">
        <div className="container-narrow">
          {content && (
            <ScrollReveal variant="fade-up">
              <div
                className="text-muted-foreground leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mb-5 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }}
              />
            </ScrollReveal>
          )}
        </div>
      </section>

      {media.length > 0 && (
        <>
          <SectionDivider />
          <section className="section-padding bg-secondary/20">
            <div className="container-wide">
              <ScrollReveal variant="fade-up">
                <div className="mb-8 text-center">
                  <h2 className="font-heading text-3xl font-semibold text-foreground">Project Gallery</h2>
                </div>
              </ScrollReveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                    className="group overflow-hidden rounded-lg border border-border/50 bg-card text-left shadow-soft transition-all hover:shadow-elevated"
                  >
                    {item.media_type === "video" ? (
                      <div className="flex aspect-video items-center justify-center bg-foreground text-background">
                        <ImageIcon className="h-8 w-8 opacity-70" />
                      </div>
                    ) : (
                      <img src={item.url} alt={item.title || project.title} className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    )}
                    {(item.title || item.description) && (
                      <div className="p-4">
                        {item.title && <p className="font-medium text-foreground">{item.title}</p>}
                        {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <MediaLightbox
        media={media}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </Layout>
  );
}
