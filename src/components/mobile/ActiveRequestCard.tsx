import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { RequestSummaryCard } from './RequestSummaryCard';
import { getRequestCoordinates } from '@/lib/maintenanceRequest';
import { RequestPriceCard } from '@/components/buyer/RequestPriceCard';
import { getRequestStatusUpdateDisplay } from '@/lib/requestPresentation';

export type RequestStatus =
  | 'matching'
  | 'no_seller_found'
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
  providerId?: string;
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
    no_seller_found: { title: 'ما لقينا فني', sub: 'ما في فنيين متاحين الحين. حاول مرة ثانية لاحقاً' },
    accepted: { title: 'تم تعيين الفني', sub: 'تقدر تتابع التفاصيل الحين' },
    on_the_way: { title: 'الفني بالطريق', sub: 'في طريقه لموقعك' },
    arrived: { title: 'الفني وصل', sub: 'صار عند الموقع' },
    in_progress: { title: 'العمل شغال', sub: 'الفني بدأ يشتغل على الطلب' },
    awaiting_approval: { title: 'السعر النهائي بانتظارك', sub: 'راجع السعر ووافق عليه عشان نقفل الطلب' },
    completed: { title: 'اكتمل العمل', sub: 'تقدر تراجع الطلب أو تضيف تقييمك' },
    confirmed: { title: 'تم التأكيد', sub: 'أُغلق الطلب بنجاح' },
    cancelled: { title: 'تم إلغاء الطلب', sub: 'هذا الطلب لم يعد نشطاً' },
    eta: 'الفني في طريقه إليك',
    viewDetails: 'عرض التفاصيل الكاملة',
    actionNeeded: 'راجع السعر النهائي ووافق عليه عشان يقفل الطلب',
  },
  en: {
    asap: 'Earliest',
    scheduled: 'Scheduled',
    matching: { title: 'Finding provider...', sub: 'Locating the best professional' },
    no_seller_found: { title: 'No provider found', sub: 'No providers are available right now. Try again later' },
    accepted: { title: 'Provider assigned', sub: 'Your provider details are ready' },
    on_the_way: { title: 'Provider on the way', sub: 'Heading to your location now' },
    arrived: { title: 'Provider arrived', sub: 'The provider is already at your location' },
    in_progress: { title: 'Work in progress', sub: 'Service is currently underway' },
    awaiting_approval: { title: 'Final amount waiting for you', sub: 'Review the final amount to close the request' },
    completed: { title: 'Work completed', sub: 'You can review the request or rate the experience' },
    confirmed: { title: 'Confirmed', sub: 'The request was closed successfully' },
    cancelled: { title: 'Request cancelled', sub: 'This request is no longer active' },
    eta: 'On the way to your location',
    viewDetails: 'View full details',
    actionNeeded: 'Review and approve the final amount to close this request',
  },
};

const statusColors: Record<RequestStatus, string> = {
  matching: 'bg-primary',
  no_seller_found: 'bg-rose-400',
  accepted: 'bg-green-500',
  on_the_way: 'bg-amber-500',
  arrived: 'bg-sky-500',
  in_progress: 'bg-violet-500',
  awaiting_approval: 'bg-orange-500',
  completed: 'bg-teal-500',
  confirmed: 'bg-slate-500',
  cancelled: 'bg-slate-400',
};

export const ActiveRequestCard = ({
  currentLanguage,
  request,
  onTrack,
}: ActiveRequestCardProps) => {
  const navigate = useNavigate();
  const t = content[currentLanguage];
  const safeStatus = (request.status in statusColors ? request.status : 'matching') as RequestStatus;
  const statusInfo = (t as Record<string, { title: string; sub: string }>)[safeStatus] ?? t.matching;
  const statusColor = statusColors[safeStatus] || 'bg-primary';
  const timeLabel = request.timeMode === 'asap' ? t.asap : request.scheduledTime || t.scheduled;
  const coordinates = getRequestCoordinates(request);
  const isProviderAssigned = safeStatus !== 'matching' && safeStatus !== 'no_seller_found';
  const isAwaitingApproval = request.sellerMarkedComplete === true && safeStatus !== 'completed' && safeStatus !== 'confirmed';
  const providerDisplayName = request.providerCompany || request.providerName;

  const statusUpdate = useMemo(
    () => getRequestStatusUpdateDisplay(request.status, currentLanguage, providerDisplayName),
    [currentLanguage, providerDisplayName, request.status],
  );
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);

  useEffect(() => {
    if (!statusUpdate || safeStatus === 'matching' || safeStatus === 'no_seller_found') {
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
      providerId={request.providerId}
      providerStatusMeta={request.providerName && request.providerCompany && request.providerCompany !== request.providerName ? request.providerName : undefined}
      providerPhone={request.providerPhone}
      providerRating={request.providerRating}
      providerVerified={request.providerVerified}
      isProviderAssigned={isProviderAssigned}
      onViewProvider={request.providerId ? () => navigate(`/app/buyer/vendor/${request.providerId}`) : undefined}
      onMessage={isProviderAssigned ? () => navigate(`/app/messages/thread?request=${request.id}`) : undefined}
      statusUpdate={
        showStatusUpdate && statusUpdate
          ? { ...statusUpdate, avatarUrl: request.providerAvatar }
          : null
      }
      expandable={!isAwaitingApproval}
      defaultExpanded={isAwaitingApproval}
      actionLabel={isAwaitingApproval ? undefined : t.viewDetails}
      onAction={isAwaitingApproval ? undefined : () => onTrack(request.id)}
      onClick={isAwaitingApproval ? undefined : () => onTrack(request.id)}
      urgentCta={isAwaitingApproval ? {
        label: currentLanguage === 'ar' ? 'راجع وأغلق الطلب' : 'Review & Close Job',
        sublabel: currentLanguage === 'ar' ? 'الفني أنهى العمل — وافق على السعر لإقفاله' : 'Provider finished — approve the amount to close',
        onClick: () => onTrack(request.id),
      } : undefined}
      className=""
    >
      {isProviderAssigned && !isAwaitingApproval ? (
        <div className="space-y-3 pt-2">
          <RequestPriceCard
            compact
            currentLanguage={currentLanguage}
            sellerPricing={request.sellerPricing}
            finalAmount={request.finalAmount}
          />

          {safeStatus === 'on_the_way' ? (
            <div className="w-max rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80">
                  <Clock className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold">{t.eta}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : isAwaitingApproval ? (
        <div className="pt-2">
          <RequestPriceCard
            compact
            currentLanguage={currentLanguage}
            sellerPricing={request.sellerPricing}
            finalAmount={request.finalAmount}
          />
        </div>
      ) : null}
    </RequestSummaryCard>
  );
};
