import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Calendar, Clock, Edit2, Plus, AlertCircle, Trash2, ChevronLeft, ChevronRight, ShieldCheck, DollarSign, MessageCircle, CheckCircle2, Copy, Star, UserCheck } from 'lucide-react';
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
import { ServiceLocationMap } from '@/components/maps/ServiceLocationMap';
import { ProviderSnapshot } from '@/components/buyer/ProviderSnapshot';
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
} from '@/lib/maintenanceRequest';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';

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

const getTimelineSteps = (request: CanonicalRequest | null, t: any): TimelineStep[] =>
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
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [showReviewPrompt, setShowReviewPrompt] = useState(false);
    const reviewSectionRef = useRef<HTMLDivElement | null>(null);

    const { data: request, isLoading } = useQuery({
        queryKey: ['request-tracking', id],
        queryFn: async () => {
            if (isMock) return mockRequest as any;

            const { data, error } = await (supabase as any)
                .from('maintenance_requests')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data?.assigned_seller_id) {
                const providerData = await executeSupabaseQuery<any | null>(
                    () => supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, company_name, phone')
                        .eq('id', data.assigned_seller_id)
                        .maybeSingle(),
                    {
                        context: 'request-detail-provider-profile',
                        fallbackData: null,
                        relationName: 'profiles',
                    },
                );
                if (providerData) {
                    (data as any).provider = providerData;
                }
            }

            return data as any;
        },
        enabled: !!id,
        refetchInterval: 5000, // Poll to catch status changes from seller
    });

    const canonicalRequest = !isMock
        ? toCanonicalRequest((request as any) ?? null, {
            hasExistingReview: Boolean(reviewSubmitted),
        })
        : null;
    const isJobCompleted = !isMock && (
        canonicalRequest?.lifecycle === 'buyer_confirmed' ||
        canonicalRequest?.lifecycle === 'closed'
    );

    const { data: reviewContext, isLoading: isReviewContextLoading } = useQuery({
        queryKey: ['request-review-context', id, user?.id, (request as any)?.assigned_seller_id],
        queryFn: async () => {
            if (!user?.id || !id || isMock || !(request as any)?.assigned_seller_id) return null;

            const existingReview = await findExistingSellerReview({
                client: supabase as any,
                buyerId: user.id,
                sellerId: (request as any).assigned_seller_id,
                requestId: id,
            });

            return {
                sellerId: (request as any).assigned_seller_id as string,
                existingReview,
            };
        },
        enabled: !!user?.id && !!id && !isMock && !!(request as any)?.assigned_seller_id && isJobCompleted,
    });

    const existingReview = reviewContext?.existingReview ?? null;

    const enrichedCanonicalRequest = !isMock
        ? toCanonicalRequest((request as any) ?? null, {
            hasExistingReview: Boolean(existingReview || reviewSubmitted),
        })
        : null;
    const activeRequest = enrichedCanonicalRequest ?? canonicalRequest;
    const basePresentationStatus = getBuyerRequestPresentationStatus(activeRequest);
    const sellerMarkedComplete = !isMock && Boolean(
        activeRequest?.completionState === 'seller_marked_complete' ||
        (typeof ((request as any)?.final_amount) === 'number' && Number.isFinite((request as any)?.final_amount) && (request as any)?.final_amount > 0) ||
        (request as any)?.job_completion_code,
    );
    const buyerPriceApproved = localPriceApproved || (!isMock && enrichedCanonicalRequest?.pricingState === 'approved');
    const buyerMarkedComplete = !isMock && enrichedCanonicalRequest?.completionState === 'buyer_confirmed';
    const completionCode = !isMock ? (request as any)?.job_completion_code as string | undefined : undefined;
    const finalAmount = !isMock ? ((request as any)?.final_amount as number | undefined) : undefined;
    const sellerPricing = !isMock ? (request as any)?.seller_pricing : undefined;
    const estimatedPrice = undefined;
    const requiresFinalApproval = !isMock && !buyerMarkedComplete && !buyerPriceApproved && Boolean(sellerMarkedComplete || finalAmount || completionCode);
    const presentationStatus = requiresFinalApproval ? 'awaiting_approval' : basePresentationStatus;
    const timelineRequest = activeRequest && requiresFinalApproval
        ? { ...activeRequest, lifecycle: 'seller_marked_complete', completionState: 'seller_marked_complete' as const }
        : activeRequest;

    // Auto-open price approval sheet when seller marks complete
    useEffect(() => {
        if (requiresFinalApproval && !showPriceApproval) {
            setShowPriceApproval(true);
        }
    }, [requiresFinalApproval, showPriceApproval]);

    const handleApprovePrice = async () => {
        setIsApprovingPrice(true);
        // Update UI immediately so the code is visible even if DB write is pending
        setLocalPriceApproved(true);
        setShowPriceApproval(false);
        // Best-effort DB write — won't block UI if column not yet migrated
        try {
            await (supabase as any)
                .from('maintenance_requests')
                .update({ buyer_price_approved: true })
                .eq('id', id!);
            queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });
        } catch (err) {
            console.error('[RequestDetail] Failed to save price approval:', err);
            toast.error(isArabic ? 'حدث خطأ أثناء حفظ الموافقة' : 'Failed to save approval, please try again');
            setLocalPriceApproved(false);
            setShowPriceApproval(true);
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
            queryClient.invalidateQueries({ queryKey: ['request-review-context', id, user?.id, (request as any)?.assigned_seller_id] });
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
        : (((t as Record<string, any>)[presentationStatus] || (presentationStatus === 'on_the_way' ? t.en_route : t.accepted)) as { title: string; sub: string });

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
            if (hours >= 5 && hours < 12) timeStr = t.morning;
            else if (hours >= 12 && hours < 17) timeStr = t.afternoon;
            else timeStr = t.evening;
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
                const window = timeMatch[1].toLowerCase();
                if (window === 'morning') timeStr = t.morning;
                else if (window === 'afternoon') timeStr = t.afternoon;
                else if (window === 'evening') timeStr = t.evening;
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
        const previousAssignedSellerId = (request as any)?.assigned_seller_id as string | null | undefined;

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
            toast.error(currentLanguage === 'ar' ? 'ÙØ´Ù„ Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨' : 'Failed to cancel request');
            console.error('Cancel error:', error || new Error('No request row was updated during cancellation'));
            return;
        }

        queryClient.setQueryData(['request-tracking', id], (previous: any) =>
            previous
                ? {
                    ...previous,
                    ...cancellationPatch,
                    provider: null,
                }
                : previous,
        );
        queryClient.setQueryData(['buyer-dispatch-requests', user.id], (previous: any[] | undefined) =>
            Array.isArray(previous) ? previous.filter((request) => request.id !== id) : previous,
        );

        queryClient.invalidateQueries({ queryKey: ['buyer-requests'] });
        queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
        queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests', user.id] });
        queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user.id] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking', id] });

        if (previousAssignedSellerId) {
            queryClient.setQueryData(['seller-active-job', previousAssignedSellerId], null);
            queryClient.setQueryData(['seller-active-jobs', previousAssignedSellerId], (previous: any[] | undefined) =>
                Array.isArray(previous) ? previous.filter((job) => job.id !== id) : previous,
            );
            queryClient.setQueryData(['seller-scheduled-jobs', previousAssignedSellerId], (previous: any[] | undefined) =>
                Array.isArray(previous) ? previous.filter((job) => job.id !== id) : previous,
            );
            queryClient.setQueryData(['seller-opportunities', previousAssignedSellerId], (previous: any) => {
                if (!previous || typeof previous !== 'object') return previous;

                const opportunities = Array.isArray(previous.opportunities)
                    ? previous.opportunities.filter((opportunity: any) => opportunity.id !== id)
                    : previous.opportunities;
                const waitlisted = Array.isArray(previous.waitlisted)
                    ? previous.waitlisted.filter((opportunity: any) => opportunity.id !== id)
                    : previous.waitlisted;

                return { ...previous, opportunities, waitlisted };
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

    const handleCancel = async () => {
        if (confirm(t.deleteConfirm)) {
            return handleConfirmedCancellation();
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

    if (!request) return null;

    const category = getCategoryInfo(request.category);
    const { dateStr, timeStr } = getDateTimeInfo();
    const cleanDesc = getCleanDescription(isArabic && request.description_ar ? request.description_ar : request.description);
    const photos = (request as any).photos as string[] | undefined;
    const BackIcon = isArabic ? ChevronRight : ChevronLeft;

    const coordinates = getRequestCoordinates(request);
    const staticMapUrl = undefined;

    return (
        <div className="min-h-screen bg-background pb-32 relative" dir={isArabic ? 'rtl' : 'ltr'}>
            
            <div className="relative h-[320px] w-full overflow-hidden bg-muted">
                <ServiceLocationMap
                    currentLanguage={currentLanguage}
                    lat={coordinates?.lat}
                    lng={coordinates?.lng}
                    locationLabel={getLocationDisplay()}
                    heightClassName="h-[320px]"
                    className="rounded-none border-0 shadow-none"
                    statusBadge={
                        request.status !== 'matching' && request.status !== 'open' ? (
                            <div className="rounded-full border border-white/75 bg-white/88 px-3 py-1.5 shadow-sm backdrop-blur-md">
                                <span className={cn('text-[11px] font-semibold text-foreground/80', isArabic ? 'font-ar-body' : 'font-body')}>
                                    {statusCopy.title}
                                </span>
                            </div>
                        ) : null
                    }
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            {/* Mapbox Hero Header */}
            <div className="hidden">
                {staticMapUrl ? (
                    <img
                        src={staticMapUrl}
                        alt="Location Map"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(209,115,40,0.16),_transparent_55%),linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))]" />
                )}
                
                {/* Map Pins / Pulse */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {coordinates ? (
                        <>
                            <div className="absolute w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/20 animate-pulse" />
                            <div className="absolute w-16 h-16 rounded-full bg-primary/15 border border-primary/30" />
                            <div className="relative flex flex-col items-center drop-shadow-lg">
                                <MapPin className="w-10 h-10 text-primary drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" strokeWidth={2.5} />
                            </div>
                        </>
                    ) : (
                        <div className="rounded-full bg-white/90 px-5 py-2 text-sm font-semibold text-foreground/80 shadow-sm border border-primary/10">
                            {isArabic ? 'الموقع قيد التحديث' : 'Location pending'}
                        </div>
                    )}
                </div>

                {/* Gradients to fade into app content smoothly */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            {/* Sticky Glassmorphism Header */}
            <div className="fixed top-0 left-0 right-0 z-50 pt-safe-top">
                <div className="flex items-center gap-3 px-4 py-3 bg-background/70 backdrop-blur-xl border-b border-white/10 shadow-sm transition-all duration-300">
                    <button
                        onClick={() => navigate('/app/buyer/home')}
                        className="p-2.5 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full hover:bg-white/40 dark:hover:bg-black/40 transition-colors active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-white/30 dark:border-white/10"
                    >
                        <BackIcon className="w-5 h-5 text-foreground" />
                    </button>
                    <h1 className={cn(
                        "text-lg font-bold text-foreground drop-shadow-sm",
                        isArabic ? "font-ar-display" : "font-display"
                    )}>
                        {t.backTitle}
                    </h1>
                </div>
            </div>

            <div className="px-4 space-y-5 relative z-10 -mt-20">
                {/* Unified Premium Floating Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-card/95 backdrop-blur-sm rounded-[32px] p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 dark:border-border/50 space-y-5"
                >
                    {/* Header with Icon, Edit, Title */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
                                {category.icon}
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-xl font-bold text-foreground",
                                    isArabic ? "font-ar-heading" : "font-heading"
                                )}>
                                    {isArabic ? category.ar : category.en}
                                </h2>
                                
                                {request.title && (
                                    <p className={cn(
                                        "text-[15px] font-semibold text-foreground/80 mt-0.5",
                                        isArabic ? "font-ar-body" : "font-body"
                                    )}>
                                        {isArabic && request.title_ar ? request.title_ar : request.title}
                                    </p>
                                )}

                                {cleanDesc && (
                                    <p className={cn(
                                        "text-[13.5px] font-medium text-muted-foreground mt-1 line-clamp-2",
                                        isArabic ? "font-ar-body" : "font-body"
                                    )}>
                                        {cleanDesc}
                                    </p>
                                )}
                            </div>
                        </div>
                        {!isCancelled && activeBuyerActions.canEdit && !buyerMarkedComplete ? (
                            <button
                                onClick={() => navigate(`/app/buyer/request/${id}/edit`)}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground transition-all active:scale-90 shadow-sm border border-border/50",
                                )}
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>

                    {presentationStatus === 'matching' ? (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 p-4 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                            <div className="flex items-center justify-between gap-4 relative z-10">
                                <div className="flex-1">
                                    <h3 className={cn(
                                        "text-[15px] font-bold text-emerald-800 dark:text-emerald-300 mb-0.5",
                                        isArabic ? "font-ar-display" : "font-display"
                                    )}>
                                        {t.searchingTitle}
                                    </h3>
                                    <p className={cn(
                                        "text-xs font-medium text-emerald-600/90 dark:text-emerald-400/80",
                                        isArabic ? "font-ar-body" : "font-body"
                                    )}>
                                        {t.searchingSubtitle}
                                    </p>
                                </div>
                                <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 animate-ping"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                </div>
                            </div>
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent skew-x-12" />
                        </div>
                    ) : isCancelled ? (
                        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-orange-50 p-4 shadow-sm dark:border-rose-900/30 dark:from-rose-950/30 dark:via-background dark:to-orange-950/20">
                            <div className="absolute inset-y-0 left-0 w-1 bg-rose-400/80" />
                            <div className="relative z-10 flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <h3 className={cn("text-[15px] font-bold text-rose-800 dark:text-rose-200", isArabic ? "font-ar-display" : "font-display")}>
                                        {cancelledContent.infoTitle}
                                    </h3>
                                    <p className={cn("text-sm text-rose-700/90 dark:text-rose-300/80", isArabic ? "font-ar-body" : "font-body")}>
                                        {cancelledContent.infoDesc}
                                    </p>
                                    <div className="inline-flex rounded-full border border-rose-200 bg-white/85 px-3 py-1 text-[11px] font-semibold text-rose-700 shadow-sm dark:border-rose-900/40 dark:bg-background/60 dark:text-rose-200">
                                        {cancelledContent.hint}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/60" />

                            <div className="relative z-10 mb-4 space-y-3">
                                <ProviderSnapshot
                                    currentLanguage={currentLanguage}
                                    providerName={request.provider?.full_name}
                                    providerCompany={request.provider?.company_name}
                                    providerAvatar={request.provider?.avatar_url}
                                    providerPhone={request.provider?.phone}
                                    providerRating={request.provider?.seller_rating}
                                    providerVerified={request.provider?.verified_seller}
                                    yearsOfExperience={request.provider?.years_of_experience}
                                    statusLabel={statusCopy.title}
                                />

                                <RequestPriceCard
                                    currentLanguage={currentLanguage}
                                    sellerPricing={sellerPricing}
                                    finalAmount={finalAmount}
                                />

                                {(presentationStatus === 'accepted' || presentationStatus === 'on_the_way') && !sellerMarkedComplete && (
                                    <div className="w-max rounded-2xl border border-blue-200 bg-background px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                                                <Clock size={13} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700/70", isArabic ? "font-ar-body" : "font-body")}>
                                                    {t.eta}
                                                </p>
                                                <p className={cn("text-sm font-semibold text-foreground", isArabic ? "font-ar-body" : "font-body")}>
                                                    15-20 min
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="hidden">
                                {request.provider?.avatar_url ? (
                                    <img src={request.provider.avatar_url} alt="Provider" className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                                        <UserCheck className="w-6 h-6 text-primary" />
                                    </div>
                                )}
                                <div>
                                     <h3 className={cn("font-bold text-foreground text-[15px] mb-1.5 leading-none", isArabic ? "font-ar-heading" : "font-heading")}>
                                        {request.provider?.full_name || (isArabic ? 'تم تعيين الفني' : 'Provider Assigned')}
                                     </h3>
                                     <p className={cn("text-[11px] text-primary font-bold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full inline-block", isArabic ? "font-ar-body" : "font-body uppercase tracking-wider")}>
                                        {(t as Record<string, any>)[presentationStatus]?.title || (presentationStatus === 'on_the_way' ? t.en_route.title : t.accepted.title)}
                                     </p>
                                </div>
                            </div>
                            
                            {/* Price estimate badge */}
                            {false && estimatedPrice && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl mb-3 text-xs font-semibold text-green-700 dark:text-green-400 w-max relative z-10">
                                    <DollarSign size={13} className="text-green-600 dark:text-green-400 shrink-0" />
                                    <span>{isArabic ? 'التقدير:' : 'Est.'} {estimatedPrice}</span>
                                </div>
                            )}

                            {false && (request.status === 'accepted' || request.status === 'en_route') && !sellerMarkedComplete && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border shadow-sm rounded-xl mb-4 text-xs font-semibold text-foreground w-max relative z-10">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                        <Clock size={13} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span>{t.eta} 15-20 min</span>
                                </div>
                            )}

                            <TimelineTracker steps={getTimelineSteps(timelineRequest, t)} className="relative z-10" />

                            {/* 6-digit code display — shown after buyer approves price */}
                            <AnimatePresence>
                            {buyerPriceApproved && !buyerMarkedComplete && completionCode && (
                                <motion.div
                                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                    className="mt-4 p-5 bg-gradient-to-br from-primary/8 to-primary/5 border-2 border-primary/25 rounded-2xl text-center space-y-3 relative z-10"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                                        <ShieldCheck size={24} className="text-primary" />
                                    </div>
                                    <p className={cn("font-bold text-sm text-foreground", isArabic ? "font-ar-heading" : "font-heading")}>
                                        {isArabic ? 'أعطِ هذا الرمز للفني' : 'Show This Code to Provider'}
                                    </p>
                                    <div className="flex justify-center gap-1.5" dir="ltr">
                                        {completionCode.split('').map((digit, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.06 }}
                                                className="w-11 h-14 rounded-xl bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-2xl font-extrabold text-primary shadow-sm"
                                            >
                                                {digit}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard?.writeText(completionCode).then(() =>
                                                toast.success(isArabic ? 'تم نسخ الرمز' : 'Code copied')
                                            );
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors mt-1"
                                    >
                                        <Copy size={12} />
                                        <span className={isArabic ? 'font-ar-body' : 'font-body'}>
                                            {isArabic ? 'نسخ الرمز' : 'Copy code'}
                                        </span>
                                    </button>
                                    <p className={cn("text-xs text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
                                        {isArabic ? 'الفني يدخل هذا الرمز لإقفال الطلب' : 'Provider enters this code to close the job'}
                                    </p>
                                </motion.div>
                            )}
                            </AnimatePresence>

                            {/* Job fully completed */}
                            <AnimatePresence>
                            {(buyerMarkedComplete || activeRequest?.lifecycle === 'closed') && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                                    className="mt-4 p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-center space-y-2 relative z-10"
                                >
                                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                                        <CheckCircle2 size={24} className="text-white" />
                                    </div>
                                    <p className={cn("font-bold text-base text-emerald-800 dark:text-emerald-300", isArabic ? "font-ar-heading" : "font-heading")}>
                                        {isArabic ? 'تم إغلاق الطلب بنجاح!' : 'Job successfully completed!'}
                                    </p>
                                    <p className={cn("text-xs text-emerald-600/80 dark:text-emerald-500/70", isArabic ? "font-ar-body" : "font-body")}>
                                        {isArabic ? 'شكراً لاستخدامك منصة Maintmena' : 'Thank you for using Maintmena'}
                                    </p>
                                </motion.div>
                            )}
                            </AnimatePresence>

                            {/* Inline review flow — kept on the request screen instead of a modal */}
                            <AnimatePresence>
                            {(buyerMarkedComplete || activeRequest?.lifecycle === 'closed') &&
                             request.assigned_seller_id &&
                             !isReviewContextLoading && (
                                <motion.div
                                    ref={reviewSectionRef}
                                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.2 }}
                                    className="mt-4 scroll-mt-24 space-y-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 dark:border-amber-900/30 dark:from-amber-950/30 dark:to-yellow-950/20"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                                            <Star size={20} className="fill-amber-400 text-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className={cn("text-sm font-bold text-amber-900 dark:text-amber-200", isArabic ? "font-ar-heading" : "font-heading")}>
                                                {existingReview && !isEditingReview
                                                    ? (isArabic ? 'تم حفظ تقييمك' : 'Your review is saved')
                                                    : (isArabic ? 'تقييم سريع' : 'Quick review')}
                                            </p>
                                            {existingReview && !isEditingReview && (
                                                <p className={cn("text-xs text-amber-800/80 dark:text-amber-300/80", isArabic ? "font-ar-body" : "font-body")}>
                                                    {isArabic ? 'يمكنك تعديله من نفس الشاشة.' : 'You can edit it from this screen.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {existingReview && !isEditingReview ? (
                                        <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-background/75 p-4 dark:border-amber-900/30 dark:bg-background/30">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            size={18}
                                                            className={cn(
                                                                star <= existingReview.rating
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-muted-foreground/30',
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingReview(true)}
                                                    className={cn(
                                                        'rounded-full border border-amber-200 bg-background px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-background/30 dark:text-amber-300',
                                                        isArabic ? 'font-ar-body' : 'font-body',
                                                    )}
                                                >
                                                    {isArabic ? 'تعديل التقييم' : 'Edit review'}
                                                </button>
                                            </div>

                                            {existingReview.review_text && (
                                                <p className={cn("text-sm leading-6 text-foreground/85", isArabic ? "font-ar-body" : "font-body")}>
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
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-border/60 to-transparent" />

                    {/* Details Rows */}
                    <div className="space-y-4 pt-1">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-xs text-muted-foreground uppercase tracking-wider mb-0.5",
                                    isArabic ? "font-ar-body" : "font-body font-semibold"
                                )}>
                                    {t.location}
                                </p>
                                <p className={cn(
                                    "text-sm font-semibold text-foreground truncate",
                                    isArabic ? "font-ar-body" : "font-body"
                                )}>
                                    {getLocationDisplay()}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-xs text-muted-foreground uppercase tracking-wider mb-0.5",
                                    isArabic ? "font-ar-body" : "font-body font-semibold"
                                )}>
                                    {t.dateTime}
                                </p>
                                <p className={cn(
                                    "text-sm font-semibold text-foreground truncate",
                                    isArabic ? "font-ar-body" : "font-body"
                                )}>
                                    {dateStr}
                                    {timeStr && <span className="text-muted-foreground font-medium"> • {timeStr}</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>


                {/* Photos Gallery */}
                {photos && photos.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-card rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40"
                    >
                        <h3 className={cn(
                            "text-sm font-bold text-muted-foreground mb-4",
                            isArabic ? "font-ar-heading" : "font-heading uppercase tracking-wide"
                        )}>
                            {t.photos}
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x hide-scrollbar">
                            {photos.map((photo, index) => (
                                <a
                                    key={index}
                                    href={photo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 snap-center"
                                >
                                    <img
                                        src={photo}
                                        alt={`Photo ${index + 1}`}
                                        className="w-28 h-28 object-cover rounded-2xl shadow-sm border border-border/50 hover:opacity-90 transition-opacity"
                                    />
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Request Another Service CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => navigate('/app/buyer/requests/new')}
                    className="bg-gradient-to-br from-primary/10 to-transparent rounded-[28px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-primary/20 cursor-pointer hover:shadow-lg active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
                            <Plus className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className={cn(
                                "font-bold text-[15px] text-foreground mb-0.5",
                                isArabic ? "font-ar-heading" : "font-heading"
                            )}>
                                {t.requestAnother}
                            </p>
                            <p className={cn(
                                "text-sm font-medium text-muted-foreground leading-snug",
                                isArabic ? "font-ar-body" : "font-body"
                            )}>
                                {t.requestAnotherSub}
                            </p>
                        </div>
                        <ChevronRight className={cn("w-5 h-5 text-primary opacity-80", isArabic && "rotate-180")} />
                    </div>
                </motion.div>

                {/* Tips Section */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-4 px-2 pt-2 pb-6"
                >
                    <h3 className={cn(
                        "text-lg font-bold text-foreground",
                        isArabic ? "font-ar-display" : "font-display"
                    )}>
                        {isCancelled ? cancelledContent.nextSteps : t.thingsToKeep}
                    </h3>
                    <div className="space-y-4">
                        {isCancelled ? (
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-900/30">
                                <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <p className={cn(
                                        "font-bold text-sm text-slate-900 dark:text-slate-200 mb-1",
                                        isArabic ? "font-ar-heading" : "font-heading"
                                    )}>
                                        {cancelledContent.title}
                                    </p>
                                    <p className={cn(
                                        "text-sm font-medium text-slate-700/80 dark:text-slate-300/80 leading-relaxed",
                                        isArabic ? "font-ar-body" : "font-body"
                                    )}>
                                        {cancelledContent.sub}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                                    <div>
                                        <p className={cn(
                                            "font-bold text-sm text-blue-900 dark:text-blue-300 mb-1",
                                            isArabic ? "font-ar-heading" : "font-heading"
                                        )}>
                                            {t.tipResponseTime}
                                        </p>
                                        <p className={cn(
                                            "text-sm font-medium text-blue-700/80 dark:text-blue-400/80 leading-relaxed",
                                            isArabic ? "font-ar-body" : "font-body"
                                        )}>
                                            {t.tipResponseDesc}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                                    <div>
                                        <p className={cn(
                                            "font-bold text-sm text-amber-900 dark:text-amber-300 mb-1",
                                            isArabic ? "font-ar-heading" : "font-heading"
                                        )}>
                                            {t.tipCancellation}
                                        </p>
                                        <p className={cn(
                                            "text-sm font-medium text-amber-700/80 dark:text-amber-400/80 leading-relaxed",
                                            isArabic ? "font-ar-body" : "font-body"
                                        )}>
                                            {t.tipCancellationDesc}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Cancel button — only shown when job is still cancellable */}
            {!isCancelled && activeBuyerActions.canCancel && (
                <div className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none flex justify-center">
                    <motion.button
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCancel}
                        className={cn(
                            "pointer-events-auto bg-white/90 dark:bg-card/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(239,68,68,0.15)] border border-destructive/20 max-w-sm w-full py-4 rounded-[28px] text-destructive font-bold flex items-center justify-center gap-2.5 transition-all hover:bg-destructive hover:text-white dark:hover:bg-destructive",
                            isArabic ? "font-ar-heading" : "font-heading"
                        )}
                    >
                        <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                        {t.cancelRequest}
                    </motion.button>
                </div>
            )}

            {/* Support button when seller_marked_complete and awaiting approval */}
            {!isCancelled && requiresFinalApproval && !showPriceApproval && (
                <div className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none flex justify-center">
                    <motion.button
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPriceApproval(true)}
                        className={cn(
                            "pointer-events-auto bg-primary text-primary-foreground max-w-sm w-full py-4 rounded-[28px] font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-primary/30",
                            isArabic ? "font-ar-heading" : "font-heading"
                        )}
                    >
                        <DollarSign className="w-5 h-5" />
                        {isArabic ? 'مراجعة السعر النهائي' : 'Review Final Price'}
                    </motion.button>
                </div>
            )}

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
                onOpenChange={(open) => {
                    if (!open) {
                        handleReviewPromptLater();
                    }
                }}
            >
                <DialogContent className="sm:max-w-md" dir={isArabic ? 'rtl' : 'ltr'}>
                    <DialogHeader className="space-y-3">
                        <div className="inline-flex w-max items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {isArabic ? 'اكتمل الطلب' : 'Job completed'}
                        </div>
                        <DialogTitle className={cn(isArabic ? 'font-ar-heading text-right' : 'font-heading')}>
                            {isArabic ? 'اترك تقييماً سريعاً' : 'Leave a quick review'}
                        </DialogTitle>
                        <DialogDescription className={cn(isArabic ? 'font-ar-body text-right' : 'font-body')}>
                            {isArabic
                                ? 'يمكنك إرسال التقييم من هذه النافذة مباشرة.'
                                : 'You can submit the review directly from this modal.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                            <p className={cn('text-sm font-semibold text-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
                                {request?.provider?.company_name || request?.provider?.full_name || (isArabic ? 'مقدم الخدمة' : 'Service Provider')}
                            </p>
                            {request?.title && (
                                <p className={cn('mt-1 text-sm text-muted-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
                                    {request.title}
                                </p>
                            )}
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
                            submitLabel={isArabic ? (existingReview ? 'تحديث التقييم' : 'إرسال التقييم') : (existingReview ? 'Update Review' : 'Submit Review')}
                            cancelLabel={isArabic ? 'لاحقاً' : 'Later'}
                        />
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};
