import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Opportunity } from '@/hooks/useOpportunities';

interface WaitlistedJobsBannerProps {
    currentLanguage: 'en' | 'ar';
    opportunities: Opportunity[];
    onViewAll: () => void;
}

export function WaitlistedJobsBanner({ currentLanguage, opportunities, onViewAll }: WaitlistedJobsBannerProps) {
    const content = {
        ar: {
            title: 'قائمة الانتظار',
            nextUp: 'أنت التالي في القائمة',
            position: 'الدور: #1',
            viewAll: 'عرض الكل',
            standby: 'جاهز للاستلام',
            estimatedDate: 'متوقع: غداً',
        },
        en: {
            title: 'Waitlisted Jobs',
            nextUp: 'You are next in line',
            position: 'Position: #1',
            viewAll: 'View All',
            standby: 'Ready to take over',
            estimatedDate: 'Est: Tomorrow',
        },
    };

    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';

    if (!opportunities || opportunities.length === 0) return null;

    const job = opportunities[0];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h2 className={cn(
                    "text-sm font-bold text-foreground",
                    isRTL ? 'font-ar-display' : 'font-display'
                )}>
                    {t.title}
                </h2>
                <button
                    onClick={onViewAll}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    {t.viewAll}
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-card overflow-hidden cursor-pointer border border-border/40 relative shadow-soft"
            >
                {/* Map Background */}
                <div className="absolute inset-0 z-0 opacity-20 bg-amber-500/5">
                    {/* Stylized map pattern */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px'
                    }} />
                </div>

                {/* Status Strip */}
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />

                <div className="relative z-10 p-5 flex items-center gap-4">
                    {/* Position Badge */}
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex flex-col items-center justify-center border border-amber-500/20 shrink-0">
                        <span className="text-xs font-medium text-amber-600 mb-0.5">#</span>
                        <span className="text-xl font-extrabold text-amber-700 leading-none">{job.waitlistPosition || 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20 rounded-full font-medium">
                                {t.standby}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{job.timing || t.estimatedDate}</span>
                        </div>

                        <h3 className={cn(
                            "font-bold text-base text-foreground truncate mb-1",
                            isRTL ? 'font-ar-display' : 'font-display'
                        )}>
                            {job.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>10:00 AM</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
