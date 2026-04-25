import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Calendar, Edit2, Plus, AlertCircle, Trash2, ChevronLeft, ChevronRight, ShieldCheck, DollarSign, MessageCircle, CheckCircle2, Copy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { TimelineTracker, TimelineStep } from '@/components/mobile/TimelineTracker';
import { PriceApprovalSheet } from '@/components/mobile/PriceApprovalSheet';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { LazyServiceLocationMap } from '@/components/maps/LazyServiceLocationMap';
import { RequestPriceCard } from '@/components/buyer/RequestPriceCard';
import { findExistingSellerReview, submitSellerReview } from '@/lib/reviewFlow';
import {
    getBuyerReviewPromptStorageKey,
    shouldPromptBuyerForReview,
} from '@/lib/buyerCompletionFlow';
import {
    getAvailableBuyerActions,
    getBuyerRequestPresentationStatus,
    getRequestTimeline,
    getRequestCoordinates,
    getRequestLocationLabel,
    toCanonicalRequest,
    type CanonicalRequest,
    type CanonicalRequestRow,
} from '@/lib/maintenanceRequest';

interface ProviderProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    company_name: string | null;
    phone: string | null;
}
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import { JobCompletionCelebration } from '@/components/mobile/JobCompletionCelebration';
import { RescheduleApprovalBanner } from '@/components/mobile/RescheduleApprovalBanner';
import { useRescheduleRequest } from '@/hooks/useRescheduleRequest';
import { CancelRequestModal, type CancelReason } from '@/components/mobile/CancelRequestModal';
import { useDispatchActions } from '@/hooks/useDispatchActions';
import { EditRequestSheet } from '@/components/mobile/EditRequestSheet';

interface RequestDetailProps {
    currentLanguage: 'en' | 'ar';
}

const SERVICE_CATEGORIES = [
    { key: "plumbing", icon: "🚰", en: "Plumbing", ar: "سباكة" },
    { key: "electrical", icon: "⚡", en: "Electrical", ar: "كهرباء" },
    { key: "painting", icon: "🎨", en: "Painting", ar: "دهان" },
    { key: "ac_repair", icon: "❄️", en: "AC Repair", ar: "إصلاح التكييف" },
    { key: "cleaning", icon: "🧹", en: "Cleaning", ar: "تنظيف" },
    { key: "handyman", icon: "🔧", en: "Handyman", ar: "عامل متعدد المهارات" },
];

const getTimelineSteps = (request: CanonicalRequest | null, t: Record<string, { title: string; sub: string } | string>): TimelineStep[] =>
    getRequestTimeline(request).map((step) => {
        const labelMap = {
            seller_assigned: t.accepted.title,
            in_route: t.on_the_way.title,
            in_progress:
                request?.lifecycle === 'in_route' && request?.progressSignal === 'arrived'
                    ? t.arrived.title
                    : t.in_progress.title,
            seller_marked_complete: t.awaiting_approval.title,
            closed: t.completed.title,
        } as const;

        return {
            label: labelMap[step.key],
            status: step.status,
        };
    });

export const RequestDetail = ({ currentLanguage }: RequestDetailProps) => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isArabic = currentLanguage === 'ar';

    // Mock data for preview at /app/buyer/track/mock-1
    const mockRequest = {
        id: 'mock-1',
        title: 'Fix Water Leak',
        title_ar: 'إصلاح تسريب المياه',
        description: 'يوجد تسريب مياه في المطبخ تحت الحوض. Preferred Date: 2026-02-06 Time Window: Morning',
        description_ar: 'يوجد تسريب مياه في المطبخ تحت الحوض',
        category: 'plumbing',
        city: 'Riyadh',
        location: 'الرياض',
        status: 'open',
        preferred_start_date: '2026-02-06T09:00:00',
        photos: [
            'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=200',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200'
        ]
    };

    const isMock = id === 'mock-1';
    const [showPriceApproval, setShowPriceApproval] = useState(false);
    const [isApprovingPrice, setIsApprovingPrice] = useState(false);
    const [localPriceApproved, setLocalPriceApproved] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const celebrationFiredRef = useRef<Record<string, boolean>>({});
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [showReviewPrompt, setShowReviewPrompt] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showCancelSheet, setShowCancelSheet] = useState(false);
    const [isChangingProvider, setIsChangingProvider] = useState(false);
    const [showEditSheet, setShowEditSheet] = useState(false);
    const reviewSectionRef = useRef<HTMLDivElement | null>(null);
    const completionCodeRef = useRef<HTMLDivElement | null>(null);
    const { triggerDispatch } = useDispatchActions();

    const { reschedule: pendingReschedule } = useRescheduleRequest(id);

    const { data: request, isLoading } = useQuery({
        queryKey: ['request-tracking', id],
        queryFn: async () => {
            if (isMock) return mockRequest as CanonicalRequestRow & { provider?: ProviderProfile | null; photos?: string[] };

            if (!user?.id) return null;

            const { data, error } = await (supabase as any)
                .from('maintenance_requests')
                .select('*')
                .eq('id', id)
                .eq('buyer_id', user.id)
                .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error('Request not found');

            type RequestRow = CanonicalRequestRow & { provider?: ProviderProfile | null; photos?: string[] };
            const row = data as RequestRow;

            if (row?.assigned_seller_id) {
                const providerData = await executeSupabaseQuery<ProviderProfile | null>(
                    () => supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, company_name, phone')
                        .eq('id', row.assigned_seller_id)
                        .maybeSingle(),
                    {
                        context: 'request-detail-provider-profile',
                        fallbackData: null,
                        relationName: 'profiles',
                    },
                );
                if (providerData) {
                    row.provider = providerData;
                }
            }

            return row;
        },
        enabled: !!id,
        staleTime: 10_000,
        refetchInterval: 15_000,
    });

    const canonicalRequest = !isMock
        ? toCanonicalRequest(request ?? null, {
            hasExistingReview: Boolean(reviewSubmitted),
        })
        : null;
    const isJobCompleted = !isMock && (
        canonicalRequest?.lifecycle === 'buyer_confirmed' ||
        canonicalRequest?.lifecycle === 'closed'
    );

    const { data: reviewContext, isLoading: isReviewContextLoading } = useQuery({
        queryKey: ['request-review-context', id, user?.id, request?.assigned_seller_id],
        queryFn: async () => {
            if (!user?.id || !id || isMock || !request?.assigned_seller_id) return null;

            const existingReview = await findExistingSellerReview({
                client: supabase as any,
                buyerId: user.id,
                sellerId: request.assigned_seller_id,
                requestId: id,
            });

            return {
                sellerId: request.assigned_seller_id as string,
                existingReview,
            };
        },
        enabled: !!user?.id && !!id && !isMock && !!request?.assigned_seller_id && isJobCompleted,
    });

    const existingReview = reviewContext?.existingReview ?? null;

    const enrichedCanonicalRequest = !isMock
        ? toCanonicalRequest(request ?? null, {
            hasExistingReview: Boolean(existingReview || reviewSubmitted),
        })
        : null;
    const activeRequest = enrichedCanonicalRequest ?? canonicalRequest;
    const basePresentationStatus = getBuyerRequestPresentationStatus(activeRequest);
    const sellerMarkedComplete = !isMock && Boolean(
        activeRequest?.completionState === 'seller_marked_complete' ||
        (typeof request?.final_amount === 'number' && Number.isFinite(request?.final_amount) && (request?.final_amount ?? 0) > 0) ||
        request?.job_completion_code,
    );
    const buyerPriceApproved = localPriceApproved || (!isMock && enrichedCanonicalRequest?.pricingState === 'approved');
    const buyerMarkedComplete = !isMock && enrichedCanonicalRequest?.completionState === 'buyer_confirmed';
    const completionCode = !isMock ? (request?.job_completion_code ?? undefined) : undefined;
    const finalAmount = !isMock ? (request?.final_amount ?? undefined) : undefined;
    const sellerPricing = !isMock ? request?.seller_pricing : undefined;
    const estimatedPrice = undefined;
    const requiresFinalApproval = !isMock && !buyerMarkedComplete && !buyerPriceApproved && Boolean(sellerMarkedComplete || finalAmount || completionCode);
    const presentationStatus = requiresFinalApproval ? 'awaiting_approval' : basePresentationStatus;
    const timelineRequest = activeRequest && requiresFinalApproval
        ? { ...activeRequest, lifecycle: 'seller_marked_complete', completionState: 'seller_marked_complete' as const }
        : activeRequest;

    // Realtime subscription — invalidate query whenever this request changes in DB
    useEffect(() => {
        if (!id || isMock) return;

        const channel = supabase
            .channel(`request-detail-${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'maintenance_requests', filter: `id=eq.${id}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, isMock, queryClient]);

    // Track when job gets officially closed (e.g., via seller code entry) to show celebration to buyer
    useEffect(() => {
        if (!request || !id) return;
        const isOfficiallyClosed = request.status === 'closed' || request.status === 'completed';
        // Only show if it is closed, and we haven't already fired it in this session
        if (isOfficiallyClosed && !celebrationFiredRef.current[id]) {
            celebrationFiredRef.current[id] = true;
            setShowCelebration(true);
        }
    }, [request?.status, id]);

    // Auto-open price approval sheet when seller marks complete
    useEffect(() => {
        if (requiresFinalApproval && !showPriceApproval) {
            setShowPriceApproval(true);
        }
    }, [requiresFinalApproval, showPriceApproval]);

    const handleApprovePrice = async () => {
        setIsApprovingPrice(true);
        try {
            await (supabase as any)
                .from('maintenance_requests')
                .update({ buyer_price_approved: true })
                .eq('id', id!);
            // Only mark approved in local state after the DB write succeeds
            setLocalPriceApproved(true);
            setShowPriceApproval(false);
            queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
            window.setTimeout(() => {
                completionCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250);
        } catch (err) {
            if (import.meta.env.DEV) console.error('[RequestDetail] Failed to save price approval:', err);
            toast.error(isArabic ? 'حدث خطأ أثناء حفظ الموافقة' : 'Failed to save approval, please try again');
            // Keep the sheet open so the buyer can retry
            setIsApprovingPrice(false);
            setShowPriceApproval(true);
            return;
        }
        setIsApprovingPrice(false);
    };

    const handleSupportIssue = () => {
        setShowPriceApproval(false);
        navigate('/app/buyer/messages');
        toast.info(isArabic ? 'تواصل مع مقدم الخدمة أو فريق الدعم' : 'Contact the provider or support team');
    };

    const shouldPromptReview = shouldPromptBuyerForReview({
        buyerMarkedComplete,
        hasExistingReview: Boolean(existingReview || reviewSubmitted),
    });

    const markReviewPromptSeen = () => {
        if (!id) return;
        window.localStorage.setItem(getBuyerReviewPromptStorageKey(id), new Date().toISOString());
    };

    useEffect(() => {
        if (existingReview) {
            setRating(existingReview.rating);
            setReviewText(existingReview.review_text || '');
            setReviewSubmitted(false);
            return;
        }

        if (!reviewSubmitted) {
            setRating(0);
            setReviewText('');
        }
    }, [existingReview, reviewSubmitted]);

    useEffect(() => {
        if (searchParams.get('focusReview') !== '1') return;
        if (!isJobCompleted || !reviewSectionRef.current) return;

        const scrollTimer = window.setTimeout(() => {
            reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);

        return () => window.clearTimeout(scrollTimer);
    }, [isJobCompleted, searchParams, existingReview, isEditingReview]);

    useEffect(() => {
        if (searchParams.get('editReview') !== '1') return;
        if (!existingReview) return;
        setIsEditingReview(true);
    }, [searchParams, existingReview]);

    useEffect(() => {
        if (!id || !shouldPromptReview) return;

        const hasSeenPrompt = window.localStorage.getItem(getBuyerReviewPromptStorageKey(id));
        if (!hasSeenPrompt) {
            setShowReviewPrompt(true);
        }
    }, [id, shouldPromptReview]);

    const submitReviewMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id || !reviewContext?.sellerId || !id) {
                throw new Error('Missing review context');
            }

            return submitSellerReview({
                client: supabase as any,
                buyerId: user.id,
                sellerId: reviewContext.sellerId,
                rating,
                reviewText,
                requestId: id,
                reviewId: existingReview?.id || null,
            });
        },
        onSuccess: ({ mode }) => {
            markReviewPromptSeen();
            setReviewSubmitted(true);
            setIsEditingReview(false);
            setShowReviewPrompt(false);
            queryClient.invalidateQueries({ queryKey: ['request-review-context', id, user?.id, request?.assigned_seller_id] });
            queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
            queryClient.invalidateQueries({ queryKey: ['seller-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-history'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-history-all-v4'] });
            queryClient.invalidateQueries({ queryKey: ['seller-history-all-v2'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user?.id] });

            toast.success(
                isArabic
                    ? mode === 'updated'
                        ? 'تم تحديث تقييمك'
                        : 'تم إرسال تقييمك بنجاح'
                    : mode === 'updated'
                        ? 'Your review was updated'
                        : 'Your review was submitted',
            );
        },
        onError: () => {
            toast.error(isArabic ? 'فشل إرسال التقييم' : 'Failed to submit review');
        },
    });

    const handleReviewPromptLater = () => {
        markReviewPromptSeen();
        setShowReviewPrompt(false);
    };

    const content = {
        en: {
            backTitle: 'Request Details',
            searchingTitle: 'Searching for a provider...',
            searchingSubtitle: 'Finding the best professional for you',
            requestDetails: 'Request Details',
            edit: 'Edit',
            dateTime: 'Date & Time',
            location: 'Location',
            description: 'Description',
            photos: 'Photos',
            requestAnother: 'Request Another Service',
            requestAnotherSub: 'Need more help? Post a new request',
            thingsToKeep: 'Things to keep in mind',
            tipResponseTime: 'Response Time',
            tipResponseDesc: 'Most providers respond within 2-4 hours during working hours.',
            tipCancellation: 'Cancellation',
            tipCancellationDesc: 'You can cancel your request any time before a provider is assigned.',
            cancelRequest: 'Cancel Request',
            deleteConfirm: 'Are you sure you want to cancel this request?',
            requestCancelled: 'Request cancelled',
            asap: 'ASAP',
            morning: 'Morning',
            afternoon: 'Afternoon',
            evening: 'Evening',
            // Status labels required
            matching: { title: 'Finding provider...', sub: 'Locating best professional' },
            open: { title: 'Finding provider...', sub: 'Locating best professional' },
            accepted: { title: 'Provider accepted', sub: 'Vendor is assigned' },
            on_the_way: { title: 'Provider on the way', sub: 'Track location now' },
            en_route: { title: 'Provider on the way', sub: 'Track location now' },
            arrived: { title: 'Provider arrived', sub: 'Provider is at location' },
            in_progress: { title: 'Work in progress', sub: 'Job is underway' },
            awaiting_approval: { title: 'Final amount ready', sub: 'Review the amount to continue' },
            completed: { title: 'Work completed', sub: 'Job is done' },
            confirmed: { title: 'Confirmed', sub: 'Request confirmed' },
            eta: 'ETA:',
        },
        ar: {
            backTitle: 'تفاصيل الطلب',
            searchingTitle: 'ندور لك على فني...',
            searchingSubtitle: 'نطابق طلبك مع أفضل فني متاح',
            requestDetails: 'تفاصيل الطلب',
            edit: 'عدّل',
            dateTime: 'التاريخ والوقت',
            location: 'الموقع',
            description: 'الوصف',
            photos: 'الصور',
            requestAnother: 'طلب خدمة أخرى',
            requestAnotherSub: 'تحتاج خدمة ثانية؟ ارفع طلب جديد',
            thingsToKeep: 'انتبه لهذه النقاط',
            tipResponseTime: 'وقت الاستجابة',
            tipResponseDesc: 'غالباً يرد عليك الفني خلال ساعات العمل.',
            tipCancellation: 'الإلغاء',
            tipCancellationDesc: 'تقدر تلغي الطلب بأي وقت قبل ما يتعين الفني.',
            cancelRequest: 'إلغاء الطلب',
            deleteConfirm: 'هل أنت متأكد من إلغاء هذا الطلب؟',
            requestCancelled: 'تم إلغاء الطلب',
            asap: 'في أقرب وقت',
            morning: 'صباحاً',
            afternoon: 'ظهراً',
            evening: 'مساءً',
            // Status labels required
            matching: { title: 'ندور لك على فني...', sub: 'نبحث لك عن أفضل فني متاح' },
            open: { title: 'ندور لك على فني...', sub: 'نبحث لك عن أفضل فني متاح' },
            accepted: { title: 'تم تعيين الفني', sub: 'تقدر تتابع التفاصيل الحين' },
            on_the_way: { title: 'الفني بالطريق', sub: 'تقدر تتابع وصوله الحين' },
            en_route: { title: 'الفني بالطريق', sub: 'تقدر تتابع وصوله الحين' },
            arrived: { title: 'الفني وصل', sub: 'الفني صار عند الموقع' },
            in_progress: { title: 'العمل شغال', sub: 'الخدمة تحت التنفيذ الآن' },
            awaiting_approval: { title: 'السعر النهائي جاهز', sub: 'راجع المبلغ عشان نكمّل الإقفال' },
            completed: { title: 'اكتمل العمل', sub: 'تم إنجاز المهمة' },
            confirmed: { title: 'تم التأكيد', sub: 'تم تأكيد الطلب' },
            eta: 'الوقت المتوقع:',
        }
    };

    const t = content[currentLanguage];
    const activeBuyerActions = getAvailableBuyerActions(activeRequest);
    const isCancelled = activeRequest?.lifecycle === 'cancelled';
    const cancelledContent = isArabic
        ? {
            title: 'تم إلغاء الطلب',
            sub: 'أُغلق هذا الطلب ولن يتم تعيين فني له.',
            infoTitle: 'تم تأكيد الإلغاء',
            infoDesc: 'وقفنا المطابقة وشلنا الطلب من القائمة النشطة.',
            hint: 'إذا احتجت الخدمة مجددًا يمكنك إنشاء طلب جديد.',
            nextSteps: 'الخطوات التالية',
        }
        : {
            title: 'Request cancelled',
            sub: 'This request is closed and no provider will be assigned.',
            infoTitle: 'Cancellation complete',
            infoDesc: 'We stopped matching providers and removed this request from active work.',
            hint: 'Need help again? Create a new request anytime.',
            nextSteps: 'Next steps',
        };
    const statusCopy = isCancelled
        ? cancelledContent
        : (((t as Record<string, { title: string; sub: string }>)[presentationStatus] || (presentationStatus === 'on_the_way' ? t.en_route : t.accepted)) as { title: string; sub: string });

    const getCategoryInfo = (categoryKey: string) => {
        const key = categoryKey?.toLowerCase();
        return SERVICE_CATEGORIES.find(c => c.key === key) || { icon: '🔧', en: categoryKey, ar: categoryKey };
    };

    const getCleanDescription = (desc: string) => {
        if (!desc) return '';
        return desc
            .split(/(?:Preferred Date:|Time Window:)/i)[0]
            .replace(/\n\n\[Flexible Date\]/g, '')
            .replace(/\n\n\[Flexible Time\]/g, '')
            .replace(/\n\n\[تاريخ مرن\]/g, '')
            .replace(/\n\n\[وقت مرن\]/g, '')
            .replace(/\s?\[Flexible Date\]/g, '')
            .replace(/\s?\[Flexible Time\]/g, '')
            .replace(/\s?\[تاريخ مرن\]/g, '')
            .replace(/\s?\[وقت مرن\]/g, '')
            .trim();
    };

    const getDateTimeInfo = () => {
        let dateStr = t.asap;
        let timeStr = '';

        if (activeRequest?.scheduledFor) {
            const date = new Date(activeRequest.scheduledFor);
            dateStr = format(date, 'EEEE, d MMMM', { locale: isArabic ? ar : enUS });

            const hours = date.getHours();
            const minutes = date.getMinutes();
            if (hours !== 0 || minutes !== 0) {
                timeStr = date.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                });
            }
        } else if (request?.description) {
            const dateMatch = request.description.match(/Preferred Date: ([\w\s\(\)\-]+)/i);
            if (dateMatch && !dateMatch[1].toLowerCase().includes('asap')) {
                const parsed = new Date(dateMatch[1].trim());
                if (!isNaN(parsed.getTime())) {
                    dateStr = format(parsed, 'EEEE, d MMMM', { locale: isArabic ? ar : enUS });
                }
            }

            const timeMatch = request.description.match(/Time Window: (\w+)/i);
            if (timeMatch) {
                const slotTimeMap: Record<string, string> = { morning: '09:00', afternoon: '13:00', evening: '17:00' };
                const slotTime = slotTimeMap[timeMatch[1].toLowerCase()];
                if (slotTime) {
                    const [h, m] = slotTime.split(':').map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0, 0);
                    timeStr = d.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    });
                }
            }
        }

        return { dateStr, timeStr };
    };

    const getLocationDisplay = () => {
        if (request?.city) {
            const cityData = SAUDI_CITIES_BILINGUAL.find(c => c.en.toLowerCase() === request.city.toLowerCase());
            return isArabic ? (cityData?.ar || request.city) : request.city;
        }
        return getRequestLocationLabel(request, '-');
    };

    const handleConfirmedCancellation = async () => {
        if (!id || !user?.id) return;
        const previousAssignedSellerId = request?.assigned_seller_id;

        const cancellationPatch = {
            status: 'cancelled',
            assigned_seller_id: null,
            updated_at: new Date().toISOString(),
        };

        const { data: cancelledRequest, error } = await (supabase as any)
            .from('maintenance_requests')
            .update(cancellationPatch)
            .eq('id', id)
            .eq('buyer_id', user.id)
            .select('id, status, assigned_seller_id')
            .maybeSingle();

        if (error || !cancelledRequest || cancelledRequest.status !== 'cancelled') {
            toast.error(currentLanguage === 'ar' ? 'فشل إلغاء الطلب' : 'Failed to cancel request');
            if (import.meta.env.DEV) console.error('Cancel error:', error || new Error('No request row was updated during cancellation'));
            return;
        }

        queryClient.setQueryData(['request-tracking', id], (previous: unknown) =>
            previous && typeof previous === 'object'
                ? {
                    ...(previous as Record<string, unknown>),
                    ...cancellationPatch,
                    provider: null,
                }
                : previous,
        );
        queryClient.setQueryData(['buyer-dispatch-requests', user.id], (previous: { id: string }[] | undefined) =>
            Array.isArray(previous) ? previous.filter((req) => req.id !== id) : previous,
        );

        queryClient.invalidateQueries({ queryKey: ['buyer-requests'] });
        queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
        queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests', user.id] });
        queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user.id] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });

        if (previousAssignedSellerId) {
            queryClient.setQueryData(['seller-active-job', previousAssignedSellerId], null);
            queryClient.setQueryData(['seller-active-jobs', previousAssignedSellerId], (previous: { id: string }[] | undefined) =>
                Array.isArray(previous) ? previous.filter((job) => job.id !== id) : previous,
            );
            queryClient.setQueryData(['seller-scheduled-jobs', previousAssignedSellerId], (previous: { id: string }[] | undefined) =>
                Array.isArray(previous) ? previous.filter((job) => job.id !== id) : previous,
            );
            queryClient.setQueryData(['seller-opportunities', previousAssignedSellerId], (previous: unknown) => {
                if (!previous || typeof previous !== 'object') return previous;
                const prev = previous as { opportunities?: { id: string }[]; waitlisted?: { id: string }[] };

                const opportunities = Array.isArray(prev.opportunities)
                    ? prev.opportunities.filter((opportunity) => opportunity.id !== id)
                    : prev.opportunities;
                const waitlisted = Array.isArray(prev.waitlisted)
                    ? prev.waitlisted.filter((opportunity) => opportunity.id !== id)
                    : prev.waitlisted;

                return { ...prev, opportunities, waitlisted };
            });

            queryClient.invalidateQueries({ queryKey: ['seller-active-job', previousAssignedSellerId] });
            queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', previousAssignedSellerId] });
            queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs', previousAssignedSellerId] });
            queryClient.invalidateQueries({ queryKey: ['seller-opportunities', previousAssignedSellerId] });
        }

        toast.success(t.requestCancelled);
        setShowPriceApproval(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        // If provider is assigned, show the detailed cancel sheet with reasons
        if (request?.assigned_seller_id) {
            setShowCancelSheet(true);
        } else {
            // No provider yet — simple confirmation
            setShowCancelConfirm(true);
        }
    };

    const handleCancelWithReason = async (reason: CancelReason, wantsDifferentProvider?: boolean) => {
        if (wantsDifferentProvider && id && user?.id && request) {
            // Change provider flow: cancel current assignment, re-dispatch
            setIsChangingProvider(true);
            try {
                const previousSellerId = request.assigned_seller_id;

                // Unassign current seller and set to dispatching for re-dispatch
                const { error } = await (supabase as any)
                    .from('maintenance_requests')
                    .update({
                        assigned_seller_id: null,
                        status: 'dispatching',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id)
                    .eq('buyer_id', user.id);

                if (error) throw error;

                // Invalidate old seller's caches
                if (previousSellerId) {
                    queryClient.invalidateQueries({ queryKey: ['seller-active-job', previousSellerId] });
                    queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', previousSellerId] });
                }

                // Re-trigger dispatch to find a new provider
                await triggerDispatch(
                    id,
                    'request',
                    request.category || 'general',
                    request.latitude ?? null,
                    request.longitude ?? null,
                    3,
                );

                queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
                queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
                queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });

                toast.success(isArabic ? 'ندور لك على فني ثاني...' : 'Finding a new provider for you...');
            } catch {
                toast.error(isArabic ? 'فشل تغيير الفني' : 'Failed to change provider');
            } finally {
                setIsChangingProvider(false);
                setShowCancelSheet(false);
            }
        } else {
            // Standard cancellation
            setShowCancelSheet(false);
            void handleConfirmedCancellation();
        }
    };

    const handleEditSave = async (updates: {
        location: { lat: number; lng: number; address: string; city: string };
        timeMode: 'asap' | 'scheduled';
        scheduledDate: Date | null;
        scheduledTimeSlot: 'morning' | 'afternoon' | 'evening' | null;
        description: string;
        photos: string[];
    }) => {
        if (!id || !user?.id) return;
        try {
            const patch: Record<string, unknown> = {
                description: updates.description.trim(),
                city: updates.location.city,
                latitude: updates.location.lat,
                longitude: updates.location.lng,
                location: updates.location.address,
                updated_at: new Date().toISOString(),
            };
            if (isArabic) {
                patch.description_ar = updates.description.trim();
            }
            if (updates.timeMode === 'scheduled' && updates.scheduledDate) {
                const slotMap: Record<string, string> = { morning: '09:00', afternoon: '13:00', evening: '17:00' };
                const timeStr = updates.scheduledTimeSlot ? slotMap[updates.scheduledTimeSlot] : '09:00';
                const dateISO = updates.scheduledDate.toISOString().split('T')[0];
                patch.preferred_start_date = new Date(`${dateISO}T${timeStr}:00`).toISOString();
                patch.urgency = 'scheduled';
            } else {
                patch.urgency = 'asap';
                patch.preferred_start_date = null;
            }
            if (updates.photos?.length) {
                patch.photos = updates.photos;
            }
            const { error } = await (supabase as any)
                .from('maintenance_requests')
                .update(patch)
                .eq('id', id)
                .eq('buyer_id', user.id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
            queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
            toast.success(isArabic ? 'تم تحديث الطلب' : 'Request updated');
        } catch {
            toast.error(isArabic ? 'فشل تحديث الطلب' : 'Failed to update request');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
                <div className="p-4 space-y-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-3xl" />
                    <Skeleton className="h-48 w-full rounded-3xl" />
                </div>
            </div>
        );
    }

    if (!request) return (
        <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
        </div>
    );

    const category = getCategoryInfo(request.category);
    const { dateStr, timeStr } = getDateTimeInfo();
    const cleanDesc = getCleanDescription(isArabic && request.description_ar ? request.description_ar : request.description);
    const photos = request.photos;
    const BackIcon = isArabic ? ChevronRight : ChevronLeft;

    const coordinates = getRequestCoordinates(request);

    return (
        <div className="min-h-screen bg-background pb-32 relative" dir={isArabic ? 'rtl' : 'ltr'}>

            {/* Map Hero */}
            <div className="relative h-[280px] w-full overflow-hidden bg-muted">
                <LazyServiceLocationMap
                    currentLanguage={currentLanguage}
                    lat={coordinates?.lat}
                    lng={coordinates?.lng}
                    locationLabel={getLocationDisplay()}
                    heightClassName="h-[280px]"
                    className="rounded-none border-0 shadow-none"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            {/* Sticky Header */}
            <div className="fixed top-0 left-0 right-0 z-50 pt-safe-top">
                <div className="flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/30 shadow-sm">
                    <button
                        onClick={() => navigate('/app/buyer/home')}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-foreground transition-colors hover:bg-muted active:scale-95"
                    >
                        <BackIcon className="h-5 w-5" />
                    </button>
                    <h1 className={cn('text-[17px] font-bold text-foreground', isArabic ? 'font-ar-display' : 'font-display')}>
                        {t.backTitle}
                    </h1>
                </div>
            </div>

            <div className="relative z-10 -mt-16 space-y-4 px-4">

                {/* ── MAIN CARD ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)]"
                >
                    {/* Category header */}
                    <div className="flex items-start gap-4 p-5 pb-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-[26px]">
                            {category.icon}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <h2 className={cn('text-xl font-bold text-foreground leading-tight', isArabic ? 'font-ar-heading' : 'font-heading')}>
                                {isArabic ? category.ar : category.en}
                            </h2>
                            {request.title && (
                                <p className={cn('mt-0.5 text-[14px] font-medium text-foreground/70', isArabic ? 'font-ar-body' : 'font-body')}>
                                    {isArabic && request.title_ar ? request.title_ar : request.title}
                                </p>
                            )}
                            {cleanDesc && (
                                <p className={cn('mt-1 line-clamp-2 text-[13px] text-muted-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
                                    {cleanDesc}
                                </p>
                            )}
                        </div>
                        {!isCancelled && activeBuyerActions.canEdit && !buyerMarkedComplete ? (
                            <button
                                onClick={() => setShowEditSheet(true)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted active:scale-90"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 border-t border-border/40 px-5 py-3 text-[13px]">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                            <span className={cn('truncate font-medium text-foreground/70', isArabic ? 'font-ar-body' : '')}>{getLocationDisplay()}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className={cn('font-medium text-foreground/70', isArabic ? 'font-ar-body' : '')}>
                                {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                            </span>
                        </div>
                    </div>

                    {/* ── STATUS SECTION ── */}
                    {presentationStatus === 'matching' ? (
                        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className={cn('text-[14px] font-bold text-primary', isArabic ? 'font-ar-display' : 'font-display')}>
                                        {t.searchingTitle}
                                    </p>
                                    <p className={cn('mt-0.5 text-xs text-primary/60', isArabic ? 'font-ar-body' : 'font-body')}>
                                        {t.searchingSubtitle}
                                    </p>
                                </div>
                                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-30" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                                </div>
                            </div>
                        </div>
                    ) : isCancelled ? (
                        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                                <div>
                                    <p className={cn('text-[14px] font-bold text-rose-800', isArabic ? 'font-ar-heading' : 'font-heading')}>
                                        {cancelledContent.infoTitle}
                                    </p>
                                    <p className={cn('mt-1 text-[13px] text-rose-700/80', isArabic ? 'font-ar-body' : 'font-body')}>
                                        {cancelledContent.infoDesc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : request.provider ? (
                        /* ── PROVIDER CARD ── */
                        <div className="mx-4 mb-4 overflow-hidden rounded-2xl border border-border/50 bg-background/60">
                            {/* Status strip */}
                            <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                <span className={cn('text-[12px] font-semibold text-primary', isArabic ? 'font-ar-body' : 'font-body')}>
                                    {statusCopy.title}
                                </span>
                            </div>

                            {/* Avatar row */}
                            <button
                                onClick={() => request.provider?.id && navigate(`/app/buyer/vendor/${request.provider.id}`)}
                                disabled={!request.provider?.id}
                                className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 active:bg-muted/60"
                            >
                                <div className="relative shrink-0">
                                    <div className="h-[52px] w-[52px] overflow-hidden rounded-2xl border-2 border-white bg-muted shadow-sm">
                                        <img
                                            src={request.provider.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(request.provider.id)}`}
                                            alt={request.provider.full_name ?? ''}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                const t = e.target as HTMLImageElement;
                                                t.onerror = null;
                                                t.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(request.provider!.id)}`;
                                            }}
                                        />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                                </div>
                                <div className="min-w-0 flex-1 text-start">
                                    <p className={cn('truncate text-[15px] font-bold text-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
                                        {request.provider.company_name || request.provider.full_name || (isArabic ? 'مقدم الخدمة' : 'Service Provider')}
                                    </p>
                                    {request.provider.company_name && request.provider.full_name && (
                                        <p className={cn('mt-0.5 truncate text-[12px] text-muted-foreground', isArabic ? 'font-ar-body' : '')}>
                                            {request.provider.full_name}
                                        </p>
                                    )}
                                    <p className={cn('mt-0.5 text-[12px] font-medium text-muted-foreground', isArabic ? 'font-ar-body' : '')}>
                                        {isArabic ? 'اضغط لعرض الملف الشخصي' : 'Tap to view profile'}
                                    </p>
                                </div>
                                {request.provider.id ? <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground/40', isArabic && 'rotate-180')} /> : null}
                            </button>

                            {/* Call / Message row */}
                            <div className={cn('flex border-t border-border/30', isArabic && 'flex-row-reverse')}>
                                {request.provider.phone ? (
                                    <a
                                        href={`tel:${request.provider.phone}`}
                                        className="flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                        <span className={isArabic ? 'font-ar-body' : ''}>{isArabic ? 'اتصال' : 'Call'}</span>
                                    </a>
                                ) : null}
                                {request.provider.phone ? <div className="w-px bg-border/30" /> : null}
                                <button
                                    onClick={() => navigate(`/app/messages/thread?request=${id}`)}
                                    className="flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40"
                                >
                                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                    <span className={isArabic ? 'font-ar-body' : ''}>{isArabic ? 'رسالة' : 'Message'}</span>
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* ── PRICE + TIMELINE (when provider assigned) ── */}
                    {!isCancelled && presentationStatus !== 'matching' && (
                        <div className="space-y-3 px-4 pb-4">
                            <RequestPriceCard
                                currentLanguage={currentLanguage}
                                sellerPricing={sellerPricing}
                                finalAmount={finalAmount}
                            />

                            <TimelineTracker steps={getTimelineSteps(timelineRequest, t)} />

                            {/* Pending Reschedule Approval (from seller) */}
                            {pendingReschedule && !pendingReschedule.isOwnRequest && (
                                <RescheduleApprovalBanner
                                    currentLanguage={currentLanguage}
                                    requestId={id!}
                                    newDate={pendingReschedule.newDate}
                                    newTimeSlot={pendingReschedule.newTimeSlot ?? undefined}
                                    requesterName={pendingReschedule.requesterName}
                                    viewerRole="buyer"
                                />
                            )}

                            {/* Pending Reschedule (own request - waiting for approval) */}
                            {pendingReschedule && pendingReschedule.isOwnRequest && (
                                <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center gap-2.5">
                                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                                    <p className={cn("text-sm text-primary font-medium", isArabic ? 'font-ar-body' : '')}>
                                        {isArabic ? 'طلب إعادة الجدولة بانتظار موافقة الفني' : 'Reschedule request waiting for provider approval'}
                                    </p>
                                </div>
                            )}

                            {/* Completion code */}
                            <AnimatePresence>
                                {buyerPriceApproved && !buyerMarkedComplete && completionCode && (
                                    <motion.div
                                        ref={completionCodeRef}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                        className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-5 text-center space-y-3"
                                    >
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                                            <ShieldCheck size={22} className="text-primary" />
                                        </div>
                                        <p className={cn('text-sm font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>
                                            {isArabic ? 'أعطِ هذا الرمز للفني' : 'Show This Code to Provider'}
                                        </p>
                                        <div className="flex justify-center gap-1.5" dir="ltr">
                                            {completionCode.split('').map((digit, i) => (
                                                <div key={i} className="flex h-13 w-10 items-center justify-center rounded-xl border-2 border-primary/40 bg-primary/10 text-2xl font-extrabold text-primary shadow-sm">
                                                    {digit}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard?.writeText(completionCode).then(() => toast.success(isArabic ? 'تم نسخ الرمز' : 'Code copied')).catch(() => toast.error(isArabic ? 'تعذر النسخ' : 'Copy failed'))}
                                            className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
                                        >
                                            <Copy size={12} />
                                            <span className={isArabic ? 'font-ar-body' : ''}>{isArabic ? 'نسخ الرمز' : 'Copy code'}</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Job complete banner */}
                            <AnimatePresence>
                                {(buyerMarkedComplete || activeRequest?.lifecycle === 'closed') && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.94 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 p-5 text-center space-y-2"
                                    >
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30">
                                            <CheckCircle2 size={22} className="text-white" />
                                        </div>
                                        <p className={cn('text-base font-bold text-emerald-800', isArabic ? 'font-ar-heading' : 'font-heading')}>
                                            {isArabic ? 'تم إغلاق الطلب بنجاح!' : 'Job successfully completed!'}
                                        </p>
                                        <p className={cn('text-xs text-emerald-600/80', isArabic ? 'font-ar-body' : 'font-body')}>
                                            {isArabic ? 'شكراً لاستخدامك منصة Maintmena' : 'Thank you for using Maintmena'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* ── REVIEW SECTION ── */}
                <AnimatePresence>
                    {(buyerMarkedComplete || activeRequest?.lifecycle === 'closed') &&
                        request.assigned_seller_id && !isReviewContextLoading && (
                        <motion.div
                            ref={reviewSectionRef}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.15 }}
                            className="scroll-mt-24 overflow-hidden rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                        >
                            <div className="flex items-center gap-3 border-b border-amber-200/60 dark:border-amber-800/30 px-5 py-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                                    <Star size={18} className="fill-amber-400 text-amber-500" />
                                </div>
                                <p className={cn('text-[15px] font-bold text-amber-900 dark:text-amber-100', isArabic ? 'font-ar-heading' : 'font-heading')}>
                                    {existingReview && !isEditingReview
                                        ? (isArabic ? 'تم حفظ تقييمك' : 'Your review is saved')
                                        : (isArabic ? 'قيّم تجربتك' : 'Rate your experience')}
                                </p>
                            </div>

                            <div className="p-5">
                                {existingReview && !isEditingReview ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} size={18} className={cn(star <= existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingReview(true)}
                                                className={cn('rounded-full border border-amber-200 dark:border-amber-800/40 bg-background px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20', isArabic ? 'font-ar-body' : '')}
                                            >
                                                {isArabic ? 'تعديل' : 'Edit'}
                                            </button>
                                        </div>
                                        {existingReview.review_text && (
                                            <p className={cn('text-sm leading-6 text-foreground/80', isArabic ? 'font-ar-body' : 'font-body')}>
                                                {existingReview.review_text}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <ReviewComposer
                                        compact
                                        currentLanguage={currentLanguage}
                                        sellerName={request.provider?.company_name || request.provider?.full_name || (isArabic ? 'مقدم الخدمة' : 'Service Provider')}
                                        rating={rating}
                                        hoveredRating={hoveredRating}
                                        reviewText={reviewText}
                                        isSubmitting={submitReviewMutation.isPending}
                                        isEdit={Boolean(existingReview)}
                                        onRatingChange={setRating}
                                        onHoverRatingChange={setHoveredRating}
                                        onReviewTextChange={setReviewText}
                                        onSubmit={() => submitReviewMutation.mutate()}
                                        onCancel={existingReview ? () => setIsEditingReview(false) : undefined}
                                        submitLabel={isArabic ? (existingReview ? 'تحديث التقييم' : 'إرسال التقييم') : (existingReview ? 'Update Review' : 'Submit Review')}
                                        cancelLabel={existingReview ? (isArabic ? 'إلغاء' : 'Cancel') : undefined}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── DETAILS CARD ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
                    className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                    <p className={cn('border-b border-border/40 px-5 py-3.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60', isArabic ? 'font-ar-body' : 'font-body')}>
                        {t.requestDetails}
                    </p>
                    <div className="divide-y divide-border/40">
                        <div className="flex items-center gap-4 px-5 py-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60">
                                <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={cn('text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60', isArabic ? 'font-ar-body' : 'font-body')}>{t.location}</p>
                                <p className={cn('mt-0.5 text-[14px] font-semibold text-foreground', isArabic ? 'font-ar-body' : '')}>{getLocationDisplay()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 px-5 py-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60">
                                <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className={cn('text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60', isArabic ? 'font-ar-body' : 'font-body')}>{t.dateTime}</p>
                                <p className={cn('mt-0.5 text-[14px] font-semibold text-foreground', isArabic ? 'font-ar-body' : '')}>
                                    {dateStr}
                                    {timeStr && <span className="font-medium text-muted-foreground"> · {timeStr}</span>}
                                </p>
                            </div>
                        </div>
                        {cleanDesc ? (
                            <div className="flex items-start gap-4 px-5 py-4">
                                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60">
                                    <Edit2 className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={cn('text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60', isArabic ? 'font-ar-body' : 'font-body')}>{t.description}</p>
                                    <p className={cn('mt-0.5 text-[14px] text-foreground/80 leading-relaxed', isArabic ? 'font-ar-body' : '')}>{cleanDesc}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </motion.div>

                {/* Photos */}
                {photos && photos.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
                        className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    >
                        <p className={cn('border-b border-border/40 px-5 py-3.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60', isArabic ? 'font-ar-body' : 'font-body')}>
                            {t.photos}
                        </p>
                        <div className="flex gap-3 overflow-x-auto p-4 pb-5 snap-x scrollbar-hide">
                            {photos.map((photo, index) => (
                                <a key={index} href={photo} target="_blank" rel="noopener noreferrer" className="shrink-0 snap-center">
                                    <img src={photo} alt={`Photo ${index + 1}`} className="h-28 w-28 rounded-2xl border border-border/50 object-cover shadow-sm hover:opacity-90 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Request Another CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
                    onClick={() => navigate('/app/buyer/requests/new')}
                    className="flex cursor-pointer items-center gap-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 to-transparent p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:shadow-md active:scale-[0.98]"
                >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary shadow-md shadow-primary/30">
                        <Plus className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={cn('text-[15px] font-bold text-foreground', isArabic ? 'font-ar-heading' : 'font-heading')}>{t.requestAnother}</p>
                        <p className={cn('mt-0.5 text-[13px] text-muted-foreground', isArabic ? 'font-ar-body' : '')}>{t.requestAnotherSub}</p>
                    </div>
                    <ChevronRight className={cn('h-5 w-5 shrink-0 text-primary/60', isArabic && 'rotate-180')} />
                </motion.div>

                <div className="h-6" />
            </div>

            {/* Fixed: Reschedule button (only when provider is assigned, not in final stages) */}
            {!isCancelled && request?.assigned_seller_id && activeBuyerActions.canCancel && !requiresFinalApproval && !buyerMarkedComplete && !pendingReschedule && (
                <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-6 pointer-events-none">
                    <motion.button
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/app/buyer/request/${id}/reschedule`)}
                        className={cn(
                            'pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2.5 rounded-[28px] border border-border/40 bg-white/90 py-3.5 text-sm font-bold text-foreground shadow-md backdrop-blur-xl transition-all hover:bg-muted dark:bg-card/90',
                            isArabic ? 'font-ar-heading' : 'font-heading',
                        )}
                    >
                        <Calendar className="h-4 w-4" />
                        {isArabic ? 'طلب إعادة جدولة' : 'Request Reschedule'}
                    </motion.button>
                </div>
            )}

            {/* Fixed: Cancel button */}
            {!isCancelled && activeBuyerActions.canCancel && (
                <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
                    <motion.button
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCancel}
                        className={cn(
                            'pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2.5 rounded-[28px] border border-destructive/20 bg-white/90 py-4 font-bold text-destructive shadow-[0_8px_30px_rgb(239,68,68,0.12)] backdrop-blur-xl transition-all hover:bg-destructive hover:text-white dark:bg-card/90',
                            isArabic ? 'font-ar-heading' : 'font-heading',
                        )}
                    >
                        <Trash2 className="h-5 w-5" strokeWidth={2.5} />
                        {t.cancelRequest}
                    </motion.button>
                </div>
            )}

            {/* Fixed: Review final price button */}
            {!isCancelled && requiresFinalApproval && !showPriceApproval && (
                <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
                    <motion.button
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPriceApproval(true)}
                        className={cn(
                            'pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2.5 rounded-[28px] bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/30',
                            isArabic ? 'font-ar-heading' : 'font-heading',
                        )}
                    >
                        <DollarSign className="h-5 w-5" />
                        {isArabic ? 'مراجعة السعر النهائي' : 'Review Final Price'}
                    </motion.button>
                </div>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                <DialogContent className="sm:max-w-md" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className={cn(isArabic ? 'font-ar-heading text-right' : 'font-heading')}>
                            {isArabic ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
                        </DialogTitle>
                    </DialogHeader>
                    <p className={cn('text-sm text-muted-foreground', isArabic ? 'font-ar-body text-right' : '')}>
                        {t.deleteConfirm}
                    </p>
                    <div className={cn('flex gap-3 pt-2', isArabic && 'flex-row-reverse')}>
                        <button
                            onClick={() => setShowCancelConfirm(false)}
                            className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold text-foreground"
                        >
                            {isArabic ? 'تراجع' : 'Go Back'}
                        </button>
                        <button
                            onClick={() => {
                                setShowCancelConfirm(false);
                                void handleConfirmedCancellation();
                            }}
                            className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground"
                        >
                            {t.cancelRequest}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Reason Bottom Sheet (when provider is assigned) */}
            <CancelRequestModal
                currentLanguage={currentLanguage}
                isOpen={showCancelSheet}
                onClose={() => setShowCancelSheet(false)}
                onCancel={handleCancelWithReason}
                onReschedule={() => navigate(`/app/buyer/request/${id}/reschedule`)}
                hasProvider={Boolean(request?.assigned_seller_id)}
            />

            {/* Edit Request Bottom Sheet */}
            <EditRequestSheet
                isOpen={showEditSheet}
                currentLanguage={currentLanguage}
                onClose={() => setShowEditSheet(false)}
                onSave={handleEditSave}
                initialData={{
                    location: {
                        lat: request?.latitude ?? 24.7136,
                        lng: request?.longitude ?? 46.6753,
                        address: request?.location || '',
                        city: request?.city || '',
                    },
                    timeMode: request?.urgency === 'scheduled' ? 'scheduled' : 'asap',
                    scheduledDate: request?.preferred_start_date ? new Date(request.preferred_start_date) : null,
                    scheduledTimeSlot: (() => {
                        if (!request?.preferred_start_date) return null;
                        const h = new Date(request.preferred_start_date).getHours();
                        if (h <= 11) return 'morning';
                        if (h <= 15) return 'afternoon';
                        return 'evening';
                    })(),
                    description: (() => {
                        const desc = isArabic && request?.description_ar ? request.description_ar : request?.description || '';
                        return desc.split(/(?:Preferred Date:|Time Window:)/i)[0]
                            .replace(/\s?\[Flexible Date\]/g, '')
                            .replace(/\s?\[Flexible Time\]/g, '')
                            .replace(/\s?\[تاريخ مرن\]/g, '')
                            .replace(/\s?\[وقت مرن\]/g, '')
                            .trim();
                    })(),
                    photos: request?.photos || [],
                }}
            />

            <PriceApprovalSheet
                isOpen={showPriceApproval}
                onClose={() => setShowPriceApproval(false)}
                onApprove={handleApprovePrice}
                onReject={handleSupportIssue}
                price={finalAmount || 0}
                currentLanguage={currentLanguage}
                isSubmitting={isApprovingPrice}
                sellerPricing={sellerPricing}
            />

            <Dialog
                open={showReviewPrompt}
                onOpenChange={(open) => { if (!open) handleReviewPromptLater(); }}
            >
                <DialogContent className="sm:max-w-md" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogHeader className="space-y-3">
                        <div className="inline-flex w-max items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {isArabic ? 'اكتمل الطلب' : 'Job completed'}
                        </div>
                        <DialogTitle className={cn(isArabic ? 'font-ar-heading text-right' : 'font-heading')}>
                            {isArabic ? 'اترك تقييماً سريعاً' : 'Leave a quick review'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                            <p className={cn('text-sm font-semibold text-foreground', isArabic ? 'font-ar-body' : '')}>
                                {request?.provider?.company_name || request?.provider?.full_name || (isArabic ? 'مقدم الخدمة' : 'Service Provider')}
                            </p>
                        </div>
                        <ReviewComposer
                            compact
                            currentLanguage={currentLanguage}
                            sellerName={request?.provider?.company_name || request?.provider?.full_name || (isArabic ? 'مقدم الخدمة' : 'Service Provider')}
                            rating={rating}
                            hoveredRating={hoveredRating}
                            reviewText={reviewText}
                            isSubmitting={submitReviewMutation.isPending}
                            isEdit={Boolean(existingReview)}
                            onRatingChange={setRating}
                            onHoverRatingChange={setHoveredRating}
                            onReviewTextChange={setReviewText}
                            onSubmit={() => submitReviewMutation.mutate()}
                            onCancel={handleReviewPromptLater}
                            submitLabel={isArabic ? 'إرسال التقييم' : 'Submit Review'}
                            cancelLabel={isArabic ? 'لاحقاً' : 'Later'}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Job Completion Celebration overlay */}
            <AnimatePresence>
                {showCelebration && (
                    <JobCompletionCelebration
                        data={{
                            variant: 'buyer',
                            providerName: request?.provider?.company_name || request?.provider?.full_name || (isArabic ? 'مقدم الخدمة' : 'Service Provider'),
                            providerAvatar: request?.provider?.avatar_url || undefined,
                            providerId: request?.provider?.id || reviewContext?.sellerId || undefined,
                            amount: typeof request?.final_amount === 'number' ? request.final_amount : undefined,
                            title: (request as any)?.title || (request as any)?.description || undefined,
                            category: (request as any)?.category || undefined,
                            subIssue: (request as any)?.subcategory || (request as any)?.sub_category || undefined,
                            date: request?.scheduled_for ? new Date(request.scheduled_for).toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }) : undefined,
                            requestId: id || '',
                            location: (request as any)?.location || undefined,
                            lat: (request as any)?.latitude || (request as any)?.lat || undefined,
                            lng: (request as any)?.longitude || (request as any)?.lng || undefined,
                        }}
                        currentLanguage={currentLanguage}
                        onDismiss={() => setShowCelebration(false)}
                        onReview={() => {
                            // Scroll to review section
                            setTimeout(() => {
                                reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 300);
                        }}
                        onSubmitReview={async (ratingValue, textValue) => {
                            if (!user?.id || !reviewContext?.sellerId || !id) {
                                toast.error(isArabic ? 'لا يمكن إرسال التقييم الآن' : 'Unable to submit review right now');
                                throw new Error('Missing review context');
                            }
                            try {
                                const result = await submitSellerReview({
                                    client: supabase as Parameters<typeof submitSellerReview>[0]['client'],
                                    buyerId: user.id,
                                    sellerId: reviewContext.sellerId,
                                    rating: ratingValue,
                                    reviewText: textValue,
                                    requestId: id,
                                    reviewId: existingReview?.id || null,
                                });
                                setRating(ratingValue);
                                setReviewText(textValue);
                                markReviewPromptSeen();
                                setReviewSubmitted(true);
                                setIsEditingReview(false);
                                setShowReviewPrompt(false);
                                queryClient.invalidateQueries({ queryKey: ['request-review-context', id, user.id, request?.assigned_seller_id] });
                                queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
                                queryClient.invalidateQueries({ queryKey: ['seller-reviews'] });
                                queryClient.invalidateQueries({ queryKey: ['buyer-history'] });
                                queryClient.invalidateQueries({ queryKey: ['buyer-history-all-v4'] });
                                queryClient.invalidateQueries({ queryKey: ['seller-history-all-v2'] });
                                queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user.id] });
                                toast.success(
                                    isArabic
                                        ? result.mode === 'updated' ? 'تم تحديث تقييمك' : 'تم إرسال تقييمك بنجاح'
                                        : result.mode === 'updated' ? 'Your review was updated' : 'Your review was submitted',
                                );
                            } catch (err) {
                                toast.error(isArabic ? 'فشل إرسال التقييم' : 'Failed to submit review');
                                throw err;
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
