import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads a single global value from the `site_settings` key/value store.
 * Cached and shared across the app via React Query, so the same key is only
 * fetched once regardless of how many components use it.
 */
export function useSiteSetting(key: string) {
  return useQuery({
    queryKey: ["site_setting", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
