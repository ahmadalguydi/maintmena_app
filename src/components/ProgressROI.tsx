import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, Target, Bookmark, FileText, Clock, Flame, ChevronRight, Trophy, Star, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import OpportunityMap from '@/components/OpportunityMap';
import { useCurrency } from '@/hooks/useCurrency';


interface ProgressROIProps {
  currentLanguage: 'en' | 'ar';
  stats?: any;
}

interface OpportunityMetrics {
  trackedSignals: number;
  trackedTenders: number;
  briefsRead: number;
  totalValue: number;
  daysActive: number;
  weekStreak: number;
  upcomingDeadlines: number;
  hotOpportunities: number;
  actionableToday: number;
}

export const ProgressROI = ({ currentLanguage }: ProgressROIProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [metrics, setMetrics] = useState<OpportunityMetrics>({
    trackedSignals: 0,
    trackedTenders: 0,
    briefsRead: 0,
    totalValue: 0,
    daysActive: 0,
    weekStreak: 0,
    upcomingDeadlines: 0,
    hotOpportunities: 0,
    actionableToday: 0
  });
  const [loading, setLoading] = useState(true);
  type Opp = { id: string; title: string; location: string; type: 'signal' | 'tender'; isRemote?: boolean; urgency?: string; latitude?: number; longitude?: number };
  const [mapOpps, setMapOpps] = useState<Opp[]>([]);

  useEffect(() => {
    if (user) {
      fetchOpportunityMetrics();
    }
  }, [user]);

  // Lightweight geocoder for common MENA cities + sensible defaults
  const getCoordinatesForLocation = (location: string) => {
    const lc = (location || '').toLowerCase();
    const map: Record<string, { lat: number; lng: number }> = {
      riyadh: { lat: 24.7136, lng: 46.6753 },
      jeddah: { lat: 21.4858, lng: 39.1925 },
      dubai: { lat: 25.2048, lng: 55.2708 },
      'abu dhabi': { lat: 24.4539, lng: 54.3773 },
      cairo: { lat: 30.0444, lng: 31.2357 },
      doha: { lat: 25.2854, lng: 51.531 },
      muscat: { lat: 23.588, lng: 58.3829 },
      amman: { lat: 31.9454, lng: 35.9284 },
      beirut: { lat: 33.8886, lng: 35.4955 },
      casablanca: { lat: 33.5731, lng: -7.5898 },
      marrakech: { lat: 31.6295, lng: -7.9811 },
      tunis: { lat: 36.8065, lng: 10.1815 },
      algiers: { lat: 36.7372, lng: 3.0865 },
      'ras al khaimah': { lat: 25.7897, lng: 55.9433 },
      'rabigh, ksa': { lat: 22.7981, lng: 39.0370 },
      rabigh: { lat: 22.7981, lng: 39.0370 },
      dammam: { lat: 26.4207, lng: 50.0888 },
      khobar: { lat: 26.2172, lng: 50.1971 },
      jubail: { lat: 27.0174, lng: 49.6594 },
      yanbu: { lat: 24.0892, lng: 38.0618 },
      remote: { lat: 25, lng: 35 },
      online: { lat: 25, lng: 35 },
    };
    if (map[lc]) return map[lc];
    const key = Object.keys(map).find((k) => lc.includes(k));
    return key ? map[key] : { lat: 25, lng: 35 };
  };

  const fetchOpportunityMetrics = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Fetch tracked items
      const { data: tracked } = await sb
        .from('tracked_items')
        .select('*')
        .eq('user_id', user.id);

      const trackedSignalIds = tracked?.filter(t => t.item_type === 'signal').map(t => t.item_id) || [];
      const trackedTenderIds = tracked?.filter(t => t.item_type === 'tender').map(t => t.item_id) || [];

      // Fetch tracked signals and tenders with full data
      const [signalsData, tendersData] = await Promise.all([
        trackedSignalIds.length > 0 
          ? supabase.from('signals').select('*').in('id', trackedSignalIds).eq('status', 'active')
          : Promise.resolve({ data: [] }),
        trackedTenderIds.length > 0
          ? supabase.from('tenders').select('*').in('id', trackedTenderIds).eq('status', 'open')
          : Promise.resolve({ data: [] })
      ]);

      const signals = signalsData.data || [];
      const tenders = tendersData.data || [];

      // Build opportunities for the map (signals and tenders only, no requests)
      const opps: Opp[] = [];
      
      (signals || []).forEach((s: any) => {
        const coords = getCoordinatesForLocation(s.location || '');
        opps.push({
          id: s.id,
          title: s.company_name,
          location: s.location || 'Unknown',
          type: 'signal',
          isRemote: (s.location || '').toLowerCase().includes('remote') || (s.location || '').toLowerCase().includes('online'),
          latitude: coords.lat,
          longitude: coords.lng,
        });
      });
      (tenders || []).forEach((t: any) => {
        const coords = getCoordinatesForLocation(t.location || '');
        opps.push({
          id: t.id,
          title: t.title,
          location: t.location || 'Unknown',
          type: 'tender',
          isRemote: (t.location || '').toLowerCase().includes('remote') || (t.location || '').toLowerCase().includes('online'),
          latitude: coords.lat,
          longitude: coords.lng,
        });
      });
      setMapOpps(opps);

      // Calculate total estimated value from tracked items
      let totalValue = 0;
      signals.forEach((s: any) => {
        if (s.estimated_value) {
          const match = s.estimated_value.match(/\$?([\d,.]+)([KMB])?/i);
          if (match) {
            const num = parseFloat(match[1].replace(/,/g, ''));
            const multiplier = match[2] ? 
              (match[2].toUpperCase() === 'K' ? 1000 : match[2].toUpperCase() === 'M' ? 1000000 : 1000000000) 
              : 1;
            totalValue += num * multiplier;
          }
        }
      });
      tenders.forEach((t: any) => {
        if (t.value_max) totalValue += t.value_max;
      });

      // Count upcoming deadlines (next 7 days)
      const upcomingDeadlines = [
        ...signals.filter((s: any) => s.deadline && new Date(s.deadline) <= sevenDaysFromNow && new Date(s.deadline) > now),
        ...tenders.filter((t: any) => new Date(t.submission_deadline) <= sevenDaysFromNow && new Date(t.submission_deadline) > now)
      ].length;

      // Count hot opportunities (critical urgency signals + high-value tenders)
      const hotOpportunities = [
        ...signals.filter((s: any) => s.urgency === 'critical'),
        ...tenders.filter((t: any) => t.value_max && t.value_max > 100000)
      ].length;

      // Fetch user activity for briefs read
      const { data: activities } = await sb
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_type', 'brief_read')
        .gte('created_at', startOfWeek.toISOString());

      const briefsRead = activities?.length || 0;

      // Calculate days active (since first activity)
      const { data: firstActivity } = await sb
        .from('user_activity')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const daysActive = firstActivity 
        ? differenceInDays(now, new Date(firstActivity.created_at))
        : 0;

      // Calculate week streak (consecutive weeks with activity)
      const { data: weeklyActivities } = await sb
        .from('user_activity')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      let weekStreak = 0;
      if (weeklyActivities && weeklyActivities.length > 0) {
        const weeks = new Map<string, boolean>();
        weeklyActivities.forEach((a: any) => {
          const date = new Date(a.created_at);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          weeks.set(weekKey, true);
        });

        // Count consecutive weeks from now backwards
        let currentWeek = new Date(startOfWeek);
        while (weeks.has(currentWeek.toISOString().split('T')[0])) {
          weekStreak++;
          currentWeek.setDate(currentWeek.getDate() - 7);
        }
      }

      // Count actionable items today (tracked items with deadline today or urgent)
      const actionableToday = [
        ...signals.filter((s: any) => 
          (s.deadline && differenceInDays(new Date(s.deadline), now) === 0) || 
          s.urgency === 'critical'
        ),
        ...tenders.filter((t: any) => 
          differenceInDays(new Date(t.submission_deadline), now) === 0
        )
      ].length;

      setMetrics({
        trackedSignals: signals.length,
        trackedTenders: tenders.length,
        briefsRead,
        totalValue,
        daysActive,
        weekStreak,
        upcomingDeadlines,
        hotOpportunities,
        actionableToday
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTracked = metrics.trackedSignals + metrics.trackedTenders;
  const engagementScore = Math.min(100, (totalTracked * 10) + (metrics.briefsRead * 5) + (metrics.weekStreak * 15));

  if (loading) {
    return (
      <Card className="border-rule">
        <CardContent className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rule overflow-hidden relative">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/10 pointer-events-none" />
      
      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground font-semibold text-base">
                {currentLanguage === 'ar' ? 'لوحة الفرص' : 'Opportunity Hub'}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {currentLanguage === 'ar' ? `${metrics.daysActive} يوم نشط` : `${metrics.daysActive} days active`}
              </p>
            </div>
          </div>
          
          {metrics.weekStreak > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Flame className="w-3 h-3 mr-1" />
              {metrics.weekStreak}w
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-4">
        {/* Urgent Action Alert */}
        <AnimatePresence>
          {metrics.actionableToday > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {currentLanguage === 'ar' ? 'يتطلب إجراء اليوم' : 'Action Required Today'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {metrics.actionableToday} {currentLanguage === 'ar' ? 'فرصة عاجلة' : 'urgent opportunities'}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => navigate('/weekly-brief')}>
                  {currentLanguage === 'ar' ? 'عرض' : 'View'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tracked Signals */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg bg-muted/40 border border-border/40 cursor-pointer hover:bg-muted/60 transition-colors"
            onClick={() => navigate('/weekly-brief')}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Signals</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.trackedSignals}</p>
            <p className="text-[9px] text-muted-foreground">
              {currentLanguage === 'ar' ? 'متتبع' : 'tracked'}
            </p>
          </motion.div>

          {/* Tracked Tenders */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="p-3 rounded-lg bg-muted/40 border border-border/40 cursor-pointer hover:bg-muted/60 transition-colors"
            onClick={() => navigate('/weekly-brief')}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tenders</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.trackedTenders}</p>
            <p className="text-[9px] text-muted-foreground">
              {currentLanguage === 'ar' ? 'متتبع' : 'tracked'}
            </p>
          </motion.div>

          {/* Hot Opportunities */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40"
          >
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Hot</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{metrics.hotOpportunities}</p>
            <p className="text-[9px] text-muted-foreground">
              {currentLanguage === 'ar' ? 'عالية القيمة' : 'high-value'}
            </p>
          </motion.div>

          {/* Upcoming Deadlines */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40"
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">7 Days</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{metrics.upcomingDeadlines}</p>
            <p className="text-[9px] text-muted-foreground">
              {currentLanguage === 'ar' ? 'مواعيد نهائية' : 'deadlines'}
            </p>
          </motion.div>
        </div>

        {/* Pipeline Value Highlight */}
        {metrics.totalValue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {currentLanguage === 'ar' ? 'القيمة المحتملة للخط' : 'Total Pipeline Value'}
                  </p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    {formatAmount(metrics.totalValue)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                {totalTracked} items
              </Badge>
            </div>
          </motion.div>
        )}

                {/* Opportunity Map inside Opportunity Hub */}
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <OpportunityMap 
                    opportunities={mapOpps}
                    currentLanguage={currentLanguage}
                  />
                </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/weekly-brief')}
            size="sm"
            className="flex-1 gap-2 group"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {currentLanguage === 'ar' ? 'الموجز' : "Weekly Brief"}
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          
          <Button 
            onClick={() => navigate('/calendar')}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Clock className="w-3.5 h-3.5" />
            {currentLanguage === 'ar' ? 'التقويم' : 'Calendar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};