import { Link } from "react-router-dom";
import { ArrowRight, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { PlaceholderImage } from "@/components/shared/PlaceholderImage";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { PageMeta } from "@/components/shared/PageMeta";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { createWebPageSchema, organizationSchema, websiteSchema } from "@/lib/seo";
import { formatEventDateRange, splitEventsByTimeline } from "@/lib/events";
import communityGatheringImage from "@/assets/community-gathering.jpg";
import heroCulturalEventImage from "@/assets/hero-cultural-event.jpg";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  time: string | null;
  location: string | null;
  featured_image_url: string | null;
}

interface Update {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  media_type: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center bg-gradient-to-b from-background to-secondary/30">
      <div className="container-wide py-12 md:py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <ScrollReveal variant="fade-up">
            <div className="space-y-4 md:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                501(c)(3) Nonprofit Organization
              </div>
              <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-foreground leading-tight">
                Exploring <span className="text-primary">Indian Wisdom & Culture</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground italic">
                Celebrating through arts, stories & community
              </p>
              {/* Buttons - hidden on mobile/tablet, shown on desktop */}
              <div className="hidden lg:flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/events">
                    Explore Events
                    <ArrowRight size={20} />
                  </Link>
                </Button>
                <Button variant="heroOutline" size="xl" asChild>
                  <Link to="/donate">Support Our Mission</Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={200}>
            <div className="relative">
              <div className="relative z-10">
                <img
                  src={heroCulturalEventImage}
                  alt="Community members creating traditional Rangoli art with the message: Rith means cosmic rhythms, calling us to listen deeply to the echoes of our heritage, the voices around us and the possibilities before us"
                  className="rounded-2xl shadow-elevated w-full h-auto object-cover"
                  fetchPriority="high"
                  decoding="async" />

              </div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -top-6 -right-6 w-40 h-40 bg-accent/20 rounded-full blur-2xl" />
            </div>
          </ScrollReveal>
          {/* Buttons - shown on mobile/tablet below image, hidden on desktop */}
          <ScrollReveal variant="fade-up" delay={300} className="lg:hidden lg:col-span-2">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/events">
                  Explore Events
                  <ArrowRight size={20} />
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/donate">Support Our Mission</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>);

}

// Vision Preview Section
function VisionPreview() {
  return (
    <section className="section-padding bg-secondary/30">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <ScrollReveal variant="slide-left" className="order-2 lg:order-1">
            <img
              src={communityGatheringImage}
              alt="Community gathering at Virginia Historical Society"
              className="rounded-2xl shadow-soft w-full h-auto object-cover"
              loading="lazy"
              decoding="async" />

          </ScrollReveal>
          <ScrollReveal variant="slide-right" className="order-1 lg:order-2">
            <div className="space-y-4 md:space-y-6">
              <SectionHeading title="Our Vision" subtitle="Fostering conscious living with creativity" />
              <p className="text-muted-foreground leading-relaxed">
                A world where art serves as a bridge for communities to care, connect and sustain their culture and wisdom
              
              </p>
              <Button variant="subtle" size="lg" asChild>
                <Link to="/about">
                  Learn More About Us
                  <ArrowRight size={18} />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>);

}

// Latest Updates Section (shows Updates, not blog posts)
function UpdatesPreviewSection() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const { data, error } = await supabase.
        from("updates").
        select("id, title, description, media_url, media_type, thumbnail_url, published_at, created_at").
        eq("is_published", true).
        eq("is_archived", false).
        order("published_at", { ascending: false }).
        limit(3);

        if (error) throw error;
        setUpdates(data || []);
      } catch (error) {
        console.error("Error fetching updates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  const handleUpdateClick = (update: Update) => {
    if (update.media_type === "link" && update.media_url) {
      window.open(update.media_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="section-padding bg-secondary/30">
      <div className="container-wide">
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12">
            <SectionHeading
              title="Latest Updates"
              subtitle="News and announcements from our community"
              className="mb-0" />

          </div>
        </ScrollReveal>

        {isLoading ?
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div> :
        updates.length > 0 ?
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {updates.map((update, index) =>
          <ScrollReveal key={update.id} variant="fade-up" delay={index * 100}>
                <article
              className={`group bg-card rounded-2xl overflow-hidden border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-300 h-full ${update.media_type === "link" ? "cursor-pointer" : ""}`}
              onClick={() => handleUpdateClick(update)}>

                  {/* Media Display */}
                  {update.media_type === "image" && update.media_url &&
              <div className="aspect-video overflow-hidden">
                      <img
                  src={update.media_url}
                  alt={update.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

                    </div>
              }
                  {update.media_type === "video" && update.media_url &&
              <div className="aspect-video overflow-hidden">
                      <video src={update.media_url} className="w-full h-full object-cover" controls />
                    </div>
              }
                  {update.media_type === "link" && update.thumbnail_url &&
              <div className="aspect-video overflow-hidden">
                      <img
                  src={update.thumbnail_url}
                  alt={update.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />

                    </div>
              }
                  {!(
              update.media_type === "image" && update.media_url ||
              update.media_type === "video" && update.media_url ||
              update.media_type === "link" && update.thumbnail_url) &&
              <PlaceholderImage aspectRatio="video" label="Update" className="rounded-none" />}

                  <div className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      {format(new Date(update.published_at || update.created_at), "MMMM d, yyyy")}
                    </p>
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors flex items-center gap-2">
                      {update.title}
                      {update.media_type === "link" && <ExternalLink size={16} className="text-muted-foreground" />}
                    </h3>
                    {update.description &&
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{update.description}</p>
                }
                  </div>
                </article>
              </ScrollReveal>
          )}
          </div> :

        <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
            <p className="text-muted-foreground">No updates yet. Check back soon!</p>
          </div>
        }
      </div>
    </section>);

}

// Events Preview Section
function EventsPreviewSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventPhotos, setEventPhotos] = useState<{url: string | null;title: string | null;}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase.
        from("events").
        select("id, title, start_date, end_date, time, location, featured_image_url").
        eq("is_archived", false).
        order("start_date", { ascending: true });

        if (error) throw error;
        const { upcoming } = splitEventsByTimeline(data || [], new Date());
        const displayedUpcoming = upcoming.slice(0, 2);
        setEvents(displayedUpcoming);

        if (displayedUpcoming.length > 0) {
          const eventIds = displayedUpcoming.map((event) => event.id);

          const { data: mediaData, error: mediaError } = await supabase.
          from("media").
          select("entity_id, url, title, display_order, created_at").
          eq("entity_type", "event").
          eq("media_type", "image").
          in("entity_id", eventIds).
          order("display_order", { ascending: true }).
          order("created_at", { ascending: true });

          if (!mediaError) {
            const firstMediaByEvent = new Map<string, {url: string;title: string | null;}>();
            (mediaData || []).forEach((media) => {
              if (!firstMediaByEvent.has(media.entity_id)) {
                firstMediaByEvent.set(media.entity_id, {
                  url: media.url,
                  title: media.title,
                });
              }
            });

            setEventPhotos(
              displayedUpcoming.map((event) => {
                const mediaForEvent = firstMediaByEvent.get(event.id);
                return {
                  url: event.featured_image_url || mediaForEvent?.url || null,
                  title: mediaForEvent?.title || event.title,
                };
              }));
          } else {
            setEventPhotos(
              displayedUpcoming.map((event) => ({
                url: event.featured_image_url || null,
                title: event.title,
              })));
          }
        } else {
          setEventPhotos([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <ScrollReveal variant="slide-left">
            <div>
              <SectionHeading
                title="Upcoming Events"
                subtitle="Join us for cultural celebrations and community gatherings" />


              {isLoading ?
              <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div> :
              events.length > 0 ?
                <div className="space-y-6">
                  {events.map((event, index) =>
                <ScrollReveal key={event.id} variant="fade-up" delay={index * 100}>
                      <div className="p-6 rounded-xl bg-card border border-border/50 shadow-soft hover:shadow-elevated transition-all duration-300">
                        <div>
                          <h4 className="font-heading text-lg font-semibold text-foreground mb-1">{event.title}</h4>
                          <p className="text-primary font-medium text-sm">
                            {formatEventDateRange(event)}
                            {event.time && ` • ${event.time}`}
                          </p>
                          {event.location && <p className="text-muted-foreground text-sm">{event.location}</p>}
                        </div>
                      </div>
                    </ScrollReveal>
                )}
                </div> :

              <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
                  <p className="text-muted-foreground">No upcoming events at the moment. Check back soon!</p>
                </div>
              }

              <Button variant="hero" size="lg" className="mt-8" asChild>
                <Link to="/events">
                  View All Events
                  <ArrowRight size={18} />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="slide-right" delay={100}>
            {events.length === 1 ?
            <div className="max-w-sm mx-auto">
                {eventPhotos[0]?.url ?
              <div className="aspect-[3/4] w-full flex items-center justify-center">
                    <div className="inline-flex max-w-full max-h-full rounded-xl overflow-hidden border border-border/50 bg-secondary/20">
                      <img
                    src={eventPhotos[0].url}
                    alt={eventPhotos[0].title || "Event photo"}
                    className="block w-auto h-auto max-w-full max-h-full object-contain" />
                    </div>
                  </div> :
              <PlaceholderImage
                aspectRatio="portrait"
                label={`${events[0].title} image`}
                className="rounded-xl" />
              }
              </div> :
            <div className="grid grid-cols-2 gap-4">
                {eventPhotos[0]?.url ?
              <div className="aspect-[3/4] w-full flex items-center justify-center">
                    <div className="inline-flex max-w-full max-h-full rounded-xl overflow-hidden border border-border/50 bg-secondary/20">
                      <img
                    src={eventPhotos[0].url}
                    alt={eventPhotos[0].title || "Event photo"}
                    className="block w-auto h-auto max-w-full max-h-full object-contain" />
                    </div>
                  </div> :
              <PlaceholderImage aspectRatio="portrait" label={events[0]?.title ? `${events[0].title} image` : "Event photo 1"} className="rounded-xl" />
              }

                {eventPhotos[1]?.url ?
              <div className="aspect-[3/4] w-full flex items-center justify-center mt-8">
                    <div className="inline-flex max-w-full max-h-full rounded-xl overflow-hidden border border-border/50 bg-secondary/20">
                      <img
                    src={eventPhotos[1].url}
                    alt={eventPhotos[1].title || "Event photo"}
                    className="block w-auto h-auto max-w-full max-h-full object-contain" />
                    </div>
                  </div> :
              <PlaceholderImage aspectRatio="portrait" label={events[1]?.title ? `${events[1].title} image` : "Event photo 2"} className="rounded-xl mt-8" />
              }
              </div>
            }
          </ScrollReveal>
        </div>
      </div>
    </section>);

}

// CTA Section
function CTASection() {
  return (
    <section className="section-padding bg-foreground text-background">
      <div className="container-narrow text-center">
        <ScrollReveal variant="fade-up">
          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-semibold mb-4">Support Our Mission</h2>
          <p className="text-background/70 text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
            Your contribution helps us continue sharing Indian culture and traditions with communities across Virginia.
            Every donation makes a difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/donate">
                Make a Donation
                <Heart size={20} />
              </Link>
            </Button>
            <Button
              variant="heroOutline"
              size="xl"
              className="border-background/30 text-background hover:bg-background hover:text-foreground"
              asChild>

              <Link to="/contact">Get Involved</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>);

}

// Gallery Preview
function GalleryPreview() {
  const [galleryImages, setGalleryImages] = useState<{id: string;url: string;title: string | null;}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        // First try to get images from site_gallery
        const { data: siteImages, error: siteError } = await supabase.
        from("site_gallery").
        select("id, url, title").
        eq("section_key", "home_gallery").
        order("display_order", { ascending: true }).
        limit(8);

        if (!siteError && siteImages && siteImages.length > 0) {
          setGalleryImages(siteImages);
        } else {
          // Fallback to event media if no site gallery images
          const { data: eventMedia, error: eventError } = await supabase.
          from("media").
          select("id, url, title").
          eq("entity_type", "event").
          eq("media_type", "image").
          limit(8);

          if (!eventError && eventMedia) {
            setGalleryImages(eventMedia);
          }
        }
      } catch (error) {
        console.error("Error fetching gallery:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, []);

  return (
    <section className="section-padding">
      <div className="container-wide">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            title="Moments From Our Events"
            subtitle="Glimpses of culture, community, and celebration"
            centered />

        </ScrollReveal>
        {isLoading ?
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div> :
        galleryImages.length > 0 ?
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImages.map((img, i) =>
          <ScrollReveal key={img.id} variant="scale" delay={i * 50}>
                <div className="aspect-square rounded-xl overflow-hidden bg-secondary/30 hover:scale-105 transition-transform duration-300">
                  <img
                src={img.url}
                alt={img.title || `Gallery image ${i + 1}`}
                className="w-full h-full object-cover" />

                </div>
              </ScrollReveal>
          )}
          </div> :

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
          <ScrollReveal key={i} variant="scale" delay={i * 50}>
                <PlaceholderImage
              aspectRatio="square"
              label={`Gallery image ${i}`}
              className="rounded-xl hover:scale-105 transition-transform duration-300" />

              </ScrollReveal>
          )}
          </div>
        }
      </div>
    </section>);

}

const Index = () => {
  const homeTitle = "The Rith Initiative | Indian American Cultural Nonprofit in Virginia";
  const homeDescription = "A 501(c)(3) Indian American nonprofit fostering conscious living through Indian arts, cultural events, festivals, and community programming in Virginia.";
  const homePageSchema = createWebPageSchema({
    title: homeTitle,
    description: homeDescription,
    path: "/",
  });

  return (
    <Layout>
      <PageMeta
        title={homeTitle}
        description={homeDescription}
        keywords="Indian American community Virginia, Indian cultural events, Indian festivals, Diwali, conscious living, Indian wisdom, Indian dance, Indian music"
        jsonLd={[organizationSchema, websiteSchema, homePageSchema]} />

      <HeroSection />
      <SectionDivider />
      <VisionPreview />
      <SectionDivider />
      <EventsPreviewSection />
      <SectionDivider />
      <UpdatesPreviewSection />
      <SectionDivider />
      <GalleryPreview />
      <CTASection />
    </Layout>);

};

export default Index;
