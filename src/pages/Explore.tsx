import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Star, Clock, Award, Zap, Grid3x3, List, ArrowUpDown, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SAUDI_CITIES, COUNTRIES } from '@/lib/saudiCities';
import { cn } from '@/lib/utils';
import BookingRequestModal from '@/components/BookingRequestModal';


interface ExploreProps {
  currentLanguage: 'en' | 'ar';
}

// Service categories matching CategoryGrid
const SERVICE_CATEGORIES = {
  home: [
    { key: 'ac_repair', icon: '❄️', en: 'AC Repair', ar: 'إصلاح التكييف', serviceType: 'hvac' },
    { key: 'plumbing', icon: '🚰', en: 'Plumbing', ar: 'سباكة', serviceType: 'plumbing' },
    { key: 'electrical', icon: '⚡', en: 'Electrical', ar: 'كهرباء', serviceType: 'electrical' },
    { key: 'painting', icon: '🎨', en: 'Painting', ar: 'دهان', serviceType: 'civil' },
    { key: 'cleaning', icon: '🧹', en: 'Cleaning', ar: 'تنظيف', serviceType: 'civil' },
    { key: 'handyman', icon: '🔧', en: 'Handyman', ar: 'عامل متعدد المهارات', serviceType: 'mechanical' },
    { key: 'appliances', icon: '🔌', en: 'Appliance Repair', ar: 'إصلاح الأجهزة', serviceType: 'electrical' },
    { key: 'landscaping_home', icon: '🌿', en: 'Home Landscaping', ar: 'تنسيق حدائق منزلية', serviceType: 'civil' },
  ],
  project: [
    { key: 'fitout', icon: '🏗️', en: 'Fit-Out', ar: 'تشطيب', serviceType: 'civil' },
    { key: 'tiling', icon: '⬜', en: 'Tiling', ar: 'بلاط', serviceType: 'civil' },
    { key: 'gypsum', icon: '🏛️', en: 'Gypsum/False Ceiling', ar: 'جبس/أسقف معلقة', serviceType: 'civil' },
    { key: 'carpentry', icon: '🪵', en: 'Carpentry/Joinery', ar: 'نجارة', serviceType: 'mechanical' },
    { key: 'mep', icon: '⚙️', en: 'MEP', ar: 'كهرباء وميكانيكا وسباكة', serviceType: 'mechanical' },
    { key: 'waterproofing', icon: '💧', en: 'Waterproofing', ar: 'عزل مائي', serviceType: 'civil' },
    { key: 'landscaping_commercial', icon: '🌳', en: 'Commercial Landscaping', ar: 'تنسيق حدائق تجاري', serviceType: 'civil' },
    { key: 'renovation', icon: '🏢', en: 'Full Renovation', ar: 'تجديد كامل', serviceType: 'civil' },
  ]
};

const Explore = ({ currentLanguage }: ExploreProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'response_time'>('rating');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [instantBookingOnly, setInstantBookingOnly] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          full_name_ar,
          company_name,
          company_name_ar,
          bio,
          bio_ar,
          seller_rating,
          completed_projects,
          response_time_hours,
          verified_seller,
          high_value_badge,
          instant_booking_enabled,
          availability_status,
          service_categories,
          avatar_seed
        `)
        .eq('discoverable', true)
        .in('user_type', ['seller', 'both'])
        .order('seller_rating', { ascending: false })
        .order('seller_rating', { ascending: false })
        .order('completed_projects', { ascending: false })
        .limit(50);

      if (error) throw error;

      setVendors(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading vendors',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const allCategories = [...SERVICE_CATEGORIES.home, ...SERVICE_CATEGORIES.project];

  const getCategoryLabel = (key: string) => {
    const cat = allCategories.find(c => c.key === key);
    return cat ? `${cat.icon} ${currentLanguage === 'ar' ? cat.ar : cat.en}` : key;
  };

  // Helper to get translated field
  const getTranslatedField = (vendor: any, field: string) => {
    const langField = currentLanguage === 'ar' ? `${field}_ar` : `${field}_en`;
    return vendor[langField] || vendor[field];
  };

  const filteredVendors = vendors.filter(vendor => {
    const fullName = getTranslatedField(vendor, 'full_name');
    const companyName = getTranslatedField(vendor, 'company_name');
    const bio = getTranslatedField(vendor, 'bio');

    const matchesSearch =
      fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bio?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      serviceCategoryFilter === 'all' ||
      vendor.service_categories?.includes(serviceCategoryFilter);

    const matchesVerified = !verifiedOnly || vendor.verified_seller;
    const matchesInstantBooking = !instantBookingOnly || vendor.instant_booking_enabled;

    return matchesSearch && matchesCategory && matchesVerified && matchesInstantBooking;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.seller_rating || 0) - (a.seller_rating || 0);
      case 'experience':
        return (b.years_of_experience || 0) - (a.years_of_experience || 0);
      case 'response_time':
        return (a.response_time_hours || 999) - (b.response_time_hours || 999);
      default:
        return 0;
    }
  });

  const getAvailabilityBadge = (status: string) => {
    const text = currentLanguage === 'ar'
      ? { accepting_requests: 'متاح', busy: 'مشغول', not_taking_work: 'غير متاح' }
      : { accepting_requests: 'Available', busy: 'Busy', not_taking_work: 'Unavailable' };

    switch (status) {
      case 'accepting_requests':
        return <Badge variant="default" className="gap-1">🟢 {text.accepting_requests}</Badge>;
      case 'busy':
        return <Badge variant="secondary" className="gap-1">🟡 {text.busy}</Badge>;
      case 'not_taking_work':
        return <Badge variant="outline" className="gap-1">🔴 {text.not_taking_work}</Badge>;
      default:
        return null;
    }
  };

  const handleRequestBooking = (vendor: any) => {
    setSelectedVendor(vendor);
    setBookingModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-block px-4 py-2 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {currentLanguage === 'ar' ? 'اكتشاف مقدمي الخدمات' : 'Vendor Discovery'}
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-ink via-accent to-primary bg-clip-text text-transparent">
            {currentLanguage === 'ar' ? 'استكشف مقدمي الخدمات' : 'Explore Service Providers'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {currentLanguage === 'ar'
              ? 'ابحث عن محترفين موثوقين لاحتياجات منزلك أو مشروعك'
              : 'Find verified professionals for your home or project needs'}
          </p>
        </motion.div>

        {/* Quick Category Chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2 justify-center">
            {allCategories.slice(0, 6).map((cat) => (
              <Badge
                key={cat.key}
                variant={serviceCategoryFilter === cat.key ? 'default' : 'outline'}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setServiceCategoryFilter(serviceCategoryFilter === cat.key ? 'all' : cat.key)}
              >
                {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
              </Badge>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={currentLanguage === 'ar' ? 'ابحث بالاسم أو الشركة أو الخدمات...' : 'Search by name, company, or services...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={verifiedOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className="gap-2"
                >
                  <Award className="h-4 w-4" />
                  {currentLanguage === 'ar' ? 'موثّق فقط' : 'Verified Only'}
                </Button>
                <Button
                  variant={instantBookingOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInstantBookingOnly(!instantBookingOnly)}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {currentLanguage === 'ar' ? 'حجز فوري' : 'Instant Booking'}
                </Button>
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={serviceCategoryFilter} onValueChange={setServiceCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'جميع الخدمات' : 'All Services'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">{currentLanguage === 'ar' ? 'جميع الخدمات' : 'All Services'}</SelectItem>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'جميع الدول' : 'All Countries'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{currentLanguage === 'ar' ? 'جميع الدول' : 'All Countries'}</SelectItem>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {currentLanguage === 'ar' ? country.label_ar || country.label : country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={cityFilter} onValueChange={setCityFilter} disabled={countryFilter !== 'saudi_arabia'}>
                  <SelectTrigger>
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'جميع المدن' : 'All Cities'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">{currentLanguage === 'ar' ? 'جميع المدن' : 'All Cities'}</SelectItem>
                    {SAUDI_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-rule rounded-md p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">{currentLanguage === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'}</SelectItem>
                <SelectItem value="experience">{currentLanguage === 'ar' ? 'الأكثر خبرة' : 'Most Experience'}</SelectItem>
                <SelectItem value="response_time">{currentLanguage === 'ar' ? 'استجابة سريعة' : 'Fast Response'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vendor Grid/List */}
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {filteredVendors.map((vendor, index) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-xl transition-all duration-300 border-rule/50 h-full">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {getTranslatedField(vendor, 'company_name') || getTranslatedField(vendor, 'full_name')}
                        </h3>
                        {vendor.verified_seller && (
                          <Award className="h-5 w-5 text-primary" />
                        )}
                        {vendor.high_value_badge && (
                          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
                            <Star className="h-3 w-3 fill-amber-800" />
                            {currentLanguage === 'ar' ? 'تصنيف عالي' : 'High Value Pro'}
                          </Badge>
                        )}
                      </div>
                      {vendor.company_name && vendor.full_name && (
                        <p className="text-sm text-muted-foreground">{getTranslatedField(vendor, 'full_name')}</p>
                      )}
                    </div>
                    {getAvailabilityBadge(vendor.availability_status)}
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    {vendor.seller_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{vendor.seller_rating.toFixed(1)}</span>
                      </div>
                    )}
                    {vendor.completed_projects > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span>{vendor.completed_projects} {currentLanguage === 'ar' ? 'مشروع' : 'projects'}</span>
                      </div>
                    )}
                    {vendor.response_time_hours && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{vendor.response_time_hours}{currentLanguage === 'ar' ? 'س استجابة' : 'h response'}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {vendor.bio && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {getTranslatedField(vendor, 'bio')}
                    </p>
                  )}

                  {/* Service Categories */}
                  {vendor.service_categories && vendor.service_categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vendor.service_categories.slice(0, 3).map((cat: string) => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {getCategoryLabel(cat)}
                        </Badge>
                      ))}
                      {vendor.service_categories.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{vendor.service_categories.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {vendor.instant_booking_enabled && (
                      <Badge variant="default" className="gap-1 text-xs">
                        <Zap className="h-3 w-3" />
                        {currentLanguage === 'ar' ? 'حجز فوري' : 'Instant Booking'}
                      </Badge>
                    )}
                    {vendor.years_of_experience > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {vendor.years_of_experience}+ {currentLanguage === 'ar' ? 'سنوات خبرة' : 'years exp'}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleRequestBooking(vendor)}
                    >
                      {currentLanguage === 'ar' ? 'طلب حجز' : 'Request Booking'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredVendors.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <p className="text-xl font-semibold mb-2">
                {currentLanguage === 'ar' ? 'لم يتم العثور على مزودين' : 'No vendors found'}
              </p>
              <p className="text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'حاول تعديل الفلاتر أو مصطلحات البحث'
                  : 'Try adjusting your filters or search terms'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Booking Request Modal */}
        {selectedVendor && (
          <BookingRequestModal
            open={bookingModalOpen}
            onOpenChange={setBookingModalOpen}
            vendor={selectedVendor}
            currentLanguage={currentLanguage}
            onSuccess={() => {
              setBookingModalOpen(false);
              toast({
                title: 'Booking request sent!',
                description: `Your request has been sent to ${selectedVendor.company_name || selectedVendor.full_name}`,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Explore;
