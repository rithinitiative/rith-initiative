import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  NavItemRow,
  NavNode,
  attachProjectSections,
  buildNavTree,
  collectProjectSlugs,
} from "@/lib/nav";
import { fetchProjectSectionLinks } from "@/lib/projectNavSections";

/**
 * The published site navigation as a tree, with every project link expanded to
 * include that project's page sections. Cached and shared via React Query so
 * moving between pages doesn't refetch the menu.
 */
export function useSiteNav() {
  return useQuery<NavNode[]>({
    queryKey: ["site_nav"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_items")
        .select("id, label, url, parent_id, display_order, opens_new_tab, is_published")
        .eq("is_published", true)
        .order("display_order", { ascending: true });
      if (error) throw error;

      const tree = buildNavTree((data || []) as NavItemRow[]);
      const slugs = collectProjectSlugs(tree);
      if (slugs.length === 0) return tree;

      return attachProjectSections(tree, await fetchProjectSectionLinks(slugs));
    },
    staleTime: 5 * 60 * 1000,
  });
}
