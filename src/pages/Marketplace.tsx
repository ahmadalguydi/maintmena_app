import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, MapPin, Clock, DollarSign, Bookmark, AlertCircle, MessageSquare, Check, ChevronsUpDown, Grid3x3, List, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SAUDI_CITIES, COUNTRIES } from '@/lib/saudiCities';
import { cn } from '@/lib/utils';
import { SERVICE_CATEGORIES, getAllCategories } from '@/lib/serviceCategories';
interface MarketplaceProps {
  currentLanguage: 'en' | 'ar';
}

// Service categories now imported from centralized file

const Marketplace = ({
  currentLanguage
}: MarketplaceProps) => {
  const {
    user
  } = useAuth();
  const {
    formatAmount
  } = useCurrency();
  const {
    toast
  } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [cityOpen, setCityOpen] = useState(false);
  const [savedRequests, setSavedRequests] = useState<Set<string>>(new Set());
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'recent' | 'urgency' | 'budget' | 'deadline'>('recent');
  useEffect(() => {
    // Get filters from URL params
    const audience = searchParams.get('audience');
    if (audience) setAudienceFilter(audience);
  }, [searchParams]);
  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchSavedRequests();
    }
  }, [user]);
  const fetchRequests = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('maintenance_requests').select('*').eq('status', 'open').eq('visibility', 'public').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading requests',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchSavedRequests = async () => {
    if (!user) return;
    try {
      const {
        data
      } = await supabase.from('saved_requests').select('request_id').eq('seller_id', user.id);
      if (data) {
        setSavedRequests(new Set(data.map((r: any) => r.request_id)));
      }
    } catch (error) {
      console.error('Error fetching saved requests:', error);
    }
  };
  const toggleSaveRequest = async (requestId: string) => {
    if (!user) return;
    try {
      if (savedRequests.has(requestId)) {
        await supabase.from('saved_requests').delete().eq('seller_id', user.id).eq('request_id', requestId);
        setSavedRequests(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
        toast({
          title: 'Removed from saved'
        });
      } else {
        await supabase.from('saved_requests').insert({
          seller_id: user.id,
          request_id: requestId
        });
        setSavedRequests(prev => new Set(prev).add(requestId));
        toast({
          title: 'Saved successfully'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Helper to get translated field
  const getTranslatedField = (req: any, field: string) => {
    const langField = currentLanguage === 'ar' ? `${field}_ar` : `${field}_en`;
    return req[langField] || req[field];
  };
  const filteredRequests = requests.filter(req => {
    const title = getTranslatedField(req, 'title');
    const description = getTranslatedField(req, 'description');
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || description.toLowerCase().includes(searchTerm.toLowerCase()) || req.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgencyFilter === 'all' || req.urgency === urgencyFilter;
    const matchesServiceCategory = serviceCategoryFilter === 'all' || req.tags?.service_category === serviceCategoryFilter || req.category === serviceCategoryFilter;
    const matchesCountry = countryFilter === 'all' || req.country === countryFilter;
    const matchesCity = cityFilter === 'all' || req.city === cityFilter;
    const matchesAudience = audienceFilter === 'all' || req.tags?.audience === audienceFilter || req.service_type === audienceFilter;
    const matchesTimeline = timelineFilter === 'all' || req.tags?.timeline === timelineFilter;
    return matchesSearch && matchesUrgency && matchesServiceCategory && matchesCountry && matchesCity && matchesAudience && matchesTimeline;
  }).sort((a, b) => {
    // Apply sorting
    switch (sortBy) {
      case 'urgency':
        const urgencyOrder = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3
        };
        return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
      case 'budget':
        return (b.budget_max || 0) - (a.budget_max || 0);
      case 'deadline':
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'recent':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }
  const allCategories = [...SERVICE_CATEGORIES.home, ...SERVICE_CATEGORIES.project];
  const getCategoryIcon = (serviceType?: string, serviceCategory?: string) => {
    const cat = allCategories.find(c => c.serviceType === serviceType || c.key === serviceCategory);
    return cat?.icon || '🔧';
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-6 sm:py-12 overflow-x-hidden">
    <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
      <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mb-6 sm:mb-8 text-center">
        <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 mb-3 sm:mb-4 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
          {currentLanguage === 'ar' ? 'السوق المباشر' : 'Live Marketplace'}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-ink via-accent to-primary bg-clip-text text-transparent px-2">
          {currentLanguage === 'ar' ? 'ابحث عن مشروعك القادم' : 'Find Your Next Project'}
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          {currentLanguage === 'ar'
            ? 'تصفح طلبات الخدمات الموثقة من أصحاب المنازل والشركات. قدم عروضك واحصل على المشاريع.'
            : 'Browse verified service requests from homeowners and businesses. Submit quotes and win work.'}
        </p>
      </motion.div>

      {/* Category Tabs */}
      <Tabs value={audienceFilter} onValueChange={setAudienceFilter} className="mb-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
          <TabsTrigger value="all" className="gap-2">
            {currentLanguage === 'ar' ? 'كل الوظائف' : 'All Jobs'}
          </TabsTrigger>
          <TabsTrigger value="home" className="gap-2">
            🏠 {currentLanguage === 'ar' ? 'المنازل' : 'Home'}
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-2">
            🏗️ {currentLanguage === 'ar' ? 'المشاريع' : 'Projects'}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quick Filter Chips - Service Categories */}
      <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.05
      }} className="mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-2">
          {audienceFilter !== 'project' && SERVICE_CATEGORIES.home.slice(0, 4).map(cat => <Badge key={cat.key} variant={serviceCategoryFilter === cat.key ? 'default' : 'outline'} className="cursor-pointer hover:scale-105 transition-transform" onClick={() => setServiceCategoryFilter(serviceCategoryFilter === cat.key ? 'all' : cat.key)}>
            {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
          </Badge>)}
          {audienceFilter !== 'home' && SERVICE_CATEGORIES.project.slice(0, 4).map(cat => <Badge key={cat.key} variant={serviceCategoryFilter === cat.key ? 'default' : 'outline'} className="cursor-pointer hover:scale-105 transition-transform" onClick={() => setServiceCategoryFilter(serviceCategoryFilter === cat.key ? 'all' : cat.key)}>
            {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
          </Badge>)}
          <Badge variant={urgencyFilter === 'critical' ? 'destructive' : 'outline'} className="cursor-pointer hover:scale-105 transition-transform" onClick={() => setUrgencyFilter(urgencyFilter === 'critical' ? 'all' : 'critical')}>
            🚨 {currentLanguage === 'ar' ? 'طوارئ' : 'Urgent'}
          </Badge>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.1
      }}>
        <Card className="mb-6 sm:mb-8 border-rule backdrop-blur-sm bg-card/50 shadow-xl">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <Input
                    placeholder={currentLanguage === 'ar' ? 'بحث...' : 'Search...'}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 sm:pl-11 h-10 sm:h-11 bg-background/50 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Select value={countryFilter} onValueChange={value => {
                  setCountryFilter(value);
                  if (value !== 'saudi_arabia') {
                    setCityFilter('all');
                  }
                }}>
                  <SelectTrigger className="h-9 sm:h-11 bg-background/50 text-xs sm:text-sm">
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'الدولة' : 'Country'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{currentLanguage === 'ar' ? 'كل الدول' : 'All Countries'}</SelectItem>
                    {COUNTRIES.map(country => <SelectItem key={country.value} value={country.value}>
                      {currentLanguage === 'ar' ? (country.value === 'saudi_arabia' ? 'السعودية' : country.label) : country.label}
                    </SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={cityOpen} disabled={countryFilter !== 'saudi_arabia'} className="h-9 sm:h-11 bg-background/50 justify-between font-normal text-xs sm:text-sm min-w-0">
                      <span className="truncate">
                        {cityFilter === 'all'
                          ? (currentLanguage === 'ar' ? 'المدينة' : 'City')
                          : SAUDI_CITIES.find(city => city === cityFilter) || (currentLanguage === 'ar' ? 'المدينة' : 'City')}
                      </span>
                      <ChevronsUpDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={currentLanguage === 'ar' ? 'ابحث عن مدينة...' : 'Search city...'} />
                      <CommandList>
                        <CommandEmpty>{currentLanguage === 'ar' ? 'لم يتم العثور على مدينة' : 'No city found.'}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="all" onSelect={() => {
                            setCityFilter('all');
                            setCityOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", cityFilter === 'all' ? "opacity-100" : "opacity-0")} />
                            {currentLanguage === 'ar' ? 'كل المدن' : 'All Cities'}
                          </CommandItem>
                          {SAUDI_CITIES.map(city => <CommandItem key={city} value={city} onSelect={value => {
                            setCityFilter(value);
                            setCityOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", cityFilter === city ? "opacity-100" : "opacity-0")} />
                            {city}
                          </CommandItem>)}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger className="h-9 sm:h-11 bg-background/50 text-xs sm:text-sm">
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'الأولوية' : 'Urgency'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{currentLanguage === 'ar' ? 'كل الأولويات' : 'All Urgencies'}</SelectItem>
                    <SelectItem value="critical">🔴 {currentLanguage === 'ar' ? 'حرج' : 'Critical'}</SelectItem>
                    <SelectItem value="high">🟠 {currentLanguage === 'ar' ? 'عالي' : 'High'}</SelectItem>
                    <SelectItem value="medium">🟡 {currentLanguage === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                    <SelectItem value="low">🟢 {currentLanguage === 'ar' ? 'منخفض' : 'Low'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={serviceCategoryFilter} onValueChange={setServiceCategoryFilter}>
                  <SelectTrigger className="h-9 sm:h-11 bg-background/50 text-xs sm:text-sm">
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'الخدمة المحددة' : 'Specific Service'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">{currentLanguage === 'ar' ? 'كل الخدمات' : 'All Services'}</SelectItem>
                    {audienceFilter !== 'project' && <>
                      {SERVICE_CATEGORIES.home.map(cat => <SelectItem key={cat.key} value={cat.key}>
                        {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
                      </SelectItem>)}
                    </>}
                    {audienceFilter !== 'home' && <>
                      {SERVICE_CATEGORIES.project.map(cat => <SelectItem key={cat.key} value={cat.key}>
                        {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
                      </SelectItem>)}
                    </>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Count & Controls */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs sm:text-sm font-medium text-ink">
          {' '}

        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border border-rule rounded-md p-1">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 px-2">
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8 px-2">
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="h-9 w-[140px] bg-background">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{currentLanguage === 'ar' ? 'الأحدث' : 'Most Recent'}</SelectItem>
              <SelectItem value="urgency">{currentLanguage === 'ar' ? 'حسب الأولوية' : 'By Urgency'}</SelectItem>
              <SelectItem value="budget">{currentLanguage === 'ar' ? 'حسب الميزانية' : 'By Budget'}</SelectItem>
              <SelectItem value="deadline">{currentLanguage === 'ar' ? 'حسب الموعد' : 'By Deadline'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Request Cards */}
      <div className={cn("grid gap-5", viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
        {filteredRequests.map((request, index) => <motion.div key={request.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: index * 0.05
        }}>
          <Card className="group hover:shadow-luxury transition-all duration-500 border-rule/50 backdrop-blur-sm bg-gradient-to-br from-card/95 to-card/80 overflow-hidden relative">
            {/* Accent bar on left */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${request.urgency === 'critical' ? 'bg-destructive' : request.urgency === 'high' ? 'bg-orange-500' : request.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'} group-hover:w-2`} />

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="relative z-10 p-4 sm:p-6">
              {/* Service Icon Badge - Top Right Corner */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 text-3xl sm:text-4xl opacity-20 group-hover:opacity-40 transition-opacity">
                {getCategoryIcon(request.service_type, request.service_category)}
              </div>

              {/* Header section */}
              <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex-1 min-w-0">
                  {/* Badges Row */}
                  <div className="mb-2 sm:mb-3 flex flex-wrap gap-2">
                    {/* Audience Badge */}
                    {request.tags?.audience && <Badge variant="secondary" className="gap-1">
                      {request.tags.audience === 'home'
                        ? (currentLanguage === 'ar' ? '🏠 منزل' : '🏠 Home')
                        : (currentLanguage === 'ar' ? '🏗️ مشروع' : '🏗️ Project')}
                    </Badge>}

                    {/* Buyer Type Badge */}
                    {request.buyer_type === 'individual' ? <Badge variant="outline" className="gap-1">
                      <span>👤</span>
                      <span className="text-[10px] sm:text-xs">{currentLanguage === 'ar' ? 'فرد' : 'Individual'}</span>
                    </Badge> : <Badge variant="outline" className="gap-1">
                      <span>🏢</span>
                      <span className="text-[10px] sm:text-xs">{currentLanguage === 'ar' ? 'شركة' : 'Company'}</span>
                    </Badge>}

                    {/* Timeline Badge */}
                    {request.tags?.timeline === 'urgent' && <Badge variant="destructive" className="gap-1">
                      ⚡ {currentLanguage === 'ar' ? 'نفس اليوم' : 'Same Day'}
                    </Badge>}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 group-hover:text-primary transition-colors leading-tight break-words">
                    {getTranslatedField(request, 'title')}
                  </h3>

                  {/* Meta badges */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                    <Badge variant={getUrgencyColor(request.urgency)} className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-sm">
                      {request.urgency === 'critical' && '🔴 '}
                      {request.urgency === 'high' && '🟠 '}
                      {request.urgency === 'medium' && '🟡 '}
                      {request.urgency === 'low' && '🟢 '}
                      {request.urgency.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs capitalize shadow-sm px-2 sm:px-2.5 py-0.5 sm:py-1">
                      {request.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 line-clamp-2 leading-relaxed break-words">
                {getTranslatedField(request, 'description')}
              </p>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-5">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/40 backdrop-blur-sm border border-border/50 transition-all hover:border-primary/30 hover:bg-muted/60 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{currentLanguage === 'ar' ? 'الموقع' : 'Location'}</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">{request.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/40 backdrop-blur-sm border border-border/50 transition-all hover:border-accent/30 hover:bg-muted/60 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{currentLanguage === 'ar' ? 'الموعد النهائي' : 'Deadline'}</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">
                      {request.deadline ? format(new Date(request.deadline), 'MMM dd, yyyy') : currentLanguage === 'ar' ? 'مرن' : 'Flexible'}
                    </p>
                  </div>
                </div>

                {(request.estimated_budget_min || request.estimated_budget_max) && <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-muted/40 backdrop-blur-sm border border-border/50 transition-all hover:border-green-500/30 hover:bg-muted/60 min-w-0 col-span-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{currentLanguage === 'ar' ? 'الميزانية' : 'Budget'}</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">
                      {request.estimated_budget_min && request.estimated_budget_max ? `${formatAmount(request.estimated_budget_min)} - ${formatAmount(request.estimated_budget_max)}` : formatAmount(request.estimated_budget_min || request.estimated_budget_max)}
                    </p>
                  </div>
                </div>}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 border-t border-border/50 gap-3">
                <div className="flex items-center gap-3 sm:gap-5 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="font-semibold text-foreground">{request.quotes_count || 0}</span>
                    <span className="hidden sm:inline">{currentLanguage === 'ar' ? 'عروض' : 'quotes'}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="font-semibold text-foreground">{request.views_count || 0}</span>
                    <span className="hidden sm:inline">{currentLanguage === 'ar' ? 'مشاهدات' : 'views'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSaveRequest(request.id)}
                    className="hover:scale-110 transition-transform shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <Bookmark className={`h-4 w-4 sm:h-5 sm:w-5 transition-all ${savedRequests.has(request.id) ? 'fill-primary text-primary scale-110' : 'text-muted-foreground hover:text-primary'}`} />
                  </Button>
                  <Link to={`/job/${request.id}`} className="flex-1 sm:flex-initial">
                    <Button className="gap-1 sm:gap-2 shadow-md hover:shadow-lg transition-all group-hover:scale-105 text-xs sm:text-sm h-9 sm:h-10 w-full">
                      <span className="hidden sm:inline">
                        {currentLanguage === 'ar' ? 'عرض التفاصيل وتقديم عرض' : 'View Details & Quote'}
                      </span>
                      <span className="sm:hidden">
                        {currentLanguage === 'ar' ? 'عرض وتقديم' : 'View & Quote'}
                      </span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>)}

        {filteredRequests.length === 0 && <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium mb-2">
              {currentLanguage === 'ar' ? 'لم يتم العثور على طلبات' : 'No requests found'}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              {currentLanguage === 'ar'
                ? 'حاول تعديل الفلاتر أو مصطلحات البحث'
                : 'Try adjusting your filters or search terms'}
            </p>
          </CardContent>
        </Card>}
      </div>
    </div>
  </div>;
};
export default Marketplace;
