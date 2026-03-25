import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { RequestSummaryCard } from './RequestSummaryCard';
import { TimelineTracker, TimelineStep } from './TimelineTracker';
import { getRequestCoordinates } from '@/lib/maintenanceRequest';
import { ProviderSnapshot } from '@/components/buyer/ProviderSnapshot';
import { RequestPriceCard } from '@/components/buyer/RequestPriceCard';
import { getRequestStatusUpdateDisplay } from '@/lib/requestPresentation';

export type RequestStatus =
  | 'matching'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'awaiting_approval'
  | 'completed'
  | 'confirmed'
  | 'cancelled';

export interface ActiveRequest {
  id: string;
  category: string;
  categoryIcon: string;
  situation?: string;
  description?: string;
  location: string;
  timeMode: 'asap' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
  status: RequestStatus;
  providerName?: string;
  providerCompany?: string;
  providerAvatar?: string;
  providerPhone?: string;
  providerRating?: number;
  providerVerified?: boolean;
  providerExperienceYears?: number;
  lat?: number;
  lng?: number;
  estimatedPrice?: string;
  sellerPricing?: unknown;
  finalAmount?: number | null;
  sellerMarkedComplete?: boolean;
}

interface ActiveRequestCardProps {
  currentLanguage: 'en' | 'ar';
  request: ActiveRequest;
  onTrack: (id: string) => void;
}

const content = {
  ar: {
    asap: 'أقرب وقت',
    scheduled: 'مجدول',
    matching: { title: 'ندور لك على فني...', sub: 'نطابق طلبك مع أفضل فني متاح' },
    accepted: { title: 'تم تعيين الفني', sub: 'تقدر تتابع التفاصيل الحين' },
    on_the_way: { title: 'الفني بالطريق', sub: 'في طريقه لموقعك' },
    arrived: { title: 'الفني وصل', sub: 'صار عند الموقع' },
    in_progress: { title: 'العمل شغال', sub: 'الفني بدأ يشتغل على الطلب' },
    awaiting_approval: { title: 'السعر النهائي بانتظارك', sub: 'راجع السعر ووافق عليه عشان نقفل الطلب' },
    completed: { title: 'اكتمل العمل', sub: 'تقدر تراجع الطلب أو تضيف تقييمك' },
    confirmed: { title: 'تم التأكيد', sub: 'أُغلق الطلب بنجاح' },
    eta: 'الوقت المتوقع للوصول',
    viewDetails: 'عرض التفاصيل الكاملة',
    actionNeeded: 'راجع السعر النهائي ووافق عليه عشان يقفل الطلب',
    etaWindow: '15-20 دقيقة',
  },
  en: {
    asap: 'Earliest',
    scheduled: 'Scheduled',
    matching: { title: 'Finding provider...', sub: 'Locating the best professional' },
    accepted: { title: 'Provider assigned', sub: 'Your provider details are ready' },
    on_the_way: { title: 'Provider on the way', sub: 'Heading to your location now' },
    arrived: { title: 'Provider arrived', sub: 'The provider is already at your location' },
    in_progress: { title: 'Work in progress', sub: 'Service is currently underway' },
    awaiting_approval: { title: 'Final amount waiting for you', sub: 'Review the final amount to close the request' },
    completed: { title: 'Work completed', sub: 'You can review the request or rate the experience' },
    confirmed: { title: 'Confirmed', sub: 'The request was closed successfully' },
    cancelled: { title: 'Request cancelled', sub: 'This request is no longer active' },
    eta: 'Expected arrival',
    viewDetails: 'View full details',
    actionNeeded: 'Review and approve the final amount to close this request',
    etaWindow: '15-20 min',
  },
};

const statusColors: Record<RequestStatus, string> = {
  matching: 'bg-primary',
  accepted: 'bg-green-500',
  on_the_way: 'bg-amber-500',
  arrived: 'bg-sky-500',
  in_progress: 'bg-violet-500',
  awaiting_approval: 'bg-orange-500',
  completed: 'bg-teal-500',
  confirmed: 'bg-slate-500',
  cancelled: 'bg-slate-400',
};

const getTimelineSteps = (status: RequestStatus, t: (typeof content)['en']): TimelineStep[] => {
  const steps: TimelineStep[] = [
    { label: t.accepted.title, status: 'future' },
    { label: t.on_the_way.title, status: 'future' },
    { label: t.in_progress.title, status: 'future' },
    { label: t.completed.title, status: 'future' },
  ];

  if (status === 'matching') return steps;

  steps[0].status = 'completed';

  switch (status) {
    case 'accepted':
      steps[1].status = 'current';
      break;
    case 'on_the_way':
      steps[1].status = 'current';
      break;
    case 'arrived':
    case 'in_progress':
      steps[1].status = 'completed';
      steps[2].status = 'current';
      break;
    case 'awaiting_approval':
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'current';
      break;
    case 'completed':
    case 'confirmed':
    case 'cancelled':
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'completed';
      break;
  }

  return steps;
};

export const ActiveRequestCard = ({
  currentLanguage,
  request,
  onTrack,
}: ActiveRequestCardProps) => {
  const t = content[currentLanguage];
  const safeStatus = (request.status in statusColors ? request.status : 'matching') as RequestStatus;
  const statusInfo = (t as Record<string, { title: string; sub: string }>)[safeStatus] ?? t.matching;
  const statusColor = statusColors[safeStatus] || 'bg-primary';
  const timeLabel = request.timeMode === 'asap' ? t.asap : request.scheduledTime || t.scheduled;
  const coordinates = getRequestCoordinates(request);
  const isProviderAssigned = safeStatus !== 'matching';
  const steps = getTimelineSteps(safeStatus, t as (typeof content)['en']);
  const providerDisplayName = request.providerCompany || request.providerName;

  const statusUpdate = useMemo(
    () => getRequestStatusUpdateDisplay(request.status, currentLanguage, providerDisplayName),
    [currentLanguage, providerDisplayName, request.status],
  );
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  useEffect(() => {
    if (!statusUpdate || safeStatus === 'matching') {
      setShowStatusUpdate(false);
      return;
    }

    const storageKey = `maintmena:buyer-status-update:${request.id}:${safeStatus}`;
    let hasSeen = false;

    try {
      hasSeen = window.sessionStorage.getItem(storageKey) === '1';
      if (!hasSeen) {
        window.sessionStorage.setItem(storageKey, '1');
      }
    } catch {
      hasSeen = false;
    }

    if (hasSeen) {
      setShowStatusUpdate(false);
      return;
    }

    setShowStatusUpdate(true);
    const timeout = window.setTimeout(() => setShowStatusUpdate(false), 4200);

    return () => window.clearTimeout(timeout);
  }, [request.id, safeStatus, statusUpdate]);

  return (
    <RequestSummaryCard
      currentLanguage={currentLanguage}
      category={request.category}
      categoryIcon={request.categoryIcon}
      subIssue={request.situation}
      description={request.description}
      location={request.location}
      time={timeLabel}
      lat={coordinates?.lat}
      lng={coordinates?.lng}
      statusTitle={statusInfo.title}
      statusSubtitle={statusInfo.sub}
      statusColor={statusColor}
      isPulse={safeStatus === 'matching' || safeStatus === 'on_the_way'}
      providerAvatar={request.providerAvatar}
      providerName={providerDisplayName}
      providerStatusMeta={request.providerName && request.providerCompany && request.providerCompany !== request.providerName ? request.providerName : undefined}
      isProviderAssigned={isProviderAssigned}
      statusUpdate={
        showStatusUpdate && statusUpdate
          ? { ...statusUpdate, avatarUrl: request.providerAvatar }
          : null
      }
      expandable
      actionLabel={t.viewDetails}
      onAction={() => onTrack(request.id)}
      onClick={() => onTrack(request.id)}
      className="border-l-0"
    >
      {isProviderAssigned ? (
        <div className="space-y-3 pt-2">
          <ProviderSnapshot
            compact
            currentLanguage={currentLanguage}
            providerName={request.providerName}
            providerCompany={request.providerCompany}
            providerAvatar={request.providerAvatar}
            providerPhone={request.providerPhone}
            providerRating={request.providerRating}
            providerVerified={request.providerVerified}
            yearsOfExperience={request.providerExperienceYears}
            statusLabel={statusInfo.title}
          />

          <RequestPriceCard
            compact
            currentLanguage={currentLanguage}
            sellerPricing={request.sellerPricing}
            finalAmount={request.finalAmount}
          />

          {(safeStatus === 'accepted' || safeStatus === 'on_the_way') ? (
            <div className="w-max rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">
                    {t.eta}
                  </p>
                  <p className="text-sm font-semibold">{t.etaWindow}</p>
                </div>
              </div>
            </div>
          ) : null}

          {request.sellerMarkedComplete && safeStatus !== 'completed' ? (
            <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">{t.actionNeeded}</span>
            </div>
          ) : null}

          <TimelineTracker steps={steps} />
        </div>
      ) : null}
    </RequestSummaryCard>
  );
};
