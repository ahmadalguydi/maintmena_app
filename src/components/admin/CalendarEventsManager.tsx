import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Calendar,
  Search,
  Trash2,
  User,
  Clock,
  MapPin
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_type: string;
  location?: string;
  status: string;
  color: string;
  created_at: string;
  profiles?: {
    email: string;
  };
}

export const CalendarEventsManager = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        profiles:user_id (email)
      `)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data as any);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this calendar event?')) return;

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({
        title: 'Success',
        description: 'Calendar event deleted successfully',
      });
      fetchEvents();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete calendar event',
        variant: 'destructive'
      });
    }
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.profiles as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEventTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      tender: 'destructive',
      signal: 'default',
      manual: 'secondary',
      reminder: 'outline'
    };
    return variants[type] || 'secondary';
  };

  const upcomingEvents = filteredEvents.filter(e => new Date(e.event_date) > new Date());
  const pastEvents = filteredEvents.filter(e => new Date(e.event_date) <= new Date());

  if (loading) {
    return <div className="text-center py-8 text-ink">Loading calendar events...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search & Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search events by title, description, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-ink"
          />
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total: <strong className="text-ink">{events.length}</strong></span>
          <span>Upcoming: <strong className="text-accent">{upcomingEvents.length}</strong></span>
        </div>
      </div>

      {/* Upcoming Events */}
      <Card className="border-rule">
        <CardHeader>
          <CardTitle className="text-ink flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Upcoming Events ({upcomingEvents.length})
          </CardTitle>
          <CardDescription>Calendar events scheduled for the future</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 border border-rule rounded-lg hover:bg-muted/20 transition-colors"
                  style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-ink">{event.title}</h3>
                      <Badge variant={getEventTypeBadge(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      <Badge variant="outline">{event.status}</Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {(event.profiles as any)?.email || 'Unknown user'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.event_date), 'PPP p')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(event.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <Card className="border-rule">
          <CardHeader>
            <CardTitle className="text-ink">Past Events ({pastEvents.length})</CardTitle>
            <CardDescription>Historical calendar events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastEvents.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border border-rule rounded-lg bg-muted/10"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{event.title}</span>
                      <Badge variant="outline" className="text-xs">{event.event_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.event_date), 'PPP')} • {(event.profiles as any)?.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {pastEvents.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  And {pastEvents.length - 10} more past events...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};