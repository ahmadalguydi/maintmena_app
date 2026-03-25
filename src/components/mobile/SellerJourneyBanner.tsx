import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Car,
    MapPin,
    AlertTriangle,
    Clock,
    XCircle,
    Check,
    ChevronDown
} from 'lucide-react';
import {
    useCreateJobEvent,
    useLatestEvent,
    canUseArrivedNoAnswer,
    JobEventType
} from '@/hooks/useJobEvents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SellerJourneyBannerProps {
    jobId: string;
    jobType: 'request' | 'booking';
    customerName: string;
    buyerLocation?: { lat: number; lng: number };
    isScheduledToday: boolean;
}

const ETA_OPTIONS = [
    { label: '30 دقيقة', minutes: 30 },
    { label: 'ساعة', minutes: 60 },
    { label: 'ساعتين', minutes: 120 },
];

export function SellerJourneyBanner({
    jobId,
    jobType,
    customerName,
    buyerLocation,
    isScheduledToday,
}: SellerJourneyBannerProps) {
    const [showETAOptions, setShowETAOptions] = useState(false);
    const [showArrivalOptions, setShowArrivalOptions] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [hasLocationPermission, setHasLocationPermission] = useState(false);

    const { data: latestEvent, isLoading } = useLatestEvent(jobId, jobType);
    const createEvent = useCreateJobEvent();

    // Get current location for corroboration
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setHasLocationPermission(true);
                },
                () => setHasLocationPermission(false),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    if (!isScheduledToday || isLoading) return null;

    const handleOnMyWay = async (etaMinutes: number) => {
        try {
            await createEvent.mutateAsync({
                jobId,
                jobType,
                eventType: 'seller_on_the_way',
                etaMinutes,
            });
            setShowETAOptions(false);
            toast.success('تم إرسال موعد وصولك للعميل');
        } catch {
            toast.error('حدث خطأ');
        }
    };

    const handleArrived = async () => {
        try {
            await createEvent.mutateAsync({
                jobId,
                jobType,
                eventType: 'seller_arrived',
                locationLat: currentLocation?.lat,
                locationLng: currentLocation?.lng,
            });
            setShowArrivalOptions(false);
            toast.success('تم تسجيل وصولك');
        } catch {
            toast.error('حدث خطأ');
        }
    };

    const handleArrivedNoAnswer = async () => {
        // Check corroboration
        const { allowed, corroborationType } = canUseArrivedNoAnswer(
            latestEvent?.event_type === 'seller_on_the_way' ? latestEvent : null,
            hasLocationPermission,
            currentLocation,
            buyerLocation || null
        );

        if (!allowed) {
            toast.error('لا يمكن استخدام هذا الخيار حالياً', {
                description: 'يجب أن تكون قريباً من الموقع أو مرور 15 دقيقة من "في الطريق"',
            });
            return;
        }

        try {
            await createEvent.mutateAsync({
                jobId,
                jobType,
                eventType: 'seller_arrived_no_answer',
                corroborationType: corroborationType!,
                locationLat: currentLocation?.lat,
                locationLng: currentLocation?.lng,
            });
            setShowArrivalOptions(false);
            toast.success('تم تسجيل "وصلت وما أحد رد"', {
                description: 'سيتم إشعار العميل',
            });
        } catch {
            toast.error('حدث خطأ');
        }
    };

    const handleDelayed = async () => {
        try {
            await createEvent.mutateAsync({
                jobId,
                jobType,
                eventType: 'seller_delayed',
            });
            setShowArrivalOptions(false);
            toast.success('تم إشعار العميل بالتأخير');
        } catch {
            toast.error('حدث خطأ');
        }
    };

    const handleCannotAttend = async () => {
        try {
            await createEvent.mutateAsync({
                jobId,
                jobType,
                eventType: 'seller_cannot_attend',
            });
            setShowArrivalOptions(false);
            toast.success('تم إلغاء الموعد');
        } catch {
            toast.error('حدث خطأ');
        }
    };

    // Determine current stage
    const currentStage = latestEvent?.event_type || 'initial';
    const isOnTheWay = currentStage === 'seller_on_the_way';
    const hasArrived = ['seller_arrived', 'seller_arrived_no_answer'].includes(currentStage);

    return (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/20 shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                    <p className={cn("font-semibold font-ar-body")}>لديك موعد اليوم مع {customerName}</p>
                    <p className="text-sm text-muted-foreground">You have an appointment today</p>
                </div>
            </div>

            {/* Current stage indicator */}
            {isOnTheWay && !hasArrived && (
                <div className="flex items-center gap-2 mb-4 text-sm bg-blue-500/10 text-blue-600 rounded-lg p-2">
                    <Car className="w-4 h-4 shrink-0" />
                    <span className={cn("font-ar-body")}>أنت في الطريق - ETA: {latestEvent?.eta_minutes} دقيقة</span>
                </div>
            )}

            {hasArrived && (
                <div className="flex items-center gap-2 mb-4 text-sm bg-green-500/10 text-green-600 rounded-lg p-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span className={cn("font-ar-body")}>تم تسجيل وصولك</span>
                </div>
            )}

            {/* Action buttons */}
            {!hasArrived && (
                <>
                    {!isOnTheWay ? (
                        /* Initial: Show "On my way" */
                        <div className="space-y-3">
                            <Button
                                className={cn("w-full gap-2 h-12 font-ar-body")}
                                onClick={() => setShowETAOptions(!showETAOptions)}
                            >
                                <Car className="w-5 h-5" />
                                أنا في الطريق
                                <ChevronDown className={`w-4 h-4 transition-transform ${showETAOptions ? 'rotate-180' : ''}`} />
                            </Button>

                            {showETAOptions && (
                                <div className="grid grid-cols-3 gap-2 animate-in fade-in">
                                    {ETA_OPTIONS.map((option) => (
                                        <Button
                                            key={option.minutes}
                                            variant="outline"
                                            onClick={() => handleOnMyWay(option.minutes)}
                                            disabled={createEvent.isPending}
                                            className={cn("font-ar-body")}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* On the way: Show arrival options */
                        <div className="space-y-3">
                            <Button
                                className={cn("w-full gap-2 h-12 font-ar-body")}
                                onClick={() => setShowArrivalOptions(!showArrivalOptions)}
                            >
                                <MapPin className="w-5 h-5" />
                                هل وصلت؟
                                <ChevronDown className={`w-4 h-4 transition-transform ${showArrivalOptions ? 'rotate-180' : ''}`} />
                            </Button>

                            {showArrivalOptions && (
                                <div className="space-y-2 animate-in fade-in">
                                    <Button
                                        className={cn("w-full gap-2 bg-green-600 hover:bg-green-700 font-ar-body")}
                                        onClick={handleArrived}
                                        disabled={createEvent.isPending}
                                    >
                                        <Check className="w-5 h-5" />
                                        وصلت
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className={cn("w-full gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-ar-body")}
                                        onClick={handleArrivedNoAnswer}
                                        disabled={createEvent.isPending}
                                    >
                                        <AlertTriangle className="w-5 h-5" />
                                        وصلت وما أحد رد
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleDelayed}
                                            disabled={createEvent.isPending}
                                            className={cn("font-ar-body")}
                                        >
                                            <Clock className="w-4 h-4 ml-1" />
                                            متأخر
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn("text-destructive font-ar-body")}
                                            onClick={handleCannotAttend}
                                            disabled={createEvent.isPending}
                                        >
                                            <XCircle className="w-4 h-4 ml-1" />
                                            لا أستطيع
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
