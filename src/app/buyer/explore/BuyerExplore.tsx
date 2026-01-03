import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { SoftCard } from "@/components/mobile/SoftCard";
import { GradientHeader } from "@/components/mobile/GradientHeader";
import { SearchHero } from "@/components/mobile/SearchHero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Zap, Briefcase, Clock, MapPin, BadgeCheck, Image as ImageIcon, X, Heart, Navigation, ChevronRight } from "lucide-react";
import { Heading3, Heading2, Body, BodySmall, Caption } from "@/components/mobile/Typography";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { toast } from "sonner";
import { CityCombobox } from "@/components/mobile/CityCombobox";
import { TrustBanner } from "@/components/mobile/TrustBanner";
import { AuthTriggerModal } from "@/components/mobile/AuthTriggerModal";
import { AvatarBadge } from "@/components/mobile/AvatarBadge";
import { ConciergeCard } from "@/components/mobile/ConciergeCard";
import { VendorCard } from "@/components/mobile/VendorCard";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";

interface BuyerExploreProps {
  currentLanguage: "en" | "ar";
}

const SERVICE_CATEGORIES = [
  { key: "plumbing", icon: "🚰", en: "Plumbing", ar: "سباكة", enabled: true },
  { key: "electrical", icon: "⚡", en: "Electrical", ar: "كهرباء", enabled: true },
  { key: "painting", icon: "🎨", en: "Painting", ar: "دهان", enabled: true },
  { key: "ac_repair", icon: "❄️", en: "AC Repair", ar: "إصلاح التكييف", enabled: false },
  { key: "cleaning", icon: "🧹", en: "Cleaning", ar: "تنظيف", enabled: false },
  { key: "handyman", icon: "🔧", en: "Handyman", ar: "عامل متعدد المهارات", enabled: false },
];

export const BuyerExplore = ({ currentLanguage }: BuyerExploreProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState(location.state?.searchQuery || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(location.state?.openFilters || false);
  const [minRating, setMinRating] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const fromHome = location.state?.fromHome || false;
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const isGuestMode = !user;

  // Check if user has already set their city preference (show modal only once)
  useEffect(() => {
    const citySet = localStorage.getItem('buyerCityPreferenceSet');
    if (!citySet) {
      // Small delay to let page render first
      const timer = setTimeout(() => setShowCityModal(true), 500);
      return () => clearTimeout(timer);
    } else {
      // Load saved city preference
      const savedCity = localStorage.getItem('buyerPreferredCity');
      if (savedCity) {
        setSelectedCity(savedCity);
      }
    }
  }, []);

  const { data: savedVendors } = useQuery({
    queryKey: ["saved-vendors", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("saved_vendors").select("seller_id").eq("buyer_id", user.id);

      if (error) throw error;
      return data.map((sv) => sv.seller_id);
    },
    enabled: !!user,
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .eq("discoverable", true)
        .in("user_type", ["seller", "both"])
        .order("seller_rating", { ascending: false })
        .order("completed_projects", { ascending: false });

      if (selectedCategory) {
        query = query.contains("service_categories", [selectedCategory]);
      }

      const { data: profilesData, error } = await query;
      if (error) throw error;

      const vendorsWithReviews = await Promise.all(
        (profilesData || []).map(async (vendor) => {
          const { data: reviews } = await supabase
            .from("seller_reviews")
            .select("rating, review_text, created_at")
            .eq("seller_id", vendor.id)
            .order("created_at", { ascending: false })
            .limit(3);

          return {
            ...vendor,
            reviews: reviews || [],
          };
        }),
      );

      return vendorsWithReviews;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ vendorId, isSaved }: { vendorId: string; isSaved: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (isSaved) {
        const { error } = await supabase
          .from("saved_vendors")
          .delete()
          .eq("buyer_id", user.id)
          .eq("seller_id", vendorId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_vendors").insert({ buyer_id: user.id, seller_id: vendorId });
        if (error) throw error;
      }
      return { vendorId, isSaved };
    },
    onMutate: async ({ vendorId, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: ["saved-vendors", user?.id] });
      const previousSaved = queryClient.getQueryData(["saved-vendors", user?.id]);

      queryClient.setQueryData(["saved-vendors", user?.id], (old: string[] = []) => {
        return isSaved ? old.filter((id) => id !== vendorId) : [...old, vendorId];
      });

      return { previousSaved };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(["saved-vendors", user?.id], context?.previousSaved);
      queryClient.invalidateQueries({ queryKey: ["saved-vendors", user?.id] });
      toast.error(currentLanguage === "ar" ? "فشل التحديث" : "Failed to update");
    },
  });

  const handleSaveVendor = (vendorId: string, isSaved: boolean) => {
    if (!user) {
      setPendingAction({
        type: "save_vendor",
        data: { vendorId },
        returnPath: location.pathname,
      });
      setAuthModalOpen(true);
      return;
    }
    saveMutation.mutate({ vendorId, isSaved: !!isSaved });
  };

  const handleRequestBooking = (vendor: any) => {
    navigate(`/app/buyer/book/${vendor.id}`);
  };

  const getTranslatedField = (vendor: any, field: string) => {
    const langField = currentLanguage === "ar" ? `${field}_ar` : `${field}_en`;
    return vendor[langField] || vendor[field];
  };

  const filteredVendors = vendors?.filter((vendor) => {
    if (searchTerm) {
      const name = getTranslatedField(vendor, "full_name")?.toLowerCase() || "";
      const company = getTranslatedField(vendor, "company_name")?.toLowerCase() || "";
      const bio = getTranslatedField(vendor, "bio")?.toLowerCase() || "";
      if (
        !name.includes(searchTerm.toLowerCase()) &&
        !company.includes(searchTerm.toLowerCase()) &&
        !bio.includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
    }

    if (minRating > 0 && (vendor.seller_rating || 0) < minRating) {
      return false;
    }

    if (selectedCity && vendor.service_cities) {
      if (!vendor.service_cities.includes(selectedCity)) {
        return false;
      }
    }

    return true;
  });

  const content = {
    en: {
      title: "Find Pros",
      search: "Search for services or providers...",
      myBookings: "My Bookings",
      allCategories: "All Categories",
      requestBooking: "Request Booking",
      verified: "Verified",
      instantBooking: "Instant Booking",
      projects: "projects",
      response: "response",
      experience: "years exp",
      available: "Available",
      busy: "Busy",
      unavailable: "Unavailable",
      comingSoon: "Coming soon",
      comingSoonToast: "This service is coming soon",
    },
    ar: {
      title: "ابحث عن محترفين",
      search: "ابحث عن خدمات أو مزودين...",
      myBookings: "حجوزاتي",
      allCategories: "جميع الفئات",
      requestBooking: "طلب حجز",
      verified: "موثّق",
      instantBooking: "حجز فوري",
      projects: "مشروع",
      response: "استجابة",
      experience: "سنوات خبرة",
      available: "متاح",
      busy: "مشغول",
      unavailable: "غير متاح",
      comingSoon: "قريباً",
      comingSoonToast: "هذه الخدمة ستتوفر قريباً",
    },
  };

  const t = content[currentLanguage];



  // ✅ Optional B: toast when disabled category tapped
  const handleCategoryTap = (cat: (typeof SERVICE_CATEGORIES)[number]) => {
    if (!cat.enabled) {
      toast.info(t.comingSoonToast);
      return;
    }
    setSelectedCategory((prev) => (prev === cat.key ? null : cat.key));
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
      <GradientHeader title={t.title} />

      <div className="px-6 py-6 space-y-6">
        {isGuestMode && <TrustBanner currentLanguage={currentLanguage} />}

        <SearchHero
          layoutId={fromHome ? "search-hero" : undefined}
          placeholder={t.search}
          currentLanguage={currentLanguage}
          onSearch={(query) => setSearchTerm(query)}
          onFilterClick={() => setFilterSheetOpen(true)}
        />

        <div className="space-y-3 mt-4">
          {/* ✅ Category Filter (FIXED spacing + coming soon label) */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-3 overflow-x-auto pb-2">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="h-9 px-4 text-xs whitespace-nowrap cursor-pointer flex-shrink-0"
                onClick={() => setSelectedCategory(null)}
              >
                {t.allCategories}
              </Badge>

              {SERVICE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const isDisabled = !cat.enabled;

                return (
                  <div key={cat.key} className="flex flex-col items-center flex-shrink-0">
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className={`h-9 px-4 text-xs whitespace-nowrap ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      onClick={() => handleCategoryTap(cat)}
                    >
                      {cat.icon} {currentLanguage === "ar" ? cat.ar : cat.en}
                    </Badge>

                    {isDisabled && (
                      <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                        {t.comingSoon}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-64 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
            </>
          ) : filteredVendors && filteredVendors.length > 0 ? (
            filteredVendors.map((vendor, index) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VendorCard
                  vendor={vendor}
                  currentLanguage={currentLanguage}
                  isSaved={savedVendors?.includes(vendor.id)}
                  onToggleSave={handleSaveVendor}
                  onRequestBooking={handleRequestBooking}
                  onNavigate={navigate}
                />
              </motion.div>
            ))
          ) : (
            <ConciergeCard currentLanguage={currentLanguage} />
          )}
        </div>
      </div>



      {/* Filter Bottom Sheet */}
      <BottomSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <Heading2 lang={currentLanguage}>{currentLanguage === "ar" ? "التصفية" : "Filters"}</Heading2>
            <Button variant="ghost" size="sm" onClick={() => setFilterSheetOpen(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="space-y-3">
            <span className={`text-base font-medium ${currentLanguage === "ar" ? "font-ar-body" : "font-body"}`}>
              {currentLanguage === "ar" ? "التقييم" : "Rating"}
            </span>
            <div className="flex gap-2 flex-wrap">
              {[0, 3, 4, 4.5].map((rating) => (
                <Badge
                  key={rating}
                  variant={minRating === rating ? "default" : "outline"}
                  className={`cursor-pointer ${currentLanguage === "ar" ? "font-ar-body" : "font-body"}`}
                  onClick={() => setMinRating(rating)}
                >
                  {rating === 0 ? (currentLanguage === "ar" ? "الكل" : "All") : `${rating}+ ⭐`}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className={`text-base font-medium ${currentLanguage === "ar" ? "font-ar-body" : "font-body"}`}>
              {currentLanguage === "ar" ? "المدينة" : "City"}
            </span>
            <CityCombobox
              value={selectedCity || ""}
              onValueChange={(value) => setSelectedCity(value || null)}
              currentLanguage={currentLanguage}
              placeholder={currentLanguage === "ar" ? "جميع المدن" : "All Cities"}
            />
          </div>

          <Button className={`w-full h-12 ${currentLanguage === "ar" ? "font-ar-body" : "font-body"}`} onClick={() => setFilterSheetOpen(false)}>
            {currentLanguage === "ar" ? "تطبيق" : "Apply Filters"}
          </Button>
        </div>
      </BottomSheet>

      <AuthTriggerModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        currentLanguage={currentLanguage}
        pendingAction={pendingAction}
      />

      {/* Set Your City Modal - appears once on first visit */}
      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-background w-full max-w-md rounded-t-3xl p-6 pb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-muted rounded-full" />
            </div>

            <div className="text-center space-y-3 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <Heading2 lang={currentLanguage}>
                {currentLanguage === "ar" ? "حدد مدينتك" : "Set Your City"}
              </Heading2>
              <Body lang={currentLanguage} className="text-muted-foreground">
                {currentLanguage === "ar"
                  ? "لعرض مزودي الخدمات والوظائف المناسبة في منطقتك"
                  : "To show you relevant providers and jobs in your area"}
              </Body>
            </div>

            <div className="space-y-3">
              {/* Use My Location Option */}
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        // For now, default to Jeddah when location is detected
                        // In production, you'd reverse geocode this
                        const detectedCity = "Jeddah";
                        setSelectedCity(detectedCity);
                        localStorage.setItem('buyerPreferredCity', detectedCity);
                        localStorage.setItem('buyerCityPreferenceSet', 'true');
                        setShowCityModal(false);
                        toast.success(currentLanguage === "ar" ? "تم تحديد الموقع" : "Location detected");
                      },
                      () => {
                        toast.error(currentLanguage === "ar" ? "تعذر تحديد الموقع" : "Could not detect location");
                      }
                    );
                  } else {
                    toast.error(currentLanguage === "ar" ? "الموقع غير مدعوم" : "Location not supported");
                  }
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex-1 text-${currentLanguage === "ar" ? "right" : "left"}`}>
                  <Heading3 lang={currentLanguage} className="text-base">
                    {currentLanguage === "ar" ? "استخدم موقعي" : "Use My Location"}
                  </Heading3>
                  <Caption lang={currentLanguage} className="text-muted-foreground">
                    {currentLanguage === "ar" ? "اكتشف مدينتك تلقائياً" : "Automatically detect your city"}
                  </Caption>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground ${currentLanguage === "ar" ? "rotate-180" : ""}`} />
              </button>

              {/* Choose Manually Option */}
              <button
                onClick={() => {
                  setShowCityModal(false);
                  setShowCityPicker(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-foreground" />
                </div>
                <div className={`flex-1 text-${currentLanguage === "ar" ? "right" : "left"}`}>
                  <Heading3 lang={currentLanguage} className="text-base">
                    {currentLanguage === "ar" ? "اختر يدوياً" : "Choose Manually"}
                  </Heading3>
                  <Caption lang={currentLanguage} className="text-muted-foreground">
                    {currentLanguage === "ar" ? "اختر من قائمة المدن" : "Select from the list of cities"}
                  </Caption>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground ${currentLanguage === "ar" ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Skip Button */}
            <button
              onClick={() => {
                localStorage.setItem('buyerCityPreferenceSet', 'true');
                setShowCityModal(false);
              }}
              className={`w-full mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors ${currentLanguage === "ar" ? "font-ar-body" : "font-body"}`}
            >
              {currentLanguage === "ar" ? "تخطي الآن" : "Skip for now"}
            </button>
          </motion.div>
        </div>
      )}

      {/* City Picker Bottom Sheet */}
      <BottomSheet open={showCityPicker} onOpenChange={setShowCityPicker}>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <Heading2 lang={currentLanguage}>
            {currentLanguage === "ar" ? "اختر مدينتك" : "Choose Your City"}
          </Heading2>

          <CityCombobox
            value={selectedCity || ""}
            onValueChange={(value) => {
              if (value) {
                setSelectedCity(value);
                localStorage.setItem('buyerPreferredCity', value);
                localStorage.setItem('buyerCityPreferenceSet', 'true');
                setShowCityPicker(false);
                toast.success(currentLanguage === "ar" ? "تم حفظ المدينة" : "City saved");
              }
            }}
            currentLanguage={currentLanguage}
            placeholder={currentLanguage === "ar" ? "ابحث عن مدينة..." : "Search for a city..."}
          />
        </div>
      </BottomSheet>
    </div>
  );
};
