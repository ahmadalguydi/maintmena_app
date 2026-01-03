import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/mobile/Typography';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressManager } from '@/components/mobile/AddressManager';
import { toast } from 'sonner';
import { Loader2, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const EditProfile = ({ currentLanguage }: EditProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    buyer_type: 'individual' as 'individual' | 'company'
  });

  const content = {
    en: {
      title: 'Edit Profile',
      fullName: 'Full Name',
      phone: 'Phone Number',
      companyName: 'Company Name (Optional)',
      buyerType: 'Account Type',
      individual: 'Individual',
      company: 'Company',
      save: 'Save Changes',
      saving: 'Saving...',
      cancel: 'Cancel',
      addresses: 'My Addresses',
      manageAddresses: 'Manage your saved addresses'
    },
    ar: {
      title: 'تعديل الملف الشخصي',
      fullName: 'الاسم الكامل',
      phone: 'رقم الهاتف',
      companyName: 'اسم الشركة (اختياري)',
      buyerType: 'نوع الحساب',
      individual: 'فرد',
      company: 'شركة',
      save: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء',
      addresses: 'عناويني',
      manageAddresses: 'إدارة العناوين المحفوظة'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error(currentLanguage === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load profile');
        return;
      }

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          buyer_type: (data.buyer_type as 'individual' | 'company') || 'individual'
        });
      }
    };

    fetchProfile();
  }, [user, currentLanguage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name || null,
          buyer_type: formData.buyer_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم حفظ التغييرات' : 'Profile updated successfully');
      navigate('/app/buyer/profile');
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save changes');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        showBack
        onBack={() => navigate('/app/buyer/profile')}
      />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <SoftCard animate={false} className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.fullName}</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t.fullName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t.phone}
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.buyerType}</Label>
              <Select value={formData.buyer_type} onValueChange={(val: 'individual' | 'company') => setFormData({ ...formData, buyer_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">{t.individual}</SelectItem>
                  <SelectItem value="company">{t.company}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.buyer_type === 'company' && (
              <div className="space-y-2">
                <Label lang={currentLanguage}>{t.companyName}</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder={t.companyName}
                />
              </div>
            )}
          </div>
        </SoftCard>

        {/* My Addresses Section */}
        <SoftCard animate={false}>
          <button
            type="button"
            onClick={() => setShowAddressManager(true)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className={currentLanguage === 'ar' ? 'text-right' : 'text-left'}>
                <Label lang={currentLanguage} className="block">{t.addresses}</Label>
                <p className="text-xs text-muted-foreground">{t.manageAddresses}</p>
              </div>
            </div>
            {currentLanguage === 'ar' ? (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </SoftCard>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/app/buyer/profile')}
            disabled={loading}
            className="flex-1"
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? t.saving : t.save}
          </Button>
        </div>
      </form>

      {/* Address Manager Modal */}
      <AddressManager
        open={showAddressManager}
        onOpenChange={setShowAddressManager}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};
