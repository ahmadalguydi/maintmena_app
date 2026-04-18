import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/mobile/Typography';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2,
  Mail,
  Phone,
  Lock,
  Building2,
  User,
  Globe,
  Linkedin,
  FileText,
  BadgeCheck,
  AlertTriangle,
  MapPin,
  Hash,
  Receipt,
  Users,
  Calendar,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const EditProfile = ({ currentLanguage }: EditProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [showTypeConfirm, setShowTypeConfirm] = useState<'individual' | 'company' | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    company_description: '',
    phone: '',
    bio: '',
    years_of_experience: '',
    website_url: '',
    linkedin_url: '',
    crew_size_range: '',
    // Company-specific extended fields
    company_address: '',
    cr_number: '',
    vat_number: '',
  });

  const isAr = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Edit Info',
      accountSection: 'Account',
      profileSection: 'Personal Info',
      companySection: 'Company Details',
      accountType: 'Account Type',
      individual: 'Individual',
      company: 'Company',
      email: 'Email',
      phone: 'Phone Number',
      resetPassword: 'Reset Password',
      resetting: 'Sending…',
      resetSent: 'Password reset email sent!',
      fullName: 'Full Name',
      bio: 'Bio',
      bioHint: 'A good bio increases your request rate by 40%',
      companyName: 'Company / Trade Name',
      companyDescription: 'What does your company do?',
      yearsExperience: 'Years in Business',
      crewSize: 'Crew Size (e.g. 1-5)',
      website: 'Website (optional)',
      linkedin: 'LinkedIn (optional)',
      companyAddress: 'Company Address',
      crNumber: 'CR Number (سجل تجاري)',
      vatNumber: 'VAT Number',
      save: 'Save Changes',
      saving: 'Saving…',
      cancel: 'Cancel',
      switchTo: 'Switch to',
      switchTitle: 'Change Account Type',
      switchWarning: 'Switching your account type will change how your profile appears to buyers. Company accounts show the company name, badge, and additional business info.',
      switchIndividualWarning: 'Switching to Individual will hide your company details from buyers. Your company info will be saved but not displayed.',
      confirm: 'Yes, Switch',
      cancelSwitch: 'Cancel',
      currentType: 'Current:',
    },
    ar: {
      title: 'تعديل المعلومات',
      accountSection: 'الحساب',
      profileSection: 'المعلومات الشخصية',
      companySection: 'تفاصيل الشركة',
      accountType: 'نوع الحساب',
      individual: 'فرد',
      company: 'شركة',
      email: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      resetPassword: 'إعادة تعيين كلمة المرور',
      resetting: 'جاري الإرسال…',
      resetSent: 'تم إرسال رابط إعادة التعيين!',
      fullName: 'الاسم الكامل',
      bio: 'نبذة عنك',
      bioHint: 'السيرة الجيدة تزيد طلباتك بنسبة 40%',
      companyName: 'اسم الشركة / الاسم التجاري',
      companyDescription: 'ماذا تقدم شركتك؟',
      yearsExperience: 'سنوات العمل',
      crewSize: 'حجم الفريق (مثلاً 1-5)',
      website: 'الموقع الإلكتروني (اختياري)',
      linkedin: 'لينكدإن (اختياري)',
      companyAddress: 'عنوان الشركة',
      crNumber: 'رقم السجل التجاري',
      vatNumber: 'الرقم الضريبي',
      save: 'حفظ التغييرات',
      saving: 'جاري الحفظ…',
      cancel: 'إلغاء',
      switchTo: 'التبديل إلى',
      switchTitle: 'تغيير نوع الحساب',
      switchWarning: 'تبديل نوع حسابك سيغير طريقة ظهور ملفك للعملاء. حسابات الشركات تعرض اسم الشركة وشارة والمعلومات التجارية.',
      switchIndividualWarning: 'التبديل لحساب فرد سيخفي تفاصيل شركتك. سيتم حفظ معلومات الشركة لكنها لن تظهر.',
      confirm: 'نعم، تبديل',
      cancelSwitch: 'إلغاء',
      currentType: 'الحالي:',
    },
  }[currentLanguage];

  // -- load --
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setFetchLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error(isAr ? 'فشل تحميل البيانات' : 'Failed to load profile');
        setFetchLoading(false);
        return;
      }

      if (data) {
        const d = data as typeof data & {
          buyer_type?: string;
          company_name?: string | null;
          company_description?: string | null;
          years_of_experience?: number | null;
          website_url?: string | null;
          linkedin_url?: string | null;
          crew_size_range?: string | null;
          company_address?: string | null;
          cr_number?: string | null;
          vat_number?: string | null;
        };
        const isCompany = d.buyer_type === 'company' || !!d.company_name;
        setAccountType(isCompany ? 'company' : 'individual');
        setFormData({
          full_name: d.full_name || '',
          company_name: d.company_name || '',
          company_description: d.company_description || '',
          phone: d.phone || '',
          bio: d.bio || '',
          years_of_experience: d.years_of_experience?.toString() || '',
          website_url: d.website_url || '',
          linkedin_url: d.linkedin_url || '',
          crew_size_range: d.crew_size_range || '',
          company_address: d.company_address || '',
          cr_number: d.cr_number || '',
          vat_number: d.vat_number || '',
        });
      }
      setFetchLoading(false);
    };
    fetchProfile();
  }, [user]);

  // -- switch type with confirmation --
  const requestTypeSwitch = (to: 'individual' | 'company') => {
    if (to === accountType) return;
    setShowTypeConfirm(to);
  };

  const confirmTypeSwitch = async () => {
    if (!showTypeConfirm || !user) return;
    const previousType = accountType;
    setAccountType(showTypeConfirm);
    // Persist buyer_type which is how the schema tracks individual vs company
    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        buyer_type: showTypeConfirm,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) {
      setAccountType(previousType);
      toast.error(isAr ? 'فشل تغيير نوع الحساب' : 'Failed to switch account type');
      setShowTypeConfirm(null);
      return;
    }
    toast.success(
      isAr
        ? `تم التبديل إلى ${showTypeConfirm === 'company' ? 'شركة' : 'فرد'}`
        : `Switched to ${showTypeConfirm === 'company' ? 'Company' : 'Individual'} account`,
    );
    setShowTypeConfirm(null);
  };

  // -- password reset --
  const handleResetPassword = async () => {
    if (!user?.email) return;
    setResettingPassword(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/app/onboarding/login`,
    });
    if (error) {
      toast.error(isAr ? 'فشل إرسال الرابط' : 'Failed to send reset email');
    } else {
      toast.success(t.resetSent);
    }
    setResettingPassword(false);
  };

  // -- submit --
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          website_url: formData.website_url || null,
          linkedin_url: formData.linkedin_url || null,
          buyer_type: accountType,
          ...(accountType === 'company' && {
            company_name: formData.company_name || null,
            company_description: formData.company_description || null,
            years_of_experience: formData.years_of_experience && !isNaN(parseInt(formData.years_of_experience)) ? parseInt(formData.years_of_experience) : null,
            crew_size_range: formData.crew_size_range || null,
            company_address: formData.company_address || null,
            cr_number: formData.cr_number || null,
            vat_number: formData.vat_number || null,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      // Invalidate profile completeness so the checklist updates immediately
      queryClient.invalidateQueries({ queryKey: ['seller-profile-completeness', user?.id] });
      toast.success(isAr ? 'تم حفظ التغييرات' : 'Profile updated successfully');
      navigate(-1);
    } catch {
      toast.error(isAr ? 'فشل الحفظ' : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  // -- helper for consistent fields --
  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; type?: string; icon?: React.ReactNode; textarea?: boolean; rows?: number },
  ) => (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className={cn(
          'text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5',
          isAr && 'flex-row-reverse',
        )}
      >
        {opts?.icon}
        {label}
      </label>
      {opts?.textarea ? (
        <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts.placeholder || label} rows={opts.rows || 4} className="rounded-2xl resize-none" dir={isAr ? 'rtl' : 'ltr'} />
      ) : (
        <Input id={id} type={opts?.type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts?.placeholder || label} className="rounded-full" dir={isAr ? 'rtl' : 'ltr'} />
      )}
    </div>
  );

  // -- loading state --
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

        {/* ───────── SECTION 1: ACCOUNT ───────── */}
        <SoftCard>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            {t.accountSection}
          </p>
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5', isAr && 'flex-row-reverse')}>
                <Mail className="w-3.5 h-3.5" /> {t.email}
              </label>
              <div className="h-12 px-4 rounded-full border border-border bg-muted/40 flex items-center text-sm text-muted-foreground select-all">
                {user?.email}
              </div>
            </div>

            {/* Phone */}
            {field('phone', t.phone, formData.phone, (v) => setFormData({ ...formData, phone: v }), {
              placeholder: '+966 5X XXX XXXX', type: 'tel', icon: <Phone className="w-3.5 h-3.5" />,
            })}

            {/* Reset password */}
            <Button type="button" variant="outline" size="sm" onClick={handleResetPassword} disabled={resettingPassword} className="w-full rounded-full gap-2 text-sm">
              {resettingPassword ? <><Loader2 className="w-4 h-4 animate-spin" />{t.resetting}</> : <><Lock className="w-4 h-4" />{t.resetPassword}</>}
            </Button>
          </div>
        </SoftCard>

        {/* ───────── SECTION 2: ACCOUNT TYPE ───────── */}
        <SoftCard className="overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.accountType}</p>
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
              accountType === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200' : 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
            )}>
              {t.currentType} {accountType === 'company' ? t.company : t.individual}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Individual card */}
            <button
              type="button"
              onClick={() => requestTypeSwitch('individual')}
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
              <span className={cn('text-sm font-semibold', accountType === 'individual' ? 'text-primary' : 'text-foreground')}>
                {t.individual}
              </span>
            </button>

            {/* Company card */}
            <button
              type="button"
              onClick={() => requestTypeSwitch('company')}
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
              <span className={cn('text-sm font-semibold', accountType === 'company' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground')}>
                {t.company}
              </span>
            </button>
          </div>
        </SoftCard>

        {/* ── Confirmation Overlay ── */}
        <AnimatePresence>
          {showTypeConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
              onClick={() => setShowTypeConfirm(null)}
            >
              <motion.div
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 200, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-background rounded-3xl p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    showTypeConfirm === 'company' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-amber-100 dark:bg-amber-900/30',
                  )}>
                    {showTypeConfirm === 'company'
                      ? <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      : <User className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    }
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t.switchTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t.switchTo} {showTypeConfirm === 'company' ? t.company : t.individual}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    {showTypeConfirm === 'company' ? t.switchWarning : t.switchIndividualWarning}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setShowTypeConfirm(null)}>
                    {t.cancelSwitch}
                  </Button>
                  <Button type="button" className={cn('flex-1 rounded-full', showTypeConfirm === 'company' ? 'bg-blue-600 hover:bg-blue-700' : '')} onClick={confirmTypeSwitch}>
                    {t.confirm}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ───────── SECTION 3: PERSONAL INFO ───────── */}
        <SoftCard>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{t.profileSection}</p>
          <div className="space-y-4">
            {field('full_name', t.fullName, formData.full_name, (v) => setFormData({ ...formData, full_name: v }), {
              icon: <User className="w-3.5 h-3.5" />,
            })}

            <div className="space-y-1.5">
              <label htmlFor="bio" className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5', isAr && 'flex-row-reverse')}>
                <FileText className="w-3.5 h-3.5" /> {t.bio}
              </label>
              <p className="text-xs text-muted-foreground">{t.bioHint}</p>
              <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder={t.bio} rows={4} className="rounded-2xl resize-none" dir={isAr ? 'rtl' : 'ltr'} />
            </div>

            {field('website_url', t.website, formData.website_url, (v) => setFormData({ ...formData, website_url: v }), {
              type: 'url', placeholder: 'https://example.com', icon: <Globe className="w-3.5 h-3.5" />,
            })}

            {field('linkedin_url', t.linkedin, formData.linkedin_url, (v) => setFormData({ ...formData, linkedin_url: v }), {
              type: 'url', placeholder: 'https://linkedin.com/in/...', icon: <Linkedin className="w-3.5 h-3.5" />,
            })}
          </div>
        </SoftCard>

        {/* ───────── SECTION 4: COMPANY DETAILS (only when company) ───────── */}
        <AnimatePresence>
          {accountType === 'company' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <SoftCard className="border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{t.companySection}</p>
                </div>
                <div className="space-y-4">
                  {field('company_name', t.companyName, formData.company_name, (v) => setFormData({ ...formData, company_name: v }), {
                    icon: <Building2 className="w-3.5 h-3.5" />,
                  })}

                  {field('company_description', t.companyDescription, formData.company_description, (v) => setFormData({ ...formData, company_description: v }), {
                    textarea: true, rows: 3, icon: <FileText className="w-3.5 h-3.5" />,
                  })}

                  {field('company_address', t.companyAddress, formData.company_address, (v) => setFormData({ ...formData, company_address: v }), {
                    icon: <MapPin className="w-3.5 h-3.5" />,
                  })}

                  <div className="grid grid-cols-2 gap-3">
                    {field('cr_number', t.crNumber, formData.cr_number, (v) => setFormData({ ...formData, cr_number: v }), {
                      icon: <Hash className="w-3.5 h-3.5" />,
                    })}
                    {field('vat_number', t.vatNumber, formData.vat_number, (v) => setFormData({ ...formData, vat_number: v }), {
                      icon: <Receipt className="w-3.5 h-3.5" />,
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {field('years_of_experience', t.yearsExperience, formData.years_of_experience, (v) => setFormData({ ...formData, years_of_experience: v }), {
                      type: 'number', placeholder: '0', icon: <Calendar className="w-3.5 h-3.5" />,
                    })}
                    {field('crew_size_range', t.crewSize, formData.crew_size_range, (v) => setFormData({ ...formData, crew_size_range: v }), {
                      placeholder: '1-5', icon: <Users className="w-3.5 h-3.5" />,
                    })}
                  </div>
                </div>
              </SoftCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ───────── Actions ───────── */}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading} className="flex-1 rounded-full">
            {t.cancel}
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 rounded-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? t.saving : t.save}
          </Button>
        </div>
      </form>
    </div>
  );
};
