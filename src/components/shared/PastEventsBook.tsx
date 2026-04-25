import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Image, ExternalLink, Sparkles, BookOpen, ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatEventDateRange, parseEventRegistrationLinks } from "@/lib/events";

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  title: string | null;
  description: string | null;
}

interface PastEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  time: string | null;
  location: string | null;
  category: string | null;
  featured_image_url: string | null;
  registration_link?: string | null;
}

interface PastEventsBookProps {
  events: PastEvent[];
  eventMedia: Record<string, MediaItem[]>;
  onMediaClick: (eventId: string, index: number) => void;
  browseInstruction?: string;
  focusedEventId?: string | null;
}

export function PastEventsBook({
  events,
  eventMedia,
  onMediaClick,
  browseInstruction = "Use the arrows to browse through past events",
  focusedEventId = null,
}: PastEventsBookProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const FLIP_DURATION_MS = 600;
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev" | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [mobileFlippedCards, setMobileFlippedCards] = useState<Set<string>>(new Set());

  // Group events into spreads (2 per spread)
  const spreads: PastEvent[][] = [];
  for (let i = 0; i < events.length; i += 2) {
    spreads.push(events.slice(i, i + 2));
  }

  const totalSpreads = Math.max(spreads.length, 1);
  const currentEventsPair = spreads[currentSpread] || [];

  useEffect(() => {
    if (!focusedEventId || events.length === 0) return;

    const focusedEventIndex = events.findIndex((event) => event.id === focusedEventId);
    if (focusedEventIndex === -1) return;

    const spreadIndex = Math.floor(focusedEventIndex / 2);
    const cardIndex = focusedEventIndex % 2;

    setCurrentSpread(spreadIndex);
    setIsFlipping(false);
    setFlipDirection(null);
    setFlippedCards(new Set([cardIndex]));
    setMobileFlippedCards(new Set([focusedEventId]));
  }, [events, focusedEventId]);

  const renderRegistrationButtons = (event: PastEvent, compact = false) => {
    const registrationLinks = parseEventRegistrationLinks(event.registration_link);
    if (registrationLinks.length === 0) return null;

    return (
      <div onClick={(e) => e.stopPropagation()} className={compact ? "mb-1.5 sm:mb-2 space-y-1.5" : "mb-2 space-y-2"}>
        {registrationLinks.map((link, index) => (
          <Button
            key={`${link.url}-${index}`}
            variant="default"
            size="sm"
            className={compact ? "gap-1 w-full text-[10px] sm:text-sm" : "gap-1 w-full"}
            onClick={() => window.open(link.url, '_blank')}
          >
            {link.label}
            <ArrowRight size={compact ? 12 : 14} />
          </Button>
        ))}
      </div>
    );
  };

  const copyEventLink = async (event: PastEvent) => {
    const eventUrl = `${window.location.origin}/events?event=${encodeURIComponent(event.id)}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(eventUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = eventUrl;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      toast({
        title: "Event link copied",
        description: "The direct event link is ready to share.",
      });
    } catch (error) {
      console.error("Error copying event link:", error);
      toast({
        title: "Could not copy link",
        description: "Please try again from your browser.",
        variant: "destructive",
      });
    }
  };

  const renderCopyLinkButton = (event: PastEvent, compact = false) => (
    <div onClick={(e) => e.stopPropagation()} className={compact ? "mb-1.5 sm:mb-2" : "mb-3"}>
      <Button
        variant="outline"
        size="sm"
        className={compact ? "gap-1 w-full text-[10px] sm:text-sm" : "gap-2 w-full"}
        onClick={() => copyEventLink(event)}
      >
        <Copy size={compact ? 12 : 14} />
        Copy Event Link
      </Button>
    </div>
  );
  const leftEvent = currentEventsPair[0];
  const rightEvent = currentEventsPair[1];
  const targetSpread =
    flipDirection === "next"
      ? Math.min(currentSpread + 1, totalSpreads - 1)
      : flipDirection === "prev"
        ? Math.max(currentSpread - 1, 0)
        : currentSpread;
  const targetEventsPair = spreads[targetSpread] || [];
  const targetLeftEvent = targetEventsPair[0];
  const targetRightEvent = targetEventsPair[1];

  // Keep the opposite/static page on the current spread while turning.
  // Only pre-swap the page that's hidden beneath the turning sheet.
  const displayedLeftEvent = isFlipping && flipDirection === "prev" ? targetLeftEvent : leftEvent;
  const displayedRightEvent = isFlipping && flipDirection === "next" ? targetRightEvent : rightEvent;
  const displayedLeftPageNumber = (isFlipping && flipDirection === "prev" ? targetSpread : currentSpread) * 2 + 1;
  const displayedRightPageNumber = (isFlipping && flipDirection === "next" ? targetSpread : currentSpread) * 2 + 2;

  const canGoNext = currentSpread < totalSpreads - 1;
  const canGoPrev = currentSpread > 0;

  const nextSpread = () => {
    if (canGoNext && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection("next");
      setFlippedCards(new Set()); // Reset flipped cards when changing spread
      setTimeout(() => {
        setCurrentSpread(prev => prev + 1);
        setIsFlipping(false);
        setFlipDirection(null);
      }, FLIP_DURATION_MS);
    }
  };

  const prevSpread = () => {
    if (canGoPrev && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection("prev");
      setFlippedCards(new Set()); // Reset flipped cards when changing spread
      setTimeout(() => {
        setCurrentSpread(prev => prev - 1);
        setIsFlipping(false);
        setFlipDirection(null);
      }, FLIP_DURATION_MS);
    }
  };

  const goToSpread = (index: number) => {
    if (!isFlipping && index !== currentSpread) {
      setIsFlipping(true);
      setFlipDirection(index > currentSpread ? "next" : "prev");
      setFlippedCards(new Set()); // Reset flipped cards when changing spread
      setTimeout(() => {
        setCurrentSpread(index);
        setIsFlipping(false);
        setFlipDirection(null);
      }, FLIP_DURATION_MS);
    }
  };

  const toggleCardFlip = (cardIndex: number) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardIndex)) {
        next.delete(cardIndex);
      } else {
        next.add(cardIndex);
      }
      return next;
    });
  };

  const toggleMobileCardFlip = (eventId: string) => {
    setMobileFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const renderMediaGallery = (event: PastEvent) => {
    const media = eventMedia[event.id];
    if (!media || media.length === 0) return null;

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 w-full">
            <Image size={14} />
            View Media ({media.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{event.title} - Media Gallery</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Click any image to enlarge</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {media.map((item, index) => (
              <div 
                key={item.id} 
                className="rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => item.media_type !== 'link' && onMediaClick(event.id, index)}
              >
                {item.media_type === 'image' && (
                  <img 
                    src={item.url} 
                    alt={item.title || 'Event media'} 
                    className="w-full h-40 object-cover"
                  />
                )}
                {item.media_type === 'video' && (
                  <div className="relative w-full h-40 bg-secondary flex items-center justify-center">
                    <video 
                      src={item.url} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <svg className="w-5 h-5 text-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                {item.media_type === 'link' && (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 h-40 hover:bg-muted transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={20} className="text-primary" />
                    <span className="text-sm font-medium truncate">{item.title || item.url}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderEventCard = (event: PastEvent | undefined, cardIndex: number, side: 'left' | 'right') => {
    const isFlipped = flippedCards.has(cardIndex);
    
    // Show placeholder if no event
    if (!event) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center relative">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary/40" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary/30 animate-pulse" />
          </div>
          <div className="text-muted-foreground/60 text-lg font-heading mb-2">
            More memories coming soon...
          </div>
          <p className="text-muted-foreground/40 text-sm max-w-[200px]">
            Stay tuned for our upcoming events and celebrations
          </p>
          {/* Decorative corner flourishes */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/20 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/20 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/20 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/20 rounded-br-lg" />
        </div>
      );
    }

    const media = eventMedia[event.id];
    const hasMedia = media && media.length > 0;

    return (
      <div 
        className="h-full perspective-1000 cursor-pointer"
        onClick={() => toggleCardFlip(cardIndex)}
      >
        <div 
          className={`
            relative w-full h-full transition-transform duration-500 transform-style-3d
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front of card - Featured Image/Poster */}
          <div 
            className="absolute inset-0 backface-hidden p-2 sm:p-4 md:p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
          <div className="h-full flex flex-col">
              {event.featured_image_url ? (
                <div className="flex-1 flex items-start justify-center overflow-hidden rounded-lg bg-secondary/20 p-1 sm:p-2">
                  <img
                    src={event.featured_image_url}
                    alt={event.title}
                    className="w-auto h-full max-w-full object-contain rounded-lg shadow-md"
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg">
                  <div className="text-center p-2 sm:p-4">
                    <Calendar className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-primary/40" />
                    <p className="text-muted-foreground font-heading text-xs sm:text-base">{event.title}</p>
                  </div>
                </div>
              )}
              <div className={`mt-1.5 sm:mt-3 pt-1.5 sm:pt-3 border-t border-border/30 ${side === 'left' ? 'text-left' : 'text-right'}`}>
                <p className="text-[10px] sm:text-sm font-medium text-foreground truncate">{event.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatEventDateRange(event)}
                </p>
                <p className="text-[10px] sm:text-xs text-primary mt-0.5 sm:mt-1 italic">Click to see details →</p>
              </div>
            </div>
          </div>

          {/* Back of card - Event Details */}
          <div 
            className="absolute inset-0 backface-hidden p-2 sm:p-4 md:p-6 rotate-y-180"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="h-full flex flex-col overflow-hidden">
              {/* Event Category Badge */}
              {event.category && (
                <span className="inline-block self-start px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-medium mb-1 sm:mb-2">
                  {event.category}
                </span>
              )}
              
              {/* Event Title */}
              <h3 className="font-heading text-xs sm:text-lg font-semibold text-foreground mb-1 sm:mb-2 line-clamp-2">
                {event.title}
              </h3>

              {/* Event Details */}
              <div className="space-y-0.5 sm:space-y-1.5 text-[10px] sm:text-sm text-muted-foreground mb-1.5 sm:mb-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar size={10} className="text-primary flex-shrink-0 sm:w-[14px] sm:h-[14px]" />
                  <span>{formatEventDateRange(event)}</span>
                </div>
                {event.time && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Clock size={10} className="text-primary flex-shrink-0 sm:w-[14px] sm:h-[14px]" />
                    <span>{event.time}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start gap-1 sm:gap-2">
                    <MapPin size={10} className="text-primary flex-shrink-0 mt-0.5 sm:w-[14px] sm:h-[14px]" />
                    <span className="line-clamp-2">{event.location}</span>
                  </div>
                )}
              </div>

              {renderCopyLinkButton(event, true)}

              {/* Media Button - after event details */}
              {hasMedia && (
                <div onClick={(e) => e.stopPropagation()} className="mb-1.5 sm:mb-3">
                  {renderMediaGallery(event)}
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="flex-1 overflow-y-auto mb-1.5 sm:mb-3">
                  <p className="whitespace-pre-wrap text-[10px] sm:text-sm text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Registration buttons for upcoming events */}
              {renderRegistrationButtons(event, true)}

              {/* Flip back hint - always at bottom */}
              <p className="text-[10px] sm:text-xs text-primary text-center italic mt-auto">Click to flip back</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStaticEventCard = (event: PastEvent | undefined, side: "left" | "right") => {
    if (!event) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center relative">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary/40" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary/30 animate-pulse" />
          </div>
          <div className="text-muted-foreground/60 text-lg font-heading mb-2">
            More memories coming soon...
          </div>
          <p className="text-muted-foreground/40 text-sm max-w-[200px]">
            Stay tuned for our upcoming events and celebrations
          </p>
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/20 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/20 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/20 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/20 rounded-br-lg" />
        </div>
      );
    }

    return (
      <div className="h-full p-2 sm:p-4 md:p-6">
        <div className="h-full flex flex-col">
          {event.featured_image_url ? (
            <div className="flex-1 flex items-start justify-center overflow-hidden rounded-lg bg-secondary/20 p-1 sm:p-2">
              <img
                src={event.featured_image_url}
                alt={event.title}
                className="w-auto h-full max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg">
              <div className="text-center p-2 sm:p-4">
                <Calendar className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-primary/40" />
                <p className="text-muted-foreground font-heading text-xs sm:text-base">{event.title}</p>
              </div>
            </div>
          )}
          <div className={`mt-1.5 sm:mt-3 pt-1.5 sm:pt-3 border-t border-border/30 ${side === "left" ? "text-left" : "text-right"}`}>
            <p className="text-[10px] sm:text-sm font-medium text-foreground truncate">{event.title}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {formatEventDateRange(event)}
            </p>
            <p className="text-[10px] sm:text-xs text-primary mt-0.5 sm:mt-1 italic">Click to see details →</p>
          </div>
        </div>
      </div>
    );
  };

  // Custom arrow button component
  const NavigationArrow = ({ 
    direction, 
    onClick, 
    disabled 
  }: { 
    direction: 'left' | 'right'; 
    onClick: () => void; 
    disabled: boolean;
  }) => {
    const isLeft = direction === 'left';
    const Icon = isLeft ? ChevronLeft : ChevronRight;
    
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          group relative p-2 sm:p-3 rounded-full 
          transition-all duration-300 z-10
          ${disabled 
            ? 'opacity-40 cursor-not-allowed' 
            : 'hover:scale-110 active:scale-95'}
        `}
        aria-label={isLeft ? "Previous spread" : "Next spread"}
      >
        {/* Outer decorative ring */}
        <div className={`
          absolute inset-0 rounded-full border-2 
          transition-all duration-300
          ${disabled 
            ? 'border-muted-foreground/20' 
            : 'border-primary/30 group-hover:border-primary/60 group-hover:scale-110'}
        `} />
        
        {/* Inner background with gradient */}
        <div className={`
          absolute inset-1 rounded-full 
          transition-all duration-300
          ${disabled 
            ? 'bg-muted/30' 
            : 'bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20'}
        `} />
        
        {/* Icon container */}
        <div className={`
          relative z-10 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center
          transition-transform duration-300
          ${!disabled && (isLeft ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5')}
        `}>
          <Icon 
            className={`
              w-5 h-5 sm:w-6 sm:h-6 
              transition-colors duration-300
              ${disabled ? 'text-muted-foreground/40' : 'text-primary group-hover:text-primary/80'}
            `} 
          />
        </div>
        
        {/* Decorative dots */}
        {!disabled && (
          <>
            <span className={`
              absolute ${isLeft ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2
              w-1 h-1 rounded-full bg-primary/40
              transition-all duration-300
              ${isLeft ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}
            `} />
            <span className={`
              absolute ${isLeft ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2
              w-0.5 h-0.5 rounded-full bg-primary/30
              transition-all duration-300 delay-75
              ${isLeft ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}
            `} />
          </>
        )}
      </button>
    );
  };

  const renderPageSurface = (
    event: PastEvent | undefined,
    cardIndex: number,
    side: "left" | "right",
    pageNumber: number,
    staticCard = false,
  ) => (
    <>
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 24px, currentColor 25px)",
        }}
      />
      <div
        className={`absolute ${side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} top-0 bottom-0 w-4 from-black/5 to-transparent`}
      />
      {staticCard ? renderStaticEventCard(event, side) : renderEventCard(event, cardIndex, side)}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50 font-body italic">
        {pageNumber}
      </div>
    </>
  );

  if (events.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No past events to display.</p>
      </div>
    );
  }

  // Mobile Carousel View
  const renderMobileView = () => (
    <div className="w-full px-2">
      <Carousel
        opts={{
          align: "center",
          containScroll: false,
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {events.map((event) => {
            const isFlipped = mobileFlippedCards.has(event.id);
            const media = eventMedia[event.id];
            const hasMedia = media && media.length > 0;

            return (
              <CarouselItem key={event.id} className="pl-2 basis-[85%]">
                <div 
                  className="perspective-1000 cursor-pointer"
                  onClick={() => toggleMobileCardFlip(event.id)}
                >
                  <div 
                    className="relative w-full transition-transform duration-500"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* Front of card */}
                    <div 
                      className="w-full bg-gradient-to-br from-white via-stone-50 to-stone-100 rounded-xl shadow-lg border border-stone-200 p-4"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      {event.featured_image_url ? (
                        <div className="aspect-[3/4] w-full flex items-center justify-center overflow-hidden rounded-lg bg-secondary/20 mb-3">
                          <img
                            src={event.featured_image_url}
                            alt={event.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg mb-3">
                          <div className="text-center p-4">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-primary/40" />
                            <p className="text-muted-foreground font-heading">{event.title}</p>
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatEventDateRange(event)}
                        </p>
                        <p className="text-xs text-primary mt-1 italic">Tap to see details →</p>
                      </div>
                    </div>

                    {/* Back of card */}
                    <div 
                      className="absolute inset-0 w-full bg-gradient-to-br from-white via-stone-50 to-stone-100 rounded-xl shadow-lg border border-stone-200 p-4 overflow-y-auto"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <div className="flex flex-col h-full">
                        {event.category && (
                          <span className="inline-block self-start px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                            {event.category}
                          </span>
                        )}
                        
                        <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                          {event.title}
                        </h3>

                        <div className="space-y-2 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-primary flex-shrink-0" />
                            <span>{formatEventDateRange(event)}</span>
                          </div>
                          {event.time && (
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-primary flex-shrink-0" />
                              <span>{event.time}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-start gap-2">
                              <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>

                        {renderCopyLinkButton(event)}

                        {hasMedia && (
                          <div onClick={(e) => e.stopPropagation()} className="mb-3">
                            {renderMediaGallery(event)}
                          </div>
                        )}

                        {event.description && (
                          <div className="flex-1 overflow-y-auto mb-3">
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                              {event.description}
                            </p>
                          </div>
                        )}

                        {renderRegistrationButtons(event)}

                        <p className="text-xs text-primary text-center italic mt-auto">Tap to flip back</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="flex justify-center items-center gap-4 mt-4">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
      
      <p className="text-center mt-4 text-muted-foreground text-xs">
        Swipe to browse • Tap card to flip
      </p>
    </div>
  );

  // Desktop Book View
  const renderDesktopView = () => (
    <div className="relative w-full max-w-5xl mx-auto perspective-[2000px]">
      {/* Book Container */}
      <div className="relative">
        {/* Book Shadow */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-foreground/10 rounded-[50%] blur-lg" />
        
        {/* Book Spine - lighter color */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-3 sm:w-4 md:w-6 bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 z-20 rounded-sm shadow-md" />
        
        {/* Book Pages Container - lighter cream/white tones */}
        <div className="relative flex bg-gradient-to-b from-stone-50 to-stone-100/80 rounded-lg shadow-2xl border-4 md:border-8 border-stone-300 min-h-[550px] md:min-h-[650px]">
          {/* Left Page */}
          <div className="w-1/2 bg-gradient-to-br from-white via-stone-50 to-stone-100/50 border-r border-stone-200/50 relative overflow-hidden">
            {renderPageSurface(displayedLeftEvent, 0, "left", displayedLeftPageNumber)}
            
            {/* Navigation - Previous */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <NavigationArrow 
                direction="left" 
                onClick={prevSpread} 
                disabled={isFlipping || !canGoPrev} 
              />
            </div>
          </div>

          {/* Right Page */}
          <div 
            className="w-1/2 bg-gradient-to-bl from-white via-stone-50 to-stone-100/50 relative overflow-hidden"
          >
            {renderPageSurface(displayedRightEvent, 1, "right", displayedRightPageNumber)}
            
            {/* Navigation - Next */}
            <div 
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <NavigationArrow 
                direction="right" 
                onClick={nextSpread} 
                disabled={isFlipping || !canGoNext} 
              />
            </div>
            
            {/* Corner curl effect on hover - only when can go next */}
            {canGoNext && (
              <div 
                className="absolute bottom-0 right-0 w-16 h-16 origin-bottom-right 
                  transition-transform duration-300 hover:scale-110 pointer-events-none cursor-pointer"
                onClick={nextSpread}
              >
                <div className="absolute bottom-0 right-0 w-0 h-0 
                  border-l-[30px] border-l-transparent 
                  border-b-[30px] border-b-stone-200
                  hover:border-l-[40px] hover:border-b-[40px]
                  transition-all duration-300 shadow-sm" />
              </div>
            )}
          </div>

          {/* Animated turning sheet for next spread */}
          {isFlipping && flipDirection === "next" && (
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2 w-1/2 z-50 animate-page-flip"
              style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              {/* Front face: current right page */}
              <div
                className="absolute inset-0 bg-gradient-to-bl from-white via-stone-50 to-stone-100/50 overflow-hidden"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                {renderPageSurface(rightEvent, 100, "right", currentSpread * 2 + 2, true)}
              </div>

              {/* Back face: target left page */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-white via-stone-50 to-stone-100/50 border-r border-stone-200/50 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {renderPageSurface(targetLeftEvent, 101, "left", targetSpread * 2 + 1, true)}
              </div>
            </div>
          )}

          {/* Animated turning sheet for previous spread */}
          {isFlipping && flipDirection === "prev" && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 z-50 animate-page-flip-reverse"
              style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              {/* Front face: current left page */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-white via-stone-50 to-stone-100/50 border-r border-stone-200/50 overflow-hidden"
                style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                {renderPageSurface(leftEvent, 102, "left", currentSpread * 2 + 1, true)}
              </div>

              {/* Back face: target right page */}
              <div
                className="absolute inset-0 bg-gradient-to-bl from-white via-stone-50 to-stone-100/50 overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {renderPageSurface(targetRightEvent, 103, "right", targetSpread * 2 + 2, true)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Indicator */}
      {totalSpreads > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {spreads.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSpread(index)}
              disabled={isFlipping}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 
                ${index === currentSpread 
                  ? 'bg-primary scale-125' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}
                disabled:cursor-not-allowed`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
          <span className="ml-3 text-sm text-muted-foreground">
            {currentSpread + 1} / {totalSpreads}
          </span>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center mt-6 text-muted-foreground text-sm space-y-1">
        <p>Click on any event card to flip and see details</p>
        <p>{browseInstruction}</p>
      </div>
    </div>
  );

  return isMobile ? renderMobileView() : renderDesktopView();
}
