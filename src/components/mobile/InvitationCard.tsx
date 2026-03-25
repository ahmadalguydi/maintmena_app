import { motion } from 'framer-motion';
import { MapPin, Clock, ChevronRight, Zap, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SoftCard } from './SoftCard';
import { Body, BodySmall, Caption, Heading3 } from './Typography';
import { Button } from '@/components/ui/button';

export interface JobInvitation {
    id: string;
    category: string;
    categoryIcon: string;
    situation?: string;
    locationDistrict: string; // Approximate location only
    locationCity: string;
    timeMode: 'asap' | 'scheduled';
    scheduledDate?: string;
    scheduledTime?: string;
    receivedAt: Date;
    expiresIn?: number; // seconds
}

interface InvitationCardProps {
    currentLanguage: 'en' | 'ar';
    invitation: JobInvitation;
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
    isStandby?: boolean;
}

const content = {
    ar: {
        accept: 'قبول',
        decline: 'رفض',
        standby: 'استعداد',
        asap: 'أقرب وقت',
        scheduled: 'مجدول',
        newRequest: 'طلب جديد',
        standbyOpportunity: 'فرصة احتياطية',
        expiresIn: 'ينتهي خلال',
        seconds: 'ثانية',
    },
    en: {
        accept: 'Accept',
        decline: 'Decline',
        standby: 'Standby',
        asap: 'ASAP',
        scheduled: 'Scheduled',
        newRequest: 'New Request',
        standbyOpportunity: 'Standby Opportunity',
        expiresIn: 'Expires in',
        seconds: 'sec',
    }
};

export const InvitationCard = ({
    currentLanguage,
    invitation,
    onAccept,
    onDecline,
    isStandby = false,
}: InvitationCardProps) => {
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            layout
        >
            <SoftCard className={cn(
                "p-4",
                isStandby ? "border-l-4 border-amber-500" : "border-l-4 border-primary"
            )}>
                {/* Header */}
                <div className={cn("flex items-center justify-between mb-3", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <span className="text-2xl">{invitation.categoryIcon}</span>
                        <div>
                            <Heading3 lang={currentLanguage} className="text-base">
                                {invitation.category}
                            </Heading3>
                            {invitation.situation && (
                                <Caption lang={currentLanguage} className="text-muted-foreground">
                                    {invitation.situation}
                                </Caption>
                            )}
                        </div>
                    </div>
                    <div className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        isStandby ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                    )}>
                        {isStandby ? t.standbyOpportunity : t.newRequest}
                    </div>
                </div>

                {/* Details Row */}
                <div className={cn("flex items-center gap-4 mb-4 text-muted-foreground", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                        <MapPin size={14} />
                        <BodySmall lang={currentLanguage}>
                            {invitation.locationDistrict}, {invitation.locationCity}
                        </BodySmall>
                    </div>
                    <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                        {invitation.timeMode === 'asap' ? (
                            <>
                                <Zap size={14} className="text-amber-500" />
                                <BodySmall lang={currentLanguage} className="text-amber-600 font-medium">
                                    {t.asap}
                                </BodySmall>
                            </>
                        ) : (
                            <>
                                <Calendar size={14} />
                                <BodySmall lang={currentLanguage}>
                                    {invitation.scheduledDate}
                                </BodySmall>
                            </>
                        )}
                    </div>
                </div>

                {/* Expiry Timer (if applicable) */}
                {invitation.expiresIn && invitation.expiresIn < 60 && (
                    <div className={cn("flex items-center gap-1 mb-3 text-red-500", isRTL && "flex-row-reverse")}>
                        <Clock size={14} />
                        <Caption lang={currentLanguage}>
                            {t.expiresIn} {invitation.expiresIn} {t.seconds}
                        </Caption>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onDecline(invitation.id)}
                        className="flex-1"
                    >
                        {t.decline}
                    </Button>
                    <Button
                        onClick={() => onAccept(invitation.id)}
                        className="flex-1"
                    >
                        {isStandby ? t.standby : t.accept}
                    </Button>
                </div>
            </SoftCard>
        </motion.div>
    );
};
