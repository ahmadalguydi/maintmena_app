import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddressManager } from '@/components/mobile/AddressManager';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2, Mail, Phone, MapPin, ChevronRight, ChevronLeft,
  User, Building2, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const EditProfile = ({ currentLanguage }: EditProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
  });

  const isAr = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Edit Info',
      accountSection: 'Account',
      profileSection: 'Personal Info',
      email: 'Email',
      phone: 'Phone Number',
      phonePlaceholder: '+966 5X XXX XXXX',
      fullName: 'Full Name',
      accountType: 'Account Type',
      individual: 'Individual',
      individualDesc: 'Personal use',
      company: 'Company',
      companyDesc: 'Business account',
      companyName: 'Company Name',
      currentType: 'Current:',
      addresses: 'My Addresses',
      manageAddresses: 'Manage your saved addresses',
      save: 'Save Changes',
      saving: 'Saving…',
      cancel: 'Cancel',
    },
    ar: {
      title: 'تعديل المعلومات',
      accountSection: 'الحساب',
      profileSection: 'المعلومات الشخصية',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      phonePlaceholder: '+966 5X XXX XXXX',
      fullName: 'الاسم الكامل',
      accountType: 'نوع الحساب',
      individual: 'فرد',
      individualDesc: 'استخدام شخصي',
      company: 'شركة',
      companyDesc: 'حساب تجاري',
      companyName: 'اسم الشركة',
      currentType: 'الحالي:',
      addresses: 'عناويني',
      manageAddresses: 'إدارة العناوين المحفوظة',
      save: 'حفظ التغييرات',
      saving: 'جاري الحفظ…',
      cancel: 'إلغاء',
    },
  }[currentLanguage];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setFetchLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, company_name, buyer_type')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error(isAr ? 'فشل تحميل البيانات' : 'Failed to load profile');
        setFetchLoading(false);
        return;
      }

      if (data) {
        const d = data as {
          full_name?: string | null;
          phone?: string | null;
          company_name?: string | null;
          buyer_type?: string | null;
        };
        setAccountType(d.buyer_type === 'company' ? 'company' : 'individual');
        setFormData({
          full_name: d.full_name || '',
          phone: d.phone || '',
          company_name: d.company_name || '',
        });
      }
      setFetchLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          company_name: accountType === 'company' ? (formData.company_name || null) : null,
          buyer_type: accountType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(isAr ? 'تم حفظ التغييرات' : 'Profile updated successfully');
      navigate(-1);
    } catch {
      toast.error(isAr ? 'فشل الحفظ' : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isAr ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">

        {/* ── Account ── */}
        <SoftCard>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            {t.accountSection}
          </p>
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className={cn(
                'text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5',
                isAr && 'flex-row-reverse',
              )}>
                <Mail className="w-3.5 h-3.5" /> {t.email}
              </label>
              <div className="h-12 px-4 rounded-full border border-border bg-muted/40 flex items-center text-sm text-muted-foreground select-all">
                {user?.email}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className={cn(
                'text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5',
                isAr && 'flex-row-reverse',
              )}>
                <Phone className="w-3.5 h-3.5" /> {t.phone}
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t.phonePlaceholder}
                className="rounded-full"
                dir={isAr ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </SoftCard>

        {/* ── Account Type ── */}
        <SoftCard className="overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t.accountType}
            </p>
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
              accountType === 'company'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                : 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
            )}>
              {t.currentType} {accountType === 'company' ? t.company : t.individual}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Individual */}
            <button
              type="button"
              onClick={() => setAccountType('individual')}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                accountType === 'individual'
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50',
              )}
            >
              {accountType === 'individual' && (
                <div className="absolute top-2 right-2">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                accountType === 'individual' ? 'bg-primary/10' : 'bg-muted',
              )}>
                <User className={cn('w-6 h-6', accountType === 'individual' ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="text-center">
                <span className={cn('text-sm font-semibold block', accountType === 'individual' ? 'text-primary' : 'text-foreground')}>
                  {t.individual}
                </span>
                <span className="text-[10px] text-muted-foreground">{t.individualDesc}</span>
              </div>
            </button>

            {/* Company */}
            <button
              type="button"
              onClick={() => setAccountType('company')}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                accountType === 'company'
                  ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                  : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50',
              )}
            >
              {accountType === 'company' && (
                <div className="absolute top-2 right-2">
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                </div>
              )}
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                accountType === 'company' ? 'bg-blue-500/10' : 'bg-muted',
              )}>
                <Building2 className={cn('w-6 h-6', accountType === 'company' ? 'text-blue-500' : 'text-muted-foreground')} />
              </div>
              <div className="text-center">
                <span className={cn('text-sm font-semibold block', accountType === 'company' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground')}>
                  {t.company}
                </span>
                <span className="text-[10px] text-muted-foreground">{t.companyDesc}</span>
              </div>
            </button>
          </div>
        </SoftCard>

        {/* ── Personal Info ── */}
        <SoftCard>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            {t.profileSection}
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="full_name" className={cn(
                'text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5',
                isAr && 'flex-row-reverse',
              )}>
                <User className="w-3.5 h-3.5" /> {t.fullName}
              </label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t.fullName}
                className="rounded-full"
                dir={isAr ? 'rtl' : 'ltr'}
                required
              />
            </div>

            <AnimatePresence>
              {accountType === 'company' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="company_name" className={cn(
                      'text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5',
                      isAr && 'flex-row-reverse',
                    )}>
                      <Building2 className="w-3.5 h-3.5" /> {t.companyName}
                    </label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder={t.companyName}
                      className="rounded-full"
                      dir={isAr ? 'rtl' : 'ltr'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SoftCard>

        {/* ── Addresses ── */}
        <SoftCard>
          <button
            type="button"
            onClick={() => setShowAddressManager(true)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <p className="text-sm font-semibold text-foreground">{t.addresses}</p>
                <p className="text-xs text-muted-foreground">{t.manageAddresses}</p>
              </div>
            </div>
            {isAr
              ? <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              : <ChevronRight className="w-5 h-5 text-muted-foreground" />
            }
          </button>
        </SoftCard>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="flex-1 rounded-full"
          >
            {t.cancel}
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 rounded-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? t.saving : t.save}
          </Button>
        </div>
      </form>

      <AddressManager
        open={showAddressManager}
        onOpenChange={setShowAddressManager}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};
