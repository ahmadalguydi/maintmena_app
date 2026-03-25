import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, TrendingUp, Users, Eye, Award } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalViews: number;
  activeSubscriptions: number;
  publishedBriefs: number;
  activeSignals: number;
  openTenders: number;
  publishedContent: number;
}

export function SystemStats() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalViews: 0,
    activeSubscriptions: 0,
    publishedBriefs: 0,
    activeSignals: 0,
    openTenders: 0,
    publishedContent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [
      usersRes,
      activeUsersRes,
      contentViewsRes,
      activeSubsRes,
      briefsRes,
      signalsRes,
      tendersRes,
      contentRes
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("user_activity").select("user_id", { count: "exact", head: true }),
      supabase.from("educational_content").select("views_count"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("briefs").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("signals").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tenders").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("educational_content").select("id", { count: "exact", head: true }).eq("status", "published")
    ]);

    const totalViews = contentViewsRes.data?.reduce((sum, item) => sum + (item.views_count || 0), 0) || 0;

    setStats({
      totalUsers: usersRes.count || 0,
      activeUsers: activeUsersRes.count || 0,
      totalViews,
      activeSubscriptions: activeSubsRes.count || 0,
      publishedBriefs: briefsRes.count || 0,
      activeSignals: signalsRes.count || 0,
      openTenders: tendersRes.count || 0,
      publishedContent: contentRes.count || 0
    });
    setLoading(false);
  };

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { label: "Active Users", value: stats.activeUsers, icon: TrendingUp, color: "text-green-500" },
    { label: "Content Views", value: stats.totalViews, icon: Eye, color: "text-purple-500" },
    { label: "Active Subscriptions", value: stats.activeSubscriptions, icon: Award, color: "text-amber-500" },
  ];

  const contentStats = [
    { label: "Published Briefs", value: stats.publishedBriefs },
    { label: "Active Signals", value: stats.activeSignals },
    { label: "Open Tenders", value: stats.openTenders },
    { label: "Published Content", value: stats.publishedContent },
  ];

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
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-black">System Overview</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg border border-border bg-background/50">
              <div className="flex items-center justify-between mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <Badge variant="secondary" className="text-xs">{stat.value}</Badge>
              </div>
              <p className="text-xs text-black/80">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3">
          <h4 className="text-sm font-semibold mb-2 text-black">Content Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {contentStats.map((stat) => (
              <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xl font-bold text-black">{stat.value}</p>
                <p className="text-xs text-black/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
