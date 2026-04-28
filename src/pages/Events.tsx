import { Layout } from "@/components/layout/Layout";
import { PageMeta } from "@/components/shared/PageMeta";
import { SectionHeading } from "@/components/shared/SectionHeading";

import { SectionDivider } from "@/components/shared/SectionDivider";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { PastEventsBook } from "@/components/shared/PastEventsBook";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { SITE_URL, createBreadcrumbSchema, createWebPageSchema } from "@/lib/seo";
import {
  EVENT_ORDER_ENTITY_ID,
  EVENT_ORDER_ENTITY_TYPE,
  EVENT_ORDER_MEDIA_TYPE,
  parseEventOrder,
  parseEventRegistrationLinks,
  sortEventsByDisplayOrder,
  splitEventsByTimeline,
} from "@/lib/events";

interface Event {
  id: string;
  title: string;
  created_at?: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  time: string | null;
  location: string | null;
  category: string | null;
  registration_link: string | null;
  featured_image_url: string | null;
}

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  title: string | null;
  description: string | null;
}

export default function Events() {
  const [searchParams] = useSearchParams();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [eventMedia, setEventMedia] = useState<Record<string, MediaItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<MediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const upcomingSectionRef = useRef<HTMLElement | null>(null);
  const pastSectionRef = useRef<HTMLElement | null>(null);
  const focusedEventId = searchParams.get("event");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('is_archived', false)
          .order('start_date', { ascending: true });

        if (eventsError) throw eventsError;

        const { data: orderSettings } = await supabase
          .from('media')
          .select('description')
          .eq('entity_type', EVENT_ORDER_ENTITY_TYPE)
          .eq('entity_id', EVENT_ORDER_ENTITY_ID)
          .eq('media_type', EVENT_ORDER_MEDIA_TYPE)
          .limit(1)
          .maybeSingle();

        const eventOrder = parseEventOrder(orderSettings?.description);
        const allEvents = events || [];
        const { upcoming, past } = splitEventsByTimeline(allEvents, new Date());
        setUpcomingEvents(sortEventsByDisplayOrder(upcoming, eventOrder));
        setPastEvents(sortEventsByDisplayOrder(past, eventOrder));

        // Fetch media for all events
        if (allEvents.length > 0) {
          const eventIds = allEvents.map(e => e.id);
          const { data: media, error: mediaError } = await supabase
            .from('media')
            .select('*')
            .eq('entity_type', 'event')
            .in('entity_id', eventIds)
            .order('display_order', { ascending: true });

          if (!mediaError && media) {
            const mediaByEvent: Record<string, MediaItem[]> = {};
            media.forEach((m) => {
              if (!mediaByEvent[m.entity_id]) {
                mediaByEvent[m.entity_id] = [];
              }
              mediaByEvent[m.entity_id].push(m);
            });
            setEventMedia(mediaByEvent);
          }
        }

      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (isLoading || !focusedEventId) return;

    const isUpcomingEvent = upcomingEvents.some((event) => event.id === focusedEventId);
    const isPastEvent = pastEvents.some((event) => event.id === focusedEventId);
    const targetSection = isUpcomingEvent
      ? upcomingSectionRef.current
      : isPastEvent
        ? pastSectionRef.current
        : null;

    targetSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusedEventId, isLoading, pastEvents, upcomingEvents]);

  const openMediaLightbox = (eventId: string, index: number = 0) => {
    const media = eventMedia[eventId];
    if (media && media.length > 0) {
      setLightboxMedia(media);
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const pageTitle = "Events & Programs";
  const pageDescription = "Discover upcoming Indian cultural events, festivals, Diwali celebrations, and community gatherings hosted by The Rith Initiative in Virginia.";
  const eventsPageSchema = createWebPageSchema({
    title: `${pageTitle} | The Rith Initiative`,
    description: pageDescription,
    path: "/events",
    type: "CollectionPage",
  });
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Events", path: "/events" },
  ]);
  const eventSchemas = upcomingEvents.slice(0, 10).map((event) => {
    const registrationUrl = parseEventRegistrationLinks(event.registration_link)[0]?.url;

    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      startDate: event.start_date,
      ...(event.end_date ? { endDate: event.end_date } : {}),
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(event.location
        ? {
            location: {
              "@type": "Place",
              name: event.location,
            },
          }
        : {}),
      organizer: {
        "@type": "Organization",
        name: "The Rith Initiative",
        url: SITE_URL,
      },
      url: registrationUrl || `${SITE_URL}/events`,
    };
  });

  return (
    <Layout>
      <PageMeta
        title={pageTitle}
        description={pageDescription}
        keywords="Indian cultural events Virginia, Indian festivals, Diwali celebration Virginia, Indian American community events, Indian dance performance, Indian music event"
        path="/events"
        jsonLd={[eventsPageSchema, breadcrumbSchema, ...eventSchemas]}
      />
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-b from-secondary/30 to-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <ScrollReveal variant="fade-up">
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6">
                Events & Programs
              </h1>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={100}>
              <p className="text-base text-muted-foreground leading-relaxed italic">
                Join us for cultural celebrations, educational workshops, and community gatherings 
                that bring the beauty of Indian heritage to life.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* Upcoming Events */}
      <section ref={upcomingSectionRef} className="section-padding">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <SectionHeading 
              title="Upcoming Events"
              subtitle="Mark your calendar for these exciting programs"
            />
          </ScrollReveal>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <ScrollReveal variant="fade-up" delay={100}>
              <PastEventsBook 
                events={upcomingEvents}
                eventMedia={eventMedia}
                onMediaClick={openMediaLightbox}
                browseInstruction="Use the arrows to browse through upcoming events"
                focusedEventId={focusedEventId}
              />
            </ScrollReveal>
          ) : (
            <ScrollReveal variant="fade-up">
              <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">No Upcoming Events</h3>
                <p className="text-muted-foreground">Check back soon for new events and programs!</p>
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      <SectionDivider />

      {/* Past Events - Book Style Gallery */}
      <section ref={pastSectionRef} className="section-padding bg-secondary/20">
        <div className="container-wide">
          <ScrollReveal variant="fade-up">
            <SectionHeading 
              title="Past Events"
              subtitle="Flip through our past celebrations and memories"
              centered
            />
          </ScrollReveal>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ScrollReveal variant="fade-up" delay={100}>
              <PastEventsBook 
                events={pastEvents}
                eventMedia={eventMedia}
                onMediaClick={openMediaLightbox}
                browseInstruction="Use the arrows to browse through past events"
                focusedEventId={focusedEventId}
              />
            </ScrollReveal>
          )}
        </div>
      </section>

      <SectionDivider />

      {/* CTA Section */}
      <section className="section-padding bg-foreground text-background">
        <div className="container-narrow text-center">
          <ScrollReveal variant="fade-up">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6">
              Want to Host an Event?
            </h2>
            <p className="text-background/70 text-lg max-w-2xl mx-auto mb-8">
              We partner with community organizations, schools, and cultural groups to bring 
              Indian cultural programming to new audiences. Get in touch to discuss collaboration opportunities.
            </p>
            <Button 
              variant="hero" 
              size="xl"
              onClick={() => window.location.href = '/contact'}
            >
              Contact Us
              <ArrowRight size={20} />
            </Button>
          </ScrollReveal>
        </div>
      </section>

      {/* Media Lightbox */}
      <MediaLightbox
        media={lightboxMedia}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </Layout>
  );
}
