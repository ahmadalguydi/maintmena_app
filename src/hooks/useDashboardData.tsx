import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface DashboardStats {
  signalsTracked: number;
  activeTenders: number;
  briefsRead: number;
  contentWatched: number;
}

interface Activity {
  id: string;
  title: string;
  company?: string;
  deadline?: string;
  value?: string;
  status: string;
  type: 'signal' | 'tender' | 'brief';
  created_at: string;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    signalsTracked: 0,
    activeTenders: 0,
    briefsRead: 0,
    contentWatched: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user activity stats
      const { data: activities } = await supabase
        .from('user_activity')
        .select('activity_type')
        .eq('user_id', user.id);

      const signalsTracked = activities?.filter(a => a.activity_type === 'signal_bookmark').length || 0;
      const briefsRead = activities?.filter(a => a.activity_type === 'brief_read').length || 0;
      const contentWatched = activities?.filter(a => a.activity_type === 'content_watch').length || 0;

      // Fetch active tenders count
      const { count: tendersCount } = await supabase
        .from('tenders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .gte('submission_deadline', new Date().toISOString());

      setStats({
        signalsTracked,
        activeTenders: tendersCount || 0,
        briefsRead,
        contentWatched
      });

      // Fetch recent signals and tenders
      const { data: signals } = await supabase
        .from('signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: tenders } = await supabase
        .from('tenders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(3);

      const combinedActivities: Activity[] = [
        ...(signals || []).map(s => ({
          id: s.id,
          title: s.description,
          company: s.company_name,
          deadline: s.deadline || undefined,
          value: s.estimated_value || undefined,
          status: s.status,
          type: 'signal' as const,
          created_at: s.created_at
        })),
        ...(tenders || []).map(t => ({
          id: t.id,
          title: t.title,
          company: t.location,
          deadline: t.submission_deadline,
          value: t.value_max ? `$${(t.value_max / 1000).toFixed(0)}K` : undefined,
          status: t.status,
          type: 'tender' as const,
          created_at: t.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setRecentActivities(combinedActivities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenders' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'briefs' },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const trackActivity = async (activityType: string, contentId: string, contentType: string) => {
    if (!user) return;

    await supabase.from('user_activity').insert({
      user_id: user.id,
      activity_type: activityType,
      content_id: contentId,
      content_type: contentType
    });

    fetchDashboardData(); // Refresh stats
  };

  return {
    stats,
    recentActivities,
    loading,
    trackActivity,
    refreshData: fetchDashboardData
  };
}
