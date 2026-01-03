import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, X, Camera, FileText, Sun, Sunrise, Moon, Zap, Calendar as CalendarIcon, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TouchCard } from '@/components/mobile/TouchCard';
import { AddressPicker } from '@/components/mobile/AddressPicker';
import { getAllCategories, isAlphaEnabledCategory } from '@/lib/serviceCategories';
import { Heading2, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EditRequestProps {
  currentLanguage: 'en' | 'ar';
}

export const EditRequest = ({ currentLanguage }: EditRequestProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);


  // State structure matching PostRequest
  const [formData, setFormData] = useState({
    title: '',
    category: '',
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
  });

  const categories = getAllCategories();

  const content = {
    en: {
      title: 'Edit Request',
      save: 'Save Changes',
      cancel: 'Cancel',
      requestTitle: 'Title',
      description: 'Description',
      category: 'Category',
      urgency: 'Urgency',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
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
    },
    ar: {
      title: 'تعديل الطلب',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
      requestTitle: 'العنوان',
      description: 'الوصف',
      category: 'الفئة',
      urgency: 'الأولوية',
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      urgent: 'عاجل',
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
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    if (id && user?.id) {
      fetchRequestData();
    }
  }, [id, user?.id]);

  const fetchRequestData = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', id)
        .eq('buyer_id', user?.id)
        .single();

      if (error) throw error;

      if (data.quotes_count > 0) {
        // Use a unique toast ID to prevent duplicates (React Strict Mode can cause double mounting)
        toast.error(
          currentLanguage === 'ar'
            ? 'لا يمكن تعديل طلب به عروض. يمكنك رفض العروض الحالية أولاً ثم التعديل.'
            : 'Cannot edit request with quotes. Reject the existing quotes first to enable editing.',
          { id: `edit-request-quotes-error-${id}`, duration: 8000 }
        );
        navigate('/app/buyer/requests');
        return;
      }

      // Parse preferred_start_date logic
      let parsedDate = new Date().toISOString().split('T')[0];
      let parsedFlexibleDate = false;
      let parsedFlexibleTime = false;
      let parsedTimeWindow = 'afternoon';

      // Check for [Flexible Time] marker in description
      if (data.description && data.description.includes('[Flexible Time]')) {
        parsedFlexibleTime = true;
      }

      // Parse time window from description (for ASAP/flexible date cases)
      if (data.description) {
        const timeMatch = data.description.match(/Time Window: (\w+)/i);
        if (timeMatch && timeMatch[1]) {
          parsedTimeWindow = timeMatch[1].toLowerCase();
        }
      }

      if (data.preferred_start_date) {
        const dateObj = new Date(data.preferred_start_date);
        parsedDate = dateObj.toISOString().split('T')[0];
        const hours = dateObj.getHours();

        // Only set time from hours if not already set from marker
        if (!data.description?.match(/Time Window:/i)) {
          if (hours === 9) parsedTimeWindow = 'morning';
          else if (hours === 14) parsedTimeWindow = 'afternoon';
          else if (hours === 20) parsedTimeWindow = 'evening';
          else parsedTimeWindow = 'afternoon';
        }
      } else {
        // If null, could be ASAP or flexible date
        // Check if description contains flexible date markers
        if (data.description && (data.description.includes('[Flexible Date]') || data.description.includes('[تاريخ مرن]'))) {
          parsedFlexibleDate = true;
          parsedDate = new Date().toISOString().split('T')[0]; // Default to today for UI
        } else {
          parsedDate = 'asap';
        }
      }

      // Determine neighborhood/city from location string if possible, or fallback
      // location string is typically "Neighborhood, City"
      let addressParts = (data.location || '').split(',').map((s: string) => s.trim());
      let parsedNeighborhood = addressParts[0] || '';
      let parsedCity = data.city || '';

      // Clean the description by removing markers before setting in form
      let cleanDescription = (data.description || '')
        .replace(/\n\nTime Window: \w+/g, '')
        .replace(/\n\n\[Flexible Time\]/g, '')
        .replace(/\n\n\[Flexible Date\]/g, '')
        .replace(/\n\n\[تاريخ مرن\]/g, '')
        .trim();

      setFormData({
        title: data.title || '',
        description: cleanDescription,
        category: data.category || '',
        city: parsedCity,
        neighborhood: parsedNeighborhood, // Best effort parse
        urgency: data.urgency || 'medium',
        budgetMin: data.estimated_budget_min?.toString() || '',
        budgetMax: data.estimated_budget_max?.toString() || '',
        budgetFlexible: !data.estimated_budget_min && !data.estimated_budget_max,
        preferredDate: parsedDate,
        flexibleDate: parsedFlexibleDate,
        timeWindow: parsedTimeWindow,
        flexibleTime: parsedFlexibleTime,
      });

    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
      navigate('/app/buyer/requests');
    } finally {
      setFetching(false);
    }
  };

  const handleAddressSelect = (address: { city: string; full_address: string }) => {
    setFormData(prev => ({
      ...prev,
      city: address.city,
      neighborhood: address.full_address
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.title || !formData.description || !formData.category) {
      toast.error(currentLanguage === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const budgetMin = formData.budgetMin ? parseFloat(formData.budgetMin) : null;
      const budgetMax = formData.budgetMax ? parseFloat(formData.budgetMax) : null;

      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          title: formData.title,
          description: (() => {
            // Strip old markers first
            let desc = formData.description
              .replace(/\n\nTime Window: \w+/g, '')
              .replace(/\n\n\[Flexible Time\]/g, '')
              .replace(/\n\n\[Flexible Date\]/g, '')
              .replace(/\n\n\[تاريخ مرن\]/g, '')
              .trim();
            // Add flexible date marker
            if (formData.flexibleDate) {
              desc += '\n\n[Flexible Date]';
            }
            // Add time window marker when date is ASAP or flexible
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
          category: formData.category,
          city: formData.city,
          location: `${formData.neighborhood}, ${formData.city}`,
          urgency: formData.urgency,
          estimated_budget_min: budgetMin,
          estimated_budget_max: budgetMax,
          preferred_start_date: (() => {
            if (formData.flexibleDate) return null;
            if (formData.preferredDate === 'asap') return null;

            const [y, m, d] = formData.preferredDate.split('-').map(Number);
            const date = new Date(y, m - 1, d);

            switch (formData.timeWindow) {
              case 'morning': date.setHours(9, 0, 0, 0); break;
              case 'afternoon': date.setHours(14, 0, 0, 0); break;
              case 'evening': date.setHours(20, 0, 0, 0); break;
              default: date.setHours(12, 0, 0, 0);
            }
            return date.toISOString();
          })(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['request-detail', id] });
      toast.success(currentLanguage === 'ar' ? 'تم التحديث بنجاح!' : 'Updated successfully!');
      navigate(`/app/buyer/request/${id}`);
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? 'فشل التحديث' : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        showBack={true}
        onBack={() => navigate(`/app/buyer/request/${id}`)}
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md"
      />

      <div className="p-4 space-y-6">

        {/* Title */}
        <div className="space-y-2">
          <Label>{t.requestTitle} *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={t.requestTitle}
            required
            className="rounded-full"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>{t.category} *</Label>
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
          <Label>{t.urgency}</Label>
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
                  {content[currentLanguage === 'ar' ? 'ar' : 'en'][level as 'low' | 'medium' | 'high']}
                </span>
              </TouchCard>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label>{t.where}</Label>
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
          <Label>{t.when}</Label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <TouchCard
              onClick={() => !formData.flexibleDate && setFormData({ ...formData, preferredDate: 'asap' })}
              className={`p-4 text-center ${formData.preferredDate === 'asap' && !formData.flexibleDate
                ? 'border-primary border-2 bg-primary/5'
                : ''
                } ${formData.flexibleDate ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl mb-2">⚡</div>
                <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                  {t.asap}
                </span>
              </div>
            </TouchCard>
            <TouchCard
              onClick={() => !formData.flexibleDate && setFormData({ ...formData, preferredDate: new Date().toISOString().split('T')[0] })}
              className={`p-4 text-center ${formData.preferredDate !== 'asap' && !formData.flexibleDate
                ? 'border-primary border-2 bg-primary/5'
                : ''
                } ${formData.flexibleDate ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl mb-2">📅</div>
                <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                  {t.chooseDate}
                </span>
              </div>
            </TouchCard>
          </div>

          {/* Date Picker */}
          {formData.preferredDate !== 'asap' && !formData.flexibleDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2"
            >
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-center gap-2 bg-card text-foreground border border-input rounded-xl h-12 px-4 text-base font-medium font-['Noto_Sans_Arabic']",
                      !formData.preferredDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 opacity-50" />
                    {formData.preferredDate ? format(new Date(formData.preferredDate), "dd/MM/yyyy") : <span>dd/mm/yyyy</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={formData.preferredDate ? new Date(formData.preferredDate) : undefined}
                    onSelect={(date) => setFormData({ ...formData, preferredDate: date ? format(date, 'yyyy-MM-dd') : '' })}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
              {t.flexible}
            </span>
          </label>
        </div>

        {/* Time Window */}
        <div className="space-y-2">
          <Label>{t.timeWindow}</Label>
          <div className="grid grid-cols-3 gap-2">
            {['morning', 'afternoon', 'evening'].map((time) => (
              <TouchCard
                key={time}
                onClick={() => !formData.flexibleTime && setFormData({ ...formData, timeWindow: time })}
                className={`p-4 text-center ${formData.timeWindow === time && !formData.flexibleTime
                  ? 'border-primary border-2 bg-primary/5'
                  : ''
                  } ${formData.flexibleTime ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  {time === 'morning' && <div className="text-3xl mb-2">☀️</div>}
                  {time === 'afternoon' && <div className="text-3xl mb-2">⛅</div>}
                  {time === 'evening' && <div className="text-3xl mb-2">🌙</div>}
                  <span className={currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'}>
                    {content[currentLanguage === 'ar' ? 'ar' : 'en'][time as 'morning' | 'afternoon' | 'evening']}
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
              {t.flexibleTime}
            </span>
          </label>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <Label>{t.budget}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={formData.budgetMin}
              onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
              placeholder={t.min}
              disabled={formData.budgetFlexible}
              className="rounded-full"
            />
            <Input
              type="number"
              value={formData.budgetMax}
              onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
              placeholder={t.max}
              disabled={formData.budgetFlexible}
              className="rounded-full"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.budgetFlexible}
              onChange={(e) => setFormData({ ...formData, budgetFlexible: e.target.checked })}
              className="rounded"
            />
            <span className={cn("text-sm", currentLanguage === 'ar' && "font-ar-body")}>{t.budgetFlexible}</span>
          </label>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t.description} *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t.detailsPlaceholder}
            rows={5}
            required
            className="rounded-3xl"
          />
        </div>

      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t pb-safe">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/buyer/request/${id}`)}
            className="flex-1 rounded-full"
          >
            {t.cancel}
          </Button>
          <Button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="flex-1 rounded-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.save}
          </Button>
        </div>
      </div>
    </div>
  );
};
