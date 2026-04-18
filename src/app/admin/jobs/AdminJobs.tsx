import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Search,
    Briefcase,
    User,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Radio,
    AlertTriangle,
    DollarSign,
    Calendar,
    ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/serviceCategories';

interface AdminJobsProps {
    currentLanguage: 'en' | 'ar';
}

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'disputed';

interface Job {
    id: string;
    title: string | null;
    category: string;
    status: string;
    budget: number | null;
    created_at: string;
    updated_at: string;
    city: string | null;
    buyer_id: string | null;
    buyer_name: string | null;
    seller_name: string | null;
}

const STATUS_CONFIG: Record<string, { en: string; ar: string; color: string; icon: typeof CheckCircle2 }> = {
    submitted:        { en: 'Submitted',  ar: 'مُقدَّم',     color: 'bg-slate-500',  icon: Clock },
    dispatching:      { en: 'Dispatching',ar: 'جاري التوزيع',color: 'bg-blue-500',   icon: Radio },
    accepted:         { en: 'Accepted',   ar: 'مقبول',       color: 'bg-indigo-500', icon: CheckCircle2 },
    in_route:         { en: 'En Route',   ar: 'في الطريق',   color: 'bg-cyan-500',   icon: MapPin },
    arrived:          { en: 'Arrived',    ar: 'وصل',         color: 'bg-teal-500',   icon: MapPin },
    in_progress:      { en: 'In Progress',ar: 'جاري التنفيذ',color: 'bg-amber-500',  icon: Briefcase },
    seller_marked_complete: { en: 'Pending Confirm', ar: 'بانتظار التأكيد', color: 'bg-orange-500', icon: Clock },
    completed:        { en: 'Completed',  ar: 'مكتمل',       color: 'bg-green-500',  icon: CheckCircle2 },
    closed:           { en: 'Closed',     ar: 'مغلق',        color: 'bg-green-600',  icon: CheckCircle2 },
    cancelled:        { en: 'Cancelled',  ar: 'ملغي',        color: 'bg-red-500',    icon: XCircle },
    disputed:         { en: 'Disputed',   ar: 'متنازع عليه', color: 'bg-orange-600', icon: AlertTriangle },
};

const ACTIVE_STATUSES = ['dispatching', 'accepted', 'in_route', 'arrived', 'in_progress', 'seller_marked_complete'];
const COMPLETED_STATUSES = ['completed', 'closed'];
const CANCELLED_STATUSES = ['cancelled'];

export function AdminJobs({ currentLanguage }: AdminJobsProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isArabic = currentLanguage === 'ar';
    const currencyLabel = isArabic ? 'ر.س' : 'SAR';
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel' | null>(null);

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ['admin-jobs', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('maintenance_requests')
                .select('id, title, category, status, budget, created_at, updated_at, city, buyer_id, assigned_seller_id')
                .order('updated_at', { ascending: false })
                .limit(100);

            if (statusFilter === 'active') {
                query = query.in('status', ACTIVE_STATUSES);
            } else if (statusFilter === 'completed') {
                query = query.in('status', COMPLETED_STATUSES);
            } else if (statusFilter === 'cancelled') {
                query = query.in('status', CANCELLED_STATUSES);
            } else if (statusFilter === 'disputed') {
                query = query.in('status', ['disputed']).eq('halted', true);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return [];

            // Batch-fetch buyer & seller names
            const buyerIds = [...new Set(data.map(j => j.buyer_id).filter(Boolean))] as string[];
            const sellerIds = [...new Set(data.map(j => (j as any).assigned_seller_id).filter(Boolean))] as string[];

            const allIds = [...new Set([...buyerIds, ...sellerIds])];
            let profileMap: Record<string, string> = {};
            if (allIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, company_name')
                    .in('id', allIds);
                (profiles || []).forEach(p => {
                    profileMap[p.id] = p.company_name || p.full_name || '';
                });
            }

            return data.map((j): Job => ({
                id: j.id,
                title: j.title,
                category: j.category,
                status: j.status,
                budget: j.budget,
                created_at: j.created_at,
                updated_at: j.updated_at,
                city: j.city,
                buyer_id: j.buyer_id,
                buyer_name: j.buyer_id ? (profileMap[j.buyer_id] || null) : null,
                seller_name: (j as any).assigned_seller_id ? (profileMap[(j as any).assigned_seller_id] || null) : null,
            }));
        },
        refetchInterval: 30000,
    });

    // ─── Admin force-complete mutation ───
    const forceCompleteMutation = useMutation({
        mutationFn: async (jobId: string) => {
            // Direct update — works immediately via admin RLS policy
            const { error } = await (supabase as any)
                .from('maintenance_requests')
                .update({
                    status: 'completed',
                    seller_marked_complete: true,
                    buyer_marked_complete: true,
                    seller_completion_date: new Date().toISOString(),
                    buyer_completion_date: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', jobId);
            if (error) throw error;

            // Clean up pending dispatch offers
            await (supabase as any)
                .from('job_dispatch_offers')
                .update({ offer_status: 'expired', updated_at: new Date().toISOString() })
                .eq('job_id', jobId)
                .in('offer_status', ['sent', 'delivered', 'seen']);
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم إكمال المهمة بنجاح' : 'Job marked as completed');
            queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
            setSelectedJob(null);
            setConfirmAction(null);
        },
        onError: (err: any) => {
            toast.error(isArabic ? 'فشل إكمال المهمة' : `Failed: ${err.message}`);
            setConfirmAction(null);
        },
    });

    // ─── Admin force-cancel mutation ───
    const forceCancelMutation = useMutation({
        mutationFn: async (jobId: string) => {
            // Direct update — works immediately via admin RLS policy
            const { error } = await (supabase as any)
                .from('maintenance_requests')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', jobId);
            if (error) throw error;

            // Clean up pending dispatch offers
            await (supabase as any)
                .from('job_dispatch_offers')
                .update({ offer_status: 'expired', updated_at: new Date().toISOString() })
                .eq('job_id', jobId)
                .in('offer_status', ['sent', 'delivered', 'seen']);

            // Cancel active dispatch sessions
            await (supabase as any)
                .from('job_dispatch_sessions')
                .update({ dispatch_status: 'cancelled', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('job_id', jobId)
                .like('dispatch_status', 'dispatching%');
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم إلغاء المهمة' : 'Job cancelled');
            queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
            setSelectedJob(null);
            setConfirmAction(null);
        },
        onError: (err: any) => {
            toast.error(isArabic ? 'فشل إلغاء المهمة' : `Failed: ${err.message}`);
            setConfirmAction(null);
        },
    });

    const isActionPending = forceCompleteMutation.isPending || forceCancelMutation.isPending;

    const t = {
        en: {
            title: 'All Jobs', search: 'Search jobs...', all: 'All', active: 'Active',
            completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
            noJobs: 'No jobs found', buyer: 'Buyer', seller: 'Provider',
            category: 'Category', amount: 'Amount', city: 'City', created: 'Created',
            updated: 'Last Updated', close: 'Close', viewBuyer: 'View Buyer',
            forceComplete: 'Force Complete',
            forceCancel: 'Force Cancel',
            confirmComplete: 'Are you sure? This will mark the job as completed for both parties.',
            confirmCancel: 'Are you sure? This will cancel the job and expire all pending offers.',
            confirm: 'Yes, Confirm',
            goBack: 'Go Back',
        },
        ar: {
            title: 'جميع المهام', search: 'البحث في المهام...', all: 'الكل', active: 'نشط',
            completed: 'مكتمل', cancelled: 'ملغي', disputed: 'متنازع',
            noJobs: 'لا توجد مهام', buyer: 'العميل', seller: 'مقدم الخدمة',
            category: 'الفئة', amount: 'المبلغ', city: 'المدينة', created: 'تاريخ الإنشاء',
            updated: 'آخر تحديث', close: 'إغلاق', viewBuyer: 'عرض العميل',
            forceComplete: 'إكمال إجباري',
            forceCancel: 'إلغاء إجباري',
            confirmComplete: 'هل أنت متأكد؟ سيتم تحديد المهمة كمكتملة لكلا الطرفين.',
            confirmCancel: 'هل أنت متأكد؟ سيتم إلغاء المهمة وإنهاء جميع العروض المعلقة.',
            confirm: 'نعم، تأكيد',
            goBack: 'رجوع',
        },
    }[currentLanguage];

    const filtered = jobs.filter(j => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            j.title?.toLowerCase().includes(q) ||
            j.category?.toLowerCase().includes(q) ||
            j.buyer_name?.toLowerCase().includes(q) ||
            j.seller_name?.toLowerCase().includes(q) ||
            j.city?.toLowerCase().includes(q)
        );
    });

    const filterTabs: { key: StatusFilter; label: string; icon: typeof Clock }[] = [
        { key: 'all', label: t.all, icon: Briefcase },
        { key: 'active', label: t.active, icon: Radio },
        { key: 'completed', label: t.completed, icon: CheckCircle2 },
        { key: 'cancelled', label: t.cancelled, icon: XCircle },
        { key: 'disputed', label: t.disputed, icon: AlertTriangle },
    ];

    const getStatusConf = (status: string) =>
        STATUS_CONFIG[status] ?? { en: status, ar: status, color: 'bg-slate-400', icon: Clock };

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
                rightContent={
                    <Badge variant="secondary" className="text-xs tabular-nums">{filtered.length}</Badge>
                }
            />

            <div className="px-4 py-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className={cn(
                        'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground',
                        isArabic ? 'right-3' : 'left-3'
                    )} />
                    <Input
                        placeholder={t.search}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={cn('rounded-full', isArabic ? 'pr-10 text-right' : 'pl-10')}
                    />
                </div>

                {/* Status Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {filterTabs.map(({ key, label, icon: Icon }) => (
                        <Button
                            key={key}
                            variant={statusFilter === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(key)}
                            className="rounded-full gap-1 flex-shrink-0"
                        >
                            <Icon size={13} />
                            {label}
                        </Button>
                    ))}
                </div>

                {/* Jobs List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="space-y-2.5">
                        {filtered.map(job => {
                            const conf = getStatusConf(job.status);
                            const StatusIcon = conf.icon;
                            return (
                                <SoftCard
                                    key={job.id}
                                    className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                                    onClick={() => setSelectedJob(job)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Briefcase size={18} className="text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                <BodySmall lang={currentLanguage} className="font-medium truncate">
                                                    {job.title || getCategoryLabel(job.category, currentLanguage)}
                                                </BodySmall>
                                                <Badge className={cn('text-white text-[10px] flex-shrink-0', conf.color)}>
                                                    {isArabic ? conf.ar : conf.en}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                {job.buyer_name && (
                                                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                                                        <User size={11} />
                                                        {job.buyer_name}
                                                    </span>
                                                )}
                                                {job.city && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={11} />
                                                        {job.city}
                                                    </span>
                                                )}
                                                {job.budget && (
                                                    <span className="flex items-center gap-1 font-medium text-foreground">
                                                        <DollarSign size={11} />
                                                        {job.budget} {currencyLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <Caption lang={currentLanguage} className="text-muted-foreground mt-1 text-[10px]">
                                                {formatDistanceToNow(new Date(job.updated_at), {
                                                    addSuffix: true,
                                                    locale: isArabic ? ar : enUS,
                                                })}
                                            </Caption>
                                        </div>
                                        <ChevronRight size={16} className={cn('text-muted-foreground mt-1 flex-shrink-0', isArabic && 'rotate-180')} />
                                    </div>
                                </SoftCard>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noJobs}</Body>
                    </div>
                )}
            </div>

            {/* Job Detail Sheet */}
            <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
                            {selectedJob?.title || getCategoryLabel(selectedJob?.category ?? '', currentLanguage)}
                        </SheetTitle>
                    </SheetHeader>

                    {selectedJob && (
                        <div className="mt-5 space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
                            {/* Status */}
                            <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                                <Caption lang={currentLanguage} className="text-muted-foreground">Status</Caption>
                                <Badge className={cn('text-white', getStatusConf(selectedJob.status).color)}>
                                    {isArabic ? getStatusConf(selectedJob.status).ar : getStatusConf(selectedJob.status).en}
                                </Badge>
                            </div>

                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-muted rounded-xl">
                                    <Caption lang={currentLanguage} className="text-muted-foreground mb-1">{t.buyer}</Caption>
                                    <BodySmall lang={currentLanguage} className="font-medium">
                                        {selectedJob.buyer_name || '—'}
                                    </BodySmall>
                                </div>
                                <div className="p-3 bg-muted rounded-xl">
                                    <Caption lang={currentLanguage} className="text-muted-foreground mb-1">{t.seller}</Caption>
                                    <BodySmall lang={currentLanguage} className="font-medium">
                                        {selectedJob.seller_name || '—'}
                                    </BodySmall>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2">
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.category}</Caption>
                                    <BodySmall lang={currentLanguage}>{getCategoryLabel(selectedJob.category, currentLanguage)}</BodySmall>
                                </div>
                                {selectedJob.budget && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                        <Caption lang={currentLanguage} className="text-muted-foreground">{t.amount}</Caption>
                                        <BodySmall lang={currentLanguage} className="font-semibold">{selectedJob.budget} {currencyLabel}</BodySmall>
                                    </div>
                                )}
                                {selectedJob.city && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                        <Caption lang={currentLanguage} className="text-muted-foreground">{t.city}</Caption>
                                        <BodySmall lang={currentLanguage}>{selectedJob.city}</BodySmall>
                                    </div>
                                )}
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.created}</Caption>
                                    <BodySmall lang={currentLanguage}>{format(new Date(selectedJob.created_at), 'PPP')}</BodySmall>
                                </div>
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.updated}</Caption>
                                    <BodySmall lang={currentLanguage}>{format(new Date(selectedJob.updated_at), 'PP p')}</BodySmall>
                                </div>
                            </div>

                            {/* ─── Admin Actions ─── */}
                            {confirmAction ? (
                                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl space-y-3">
                                    <BodySmall lang={currentLanguage} className="text-destructive font-medium text-center">
                                        {confirmAction === 'complete' ? t.confirmComplete : t.confirmCancel}
                                    </BodySmall>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 rounded-full"
                                            onClick={() => setConfirmAction(null)}
                                            disabled={isActionPending}
                                        >
                                            {t.goBack}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="flex-1 rounded-full"
                                            disabled={isActionPending}
                                            onClick={() => {
                                                if (confirmAction === 'complete') {
                                                    forceCompleteMutation.mutate(selectedJob.id);
                                                } else {
                                                    forceCancelMutation.mutate(selectedJob.id);
                                                }
                                            }}
                                        >
                                            {isActionPending ? '...' : t.confirm}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {!['completed', 'closed'].includes(selectedJob.status) && (
                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                                onClick={() => setConfirmAction('complete')}
                                            >
                                                <CheckCircle2 size={16} />
                                                {t.forceComplete}
                                            </Button>
                                            {!['cancelled'].includes(selectedJob.status) && (
                                                <Button
                                                    variant="destructive"
                                                    className="flex-1 rounded-full gap-1.5"
                                                    onClick={() => setConfirmAction('cancel')}
                                                >
                                                    <XCircle size={16} />
                                                    {t.forceCancel}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <Button variant="outline" className="w-full rounded-full" onClick={() => { setSelectedJob(null); setConfirmAction(null); }}>
                                {t.close}
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

