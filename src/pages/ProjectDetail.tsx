import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Headphones, Image as ImageIcon, UserRound } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import { sanitizeRichText } from "@/lib/richText";
import { isProjectRecord } from "@/lib/postClassification";

interface Project {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string | null;
  project_slug: string | null;
}

interface ProjectInterview {
  id: string;
  title: string;
  category: string | null;
  interviewee_name: string | null;
  interviewee_description: string | null;
  portrait_url: string | null;
  audio_url: string | null;
  transcript: string | null;
  display_order: number;
}

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  title: string | null;
  description: string | null;
}

const formatTranscript = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function InterviewCard({ interview }: { interview: ProjectInterview }) {
  const hasDetails = Boolean(interview.portrait_url || interview.interviewee_description);
  const transcriptParagraphs = interview.transcript ? formatTranscript(interview.transcript) : [];

  return (
    <article className="rounded-lg border border-border/50 bg-card shadow-soft">
      <div className={`grid gap-0 ${hasDetails ? "lg:grid-cols-[0.85fr_1.15fr]" : ""}`}>
        {hasDetails && (
          <div className="border-b border-border/50 p-5 lg:border-b-0 lg:border-r">
            {interview.portrait_url ? (
              <img
                src={interview.portrait_url}
                alt={interview.interviewee_name || interview.title}
                className="aspect-[4/3] w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-secondary">
                <UserRound className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            {interview.interviewee_description && (
              <div
                className="mt-4 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(interview.interviewee_description) }}
              />
            )}
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="font-heading text-2xl font-semibold text-foreground">{interview.title}</h3>
            {interview.interviewee_name && (
              <p className="mt-1 text-sm font-medium text-primary">{interview.interviewee_name}</p>
            )}
          </div>

          {interview.audio_url && (
            <div className="mb-5 rounded-md border border-border/50 bg-secondary/30 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Headphones size={16} />
                Audio Interview
              </p>
              <audio src={interview.audio_url} controls className="w-full" />
            </div>
          )}

          {transcriptParagraphs.length > 0 && (
            <details className="group rounded-md border border-border/50 bg-background">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-foreground">
                <span className="flex items-center gap-2">
                  <FileText size={16} />
                  Transcript
                </span>
                <span className="text-sm text-muted-foreground group-open:hidden">Open</span>
                <span className="hidden text-sm text-muted-foreground group-open:inline">Close</span>
              </summary>
              <div className="max-h-[26rem] overflow-y-auto overflow-x-hidden border-t border-border/50 px-4 py-4">
                {transcriptParagraphs.map((paragraph, index) => (
                  <p key={index} className="mb-4 max-w-full text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere] last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [interviews, setInterviews] = useState<ProjectInterview[]>([]);
  const [selectedInterviewCategory, setSelectedInterviewCategory] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      if (!slug) return;

      try {
        let query = supabase
          .from("blog_posts")
          .select("id, title, content, excerpt, featured_image_url, category, project_slug")
          .eq("is_published", true)
          .eq("is_archived", false);

        query = isUuid(slug) ? query.eq("id", slug) : query.eq("project_slug", slug);

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        const projectData = data && isProjectRecord(data) ? data : null;
        setProject((projectData || null) as Project | null);

        if (projectData?.id) {
          const [{ data: interviewData }, { data: mediaData }] = await Promise.all([
            supabase
              .from("project_interviews")
              .select("id, title, category, interviewee_name, interviewee_description, portrait_url, audio_url, transcript, display_order")
              .eq("project_id", projectData.id)
              .eq("is_published", true)
              .order("display_order", { ascending: true }),
            supabase
              .from("media")
              .select("id, url, media_type, title, description")
              .eq("entity_type", "blog_post")
              .eq("entity_id", projectData.id)
              .order("display_order", { ascending: true }),
          ]);

          setInterviews((interviewData || []) as ProjectInterview[]);
          setMedia((mediaData || []) as MediaItem[]);
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

  const projectPath = `/projects/${project.project_slug || project.id}`;
  const pageDescription = project.excerpt || `Explore ${project.title}, a long-term project from The Rith Initiative.`;
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
  const interviewCategories = Array.from(new Set(interviews
    .map((interview) => interview.category)
    .filter((category): category is string => Boolean(category && category.trim()))));
  const visibleInterviews = selectedInterviewCategory
    ? interviews.filter((interview) => interview.category === selectedInterviewCategory)
    : interviews;

  return (
    <Layout>
      <PageMeta
        title={project.title}
        description={pageDescription}
        keywords={`${project.title}, Rith Initiative project, Indian American oral history, cultural interviews`}
        path={projectPath}
        ogImage={project.featured_image_url || undefined}
        jsonLd={[projectPageSchema, breadcrumbSchema]}
      />

      <section className="section-padding bg-secondary/20">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <Button variant="ghost" className="mb-8 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/projects">
                <ArrowLeft size={17} />
                Projects
              </Link>
            </Button>

            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:gap-14">
              <div className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-soft">
                {project.featured_image_url ? (
                  <img
                    src={project.featured_image_url}
                    alt={project.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-background">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/60" />
                  </div>
                )}
              </div>

              <div>
                <p className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">
                  <Headphones size={16} />
                  Project Collection
                </p>
                <h1 className="font-heading text-4xl font-semibold leading-tight text-foreground md:text-5xl lg:text-6xl">
                  {project.title}
                </h1>
                {project.excerpt && (
                  <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{project.excerpt}</p>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <SectionDivider />

      <section className="section-padding">
        <div className="container-narrow">
          <ScrollReveal variant="fade-up">
            <div
              className="text-muted-foreground leading-relaxed [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mb-5 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(project.content) }}
            />
          </ScrollReveal>
        </div>
      </section>

      {interviews.length > 0 && (
        <>
          <SectionDivider />
          <section className="section-padding bg-secondary/20">
            <div className="container-wide">
              <ScrollReveal variant="fade-up">
                <div className="mb-8 max-w-3xl">
                  <h2 className="font-heading text-3xl font-semibold text-foreground">Interviews</h2>
                  <p className="mt-2 text-muted-foreground">
                    Listen to audio stories and read transcripts from this project collection.
                  </p>
                </div>
              </ScrollReveal>
              {interviewCategories.length > 0 && (
                <div className="mb-8 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant={selectedInterviewCategory === null ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setSelectedInterviewCategory(null)}
                  >
                    All Interviews
                  </Button>
                  {interviewCategories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={selectedInterviewCategory === category ? "hero" : "outline"}
                      size="sm"
                      onClick={() => setSelectedInterviewCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              )}
              <div className="space-y-6">
                {visibleInterviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {media.length > 0 && (
        <>
          <SectionDivider />
          <section className="section-padding">
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
                      <video src={item.url} className="aspect-video w-full object-cover" />
                    ) : item.media_type === "audio" ? (
                      <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-secondary text-foreground">
                        <Headphones className="h-8 w-8 opacity-70" />
                        <span className="text-sm font-medium">Audio</span>
                      </div>
                    ) : item.media_type === "image" ? (
                      <img src={item.url} alt={item.title || project.title} className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-secondary text-foreground">
                        <ImageIcon className="h-8 w-8 opacity-70" />
                      </div>
                    )}
                    {(item.title || item.description) && (
                      <div className="p-4">
                        {item.title && <p className="font-medium text-foreground">{item.title}</p>}
                        {item.description && (
                          <div
                            className="mt-1 text-sm text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_p:last-child]:mb-0"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description) }}
                          />
                        )}
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
