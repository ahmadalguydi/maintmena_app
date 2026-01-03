import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, FileText, TrendingUp, Bell, GraduationCap, Clock } from "lucide-react";

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  content_type: string;
  content_id: string;
  created_at: string;
  metadata: any;
  user_email?: string;
}

export function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    setupRealtimeSubscription();
  }, []);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("user_activity")
      .select(`
        *,
        profiles!user_activity_user_id_fkey(email)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const enrichedData = data.map(item => ({
        ...item,
        user_email: (item.profiles as any)?.email || 'Unknown user'
      }));
      setActivities(enrichedData);
    }
    setLoading(false);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("activity-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_activity" },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (contentType: string) => {
    switch (contentType) {
      case "brief":
        return <FileText className="w-4 h-4" />;
      case "signal":
        return <TrendingUp className="w-4 h-4" />;
      case "tender":
        return <Bell className="w-4 h-4" />;
      case "educational_content":
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case "viewed":
        return "bg-blue-500/10 text-blue-500";
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "tracked":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-muted text-muted";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-black">Recent Activity</h3>
        <Badge variant="secondary">{activities.length}</Badge>
      </div>

      <ScrollArea className="h-[200px] pr-2">
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors"
            >
              <div className={`p-1.5 rounded-lg ${getActivityColor(activity.activity_type)}`}>
                {getActivityIcon(activity.content_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-black truncate">
                  {activity.user_email}
                </p>
                <p className="text-xs text-black/70">
                  {activity.activity_type} {activity.content_type.replace('_', ' ')}
                </p>
                <p className="text-xs text-black/60">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
