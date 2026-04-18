import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Flag,
    User,
    MessageCircle,
    CheckCircle,
    XCircle,
    Eye,
    Clock,
    AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminReportsProps {
    currentLanguage: 'en' | 'ar';
}

interface ReportProfile {
    id: string;
    full_name: string | null;
    email: string | null;
    company_name: string | null;
}

interface UserReport {
    id: string;
    status: string;
    reason: string;
    details: string | null;
    created_at: string;
    reporter_id: string | null;
    reported_user_id: string | null;
    reporter: ReportProfile | null;
    reported_user: ReportProfile | null;
}

interface RawReport {
    id: string;
    status: string;
    reason: string;
    details: string | null;
    created_at: string;
    reporter_id: string | null;
    reported_user_id: string | null;
}

const REASON_LABELS: Record<string, { en: string; ar: string }> = {
    inappropriate_image: { en: 'Inappropriate Image', ar: 'صورة غير لائقة' },
    harassment: { en: 'Harassment', ar: 'مضايقة' },
    spam: { en: 'Spam/Fake', ar: 'رسائل مزعجة' },
    scam: { en: 'Scam/Fraud', ar: 'احتيال' },
    other: { en: 'Other', ar: 'أخرى' },
};

const STATUS_CONFIG: Record<string, { en: string; ar: string; color: string; icon: React.ElementType }> = {
    pending: { en: 'Pending', ar: 'معلق', color: 'bg-yellow-500', icon: Clock },
    reviewed: { en: 'Reviewing', ar: 'قيد المراجعة', color: 'bg-blue-500', icon: Eye },
    resolved: { en: 'Resolved', ar: 'تم الحل', color: 'bg-green-500', icon: CheckCircle },
    dismissed: { en: 'Dismissed', ar: 'مرفوض', color: 'bg-gray-500', icon: XCircle },
};

export const AdminReports = ({ currentLanguage }: AdminReportsProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isArabic = currentLanguage === 'ar';

    const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [activeFilter, setActiveFilter] = useState<'pending' | 'all'>('pending');

    const { data: reports, isLoading } = useQuery({
        queryKey: ['admin-mobile-reports', activeFilter],
        queryFn: async () => {
            try {
                let query = supabase
                    .from('user_reports')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (activeFilter === 'pending') {
                    query = query.in('status', ['pending', 'reviewed']);
                }

                const { data: reportsData, error } = await query;
                if (error) throw error;
                if (!reportsData || reportsData.length === 0) return [];

                // Manually fetch profiles since FK points to auth.users, not public.profiles
                const userIds = new Set<string>();
                (reportsData as RawReport[]).forEach((r) => {
                    if (r.reporter_id) userIds.add(r.reporter_id);
                    if (r.reported_user_id) userIds.add(r.reported_user_id);
                });

                if (userIds.size === 0) return reportsData;

                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, company_name')
                    .in('id', Array.from(userIds));

                const profileMap = new Map(profiles?.map(p => [p.id, p]));

                return (reportsData as RawReport[]).map((r): UserReport => ({
                    ...r,
                    reporter: r.reporter_id ? (profileMap.get(r.reporter_id) ?? null) : null,
                    reported_user: r.reported_user_id ? (profileMap.get(r.reported_user_id) ?? null) : null,
                }));

            } catch (e) {
                if (import.meta.env.DEV) console.warn('user_reports error:', e);
                return [];
            }
        },
    });

    const updateReportMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
            const updateData: Record<string, unknown> = {
                status,
                resolved_by: user?.id,
                resolved_at: new Date().toISOString(),
            };
            if (notes) updateData.resolution_notes = notes;

            const { error } = await supabase
                .from('user_reports')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-mobile-reports'] });
            queryClient.invalidateQueries({ queryKey: ['admin-mobile-stats'] });
            toast.success(isArabic ? 'تم التحديث بنجاح' : 'Report updated');
            setSelectedReport(null);
            setResolutionNotes('');
        },
    });

    const content = {
        en: {
            title: 'User Reports',
            pending: 'Pending',
            all: 'All',
            noReports: 'No reports found',
            reportedUser: 'Reported User',
            reporter: 'Reporter',
            reason: 'Reason',
            details: 'Details',
            resolutionNotes: 'Resolution Notes',
            dismiss: 'Dismiss',
            resolve: 'Resolve',
            review: 'Start Review',
        },
        ar: {
            title: 'بلاغات المستخدمين',
            pending: 'معلق',
            all: 'الكل',
            noReports: 'لا توجد بلاغات',
            reportedUser: 'المستخدم المُبلغ عنه',
            reporter: 'المُبلغ',
            reason: 'السبب',
            details: 'التفاصيل',
            resolutionNotes: 'ملاحظات الحل',
            dismiss: 'رفض',
            resolve: 'حل',
            review: 'بدء المراجعة',
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
                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <Button
                        variant={activeFilter === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('pending')}
                        className="rounded-full"
                    >
                        {t.pending}
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

                {/* Reports List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : reports && reports.length > 0 ? (
                    <div className="space-y-3">
                        {reports.map((report) => {
                            const statusConfig = STATUS_CONFIG[report.status];
                            const StatusIcon = statusConfig?.icon || Clock;

                            return (
                                <SoftCard
                                    key={report.id}
                                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                            <Flag size={18} className="text-red-500" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={cn(statusConfig?.color, 'text-white text-xs')}>
                                                    {statusConfig?.[currentLanguage]}
                                                </Badge>
                                                <Caption lang={currentLanguage} className="text-muted-foreground">
                                                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                                </Caption>
                                            </div>

                                            <BodySmall lang={currentLanguage} className="font-medium mb-1">
                                                {REASON_LABELS[report.reason]?.[currentLanguage] || report.reason}
                                            </BodySmall>

                                            <Caption lang={currentLanguage} className="text-muted-foreground line-clamp-1">
                                                {report.reported_user?.company_name || report.reported_user?.full_name || 'Unknown'}
                                            </Caption>
                                        </div>
                                    </div>
                                </SoftCard>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noReports}</Body>
                    </div>
                )}
            </div>

            {/* Report Detail Sheet */}
            <Sheet open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
                            {REASON_LABELS[selectedReport?.reason]?.[currentLanguage]}
                        </SheetTitle>
                    </SheetHeader>

                    {selectedReport && (
                        <div className="mt-6 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
                            {/* Reported User */}
                            <div className="p-3 bg-muted rounded-xl">
                                <Caption lang={currentLanguage} className="text-muted-foreground mb-1">
                                    {t.reportedUser}
                                </Caption>
                                <BodySmall lang={currentLanguage} className="font-medium">
                                    {selectedReport.reported_user?.company_name || selectedReport.reported_user?.full_name}
                                </BodySmall>
                            </div>

                            {/* Reporter */}
                            <div className="p-3 bg-muted rounded-xl">
                                <Caption lang={currentLanguage} className="text-muted-foreground mb-1">
                                    {t.reporter}
                                </Caption>
                                <BodySmall lang={currentLanguage} className="font-medium">
                                    {selectedReport.reporter?.full_name}
                                </BodySmall>
                            </div>

                            {/* Details */}
                            {selectedReport.details && (
                                <div className="p-3 bg-muted rounded-xl">
                                    <Caption lang={currentLanguage} className="text-muted-foreground mb-1">
                                        {t.details}
                                    </Caption>
                                    <BodySmall lang={currentLanguage}>
                                        {selectedReport.details}
                                    </BodySmall>
                                </div>
                            )}

                            {/* Resolution Notes */}
                            <div>
                                <Caption lang={currentLanguage} className="text-muted-foreground mb-2">
                                    {t.resolutionNotes}
                                </Caption>
                                <Textarea
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    rows={3}
                                    className={isArabic ? 'text-right font-ar-body' : ''}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => updateReportMutation.mutate({
                                        id: selectedReport.id,
                                        status: 'dismissed',
                                        notes: resolutionNotes
                                    })}
                                >
                                    <XCircle size={16} className={isArabic ? 'ml-2' : 'mr-2'} />
                                    {t.dismiss}
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => updateReportMutation.mutate({
                                        id: selectedReport.id,
                                        status: 'resolved',
                                        notes: resolutionNotes
                                    })}
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
