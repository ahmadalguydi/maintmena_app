import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  event_type: 'manual' | 'tender' | 'signal' | 'reminder' | 'booking';
  related_content_id?: string;
  related_content_type?: 'tender' | 'signal' | 'booking_request';
  location?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  reminder_sent: boolean;
  color: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEvents();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data as CalendarEvent[]);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'reminder_sent'>) => {
    if (!user) return { error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        ...event,
        user_id: user.id
      })
      .select()
      .single();

    if (!error) {
      toast({
        title: 'Event Added',
        description: 'Calendar event created successfully',
      });
    }

    return { data, error };
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    if (!user) return { error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error) {
      toast({
        title: 'Event Updated',
        description: 'Calendar event updated successfully',
      });
    }

    return { data, error };
  };

  const deleteEvent = async (id: string) => {
    if (!user) return { error: 'User not authenticated' };

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      toast({
        title: 'Event Deleted',
        description: 'Calendar event deleted successfully',
      });
    }

    return { error };
  };

  const syncTenderDeadline = async (tenderId: string, tenderTitle: string, deadline: string, location?: string) => {
    if (!user) return;

    // Check if event already exists
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('related_content_id', tenderId)
      .eq('event_type', 'tender')
      .single();

    if (existing) {
      // Update existing event
      return updateEvent(existing.id, {
        event_date: deadline,
        title: `Tender: ${tenderTitle}`,
        location
      });
    } else {
      // Create new event
      return addEvent({
        title: `Tender Deadline: ${tenderTitle}`,
        description: `Submission deadline for tender`,
        event_date: deadline,
        event_type: 'tender',
        related_content_id: tenderId,
        related_content_type: 'tender',
        location,
        status: 'upcoming',
        color: '#ef4444'
      });
    }
  };

  const syncSignalDeadline = async (signalId: string, signalTitle: string, deadline: string, location?: string) => {
    if (!user) return;

    // Check if event already exists
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('related_content_id', signalId)
      .eq('event_type', 'signal')
      .single();

    if (existing) {
      return updateEvent(existing.id, {
        event_date: deadline,
        title: `Signal: ${signalTitle}`,
        location
      });
    } else {
      return addEvent({
        title: `Signal Deadline: ${signalTitle}`,
        description: `Deadline for maintenance signal`,
        event_date: deadline,
        event_type: 'signal',
        related_content_id: signalId,
        related_content_type: 'signal',
        location,
        status: 'upcoming',
        color: '#f59e0b'
      });
    }
  };

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    syncTenderDeadline,
    syncSignalDeadline,
    refreshEvents: fetchEvents
  };
};