import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ProfileCompleteness } from '@/components/seller/home/SellerSetupChecklist';
import { REFETCH_INTERVAL, GC_TIME } from '@/lib/queryConfig';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import { fetchSellerScheduledJobs } from '@/hooks/useScheduledJobs';
import {
  getRequestCoordinates,
  getRequestLocationLabel,
  toCanonicalRequest,
  CanonicalRequestRow,
} from '@/lib/maintenanceRequest';

const FOCUS_LOCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

interface OnlineStatusRow { is_online: boolean | null; went_online_at: string | null; }
interface ProfileDataRow {
  full_name?: string | null;
  phone?: string | null;
  service_categories?: string[] | null;
  location_city?: string | null;
  service_radius_km?: number | null;
}
interface BuyerProfileBasic { full_name?: string | null; phone?: string | null; }

export type SellerHomeState = 'A' | 'B' | 'B0' | 'C' | 'D';

interface SellerHomeStateDerivationInput {
  forcedState?: SellerHomeState | null;
  hasActiveJob: boolean;
  isOnline: boolean;
  scheduledJobsCount: number;
  lastOpportunityAt: Date | null;
  now?: number;
}

interface ActiveJob {
  id: string;
  type: 'request';
  status: string;
  lifecycle?: string;
  progress_signal?: 'arrived' | null;
  scheduled_start_at?: string;
  service_type?: string;
  description?: string;
  buyer_name?: string;
  buyer_phone?: string;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  seller_marked_complete?: boolean;
  buyer_marked_complete?: boolean;
  buyer_price_approved?: boolean;
  budget?: number;
}

interface ScheduledJob {
  id: string;
  type: 'request';
  service_type?: string;
  description?: string;
  scheduled_start_at: string;
  buyer_name?: string;
  buyer_phone?: string;
  location?: string;
  lat?: number;
  lng?: number;
  commitment_type: 'soft' | 'hard';
  budget?: number;
  buyer_id?: string;
}

interface SellerHomeStateResult {
  state: SellerHomeState;
  isOnline: boolean;
  setIsOnline: (online: boolean) => Promise<'ok' | 'profile_incomplete' | 'error'>;
  activeJob: ActiveJob | null;
  scheduledJobs: ScheduledJob[];
  timeOnline: number;
  lastOpportunityAt: Date | null;
  isLoading: boolean;
  profileCompleteness: ProfileCompleteness;
  /** Enter focus/mission mode for a scheduled job */
  enterFocusMode: (jobId: string) => void;
  /** Exit focus mode (returns to scheduled view) */
  exitFocusMode: () => void;
  /** Whether the seller is in voluntary focus mode for a scheduled job */
  isFocusMode: boolean;
  /** Whether focus mode is auto-locked (<=30 min before scheduled time, cannot exit) */
  isFocusLocked: boolean;
}

const QUIET_MARKET_THRESHOLD_MS = 3 * 60 * 1000;

function getForcedSellerHomeState(): SellerHomeState | null {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_forced_state');
  }
  return null;
}

export function deriveSellerHomeState({
  forcedState,
  hasActiveJob,
  isOnline,
  scheduledJobsCount,
  lastOpportunityAt,
  now = Date.now(),
}: SellerHomeStateDerivationInput): SellerHomeState {
  if (forcedState) return forcedState;
  if (hasActiveJob) return 'C';
  if (!isOnline) return 'A';
  if (scheduledJobsCount > 0) return 'D';
  if (lastOpportunityAt && now - lastOpportunityAt.getTime() > QUIET_MARKET_THRESHOLD_MS) return 'B0';
  return 'B';
}

export function useSellerHomeState(): SellerHomeStateResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastOpportunityAt] = useState<Date | null>(null);
  const [wentOnlineAt, setWentOnlineAt] = useState<Date | null>(null);
  const onlineMutationIdRef = useRef(0);

  const { data: onlineStatus, isLoading: onlineStatusLoading } = useQuery({
    queryKey: ['seller-online-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return { is_online: false, went_online_at: null };

      const data = await executeSupabaseQuery<OnlineStatusRow | null>(
        () =>
          supabase
            .from('profiles')
            .select('is_online, went_online_at')
            .eq('id', user.id)
            .single(),
        {
          context: 'seller-online-status',
          fallbackData: null,
          relationName: 'profiles',
        },
      );

      return {
        is_online: data?.is_online ?? false,
        went_online_at: data?.went_online_at
          ? new Date(data.went_online_at)
          : null,
      };
    },
    enabled: !!user?.id,
    staleTime: 10_000,
    gcTime: GC_TIME.STANDARD,
  });

  const isOnline = onlineStatus?.is_online ?? false;

  useEffect(() => {
    if (onlineStatus?.is_online && onlineStatus?.went_online_at) {
      setWentOnlineAt(onlineStatus.went_online_at);
      return;
    }

    setWentOnlineAt(null);
  }, [onlineStatus?.is_online, onlineStatus?.went_online_at]);

  const { data: profileData } = useQuery({
    queryKey: ['seller-profile-completeness', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await executeSupabaseQuery<ProfileDataRow | null>(
        () =>
          supabase
            .from('profiles')
            .select('full_name, phone, service_categories, location_city, service_radius_km')
            .eq('id', user.id)
            .single(),
        {
          context: 'seller-profile-completeness',
          fallbackData: null,
          relationName: 'profiles',
        },
      );
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: GC_TIME.STANDARD,
    refetchOnWindowFocus: true,
  });

  const profileCompleteness: ProfileCompleteness = useMemo(() => {
    const items = [
      {
        key: 'name',
        labelEn: 'Add your full name',
        labelAr: 'أضف اسمك الكامل',
        done: !!profileData?.full_name,
        route: '/app/seller/profile/edit',
      },
      {
        key: 'phone',
        labelEn: 'Add a phone number',
        labelAr: 'أضف رقم هاتف',
        done: !!profileData?.phone,
        route: '/app/seller/profile/edit',
      },
      {
        key: 'services',
        labelEn: 'Set your service categories',
        labelAr: 'حدد تخصصاتك',
        done: !!(
          profileData?.service_categories &&
          (profileData.service_categories as string[]).length > 0
        ),
        route: '/app/seller/profile/manage-services',
      },
      {
        key: 'location',
        labelEn: 'Set your service location',
        labelAr: 'حدد منطقة الخدمة',
        done: !!profileData?.location_city,
        route: '/app/seller/profile/service-areas',
      },
    ];
    return { items, isComplete: items.every((item) => item.done) };
  }, [
    profileData?.full_name,
    profileData?.phone,
    profileData?.service_categories,
    profileData?.location_city,
  ]);

  const setIsOnline = async (
    online: boolean,
  ): Promise<'ok' | 'profile_incomplete' | 'error'> => {
    if (!user?.id) return 'error';
    if (online && !profileCompleteness.isComplete) return 'profile_incomplete';

    const mutationId = ++onlineMutationIdRef.current;
    const now = new Date().toISOString();
    const previousOnlineStatus = queryClient.getQueryData<{
      is_online: boolean;
      went_online_at: Date | null;
    }>(['seller-online-status', user.id]);

    queryClient.setQueryData(['seller-online-status', user.id], {
      is_online: online,
      went_online_at: online ? new Date(now) : null,
    });
    setWentOnlineAt(online ? new Date(now) : null);

    const { error } = await supabase
      .from('profiles')
      .update({
        is_online: online,
        went_online_at: online ? now : null,
      } as any)
      .eq('id', user.id);

    if (mutationId !== onlineMutationIdRef.current) {
      return 'ok';
    }

    if (error) {
      queryClient.setQueryData(['seller-online-status', user.id], previousOnlineStatus);
      setWentOnlineAt(previousOnlineStatus?.went_online_at ?? null);
      return 'error';
    }

    queryClient.invalidateQueries({ queryKey: ['seller-online-status', user.id] });
    return 'ok';
  };

  const { data: activeJob, isLoading: activeJobLoading } = useQuery({
    queryKey: ['seller-active-job', user?.id],
    queryFn: async (): Promise<ActiveJob | null> => {
      if (!user?.id) return null;

      const data = await executeSupabaseQuery<CanonicalRequestRow[]>(
        () =>
          (supabase as any)
            .from('maintenance_requests')
            .select(
              'id, status, description, preferred_start_date, category, location, city, latitude, longitude, budget, buyer_id, seller_marked_complete, buyer_marked_complete, buyer_price_approved',
            )
            .eq('assigned_seller_id', user.id)
            .in('status', ['accepted', 'in_progress', 'en_route', 'arrived', 'seller_marked_complete'])
            .order('preferred_start_date', { ascending: true, nullsFirst: true }),
        {
          context: 'seller-active-job',
          fallbackData: [],
          relationName: 'maintenance_requests',
        },
      );

      if (data.length === 0) return null;

      let activeJobRaw = data.find((job) => {
        const canonical = toCanonicalRequest(job);
        return canonical?.lifecycle === 'seller_assigned'
          || canonical?.lifecycle === 'in_route'
          || canonical?.lifecycle === 'in_progress'
          || canonical?.lifecycle === 'seller_marked_complete';
      });

      if (!activeJobRaw) return null;

      const canonicalActiveJob = toCanonicalRequest(activeJobRaw);
      if (!canonicalActiveJob) return null;
      const activeJobCoordinates = getRequestCoordinates(activeJobRaw);

      let buyerProfile: BuyerProfileBasic | null = null;
      if (activeJobRaw.buyer_id) {
        buyerProfile = await executeSupabaseQuery<BuyerProfileBasic | null>(
          () =>
            supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('id', activeJobRaw.buyer_id)
              .maybeSingle(),
          {
            context: 'seller-active-job-buyer',
            fallbackData: null,
            relationName: 'profiles',
          },
        );
      }

      return {
        id: activeJobRaw.id,
        type: 'request',
        status: activeJobRaw.status,
        lifecycle: canonicalActiveJob.lifecycle,
        progress_signal: canonicalActiveJob.progressSignal,
        scheduled_start_at: canonicalActiveJob.scheduledFor ?? undefined,
        service_type: activeJobRaw.category,
        description: activeJobRaw.description,
        buyer_name: buyerProfile?.full_name,
        buyer_phone: buyerProfile?.phone,
        location: getRequestLocationLabel(activeJobRaw, 'Location pending'),
        location_lat: activeJobCoordinates?.lat,
        location_lng: activeJobCoordinates?.lng,
        seller_marked_complete: activeJobRaw.seller_marked_complete,
        buyer_marked_complete: activeJobRaw.buyer_marked_complete,
        buyer_price_approved: activeJobRaw.buyer_price_approved,
        budget: activeJobRaw.budget || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 5_000,
    gcTime: GC_TIME.SHORT,
    placeholderData: (previousData) => previousData ?? null,
    refetchInterval: REFETCH_INTERVAL.ACTIVE_JOB,
  });

  const { data: scheduledJobsRaw = [], isLoading: scheduledJobsLoading } = useQuery({
    queryKey: ['seller-scheduled-jobs', user?.id],
    queryFn: async (): Promise<ScheduledJob[]> => {
      if (!user?.id) return [];

      const jobs = await fetchSellerScheduledJobs(user.id);

      // Fetch buyer phones for all scheduled jobs
      const buyerIds = [...new Set(jobs.map((j) => j.buyer_id).filter(Boolean))];
      let buyerPhoneMap = new Map<string, string>();
      if (buyerIds.length > 0) {
        const buyerProfiles = await executeSupabaseQuery<{ id: string; phone: string | null }[]>(
          () =>
            supabase
              .from('profiles')
              .select('id, phone')
              .in('id', buyerIds) as any,
          { context: 'seller-scheduled-buyer-phones', fallbackData: [], relationName: 'profiles' },
        );
        buyerPhoneMap = new Map(buyerProfiles.map((p) => [p.id, p.phone || '']));
      }

      return jobs.map((job) => ({
        id: job.id,
        type: 'request',
        service_type: job.category,
        description: job.description,
        scheduled_start_at: job.scheduled_for || job.created_at,
        buyer_name: job.buyer_name,
        buyer_phone: buyerPhoneMap.get(job.buyer_id) || undefined,
        location: job.location,
        lat: job.lat,
        lng: job.lng,
        commitment_type: 'hard' as const,
        buyer_id: job.buyer_id,
      }));
    },
    enabled: !!user?.id,
    staleTime: 5_000,
    gcTime: GC_TIME.SHORT,
    placeholderData: (previousData) => previousData ?? [],
    refetchInterval: REFETCH_INTERVAL.ACTIVE_JOB,
  });

  // ── Focus Mode (voluntary mission mode for scheduled jobs) ───────────
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);

  const focusedScheduledJob = useMemo(
    () => (focusedJobId ? scheduledJobsRaw.find((j) => j.id === focusedJobId) ?? null : null),
    [focusedJobId, scheduledJobsRaw],
  );

  // Auto-lock: check if any scheduled job is within 30 min
  const autoLockJobId = useMemo(() => {
    const now = Date.now();
    for (const job of scheduledJobsRaw) {
      const scheduledTime = new Date(job.scheduled_start_at).getTime();
      if (!isNaN(scheduledTime) && scheduledTime - now <= FOCUS_LOCK_THRESHOLD_MS && scheduledTime - now > -60 * 60 * 1000) {
        return job.id;
      }
    }
    return null;
  }, [scheduledJobsRaw]);

  // Auto-enter focus mode when a job is within 30min
  useEffect(() => {
    if (autoLockJobId && !activeJob) {
      setFocusedJobId(autoLockJobId);
    }
  }, [autoLockJobId, activeJob]);

  const isFocusMode = !activeJob && !!focusedScheduledJob;
  const isFocusLocked = isFocusMode && focusedJobId === autoLockJobId;

  // Convert focused scheduled job to ActiveJob format for MissionMode
  const focusedAsActiveJob: ActiveJob | null = useMemo(() => {
    if (!focusedScheduledJob) return null;
    return {
      id: focusedScheduledJob.id,
      type: 'request',
      status: 'accepted',
      lifecycle: 'seller_assigned',
      scheduled_start_at: focusedScheduledJob.scheduled_start_at,
      service_type: focusedScheduledJob.service_type,
      description: focusedScheduledJob.description,
      buyer_name: focusedScheduledJob.buyer_name,
      buyer_phone: focusedScheduledJob.buyer_phone,
      location: focusedScheduledJob.location,
      location_lat: focusedScheduledJob.lat,
      location_lng: focusedScheduledJob.lng,
      budget: focusedScheduledJob.budget || 0,
    };
  }, [focusedScheduledJob]);

  const effectiveActiveJob = activeJob || focusedAsActiveJob;

  const enterFocusMode = useCallback((jobId: string) => {
    setFocusedJobId(jobId);
  }, []);

  const exitFocusMode = useCallback(() => {
    // Cannot exit if auto-locked
    if (focusedJobId === autoLockJobId) return;
    setFocusedJobId(null);
  }, [focusedJobId, autoLockJobId]);

  // Clear focus mode when there's a real active job (seller started moving)
  useEffect(() => {
    if (activeJob && focusedJobId) {
      setFocusedJobId(null);
    }
  }, [activeJob, focusedJobId]);

  const timeOnline = wentOnlineAt
    ? Math.floor((new Date().getTime() - wentOnlineAt.getTime()) / (1000 * 60))
    : 0;

  // Filter out the focused job from the scheduled list to avoid duplication
  const displayScheduledJobs = isFocusMode
    ? scheduledJobsRaw.filter((j) => j.id !== focusedJobId)
    : scheduledJobsRaw;

  return {
    state: deriveSellerHomeState({
      forcedState: getForcedSellerHomeState(),
      hasActiveJob: !!effectiveActiveJob,
      isOnline,
      scheduledJobsCount: displayScheduledJobs.length,
      lastOpportunityAt,
    }),
    isOnline,
    setIsOnline,
    activeJob: effectiveActiveJob,
    scheduledJobs: displayScheduledJobs,
    timeOnline,
    lastOpportunityAt,
    isLoading: onlineStatusLoading || activeJobLoading || scheduledJobsLoading,
    profileCompleteness,
    enterFocusMode,
    exitFocusMode,
    isFocusMode,
    isFocusLocked,
  };
}
