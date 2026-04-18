import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Search,
    Shield,
    ShieldCheck,
    Star,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Building2,
    User,
    ChevronRight,
    TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminSellersProps {
    currentLanguage: 'en' | 'ar';
}

type VerifyFilter = 'all' | 'verified' | 'unverified';

interface SellerRow {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    location_city: string | null;
    created_at: string;
    verified_seller: boolean | null;
    trust_score: number | null;
    years_of_experience: number | null;
    user_type: string | null;
    completedJobs: number;
    avgRating: number;
    reviewCount: number;
}

export function AdminSellers({ currentLanguage }: AdminSellersProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isArabic = currentLanguage === 'ar';
    const [search, setSearch] = useState('');
    const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>('all');
    const [selectedSeller, setSelectedSeller] = useState<SellerRow | null>(null);

    const { data: sellers = [], isLoading } = useQuery({
        queryKey: ['admin-sellers-dir', verifyFilter],
        queryFn: async () => {
            let query = supabase
                .from('profiles')
                .select('id, full_name, company_name, email, phone, avatar_url, location_city, created_at, verified_seller, trust_score, years_of_experience, user_type')
                .eq('user_type', 'seller')
                .order('created_at', { ascending: false })
                .limit(100);

            if (verifyFilter === 'verified') {
                query = query.eq('verified_seller', true);
            } else if (verifyFilter === 'unverified') {
                query = query.or('verified_seller.is.null,verified_seller.eq.false');
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return [];

            const ids = data.map(s => s.id);

            // Fetch job completions
            let jobMap: Record<string, number> = {};
            try {
                const { data: jobs } = await supabase
                    .from('maintenance_requests')
                    .select('assigned_seller_id, status')
                    .in('assigned_seller_id', ids)
                    .in('status', ['completed', 'closed']);
                (jobs || []).forEach(j => {
                    if (j.assigned_seller_id) {
                        jobMap[j.assigned_seller_id] = (jobMap[j.assigned_seller_id] || 0) + 1;
                    }
                });
            } catch { /* ok */ }

            // Fetch reviews
            let reviewMap: Record<string, { count: number; total: number }> = {};
            try {
                const { data: reviews } = await supabase
                    .from('seller_reviews')
                    .select('seller_id, rating')
                    .in('seller_id', ids);
                (reviews || []).forEach(r => {
                    if (!r.seller_id) return;
                    if (!reviewMap[r.seller_id]) reviewMap[r.seller_id] = { count: 0, total: 0 };
                    reviewMap[r.seller_id].count++;
                    reviewMap[r.seller_id].total += r.rating;
                });
            } catch { /* ok */ }

            return data.map((s): SellerRow => ({
                ...s,
                completedJobs: jobMap[s.id] || 0,
                avgRating: reviewMap[s.id] ? reviewMap[s.id].total / reviewMap[s.id].count : 0,
                reviewCount: reviewMap[s.id]?.count || 0,
            }));
        },
        refetchInterval: 60000,
    });

    const verifyMutation = useMutation({
        mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ verified_seller: verified })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, { verified }) => {
            queryClient.invalidateQueries({ queryKey: ['admin-sellers-dir'] });
            toast.success(
                isArabic
                    ? (verified ? 'تم توثيق مقدم الخدمة' : 'تم إلغاء توثيق مقدم الخدمة')
                    : (verified ? 'Seller verified' : 'Seller verification removed')
            );
            setSelectedSeller(prev => prev ? { ...prev, verified_seller: verified } : null);
        },
        onError: () => toast.error(isArabic ? 'حدث خطأ' : 'An error occurred'),
    });

    const t = {
        en: {
            title: 'Sellers Directory', search: 'Search sellers...',
            all: 'All', verified: 'Verified', unverified: 'Unverified',
            noSellers: 'No sellers found', email: 'Email', phone: 'Phone',
            city: 'City', joined: 'Joined', experience: 'Experience',
            trustScore: 'Trust Score', completedJobs: 'Jobs Done',
            avgRating: 'Avg. Rating', reviews: 'reviews',
            verify: 'Verify Seller', unverify: 'Remove Verification',
            close: 'Close', yrs: 'yrs',
        },
        ar: {
            title: 'دليل مقدمي الخدمة', search: 'البحث عن مقدم خدمة...',
            all: 'الكل', verified: 'موثق', unverified: 'غير موثق',
            noSellers: 'لا يوجد مقدمو خدمة', email: 'البريد', phone: 'الهاتف',
            city: 'المدينة', joined: 'انضم', experience: 'الخبرة',
            trustScore: 'نقاط الثقة', completedJobs: 'أعمال مكتملة',
            avgRating: 'متوسط التقييم', reviews: 'تقييم',
            verify: 'توثيق مقدم الخدمة', unverify: 'إلغاء التوثيق',
            close: 'إغلاق', yrs: 'سنة',
        },
    }[currentLanguage];

    const filtered = sellers.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            s.full_name?.toLowerCase().includes(q) ||
            s.company_name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.location_city?.toLowerCase().includes(q)
        );
    });

    const filterTabs: { key: VerifyFilter; label: string }[] = [
        { key: 'all', label: t.all },
        { key: 'verified', label: t.verified },
        { key: 'unverified', label: t.unverified },
    ];

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

                {/* Filter Tabs */}
                <div className="flex gap-2">
                    {filterTabs.map(({ key, label }) => (
                        <Button
                            key={key}
                            variant={verifyFilter === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setVerifyFilter(key)}
                            className="rounded-full"
                        >
                            {key === 'verified' && <ShieldCheck size={13} className="mr-1" />}
                            {label}
                        </Button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="space-y-2.5">
                        {filtered.map(seller => (
                            <SoftCard
                                key={seller.id}
                                className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                                onClick={() => setSelectedSeller(seller)}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 flex-shrink-0">
                                        <AvatarImage src={seller.avatar_url ?? undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                            {(seller.company_name || seller.full_name || 'S').charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <BodySmall lang={currentLanguage} className="font-medium truncate">
                                                {seller.company_name || seller.full_name || '—'}
                                            </BodySmall>
                                            {seller.verified_seller && (
                                                <ShieldCheck size={14} className="text-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            {seller.location_city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {seller.location_city}
                                                </span>
                                            )}
                                            {seller.avgRating > 0 && (
                                                <span className="flex items-center gap-1 text-amber-500">
                                                    <Star size={10} fill="currentColor" />
                                                    {seller.avgRating.toFixed(1)}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Briefcase size={10} />
                                                {seller.completedJobs}
                                            </span>
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className={cn('text-muted-foreground flex-shrink-0', isArabic && 'rotate-180')} />
                                </div>
                            </SoftCard>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noSellers}</Body>
                    </div>
                )}
            </div>

            {/* Seller Detail Sheet */}
            <Sheet open={!!selectedSeller} onOpenChange={() => setSelectedSeller(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
                            {selectedSeller?.company_name || selectedSeller?.full_name}
                        </SheetTitle>
                    </SheetHeader>

                    {selectedSeller && (
                        <div className="mt-5 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
                            {/* Avatar + badges */}
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={selectedSeller.avatar_url ?? undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                                        {(selectedSeller.company_name || selectedSeller.full_name || 'S').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <BodySmall lang={currentLanguage} className="font-bold text-base">
                                        {selectedSeller.company_name || selectedSeller.full_name}
                                    </BodySmall>
                                    <div className="flex items-center gap-2 mt-1">
                                        {selectedSeller.company_name
                                            ? <Badge variant="outline" className="gap-1"><Building2 size={11} /> {isArabic ? 'شركة' : 'Company'}</Badge>
                                            : <Badge variant="outline" className="gap-1"><User size={11} /> {isArabic ? 'فردي' : 'Individual'}</Badge>
                                        }
                                        {selectedSeller.verified_seller && (
                                            <Badge className="bg-blue-500 text-white gap-1">
                                                <ShieldCheck size={11} /> {t.verified}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: t.completedJobs, value: selectedSeller.completedJobs, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                                    { label: t.avgRating, value: selectedSeller.avgRating > 0 ? selectedSeller.avgRating.toFixed(1) : '—', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                                    { label: t.trustScore, value: selectedSeller.trust_score ?? '—', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                                ].map(stat => (
                                    <div key={stat.label} className={cn('rounded-xl p-3 text-center', stat.bg)}>
                                        <stat.icon size={16} className={cn('mx-auto mb-1', stat.color)} />
                                        <p className={cn('text-lg font-bold tabular-nums', stat.color)}>{stat.value}</p>
                                        <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Contact info */}
                            <div className="space-y-2">
                                {selectedSeller.email && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                        <Mail size={15} className="text-muted-foreground flex-shrink-0" />
                                        <Caption lang={currentLanguage} className="break-all">{selectedSeller.email}</Caption>
                                    </div>
                                )}
                                {selectedSeller.phone && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                        <Phone size={15} className="text-muted-foreground flex-shrink-0" />
                                        <Caption lang={currentLanguage}>{selectedSeller.phone}</Caption>
                                    </div>
                                )}
                                {selectedSeller.location_city && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                        <MapPin size={15} className="text-muted-foreground flex-shrink-0" />
                                        <Caption lang={currentLanguage}>{selectedSeller.location_city}</Caption>
                                    </div>
                                )}
                                {selectedSeller.years_of_experience != null && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                        <Caption lang={currentLanguage} className="text-muted-foreground">{t.experience}</Caption>
                                        <Caption lang={currentLanguage}>{selectedSeller.years_of_experience} {t.yrs}</Caption>
                                    </div>
                                )}
                                <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                                    <Calendar size={15} className="text-muted-foreground flex-shrink-0" />
                                    <Caption lang={currentLanguage}>
                                        {t.joined} {formatDistanceToNow(new Date(selectedSeller.created_at), {
                                            addSuffix: true,
                                            locale: isArabic ? ar : enUS,
                                        })}
                                    </Caption>
                                </div>
                            </div>

                            {/* Verify / Unverify */}
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setSelectedSeller(null)}>
                                    {t.close}
                                </Button>
                                <Button
                                    className={cn('flex-1 gap-2', selectedSeller.verified_seller ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600')}
                                    disabled={verifyMutation.isPending}
                                    onClick={() => verifyMutation.mutate({
                                        id: selectedSeller.id,
                                        verified: !selectedSeller.verified_seller,
                                    })}
                                >
                                    {selectedSeller.verified_seller
                                        ? <><Shield size={15} /> {t.unverify}</>
                                        : <><ShieldCheck size={15} /> {t.verify}</>
                                    }
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
