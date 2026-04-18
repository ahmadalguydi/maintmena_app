import React from 'react';
import { motion } from 'framer-motion';
import { AvatarBadge } from "@/components/mobile/AvatarBadge";
import { SoftCard } from "@/components/mobile/SoftCard";
import { Badge } from "@/components/ui/badge";
import { Body, BodySmall, Caption } from "@/components/mobile/Typography";
import { Star, BadgeCheck, Check, Zap, TrendingUp, ThumbsUp, Image as ImageIcon, ChevronRight } from "lucide-react";
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { getAllCategories } from "@/lib/serviceCategories";

export interface SelectableVendorData {
    id: string;
    full_name?: string;
    company_name?: string;
    company_name_ar?: string;
    full_name_ar?: string;
    avatar_url?: string;
    verified_seller?: boolean;
    seller_rating?: number;
    reviews?: any[];
    completed_projects?: number;
    response_time_hours?: number;
    years_of_experience?: number;
    bio?: string;
    bio_ar?: string;
    typical_price_min?: number;
    typical_price_max?: number;
    is_online?: boolean;
    service_categories?: string[];
    portfolio_items?: { image_url?: string; title?: string }[];
}

interface VendorCardSelectableProps {
    vendor: SelectableVendorData;
    currentLanguage: 'en' | 'ar';
    isSelected: boolean;
    onSelect: (vendorId: string) => void;
    onViewDetails?: (vendorId: string) => void;
    rank?: number;
    disabled?: boolean;
    selectedCategory?: string;
}

const content = {
    ar: {
        projects: 'مشروع',
        topMatch: 'الأفضل',
        customerReviews: 'آراء العملاء',
        estimatedPrice: 'السعر المتوقع',
        sar: 'ر.س',
        anonymous: 'عميل',
        fastResponse: 'استجابة سريعة',
        topRated: 'تقييم عالي',
        popular: 'موثوق',
        viewDetails: 'عرض التفاصيل',
    },
    en: {
        projects: 'jobs',
        topMatch: 'Best',
        customerReviews: 'Reviews',
        estimatedPrice: 'Est.',
        sar: 'SAR',
        anonymous: 'Client',
        fastResponse: 'Fast Response',
        topRated: 'Top Rated',
        popular: 'Trusted',
        viewDetails: 'View Details',
    },
};

// Compute badges with colors based on vendor stats
const computeBadges = (vendor: SelectableVendorData, t: typeof content.en) => {
    const badges: { icon: React.ReactNode; label: string; color: string }[] = [];

    if (vendor.seller_rating && vendor.seller_rating >= 4.5) {
        badges.push({ icon: <TrendingUp size={12} />, label: t.topRated, color: 'bg-blue-100 text-blue-700' });
    }
    if (vendor.response_time_hours && vendor.response_time_hours <= 2) {
        badges.push({ icon: <Zap size={12} />, label: t.fastResponse, color: 'bg-amber-100 text-amber-700' });
    }
    if (vendor.completed_projects && vendor.completed_projects >= 50) {
        badges.push({ icon: <ThumbsUp size={12} />, label: t.popular, color: 'bg-green-100 text-green-700' });
    }

    return badges.slice(0, 2);
};

export const VendorCardSelectable = ({
    vendor,
    currentLanguage,
    isSelected,
    onSelect,
    onViewDetails,
    rank,
    disabled = false,
    selectedCategory,
}: VendorCardSelectableProps) => {
    const { vibrate } = useHaptics();
    const t = content[currentLanguage];
    const allCategories = getAllCategories();
    const isRTL = currentLanguage === 'ar';

    const handleSelect = async () => {
        if (disabled) return;
        await vibrate('medium');
        onSelect(vendor.id);
    };

    const handleViewDetails = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await vibrate('light');
        onViewDetails?.(vendor.id);
    };

    const getTranslatedField = (field: string) => {
        const langField = currentLanguage === 'ar' ? `${field}_ar` : `${field}_en`;
        return (vendor as any)[langField] || (vendor as any)[field];
    };

    const displayName = getTranslatedField('company_name') || getTranslatedField('full_name') || 'Provider';
    const bio = getTranslatedField('bio');

    const categoryToShow = selectedCategory || vendor.service_categories?.[0];
    const categoryData = categoryToShow ? allCategories.find(c => c.key === categoryToShow) : null;

    const reviewsToShow = vendor.reviews?.filter((r: any) => r.review_text)?.slice(0, 3) || [];
    const portfolioImages = vendor.portfolio_items?.filter(p => p.image_url)?.slice(0, 3) || [];
    const badges = computeBadges(vendor, t);

    return (
        <motion.div
            whileTap={disabled ? {} : { scale: 0.99 }}
            onClick={handleSelect}
            className={cn(disabled && 'opacity-50 cursor-not-allowed')}
        >
            <SoftCard
                className={cn(
                    "relative cursor-pointer transition-all duration-200 p-5",
                    isSelected
                        ? "ring-1 ring-primary/60 bg-primary/5"
                        : "hover:bg-muted/30"
                )}
            >
                {/* Top Match Badge */}
                {rank === 1 && (
                    <div className={cn(
                        'absolute top-2',
                        isRTL ? 'right-2' : 'left-2'
                    )}>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 border-0">
                            ⭐ {t.topMatch}
                        </Badge>
                    </div>
                )}

                <div className={cn("space-y-4", isRTL && "text-right")}>
                    {/* Header: Avatar + Name + Checkbox */}
                    <div className={cn(
                        "flex items-center gap-3",
                        isRTL ? "flex-row" : "flex-row-reverse"
                    )}>
                        {/* Selection Checkbox */}
                        <motion.div
                            animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                isSelected
                                    ? 'bg-primary border-primary'
                                    : 'border-border/50'
                            )}
                        >
                            {isSelected && <Check size={14} className="text-primary-foreground" strokeWidth={3} />}
                        </motion.div>

                        {/* Name + Verification */}
                        <div className="flex-1 min-w-0">
                            <div className={cn(
                                "flex items-center gap-1.5",
                                isRTL ? "flex-row" : "flex-row-reverse justify-end"
                            )}>
                                <Body lang={currentLanguage} className={cn(
                                    "font-semibold text-foreground truncate",
                                    isRTL ? "font-ar-body" : "font-body"
                                )}>
                                    {displayName}
                                </Body>
                                {vendor.verified_seller && (
                                    <BadgeCheck className="h-5 w-5 text-primary fill-primary/20 shrink-0" />
                                )}
                            </div>
                        </div>

                        {/* Avatar */}
                        <AvatarBadge
                            src={vendor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.id}`}
                            fallback={displayName[0]}
                            size="md"
                            className="border border-border/40 rounded-full shrink-0"
                        />
                    </div>

                    {/* Stats Row */}
                    <div className={cn(
                        "flex items-center gap-3 flex-wrap",
                        isRTL ? "flex-row" : "flex-row-reverse justify-end"
                    )}>
                        {vendor.seller_rating && vendor.seller_rating > 0 && (
                            <div className="flex items-center gap-1.5">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <BodySmall className={cn("font-semibold", isRTL ? "font-ar-body" : "font-body")}>
                                    {vendor.seller_rating.toFixed(1)}
                                </BodySmall>
                                <BodySmall className={cn("text-muted-foreground", isRTL ? "font-ar-body" : "font-body")}>
                                    ({vendor.reviews?.length || 0})
                                </BodySmall>
                            </div>
                        )}

                        {vendor.completed_projects && vendor.completed_projects > 0 && (
                            <BodySmall className={cn("text-muted-foreground", isRTL ? "font-ar-body" : "font-body")}>
                                🏗️ {vendor.completed_projects} {t.projects}
                            </BodySmall>
                        )}

                        {categoryData && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 font-normal">
                                {categoryData.icon}
                            </Badge>
                        )}
                    </div>

                    {/* Computed Badges */}
                    {badges.length > 0 && (
                        <div className={cn(
                            "flex items-center gap-2 flex-wrap",
                            isRTL ? "flex-row" : "flex-row-reverse justify-end"
                        )}>
                            {badges.map((badge, idx) => (
                                <Badge
                                    key={idx}
                                    variant="secondary"
                                    className={cn(
                                        "text-xs px-2.5 py-1 gap-1.5 font-medium border-0",
                                        badge.color,
                                        isRTL ? "font-ar-body" : "font-body"
                                    )}
                                >
                                    {badge.icon} {badge.label}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Bio excerpt */}
                    {bio && (
                        <Body lang={currentLanguage} className={cn(
                            "text-sm text-muted-foreground line-clamp-2",
                            isRTL ? "font-ar-body" : "font-body"
                        )}>
                            {bio}
                        </Body>
                    )}

                    {/* Portfolio Images */}
                    {portfolioImages.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {portfolioImages.map((item, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.title || 'Portfolio'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reviews - up to 3 */}
                    {reviewsToShow.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-border/20">
                            <Caption lang={currentLanguage} className={cn(
                                "text-muted-foreground font-medium",
                                isRTL ? "font-ar-body text-right block" : "font-body"
                            )}>
                                {t.customerReviews}
                            </Caption>
                            {reviewsToShow.map((review: any, idx: number) => (
                                <div key={idx} className={cn(
                                    "flex items-start gap-2",
                                    isRTL ? "flex-row" : "flex-row-reverse"
                                )}>
                                    <div className="flex shrink-0">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={cn(
                                                    'h-2.5 w-2.5',
                                                    i < (review.rating || 5)
                                                        ? 'text-yellow-500 fill-yellow-500'
                                                        : 'text-gray-300'
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <Caption className={cn(
                                        "text-muted-foreground/80 line-clamp-1 flex-1",
                                        isRTL ? "font-ar-body text-right" : "font-body text-left"
                                    )}>
                                        {review.review_text}
                                    </Caption>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Price */}
                    {vendor.typical_price_min && vendor.typical_price_max && (
                        <div className={cn(
                            "flex items-center gap-1.5 pt-1",
                            isRTL ? "flex-row" : "flex-row-reverse justify-end"
                        )}>
                            <Caption className={cn("text-muted-foreground/70", isRTL ? "font-ar-body" : "font-body")}>
                                💰 {t.estimatedPrice}
                            </Caption>
                            <Caption className={cn("font-medium text-foreground", isRTL ? "font-ar-body" : "font-body")}>
                                {vendor.typical_price_min}-{vendor.typical_price_max} {t.sar}
                            </Caption>
                        </div>
                    )}

                    {/* View Details Button */}
                    {onViewDetails && (
                        <button
                            onClick={handleViewDetails}
                            className={cn(
                                "w-full pt-3 mt-2 border-t border-border/20",
                                "flex items-center justify-center gap-1.5",
                                "text-primary hover:text-primary/80 transition-colors",
                                isRTL ? "font-ar-body flex-row" : "font-body flex-row-reverse"
                            )}
                        >
                            <ChevronRight size={16} className={cn(isRTL && "rotate-180")} />
                            <BodySmall className="font-medium">{t.viewDetails}</BodySmall>
                        </button>
                    )}
                </div>
            </SoftCard>
        </motion.div>
    );
};


