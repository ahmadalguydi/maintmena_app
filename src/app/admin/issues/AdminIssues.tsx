import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    AlertTriangle,
    Clock,
    CheckCircle,
    User,
    MessageCircle,
    ChevronRight,
    Phone,
    Wrench,
    DollarSign,
    XCircle,
    ThumbsUp,
    ThumbsDown,
    Scale,
    type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { JobIssue, OUTCOME_LABELS, IssueType, IssueStatus } from '@/hooks/useJobIssues';

interface AdminIssuesProps {
    currentLanguage: 'en' | 'ar';
}

const statusConfig: Record<IssueStatus, { label: { en: string; ar: string }; color: string }> = {
    pending: { label: { en: 'Pending', ar: 'معلق' }, color: 'bg-orange-500' },
    responded: { label: { en: 'Responded', ar: 'تم الرد' }, color: 'bg-blue-500' },
    awaiting_agreement: { label: { en: 'Awaiting', ar: 'بانتظار' }, color: 'bg-yellow-500' },
    needs_attention: { label: { en: 'Needs Attention', ar: 'يحتاج اهتمام' }, color: 'bg-red-500' },
    escalated: { label: { en: 'Escalated', ar: 'مصعّد' }, color: 'bg-red-600' },
    no_agreement: { label: { en: 'No Agreement', ar: 'لا اتفاق' }, color: 'bg-gray-500' },
    resolved: { label: { en: 'Resolved', ar: 'محلول' }, color: 'bg-green-500' },
};

const issueTypeIcons: Record<IssueType, LucideIcon> = {
    no_response: Phone,
    no_show: XCircle,
    quality: Wrench,
    price_change: DollarSign,
    exit: XCircle,
};

export const AdminIssues = ({ currentLanguage }: AdminIssuesProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isArabic = currentLanguage === 'ar';
    const [activeFilter, setActiveFilter] = useState<'active' | 'resolved' | 'all'>('active');
    const [selectedIssue, setSelectedIssue] = useState<JobIssue | null>(null);

    const { data: issues, isLoading } = useQuery({
        queryKey: ['admin-issues', activeFilter],
        queryFn: async () => {
            // job_issues table may not yet be in generated Supabase types
            const db = supabase as unknown as typeof supabase;
            let query = db
                .from('job_issues' as Parameters<typeof supabase.from>[0])
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (activeFilter === 'active') {
                query = query.in('status', ['needs_attention', 'escalated', 'pending', 'responded', 'awaiting_agreement', 'no_agreement']);
            } else if (activeFilter === 'resolved') {
                query = query.eq('status', 'resolved');
            }

            const { data, error } = await query;
            if (error) {
                if (import.meta.env.DEV) console.error('Error fetching issues:', error);
                return [];
            }
            return data as JobIssue[];
        },
    });

    // Admin resolve mutation
    const resolveIssueMutation = useMutation({
        mutationFn: async ({ issueId, resolution, notes }: { issueId: string; resolution: 'buyer_favor' | 'seller_favor' | 'mutual'; notes?: string }) => {
            // Update issue status to resolved with admin notes
            const db = supabase as unknown as typeof supabase;
            const { error } = await db
                .from('job_issues' as Parameters<typeof supabase.from>[0])
                .update({
                    status: 'resolved',
                    resolution_type: resolution,
                    resolved_at: new Date().toISOString(),
                    // Could add admin_notes field to response_note
                })
                .eq('id', issueId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم حل المشكلة' : 'Issue resolved');
            queryClient.invalidateQueries({ queryKey: ['admin-issues'] });
            setSelectedIssue(null);
        },
        onError: () => {
            toast.error(isArabic ? 'حدث خطأ' : 'Error resolving issue');
        },
    });

    const content = {
        en: {
            title: 'Escalated Issues',
            active: 'Active',
            resolved: 'Resolved',
            all: 'All',
            noIssues: 'No issues found',
            viewDetails: 'View Details',
            resolve: 'Resolve',
            buyerFavor: 'Favor Buyer',
            sellerFavor: 'Favor Seller',
            mutual: 'Mutual Resolution',
            raisedBy: 'Raised by',
            jobType: 'Job Type',
            issueType: 'Issue Type',
        },
        ar: {
            title: 'المشاكل المصعّدة',
            active: 'نشط',
            resolved: 'محلول',
            all: 'الكل',
            noIssues: 'لا توجد مشاكل',
            viewDetails: 'عرض التفاصيل',
            resolve: 'حل',
            buyerFavor: 'لصالح المشتري',
            sellerFavor: 'لصالح البائع',
            mutual: 'حل متبادل',
            raisedBy: 'رفع بواسطة',
            jobType: 'نوع العمل',
            issueType: 'نوع المشكلة',
        },
    };

    const t = content[currentLanguage];

    const activeCount = issues?.filter(i => ['needs_attention', 'escalated', 'no_agreement'].includes(i.status)).length || 0;

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
                rightContent={
                    activeCount > 0 && (
                        <Badge className="bg-red-500">{activeCount}</Badge>
                    )
                }
            />

            <div className="px-4 py-4 space-y-4">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <Button
                        variant={activeFilter === 'active' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('active')}
                        className="rounded-full gap-1"
                    >
                        <AlertTriangle size={14} />
                        {t.active}
                    </Button>
                    <Button
                        variant={activeFilter === 'resolved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('resolved')}
                        className="rounded-full gap-1"
                    >
                        <CheckCircle size={14} />
                        {t.resolved}
                    </Button>
                    <Button
                        variant={activeFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                        className="rounded-full"
                    >
                        {t.all}
                    </Button>
                </div>

                {/* Issues List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : issues && issues.length > 0 ? (
                    <div className="space-y-3">
                        {issues.map((issue) => {
                            const TypeIcon = issueTypeIcons[issue.issue_type] || MessageCircle;
                            const statusConf = statusConfig[issue.status];
                            const outcomeLabel = OUTCOME_LABELS[issue.outcome_selected];

                            return (
                                <SoftCard
                                    key={issue.id}
                                    className={cn(
                                        "p-4 cursor-pointer hover:shadow-md transition-shadow",
                                        ['needs_attention', 'escalated'].includes(issue.status) && "border-red-200 bg-red-50/50"
                                    )}
                                    onClick={() => setSelectedIssue(issue)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            'p-2 rounded-xl',
                                            ['needs_attention', 'escalated'].includes(issue.status)
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-primary/10 text-primary'
                                        )}>
                                            <TypeIcon className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <BodySmall lang={currentLanguage} className="font-medium">
                                                    {isArabic ? outcomeLabel?.ar : outcomeLabel?.en}
                                                </BodySmall>
                                                <Badge className={cn('text-xs', statusConf.color)}>
                                                    {isArabic ? statusConf.label.ar : statusConf.label.en}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <Caption lang={currentLanguage} className="text-muted-foreground">
                                                    {issue.job_type === 'request'
                                                        ? (isArabic ? 'طلب صيانة' : 'Maintenance Request')
                                                        : (isArabic ? 'حجز' : 'Booking')}
                                                </Caption>
                                                <span className="text-muted-foreground">•</span>
                                                <Caption className="text-muted-foreground">
                                                    {formatDistanceToNow(new Date(issue.created_at), {
                                                        addSuffix: true,
                                                        locale: isArabic ? ar : enUS
                                                    })}
                                                </Caption>
                                            </div>

                                            {issue.raised_note && (
                                                <Caption lang={currentLanguage} className="text-muted-foreground line-clamp-1">
                                                    {issue.raised_note}
                                                </Caption>
                                            )}
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </SoftCard>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Scale className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noIssues}</Body>
                    </div>
                )}
            </div>

            {/* Issue Detail Bottom Sheet (simplified) */}
            {selectedIssue && (
                <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedIssue(null)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />

                        <h3 className={cn('text-lg font-semibold', isArabic && 'font-ar-heading')}>
                            {isArabic ? OUTCOME_LABELS[selectedIssue.outcome_selected]?.ar : OUTCOME_LABELS[selectedIssue.outcome_selected]?.en}
                        </h3>

                        {/* Issue details */}
                        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t.jobType}:</span>
                                <span className="text-sm font-medium">{selectedIssue.job_type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{t.issueType}:</span>
                                <span className="text-sm font-medium">{selectedIssue.issue_type}</span>
                            </div>
                            {selectedIssue.raised_chip && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Chip:</span>
                                    <span className="text-sm font-medium">{selectedIssue.raised_chip}</span>
                                </div>
                            )}
                            {selectedIssue.raised_note && (
                                <div>
                                    <span className="text-sm text-muted-foreground">Note:</span>
                                    <p className="text-sm mt-1">{selectedIssue.raised_note}</p>
                                </div>
                            )}
                            {selectedIssue.response_note && (
                                <div className="border-t pt-2 mt-2">
                                    <span className="text-sm text-muted-foreground">Response:</span>
                                    <p className="text-sm mt-1">{selectedIssue.response_note}</p>
                                </div>
                            )}
                        </div>

                        {/* Admin Actions */}
                        {selectedIssue.status !== 'resolved' && (
                            <div className="space-y-3">
                                <p className={cn('text-sm font-medium', isArabic && 'font-ar-body')}>
                                    {t.resolve}:
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => resolveIssueMutation.mutate({
                                            issueId: selectedIssue.id,
                                            resolution: 'buyer_favor'
                                        })}
                                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                                        disabled={resolveIssueMutation.isPending}
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                        {t.buyerFavor}
                                    </Button>
                                    <Button
                                        onClick={() => resolveIssueMutation.mutate({
                                            issueId: selectedIssue.id,
                                            resolution: 'seller_favor'
                                        })}
                                        variant="outline"
                                        className="flex-1 gap-2"
                                        disabled={resolveIssueMutation.isPending}
                                    >
                                        <ThumbsDown className="w-4 h-4" />
                                        {t.sellerFavor}
                                    </Button>
                                </div>
                                <Button
                                    onClick={() => resolveIssueMutation.mutate({
                                        issueId: selectedIssue.id,
                                        resolution: 'mutual'
                                    })}
                                    variant="secondary"
                                    className="w-full gap-2"
                                    disabled={resolveIssueMutation.isPending}
                                >
                                    <Scale className="w-4 h-4" />
                                    {t.mutual}
                                </Button>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setSelectedIssue(null)}
                        >
                            {isArabic ? 'إغلاق' : 'Close'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
