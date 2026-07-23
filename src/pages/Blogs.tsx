import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PlaceholderImage } from "@/components/shared/PlaceholderImage";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { BlogDetailModal } from "@/components/shared/BlogDetailModal";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { SITE_URL, createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import { isBlogPostRecord } from "@/lib/postClassification";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  author_name: string | null;
  category: string | null;
  project_slug?: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

function HeroSection() {
  return (
    <section className="relative py-12 md:py-16 bg-gradient-to-b from-background to-secondary/30">
      <div className="container-wide">
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
              Rith <span className="text-primary">Blogs</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed italic">
              Read reflections, announcements, and community stories from The Rith Initiative.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

const POSTS_PER_PAGE = 9;

function BlogsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, content, excerpt, author_name, category, project_slug, featured_image_url, published_at, created_at')
        .eq('is_published', true)
        .eq('is_archived', false)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(((data || []) as BlogPost[]).filter(isBlogPostRecord));
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchPosts();
      setIsLoading(false);
    };
    load();
  }, []);

  // Reset pagination when category filter changes
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [selectedCategory]);

  const handleLoadMore = async () => {
    setVisibleCount((current) => current + POSTS_PER_PAGE);
  };

  // All unique categories from loaded posts (for filtering)
  const categories = Array.from(new Set(posts.map(p => p.category).filter(Boolean))) as string[];
  const filteredPosts = selectedCategory
    ? posts.filter(p => p.category === selectedCategory)
    : posts;
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  const handlePostClick = (post: BlogPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  return (
    <section className="section-padding">
      <div className="container-wide">
        {/* Category Filter */}
        {categories.length > 0 && (
          <ScrollReveal variant="fade-up">
            <div className="flex flex-wrap gap-3 justify-center mb-12">
              <Button
                variant={selectedCategory === null ? "hero" : "subtle"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Blogs
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "hero" : "subtle"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </ScrollReveal>
        )}

        {isLoading ? (
          <CardGridSkeleton />
        ) : filteredPosts.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visiblePosts.map((post, index) => (
                <ScrollReveal key={post.id} variant="fade-up" delay={(index % POSTS_PER_PAGE) * 100}>
                  <article
                    className="group bg-card rounded-2xl overflow-hidden border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-300 cursor-pointer h-full"
                    onClick={() => handlePostClick(post)}
                  >
                    {post.featured_image_url ? (
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <PlaceholderImage aspectRatio="video" label="Blog post image" className="rounded-none" />
                    )}
                    <div className="p-6">
                      {post.category && (
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                          {post.category}
                        </span>
                      )}
                      <p className="text-sm text-muted-foreground mt-1 mb-2">
                        {format(new Date(post.published_at || post.created_at), 'MMMM d, yyyy')}
                      </p>
                      <h3 className="font-heading text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                      )}
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <Button
                  variant="subtle"
                  size="lg"
                  onClick={handleLoadMore}
                >
                  Load More Blogs
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
            <p className="text-muted-foreground mb-4">No blogs yet. Check back soon!</p>
            <Button variant="subtle" asChild>
              <Link to="/">
                Back to Home
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        )}

        <BlogDetailModal
          post={selectedPost}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="section-padding bg-secondary/30">
      <div className="container-narrow text-center">
        <ScrollReveal variant="fade-up">
          <SectionHeading 
            title="Stay Connected" 
            subtitle="Want to be the first to know about new blogs and updates?"
            centered 
          />
          <Button variant="hero" size="xl" asChild>
            <Link to="/contact">
              Get In Touch
              <ArrowRight size={20} />
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}

const Blogs = () => {
  const pageTitle = "Blogs";
  const pageDescription = "Read blog posts, announcements, reflections, and community stories from The Rith Initiative.";
  const blogsPageSchema = createWebPageSchema({
    title: `${pageTitle} | The Rith Initiative`,
    description: pageDescription,
    path: "/blogs",
    type: "Blog",
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Blogs", path: "/blogs" },
  ]);
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The Rith Initiative Blogs",
    description: pageDescription,
    url: `${SITE_URL}/blogs`,
    inLanguage: "en-US",
    publisher: {
      "@type": "Organization",
      name: "The Rith Initiative",
      url: SITE_URL,
    },
  };

  return (
    <Layout>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        keywords="Rith Initiative blogs, Indian American stories, Indian cultural insights, Indian heritage articles, South Asian community stories"
        path="/blogs"
        jsonLd={[blogsPageSchema, breadcrumbSchema, blogSchema]}
      />
      <HeroSection />
      <SectionDivider />
      <BlogsSection />
      <SectionDivider />
      <CTASection />
    </Layout>
  );
};

export default Blogs;
