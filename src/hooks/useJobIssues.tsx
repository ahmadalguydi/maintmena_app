import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type IssueType = 'no_response' | 'no_show' | 'quality' | 'price_change' | 'exit';
export type IssueStatus = 'pending' | 'responded' | 'awaiting_agreement' | 'needs_attention' | 'escalated' | 'no_agreement' | 'resolved';
export type OutcomeType =
    | 'no_response_warning'
    | 'no_response_cancel'
    | 'no_show_warning'
    | 'no_show_cancel'
    | 'quality_redo'
    | 'quality_refund'
    | 'price_change_accept'
    | 'price_change_reject'
    | 'exit_buyer'
    | 'exit_seller';

export interface JobIssue {
    id: string;
    job_type: 'request' | 'booking';
    job_id: string;
    issue_type: IssueType;
    outcome_selected: OutcomeType;
    status: IssueStatus;
    raised_by: string;
    raised_chip?: string;
    raised_note?: string;
    response_note?: string;
    resolution_type?: 'buyer_favor' | 'seller_favor' | 'mutual';
    resolved_at?: string;
    created_at: string;
    updated_at: string;
}

export const OUTCOME_LABELS: Record<OutcomeType, { en: string; ar: string }> = {
    no_response_warning: { en: 'No Response - Warning', ar: 'لا رد - تحذير' },
    no_response_cancel: { en: 'No Response - Cancel', ar: 'لا رد - إلغاء' },
    no_show_warning: { en: 'No Show - Warning', ar: 'لم يحضر - تحذير' },
    no_show_cancel: { en: 'No Show - Cancel', ar: 'لم يحضر - إلغاء' },
    quality_redo: { en: 'Quality Issue - Redo Work', ar: 'مشكلة جودة - إعادة العمل' },
    quality_refund: { en: 'Quality Issue - Refund', ar: 'مشكلة جودة - استرداد' },
    price_change_accept: { en: 'Price Change - Accept', ar: 'تغيير السعر - قبول' },
    price_change_reject: { en: 'Price Change - Reject', ar: 'تغيير السعر - رفض' },
    exit_buyer: { en: 'Exit Request - Buyer', ar: 'طلب خروج - المشتري' },
    exit_seller: { en: 'Exit Request - Seller', ar: 'طلب خروج - البائع' },
};

interface UseJobIssuesProps {
    jobType: 'request' | 'booking';
    jobId: string;
    userId?: string;
}

export function useJobIssues({ jobType, jobId, userId }: UseJobIssuesProps) {
    const queryClient = useQueryClient();

    const { data: issues, isLoading, error } = useQuery({
        queryKey: ['job-issues', jobType, jobId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_issues')
                .select('*')
                .eq('job_type', jobType)
                .eq('job_id', jobId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as JobIssue[];
        },
        enabled: !!jobId,
    });

    const raiseIssueMutation = useMutation({
        mutationFn: async (issue: {
            issue_type: IssueType;
            outcome_selected: OutcomeType;
            raised_chip?: string;
            raised_note?: string;
        }) => {
            if (!userId) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('job_issues')
                .insert({
                    job_type: jobType,
                    job_id: jobId,
                    issue_type: issue.issue_type,
                    outcome_selected: issue.outcome_selected,
                    raised_by: userId,
                    raised_chip: issue.raised_chip,
                    raised_note: issue.raised_note,
                    status: 'pending',
                    response_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-issues', jobType, jobId] });
        },
    });

    const respondToIssueMutation = useMutation({
        mutationFn: async ({ issueId, responseNote }: { issueId: string; responseNote: string }) => {
            const { error } = await supabase
                .from('job_issues')
                .update({
                    response_note: responseNote,
                    status: 'responded',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', issueId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-issues', jobType, jobId] });
        },
    });

    const resolveIssueMutation = useMutation({
        mutationFn: async ({ issueId, accepted }: { issueId: string; accepted: boolean }) => {
            const { error } = await supabase
                .from('job_issues')
                .update({
                    status: accepted ? 'resolved' : 'no_agreement',
                    resolved_at: accepted ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', issueId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-issues', jobType, jobId] });
        },
    });

    const activeIssue = issues?.find(i => !['resolved', 'no_agreement'].includes(i.status));
    const hasActiveIssue = !!activeIssue;

    return {
        issues,
        activeIssue,
        hasActiveIssue,
        isLoading,
        error,
        raiseIssue: raiseIssueMutation.mutate,
        isRaisingIssue: raiseIssueMutation.isPending,
        respondToIssue: respondToIssueMutation.mutate,
        isRespondingToIssue: respondToIssueMutation.isPending,
        resolveIssue: resolveIssueMutation.mutate,
        isResolvingIssue: resolveIssueMutation.isPending,
    };
}

// Hook for getting active issue on a job
export function useActiveJobIssue(jobId: string, jobType: 'request' | 'booking') {
    return useQuery({
        queryKey: ['active-job-issue', jobType, jobId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('job_issues')
                .select('*')
                .eq('job_type', jobType)
                .eq('job_id', jobId)
                .not('status', 'in', '("resolved","no_agreement")')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data as JobIssue | null;
        },
        enabled: !!jobId,
    });
}

// Hook for closing/resolving an issue
export function useCloseIssue() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ issueId, resolutionType }: { issueId: string; resolutionType: 'accepted' | 'rejected' }) => {
            const newStatus = resolutionType === 'accepted' ? 'resolved' : 'escalated';

            const { error } = await supabase
                .from('job_issues')
                .update({
                    status: newStatus,
                    resolution_type: resolutionType === 'accepted' ? 'mutual' : undefined,
                    resolved_at: resolutionType === 'accepted' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', issueId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-job-issue'] });
            queryClient.invalidateQueries({ queryKey: ['job-issues'] });
            queryClient.invalidateQueries({ queryKey: ['admin-issues'] });
        },
    });
}

// Hook for batch fetching issue statuses for multiple jobs
interface JobReference {
    id: string;
    type: 'request' | 'booking';
}

export function useJobIssuesMap(jobs: JobReference[]) {
    return useQuery({
        queryKey: ['job-issues-map', jobs.map(j => `${j.type}:${j.id}`).join(',')],
        queryFn: async () => {
            if (jobs.length === 0) return new Map<string, IssueStatus>();

            // Fetch all active issues for the given jobs
            const jobIds = jobs.map(j => j.id);

            const { data, error } = await supabase
                .from('job_issues')
                .select('job_id, status')
                .in('job_id', jobIds)
                .not('status', 'in', '("resolved","no_agreement")');

            if (error) {
                console.error('Error fetching job issues map:', error);
                return new Map<string, IssueStatus>();
            }

            // Create a map of job_id -> issue status
            const issueMap = new Map<string, IssueStatus>();
            (data || []).forEach((issue: { job_id: string; status: IssueStatus }) => {
                // Only keep the most recent/important status for each job
                if (!issueMap.has(issue.job_id)) {
                    issueMap.set(issue.job_id, issue.status);
                }
            });

            return issueMap;
        },
        enabled: jobs.length > 0,
        staleTime: 30 * 1000, // 30 seconds cache
    });
}
