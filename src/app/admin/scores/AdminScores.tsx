import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Star,
    TrendingUp,
    TrendingDown,
    Users,
    Search,
    Filter,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface AdminScoresProps {
    currentLanguage: 'en' | 'ar';
}

export const AdminScores = ({ currentLanguage }: AdminScoresProps) => {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'jobs'>('rating');

    const { data: sellers, isLoading } = useQuery({
        queryKey: ['admin-seller-scores', sortBy],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_type', 'seller');

            if (error) {
                console.error('Error fetching sellers:', error);
                return [];
            }
            
            const sellerIds = (data || []).map(s => s.id);
            let jobCounts: Record<string, { completed: number; total: number }> = {};
            let reviewData: Record<string, { count: number; avg: number }> = {};

            if (sellerIds.length > 0) {
                try {
                    const { data: jobs } = await supabase
                        .from('maintenance_requests')
                        .select('assigned_seller_id, status')
                        .in('assigned_seller_id', sellerIds);

                    for (const job of jobs || []) {
                        if (!job.assigned_seller_id) continue;
                        if (!jobCounts[job.assigned_seller_id]) {
                            jobCounts[job.assigned_seller_id] = { completed: 0, total: 0 };
                        }
                        jobCounts[job.assigned_seller_id].total++;
                        if (job.status === 'completed' || job.status === 'closed') {
                            jobCounts[job.assigned_seller_id].completed++;
                        }
                    }
                } catch { /* ok */ }
                
                try {
                    const { data: reviews } = await supabase
                        .from('seller_reviews')
                        .select('seller_id, rating')
                        .in('seller_id', sellerIds);

                    for (const review of reviews || []) {
                        if (!review.seller_id) continue;
                        if (!reviewData[review.seller_id]) {
                            reviewData[review.seller_id] = { count: 0, avg: 0 };
                        }
                        reviewData[review.seller_id].count++;
                        // Running average
                        const rd = reviewData[review.seller_id];
                        rd.avg = ((rd.avg * (rd.count - 1)) + review.rating) / rd.count;
                    }
                } catch { /* ok */ }
            }

            const processedSellers = (data || []).map(seller => ({
                ...seller,
                seller_rating: reviewData[seller.id]?.avg || 0,
                verified_reviews_count: reviewData[seller.id]?.count || 0,
                completed_projects: jobCounts[seller.id]?.completed || 0,
            }));

            return processedSellers
                .sort((a, b) => {
                    if (sortBy === 'rating') return (b.seller_rating || 0) - (a.seller_rating || 0);
                    if (sortBy === 'reviews') return (b.verified_reviews_count || 0) - (a.verified_reviews_count || 0);
                    return (b.completed_projects || 0) - (a.completed_projects || 0);
                })
                .slice(0, 50);
        },
    });

    const content = {
        en: {
            title: 'Seller Scores',
            search: 'Search sellers...',
            rating: 'Rating',
            reviews: 'Reviews',
            jobs: 'Jobs',
            noSellers: 'No sellers found',
            responseRate: 'Response Rate',
            completedJobs: 'Completed Jobs',
        },
        ar: {
            title: 'تقييمات البائعين',
            search: 'البحث عن بائعين...',
            rating: 'التقييم',
            reviews: 'المراجعات',
            jobs: 'الأعمال',
            noSellers: 'لا يوجد بائعين',
            responseRate: 'معدل الاستجابة',
            completedJobs: 'الأعمال المكتملة',
        },
    };

    const t = content[currentLanguage];

    const filteredSellers = sellers?.filter(seller =>
        seller.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return 'text-green-500';
        if (rating >= 3.5) return 'text-yellow-500';
        if (rating >= 2.5) return 'text-orange-500';
        return 'text-red-500';
    };

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
            />

            <div className="px-4 py-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t.search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 rounded-full"
                    />
                </div>

                {/* Sort Tabs */}
                <div className="flex gap-2">
                    <Button
                        variant={sortBy === 'rating' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('rating')}
                        className="rounded-full gap-1"
                    >
                        <Star size={14} />
                        {t.rating}
                    </Button>
                    <Button
                        variant={sortBy === 'reviews' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('reviews')}
                        className="rounded-full gap-1"
                    >
                        <Users size={14} />
                        {t.reviews}
                    </Button>
                    <Button
                        variant={sortBy === 'jobs' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('jobs')}
                        className="rounded-full gap-1"
                    >
                        <TrendingUp size={14} />
                        {t.jobs}
                    </Button>
                </div>

                {/* Sellers List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : filteredSellers && filteredSellers.length > 0 ? (
                    <div className="space-y-3">
                        {filteredSellers.map((seller, index) => (
                            <SoftCard
                                key={seller.id}
                                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={(seller as any).avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.id}`} />
                                            <AvatarFallback>
                                                {seller.full_name?.charAt(0) || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -top-1 -left-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <BodySmall lang={currentLanguage} className="font-medium truncate">
                                            {seller.full_name || (isArabic ? 'بائع' : 'Seller')}
                                        </BodySmall>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1">
                                                <Star className={cn('w-4 h-4', getRatingColor(seller.seller_rating || 0))} fill="currentColor" />
                                                <Caption className={getRatingColor(seller.seller_rating || 0)}>
                                                    {(seller.seller_rating || 0).toFixed(1)}
                                                </Caption>
                                            </div>
                                            <Caption className="text-muted-foreground">
                                                {seller.verified_reviews_count || 0} {t.reviews}
                                            </Caption>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <Badge variant="secondary" className="mb-1">
                                            {seller.completed_projects || 0} {t.jobs}
                                        </Badge>
                                        <Caption className="text-muted-foreground block">
                                            {(seller as any).response_time_hours || 0}h {t.responseRate}
                                        </Caption>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                </div>
                            </SoftCard>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noSellers}</Body>
                    </div>
                )}
            </div>
        </div>
    );
};
