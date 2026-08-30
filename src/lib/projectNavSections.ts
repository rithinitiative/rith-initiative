import { supabase } from "@/integrations/supabase/client";
import { ProjectSectionLink } from "@/lib/nav";
import { PROJECT_OVERVIEW_ANCHOR, getSubsectionAnchor } from "@/lib/subsections";

interface ProjectRow {
  id: string;
  project_slug: string | null;
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/**
 * The jump-links of each given project, keyed by the slug used in its nav URL.
 * Mirrors the "On this page" list rendered on the project page: the overview
 * followed by every published subsection, in the admin's display order.
 *
 * Projects without subsections are left out — there is nothing to expand into,
 * and a lone "Overview" child would turn a plain link into a pointless dropdown.
 */
export const fetchProjectSectionLinks = async (
  slugs: string[],
): Promise<Map<string, ProjectSectionLink[]>> => {
  const linksBySlug = new Map<string, ProjectSectionLink[]>();
  if (slugs.length === 0) return linksBySlug;

  try {
    // A project page accepts either its slug or its raw id, so the nav may use either.
    const idSlugs = slugs.filter(isUuid);
    const pathSlugs = slugs.filter((slug) => !isUuid(slug));
    const projectQuery = () =>
      supabase
        .from("blog_posts")
        .select("id, project_slug")
        .eq("is_published", true)
        .eq("is_archived", false);

    const [bySlug, byId] = await Promise.all([
      pathSlugs.length > 0
        ? projectQuery().in("project_slug", pathSlugs)
        : Promise.resolve({ data: [] as ProjectRow[] }),
      idSlugs.length > 0 ? projectQuery().in("id", idSlugs) : Promise.resolve({ data: [] as ProjectRow[] }),
    ]);

    const slugByProjectId = new Map<string, string>();
    ((bySlug.data || []) as ProjectRow[]).forEach((project) => {
      if (project.project_slug) slugByProjectId.set(project.id, project.project_slug);
    });
    ((byId.data || []) as ProjectRow[]).forEach((project) => slugByProjectId.set(project.id, project.id));

    const projectIds = Array.from(slugByProjectId.keys());
    if (projectIds.length === 0) return linksBySlug;

    const { data: subsections } = await supabase
      .from("project_subsections")
      .select("project_id, title, anchor_slug, display_order")
      .in("project_id", projectIds)
      .eq("is_published", true)
      .order("display_order", { ascending: true });

    (subsections || []).forEach((subsection) => {
      const slug = slugByProjectId.get(subsection.project_id);
      if (!slug) return;
      const links = linksBySlug.get(slug) ?? [{ anchor: PROJECT_OVERVIEW_ANCHOR, label: "Overview" }];
      links.push({ anchor: getSubsectionAnchor(subsection), label: subsection.title });
      linksBySlug.set(slug, links);
    });
  } catch (error) {
    console.error("Error loading project sections for the nav:", error);
  }

  return linksBySlug;
};
