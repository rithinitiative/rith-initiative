export interface NavItemRow {
  id: string;
  label: string;
  url: string | null;
  parent_id: string | null;
  display_order: number;
  opens_new_tab: boolean;
  is_published: boolean;
}

export interface NavNode extends NavItemRow {
  children: NavNode[];
}

/** One jump-link on a project page (its "On this page" entries). */
export interface ProjectSectionLink {
  /** Anchor id on the project page, e.g. "share-your-story". */
  anchor: string;
  label: string;
}

/**
 * Deepest level a project link can sit at and still have its sections added.
 * The header renders three levels (item > child > grandchild), so a project
 * link deeper than a first-level child has nowhere to put them.
 */
const MAX_PROJECT_MENU_DEPTH = 1;

/** True for absolute/external links (http, mailto, tel) that leave the SPA. */
export const isExternalUrl = (url: string | null | undefined): boolean =>
  !!url && /^(https?:)?\/\/|^mailto:|^tel:/i.test(url);

/**
 * Build a nested tree from a flat list of nav rows, ordered by display_order
 * at every level. Rows whose parent is missing are treated as top-level so
 * nothing silently disappears.
 */
export const buildNavTree = (rows: NavItemRow[]): NavNode[] => {
  const byId = new Map<string, NavNode>();
  rows.forEach((row) => byId.set(row.id, { ...row, children: [] }));

  const roots: NavNode[] = [];
  byId.forEach((node) => {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sort = (nodes: NavNode[]) => {
    nodes.sort((a, b) => a.display_order - b.display_order);
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);

  return roots;
};

/** '/projects/threads-bridges' -> 'threads-bridges'; null for any other link. */
export const getProjectSlugFromUrl = (url: string | null | undefined): string | null => {
  if (!url || isExternalUrl(url)) return null;
  const path = url.split(/[?#]/)[0].replace(/\/+$/, "");
  const match = /^\/projects\/([^/]+)$/.exec(path);
  return match ? match[1] : null;
};

/** Project slugs linked from the nav, deduped, skipping levels too deep to expand. */
export const collectProjectSlugs = (nodes: NavNode[]): string[] => {
  const slugs = new Set<string>();

  const walk = (list: NavNode[], depth: number) =>
    list.forEach((node) => {
      const slug = depth <= MAX_PROJECT_MENU_DEPTH ? getProjectSlugFromUrl(node.url) : null;
      if (slug) slugs.add(slug);
      walk(node.children, depth + 1);
    });

  walk(nodes, 0);
  return Array.from(slugs);
};

const normalizeUrl = (url: string | null) => (url || "").split("?")[0].replace(/\/+$/, "").toLowerCase();

/**
 * Add each project's page sections as sub-links under the nav item that points
 * at that project, so a subsection added in the admin appears in the dropdown
 * without anyone editing the navigation. Sub-links an admin added by hand win:
 * a generated entry with the same label or link is dropped, and the generated
 * ones slot in behind the last hand-made link to the same project page (a
 * link elsewhere, such as a separate sponsorship page, stays after them).
 */
export const attachProjectSections = (
  nodes: NavNode[],
  sectionsBySlug: Map<string, ProjectSectionLink[]>,
  depth = 0,
): NavNode[] =>
  nodes.map((node) => {
    const children = attachProjectSections(node.children, sectionsBySlug, depth + 1);
    const slug = depth <= MAX_PROJECT_MENU_DEPTH ? getProjectSlugFromUrl(node.url) : null;
    const sections = slug ? sectionsBySlug.get(slug) : undefined;
    if (!sections || sections.length === 0) return { ...node, children };

    const takenLabels = new Set(children.map((child) => child.label.trim().toLowerCase()));
    const takenUrls = new Set(children.map((child) => normalizeUrl(child.url)));

    const generated: NavNode[] = sections
      .map((section) => ({ ...section, url: `/projects/${slug}#${section.anchor}` }))
      .filter(
        (section) =>
          !takenLabels.has(section.label.trim().toLowerCase()) && !takenUrls.has(normalizeUrl(section.url)),
      )
      .map((section) => ({
        id: `${node.id}-section-${section.anchor}`,
        label: section.label,
        url: section.url,
        parent_id: node.id,
        display_order: 0,
        opens_new_tab: false,
        is_published: true,
        children: [],
      }));

    if (generated.length === 0) return { ...node, children };

    const lastSameProject = children.reduce(
      (last, child, index) => (getProjectSlugFromUrl(child.url) === slug ? index : last),
      -1,
    );
    const merged = [
      ...children.slice(0, lastSameProject + 1),
      ...generated,
      ...children.slice(lastSameProject + 1),
    ];

    return {
      ...node,
      children: merged.map((child, index) => ({ ...child, display_order: index })),
    };
  });
