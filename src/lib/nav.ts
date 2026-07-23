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
