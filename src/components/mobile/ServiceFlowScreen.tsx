import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { LocationHeader } from './LocationHeader';
import { TimeSelector } from './TimeSelector';
import { ServiceCategoryGrid } from './ServiceCategoryGrid';
import { SubIssueChips, SUB_ISSUES } from './SubIssueChips';
import { RequestDescriptionSheet } from './RequestDescriptionSheet';
import { getAllCategories } from '@/lib/serviceCategories';
import { Button } from '@/components/ui/button';
import { RequestSummaryCard } from './RequestSummaryCard';
import { EditRequestSheet } from './EditRequestSheet';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDispatchActions } from '@/hooks/useDispatchActions';
import { useQueryClient } from '@tanstack/react-query';
import { getStoredServiceLocation } from '@/lib/flowDefaults';

// Flow steps
type FlowStep = 'category' | 'sub_issue' | 'description' | 'confirmation';

interface ServiceFlowState {
    step: FlowStep;
    location: {
        city: string;
        address: string;
        lat: number | null;
        lng: number | null;
    };
    urgency: 'asap' | 'scheduled';
    scheduledDate: Date | null;
    scheduledTime: string | null; // "HH:MM" 24h format
    category: string | null;
    subIssue: string | null;
    description: string;
    photos: string[];
}

type ServiceFlowAction =
    | { type: 'SET_LOCATION'; payload: ServiceFlowState['location'] }
    | { type: 'SET_URGENCY'; payload: 'asap' | 'scheduled' }
    | { type: 'SET_SCHEDULE'; payload: { date: Date; time: string } }
    | { type: 'SET_CATEGORY'; payload: string }
    | { type: 'SET_SUB_ISSUE'; payload: string }
    | { type: 'SET_DESCRIPTION'; payload: string }
    | { type: 'ADD_PHOTO'; payload: string }
    | { type: 'REMOVE_PHOTO'; payload: number }
    | { type: 'SET_PHOTOS'; payload: string[] }
    | { type: 'NEXT_STEP' }
    | { type: 'PREV_STEP' }
    | { type: 'RESET' }
    | { type: 'SET_LOCATION_FROM_STORAGE'; payload: ServiceFlowState['location'] };

const initialState: ServiceFlowState = {
    step: 'category',
    location: {
        city: '',
        address: '',
        lat: null,
        lng: null,
    },
    urgency: 'asap',
    scheduledDate: null,
    scheduledTime: null,
    category: null,
    subIssue: null,
    description: '',
    photos: [],
};

function flowReducer(state: ServiceFlowState, action: ServiceFlowAction): ServiceFlowState {
    switch (action.type) {
        case 'SET_LOCATION':
            return { ...state, location: action.payload };
        case 'SET_LOCATION_FROM_STORAGE':
            return { ...state, location: action.payload };
        case 'SET_URGENCY':
            return { ...state, urgency: action.payload };
        case 'SET_SCHEDULE':
            return {
                ...state,
                urgency: 'scheduled',
                scheduledDate: action.payload.date,
                scheduledTime: action.payload.time
            };
        case 'SET_CATEGORY':
            return { ...state, category: action.payload, step: 'sub_issue' };
        case 'SET_SUB_ISSUE':
            return { ...state, subIssue: action.payload, step: 'description' };
        case 'SET_DESCRIPTION':
            return { ...state, description: action.payload };
        case 'ADD_PHOTO':
            return { ...state, photos: [...state.photos, action.payload] };
        case 'REMOVE_PHOTO':
            return { ...state, photos: state.photos.filter((_, i) => i !== action.payload) };
        case 'SET_PHOTOS':
            return { ...state, photos: action.payload };
        case 'NEXT_STEP':
            const steps: FlowStep[] = ['category', 'sub_issue', 'description', 'confirmation'];
            const currentIndex = steps.indexOf(state.step);
            return { ...state, step: steps[Math.min(currentIndex + 1, steps.length - 1)] };
        case 'PREV_STEP':
            const allSteps: FlowStep[] = ['category', 'sub_issue', 'description', 'confirmation'];
            const idx = allSteps.indexOf(state.step);
            return { ...state, step: allSteps[Math.max(idx - 1, 0)] };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

// Confirmation View Component
interface ConfirmationViewProps {
    currentLanguage: 'en' | 'ar';
    onTrackRequest: () => void;
    onClose: () => void;
    requestDetails: {
        category: string;
        categoryIcon: string;
        subIssue?: string | null;
        location: string;
        time: string;
        lat: number;
        lng: number;
        rawLocation: { lat: number; lng: number; address: string; city: string };
        rawTime: {
            mode: 'asap' | 'scheduled';
            date: Date | null;
            time: string | null;
        };
        rawDescription: string;
        rawPhotos: string[];
    };
    onUpdateRequest: (updates: any) => void;
}

const ConfirmationView = ({
    currentLanguage,
    onTrackRequest,
    onClose,
    requestDetails,
    onUpdateRequest
}: ConfirmationViewProps) => {
    const { notificationSuccess } = useHaptics();
    const isRTL = currentLanguage === 'ar';
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        notificationSuccess();
    }, [notificationSuccess]);

    const handleSaveEdit = (updates: any) => {
        onUpdateRequest(updates);
        toast(currentLanguage === 'ar' ? 'تم تحديث الطلب' : 'Request Updated', {
            description: currentLanguage === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully',
        });
        notificationSuccess();
    };

    const t = {
        ar: {
            requestSent: 'تم إرسال الطلب',
            findingProvider: 'نبحث لك عن أفضل فني...',
            responseEstimate: 'معظمهم يستجيبون خلال 6 دقائق',
            viewStatus: 'عرض التفاصيل',
            backHome: 'العودة للرئيسية',
        },
        en: {
            requestSent: 'Request Sent',
            findingProvider: 'Finding you the best provider...',
            responseEstimate: 'Most respond within 6 minutes',
            viewStatus: 'View Details',
            backHome: 'Back to Home',
        }
    };

    const ct = t[currentLanguage];

    return (
        <div className="flex flex-col h-full bg-background/50 px-4 pt-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={cn("absolute top-4 z-50", isRTL ? "left-4" : "right-4")}>
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-background/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm border hover:bg-background transition-colors"
                >
                    <X className="w-6 h-6 text-foreground" />
                </button>
            </div>

            <div className="mt-8 w-full max-w-sm mx-auto flex flex-col items-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                    >
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </motion.div>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn("text-2xl font-bold mb-6 text-foreground", isRTL ? 'font-ar-heading' : 'font-heading')}
                >
                    {ct.requestSent}
                </motion.h2>

                <RequestSummaryCard
                    className="mb-4"
                    currentLanguage={currentLanguage}
                    category={requestDetails.category}
                    categoryIcon={requestDetails.categoryIcon}
                    subIssue={requestDetails.subIssue}
                    location={requestDetails.location}
                    time={requestDetails.time}
                    lat={requestDetails.lat}
                    lng={requestDetails.lng}
                    statusTitle={ct.findingProvider}
                    statusSubtitle={ct.responseEstimate}
                    statusColor="bg-primary"
                    isPulse={true}
                    actionLabel={ct.viewStatus}
                    onAction={onTrackRequest}
                    onEdit={() => setIsEditing(true)}
                />

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full"
                >
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="w-full h-10 text-muted-foreground hover:bg-transparent"
                    >
                        <span className={isRTL ? 'font-ar-body' : ''}>{ct.backHome}</span>
                    </Button>
                </motion.div>
            </div>

            <EditRequestSheet
                isOpen={isEditing}
                currentLanguage={currentLanguage}
                onClose={() => setIsEditing(false)}
                onSave={handleSaveEdit}
                initialData={{
                    location: requestDetails.rawLocation,
                    timeMode: requestDetails.rawTime.mode,
                    scheduledDate: requestDetails.rawTime.date,
                    scheduledTimeSlot: requestDetails.rawTime.time as any,
                    description: requestDetails.rawDescription,
                    photos: requestDetails.rawPhotos
                }}
            />
        </div>
    );
};

export interface ServiceFlowScreenProps {
    currentLanguage: 'en' | 'ar';
    isOpen: boolean;
    initialCategory?: string | null;
    onClose: () => void;
}

const flowContent = {
    ar: {
        whatDoYouNeed: 'ماذا تحتاج؟',
        whatsTheSituation: 'ما هو الوضع؟',
        describeIssue: 'صف المشكلة',
    },
    en: {
        whatDoYouNeed: 'What do you need?',
        whatsTheSituation: "What's the situation?",
        describeIssue: 'Describe the issue',
    },
};

export const ServiceFlowScreen = ({
    currentLanguage,
    isOpen,
    initialCategory = null,
    onClose,
}: ServiceFlowScreenProps) => {
    const navigate = useNavigate();
    const { vibrate } = useHaptics();
    const [state, dispatch] = useReducer(flowReducer, initialState);
    const t = flowContent[currentLanguage];
    const isRTL = currentLanguage === 'ar';
    // Memoised: getAllCategories() iterates a static list; only recompute when the
    // component first mounts — the list does not change at runtime.
    const categories = useMemo(() => getAllCategories(), []);
    const { user } = useAuth();
    const { triggerDispatch } = useDispatchActions();
    const queryClient = useQueryClient();
    const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toSafeString = (value: unknown, fallback = ''): string => {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        return fallback;
    };

    const toSafeNumber = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        return null;
    };

    const sanitizePhotos = (photos: unknown[]): string[] => {
        return photos.filter((photo): photo is string => typeof photo === 'string' && photo.length > 0);
    };

    const handleClose = async () => {
        await vibrate('light');
        dispatch({ type: 'RESET' });
        setCreatedRequestId(null);
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            dispatch({ type: 'RESET' });
            setCreatedRequestId(null);
            return;
        }

        if (!initialCategory) {
            dispatch({ type: 'RESET' });
            setCreatedRequestId(null);
        }
    }, [initialCategory, isOpen]);

    // Load saved location on open
    useEffect(() => {
        if (!isOpen) return;

        if (
            state.location.address ||
            state.location.city ||
            state.location.lat !== null ||
            state.location.lng !== null
        ) {
            return;
        }

        const savedLocation = getStoredServiceLocation(
            localStorage.getItem('maintmena_last_location'),
        );
        if (savedLocation) {
            dispatch({ type: 'SET_LOCATION_FROM_STORAGE', payload: savedLocation });
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await fetch(
                            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${currentLanguage}`
                        );
                        const data = await response.json();
                        let address = '';
                        if (data.locality) address = data.locality;
                        else if (data.city) address = data.city;
                        const city = data.city || data.locality || '';

                        dispatch({
                            type: 'SET_LOCATION',
                            payload: { lat: latitude, lng: longitude, address, city }
                        });
                        localStorage.setItem(
                            'maintmena_last_location',
                            JSON.stringify({ lat: latitude, lng: longitude, address, city }),
                        );
                    } catch (e) {
                        console.error('Auto-locate failed', e);
                    }
                },
                (error) => console.error('Geolocation error:', error),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
            );
        }
    }, [isOpen, currentLanguage, state.location.address, state.location.city, state.location.lat, state.location.lng]);

    useEffect(() => {
        if (!isOpen || !initialCategory) return;
        if (state.category === initialCategory || state.step !== 'category') return;

        dispatch({ type: 'SET_CATEGORY', payload: initialCategory });
    }, [initialCategory, isOpen, state.category, state.step]);

    const handleBack = async () => {
        await vibrate('light');
        if (state.step === 'category') {
            handleClose();
        } else {
            dispatch({ type: 'PREV_STEP' });
        }
    };


    // ── Real submission to Supabase ──
    const handleSubmit = async () => {
        await vibrate('heavy');

        if (!user?.id) {
            // Not authenticated — don't show confirmation
            toast.error(currentLanguage === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please sign in to submit a request');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Build title from subIssue or fallback to category name
            const cat = categories.find(c => c.key === state.category);
            const catName = isRTL ? (cat?.ar || state.category) : (cat?.en || state.category);
            const title = state.subIssue || catName || 'Service Request';

            // Description is pure details, no prepended subIssue
            const description = state.description || '';

            // Build preferred_start_date
            let preferredStartDate: string | null = null;
            if (state.urgency === 'scheduled' && state.scheduledDate) {
                const date = new Date(state.scheduledDate);
                if (state.scheduledTime) {
                    const [hours, minutes] = state.scheduledTime.split(':').map(Number);
                    date.setHours(hours, minutes, 0, 0);
                }
                preferredStartDate = date.toISOString();
            }

            // Map urgency for DB
            const urgencyMap: Record<string, string> = {
                'asap': 'high',
                'scheduled': 'medium',
            };

            const safePhotos = sanitizePhotos(state.photos);
            const safeAddress = toSafeString(state.location.address);
            const safeCity = toSafeString(state.location.city);
            const safeCategory = toSafeString(state.category, 'general');
            const safeTitle = toSafeString(title, 'Service Request');
            const safeDescription = toSafeString(description);
            const safeLatitude = toSafeNumber(state.location.lat);
            const safeLongitude = toSafeNumber(state.location.lng);
            const safeLocation = safeAddress
                ? `${safeAddress}, ${safeCity}`.replace(/,\s*$/, '')
                : safeCity;

            // Insert into maintenance_requests
            const { data: newRequest, error } = await (supabase as any)
                .from('maintenance_requests')
                .insert({
                    buyer_id: user.id,
                    title: safeTitle,
                    category: safeCategory,
                    description: safeDescription,
                    urgency: urgencyMap[state.urgency] || 'medium',
                    status: 'open',
                    location: safeLocation,
                    latitude: safeLatitude,
                    longitude: safeLongitude,
                    preferred_start_date: preferredStartDate,
                    photos: safePhotos.length > 0 ? safePhotos : null,
                })
                .select()
                .single();

            if (error) {
                console.error('Failed to create request:', error);
                toast.error(
                    currentLanguage === 'ar'
                        ? 'فشل في إرسال الطلب. الرجاء المحاولة مجدداً.'
                        : 'Failed to submit request. Please try again.'
                );
                return; // Don't advance to confirmation
            }

            // ✅ Success — save ID, invalidate queries, advance to confirmation
            setCreatedRequestId((newRequest as any).id);
            queryClient.invalidateQueries({ queryKey: ['buyer-activity'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-dispatch-requests'] });
            queryClient.invalidateQueries({ queryKey: ['buyer-requests'] });

            // Advance to confirmation screen
            dispatch({ type: 'NEXT_STEP' });

            // Trigger dispatch (fire and forget, non-blocking)
            triggerDispatch(
                (newRequest as any).id,
                'request',
                state.category || 'general',
                state.location.lat,
                state.location.lng,
                3
            ).then((result) => {
                if (result.eligibleCount > 0) {
                    console.log(`Dispatched to ${result.eligibleCount} sellers`);
                } else {
                    console.log('No eligible sellers:', result.error);
                }
            }).catch(console.error);

        } catch (err) {
            console.error('Submit error:', err);
            toast.error(
                currentLanguage === 'ar'
                    ? 'حدث خطأ غير متوقع. الرجاء المحاولة مجدداً.'
                    : 'An unexpected error occurred. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTrackRequest = () => {
        handleClose();
        if (createdRequestId) {
            navigate(`/app/buyer/request/${createdRequestId}`);
        } else {
            navigate('/app/buyer/requests');
        }
    };

    const stepTitle = useMemo(() => {
        switch (state.step) {
            case 'category': return t.whatDoYouNeed;
            case 'sub_issue': return t.whatsTheSituation;
            case 'description': return t.describeIssue;
            default: return '';
        }
    }, [state.step, t]);

    const categoryLabel = useMemo(() => {
        if (!state.category) return '';
        const cat = categories.find(c => c.key === state.category);
        return cat ? (isRTL ? cat.ar : cat.en) : state.category;
    }, [state.category, categories, isRTL]);

    const subIssueLabel = useMemo(() => {
        if (!state.category || !state.subIssue) return null;
        const issues = SUB_ISSUES[state.category] || [];
        const issue = issues.find(i => i.key === state.subIssue);
        return issue ? (isRTL ? issue.ar : issue.en) : state.subIssue;
    }, [state.category, state.subIssue, isRTL]);

    const timeLabel = useMemo(() => {
        if (state.urgency === 'asap') return isRTL ? 'الآن' : 'ASAP';
        if (!state.scheduledDate) return isRTL ? 'مجدول' : 'Scheduled';
        const dateStr = state.scheduledDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US');
        if (state.scheduledTime) {
            const [h, m] = state.scheduledTime.split(':').map(Number);
            const suffix = h >= 12 ? (isRTL ? 'م' : 'PM') : (isRTL ? 'ص' : 'AM');
            const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
            return `${dateStr} - ${displayH}:${String(m).padStart(2, '0')} ${suffix}`;
        }
        return dateStr;
    }, [state.urgency, state.scheduledDate, state.scheduledTime, isRTL]);

    const handleUpdateRequest = (updates: any) => {
        if (updates.location) dispatch({ type: 'SET_LOCATION', payload: updates.location });
        if (updates.timeMode) dispatch({ type: 'SET_URGENCY', payload: updates.timeMode });
        if (updates.scheduledDate && updates.scheduledTime) {
            dispatch({ type: 'SET_SCHEDULE', payload: { date: updates.scheduledDate, time: updates.scheduledTime } });
        }
        if (updates.description) dispatch({ type: 'SET_DESCRIPTION', payload: updates.description });
        if (updates.photos) dispatch({ type: 'SET_PHOTOS', payload: updates.photos });
    };

    const renderStepContent = () => {
        switch (state.step) {
            case 'category':
                return (
                    <>
                        <LocationHeader
                            currentLanguage={currentLanguage}
                            location={state.location}
                            onLocationChange={(loc) => {
                                dispatch({ type: 'SET_LOCATION', payload: loc });
                                localStorage.setItem('maintmena_last_location', JSON.stringify(loc));
                            }}
                        />
                        <TimeSelector
                            currentLanguage={currentLanguage}
                            urgency={state.urgency}
                            scheduledDate={state.scheduledDate}
                            scheduledTime={state.scheduledTime}
                            onUrgencyChange={(u) => dispatch({ type: 'SET_URGENCY', payload: u })}
                            onScheduleChange={(date, time) =>
                                dispatch({ type: 'SET_SCHEDULE', payload: { date, time } })
                            }
                        />
                        <ServiceCategoryGrid
                            currentLanguage={currentLanguage}
                            selectedCategory={state.category}
                            onCategorySelect={(category) => dispatch({ type: 'SET_CATEGORY', payload: category })}
                        />
                    </>
                );

            case 'sub_issue':
                return (
                    <SubIssueChips
                        currentLanguage={currentLanguage}
                        category={state.category || 'plumbing'}
                        selectedSubIssue={state.subIssue}
                        onSubIssueSelect={(subIssue) => dispatch({ type: 'SET_SUB_ISSUE', payload: subIssue })}
                    />
                );

            case 'description':
                return (
                    <RequestDescriptionSheet
                        currentLanguage={currentLanguage}
                        description={state.description}
                        photos={state.photos}
                        onDescriptionChange={(desc) => dispatch({ type: 'SET_DESCRIPTION', payload: desc })}
                        onPhotoAdd={(photo) => dispatch({ type: 'ADD_PHOTO', payload: photo })}
                        onPhotoRemove={(index) => dispatch({ type: 'REMOVE_PHOTO', payload: index })}
                        onSubmit={handleSubmit}
                        selectedProvidersCount={0}
                    />
                );

            case 'confirmation':
                return (
                    <ConfirmationView
                        currentLanguage={currentLanguage}
                        onTrackRequest={handleTrackRequest}
                        onClose={handleClose}
                        requestDetails={{
                            category: categoryLabel,
                            categoryIcon: categories.find(c => c.key === state.category)?.icon || '🔧',
                            subIssue: subIssueLabel,
                            location: state.location.city || (currentLanguage === 'ar' ? 'الموقع الحالي' : 'Current Location'),
                            time: timeLabel,
                            lat: state.location.lat || 0,
                            lng: state.location.lng || 0,
                            rawLocation: {
                                lat: state.location.lat || 0,
                                lng: state.location.lng || 0,
                                address: state.location.address || '',
                                city: state.location.city || ''
                            },
                            rawTime: {
                                mode: state.urgency,
                                date: state.scheduledDate,
                                time: state.scheduledTime
                            },
                            rawDescription: state.description,
                            rawPhotos: state.photos
                        }}
                        onUpdateRequest={handleUpdateRequest}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={cn(
                        'fixed inset-0 z-50 bg-background',
                        'flex flex-col'
                    )}
                    dir={isRTL ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    {state.step !== 'confirmation' && (
                        <div className={cn(
                            'flex items-center justify-between px-4 pt-safe pb-3',
                            'border-b border-border/30'
                        )}>
                            <button
                                onClick={handleBack}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                            >
                                {state.step === 'category' ? (
                                    <X size={24} className="text-foreground" />
                                ) : (
                                    <ChevronLeft size={24} className={cn(
                                        "text-foreground",
                                        isRTL && "rotate-180"
                                    )} />
                                )}
                            </button>
                            <h1 className={cn(
                                'text-lg font-semibold text-foreground',
                                isRTL ? 'font-ar-heading' : 'font-heading'
                            )}>
                                {stepTitle}
                            </h1>
                            <div className="w-10" />
                        </div>
                    )}

                    {/* Content */}
                    <div className={cn("flex-1 overflow-y-auto", state.step === 'confirmation' ? 'p-0' : 'px-4 py-2')}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={state.step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                {renderStepContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
