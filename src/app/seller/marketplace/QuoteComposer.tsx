import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight, FileText, X, Loader2, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from 'sonner';
import { useCelebration } from '@/contexts/CelebrationContext';
import { getCategoryIcon } from '@/lib/serviceCategories';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { SuccessScreen } from '@/components/mobile/SuccessScreen';
import { getAllCategories } from '@/lib/serviceCategories';

interface QuoteComposerProps {
  currentLanguage: 'en' | 'ar';
}

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 931" className="w-full h-full">
    <path fill="#EFEAE6" transform="matrix(3.22013 0 0 3.22145 0 -0.00012207)" d="M151.779 27.3024C218.533 22.4751 276.552 72.6939 281.347 139.45C286.142 206.205 235.895 264.201 169.137 268.963C102.425 273.722 44.478 223.517 39.6864 156.808C34.8948 90.0976 85.0717 32.1263 151.779 27.3024Z" />
    <path fill="#89440B" transform="matrix(3.22013 0 0 3.22145 0 -0.00012207)" d="M158.916 108.099C167.486 106.884 177.93 110.832 184.176 116.586C189.405 121.403 193.594 127.888 195.11 134.904C195.672 137.503 195.762 140.465 195.911 143.117C200.708 143.828 205.964 146.577 209.415 149.976C213.526 153.995 215.855 159.493 215.881 165.243C215.927 171.829 213.215 177.883 208.677 182.64C201.965 189.675 191.719 188.753 182.578 188.742L165.561 188.717L165.554 168.057C165.552 163.173 165.324 157.564 166.161 152.804C168.809 155.052 171.745 157.828 174.375 160.178C176.105 157.581 178.29 155.311 180.559 153.187C174.187 147.032 167.928 140.76 161.787 134.374C161.341 133.925 161.223 133.703 160.635 133.621C158.547 135.063 155.553 138.138 153.678 139.983C149.247 144.392 144.859 148.845 140.515 153.34C142.196 154.681 145.359 158.391 146.891 160.147C149.983 157.875 151.663 155.162 155.11 153.012C155.727 156.436 155.527 163.206 155.519 166.945L155.508 188.667L141.817 188.753C131.034 188.817 123.64 188.598 114.688 181.704C100.394 170.697 102.423 147.472 117.336 138.033C120.202 136.219 123.978 134.956 126.382 132.547C128.29 130.505 128.973 127.365 130.302 124.977C133.733 118.81 139.163 114.101 145.625 111.323C150.072 109.411 154.139 108.611 158.916 108.099Z" className="fill-primary" />
  </svg>
);

export const QuoteComposer = ({ currentLanguage }: QuoteComposerProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { celebrate } = useCelebration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [proposal, setProposal] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: job } = useQuery({
    queryKey: ['job-for-quote', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const content = {
    en: {
      title: 'Submit Quote',
      requestSummary: 'Request Summary',
      price: 'Total Price',
      currency: 'SAR',
      description: 'Description & Conditions',
      descriptionPlaceholder: 'e.g. Includes spare parts, warranty details, and labor costs...',
      duration: 'Estimated Duration',
      startDate: 'Start Date',
      attachments: 'Attachments (Optional)',
      clickToUpload: 'Click to upload',
      fileTypes: 'PDF, PNG, JPG (Max 5MB)',
      submit: 'Submit Quote',
      submitting: 'Submitting...',
      secureNote: 'Your quote is secure and only visible to the client.',
      durations: {
        '1-2h': '1-2 Hours',
        'half-day': 'Half Day',
        'full-day': 'Full Day',
        'multi-day': 'Multiple Days'
      },
      validation: {
        error: 'Error',
        fillAll: 'Please fill all required fields',
        priceRequired: 'Price is required',
        durationRequired: 'Duration is required',
        startDateRequired: 'Start date is required',
        proposalRequired: 'Proposal description is required'
      },
      success: 'Quote Submitted!',
      successDesc: 'Your quote has been sent to the client'
    },
    ar: {
      title: 'إرسال عرض',
      requestSummary: 'ملخص الطلب',
      price: 'السعر الإجمالي',
      currency: 'ر.س',
      description: 'الوصف والشروط',
      descriptionPlaceholder: 'مثال: يشمل قطع الغيار، تفاصيل الضمان، وتكاليف العمالة...',
      duration: 'المدة التقديرية',
      startDate: 'تاريخ البدء',
      attachments: 'المرفقات (اختياري)',
      clickToUpload: 'اضغط للرفع',
      fileTypes: 'PDF, PNG, JPG (الحد الأقصى 5 ميجابايت)',
      submit: 'إرسال العرض',
      submitting: 'جاري الإرسال...',
      secureNote: 'عرضك آمن ومرئي للعميل فقط.',
      durations: {
        '1-2h': '1-2 ساعات',
        'half-day': 'نصف يوم',
        'full-day': 'يوم كامل',
        'multi-day': 'عدة أيام'
      },
      validation: {
        error: 'خطأ',
        detailsTitle: 'تفاصيل العرض',
        fillAll: 'يرجى ملء جميع الحقول المطلوبة',
        priceRequired: 'السعر مطلوب',
        durationRequired: 'المدة مطلوبة',
        startDateRequired: 'تاريخ البدء مطلوب',
        proposalRequired: 'وصف العرض مطلوب'
      },
      success: 'تم إرسال العرض!',
      successDesc: 'تم إرسال عرضك إلى العميل'
    }
  };

  const t = content[currentLanguage];

  const getLocalizedCity = (cityKey: string | undefined | null) => {
    if (!cityKey) return currentLanguage === 'ar' ? 'غير محدد' : 'N/A';

    // Search in SAUDI_CITIES_BILINGUAL for exact match or alias
    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
      c.en.toLowerCase() === cityKey.toLowerCase() ||
      c.ar === cityKey ||
      c.aliases?.some(alias => alias.toLowerCase() === cityKey.toLowerCase())
    );

    if (cityData) {
      return currentLanguage === 'ar' ? cityData.ar : cityData.en;
    }

    return cityKey;
  };

  // Template sections disabled for now
  // const templateSections = (job?.request_quote_templates?.[0]?.sections || []) as any[];
  // const enabledSections = templateSections.filter((s: any) => s.enabled);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };



  const handleSubmit = async () => {
    if (!user || !id) return;

    // Basic Validation
    if (!price) {
      toast.error(t.validation.priceRequired);
      return;
    }

    // Start Date is technically optional in schema but good for UI
    if (!startDate) {
      toast.error(t.validation.startDateRequired);
      return;
    }
    if (!proposal) {
      toast.error(t.validation.proposalRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload attachments to Supabase Storage
      const uploadedUrls: string[] = [];
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('quote_attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('quote_attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const quoteData: any = {
        request_id: id,
        seller_id: user.id,
        price: parseFloat(price),
        estimated_duration: duration ? `${duration} ${parseInt(duration) === 1 ? 'day' : 'days'}` : 'Not specified',
        start_date: startDate || null,
        proposal: proposal,
        status: 'pending',
        attachments: uploadedUrls.length > 0 ? uploadedUrls : null
      };

      const { error } = await supabase
        .from('quote_submissions')
        .insert(quoteData);

      if (error) throw error;

      toast.success(t.success, {
        description: t.successDesc
      });

      // Trigger celebration! 🎉
      celebrate({
        flowType: 'quote',
        role: 'seller',
        currentStageIndex: 0, // Quote submitted stage
        flowTitle: job?.title || (currentLanguage === 'ar' ? 'تم إرسال العرض' : 'Quote Sent'),
        navigationUrl: '/app/seller/quotes',
      });

      setShowSuccess(true);

    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const DurationChip = ({ value, label }: { value: string, label: string }) => (
    <button
      onClick={() => setDuration(value)}
      className={`flex items-center justify-center h-12 w-full rounded-xl border text-sm font-medium transition-all font-['Noto_Sans_Arabic'] ${duration === value
        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
        : 'border-input bg-card hover:border-primary/50'
        }`}
    >
      {label}
    </button>
  );

  if (showSuccess) {
    const category = getAllCategories().find(c => c.key === (job as any)?.category);
    const categoryName = currentLanguage === 'ar' ? category?.ar || 'خدمة' : category?.en || 'Service';

    return (
      <SuccessScreen
        currentLanguage={currentLanguage}
        title={t.success}
        subtitle={t.successDesc}
        summary={{
          serviceIcon: category?.icon || '🔧',
          serviceName: categoryName,
          date: startDate ? format(new Date(startDate), 'dd MMM, yyyy') : (currentLanguage === 'ar' ? 'غير محدد' : 'Not specified'),
          location: getLocalizedCity((job as any)?.city) + ((job as any)?.location_name ? `, ${(job as any)?.location_name}` : '')
        }}
        primaryActionLabel={currentLanguage === 'ar' ? 'عرض عروضي' : 'View My Quotes'}
        onPrimaryAction={() => navigate('/app/seller/quotes')}
      />
    );
  }

  return (
    <div className="pb-32 min-h-screen bg-background font-display" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-border/50">
        <button
          onClick={() => navigate(-1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronRight className={`w-6 h-6 ${currentLanguage === 'ar' ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">{t.title}</h2>
        <div className="w-12 h-12" />
      </div>

      <div className="p-4 space-y-4">
        {/* Request Summary Card */}
        <div className="flex items-stretch justify-between gap-4 rounded-xl bg-card p-4 shadow-sm border border-[#89440B]/30">
          <div className="flex flex-col gap-1 flex-[2_2_0px]">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-['Noto_Sans_Arabic']">{t.requestSummary}</p>
            <p className={`text-foreground text-lg font-medium leading-tight ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}>{job?.title || 'Loading...'}</p>
            {((job as any)?.budget_min || (job as any)?.budget_max) && (
              <p className="text-muted-foreground text-sm font-semibold font-['Noto_Sans_Arabic'] mt-1">
                {currentLanguage === 'ar' ? 'الميزانية: ' : 'Budget: '}
                {(job as any)?.budget_min || 0} - {(job as any)?.budget_max || 'Unset'} {t.currency}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
              <p className="text-muted-foreground text-sm font-['Noto_Sans_Arabic'] line-clamp-2">
                {getLocalizedCity((job as any)?.city)}
                {(job as any)?.district ? ` • ${(job as any)?.district}` : ((job as any)?.location_name ? ` • ${(job as any)?.location_name}` : '')}
              </p>
            </div>
            <p className="text-muted-foreground text-sm mt-2 font-['Noto_Sans_Arabic'] line-clamp-1">
              {(job as any)?.description}
            </p>
          </div>
          {/* Image placeholder - could be job image if available */}
          <div className="w-24 h-24 shrink-0 flex items-center justify-center text-5xl text-primary overflow-hidden">
            {getCategoryIcon((job as any)?.category)}
          </div>
        </div>

        <div className="pt-2">
          <h1 className="text-xl font-bold leading-tight tracking-[-0.015em] text-foreground">
            {currentLanguage === 'ar' ? 'تفاصيل العرض' : 'Quote Details'}
          </h1>
        </div>

        {/* Total Price */}
        <div className="flex w-full flex-col gap-2">
          <p className="text-foreground text-sm font-medium leading-normal font-['Noto_Sans_Arabic']">{t.price}</p>
          <div className="flex w-full items-stretch rounded-xl shadow-sm border border-border bg-card transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <Input
              id="price"
              name="price"
              className="flex-1 rounded-l-xl rounded-r-none border-0 h-14 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-['Noto_Sans_Arabic']"
              placeholder="0.00"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
            <div className="flex items-center justify-center px-4 bg-muted/30 border-l border-border rounded-r-xl">
              <span className="text-muted-foreground font-bold text-sm font-['Noto_Sans_Arabic']">{t.currency}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex w-full flex-col gap-2">
          <p className="text-foreground text-sm font-medium leading-normal font-['Noto_Sans_Arabic']">{t.description}</p>
          <Textarea
            id="proposal"
            name="proposal"
            className="w-full min-h-[120px] rounded-xl text-base p-4 resize-none border-border focus:ring-2 focus:ring-primary/20 font-['Noto_Sans_Arabic']"
            placeholder={t.descriptionPlaceholder}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
        </div>

        {/* Start Date & Duration - Side by Side */}
        <div className="flex w-full gap-4">
          {/* Start Date */}
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-foreground text-sm font-medium leading-normal font-['Noto_Sans_Arabic']">{t.startDate}</p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl h-14 px-4 text-base border border-border bg-background hover:bg-muted/50 transition-colors font-['Noto_Sans_Arabic']",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 opacity-50" />
                  {startDate ? (
                    format(new Date(startDate), "dd/MM/yyyy")
                  ) : (
                    <span>dd/mm/yyyy</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Duration Stepper */}
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-foreground text-sm font-medium leading-normal font-['Noto_Sans_Arabic']">
              {t.duration} <span className="text-xs text-muted-foreground">({currentLanguage === 'ar' ? 'عدد الأيام' : 'Days'})</span>
            </p>
            <div className="flex items-center justify-between gap-2 bg-card border border-border rounded-xl p-2 h-14">
              <button
                type="button"
                onClick={() => setDuration(prev => {
                  const num = parseInt(prev);
                  if (isNaN(num) || num <= 1) return ''; // Go to "Not Specified"
                  return String(num - 1);
                })}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-border text-foreground hover:bg-muted/50 transition-colors text-xl font-light"
              >
                −
              </button>
              <span className="text-foreground text-base font-medium font-['Noto_Sans_Arabic'] tabular-nums min-w-[80px] text-center">
                {duration ? duration : (currentLanguage === 'ar' ? 'غير محدد' : 'N/A')}
              </span>
              <button
                type="button"
                onClick={() => setDuration(prev => {
                  const num = parseInt(prev);
                  if (isNaN(num)) return '1'; // From "Not Specified" to 1
                  return String(num + 1);
                })}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-border text-foreground hover:bg-muted/50 transition-colors text-xl font-light"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="pt-2">
          <p className="text-foreground text-sm font-medium leading-normal pb-2 font-['Noto_Sans_Arabic']">{t.attachments}</p>

          <input
            id="attachments"
            name="attachments"
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:bg-primary/5 hover:border-primary/50 active:scale-[0.99] relative overflow-hidden"
          >
            <div className="relative w-16 h-16 transition-transform duration-300 group-hover:scale-110">
              <UploadIcon />
            </div>

            <div className="text-center z-10">
              <p className="text-foreground text-sm font-semibold font-['Noto_Sans_Arabic']">{t.clickToUpload}</p>
              <p className="text-muted-foreground text-xs font-['Noto_Sans_Arabic']">{t.fileTypes}</p>
            </div>
          </button>

          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded-lg shrink-0"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-primary shrink-0" />
                    )}
                    <span className="text-sm truncate font-medium font-['Noto_Sans_Arabic']">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto w-full max-w-md">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-14 text-base shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.submitting}</span>
              </>
            ) : (
              <>
                <span>{t.submit}</span>
                <span className="text-xl">🚀</span>
              </>
            )}
          </button>
          <div className="flex justify-center items-center gap-1.5 mt-3 opacity-80">
            <span className="text-xs text-muted-foreground">🔒</span>
            <p className="text-xs text-muted-foreground font-medium font-['Noto_Sans_Arabic']">{t.secureNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
