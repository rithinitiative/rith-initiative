import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import {
  ZELLE_QR_SETTING_KEY,
  SPONSORSHIP_HERO_HEADING_KEY,
  SPONSORSHIP_HERO_SUBTITLE_KEY,
} from "@/lib/siteSettings";
import { SponsorshipCard } from "@/components/shared/ProjectSubsections";
import { ProjectSubsection } from "@/lib/subsections";

const COUNT_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

export default function SponsorshipOptions() {
  const [subsections, setSubsections] = useState<ProjectSubsection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: zelleQrUrl } = useSiteSetting(ZELLE_QR_SETTING_KEY);
  const { data: heroHeading } = useSiteSetting(SPONSORSHIP_HERO_HEADING_KEY);
  const { data: heroSubtitle } = useSiteSetting(SPONSORSHIP_HERO_SUBTITLE_KEY);

  useEffect(() => {
    const fetchSponsorships = async () => {
      try {
        // Locate the Threads & Bridges (Oral History) project, then load its
        // published sponsorship subsections with tiers.
        const { data: project } = await supabase
          .from("blog_posts")
          .select("id")
          .not("project_slug", "is", null)
          .or("project_slug.ilike.%oral-history%,title.ilike.%oral history%")
          .order("project_display_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!project) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from("project_subsections")
          .select(
            "id, title, anchor_slug, section_type, body, payment_zelle_qr_url, payment_paypal_button_id, payment_note, display_order, is_published, project_subsection_tiers(id, name, description, amount, display_order)",
          )
          .eq("project_id", project.id)
          .eq("section_type", "sponsorship")
          .eq("is_published", true)
          .order("display_order", { ascending: true });

        setSubsections(
          ((data || []) as Array<Record<string, unknown> & { project_subsection_tiers?: unknown }>).map((row) => ({
            ...(row as unknown as ProjectSubsection),
            tiers: (row.project_subsection_tiers as ProjectSubsection["tiers"]) || [],
          })),
        );
      } catch (error) {
        console.error("Error loading sponsorship options:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSponsorships();
  }, []);

  return (
    <Layout>
      <section className="border-b border-border/50 bg-secondary/20">
        <div className="container-narrow py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 text-sm font-semibold text-primary">
            <Heart size={16} />
            Threads &amp; Bridges 2026
          </span>
          <h1 className="mt-6 font-heading text-4xl font-semibold text-foreground sm:text-5xl">
            {heroHeading?.trim() || "Sponsorship Options"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            {heroSubtitle?.trim() ||
              `${subsections.length > 0 ? `${countWord(subsections.length)} ways` : "Ways"} to support Threads & Bridges — a festival and living archive documenting Indian and Indian-American life in Virginia. Every contribution helps us do right by the stories people have trusted us with.`}
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container-narrow space-y-8">
          {isLoading ? (
            <div className="space-y-6">
              {[0, 1].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-lg bg-secondary/40" />
              ))}
            </div>
          ) : subsections.length === 0 ? (
            <p className="rounded-md bg-secondary/30 px-4 py-10 text-center text-muted-foreground">
              Sponsorship options are being finalized. Please check back soon.
            </p>
          ) : (
            subsections.map((subsection) => (
              <SponsorshipCard key={subsection.id} subsection={subsection} zelleQrUrl={zelleQrUrl} />
            ))
          )}
        </div>
      </section>
    </Layout>
  );
}
