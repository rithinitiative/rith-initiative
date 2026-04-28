import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Edit, Archive, Trash2, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';
import {
  EVENT_ORDER_ENTITY_ID,
  EVENT_ORDER_ENTITY_TYPE,
  EVENT_ORDER_MEDIA_TYPE,
  formatEventDateRange,
  parseEventOrder,
  serializeEventOrder,
  sortEventsByDisplayOrder,
  splitEventsByTimeline,
} from '@/lib/events';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  time: string | null;
  location: string | null;
  category: string | null;
  is_archived: boolean;
  created_at: string;
}

interface EventOrderSettings {
  id: string;
  description: string | null;
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventOrder, setEventOrder] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [movingEventId, setMovingEventId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents((data || []) as Event[]);

      const { data: orderSettings, error: orderError } = await supabase
        .from('media')
        .select('id, description')
        .eq('entity_type', EVENT_ORDER_ENTITY_TYPE)
        .eq('entity_id', EVENT_ORDER_ENTITY_ID)
        .eq('media_type', EVENT_ORDER_MEDIA_TYPE)
        .limit(1)
        .maybeSingle();

      if (orderError) {
        console.warn('Event order settings could not be loaded:', orderError);
        setEventOrder([]);
      } else {
        setEventOrder(parseEventOrder(orderSettings?.description));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_archived: archive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: archive ? 'Event archived' : 'Event restored',
        description: archive
          ? 'The event has been archived.'
          : 'The event has been restored.',
      });

      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: 'The event has been permanently deleted.',
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveEvent = async (orderedEvents: Event[], eventId: string, direction: 'up' | 'down') => {
    const currentIndex = orderedEvents.findIndex((event) => event.id === eventId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedEvents.length) return;

    const reordered = [...orderedEvents];
    const [movedEvent] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedEvent);

    const reorderedIds = reordered.map((event) => event.id);
    const reorderedIdSet = new Set(reorderedIds);
    const nextEventOrder = [
      ...reorderedIds,
      ...eventOrder.filter((id) => !reorderedIdSet.has(id)),
      ...events.map((event) => event.id).filter((id) => !reorderedIdSet.has(id) && !eventOrder.includes(id)),
    ];

    setEventOrder(nextEventOrder);
    setMovingEventId(eventId);

    try {
      const { data: existingSettings, error: settingsError } = await supabase
        .from('media')
        .select('id, description')
        .eq('entity_type', EVENT_ORDER_ENTITY_TYPE)
        .eq('entity_id', EVENT_ORDER_ENTITY_ID)
        .eq('media_type', EVENT_ORDER_MEDIA_TYPE)
        .limit(1)
        .maybeSingle();

      if (settingsError) throw settingsError;

      const orderPayload = {
        entity_type: EVENT_ORDER_ENTITY_TYPE,
        entity_id: EVENT_ORDER_ENTITY_ID,
        media_type: EVENT_ORDER_MEDIA_TYPE,
        url: 'event-order-settings',
        title: 'Event Display Order',
        description: serializeEventOrder(nextEventOrder),
        display_order: 0,
      };

      const { error } = existingSettings
        ? await supabase
            .from('media')
            .update(orderPayload)
            .eq('id', (existingSettings as EventOrderSettings).id)
        : await supabase
            .from('media')
            .insert([orderPayload]);

      if (error) throw error;

      toast({
        title: 'Event order updated',
        description: 'The website will show events in this order.',
      });
    } catch (error) {
      console.error('Error reordering events:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder events. Please try again.',
        variant: 'destructive',
      });
      fetchEvents();
    } finally {
      setMovingEventId(null);
    }
  };

  const activeEvents = events.filter((e) => !e.is_archived);
  const { upcoming, past } = splitEventsByTimeline(activeEvents, new Date());
  const upcomingEvents = sortEventsByDisplayOrder(upcoming, eventOrder);
  const pastEvents = sortEventsByDisplayOrder(past, eventOrder);
  const archivedEvents = sortEventsByDisplayOrder(events.filter((e) => e.is_archived), eventOrder);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const EventCard = ({
    event,
    orderedEvents,
    canReorder = true,
  }: {
    event: Event;
    orderedEvents: Event[];
    canReorder?: boolean;
  }) => {
    const eventIndex = orderedEvents.findIndex((item) => item.id === event.id);
    const isMoving = movingEventId === event.id;

    return (
    <div className="p-4 rounded-xl bg-card border border-border/50 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {event.category && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {event.category}
              </span>
            )}
            {event.is_archived && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                Archived
              </span>
            )}
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2 truncate">
            {event.title}
          </h3>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatEventDateRange(event)}
            </span>
            {event.time && (
              <span>{event.time}</span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {event.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canReorder && orderedEvents.length > 1 && (
            <div className="flex flex-col rounded-md border border-border/70 bg-background/80 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => handleMoveEvent(orderedEvents, event.id, 'up')}
                disabled={eventIndex <= 0 || isMoving}
                aria-label={`Move ${event.title} up`}
                title="Move up"
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-t border-border/70"
                onClick={() => handleMoveEvent(orderedEvents, event.id, 'down')}
                disabled={eventIndex === orderedEvents.length - 1 || isMoving}
                aria-label={`Move ${event.title} down`}
                title="Move down"
              >
                <ArrowDown size={14} />
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" asChild>
            <Link to={`/admin/events/${event.id}`}>
              <Edit size={16} />
            </Link>
          </Button>

          {event.is_archived ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(event.id, false)}
            >
              <RotateCcw size={16} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchive(event.id, true)}
            >
              <Archive size={16} />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to permanently delete "{event.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(event.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm">Manage upcoming and past events</p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/admin/events/new">
            <Plus size={18} />
            Add Event
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastEvents.length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} orderedEvents={upcomingEvents} />
            ))
          ) : (
            <EmptyState message="No upcoming events. Create one to get started!" />
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-6">
          {pastEvents.length > 0 ? (
            pastEvents.map((event) => (
              <EventCard key={event.id} event={event} orderedEvents={pastEvents} />
            ))
          ) : (
            <EmptyState message="No past events yet." />
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4 mt-6">
          {archivedEvents.length > 0 ? (
            archivedEvents.map((event) => (
              <EventCard key={event.id} event={event} orderedEvents={archivedEvents} canReorder={false} />
            ))
          ) : (
            <EmptyState message="No archived events." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
