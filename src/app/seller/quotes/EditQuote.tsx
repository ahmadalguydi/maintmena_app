import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, ChevronRight, MapPin, X, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SoftCard } from '@/components/mobile/SoftCard';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label as MobileLabel } from '@/components/mobile/Typography';
import { getCategoryIcon } from '@/lib/serviceCategories';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface EditQuoteProps {
  currentLanguage: 'en' | 'ar';
}

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1024 931" className="w-full h-full">
    <path fill="#EFEAE6" transform="matrix(3.22013 0 0 3.22145 0 -0.00012207)" d="M151.779 27.3024C218.533 22.4751 276.552 72.6939 281.347 139.45C286.142 206.205 235.895 264.201 169.137 268.963C102.425 273.722 44.478 223.517 39.6864 156.808C34.8948 90.0976 85.0717 32.1263 151.779 27.3024Z" />
    <path fill="#89440B" transform="matrix(3.22013 0 0 3.22145 0 -0.00012207)" d="M158.916 108.099C167.486 106.884 177.93 110.832 184.176 116.586C189.405 121.403 193.594 127.888 195.11 134.904C195.672 137.503 195.762 140.465 195.911 143.117C200.708 143.828 205.964 146.577 209.415 149.976C213.526 153.995 215.855 159.493 215.881 165.243C215.927 171.829 213.215 177.883 208.677 182.64C201.965 189.675 191.719 188.753 182.578 188.742L165.561 188.717L165.554 168.057C165.552 163.173 165.324 157.564 166.161 152.804C168.809 155.052 171.745 157.828 174.375 160.178C176.105 157.581 178.29 155.311 180.559 153.187C174.187 147.032 167.928 140.76 161.787 134.374C161.341 133.925 161.223 133.703 160.635 133.621C158.547 135.063 155.553 138.138 153.678 139.983C149.247 144.392 144.859 148.845 140.515 153.34C142.196 154.681 145.359 158.391 146.891 160.147C149.983 157.875 151.663 155.162 155.11 153.012C155.727 156.436 155.527 163.206 155.519 166.945L155.508 188.667L141.817 188.753C131.034 188.817 123.64 188.598 114.688 181.704C100.394 170.697 102.423 147.472 117.336 138.033C120.202 136.219 123.978 134.956 126.382 132.547C128.29 130.505 128.973 127.365 130.302 124.977C133.733 118.81 139.163 114.101 145.625 111.323C150.072 109.411 154.139 108.611 158.916 108.099Z" className="fill-primary" />
  </svg>
);

export const EditQuote = ({ currentLanguage }: EditQuoteProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [proposal, setProposal] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [quoteData, setQuoteData] = useState<any>(null);

  // Attachments
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const content = {
    en: {
      title: 'Edit Quote',
      cancel: 'Cancel',
      save: 'Save',
      quotingFor: 'Quoting for',
      location: 'Location',
      price: 'Total Price',
      currency: 'SAR',
      vatNote: 'Price includes VAT where applicable.',
      duration: 'Estimated Duration',
      startDate: 'Start Date',
      description: 'Description & Notes',
      descriptionPlaceholder: 'Describe what is included in this quote...',
      attachments: 'Attachments',
      addNew: 'Add New',
      infoTitle: 'Important',
      infoMessage: 'Updating this quote will notify the client immediately. Make sure all details are accurate before saving.',
      updateQuote: 'Update Quote',
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
      success: 'Updated successfully!',
      errorLoad: 'Failed to load data',
      errorUpdate: 'Failed to update'
    },
    ar: {
      title: 'تعديل العرض',
      cancel: 'إلغاء',
      save: 'حفظ',
      quotingFor: 'عرض سعر لـ',
      location: 'الموقع',
      price: 'السعر الإجمالي',
      currency: 'ر.س',
      vatNote: 'السعر يشمل الضريبة حيثما ينطبق.',
      duration: 'المدة التقديرية',
      startDate: 'تاريخ البدء',
      description: 'الوصف والملاحظات',
      descriptionPlaceholder: 'اشرح ما يتضمنه هذا العرض...',
      attachments: 'المرفقات',
      addNew: 'إضافة جديد',
      infoTitle: 'مهم',
      infoMessage: 'تحديث هذا العرض سيقوم بإشعار العميل فوراً. تأكد من دقة جميع التفاصيل قبل الحفظ.',
      updateQuote: 'تحديث العرض',
      durations: {
        '1-2h': '1-2 ساعات',
        'half-day': 'نصف يوم',
        'full-day': 'يوم كامل',
        'multi-day': 'عدة أيام'
      },
      validation: {
        error: 'خطأ',
        fillAll: 'يرجى ملء جميع الحقول المطلوبة',
        priceRequired: 'السعر مطلوب',
        durationRequired: 'المدة مطلوبة',
        startDateRequired: 'تاريخ البدء مطلوب',
        proposalRequired: 'وصف العرض مطلوب'
      },
      success: 'تم التحديث بنجاح!',
      errorLoad: 'فشل تحميل البيانات',
      errorUpdate: 'فشل التحديث'
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

  useEffect(() => {
    if (id && user) {
      fetchQuoteData();
    }
  }, [id, user]);

  const fetchQuoteData = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_submissions')
        .select(`
          *,
          maintenance_requests (*)
        `)
        .eq('id', id)
        .eq('seller_id', user?.id)
        .single();

      if (error) throw error;

      if (data.status !== 'pending' && data.status !== 'negotiating' && data.status !== 'revision_requested') {
        toast.error(currentLanguage === 'ar' ? 'لا يمكن تعديل هذا العرض' : 'Cannot edit this quote');
        navigate('/app/seller/quotes');
        return;
      }

      setQuoteData(data);
      setPrice(data.price.toString());
      // Handle "Not specified" or parse the number from duration string
      const durationValue = data.estimated_duration;
      if (!durationValue || durationValue.toLowerCase() === 'not specified') {
        setDuration('');
      } else {
        const parsed = parseInt(durationValue);
        setDuration(isNaN(parsed) ? '' : String(parsed));
      }

      // Extract start date from proposal if it exists there
      const startDateMatch = data.proposal?.match(/(?:Proposed|Updated) Start Date: (\d{4}-\d{2}-\d{2})/);
      if (data.start_date) {
        setStartDate(data.start_date);
      } else if (startDateMatch) {
        setStartDate(startDateMatch[1]);
      } else {
        setStartDate('');
      }

      // Clean proposal text by removing the appended date string
      const cleanProposal = data.proposal?.replace(/\n\n(Proposed|Updated) Start Date: \d{4}-\d{2}-\d{2}/g, '') || '';
      setProposal(cleanProposal);

      setCoverLetter(data.cover_letter || '');
      setExistingAttachments((data.attachments as unknown as string[]) || []);

    } catch (error: any) {
      console.error('Error fetching quote:', error);
      toast.error(t.errorLoad);
      navigate('/app/seller/quotes');
    } finally {
      setFetching(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFilesToUpload(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (url: string) => {
    setExistingAttachments(prev => prev.filter(a => a !== url));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!price) {
      toast.error(t.validation.priceRequired);
      return;
    }

    if (!proposal) {
      toast.error(t.validation.proposalRequired);
      return;
    }

    setLoading(true);
    try {
      // 1. Upload new files
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

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

      // 2. Prepare final attachments list (existing + new)
      const finalAttachments = [...existingAttachments, ...uploadedUrls];

      const updateData = {
        price: parseFloat(price),
        estimated_duration: duration ? `${duration} ${parseInt(duration) === 1 ? 'day' : 'days'}` : 'Not specified',
        proposal: proposal,
        start_date: startDate || null,
        cover_letter: coverLetter,
        attachments: finalAttachments,
        status: quoteData?.status === 'revision_requested' ? 'pending' : quoteData?.status,
        updated_at: new Date().toISOString()
      };

      console.log('[EditQuote] Updating quote with:', updateData);

      const { data: updatedQuote, error, count } = await supabase
        .from('quote_submissions')
        .update(updateData)
        .eq('id', id)
        .eq('seller_id', user?.id) // Ensure we're updating our own quote
        .select();

      console.log('[EditQuote] Update result:', { updatedQuote, error, count });

      if (error) throw error;

      if (!updatedQuote || updatedQuote.length === 0) {
        throw new Error('No rows updated - check RLS policies');
      }

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['seller-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-detail', id] });

      toast.success(t.success);
      navigate(`/app/seller/quote/${id}`);
    } catch (error: any) {
      console.error('Error updating quote:', error);
      toast.error(t.errorUpdate);
    } finally {
      setLoading(false);
    }
  };

  const DurationChip = ({ value, label }: { value: string, label: string }) => (
    <button
      onClick={() => setDuration(value)}
      className={`group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all font-['Noto_Sans_Arabic'] ${duration === value
        ? 'bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background'
        : 'bg-card border-border text-foreground hover:bg-muted/50 hover:border-primary/30'
        }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {duration === value && <span className="text-lg">✓</span>}
    </button>
  );

  if (fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-display pb-32" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-background/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-border/50">
        <button
          onClick={() => navigate(`/app/seller/quote/${id}`)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronRight className={`w-6 h-6 ${currentLanguage === 'ar' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="text-lg font-bold leading-tight flex-1 text-center">{t.title}</h1>
        <div className="w-12 h-12" />
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-6">
          {/* Job Info Card */}
          <div className="bg-card p-4 rounded-2xl shadow-sm border border-[#89440B]/30 flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider font-['Noto_Sans_Arabic']">{t.quotingFor}</p>
              <h3 className={`text-foreground text-lg font-medium leading-tight ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}>
                {(quoteData?.maintenance_requests as any)?.title || 'Service Request'}
              </h3>
              {((quoteData?.maintenance_requests as any)?.budget_min || (quoteData?.maintenance_requests as any)?.budget_max) && (
                <p className="text-muted-foreground text-sm font-semibold font-['Noto_Sans_Arabic'] mt-1">
                  {currentLanguage === 'ar' ? 'الميزانية: ' : 'Budget: '}
                  {(quoteData?.maintenance_requests as any)?.budget_min || 0} - {(quoteData?.maintenance_requests as any)?.budget_max || 'Unset'} {t.currency}
                </p>
              )}
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-['Noto_Sans_Arabic'] line-clamp-2">
                  {getLocalizedCity((quoteData?.maintenance_requests as any)?.city)}
                  {(quoteData?.maintenance_requests as any)?.district ? ` • ${(quoteData?.maintenance_requests as any)?.district}` : ((quoteData?.maintenance_requests as any)?.location_name ? ` • ${(quoteData?.maintenance_requests as any)?.location_name}` : '')}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-2 font-['Noto_Sans_Arabic'] line-clamp-1">
                {(quoteData?.maintenance_requests as any)?.description}
              </p>
            </div>
            <div className="w-20 h-20 shrink-0 flex items-center justify-center text-5xl text-primary overflow-hidden">
              {getCategoryIcon((quoteData?.maintenance_requests as any)?.category)}
            </div>
          </div>
        </div>

        {/* Total Price */}
        <div className="px-4 pb-2">
          <label className="block text-foreground text-sm font-semibold mb-2 ml-1 font-['Noto_Sans_Arabic']">{t.price}</label>
          <div className="flex w-full items-stretch rounded-xl shadow-sm border border-border bg-card transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            <Input
              id="price"
              name="price"
              className="flex-1 rounded-l-xl rounded-r-none border-0 h-14 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-['Noto_Sans_Arabic']"
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
            <div className="flex items-center justify-center px-4 bg-muted/30 border-l border-border rounded-r-xl">
              <span className="text-muted-foreground font-bold text-sm font-['Noto_Sans_Arabic']">{t.currency}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-1">{t.vatNote}</p>
        </div>

        {/* Start Date & Duration - Side by Side */}
        <div className="px-4 py-6">
          <div className="flex w-full gap-4">
            {/* Start Date */}
            <div className="flex flex-col gap-2 flex-1">
              <label className="block text-foreground text-sm font-semibold ml-1 font-['Noto_Sans_Arabic']">{t.startDate}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-center gap-2 bg-card text-foreground border border-border rounded-xl h-14 px-4 text-base font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-['Noto_Sans_Arabic']",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 opacity-50" />
                    {startDate ? format(new Date(startDate), "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
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
              <label className="block text-foreground text-sm font-semibold ml-1 font-['Noto_Sans_Arabic']">
                {t.duration} <span className="text-xs text-muted-foreground font-normal">({currentLanguage === 'ar' ? 'عدد الأيام' : 'Days'})</span>
              </label>
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
        </div>

        {/* Description */}
        <div className="px-4 pb-6">
          <label className="block text-foreground text-sm font-semibold mb-2 ml-1 font-['Noto_Sans_Arabic']">{t.description}</label>
          <Textarea
            id="proposal"
            name="proposal"
            className="w-full min-h-[120px] bg-card text-foreground border border-border rounded-2xl p-4 text-base leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none font-['Noto_Sans_Arabic']"
            placeholder={t.descriptionPlaceholder}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
        </div>

        {/* Attachments */}
        <div className="px-4 pb-6">
          <label className="block text-foreground text-sm font-semibold mb-3 ml-1 font-['Noto_Sans_Arabic']">{t.attachments}</label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
          />

          <div className="space-y-3">
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
                <span className="text-xl">+</span>
              </div>
              <span className="text-[11px] font-bold font-['Noto_Sans_Arabic']">{t.addNew}</span>
            </button>

            {/* File List */}
            {(existingAttachments.length > 0 || filesToUpload.length > 0) && (
              <div className="grid gap-2">
                {existingAttachments.map((url, idx) => (
                  <div key={`existing-${idx}`} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm truncate text-muted-foreground">Attachment {idx + 1}</span>
                    </div>
                    <button onClick={() => removeExistingAttachment(url)} className="text-destructive p-1 hover:bg-destructive/10 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {filesToUpload.map((file, idx) => (
                  <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center shrink-0">
                        {file.type.startsWith('image') ? (
                          <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded" alt="preview" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-sm truncate font-medium">{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(idx)} className="text-destructive p-1 hover:bg-destructive/10 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex gap-3 items-start border border-blue-100 dark:border-blue-800/30">
            <span className="text-blue-600 dark:text-blue-400 shrink-0">ℹ️</span>
            <p className={`text-sm text-blue-800 dark:text-blue-200 leading-normal ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}>
              {t.infoMessage}
            </p>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur-lg border-t border-border/50 p-4 pb-6 z-10">
        <button
          onClick={() => handleSubmit()}
          disabled={loading}
          className={`w-full bg-primary hover:bg-primary/90 text-white font-bold text-base h-11 rounded-full shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 ${currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : ''}`}
        >
          <span>{t.updateQuote}</span>
          <span className="text-lg">{currentLanguage === 'ar' ? '←' : '➔'}</span>
        </button>
      </div>
    </div>
  );
};
