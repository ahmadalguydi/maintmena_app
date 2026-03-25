import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Inbox, X } from "lucide-react";
import { JobCard } from "@/components/mobile/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SoftCard } from "@/components/mobile/SoftCard";
import { EmptyState } from "@/components/mobile/EmptyState";
import { Heading2, Body } from "@/components/mobile/Typography";
import { supabase } from "@/integrations/supabase/client";
import { getAllCategories, isAlphaEnabledCategory } from "@/lib/serviceCategories";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CityCombobox } from "@/components/mobile/CityCombobox";
import { toast } from "sonner";

interface MarketplaceProps {
  currentLanguage: "en" | "ar";
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  urgency: string;
  estimated_budget_min: number | null;
  estimated_budget_max: number | null;
  created_at: string;
  quotes_count: number;
}

export const Marketplace = ({ currentLanguage: propLanguage }: MarketplaceProps) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const currentLanguage = propLanguage || (localStorage.getItem("preferredLanguage") as "en" | "ar") || "ar";

  const categories = getAllCategories();

  const content = {
    ar: {
      title: "الوظائف المتاحة",
      all: "الكل",
      postedAgo: "منذ",
      quotes: "عروض",
      few: "قليل",
      many: "كثير",
      budgetUnknown: "الميزانية غير محددة",
      noJobs: "لا توجد وظائف متاحة حالياً",
      comingSoon: "قريباً",
      comingSoonToast: "هذه الخدمة ستتوفر قريباً",
    },
    en: {
      title: "Available Jobs",
      all: "All",
      postedAgo: "ago",
      quotes: "quotes",
      few: "Few",
      many: "Many",
      budgetUnknown: "Budget unspecified",
      noJobs: "No jobs available at the moment",
      comingSoon: "Soon",
      comingSoonToast: "This service is coming soon",
    },
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCity, selectedUrgency]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("maintenance_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (selectedCity !== "all") {
        query = query.eq("city", selectedCity);
      }

      if (selectedUrgency !== "all") {
        query = query.eq("urgency", selectedUrgency);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs((data as Job[]) || []);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const t = content[currentLanguage];

  return (
    <div className="pb-20 min-h-screen bg-background" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
      {/* Search Bar */}
      <div className="bg-background p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={currentLanguage === "ar" ? "ابحث عن وظيفة..." : "Search for a job..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-12 pl-12 pr-4 rounded-full bg-muted border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : 'font-body'}`}
            />
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterSheetOpen(true)}
            className="h-12 px-4 flex-shrink-0"
          >
            <Filter size={20} />
          </Button>
        </div>

        {/* Category Filter Chips (FIXED + tooltip/toast on disabled tap) */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {/* All */}
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 h-10 min-h-[44px] rounded-full whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : 'font-body'} ${selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(0,0,0,0.1)]"
              : "bg-background border border-border/30 text-foreground"
              }`}
          >
            {t.all}
          </button>

          {/* Categories */}
          {categories.slice(0, 8).map((cat) => {
            const isEnabled = isAlphaEnabledCategory(cat.key);
            const isSelected = selectedCategory === cat.key;

            return (
              <div key={cat.key} className="flex flex-col items-center flex-shrink-0">
                <button
                  onClick={() => {
                    if (!isEnabled) {
                      toast.info(t.comingSoonToast);
                      return;
                    }
                    setSelectedCategory(cat.key);
                  }}
                  disabled={!isEnabled}
                  className={`px-5 py-2 h-10 min-h-[44px] rounded-full whitespace-nowrap transition-all shadow-sm ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : 'font-body'} ${isSelected
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgb(0,0,0,0.1)]"
                    : "bg-background border border-border/30 text-foreground"
                    } ${!isEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {cat.icon} {currentLanguage === "ar" ? cat.ar : cat.en}
                </button>

                {!isEnabled && (
                  <span className={`mt-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}>
                    {currentLanguage === "ar" ? "قريباً" : "Soon"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Jobs List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SoftCard key={i} animate={false}>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4 rounded-full" />
                      <Skeleton className="h-4 w-full rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </div>
              </SoftCard>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={currentLanguage === "ar" ? "لا توجد فرص مطابقة حالياً" : "No Matching Jobs Right Now"}
            description={
              currentLanguage === "ar"
                ? "سنُعلمك فوراً عندما يظهر طلب جديد يناسب خدماتك. تأكد من تحديث مناطق خدمتك."
                : "We'll notify you instantly when a matching request appears. Make sure your service areas are up to date."
            }
          />
        ) : (
          filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              title={job.title}
              description={job.description}
              category={job.category}
              city={job.city || "N/A"}
              urgency={job.urgency as "urgent" | "normal" | "flexible"}
              budgetMin={job.estimated_budget_min || undefined}
              budgetMax={job.estimated_budget_max || undefined}
              createdAt={job.created_at}
              quotesCount={job.quotes_count}
              onClick={() => navigate(`/app/seller/marketplace/${job.id}`)}
              currentLanguage={currentLanguage}
            />
          ))
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <BottomSheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Heading2 lang={currentLanguage}>{currentLanguage === "ar" ? "التصفية" : "Filters"}</Heading2>
            <Button variant="ghost" size="sm" onClick={() => setFilterSheetOpen(false)}>
              <X size={20} />
            </Button>
          </div>

          {/* City Filter */}
          <div className="space-y-3">
            <Body lang={currentLanguage} className="font-semibold">
              {currentLanguage === "ar" ? "المدينة" : "City"}
            </Body>
            <div className="space-y-2">
              <Button
                variant={selectedCity === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCity("all")}
                className={`mb-2 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}
              >
                {currentLanguage === "ar" ? "جميع المدن" : "All Cities"}
              </Button>
              <CityCombobox
                value={selectedCity === "all" ? "" : selectedCity}
                onValueChange={(city) => setSelectedCity(city || "all")}
                currentLanguage={currentLanguage}
                placeholder={currentLanguage === "ar" ? "اختر مدينة محددة..." : "Select specific city..."}
              />
            </div>
          </div>

          {/* Urgency Filter */}
          <div className="space-y-3">
            <Body lang={currentLanguage} className="font-semibold">
              {currentLanguage === "ar" ? "الضرورة" : "Urgency"}
            </Body>
            <div className="flex flex-wrap gap-2">
              {["all", "high", "medium", "low"].map((urgency) => (
                <Badge
                  key={urgency}
                  variant={selectedUrgency === urgency ? "default" : "outline"}
                  className={`cursor-pointer ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}
                  onClick={() => setSelectedUrgency(urgency)}
                >
                  {urgency === "all"
                    ? currentLanguage === "ar"
                      ? "الكل"
                      : "All"
                    : urgency === "high"
                      ? currentLanguage === "ar"
                        ? "ضرورة عالية"
                        : "High Urgency"
                      : urgency === "medium"
                        ? currentLanguage === "ar"
                          ? "ضرورة متوسطة"
                          : "Medium Urgency"
                        : currentLanguage === "ar"
                          ? "ضرورة منخفضة"
                          : "Low Urgency"}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className={`flex-1 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}
              onClick={() => {
                setSelectedCity("all");
                setSelectedUrgency("all");
              }}
            >
              {currentLanguage === "ar" ? "مسح الكل" : "Clear All"}
            </Button>
            <Button className={`flex-1 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`} onClick={() => setFilterSheetOpen(false)}>
              {currentLanguage === "ar" ? "تطبيق" : "Apply"}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
