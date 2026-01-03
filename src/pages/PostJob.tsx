import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Home, Building2, Wrench, Droplet, Zap, Wind, Hammer, PaintBucket, Shield, Settings, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { trackJobPosted } from '@/lib/brevoAnalytics';
import { SAUDI_CITIES } from '@/lib/saudiCities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SERVICE_CATEGORIES, getCategoryLabel } from '@/lib/serviceCategories';
import { QuoteTemplateManager, QuoteSection, DEFAULT_SECTIONS } from '@/components/QuoteTemplateManager';

interface PostJobProps {
  currentLanguage: 'en' | 'ar';
}

// Service categories imported from centralized file

const PostJob = ({ currentLanguage }: PostJobProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, convertAmount } = useCurrency();
  
  const [requestType, setRequestType] = useState<'home' | 'project'>('home');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serviceCategory: '',
    location: '',
    country: 'Saudi Arabia',
    city: '',
    urgency: 'medium',
    budget: '',
    estimatedBudgetMin: '',
    estimatedBudgetMax: '',
    timeline: '',
    jobSize: '',
    siteStatus: '',
    facilityType: '',
    scopeOfWork: '',
    paymentMethod: 'cash' as 'cash' | 'online_maintmena'
  });
  const [deadline, setDeadline] = useState<Date>();
  const [preferredStartDate, setPreferredStartDate] = useState<Date>();
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [quoteTemplateSections, setQuoteTemplateSections] = useState<QuoteSection[]>(DEFAULT_SECTIONS);
  const [customTemplateSections, setCustomTemplateSections] = useState<QuoteSection[]>([]);
  const [hasCustomizedTemplate, setHasCustomizedTemplate] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(currentLanguage === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
      navigate('/login');
      return;
    }

    // Validate user ID exists
    if (!user.id) {
      console.error('User ID is missing:', user);
      toast.error(currentLanguage === 'ar' ? 'خطأ في بيانات المستخدم' : 'User data error');
      return;
    }

    // Validation
    if (!formData.title || !formData.description || !formData.serviceCategory) {
      toast.error(currentLanguage === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    
    try {
      // Convert budget to USD if needed
      const budgetUSD = formData.budget ? (currency === 'SAR' ? parseFloat(formData.budget) / 3.75 : parseFloat(formData.budget)) : null;
      const estimatedBudgetMinUSD = formData.estimatedBudgetMin ? (currency === 'SAR' ? parseFloat(formData.estimatedBudgetMin) / 3.75 : parseFloat(formData.estimatedBudgetMin)) : null;
      const estimatedBudgetMaxUSD = formData.estimatedBudgetMax ? (currency === 'SAR' ? parseFloat(formData.estimatedBudgetMax) / 3.75 : parseFloat(formData.estimatedBudgetMax)) : null;

      // Build tags
      const tags: any = {
        audience: requestType,
        service_category: formData.serviceCategory
      };

      if (requestType === 'project') {
        if (formData.timeline) tags.timeline = formData.timeline;
        if (formData.jobSize) tags.job_size = formData.jobSize;
        if (formData.siteStatus) tags.site_status = formData.siteStatus;
      }

      // Translate content to opposite language
      const sourceLang = currentLanguage;
      const targetLang = currentLanguage === 'ar' ? 'en' : 'ar';
      
      let translatedTitle = formData.title;
      let translatedDescription = formData.description;
      
      try {
        const { data: titleData } = await supabase.functions.invoke('translate-content', {
          body: { 
            text: formData.title, 
            sourceLang, 
            targetLang,
            context: 'maintenance request title'
          }
        });
        if (titleData?.translatedText) translatedTitle = titleData.translatedText;

        const { data: descData } = await supabase.functions.invoke('translate-content', {
          body: { 
            text: formData.description, 
            sourceLang, 
            targetLang,
            context: 'maintenance request description'
          }
        });
        if (descData?.translatedText) translatedDescription = descData.translatedText;
      } catch (translateError) {
        console.error('Translation error:', translateError);
        // Continue without translations if they fail
      }

      const { data: insertedData, error } = await supabase
        .from('maintenance_requests')
        .insert({
          buyer_id: user.id,
          title: formData.title,
          description: formData.description,
          title_en: currentLanguage === 'en' ? formData.title : translatedTitle,
          title_ar: currentLanguage === 'ar' ? formData.title : translatedTitle,
          description_en: currentLanguage === 'en' ? formData.description : translatedDescription,
          description_ar: currentLanguage === 'ar' ? formData.description : translatedDescription,
          original_language: currentLanguage,
          category: formData.serviceCategory,
          service_type: requestType,
          location: formData.city ? `${formData.city}, ${formData.country}` : formData.location || formData.country,
          country: formData.country,
          city: formData.city || null,
          urgency: formData.urgency,
          budget: budgetUSD,
          estimated_budget_min: estimatedBudgetMinUSD,
          estimated_budget_max: estimatedBudgetMaxUSD,
          deadline: deadline?.toISOString() || null,
          preferred_start_date: preferredStartDate?.toISOString() || null,
          project_duration_days: formData.timeline ? parseInt(formData.timeline) : null,
          facility_type: formData.facilityType || null,
          scope_of_work: formData.scopeOfWork || null,
          payment_method: formData.paymentMethod,
          tags,
          status: 'open',
          visibility: 'public'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      // Track job posting in Brevo
      if (user?.email && insertedData) {
        trackJobPosted(user.email, {
          serviceCategory: formData.serviceCategory,
          requestType,
          budget: formData.budget,
          location: formData.city || formData.location,
          language: currentLanguage
        });
      }

      // Save quote template if customized
      if (insertedData && hasCustomizedTemplate) {
        const allSections = [...quoteTemplateSections, ...customTemplateSections];
        const { error: templateError } = await supabase
          .from('request_quote_templates')
          .insert({
            request_id: insertedData.id,
            sections: allSections as any
          });
        
        if (templateError) {
          console.error('Error saving template:', templateError);
          // Don't fail the whole request if template save fails
        }
      }

      toast.success(currentLanguage === 'ar' ? 'تم نشر الطلب بنجاح!' : 'Request posted successfully!');
      navigate('/my-requests');
    } catch (error: any) {
      console.error('Error posting job:', error);
      const errorMessage = error?.message || 'Unknown error';
      toast.error(
        currentLanguage === 'ar' 
          ? `فشل نشر الطلب: ${errorMessage}` 
          : `Failed to post request: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = SERVICE_CATEGORIES[requestType];

  return (
    <div className="min-h-screen bg-paper py-8 px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <Card className="border-rule">
          <CardHeader>
            <CardTitle className="text-2xl">
              {currentLanguage === 'ar' ? 'نشر طلب جديد' : 'Post New Request'}
            </CardTitle>
            <CardDescription>
              {currentLanguage === 'ar' 
                ? 'قم بوصف احتياجاتك للحصول على عروض من مزودي الخدمة' 
                : 'Describe your needs to receive quotes from service providers'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Request Type Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {currentLanguage === 'ar' ? 'نوع الطلب' : 'Request Type'}
                </Label>
                <Tabs value={requestType} onValueChange={(v) => setRequestType(v as 'home' | 'project')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="home" className="gap-2">
                      <Home className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'خدمات منزلية' : 'Home Services'}
                    </TabsTrigger>
                    <TabsTrigger value="project" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'مشاريع' : 'Projects'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Service Category */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {currentLanguage === 'ar' ? 'فئة الخدمة *' : 'Service Category *'}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentCategories.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => handleChange('serviceCategory', category.key)}
                      className={cn(
                        "p-4 border-2 rounded-lg transition-all hover:border-primary",
                        formData.serviceCategory === category.key
                          ? "border-primary bg-primary/5"
                          : "border-rule"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="text-primary">{category.icon}</div>
                        <span className="text-sm font-medium">
                          {currentLanguage === 'ar' ? category.ar : category.en}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {currentLanguage === 'ar' ? 'عنوان الطلب *' : 'Request Title *'}
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder={currentLanguage === 'ar' ? 'مثال: صيانة نظام التكييف' : 'e.g., AC System Maintenance'}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {currentLanguage === 'ar' ? 'الوصف *' : 'Description *'}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder={currentLanguage === 'ar' ? 'اشرح التفاصيل...' : 'Explain the details...'}
                  rows={4}
                  required
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">
                    {currentLanguage === 'ar' ? 'الدولة' : 'Country'}
                  </Label>
                  <Select value={formData.country} onValueChange={(value) => handleChange('country', value)}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="Kuwait">Kuwait</SelectItem>
                      <SelectItem value="Bahrain">Bahrain</SelectItem>
                      <SelectItem value="Qatar">Qatar</SelectItem>
                      <SelectItem value="Oman">Oman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.country === 'Saudi Arabia' && (
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      {currentLanguage === 'ar' ? 'المدينة' : 'City'}
                    </Label>
                    <Select value={formData.city} onValueChange={(value) => handleChange('city', value)}>
                      <SelectTrigger id="city">
                        <SelectValue placeholder={currentLanguage === 'ar' ? 'اختر المدينة' : 'Select city'} />
                      </SelectTrigger>
                      <SelectContent>
                        {SAUDI_CITIES.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Urgency and Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="urgency">
                    {currentLanguage === 'ar' ? 'الأولوية' : 'Urgency'}
                  </Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleChange('urgency', value)}>
                    <SelectTrigger id="urgency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{currentLanguage === 'ar' ? 'منخفضة' : 'Low'}</SelectItem>
                      <SelectItem value="normal">{currentLanguage === 'ar' ? 'عادية' : 'Normal'}</SelectItem>
                      <SelectItem value="high">{currentLanguage === 'ar' ? 'عالية' : 'High'}</SelectItem>
                      <SelectItem value="critical">{currentLanguage === 'ar' ? 'حرجة' : 'Critical'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">
                    {currentLanguage === 'ar' ? 'الميزانية المتوقعة' : 'Expected Budget'}
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleChange('budget', e.target.value)}
                    placeholder={`${currency} ${currentLanguage === 'ar' ? '(اختياري)' : '(Optional)'}`}
                  />
                </div>
              </div>

              {/* Budget Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">
                    {currentLanguage === 'ar' ? 'الحد الأدنى للميزانية' : 'Budget Min'}
                  </Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    value={formData.estimatedBudgetMin}
                    onChange={(e) => handleChange('estimatedBudgetMin', e.target.value)}
                    placeholder={currency}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetMax">
                    {currentLanguage === 'ar' ? 'الحد الأقصى للميزانية' : 'Budget Max'}
                  </Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    value={formData.estimatedBudgetMax}
                    onChange={(e) => handleChange('estimatedBudgetMax', e.target.value)}
                    placeholder={currency}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {currentLanguage === 'ar' ? 'الموعد النهائي' : 'Deadline'}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? format(deadline, 'PPP') : <span>{currentLanguage === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>
                    {currentLanguage === 'ar' ? 'تاريخ البداية المفضل' : 'Preferred Start Date'}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {preferredStartDate ? format(preferredStartDate, 'PPP') : <span>{currentLanguage === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={preferredStartDate} onSelect={setPreferredStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3 p-4 border border-rule rounded-lg bg-muted/30">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  {currentLanguage === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </Label>
                <Tabs value={formData.paymentMethod} onValueChange={(v) => handleChange('paymentMethod', v)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cash" className="gap-2">
                      💵 {currentLanguage === 'ar' ? 'كاش' : 'Cash'}
                    </TabsTrigger>
                    <TabsTrigger value="online_maintmena" className="gap-2">
                      💳 {currentLanguage === 'ar' ? 'اونلاين' : 'Online'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-sm text-muted-foreground">
                  {formData.paymentMethod === 'online_maintmena' 
                    ? (currentLanguage === 'ar' 
                      ? 'الدفع الآمن عبر منصة MaintMENA مع حماية الضمان' 
                      : 'Secure payment through MaintMENA with escrow protection')
                    : (currentLanguage === 'ar'
                      ? 'الدفع النقدي المباشر لمقدم الخدمة'
                      : 'Direct cash payment to service provider')}
                </p>
              </div>

              {/* Project-specific fields */}
              {requestType === 'project' && (
                <div className="space-y-4 p-4 border border-rule rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">
                      {currentLanguage === 'ar' ? 'تفاصيل المشروع' : 'Project Details'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeline">
                        {currentLanguage === 'ar' ? 'المدة المتوقعة (أيام)' : 'Expected Timeline (days)'}
                      </Label>
                      <Input
                        id="timeline"
                        type="number"
                        value={formData.timeline}
                        onChange={(e) => handleChange('timeline', e.target.value)}
                        placeholder={currentLanguage === 'ar' ? 'مثال: 30' : 'e.g., 30'}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobSize">
                        {currentLanguage === 'ar' ? 'حجم المشروع' : 'Project Size'}
                      </Label>
                      <Select value={formData.jobSize} onValueChange={(value) => handleChange('jobSize', value)}>
                        <SelectTrigger id="jobSize">
                          <SelectValue placeholder={currentLanguage === 'ar' ? 'اختر الحجم' : 'Select size'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">{currentLanguage === 'ar' ? 'صغير' : 'Small'}</SelectItem>
                          <SelectItem value="medium">{currentLanguage === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                          <SelectItem value="large">{currentLanguage === 'ar' ? 'كبير' : 'Large'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facilityType">
                      {currentLanguage === 'ar' ? 'نوع المنشأة' : 'Facility Type'}
                    </Label>
                    <Input
                      id="facilityType"
                      value={formData.facilityType}
                      onChange={(e) => handleChange('facilityType', e.target.value)}
                      placeholder={currentLanguage === 'ar' ? 'مثال: مصنع، مكتب، مستشفى' : 'e.g., Factory, Office, Hospital'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scopeOfWork">
                      {currentLanguage === 'ar' ? 'نطاق العمل' : 'Scope of Work'}
                    </Label>
                    <Textarea
                      id="scopeOfWork"
                      value={formData.scopeOfWork}
                      onChange={(e) => handleChange('scopeOfWork', e.target.value)}
                      placeholder={currentLanguage === 'ar' ? 'اشرح نطاق العمل بالتفصيل...' : 'Describe the scope of work in detail...'}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Quote Template Section */}
              <Card className="border-accent/20 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-5 h-5 text-accent" />
                    {currentLanguage === 'ar' ? 'قالب عروض الأسعار' : 'Quote Template Settings'}
                  </CardTitle>
                  <CardDescription>
                    {currentLanguage === 'ar' 
                      ? 'خصص المعلومات التي تريد من مقدمي الخدمة تضمينها في عروضهم' 
                      : 'Customize what information you want sellers to include in their quotes'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setTemplateModalOpen(true)}
                    className="w-full gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {hasCustomizedTemplate 
                      ? (currentLanguage === 'ar' ? 'تعديل قالب العروض ✓' : 'Edit Quote Template ✓')
                      : (currentLanguage === 'ar' ? 'تكوين قالب العروض' : 'Configure Quote Template')}
                  </Button>
                  {hasCustomizedTemplate && (
                    <p className="text-xs text-accent mt-2 flex items-center gap-1">
                      ✓ {currentLanguage === 'ar' ? 'تم تخصيص القالب' : 'Template configured'}
                    </p>
                  )}
                  {!hasCustomizedTemplate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentLanguage === 'ar' 
                        ? 'اختياري - سيتم استخدام القالب الافتراضي إذا لم يتم التخصيص' 
                        : 'Optional - Default template will be used if not configured'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                  className="flex-1"
                >
                  {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading 
                    ? (currentLanguage === 'ar' ? 'جاري النشر...' : 'Posting...') 
                    : (currentLanguage === 'ar' ? 'نشر الطلب' : 'Post Request')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Quote Template Manager Modal */}
      <QuoteTemplateManager
        requestId={undefined}
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        initialSections={quoteTemplateSections}
        initialCustomSections={customTemplateSections}
        currentLanguage={currentLanguage}
        onSave={(sections, customSections) => {
          setQuoteTemplateSections(sections);
          setCustomTemplateSections(customSections);
          setHasCustomizedTemplate(true);
        }}
      />
    </div>
  );
};

export default PostJob;
