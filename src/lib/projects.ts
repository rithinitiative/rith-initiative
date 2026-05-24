export interface ProjectNavItem {
  id: string;
  title: string;
  project_slug: string | null;
  project_display_order: number | null;
  published_at?: string | null;
  created_at?: string | null;
}

export const createProjectSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "project";
};

export const getProjectPath = (project: Pick<ProjectNavItem, "id" | "project_slug">) =>
  `/projects/${project.project_slug || project.id}`;

export const sortProjects = <T extends ProjectNavItem>(projects: T[]) =>
  [...projects].sort((a, b) => {
    const orderDiff = (a.project_display_order ?? 0) - (b.project_display_order ?? 0);
    if (orderDiff !== 0) return orderDiff;

    const dateA = a.published_at || a.created_at || "";
    const dateB = b.published_at || b.created_at || "";
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
