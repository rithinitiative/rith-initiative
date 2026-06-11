import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PlaceholderImage } from "@/components/shared/PlaceholderImage";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Users, Globe, BookOpen } from "lucide-react";
import { createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import { sanitizeRichText } from "@/lib/richText";
import missionCelebrationImage from "@/assets/mission-celebration.jpg";
import ourStoryFoundingImage from "@/assets/our-story-founding.jpg";

const values = [
  {
    icon: Heart,
    title: "Cultural Preservation",
    description:
      "We are committed to preserving and sharing the rich traditions, arts, and heritage of Indian culture for future generations.",
  },
  {
    icon: Users,
    title: "Community Building",
    description:
      "We create inclusive spaces where people of all backgrounds can come together, learn, and celebrate cultural diversity.",
  },
  {
    icon: Globe,
    title: "Cross-Cultural Connection",
    description:
      "We believe in building bridges between communities, fostering understanding and appreciation across cultures.",
  },
  {
    icon: BookOpen,
    title: "Education & Outreach",
    description:
      "We provide educational programs that teach traditional arts, languages, and customs to people of all ages.",
  },
];

interface TeamMember {
  id?: string;
  name: string;
  role?: string | null;
  bio?: string | null;
  section?: "board" | "advisory";
  photo_url?: string | null;
  display_order?: number;
  created_at?: string;
}

const fallbackBoardMembers: TeamMember[] = [
  { name: "Ruchi Gupta", role: "President" },
  { name: "Prabir Mehta", role: "Vice President" },
  { name: "Sumeet Gupta", role: "Treasurer" },
];

const fallbackAdvisoryMembers: TeamMember[] = [{ name: "Priti Patil" }, { name: "Niraj Verma" }];

const LOCAL_BIO_STORAGE_KEY = "rith-team-member-bio-preview";

const isMissingBioColumnError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as { code?: string; message?: string };
  return code === "42703" || Boolean(message?.toLowerCase().includes("'bio'"));
};

const getLocalBioPreview = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BIO_STORAGE_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

const compareTeamMembers = (a: TeamMember, b: TeamMember) => {
  const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
  if (orderDiff !== 0) return orderDiff;

  const createdAtDiff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  if (createdAtDiff !== 0) return createdAtDiff;

  return a.name.localeCompare(b.name);
};

function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card p-4 text-center shadow-soft transition-all duration-300 hover:shadow-elevated">
      {member.photo_url ? (
        <img
          src={member.photo_url}
          alt={member.name}
          className="mb-4 aspect-square w-full rounded-lg object-cover shadow-soft"
        />
      ) : (
        <PlaceholderImage
          aspectRatio="square"
          label={member.name}
          className="mb-4 w-full rounded-lg shadow-soft"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="font-heading text-lg font-semibold text-foreground">{member.name}</h4>
        {member.role && <p className="text-sm text-muted-foreground">{member.role}</p>}
        {member.bio && (
          <div
            className="mt-4 border-t border-border/60 pt-4 text-left text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(member.bio) }}
          />
        )}
      </div>
    </article>
  );
}

function TeamMembersGrid({ members }: { members: TeamMember[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-6">
      {members.map((member, index) => (
        <ScrollReveal
          key={`${member.name}-${index}`}
          variant="fade-up"
          delay={index * 100}
          className="h-full min-w-0 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] max-w-[19rem]"
        >
          <TeamMemberCard member={member} />
        </ScrollReveal>
      ))}
    </div>
  );
}

export default function About() {
  const [boardMembers, setBoardMembers] = useState<TeamMember[]>(fallbackBoardMembers);
  const [advisoryMembers, setAdvisoryMembers] = useState<TeamMember[]>(fallbackAdvisoryMembers);

  useEffect(() => {
    let isMounted = true;

    const fetchTeamMembers = async () => {
      const teamQuery = await supabase
        .from("team_members")
        .select("id, name, role, bio, section, photo_url, display_order, created_at")
        .order("section", { ascending: true })
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (teamQuery.error && isMissingBioColumnError(teamQuery.error)) {
        const fallbackQuery = await supabase
          .from("team_members")
          .select("id, name, role, section, photo_url, display_order, created_at")
          .order("section", { ascending: true })
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (fallbackQuery.error) {
          console.error("Error fetching team members:", fallbackQuery.error);
          return;
        }

        const localBios = getLocalBioPreview();
        teamQuery.data = (fallbackQuery.data || []).map((member) => ({
          ...member,
          bio: localBios[member.id] || null,
        }));
        teamQuery.error = null;
      }

      const { data, error } = teamQuery;
      if (error) {
        console.error("Error fetching team members:", error);
        return;
      }

      const teamRows = data || [];

      const board = teamRows
        .filter((member) => member.section === "board")
        .sort(compareTeamMembers)
        .map((member) => ({
          id: "id" in member ? member.id : undefined,
          name: member.name,
          role: member.role,
          bio: member.bio,
          section: member.section,
          photo_url: member.photo_url,
          display_order: member.display_order,
          created_at: member.created_at,
        }));

      const advisory = teamRows
        .filter((member) => member.section === "advisory")
        .sort(compareTeamMembers)
        .map((member) => ({
          id: "id" in member ? member.id : undefined,
          name: member.name,
          role: member.role,
          bio: member.bio,
          section: member.section,
          photo_url: member.photo_url,
          display_order: member.display_order,
          created_at: member.created_at,
        }));

      if (!isMounted) {
        return;
      }

      setBoardMembers(board);
      setAdvisoryMembers(advisory);
    };

    fetchTeamMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  const pageTitle = "About Us";
  const pageDescription = "Learn about The Rith Initiative, a 501(c)(3) Indian American nonprofit exploring Indian wisdom, arts, and culture through community programming in Virginia.";
  const aboutPageSchema = createWebPageSchema({
    title: `${pageTitle} | The Rith Initiative`,
    description: pageDescription,
    path: "/about",
    type: "AboutPage",
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  return (
    <Layout>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        keywords="Indian American nonprofit about, Indian cultural organization Virginia, 501c3 Indian foundation, Indian heritage mission"
        path="/about"
        jsonLd={[aboutPageSchema, breadcrumbSchema]}
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-secondary/30 to-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal variant="fade-up">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
                About The Rith Initiative
              </h1>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={100}>
              <p className="text-base text-muted-foreground leading-relaxed italic">
                We are a 501(c)(3) nonprofit exploring and celebrating living Indian culture and wisdom through
                community events, arts, and programming in Virginia.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Mission Section */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ScrollReveal variant="slide-left">
              <div>
                <SectionHeading title="Our Mission" subtitle="Building bridges through culture, art, and community" />
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <p>
                    Rith Initiative exists to explore, share, and grow Indian culture through the arts. We see
                    creativity as a bridge that connects generations and geographies, fostering understanding and a
                    deeper sense of belonging.
                  </p>
                  <p>
                    Our mission is to create spaces where Indian traditions meet contemporary expression, inviting
                    artists and audiences of all ages to engage with heritage with openness and curiosity.
                  </p>
                  <p>
                    Through exhibitions, performances, storytelling, and community engagement, we spark dialogue,
                    nurture collaboration, and celebrate the many ways culture continues to evolve — rhythm by rhythm,
                    story by story.
                  </p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="slide-right" delay={100}>
              <div className="relative">
                <img
                  src={missionCelebrationImage}
                  alt="Traditional Indian dancers performing at community celebration"
                  className="rounded-2xl shadow-elevated w-full h-auto object-cover aspect-square"
                />
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Story Section */}
      <section className="section-padding bg-secondary/30">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <ScrollReveal variant="slide-left" className="order-2 lg:order-1">
              <div>
                <img
                  src={ourStoryFoundingImage}
                  alt="Women in colorful sarees at cultural event"
                  className="rounded-2xl shadow-soft w-full h-auto object-cover max-h-[600px]"
                />
              </div>
            </ScrollReveal>
            <ScrollReveal variant="slide-right" className="order-1 lg:order-2">
              <div>
                <SectionHeading title="Our Story" subtitle="From a small gathering to a thriving community" />
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <p>
                    We believe culture is not static. It is alive, adapting, growing, traveling, and constantly being
                    reinterpreted. The greatest threat to culture is not change, but disconnection: when future
                    generations feel embarrassed by it, or abandon it altogether in indifference.
                  </p>
                  <p>
                    Our work is to ensure the opposite. We do not seek to protect culture from change, but to evolve it
                    so compellingly and beautifully that it thrives. We want the next generation to naturally care for
                    it, not out of duty, but out of joy and curiosity. What the young needs are bridges that connect
                    what their grandmothers knew with what today's world needs to know.
                  </p>
                  <p>
                    Founded in Richmond, Virginia, by artists Ruchi Gupta and Prabir Mehta, Rith Initiative intents to
                    grow as a platform for intergenerational learning, artistic collaboration, and the celebration of
                    heritage in all its evolving forms. For us, culture is not about survival. It is about vitality.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Team Section */}
      <section className="section-padding bg-secondary/30">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <SectionHeading title="Rith Team" subtitle="The people behind the initiative" centered />
          </ScrollReveal>

          {/* Board */}
          <div className="mb-12">
            <ScrollReveal variant="fade-up">
              <h3 className="font-heading text-xl font-semibold text-foreground text-center mb-8">Board</h3>
            </ScrollReveal>
            <TeamMembersGrid members={boardMembers} />
          </div>

          {/* Advisory */}
          <div>
            <ScrollReveal variant="fade-up">
              <h3 className="font-heading text-xl font-semibold text-foreground text-center mb-8">Advisory</h3>
            </ScrollReveal>
            <TeamMembersGrid members={advisoryMembers} />
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Values Section */}
      <section className="section-padding">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <SectionHeading title="Our Values" subtitle="The principles that guide everything we do" centered />
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <ScrollReveal key={index} variant="fade-up" delay={index * 100}>
                <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-300 h-full">
                  <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <value.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
