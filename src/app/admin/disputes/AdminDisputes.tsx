import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    AlertTriangle,
    User,
    Briefcase,
    Calendar,
    DollarSign,
    CheckCircle,
    XCircle,
    Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/serviceCategories';

interface AdminDisputesProps {
    currentLanguage: 'en' | 'ar';
}

interface DisputeSellerProfile {
    full_name: string | null;
    email: string | null;
    company_name: string | null;
}

interface DisputeBuyerProfile {
    full_name: string | null;
    email: string | null;
}

interface HaltedJob {
    id: string;
    title: string | null;
    category: string;
    created_at: string;
    buyer_id: string | null;
    budget: number | null;
    halt_reason: string | null;
    seller: DisputeSellerProfile | null;
    buyer: DisputeBuyerProfile | null;
}

export const AdminDisputes = ({ currentLanguage }: AdminDisputesProps) => {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';
    const currencyLabel = isArabic ? 'ر.س' : 'SAR';

    const [selectedDispute, setSelectedDispute] = useState<HaltedJob | null>(null);
    const queryClient = useQueryClient();

    const { data: haltedJobs, isLoading } = useQuery({
        queryKey: ['admin-halted-jobs'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from('maintenance_requests')
                    .select(`
                        *,
                        seller:profiles!maintenance_requests_assigned_seller_id_fkey(full_name, email, company_name)
                    `)
                    .eq('halted', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (!data) return [];

                // Fetch buyer profiles separately (no FK constraint for buyer_id)
                const enriched = await Promise.all(
                    data.map(async (job) => {
                        if (job.buyer_id) {
                            const { data: buyerProfile } = await supabase
                                .from('profiles')
                                .select('full_name, email')
                                .eq('id', job.buyer_id)
                                .single();
                            return { ...job, buyer: buyerProfile };
                        }
                        return { ...job, buyer: null };
                    })
                );

                return enriched;
            } catch (e) {
                if (import.meta.env.DEV) console.warn('Error fetching halted jobs:', e);
                return [];
            }
        },
    });

    const resolveMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string; action: 'resolve' | 'dismiss' }) => {
            const update: Record<string, unknown> = { halted: false };
            if (action === 'resolve') update.status = 'completed';
            else if (action === 'dismiss') update.status = 'cancelled';

            const { error } = await supabase
                .from('maintenance_requests')
                .update(update)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, { action }) => {
            queryClient.invalidateQueries({ queryKey: ['admin-halted-jobs'] });
            toast.success(
                isArabic
                    ? (action === 'resolve' ? 'تم حل النزاع' : 'تم رفض النزاع')
                    : (action === 'resolve' ? 'Dispute resolved' : 'Dispute dismissed')
            );
            setSelectedDispute(null);
        },
        onError: () => toast.error(isArabic ? 'حدث خطأ' : 'An error occurred'),
    });

    const content = {
        en: {
            title: 'Disputes',
            noDisputes: 'No halted jobs',
            buyer: 'Buyer',
            seller: 'Seller',
            category: 'Category',
            price: 'Price',
            created: 'Created',
            resolve: 'Resolve',
            dismiss: 'Dismiss',
            haltReason: 'Halt Reason',
        },
        ar: {
            title: 'النزاعات',
            noDisputes: 'لا توجد أعمال متوقفة',
            buyer: 'المشتري',
            seller: 'البائع',
            category: 'الفئة',
            price: 'السعر',
            created: 'تاريخ الإنشاء',
            resolve: 'حل',
            dismiss: 'رفض',
            haltReason: 'سبب التوقف',
        },
    };

    const t = content[currentLanguage];

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
            />

            <div className="px-4 py-4 space-y-4">
                {/* Disputes List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : haltedJobs && haltedJobs.length > 0 ? (
                    <div className="space-y-3">
                        {haltedJobs.map((job) => (
                            <SoftCard
                                key={job.id}
                                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-amber-500"
                                onClick={() => setSelectedDispute(job)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle size={18} className="text-amber-500" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <BodySmall lang={currentLanguage} className="font-medium mb-1 line-clamp-1">
                                            {job.title || getCategoryLabel(job.category, currentLanguage)}
                                        </BodySmall>

                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-xs">
                                                {getCategoryLabel(job.category, currentLanguage)}
                                            </Badge>
                                            <Caption lang={currentLanguage} className="text-muted-foreground">
                                                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                                            </Caption>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User size={12} />
                                                {job.buyer?.full_name || 'Unknown'}
                                            </span>
                                            {job.seller && (
                                                <span className="flex items-center gap-1">
                                                    <Briefcase size={12} />
                                                    {job.seller?.company_name || job.seller?.full_name}
                                                </span>
                                            )}
                                            {/* SLA Indicator */}
                                            {new Date(job.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                                                <span className="flex items-center gap-1 text-red-500 font-bold ml-auto">
                                                    <Clock size={12} />
                                                    SLA &gt; 24h
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SoftCard>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500/50 mb-4" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noDisputes}</Body>
                    </div>
                )}
            </div>

            {/* Dispute Detail Sheet */}
            <Sheet open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
                            {selectedDispute?.title || getCategoryLabel(selectedDispute?.category, currentLanguage)}
                        </SheetTitle>
                    </SheetHeader>

                    {selectedDispute && (
                        <div className="mt-6 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-muted rounded-xl">
                                    <Caption lang={currentLanguage} className="text-muted-foreground mb-1">
                                        {t.buyer}
                                    </Caption>
                                    <BodySmall lang={currentLanguage} className="font-medium">
                                        {selectedDispute.buyer?.full_name}
                                    </BodySmall>
                                </div>
                                <div className="p-3 bg-muted rounded-xl">
                                    <Caption lang={currentLanguage} className="text-muted-foreground mb-1">
                                        {t.seller}
                                    </Caption>
                                    <BodySmall lang={currentLanguage} className="font-medium">
                                        {selectedDispute.seller?.company_name || selectedDispute.seller?.full_name || 'N/A'}
                                    </BodySmall>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2">
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.category}</Caption>
                                    <BodySmall lang={currentLanguage}>{getCategoryLabel(selectedDispute.category, currentLanguage)}</BodySmall>
                                </div>
                                {selectedDispute.budget && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                        <Caption lang={currentLanguage} className="text-muted-foreground">{t.price}</Caption>
                                        <BodySmall lang={currentLanguage}>{selectedDispute.budget} {currencyLabel}</BodySmall>
                                    </div>
                                )}
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.created}</Caption>
                                    <BodySmall lang={currentLanguage}>{format(new Date(selectedDispute.created_at), 'PPP')}</BodySmall>
                                </div>
                            </div>

                            {/* Halt Reason */}
                            {selectedDispute.halt_reason && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <Caption lang={currentLanguage} className="text-amber-600 mb-1">{t.haltReason}</Caption>
                                    <BodySmall lang={currentLanguage}>{selectedDispute.halt_reason}</BodySmall>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    disabled={resolveMutation.isPending}
                                    onClick={() => resolveMutation.mutate({ id: selectedDispute.id, action: 'dismiss' })}
                                >
                                    <XCircle size={16} className={isArabic ? 'ml-2' : 'mr-2'} />
                                    {t.dismiss}
                                </Button>
                                <Button
                                    className="flex-1"
                                    disabled={resolveMutation.isPending}
                                    onClick={() => resolveMutation.mutate({ id: selectedDispute.id, action: 'resolve' })}
                                >
                                    <CheckCircle size={16} className={isArabic ? 'ml-2' : 'mr-2'} />
                                    {t.resolve}
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

