import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GC_TIME } from '@/lib/queryConfig';

interface EarningsData {
    thisMonth: number;
    lastMonth: number;
    completedJobs: number;
    pendingPayments: number;
    recentTransactions: {
        id: string;
        amount: number;
        type: string;
        service_type: string;
        date: string;
        status: string;
    }[];
}

interface CompletedRow {
    id: string;
    budget: number | null;
    final_amount: number | null;
    status: string;
    created_at: string;
    category: string | null;
    updated_at: string | null;
}

interface PendingRow {
    budget: number | null;
    final_amount: number | null;
}

interface EarningsTransaction {
    id: string;
    amount: number;
    type: string;
    service_type: string;
    date: string;
    status: string;
}

export function useSellerEarnings() {
    const { user } = useAuth();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['seller-earnings', user?.id],
        queryFn: async (): Promise<EarningsData> => {
            if (!user?.id) {
                return { thisMonth: 0, lastMonth: 0, completedJobs: 0, pendingPayments: 0, recentTransactions: [] };
            }

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

            // Fetch only the jobs completed in the last 2 months — avoids pulling the entire
            // history when we only display thisMonth / lastMonth figures.
            const { data: completedRequests } = await (supabase as any)
                .from('maintenance_requests')
                .select('id, budget, final_amount, status, created_at, category, updated_at')
                .eq('assigned_seller_id', user.id)
                .in('status', ['completed', 'paid'])
                .gte('updated_at', startOfLastMonth)
                .order('updated_at', { ascending: false })
                .limit(200);

            // Calculate earnings from completed jobs
            const allCompleted: EarningsTransaction[] = (completedRequests || []).map((r: CompletedRow) => ({
                id: r.id,
                amount: r.final_amount || r.budget || 0,
                type: 'request',
                service_type: r.category || 'General',
                date: r.updated_at || r.created_at,
                status: r.status,
            }));

            // This month earnings
            const thisMonth = allCompleted
                .filter((t) => new Date(t.date) >= new Date(startOfMonth))
                .reduce((sum, t) => sum + t.amount, 0);

            // Last month earnings
            const lastMonth = allCompleted
                .filter((t) => {
                    const d = new Date(t.date);
                    return d >= new Date(startOfLastMonth) && d <= new Date(endOfLastMonth);
                })
                .reduce((sum, t) => sum + t.amount, 0);

            // Pending — accepted but not yet completed/paid
            const { data: pendingRequests } = await (supabase as any)
                .from('maintenance_requests')
                .select('budget, final_amount')
                .eq('assigned_seller_id', user.id)
                .in('status', ['accepted', 'en_route', 'arrived', 'in_progress']);

            const pendingPayments = (pendingRequests || []).reduce((sum: number, r: PendingRow) => sum + (r.final_amount || r.budget || 0), 0);

            // Sort transactions by most recent
            const recentTransactions = [...allCompleted]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10);

            return {
                thisMonth,
                lastMonth,
                completedJobs: allCompleted.length,
                pendingPayments,
                recentTransactions,
            };
        },
        enabled: !!user?.id,
        staleTime: 60_000, // 1 minute — earnings data doesn't need sub-minute freshness
        gcTime: GC_TIME.LONG,
    });

    return {
        earnings: data || { thisMonth: 0, lastMonth: 0, completedJobs: 0, pendingPayments: 0, recentTransactions: [] },
        isLoading,
        refetch,
    };
}
