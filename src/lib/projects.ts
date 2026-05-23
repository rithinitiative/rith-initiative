export interface ProjectNavItem {
  id: string;
  title: string;
  project_slug: string | null;
  project_display_order: number | null;
  start_date: string;
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

    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
