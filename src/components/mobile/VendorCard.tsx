import { AvatarBadge } from "@/components/mobile/AvatarBadge";
import { SoftCard } from "@/components/mobile/SoftCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Body, BodySmall, Caption, Heading3 } from "@/components/mobile/Typography";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Star, Briefcase, Clock, MapPin, BadgeCheck, Heart, Zap, Image as ImageIcon } from "lucide-react";
import { getAllCategories } from "@/lib/serviceCategories";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";

interface VendorCardProps {
    vendor: any;
    currentLanguage: "en" | "ar";
    isSaved?: boolean;
    onToggleSave?: (vendorId: string, isSaved: boolean) => void;
    onRequestBooking?: (vendor: any) => void;
    onNavigate: (path: string) => void;
    showSaveButton?: boolean;
}

export const VendorCard = ({
    vendor,
    currentLanguage,
    isSaved,
    onToggleSave,
    onRequestBooking,
    onNavigate,
    showSaveButton = true
}: VendorCardProps) => {

    const content = {
        en: {
            requestBooking: "Request Booking",
            instantBooking: "Instant Booking",
            projects: "projects",
            response: "response",
            experience: "years exp",
            available: "Available",
            busy: "Busy",
            unavailable: "Unavailable",
            reviews: "Customer Reviews"
        },
        ar: {
            requestBooking: "طلب حجز",
            instantBooking: "حجز فوري",
            projects: "مشروع",
            response: "استجابة",
            experience: "سنوات خبرة",
            available: "متاح",
            busy: "مشغول",
            unavailable: "غير متاح",
            reviews: "آراء العملاء"
        },
    };

    const t = content[currentLanguage];
    const allCategories = getAllCategories();

    const getTranslatedField = (vendor: any, field: string) => {
        const langField = currentLanguage === "ar" ? `${field}_ar` : `${field}_en`;
        return vendor[langField] || vendor[field];
    };

    const portfolioItems = vendor.portfolio_items || [];
    const hasPortfolio = Array.isArray(portfolioItems) && portfolioItems.length > 0;

    return (
        <SoftCard animate className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="space-y-4">
                {/* Header with name and verification */}
                <div className="flex items-start justify-between gap-3">
                    <div onClick={() => onNavigate(`/app/buyer/vendor/${vendor.id}`)}>
                        <AvatarBadge
                            src={vendor.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vendor.id}`}
                            fallback={(vendor.full_name || vendor.company_name || "?")[0]}
                            size="md"
                            className="border border-border/50 rounded-full"
                        />
                    </div>
                    <div className="flex-1" onClick={() => onNavigate(`/app/buyer/vendor/${vendor.id}`)}>
                        <div className="flex items-center gap-2 mb-1">
                            <Heading3 lang={currentLanguage} className="leading-tight">
                                {getTranslatedField(vendor, "company_name") || getTranslatedField(vendor, "full_name")}
                            </Heading3>
                            {vendor.verified_seller && (
                                <BadgeCheck className="h-5 w-5 text-primary fill-primary/20 flex-shrink-0" />
                            )}
                        </div>
                        {vendor.company_name && vendor.full_name && (
                            <BodySmall lang={currentLanguage} className="text-muted-foreground">
                                {getTranslatedField(vendor, "full_name")}
                            </BodySmall>
                        )}
                    </div>

                    {showSaveButton && onToggleSave && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSave(vendor.id, !!isSaved);
                                }}
                                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                            >
                                <Heart size={20} className={isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Portfolio Images Carousel */}
                {hasPortfolio && (
                    <div className="relative -mx-6 px-6" onClick={() => onNavigate(`/app/buyer/vendor/${vendor.id}`)}>
                        <Carousel className="w-full">
                            <CarouselContent>
                                {portfolioItems.slice(0, 5).map((item: any, idx: number) => (
                                    <CarouselItem key={idx} className="basis-4/5">
                                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.title || "Portfolio"}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            {item.title && (
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                                    <Caption className="text-white font-medium">{item.title}</Caption>
                                                </div>
                                            )}
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </div>
                )}

                <div onClick={() => onNavigate(`/app/buyer/vendor/${vendor.id}`)}>
                    {/* Stats and ratings */}
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                        {vendor.seller_rating > 0 && (
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">{vendor.seller_rating.toFixed(1)}</span>
                                <Caption className="text-muted-foreground">({vendor.reviews?.length || 0})</Caption>
                            </div>
                        )}

                        {vendor.completed_projects > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Briefcase className="h-4 w-4" />
                                <BodySmall lang={currentLanguage}>
                                    {vendor.completed_projects} {t.projects}
                                </BodySmall>
                            </div>
                        )}

                        {vendor.years_of_experience > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {vendor.years_of_experience}+ {t.experience}
                            </Badge>
                        )}

                        {vendor.response_time_hours && (
                            <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />~{vendor.response_time_hours}h {t.response}
                            </Badge>
                        )}
                    </div>

                    {/* Bio */}
                    {vendor.bio && (
                        <Body lang={currentLanguage} className="text-sm text-muted-foreground line-clamp-3 mt-3">
                            {getTranslatedField(vendor, "bio")}
                        </Body>
                    )}

                    {/* Service Categories */}
                    {vendor.service_categories && vendor.service_categories.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {vendor.service_categories.slice(0, 4).map((catKey: string) => {
                                const category = allCategories.find((c) => c.key === catKey);
                                // Fallback for categories not in the list or string manipulation if needed
                                if (!category) return (
                                    <Badge key={catKey} variant="secondary" className="text-xs">
                                        {catKey.replace('_', ' ')}
                                    </Badge>
                                );

                                return (
                                    <Badge key={catKey} variant="secondary" className="text-xs">
                                        {category.icon} {currentLanguage === "ar" ? category.ar : category.en}
                                    </Badge>
                                );
                            })}
                            {vendor.service_categories.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                    +{vendor.service_categories.length - 4}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Reviews Preview */}
                    {vendor.reviews && vendor.reviews.length > 0 && (
                        <div className="space-y-2 pt-2 mt-3 border-t border-border/30">
                            <Caption lang={currentLanguage} className="font-semibold text-foreground">
                                {t.reviews}
                            </Caption>
                            {vendor.reviews.slice(0, 2).map((review: any, idx: number) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-3 w-3 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                                                />
                                            ))}
                                        </div>
                                        <Caption className="text-muted-foreground">{review.profiles?.full_name || "Anonymous"}</Caption>
                                    </div>
                                    {review.review_text && (
                                        <Caption className="text-muted-foreground line-clamp-2">{review.review_text}</Caption>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Service Area - Show cities served */}
                    {vendor.service_cities && vendor.service_cities.length > 0 && (
                        <div className="flex items-start gap-1 text-muted-foreground mt-3">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-wrap gap-1">
                                <Caption lang={currentLanguage} className="font-medium">
                                    {currentLanguage === "ar" ? "نطاق الخدمة:" : "Service Area:"}
                                </Caption>
                                <Caption lang={currentLanguage}>
                                    {vendor.service_cities.slice(0, 3).map((city: string, idx: number) => {
                                        // Try to find bilingual city name
                                        const bilingualCity = SAUDI_CITIES_BILINGUAL?.find(
                                            (c: any) => c.value === city || c.en === city || c.ar === city
                                        );
                                        const displayCity = currentLanguage === "ar"
                                            ? (bilingualCity?.ar || city)
                                            : (bilingualCity?.en || city);
                                        return displayCity;
                                    }).join("، ")}
                                    {vendor.service_cities.length > 3 && (
                                        <span> +{vendor.service_cities.length - 3}</span>
                                    )}
                                </Caption>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {(onRequestBooking) && (
                    <div className="flex gap-2 pt-2">
                        {vendor.instant_booking_enabled && (
                            <Badge variant="default" className="gap-1 text-xs px-3 py-1.5">
                                <Zap className="h-3 w-3" />
                                {t.instantBooking}
                            </Badge>
                        )}

                        <Button
                            variant="default"
                            className="flex-1 h-11"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRequestBooking(vendor);
                            }}
                        >
                            {t.requestBooking}
                        </Button>
                    </div>
                )}
            </div>
        </SoftCard>
    );
};
