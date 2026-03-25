import { Cloud, Expand, Zap, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QuietMarketStateProps {
    currentLanguage: 'en' | 'ar';
    onExpandRadius?: () => void;
    onEnableUrgent?: () => void;
    onAddService?: () => void;
}

interface DemandHint {
    id: string;
    area: string;
    areaAr: string;
    category?: string;
    categoryAr?: string;
    demandChange: string;
}

const mockDemandHints: DemandHint[] = [
    { id: '1', area: 'Al Olaya', areaAr: 'العليا', category: 'Plumbing', categoryAr: 'سباكة', demandChange: '+22%' },
    { id: '2', area: 'Al Murabba', areaAr: 'المربع', category: 'AC', categoryAr: 'تكييف', demandChange: '+15%' },
    { id: '3', area: 'King Fahd', areaAr: 'الملك فهد', demandChange: '+12%' },
];

function DemandHintRow({ hint, currentLanguage }: { hint: DemandHint; currentLanguage: 'en' | 'ar' }) {
    return (
        <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-foreground">
                    {currentLanguage === 'ar' ? hint.areaAr : hint.area}
                </span>
                {hint.category && (
                    <span className="text-xs text-muted-foreground">
                        · {currentLanguage === 'ar' ? hint.categoryAr : hint.category}
                    </span>
                )}
            </div>
            <span className="text-[10px] h-5 px-2.5 bg-success/10 text-success font-bold rounded-full flex items-center">
                {hint.demandChange}
            </span>
        </div>
    );
}

export function QuietMarketState({
    currentLanguage,
    onExpandRadius,
    onEnableUrgent,
    onAddService,
}: QuietMarketStateProps) {
    const content = {
        ar: {
            calmTitle: 'المنطقة هادئة حالياً',
            nextWave: 'الموجة القادمة متوقعة:',
            nextWaveTime: '~18 دقيقة',
            scanning: 'النظام يبحث',
            providersNearby: '4 مقدمين قريبين',
            higherDemand: 'طلب أعلى بالقرب منك',
            peakNote: 'السباكة الطارئة تزداد بعد 9 مساءً',
            increaseOdds: 'زيادة فرصك',
            expandRadius: 'توسيع النطاق',
            expandRadiusDetail: '5 → 8 كم',
            enableUrgent: 'أعمال عاجلة',
            addService: 'أضف خدمة',
        },
        en: {
            calmTitle: "It's calm in your area right now",
            nextWave: 'Next wave expected:',
            nextWaveTime: '~18 min',
            scanning: 'System scanning',
            providersNearby: '4 providers nearby',
            higherDemand: 'Higher Demand Nearby',
            peakNote: 'Emergency plumbing peaks after 9 PM',
            increaseOdds: 'Increase Your Odds',
            expandRadius: 'Expand Radius',
            expandRadiusDetail: '5 → 8 km',
            enableUrgent: 'Urgent Jobs',
            addService: 'Add service',
        },
    };

    const t = content[currentLanguage];

    const { data: demandHints = mockDemandHints } = useQuery({
        queryKey: ['quiet-market-demand'],
        queryFn: async () => {
            const { data } = await supabase
                .from('maintenance_requests')
                .select('location, category')
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(20);

            if (!data || data.length === 0) return mockDemandHints;

            // Group by location
            const locMap = new Map<string, { count: number, category: string }>();
            data.forEach(req => {
                if (!req.location) return;
                const existing = locMap.get(req.location);
                if (existing) {
                    existing.count++;
                } else {
                    locMap.set(req.location, { count: 1, category: req.category || 'General' });
                }
            });

            const sorted = Array.from(locMap.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 3);
            if (sorted.length === 0) return mockDemandHints;

            return sorted.map((entry, idx) => ({
                id: `real-${idx}`,
                area: entry[0],
                areaAr: entry[0], // Can't easily translate location string directly
                category: entry[1].category,
                categoryAr: entry[1].category,
                demandChange: `+${entry[1].count * 5}%`, // Pseudo trend based on count
            }));
        },
        staleTime: 60000,
    });

    return (
        <div className="animate-fade-in space-y-5">
            {/* Calm Status Header */}
            <div className="rounded-3xl bg-card p-6 text-center border border-border/40" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-muted/50 mb-4">
                    <Cloud className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className={cn(
                    "text-lg font-extrabold text-foreground leading-tight mb-1",
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                )}>
                    {t.calmTitle}
                </h2>
                <p className={cn(
                    "text-sm text-muted-foreground",
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                    {t.nextWave} <span className="font-semibold text-foreground">{t.nextWaveTime}</span>
                </p>

                <div className="flex items-center justify-center gap-1.5 mt-3">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                        {t.scanning} · {t.providersNearby}
                    </span>
                </div>
            </div>

            {/* Higher Demand Nearby */}
            <div className="rounded-3xl bg-card p-5 border border-border/40" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h3 className={cn(
                    "text-sm font-bold text-foreground mb-3",
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                )}>
                    {t.higherDemand}
                </h3>
                <div className="divide-y divide-border/40">
                    {demandHints.map((hint) => (
                        <DemandHintRow key={hint.id} hint={hint} currentLanguage={currentLanguage} />
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                    {t.peakNote}
                </p>
            </div>

            {/* Increase Your Odds - Smaller and secondary styling */}
            <div className="px-1">
                <p className={cn(
                    "text-xs font-medium text-muted-foreground mb-2",
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                    {t.increaseOdds}
                </p>
                <div className="flex gap-2 flex-wrap">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-foreground font-medium hover:bg-muted transition-colors"
                        onClick={() => {
                            onExpandRadius?.();
                            toast.success(currentLanguage === 'ar' ? 'تم توسيع النطاق' : 'Radius expanded');
                        }}
                    >
                        <Expand className="h-3 w-3" />
                        {t.expandRadius}
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-foreground font-medium hover:bg-muted transition-colors"
                        onClick={() => {
                            onEnableUrgent?.();
                            toast.success(currentLanguage === 'ar' ? 'تم تفعيل الأعمال العاجلة' : 'Urgent jobs enabled');
                        }}
                    >
                        <Zap className="h-3 w-3" />
                        {t.enableUrgent}
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-foreground font-medium hover:bg-muted transition-colors"
                        onClick={() => {
                            onAddService?.();
                            toast.success(currentLanguage === 'ar' ? 'أضف خدمة من الملف' : 'Add service from profile');
                        }}
                    >
                        <Plus className="h-3 w-3" />
                        {t.addService}
                    </button>
                </div>
            </div>
        </div>
    );
}
