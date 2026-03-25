import { motion } from 'framer-motion';
import { Navigation, MapPin, CheckCircle, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SoftCard } from './SoftCard';
import { Body, BodySmall, Caption, Heading3 } from './Typography';

export type JobStatus =
    | 'accepted'
    | 'en_route'
    | 'arrived'
    | 'in_progress'
    | 'completed';

interface JobStatusActionsProps {
    currentLanguage: 'en' | 'ar';
    currentStatus: JobStatus;
    onStatusUpdate: (newStatus: JobStatus) => void;
    onContact: (type: 'chat' | 'call') => void;
    buyerName?: string;
    buyerPhone?: string;
    address?: string;
}

const content = {
    ar: {
        onTheWay: 'في الطريق',
        arrived: 'وصلت',
        startWork: 'بدء العمل',
        complete: 'إنهاء العمل',
        currentStatus: 'الحالة الحالية',
        statusAccepted: 'تم القبول',
        statusOnTheWay: 'في الطريق',
        statusArrived: 'وصلت',
        statusInProgress: 'جاري العمل',
        statusCompleted: 'اكتمل',
        contactBuyer: 'تواصل مع العميل',
        chat: 'محادثة',
        call: 'اتصال',
        navigateTo: 'الانتقال إلى الموقع',
    },
    en: {
        onTheWay: 'On My Way',
        arrived: 'I Arrived',
        startWork: 'Start Work',
        complete: 'Complete Job',
        currentStatus: 'Current Status',
        statusAccepted: 'Accepted',
        statusOnTheWay: 'On the way',
        statusArrived: 'Arrived',
        statusInProgress: 'In progress',
        statusCompleted: 'Completed',
        contactBuyer: 'Contact Buyer',
        chat: 'Chat',
        call: 'Call',
        navigateTo: 'Navigate to location',
    }
};

const statusSteps: JobStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress', 'completed'];

export const JobStatusActions = ({
    currentLanguage,
    currentStatus,
    onStatusUpdate,
    onContact,
    buyerName,
    buyerPhone,
    address,
}: JobStatusActionsProps) => {
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';
    const currentIndex = statusSteps.indexOf(currentStatus);

    const getStatusLabel = (status: JobStatus) => {
        const labels: Record<JobStatus, string> = {
            accepted: t.statusAccepted,
            en_route: t.statusOnTheWay,
            arrived: t.statusArrived,
            in_progress: t.statusInProgress,
            completed: t.statusCompleted,
        };
        return labels[status];
    };

    const getNextAction = () => {
        switch (currentStatus) {
            case 'accepted':
                return { label: t.onTheWay, status: 'en_route' as JobStatus, icon: <Navigation size={18} /> };
            case 'en_route':
                return { label: t.arrived, status: 'arrived' as JobStatus, icon: <MapPin size={18} /> };
            case 'arrived':
                return { label: t.startWork, status: 'in_progress' as JobStatus, icon: null };
            case 'in_progress':
                return { label: t.complete, status: 'completed' as JobStatus, icon: <CheckCircle size={18} /> };
            default:
                return null;
        }
    };

    const nextAction = getNextAction();

    return (
        <div className="space-y-4">
            {/* Status Progress */}
            <SoftCard className="p-4">
                <Caption lang={currentLanguage} className="text-muted-foreground mb-3">
                    {t.currentStatus}
                </Caption>
                <div className="flex items-center justify-between">
                    {statusSteps.slice(0, -1).map((step, index) => (
                        <div key={step} className="flex items-center">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                    index <= currentIndex
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {index < currentIndex ? "✓" : index + 1}
                            </div>
                            {index < statusSteps.length - 2 && (
                                <div
                                    className={cn(
                                        "w-8 h-1 mx-1",
                                        index < currentIndex ? "bg-primary" : "bg-muted"
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-2">
                    <BodySmall lang={currentLanguage} className="font-medium text-center">
                        {getStatusLabel(currentStatus)}
                    </BodySmall>
                </div>
            </SoftCard>

            {/* Contact Buyer */}
            {buyerName && (
                <SoftCard className="p-4">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                        <div>
                            <Caption lang={currentLanguage} className="text-muted-foreground">
                                {t.contactBuyer}
                            </Caption>
                            <Body lang={currentLanguage} className="font-medium">
                                {buyerName}
                            </Body>
                        </div>
                        <div className="flex gap-2">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onContact('chat')}
                                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                            >
                                <MessageCircle size={20} className="text-primary" />
                            </motion.button>
                            {buyerPhone && (
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onContact('call')}
                                    className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center"
                                >
                                    <Phone size={20} className="text-green-600" />
                                </motion.button>
                            )}
                        </div>
                    </div>
                </SoftCard>
            )}

            {/* Navigate Button (when on the way) */}
            {address && currentStatus === 'en_route' && (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
                    }}
                >
                    <Navigation size={18} className={cn(isRTL ? "ml-2" : "mr-2")} />
                    {t.navigateTo}
                </Button>
            )}

            {/* Next Action Button */}
            {nextAction && (
                <motion.div
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        size="lg"
                        className="w-full h-14 text-lg"
                        onClick={() => onStatusUpdate(nextAction.status)}
                    >
                        {nextAction.icon && <span className={cn(isRTL ? "ml-2" : "mr-2")}>{nextAction.icon}</span>}
                        {nextAction.label}
                    </Button>
                </motion.div>
            )}
        </div>
    );
};
