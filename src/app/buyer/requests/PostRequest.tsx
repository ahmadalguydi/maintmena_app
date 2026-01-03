import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Camera, FileText, Settings } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProgressBar } from '@/components/mobile/ProgressBar';
import { TouchCard } from '@/components/mobile/TouchCard';
import { useHaptics } from '@/hooks/useHaptics';
import { getAllCategories, isAlphaEnabledCategory } from '@/lib/serviceCategories';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Heading2, Label, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { QuoteTemplateManager, type QuoteSection, DEFAULT_SECTIONS } from '@/components/QuoteTemplateManager';
import { postRequestSchema } from '@/lib/validationSchemas';
import { handleError } from '@/lib/errorHandler';
import { AuthTriggerModal } from '@/components/mobile/AuthTriggerModal';
import { AddressPicker } from '@/components/mobile/AddressPicker';
import { useCelebration } from '@/contexts/CelebrationContext';
import { SuccessScreen } from '@/components/mobile/SuccessScreen';

const STORAGE_KEY = 'pendingRequest';

interface PostRequestProps {
  currentLanguage: 'en' | 'ar';
}

export const PostRequest = ({ currentLanguage: propLanguage }: PostRequestProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { vibrate, notificationSuccess } = useHaptics();
  const { celebrate } = useCelebration();
  const currentLanguage = propLanguage || (localStorage.getItem('preferredLanguage') as 'en' | 'ar') || 'ar';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const preselectedCategory = location.state?.category;

  const [formData, setFormData] = useState({
    title: '',
    category: preselectedCategory || '',
    urgency: 'medium',
    city: '',
    neighborhood: '',
    preferredDate: new Date().toISOString().split('T')[0],
    flexibleDate: false,
    timeWindow: 'afternoon',
    flexibleTime: false,
    budgetMin: '',
    budgetMax: '',
    budgetFlexible: false,
    description: '',
    photos: [] as string[]
  });

  const [quoteSections, setQuoteSections] = useState<QuoteSection[]>([]);
  const [customQuoteSections, setCustomQuoteSections] = useState<QuoteSection[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Restore saved form data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData(prev => ({ ...prev, ...parsed.formData }));
        }
        if (parsed.step) {
          setStep(parsed.step);
        }
        if (parsed.quoteSections) {
          setQuoteSections(parsed.quoteSections);
        }
        if (parsed.customQuoteSections) {
          setCustomQuoteSections(parsed.customQuoteSections);
        }
      } catch (e) {
        console.error('Failed to parse saved request data');
      }
    }
  }, []);

  // Auto-save form data on every change
  useEffect(() => {
    const pendingData = {
      formData,
      step,
      quoteSections,
      customQuoteSections,
      returnPath: '/app/buyer/requests/new'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingData));
  }, [formData, step, quoteSections, customQuoteSections]);

  // Initialize with default quote sections
  useEffect(() => {
    const getDefaultSections = (lang: 'en' | 'ar'): QuoteSection[] => [
      {
        id: 'cover_letter',
        name: 'cover_letter',
        label: lang === 'ar' ? 'نبذة عن المقاول' : 'About the Contractor',
        required: true,
        enabled: true,
        placeholder: lang === 'ar' ? 'اطلب من المقاول التعريف بشركته وتوضيح لماذا هو الأنسب للمشروع' : 'Ask the contractor to introduce their company and explain why they\'re the best fit'
      },
      {
        id: 'technical_approach',
        name: 'technical_approach',
        label: lang === 'ar' ? 'طريقة العمل المقترحة' : 'Proposed Work Method',
        required: false,
        enabled: true,
        placeholder: lang === 'ar' ? 'اطلب من المقاول شرح كيف سينفذ المشروع خطوة بخطوة' : 'Ask contractor to explain how they will execute the project step by step'
      },
      {
        id: 'team_experience',
        name: 'team_experience',
        label: lang === 'ar' ? 'خبراتهم السابقة' : 'Their Past Experience',
        required: false,
        enabled: true,
        placeholder: lang === 'ar' ? 'اطلب من المقاول ذكر مشاريع مشابهة قاموا بها سابقاً' : 'Ask contractor to mention similar projects they completed before'
      },
      {
        id: 'timeline_details',
        name: 'timeline_details',
        label: lang === 'ar' ? 'الجدول الزمني المفصل' : 'Detailed Timeline',
        required: false,
        enabled: true,
        placeholder: lang === 'ar' ? 'اطلب من المقاول تقديم جدول زمني واضح للمشروع' : 'Ask contractor to provide a clear project timeline'
      }
    ];

    if (quoteSections.length === 0) {
      setQuoteSections(getDefaultSections(currentLanguage));
    }
  }, [currentLanguage]);

  const categories = getAllCategories();

  const content = {
    ar: {
      step1Title: 'ما تحتاج؟',
      step2Title: 'وين ومتى؟',
      step3Title: 'الميزانية والتفاصيل',
      title: 'العنوان',
      titlePlaceholder: 'مثال: تركيب مكيف جديد',
      titleHint: 'عنوان جيد يجذب محترفين أفضل',
      category: 'الفئة',
      urgency: 'مدى الاستعجال',
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      where: 'وين؟',
      city: 'المدينة',
      neighborhood: 'الحي',
      when: 'متى؟',
      today: 'اليوم',
      tomorrow: 'بكرة',
      asap: 'أقرب وقت',
      chooseDate: 'اختر تاريخ',
      flexible: 'مرن (أي وقت مناسب)',
      flexibleTime: 'مرن (أي وقت مناسب)',
      timeWindow: 'الوقت',
      morning: 'الصباح',
      afternoon: 'الظهر',
      evening: 'المساء',
      budget: 'الميزانية',
      min: 'الحد الأدنى',
      max: 'الحد الأقصى',
      budgetFlexible: 'المحترفون يقترحون الميزانية',
      details: 'التفاصيل',
      detailsPlaceholder: 'اشرح احتياجك بالتفصيل...',
      photos: 'الصور (اختياري)',
      takePhoto: 'التقاط صورة',
      chooseGallery: 'اختر من المعرض',
      customizeQuote: 'تخصيص متطلبات العروض',
      next: 'التالي',
      back: 'رجوع',
      submit: 'نشر الطلب 🚀',
      successTitle: 'تم النشر!',
      successMsg: 'معظم الطلبات تحصل على أول عرض خلال 25 دقيقة',
      successBtn: 'عرض طلباتي'
    },
    en: {
      step1Title: 'What do you need?',
      step2Title: 'Where & When?',
      step3Title: 'Budget & Details',
      title: 'Title',
      titlePlaceholder: 'Example: Install new AC unit',
      titleHint: 'Good titles attract better pros',
      category: 'Category',
      urgency: 'How urgent?',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      where: 'Where?',
      city: 'City',
      neighborhood: 'Neighborhood',
      when: 'When?',
      today: 'Today',
      tomorrow: 'Tomorrow',
      asap: 'ASAP',
      chooseDate: 'Choose date',
      flexible: 'Flexible (Any time works)',
      flexibleTime: 'Flexible (Any time works)',
      timeWindow: 'Time',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      budget: 'Budget',
      min: 'Min',
      max: 'Max',
      budgetFlexible: 'Let pros suggest budget',
      details: 'Details',
      detailsPlaceholder: 'Explain your needs in detail...',
      photos: 'Photos (Optional)',
      takePhoto: 'Take Photo',
      chooseGallery: 'Choose from Gallery',
      customizeQuote: 'Customize Quote Requirements',
      next: 'Next',
      back: 'Back',
      submit: 'Post Request 🚀',
      successTitle: 'Posted!',
      successMsg: 'Most requests get first quote within 25 minutes',
      successBtn: 'View My Requests'
    }
  };

  const handleNext = async () => {
    await vibrate('light');
    setStep(step + 1);
  };

  const handleBack = async () => {
    await vibrate('light');
    if (step === 1) {
      // For guests, go back to explore; for logged in users, go to home
      navigate(user ? '/app/buyer/home' : '/app/buyer/explore');
    } else {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    // For guests, go back to explore; for logged in users, go to home
    navigate(user ? '/app/buyer/home' : '/app/buyer/explore');
  };

  const handleAddPhoto = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, image.dataUrl]
        }));
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleAddressSelect = (address: { city: string; full_address: string }) => {
    setFormData(prev => ({
      ...prev,
      city: address.city,
      neighborhood: address.full_address
    }));
  };

  // Helper function to convert base64 to Blob without using fetch (CSP-safe)
  const dataURLtoBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Helper function to upload photos to Supabase Storage
  const uploadPhotos = async (dataUrls: string[], userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const dataUrl of dataUrls) {
      try {
        // Convert DataURL to Blob (CSP-safe method)
        const blob = dataURLtoBlob(dataUrl);

        // Generate unique filename
        const fileExt = blob.type.split('/')[1] || 'jpg';
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('request-photos')
          .upload(filePath, blob, { contentType: blob.type });

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('request-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    // If user is not logged in, show auth modal
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    // Validate required fields including location
    if (!formData.city || !formData.neighborhood) {
      toast.error(currentLanguage === 'ar' ? 'الموقع مطلوب' : 'Location is required');
      return;
    }

    // Validate form data
    try {
      postRequestSchema.parse(formData);
    } catch (error) {
      toast.error(handleError(error, 'Post Request Validation'));
      return;
    }

    setLoading(true);
    try {
      // Upload photos to Supabase Storage first
      let photoUrls: string[] = [];
      if (formData.photos.length > 0) {
        photoUrls = await uploadPhotos(formData.photos, user.id);
      }

      const { data: newRequest, error } = await supabase
        .from('maintenance_requests')
        .insert({
          buyer_id: user.id,
          title: formData.title,
          category: formData.category,
          description: (() => {
            let desc = formData.description;
            // Add flexible date marker
            if (formData.flexibleDate) {
              desc += '\n\n[Flexible Date]';
            }
            // Add time window marker when date is ASAP or flexible (since date hours won't carry this info)
            if (formData.preferredDate === 'asap' || formData.flexibleDate) {
              if (!formData.flexibleTime) {
                desc += `\n\nTime Window: ${formData.timeWindow}`;
              }
            }
            // Add flexible time marker
            if (formData.flexibleTime) {
              desc += '\n\n[Flexible Time]';
            }
            return desc;
          })(),
          preferred_start_date: (() => {
            if (formData.flexibleDate) return null;
            if (formData.preferredDate === 'asap') return null;

            // Parse date string (YYYY-MM-DD) as local date components
            const [y, m, d] = formData.preferredDate.split('-').map(Number);
            const date = new Date(y, m - 1, d);

            // Set time based on window
            switch (formData.timeWindow) {
              case 'morning':
                date.setHours(9, 0, 0, 0);
                break;
              case 'afternoon':
                date.setHours(14, 0, 0, 0);
                break;
              case 'evening':
                date.setHours(20, 0, 0, 0);
                break;
              default:
                date.setHours(12, 0, 0, 0);
            }
            return date.toISOString();
          })(),
          urgency: formData.urgency,
          location: `${formData.neighborhood}, ${formData.city}`,
          city: formData.city,
          status: 'open',
          estimated_budget_min: formData.budgetMin ? parseFloat(formData.budgetMin) : null,
          estimated_budget_max: formData.budgetMax ? parseFloat(formData.budgetMax) : null,
          photos: photoUrls.length > 0 ? photoUrls : null
        })
        .select()
        .single();

      if (error) throw error;

      // Quote template insertion disabled for now
      // if (newRequest && (quoteSections.length > 0 || customQuoteSections.length > 0)) {
      //   const allSections = [...quoteSections, ...customQuoteSections];
      //   const { error: templateError } = await supabase
      //     .from('request_quote_templates')
      //     .insert({
      //       request_id: newRequest.id,
      //       sections: allSections as any
      //     });
      //
      //   if (templateError) {
      //     console.error('Error saving quote template:', templateError);
      //   }
      // }

      localStorage.removeItem(STORAGE_KEY);

      await notificationSuccess();

      // Trigger celebration animation! 🎉
      celebrate({
        flowType: 'quote',
        role: 'buyer',
        currentStageIndex: 0,
        flowTitle: formData.title || (currentLanguage === 'ar' ? 'طلب جديد' : 'New Request'),
        navigationUrl: `/app/buyer/request/${newRequest.id}`,
      });

      toast.success(content[currentLanguage].successTitle, {
        description: content[currentLanguage].successMsg
      });

      setCreatedRequestId(newRequest.id);
      setShowSuccess(true);

    } catch (error) {
      console.error('Error posting request:', error);
      toast.error('Failed to post request');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    const category = categories.find(c => c.key === formData.category);
    const categoryName = currentLanguage === 'ar' ? category?.ar || 'خدمة' : category?.en || 'Service';

    // Format date for display
    let dateDisplay = currentLanguage === 'ar' ? 'غير محدد' : 'Not specified';
    if (formData.preferredDate && formData.preferredDate !== 'asap') {
      dateDisplay = format(new Date(formData.preferredDate), 'dd MMM, yyyy');
    } else if (formData.preferredDate === 'asap') {
      dateDisplay = currentLanguage === 'ar' ? 'أقرب وقت ممكن' : 'ASAP';
    } else if (formData.flexibleDate) {
      dateDisplay = currentLanguage === 'ar' ? 'تاريخ مرن' : 'Flexible Date';
    }

    // Add time info
    if (formData.timeWindow && !formData.flexibleTime) {
      const times: Record<string, string> = {
        morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
        afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
        evening: currentLanguage === 'ar' ? 'مساءً' : 'Evening'
      };
      dateDisplay += ` • ${times[formData.timeWindow] || formData.timeWindow}`;
    }

    return (
      <SuccessScreen
        currentLanguage={currentLanguage}
        title={currentLanguage === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Request Sent Successfully!'}
        subtitle={currentLanguage === 'ar' ? 'شكراً لك. تم إرسال طلبك لمقدمي الخدمات الموثوقين.' : 'Thank you. Your request has been sent to trusted service providers.'}
        summary={{
          serviceIcon: category?.icon || '🔧',
          serviceName: categoryName,
          date: dateDisplay,
          location: `${formData.city}, ${formData.neighborhood}`
        }}
        primaryActionLabel={currentLanguage === 'ar' ? 'تتبع حالة الطلب' : 'Track Request Status'}
        onPrimaryAction={() => navigate(createdRequestId ? `/app/buyer/request/${createdRequestId}` : '/app/buyer/requests')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <button onClick={handleBack} className="p-2">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
            <ProgressBar value={step} max={3} size="md" />
          </div>
          <button onClick={handleClose} className="p-2">
            <X size={24} />
          </button>
        </div>
      </div>

      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          // Instant scroll to top after the exit animation completes
          // This ensures the next step starts from the top without a jump while viewing the old step
          window.scrollTo(0, 0);
          document.getElementById('app-scroll-container')?.scrollTo(0, 0);
        }}
      >
        {/* Step 1: Basics */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 space-y-6"
          >
            <Heading2 lang={currentLanguage}>{content[currentLanguage].step1Title}</Heading2>

            {/* Title */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].title}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={content[currentLanguage].titlePlaceholder}
                className="font-['Noto_Sans_Arabic']"
              />
              <Caption lang={currentLanguage} className="text-muted-foreground">
                💡 {content[currentLanguage].titleHint}
              </Caption>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].category}</Label>
              <div className="grid grid-cols-3 gap-3">
                {categories.slice(0, 9).map((cat) => {
                  const isEnabled = isAlphaEnabledCategory(cat.key);
                  return (
                    <TouchCard
                      key={cat.key}
                      onClick={() => isEnabled && setFormData({ ...formData, category: cat.key })}
                      className={`p-3 text-center relative ${formData.category === cat.key
                        ? 'border-primary border-2 bg-primary/5'
                        : ''
                        } ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {!isEnabled && (
                        <span className={cn(
                          "absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] bg-muted text-muted-foreground rounded-full z-10",
                          currentLanguage === 'ar' && "font-noto-ar"
                        )}>
                          {currentLanguage === 'ar' ? 'قريباً' : 'Soon'}
                        </span>
                      )}
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className={cn(
                        'text-xs font-medium',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                      )}>
                        {currentLanguage === 'ar' ? cat.ar : cat.en}
                      </div>
                    </TouchCard>
                  );
                })}
              </div>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].urgency}</Label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((level) => (
                  <TouchCard
                    key={level}
                    onClick={() => setFormData({ ...formData, urgency: level })}
                    className={`p-4 text-center ${formData.urgency === level
                      ? 'border-primary border-2 bg-primary/5'
                      : ''
                      }`}
                  >
                    <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                      {content[currentLanguage][level as keyof typeof content.ar]}
                    </span>
                  </TouchCard>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Location & Time */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 space-y-6"
          >
            <Heading2 lang={currentLanguage}>{content[currentLanguage].step2Title}</Heading2>

            {/* Location (Required) */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].where}</Label>
              <AddressPicker
                currentLanguage={currentLanguage}
                selectedCity={formData.city}
                selectedAddress={formData.neighborhood}
                onAddressSelect={handleAddressSelect}
                required
              />
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].when}</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <TouchCard
                  onClick={() => !formData.flexibleDate && setFormData({ ...formData, preferredDate: 'asap' })}
                  className={`p-3 text-center ${formData.preferredDate === 'asap' && !formData.flexibleDate
                    ? 'border-primary border-2 bg-primary/5'
                    : ''
                    } ${formData.flexibleDate ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-3xl mb-2">⚡</div>
                    <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                      {content[currentLanguage].asap}
                    </span>
                  </div>
                </TouchCard>
                <TouchCard
                  onClick={() => !formData.flexibleDate && setFormData({ ...formData, preferredDate: new Date().toISOString().split('T')[0] })}
                  className={`p-3 text-center ${formData.preferredDate !== 'asap' && !formData.flexibleDate
                    ? 'border-primary border-2 bg-primary/5'
                    : ''
                    } ${formData.flexibleDate ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-3xl mb-2">📅</div>
                    <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                      {content[currentLanguage].chooseDate}
                    </span>
                  </div>
                </TouchCard>
              </div>

              {/* Calendar - shown directly when Choose Date is selected */}
              {formData.preferredDate !== 'asap' && !formData.flexibleDate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-2"
                >
                  <div className={cn("bg-card rounded-2xl border border-border p-3", currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
                    <Calendar
                      mode="single"
                      selected={formData.preferredDate ? new Date(formData.preferredDate) : undefined}
                      onSelect={(date) => setFormData({ ...formData, preferredDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      locale={currentLanguage === 'ar' ? ar : enUS}
                      className="mx-auto"
                    />
                  </div>
                </motion.div>
              )}

              {/* Flexible Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer mt-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.flexibleDate}
                  onChange={(e) => setFormData({ ...formData, flexibleDate: e.target.checked })}
                  className="rounded border-border"
                />
                <span className={cn("text-sm", currentLanguage === 'ar' && "font-ar-body")}>
                  {content[currentLanguage].flexible}
                </span>
              </label>
            </div>

            {/* Time Window */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].timeWindow}</Label>
              <div className="grid grid-cols-3 gap-2">
                {['morning', 'afternoon', 'evening'].map((time) => (
                  <TouchCard
                    key={time}
                    onClick={() => !formData.flexibleTime && setFormData({ ...formData, timeWindow: time })}
                    className={`p-3 text-center ${formData.timeWindow === time && !formData.flexibleTime
                      ? 'border-primary border-2 bg-primary/5'
                      : ''
                      } ${formData.flexibleTime ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {time === 'morning' && <div className="text-3xl mb-2">☀️</div>}
                      {time === 'afternoon' && <div className="text-3xl mb-2">⛅</div>}
                      {time === 'evening' && <div className="text-3xl mb-2">🌙</div>}
                      <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                        {content[currentLanguage][time as keyof typeof content.ar]}
                      </span>
                    </div>
                  </TouchCard>
                ))}
              </div>

              {/* Flexible Time Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={formData.flexibleTime}
                  onChange={(e) => setFormData({ ...formData, flexibleTime: e.target.checked })}
                  className="rounded border-border"
                />
                <span className={cn("text-sm", currentLanguage === 'ar' && "font-ar-body")}>
                  {content[currentLanguage].flexibleTime}
                </span>
              </label>
            </div>
          </motion.div>
        )}

        {/* Step 3: Budget & Details */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 space-y-6"
          >
            <Heading2 lang={currentLanguage}>{content[currentLanguage].step3Title}</Heading2>

            {/* Budget */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].budget}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                  onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                  placeholder={content[currentLanguage].min}
                  disabled={formData.budgetFlexible}
                  className="font-['Noto_Sans_Arabic']"
                />
                <Input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                  onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                  placeholder={content[currentLanguage].max}
                  disabled={formData.budgetFlexible}
                  className="font-['Noto_Sans_Arabic']"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.budgetFlexible}
                  onChange={(e) => setFormData({ ...formData, budgetFlexible: e.target.checked })}
                  className="rounded"
                />
                <span className={cn("text-sm", currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>{content[currentLanguage].budgetFlexible}</span>
              </label>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].details}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={content[currentLanguage].detailsPlaceholder}
                rows={6}
                className="font-['Noto_Sans_Arabic']"
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label lang={currentLanguage}>{content[currentLanguage].photos}</Label>
              <div className="grid grid-cols-3 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {formData.photos.length < 6 && (
                  <>
                    <button
                      onClick={() => handleAddPhoto(CameraSource.Camera)}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30"
                    >
                      <Camera size={24} className="text-muted-foreground" />
                      <Caption lang={currentLanguage} className="text-xs text-center px-2">
                        {content[currentLanguage].takePhoto}
                      </Caption>
                    </button>

                    <button
                      onClick={() => handleAddPhoto(CameraSource.Photos)}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30"
                    >
                      <FileText size={24} className="text-muted-foreground" />
                      <Caption lang={currentLanguage} className="text-xs text-center px-2">
                        {content[currentLanguage].chooseGallery}
                      </Caption>
                    </button>
                  </>
                )}
              </div>
            </div>


          </motion.div>
        )}
      </AnimatePresence>



      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t pb-safe">
        <div className="flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className={cn("flex-1", currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}
            >
              {content[currentLanguage].back}
            </Button>
          )}
          <Button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={loading || (step === 1 && (!formData.title || !formData.category)) || (step === 2 && (!formData.city || !formData.neighborhood))}
            className={cn("flex-1", currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}
          >
            {step === 3 ? content[currentLanguage].submit : content[currentLanguage].next}
          </Button>
        </div>
      </div>

      {/* Auth Modal for guests */}
      <AuthTriggerModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        currentLanguage={currentLanguage}
        pendingAction={{
          type: 'request',
          returnPath: '/app/buyer/requests/new'
        }}
      />
    </div>
  );
};
