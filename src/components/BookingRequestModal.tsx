import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllCategories } from '@/lib/serviceCategories';
import { AuthTriggerModal } from '@/components/mobile/AuthTriggerModal';
import { AddressPicker } from '@/components/mobile/AddressPicker';
import { Input } from '@/components/ui/input';


interface BookingRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: any;
  currentLanguage: 'en' | 'ar';
  onSuccess?: () => void;
}

const STORAGE_KEY = 'pendingBooking';

const BookingRequestModal = ({
  open,
  onOpenChange,
  vendor,
  currentLanguage,
  onSuccess
}: BookingRequestModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    request_type: 'booking',
    service_category: '',
    proposed_start_date: '',
    preferred_time_slot: '',
    location_address: '',
    location_city: '',
    location_country: 'saudi_arabia',
    job_description: '',
    budget_range: '',
    urgency: 'normal',
    requires_deposit: false,
  });

  const allCategories = getAllCategories();

  const vendorServices = vendor?.services_pricing && Array.isArray(vendor.services_pricing)
    ? vendor.services_pricing.filter((s: any) => s.available !== false)
    : [];

  const vendorCategories = vendorServices.length > 0
    ? allCategories.filter(cat => vendorServices.some((s: any) => s.category === cat.key))
    : (vendor?.service_categories
      ? allCategories.filter(cat => vendor.service_categories.includes(cat.key))
      : []);

  const hasNoCategories = vendorCategories.length === 0;

  // Restore saved form data when modal opens
  useEffect(() => {
    if (open && vendor) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.vendorId === vendor.id) {
            setFormData(prev => ({ ...prev, ...parsed.formData }));
          }
        } catch (e) {
          console.error('Failed to parse saved booking data');
        }
      }
    }
  }, [open, vendor?.id]);

  // Auto-save form data on every change
  useEffect(() => {
    if (open && vendor) {
      const pendingData = {
        vendorId: vendor.id,
        vendorName: vendor.company_name || vendor.full_name,
        formData,
        returnPath: window.location.pathname
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingData));
    }
  }, [formData, vendor, open]);

  const handleAddressSelect = (address: { city: string; full_address: string }) => {
    setFormData(prev => ({
      ...prev,
      location_city: address.city,
      location_address: address.full_address
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If user is not logged in, show auth modal
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    // Validate required fields including location and date
    if (!formData.service_category || !formData.job_description || !formData.location_city || !formData.location_address || !formData.proposed_start_date) {
      toast({
        title: currentLanguage === 'ar' ? 'حقول مطلوبة' : 'Missing required fields',
        description: currentLanguage === 'ar'
          ? 'يرجى ملء نوع الخدمة والموقع ووصف العمل'
          : 'Please fill in service type, location, and job description',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('booking_requests')
        .insert({
          buyer_id: user.id,
          seller_id: vendor.id,
          request_type: 'booking',
          service_category: formData.service_category,
          proposed_start_date: formData.proposed_start_date || null,
          proposed_end_date: null,
          preferred_time_slot: formData.preferred_time_slot,
          location_address: formData.location_address,
          location_city: formData.location_city,
          location_country: formData.location_country,
          job_description: formData.job_description,
          budget_range: formData.budget_range,
          urgency: formData.urgency,
          requires_deposit: formData.requires_deposit,
        });

      if (error) throw error;

      // Clear saved data on success
      localStorage.removeItem(STORAGE_KEY);

      toast({
        title: currentLanguage === 'ar' ? 'تم إرسال الطلب!' : 'Request sent!',
        description: currentLanguage === 'ar'
          ? `تم إرسال طلب الحجز إلى ${vendor.company_name || vendor.full_name}`
          : `Your booking request has been sent to ${vendor.company_name || vendor.full_name}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ في الإرسال' : 'Error sending request',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isRTL = currentLanguage === 'ar';
  const requiredFieldClass = "border-2 border-primary/50 focus:border-primary";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'font-ar-body' : ''}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <DialogHeader>
            <DialogTitle className={`text-2xl ${isRTL ? 'font-ar-heading' : ''}`}>
              {currentLanguage === 'ar' ? 'طلب حجز' : 'Request Booking'}
            </DialogTitle>
            <DialogDescription>
              {currentLanguage === 'ar'
                ? `إرسال طلب حجز إلى ${vendor?.company_name || vendor?.full_name}`
                : `Send a booking request to ${vendor?.company_name || vendor?.full_name}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Service Category (Required) */}
            <div className="space-y-2">
              <Label>{currentLanguage === 'ar' ? 'الخدمة المطلوبة *' : 'Service Needed *'}</Label>
              {hasNoCategories ? (
                <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {currentLanguage === 'ar'
                      ? 'لم يقم هذا المزود بتكوين خدماته بعد. يرجى المحاولة لاحقاً أو الاتصال مباشرة.'
                      : "This vendor hasn't configured their services yet. Please try again later or contact them directly."}
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.service_category}
                  onValueChange={(value) => setFormData({ ...formData, service_category: value })}
                >
                  <SelectTrigger className={requiredFieldClass}>
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'اختر خدمة' : 'Select a service'} />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorCategories.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 2. Location (Required) */}
            <div className="space-y-2">
              <Label>{currentLanguage === 'ar' ? 'الموقع *' : 'Location *'}</Label>
              <AddressPicker
                currentLanguage={currentLanguage}
                selectedCity={formData.location_city}
                selectedAddress={formData.location_address}
                onAddressSelect={handleAddressSelect}
                required
              />
            </div>

            {/* 3. Job Description (Required) */}
            <div className="space-y-2">
              <Label>{currentLanguage === 'ar' ? 'وصف العمل *' : 'Job Description *'}</Label>
              <Textarea
                placeholder={currentLanguage === 'ar' ? 'صف ما تحتاجه...' : 'Describe what you need done...'}
                value={formData.job_description}
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                rows={4}
                required
                className={requiredFieldClass}
              />
            </div>

            {/* 4. Job Date (Required) */}
            <div className="space-y-2">
              <Label>
                <Calendar className="inline h-4 w-4 mr-2" />
                {currentLanguage === 'ar' ? 'تاريخ العمل *' : 'Job Date *'}
              </Label>
              <Input
                type="date"
                value={formData.proposed_start_date}
                onChange={(e) => setFormData({ ...formData, proposed_start_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
                className={requiredFieldClass}
              />
            </div>

            {/* 5. Time Slot (Optional) */}
            <div className="space-y-2">
              <Label>
                <Clock className="inline h-4 w-4 mr-2" />
                {currentLanguage === 'ar' ? 'الوقت المفضل' : 'Preferred Time Slot'}
              </Label>
              <Select
                value={formData.preferred_time_slot}
                onValueChange={(value) => setFormData({ ...formData, preferred_time_slot: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={currentLanguage === 'ar' ? 'اختر الوقت' : 'Select time slot'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{currentLanguage === 'ar' ? 'صباحاً (8 ص - 12 م)' : 'Morning (8 AM - 12 PM)'}</SelectItem>
                  <SelectItem value="afternoon">{currentLanguage === 'ar' ? 'بعد الظهر (12 م - 4 م)' : 'Afternoon (12 PM - 4 PM)'}</SelectItem>
                  <SelectItem value="evening">{currentLanguage === 'ar' ? 'مساءً (4 م - 8 م)' : 'Evening (4 PM - 8 PM)'}</SelectItem>
                  <SelectItem value="flexible">{currentLanguage === 'ar' ? 'مرن' : 'Flexible'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 6. Budget & Urgency (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  <DollarSign className="inline h-4 w-4 mr-2" />
                  {currentLanguage === 'ar' ? 'ميزانية' : 'Budget Range'}
                </Label>
                <Select
                  value={formData.budget_range}
                  onValueChange={(value) => setFormData({ ...formData, budget_range: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={currentLanguage === 'ar' ? 'اختر الميزانية' : 'Select budget'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_100">{currentLanguage === 'ar' ? 'أقل من 100 ريال' : 'Under SAR 100'}</SelectItem>
                    <SelectItem value="100_250">{currentLanguage === 'ar' ? '100 - 250 ريال' : 'SAR 100 - 250'}</SelectItem>
                    <SelectItem value="250_500">{currentLanguage === 'ar' ? '250 - 500 ريال' : 'SAR 250 - 500'}</SelectItem>
                    <SelectItem value="500_1000">{currentLanguage === 'ar' ? '500 - 1,000 ريال' : 'SAR 500 - 1,000'}</SelectItem>
                    <SelectItem value="1000_2500">{currentLanguage === 'ar' ? '1,000 - 2,500 ريال' : 'SAR 1,000 - 2,500'}</SelectItem>
                    <SelectItem value="2500_5000">{currentLanguage === 'ar' ? '2,500 - 5,000 ريال' : 'SAR 2,500 - 5,000'}</SelectItem>
                    <SelectItem value="5000_10000">{currentLanguage === 'ar' ? '5,000 - 10,000 ريال' : 'SAR 5,000 - 10,000'}</SelectItem>
                    <SelectItem value="over_10000">{currentLanguage === 'ar' ? 'أكثر من 10,000 ريال' : 'Over SAR 10,000'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  <AlertCircle className="inline h-4 w-4 mr-2" />
                  {currentLanguage === 'ar' ? 'الأولوية' : 'Urgency'}
                </Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">{currentLanguage === 'ar' ? 'عاجل (نفس اليوم)' : 'Urgent (Same Day)'}</SelectItem>
                    <SelectItem value="normal">{currentLanguage === 'ar' ? 'عادي (هذا الأسبوع)' : 'Normal (This Week)'}</SelectItem>
                    <SelectItem value="flexible">{currentLanguage === 'ar' ? 'مرن' : 'Flexible'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Terms - Cash Only During Beta */}
            <div className="space-y-2">
              <Label>{currentLanguage === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
              <Select value="cash" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    ✓ 💵 {currentLanguage === 'ar' ? 'نقداً' : 'Cash'}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  {currentLanguage === 'ar' ? (
                    <>
                      💵 <strong>الدفع النقدي فقط:</strong> نقبل حالياً النقد فقط خلال فترة التجربة.
                      🔒 <strong>الدفع الإلكتروني قريباً</strong>
                    </>
                  ) : (
                    <>
                      💵 <strong>Cash Payments Only:</strong> We currently accept cash only during beta.
                      🔒 <strong>Online Payment Coming Soon</strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={submitting || hasNoCategories}>
                {submitting
                  ? (currentLanguage === 'ar' ? 'جارٍ الإرسال...' : 'Sending...')
                  : (currentLanguage === 'ar' ? 'إرسال الطلب' : 'Send Request')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auth Modal for guests */}
      <AuthTriggerModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        currentLanguage={currentLanguage}
        pendingAction={{
          type: 'booking',
          data: { vendorId: vendor?.id, vendorName: vendor?.company_name || vendor?.full_name },
          returnPath: `/app/buyer/vendor/${vendor?.id}`
        }}
      />
    </>
  );
};

export default BookingRequestModal;
