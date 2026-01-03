import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Briefcase, FileText, Calendar, TrendingUp, Star, Award, Target } from 'lucide-react';
import { SoftCard } from '@/components/mobile/SoftCard';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Heading1, Heading2, Body, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { JobTrackingCard } from '@/components/mobile/JobTrackingCard';
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { HaltedJobCard } from '@/components/mobile/HaltedJobCard';
import { PendingContractCard } from '@/components/mobile/PendingContractCard';
import { Button } from '@/components/ui/button';
import { ReviewProgressCard } from '@/components/mobile/ReviewProgressCard';
import { EliteBadge } from '@/components/mobile/EliteBadge';
import { CashSafetyBanner } from '@/components/mobile/CashSafetyBanner';

interface SellerHomeProps {
    currentLanguage: 'en' | 'ar';
}

export const SellerHome = ({ currentLanguage: propLanguage }: SellerHomeProps) => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { formatAmount } = useCurrency();
    const queryClient = useQueryClient();
    const [showServicesPrompt, setShowServicesPrompt] = useState(false);
    const currentLanguage = propLanguage || ((typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null) as 'en' | 'ar') || 'ar';

    // React Query for stats - cached for 30 seconds
    const { data: stats = {
        monthlyEarnings: 0,
        pendingEarnings: 0,
        lastMonthEarnings: 0,
        activeQuotes: 0,
        totalPendingActions: 0,
        newJobs: 0,
        todayBookings: 0,
        rating: 0,
        completedJobs: 0,
        winRate: 0
    } } = useQuery({
        queryKey: ['seller-home-stats', user?.id],
        queryFn: async () => {
            if (!user) throw new Error('No user');

            // Get all executed AND completed contracts (active + finished jobs)
            const { data: executedContracts } = await supabase
                .from('contracts')
                .select('id, request_id, booking_id, quote_id, metadata, status')
                .eq('seller_id', user.id)
                .in('status', ['executed', 'completed']);

            if (!executedContracts || executedContracts.length === 0) {
                // No contracts at all
                var monthlyEarnings = 0;
                var pendingEarnings = 0;
                var lastMonthEarnings = 0;
            } else {
                // Step 2: Fetch requests and bookings to check completion status
                const requestIds = executedContracts.filter(c => c.request_id).map(c => c.request_id);
                const bookingIds = executedContracts.filter(c => c.booking_id).map(c => c.booking_id);

                // Fetch requests with ALL fields (to get any price field)
                let requests: any[] = [];
                if (requestIds.length > 0) {
                    const { data } = await supabase
                        .from('maintenance_requests')
                        .select('*')
                        .in('id', requestIds);
                    requests = data || [];
                }

                // Fetch bookings with ALL fields (to get any price field)
                let bookings: any[] = [];
                if (bookingIds.length > 0) {
                    const { data } = await supabase
                        .from('booking_requests')
                        .select('*')
                        .in('id', bookingIds);
                    bookings = data || [];
                }

                // Also get quote prices
                const quoteIds = executedContracts.map(c => c.quote_id).filter(Boolean);
                let quotes: any[] = [];
                if (quoteIds.length > 0) {
                    const { data } = await supabase
                        .from('quote_submissions')
                        .select('id, price')
                        .in('id', quoteIds);
                    quotes = data || [];
                }
                const quoteMap = new Map(quotes.map(q => [q.id, q.price]));

                console.log('[SellerHome] Earnings debug:', {
                    executedContractsCount: executedContracts.length,
                    requestIdsCount: requestIds.length,
                    bookingIdsCount: bookingIds.length,
                    requestsFetched: requests.length,
                    bookingsFetched: bookings.length,
                    quotesFetched: quotes.length,
                    contracts: executedContracts.map(c => ({ id: c.id, request_id: c.request_id, booking_id: c.booking_id, quote_id: c.quote_id }))
                });

                // Calculate completed (both marked complete) vs pending (not both)
                let completedTotal = 0;
                let pendingTotal = 0;

                for (const contract of executedContracts) {
                    // Find the job (request or booking)
                    const request = requests.find(r => r.id === contract.request_id);
                    const booking = bookings.find(b => b.id === contract.booking_id);
                    const job = request || booking;

                    if (!job) continue;

                    // Determine price: job final_agreed_price > quote price > metadata > budget/final_amount
                    // Priority matches History.tsx: job.final_agreed_price || job.final_amount || job.budget
                    const jobPrice = job.final_agreed_price || job.final_amount || job.budget;
                    const quotePrice = contract.quote_id ? quoteMap.get(contract.quote_id) : null;
                    const metadataPrice = (contract.metadata as any)?.final_price;
                    const price = jobPrice || quotePrice || metadataPrice || 0;

                    console.log('[SellerHome] Job price:', {
                        contractId: contract.id,
                        contractStatus: (contract as any).status,
                        jobPrice,
                        quotePrice,
                        metadataPrice,
                        finalPrice: price,
                        buyerMarked: job.buyer_marked_complete,
                        sellerMarked: job.seller_marked_complete,
                        isCompleted: job.buyer_marked_complete && job.seller_marked_complete
                    });

                    // Check if BOTH marked complete
                    const isCompleted = job.buyer_marked_complete && job.seller_marked_complete;

                    if (isCompleted) {
                        completedTotal += price;
                    } else {
                        pendingTotal += price;
                    }
                }

                var monthlyEarnings = completedTotal;
                var pendingEarnings = pendingTotal;
                var lastMonthEarnings = completedTotal; // For now, use same as completed (proper historical data would need date filtering)
            }
            // === PENDING RESPONSES: Count items needing seller action ===

            // 1. Quotes needing seller action (revision requested, or pending negotiation)
            const { data: quotesData } = await supabase
                .from('quote_submissions')
                .select('id, status, maintenance_requests(status)')
                .eq('seller_id', user.id)
                .in('status', ['revision_requested']); // Only revision requests need action

            // Filter out quotes where the request is completed/closed/in_progress
            const quotesNeedingAction = quotesData?.filter(q => {
                const reqStatus = (q.maintenance_requests as any)?.status;
                return reqStatus !== 'completed' && reqStatus !== 'closed' && reqStatus !== 'in_progress';
            }) || [];

            // 2. Bookings waiting for seller to send an offer (status = 'pending')
            const { count: pendingBookingsCount } = await supabase
                .from('booking_requests')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id)
                .eq('status', 'pending'); // Pending = waiting for seller to respond with offer

            // 3. Contracts pending seller signature
            const { count: pendingContractsCount } = await supabase
                .from('contracts')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id)
                .eq('status', 'pending_seller'); // Waiting for seller to sign

            // Total pending responses = quotes needing action + bookings needing offer + contracts needing signature
            const pendingResponsesCount = quotesNeedingAction.length + (pendingBookingsCount || 0) + (pendingContractsCount || 0);

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const { count: newJobsCount } = await supabase
                .from('maintenance_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'open')
                .gte('created_at', yesterday.toISOString());

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const { count: bookingsCount } = await supabase
                .from('booking_requests')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id)
                .gte('proposed_start_date', today.toISOString())
                .lt('proposed_start_date', tomorrow.toISOString());

            const { data: profile } = await supabase
                .from('profiles')
                .select('seller_rating, completed_projects')
                .eq('id', user.id)
                .single();

            const { count: totalQuotes } = await supabase
                .from('quote_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id);

            const { count: acceptedQuotes } = await supabase
                .from('quote_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id)
                .eq('status', 'accepted');

            const winRate = totalQuotes && totalQuotes > 0 ? Math.round((acceptedQuotes || 0) / totalQuotes * 100) : 0;

            return {
                monthlyEarnings,
                pendingEarnings,
                lastMonthEarnings,
                activeQuotes: quotesNeedingAction.length || 0,
                totalPendingActions: pendingResponsesCount || 0,
                newJobs: newJobsCount || 0,
                todayBookings: bookingsCount || 0,
                rating: profile?.seller_rating || 0,
                completedJobs: profile?.completed_projects || 0,
                winRate
            };
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 30 * 1000, // 30 seconds - shorter for more accurate counts
        refetchOnWindowFocus: true, // Refetch when user returns to the tab
        placeholderData: (prev) => prev, // Keep showing old data while fetching
    });

    // React Query for pending contract - cached for 1 minute
    const { data: pendingContract } = useQuery({
        queryKey: ['seller-pending-contract', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await supabase
                .from('contracts')
                .select(`
                    *,
                    buyer:profiles!contracts_buyer_id_fkey(company_name, full_name),
                    quote:quote_submissions!contracts_quote_id_fkey(price, estimated_duration, start_date),
                    booking:booking_requests!contracts_booking_id_fkey(final_agreed_price, final_amount, job_description, proposed_start_date),
                    maintenance_request:maintenance_requests!contracts_request_id_fkey(description, preferred_start_date),
                    contract_signatures(user_id, version)
                `)
                .eq('seller_id', user.id)
                .eq('status', 'pending_seller')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                const hasSignedCurrentVersion = (data.contract_signatures as any[])?.some(
                    sig => sig.user_id === user.id && sig.version === data.version
                );
                return hasSignedCurrentVersion ? null : data;
            }
            return null;
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 60 * 1000, // 1 minute
    });

    // React Query for active jobs - cached for 1 minute
    const { data: jobsData = { activeJobs: [], haltedJobs: [] } } = useQuery({
        queryKey: ['seller-active-jobs', user?.id],
        queryFn: async () => {
            if (!user?.id) return { activeJobs: [], haltedJobs: [] };

            const { data: executedContracts } = await supabase
                .from('contracts')
                .select('id, request_id, booking_id, quote_id, metadata, created_at')
                .eq('seller_id', user.id)
                .eq('status', 'executed');

            if (!executedContracts || executedContracts.length === 0) {
                return { activeJobs: [], haltedJobs: [] };
            }

            const requestIdsFromContracts = executedContracts.filter(c => c.request_id).map(c => c.request_id);
            const bookingIds = executedContracts.filter(c => c.booking_id).map(c => c.booking_id);
            const quoteIds = executedContracts.filter(c => c.quote_id).map(c => c.quote_id);

            // Fetch quotes
            let quotesMap = new Map();
            if (quoteIds.length > 0) {
                const { data: quotes } = await supabase
                    .from('quote_submissions')
                    .select('id, start_date, estimated_duration')
                    .in('id', quoteIds);
                if (quotes) {
                    quotesMap = new Map(quotes.map(q => [q.id, q]));
                }
            }

            // Create a map of contract details by request/booking ID for easier access
            const contractMap = new Map();
            executedContracts.forEach(c => {
                if (c.request_id) contractMap.set(`req-${c.request_id}`, { ...c, quote: quotesMap.get(c.quote_id) });
                if (c.booking_id) contractMap.set(`book-${c.booking_id}`, { ...c, quote: quotesMap.get(c.quote_id) });
            });

            // Fetch bookings
            let bookingJobs: any[] = [];

            if (bookingIds.length > 0) {
                const { data: bookings } = await supabase
                    .from('booking_requests')
                    .select('*')
                    .in('id', bookingIds);

                if (bookings) {

                    const buyerIds = [...new Set(bookings.map(b => b.buyer_id).filter(Boolean))];
                    if (buyerIds.length > 0) {
                        const { data: buyerProfiles } = await supabase
                            .from('profiles')
                            .select('id, full_name, company_name')
                            .in('id', buyerIds);
                        const profileMap = new Map(buyerProfiles?.map(p => [p.id, p]));

                        // We map them later after we have the requestsMap
                        bookingJobs = bookings.filter(b => !b.buyer_marked_complete || !b.seller_marked_complete)
                            .map(b => ({ ...b, type: 'booking', buyer_profile: profileMap.get(b.buyer_id) }));
                    }
                }
            }

            // Fetch requests
            const allRequestIds = requestIdsFromContracts;
            let requestsMap = new Map();
            let requestJobs: any[] = [];

            if (allRequestIds.length > 0) {
                const { data: requests } = await supabase
                    .from('maintenance_requests')
                    .select('*')
                    .in('id', allRequestIds);

                if (requests) {
                    requestsMap = new Map(requests.map(r => [r.id, r]));

                    // Process Request Jobs (only those explicitly in contracts as requests)
                    const requestsForJobs = requests.filter(r => requestIdsFromContracts.includes(r.id));

                    const buyerIds = [...new Set(requestsForJobs.map(r => r.buyer_id).filter(Boolean))];
                    if (buyerIds.length > 0) {
                        const { data: buyerProfiles } = await supabase
                            .from('profiles')
                            .select('id, full_name, company_name')
                            .in('id', buyerIds);
                        const profileMap = new Map(buyerProfiles?.map(p => [p.id, p]));

                        requestJobs = requestsForJobs
                            .filter(r => !r.buyer_marked_complete || !r.seller_marked_complete)
                            .map(r => {
                                const contract = contractMap.get(`req-${r.id}`);
                                return {
                                    ...r,
                                    type: 'request',
                                    buyer_profile: profileMap.get(r.buyer_id),
                                    contract_date: contract?.quote?.start_date || contract?.metadata?.start_date,
                                    contract_location: contract?.metadata?.location
                                };
                            });
                    }
                }
            }

            // Now enhance booking jobs with contract info
            bookingJobs = bookingJobs.map(b => {
                const contract = contractMap.get(`book-${b.id}`);
                // Get date from: contract quote > contract metadata (start_date or scheduled_date) > seller's counter proposal
                const sellerProposal = b.seller_counter_proposal as any;
                const contractDate = contract?.quote?.start_date ||
                    contract?.metadata?.start_date ||
                    contract?.metadata?.scheduled_date ||
                    sellerProposal?.scheduled_date;
                return {
                    ...b,
                    contract_date: contractDate,
                    contract_location: contract?.metadata?.location
                };
            });

            const allJobs = [...requestJobs, ...bookingJobs];
            return {
                activeJobs: allJobs.filter(j => !j.halted),
                haltedJobs: allJobs.filter(j => j.halted)
            };
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 60 * 1000, // 1 minute
        placeholderData: (prev) => prev,
    });

    const { activeJobs, haltedJobs } = jobsData;

    // Check services configured on mount
    useEffect(() => {
        if (!authLoading && user?.id) {
            checkServicesConfigured();
        }
    }, [user, authLoading]);

    // Real-time subscription for seller updates - invalidates React Query cache
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('seller-home-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'maintenance_requests'
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', user.id] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'booking_requests',
                    filter: `seller_id = eq.${user.id} `
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['seller-home-stats', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', user.id] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contracts',
                    filter: `seller_id = eq.${user.id} `
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['seller-pending-contract', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['seller-active-jobs', user.id] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quote_submissions',
                    filter: `seller_id = eq.${user.id} `
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['seller-home-stats', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient]);

    const checkServicesConfigured = async () => {
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('services_pricing')
            .eq('id', user.id)
            .single();

        const hasServices = profile?.services_pricing &&
            Array.isArray(profile.services_pricing) &&
            profile.services_pricing.length > 0;

        if (!hasServices) {
            setShowServicesPrompt(true);
        }
    };

    const content = {
        ar: {
            thisMonth: 'هذا الشهر',
            quickActions: 'إجراءات سريعة',
            browseJobs: 'تصفح الوظائف',
            myQuotes: 'عروضي',
            todayBookings: 'حجوزات اليوم',
            performance: 'الأداء',
            rating: 'التقييم',
            completedJobs: 'الأعمال المكتملة',
            winRate: 'معدل الفوز',
            pendingResponses: 'الردود المعلقة',
            activeJobs: 'الأعمال النشطة',
            noActiveJobs: 'لا توجد أعمال نشطة',
            haltedJobs: 'الأعمال المتوقفة'
        },
        en: {
            thisMonth: 'This Month',
            quickActions: 'Quick Actions',
            browseJobs: 'Browse Jobs',
            myQuotes: 'My Quotes',
            todayBookings: "Today's Bookings",
            performance: 'Performance',
            rating: 'Rating',
            completedJobs: 'Completed Jobs',
            winRate: 'Win Rate',
            pendingResponses: 'Pending Responses',
            activeJobs: 'Active Jobs',
            noActiveJobs: 'No active jobs',
            haltedJobs: 'Halted Jobs'
        }
    };

    // Show loading state while auth is initializing
    if (authLoading || !user?.id) {
        return (
            <div className="pb-28 min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    <p className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* First-time Services Configuration Prompt */}
            {showServicesPrompt && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowServicesPrompt(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background rounded-3xl p-6 max-w-md w-full shadow-2xl"
                    >
                        <div className="text-center space-y-4">
                            <div className="text-6xl">🔧</div>
                            <Heading2 lang={currentLanguage}>
                                {currentLanguage === 'ar' ? 'أضف خدماتك' : 'Add Your Services'}
                            </Heading2>
                            <Body lang={currentLanguage} className="text-muted-foreground">
                                {currentLanguage === 'ar'
                                    ? 'لكي يتمكن العملاء من العثور عليك وحجزك، يجب عليك أولاً إضافة الخدمات التي تقدمها مع الأسعار'
                                    : 'To allow clients to find and book you, please add the services you offer along with pricing'}
                            </Body>
                            <Button
                                size="lg"
                                className="w-full"
                                onClick={() => {
                                    setShowServicesPrompt(false);
                                    navigate('/app/seller/profile/manage-services');
                                }}
                            >
                                {currentLanguage === 'ar' ? 'إضافة الخدمات الآن' : 'Add Services Now'}
                            </Button>
                            <button
                                onClick={() => setShowServicesPrompt(false)}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {currentLanguage === 'ar' ? 'لاحقاً' : 'Later'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                {/* Earnings Header */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 pt-12 text-white">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <p className={cn(
                            'text-sm opacity-90 mb-1',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}>
                            {currentLanguage === 'ar' ? '💰 الأرباح المكتسبة' : '💰 Monthly Earnings'}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <DollarSign size={32} />
                                <h1 className={cn(
                                    'text-4xl font-bold',
                                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                                )}>
                                    {formatAmount(stats.monthlyEarnings, 'SAR')}
                                </h1>
                            </div>

                            {/* Pending Earnings Badge - Inline */}
                            {stats.pendingEarnings > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <span className={cn(
                                        'text-xs font-medium',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        +{formatAmount(stats.pendingEarnings, 'SAR')} {currentLanguage === 'ar' ? 'قيد العمل' : 'pending'}
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        <div className={cn(
                            'flex items-center gap-1 mt-2 text-sm',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}>
                            <TrendingUp size={16} />
                            <span>
                                {(() => {
                                    if (stats.monthlyEarnings === 0 && stats.pendingEarnings === 0) {
                                        return currentLanguage === 'ar' ? 'ابدأ الكسب الآن!' : 'Start earning now!';
                                    }
                                    if (stats.monthlyEarnings === 0 && stats.pendingEarnings > 0) {
                                        return currentLanguage === 'ar' ? 'أعمال جارية!' : 'Work in progress!';
                                    }
                                    if (stats.lastMonthEarnings === 0) {
                                        return currentLanguage === 'ar' ? 'رائع! أكملت أول أعمالك!' : 'Great! First jobs completed!';
                                    }
                                    const growthPercent = Math.round(((stats.monthlyEarnings - stats.lastMonthEarnings) / Math.max(stats.lastMonthEarnings, 1)) * 100);
                                    return `${growthPercent >= 0 ? '+' : ''}${growthPercent}% ${currentLanguage === 'ar' ? 'مقارنة بالشهر الماضي' : 'vs last month'} `;
                                })()}
                            </span>
                        </div>
                    </motion.div>
                </div>

                <div className="px-6 space-y-6 -mt-6">
                    {/* Pending Contract Card */}
                    {pendingContract && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <PendingContractCard
                                contractId={pendingContract.id}
                                otherPartyName={(pendingContract.buyer as any)?.company_name || (pendingContract.buyer as any)?.full_name || 'buyer'}
                                amount={
                                    (pendingContract.metadata as any)?.final_price ||
                                    (pendingContract.quote as any)?.price ||
                                    (pendingContract.booking as any)?.final_agreed_price ||
                                    (pendingContract.booking as any)?.final_amount ||
                                    0
                                }
                                startDate={
                                    (pendingContract.metadata as any)?.scheduled_date ||
                                    (pendingContract.quote as any)?.start_date ||
                                    (pendingContract.booking as any)?.proposed_start_date ||
                                    (pendingContract.maintenance_request as any)?.preferred_start_date ||
                                    null
                                }
                                userRole="seller"
                                actionNeeded={currentLanguage === 'ar' ? 'راجع ووقع العقد' : 'Review and Sign Contract'}
                                currentLanguage={currentLanguage}
                                onClick={() => navigate(`/app/seller/contract/${pendingContract.id}/review`)}
                            />
                        </motion.div >
                    )}

                    {/* Seller Cash Safety Banner */}
                    <CashSafetyBanner variant="seller" currentLanguage={currentLanguage} />

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="grid grid-cols-3 gap-3">
                            <SoftCard
                                onClick={() => navigate('/app/seller/marketplace')}
                                className="p-4 cursor-pointer"
                            >
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <div className="p-3 rounded-2xl bg-primary/10">
                                        <Briefcase className="text-primary" size={24} />
                                    </div>
                                    <span className={cn(
                                        'text-xs font-medium text-foreground',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        {content[currentLanguage].browseJobs}
                                    </span>
                                </div>
                            </SoftCard>

                            <SoftCard
                                onClick={() => navigate('/app/seller/quotes')}
                                className="p-4 cursor-pointer"
                            >
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <div className="p-3 rounded-2xl bg-amber-500/10">
                                        <FileText className="text-amber-500" size={24} />
                                    </div>
                                    <span className={cn(
                                        'text-xs font-medium text-foreground',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        {content[currentLanguage].myQuotes}
                                    </span>
                                    {stats.activeQuotes > 0 && (
                                        <span className="text-xs font-bold text-amber-500">
                                            ({stats.activeQuotes})
                                        </span>
                                    )}
                                </div>
                            </SoftCard>

                            <SoftCard
                                onClick={() => navigate('/app/seller/calendar')}
                                className="p-4 cursor-pointer"
                            >
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <div className="p-3 rounded-2xl bg-blue-500/10">
                                        <Calendar className="text-blue-500" size={24} />
                                    </div>
                                    <span className={cn(
                                        'text-xs font-medium text-foreground',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        {currentLanguage === 'ar' ? 'التقويم' : 'Calendar'}
                                    </span>
                                    {stats.todayBookings > 0 && (
                                        <span className="text-xs font-bold text-blue-500">
                                            ({stats.todayBookings})
                                        </span>
                                    )}
                                </div>
                            </SoftCard>
                        </div>
                    </motion.div>

                    {/* Review Progress to Elite Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <ReviewProgressCard
                            currentReviews={stats.completedJobs}
                            currentLanguage={currentLanguage}
                        />
                    </motion.div>

                    {/* Performance Dashboard */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Heading2 lang={currentLanguage} className="text-lg mb-3">
                            {content[currentLanguage].performance}
                        </Heading2>
                        <div className="grid grid-cols-3 gap-3">
                            <SoftCard className="p-4">
                                <div className="flex flex-col items-center text-center">
                                    <div className="p-3 rounded-2xl bg-yellow-500/10 mb-2">
                                        <Star className="text-yellow-500 fill-yellow-500" size={24} />
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {stats.rating.toFixed(1)}
                                    </div>
                                    <div className={cn(
                                        'text-xs text-muted-foreground mt-1',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        {content[currentLanguage].rating}
                                    </div>
                                </div>
                            </SoftCard>

                            <SoftCard className="p-4">
                                <div className="flex flex-col items-center text-center">
                                    <div className="p-3 rounded-2xl bg-green-500/10 mb-2">
                                        <Award className="text-green-500" size={24} />
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {stats.completedJobs}
                                    </div>
                                    <div className={cn(
                                        'text-xs text-muted-foreground mt-1',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        {content[currentLanguage].completedJobs}
                                    </div>
                                </div>
                            </SoftCard>

                            <SoftCard className="p-4">
                                <div className="flex flex-col items-center text-center">
                                    <div className="p-3 rounded-2xl bg-primary/10 mb-2">
                                        <Target className="text-primary" size={24} />
                                    </div>
                                    <div className="text-2xl font-bold text-foreground">
                                        {stats.winRate}%
                                    </div>
                                    <div className={cn(
                                        'text-xs text-muted-foreground mt-1',
                                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                    )}>
                                        {content[currentLanguage].winRate}
                                    </div>
                                </div>
                            </SoftCard>
                        </div>

                        <SoftCard className="p-4 mt-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10">
                                        <FileText className="text-amber-500" size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground">
                                            {stats.totalPendingActions} {content[currentLanguage].pendingResponses}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {currentLanguage === 'ar' ? 'تحتاج إلى متابعة' : 'Need your attention'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SoftCard>
                    </motion.div>

                    {/* Active Jobs Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Heading2 lang={currentLanguage} className="text-lg mb-3">
                            {content[currentLanguage].activeJobs}
                        </Heading2>
                        <AnimatePresence mode="popLayout">
                            {activeJobs.length === 0 && haltedJobs.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <SoftCard className="p-6">
                                        <div className="text-center">
                                            <div className="text-5xl opacity-20 mb-3">📋</div>
                                            <Body lang={currentLanguage} className="text-muted-foreground">
                                                {content[currentLanguage].noActiveJobs}
                                            </Body>
                                        </div>
                                    </SoftCard>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="jobs"
                                    className="space-y-3"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {haltedJobs.map((job: any, index: number) => (
                                            <motion.div
                                                key={`halted-${job.id}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                layout
                                            >
                                                <HaltedJobCard
                                                    jobId={job.id}
                                                    jobType={job.type}
                                                    currentLanguage={currentLanguage}
                                                    haltReason={job.halted_reason}
                                                    haltedAt={job.halted_at}
                                                />
                                            </motion.div>
                                        ))}
                                        {activeJobs.map((job: any, index: number) => (
                                            <motion.div
                                                key={`active-${job.id}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                layout
                                            >
                                                <JobTrackingCard
                                                    jobId={job.id}
                                                    jobType={job.type}
                                                    title={currentLanguage === 'ar'
                                                        ? `حجز مع ${job.buyer_profile?.company_name || job.buyer_profile?.full_name || 'العميل'}`
                                                        : `Booking with ${job.buyer_profile?.company_name || job.buyer_profile?.full_name || 'Client'}`}
                                                    description={(job.description || job.job_description || '')
                                                        .replace(/\[Flexible Date\]/g, '')
                                                        .replace(/\[تاريخ مرن\]/g, '')
                                                        .replace(/\[Flexible Time\]/g, '')
                                                        .replace(/\[وقت مرن\]/g, '')
                                                        .trim()}
                                                    currentLanguage={currentLanguage}
                                                    userRole="seller"
                                                    status={job.status}
                                                    sellerOnWayAt={job.seller_on_way_at}
                                                    workStartedAt={job.work_started_at}
                                                    sellerMarkedComplete={job.seller_marked_complete || false}
                                                    buyerMarkedComplete={job.buyer_marked_complete || false}
                                                    sellerId={user?.id || ''}
                                                    sellerName={job.profiles?.company_name || job.profiles?.full_name || ''}
                                                    paymentMethod={job.payment_method}
                                                    location={job.contract_location || job.location || job.location_address || job.location_city || job.city}
                                                    date={job.contract_date || job.proposed_start_date || job.preferred_start_date || (currentLanguage === 'ar' ? 'مرن' : 'Flexible')}
                                                    onClick={() => navigate(`/app/seller/job/${job.id}?type=${job.type}`)}
                                                    completionPhotos={job.completion_photos ? (Array.isArray(job.completion_photos) ? (job.completion_photos as unknown as string[]) : null) : null}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* New Jobs Alert */}
                    {
                        stats.newJobs > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                <SoftCard
                                    onClick={() => navigate('/app/seller/marketplace')}
                                    className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/20 cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-2xl bg-amber-500/20">
                                            <Briefcase className="text-amber-600" size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn(
                                                'font-semibold text-foreground',
                                                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                                            )}>
                                                {stats.newJobs} {currentLanguage === 'ar' ? 'وظيفة جديدة متاحة' : 'new jobs available'}
                                            </p>
                                            <p className={cn(
                                                'text-sm text-muted-foreground',
                                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                            )}>
                                                {currentLanguage === 'ar' ? 'انقر للاستعراض والتقديم' : 'Tap to browse and apply'}
                                            </p>
                                        </div>
                                    </div>
                                </SoftCard>
                            </motion.div>
                        )
                    }
                </div >
            </div >
        </>
    );
};
