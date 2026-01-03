import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Shield, LogOut, CreditCard, Bell, Key, Eye, EyeOff, MapPin, Zap, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { SubscriptionManagementModal } from '@/components/SubscriptionManagementModal';
import { SignatureModal } from '@/components/SignatureModal';
import { getHomeCategories, getProjectCategories } from '@/lib/serviceCategories';
interface SettingsProps {
  currentLanguage: 'en' | 'ar';
}
const Settings = ({
  currentLanguage
}: SettingsProps) => {
  const navigate = useNavigate();
  const {
    user,
    signOut,
    userType
  } = useAuth();
  const {
    subscription,
    loading: subLoading,
    updateSubscriptionTier,
    cancelSubscription: cancelSub
  } = useSubscription();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    company_name: '',
    company_description: '',
    bio: '',
    phone: '',
    years_of_experience: 0,
    specializations: [] as string[],
    certifications: [] as string[],
    portfolio_items: [] as any[],
    website_url: '',
    linkedin_url: '',
    show_past_work: true,
    service_focus: ['both'] as string[],
    crew_size_range: '',
    discoverable: true,
    service_categories: [] as string[],
    service_radius_km: 50,
    instant_booking_enabled: false,
    availability_status: 'accepting_requests',
    user_type: '',
    buyer_type: '',
    signature_data: null as any
  });
  const [notifications, setNotifications] = useState({
    email_updates: true,
    weekly_digest: true,
    tender_alerts: true
  });
  const [pwdForm, setPwdForm] = useState({
    password: '',
    confirm: ''
  });
  const [changingPwd, setChangingPwd] = useState(false);
  const passwordSchema = z.object({
    password: z.string().min(8, {
      message: currentLanguage === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters'
    }),
    confirm: z.string()
  }).refine(data => data.password === data.confirm, {
    message: currentLanguage === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match',
    path: ['confirm']
  });
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAuthEmail(user.email || '');
    loadProfile();
  }, [user, navigate]);

  // Track unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  const ensureProfileExists = async () => {
    if (!user) return null;
    const {
      data,
      error
    } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? user.email,
      user_type: userType ?? null,
      discoverable: true,
      show_past_work: true,
      service_radius_km: 50
    }, {
      onConflict: 'id'
    }).select().single();
    if (error) {
      console.error('Error ensuring profile exists:', error);
      return null;
    }
    return data;
  };
  const loadProfile = async () => {
    try {
      let {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle();

      // If no profile exists, create one
      if (!data && !error) {
        data = await ensureProfileExists();
        if (!data) {
          toast({
            title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
            description: currentLanguage === 'ar' ? 'فشل إنشاء الملف الشخصي' : 'Failed to create profile',
            variant: 'destructive'
          });
          return;
        }
        toast({
          title: currentLanguage === 'ar' ? 'تم إنشاء الملف الشخصي' : 'Profile Created',
          description: currentLanguage === 'ar' ? 'تم إنشاء ملفك الشخصي. يمكنك الآن إكمال التفاصيل.' : 'We created your profile record. You can now complete your details.'
        });
      } else if (error) {
        throw error;
      }
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          company_name: data.company_name || '',
          company_description: data.company_description || '',
          bio: data.bio || '',
          phone: data.phone || '',
          years_of_experience: data.years_of_experience || 0,
          specializations: data.specializations || [],
          certifications: data.certifications || [],
          portfolio_items: data.portfolio_items as any || [],
          website_url: data.website_url || '',
          linkedin_url: data.linkedin_url || '',
          show_past_work: data.show_past_work !== false,
          service_focus: data.service_focus || ['both'],
          crew_size_range: data.crew_size_range || '',
          discoverable: data.discoverable !== false,
          service_categories: data.service_categories || [],
          service_radius_km: data.service_radius_km || 50,
          instant_booking_enabled: data.instant_booking_enabled || false,
          availability_status: data.availability_status || 'accepting_requests',
          user_type: data.user_type || '',
          buyer_type: data.buyer_type || '',
          signature_data: data.signature_data || null
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (!user) return;

      // Validate required fields for sellers
      if (userType === 'seller' && !profile.company_name?.trim()) {
        toast({
          title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
          description: currentLanguage === 'ar' ? 'اسم الشركة مطلوب' : 'Company name is required',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }
      const updateData: any = {
        id: user.id,
        full_name: profile.full_name,
        user_type: userType || profile.user_type
      };

      // Only add seller-specific fields if user is a seller
      if (userType === 'seller') {
        updateData.company_name = profile.company_name;
        updateData.company_description = profile.company_description;
        updateData.bio = profile.bio;
        updateData.phone = profile.phone;
        updateData.years_of_experience = profile.years_of_experience;
        updateData.specializations = profile.specializations;
        updateData.certifications = profile.certifications;
        updateData.portfolio_items = profile.portfolio_items;
        updateData.website_url = profile.website_url;
        updateData.linkedin_url = profile.linkedin_url;
        updateData.show_past_work = profile.show_past_work;
        updateData.service_focus = profile.service_focus;
        updateData.crew_size_range = profile.crew_size_range;
        updateData.discoverable = profile.discoverable;
        updateData.service_categories = profile.service_categories;
        updateData.service_radius_km = profile.service_radius_km;
        updateData.instant_booking_enabled = profile.instant_booking_enabled;
        updateData.availability_status = profile.availability_status;
      }
      const {
        data,
        error
      } = await supabase.from('profiles').upsert(updateData).select().single();
      if (error) {
        // Handle specific RLS policy violations
        if (error.code === '42501') {
          toast({
            title: currentLanguage === 'ar' ? 'خطأ في الصلاحيات' : 'Permission Error',
            description: currentLanguage === 'ar' ? 'ليس لديك صلاحية لتحديث هذا الملف الشخصي. يرجى التواصل مع الدعم.' : 'You do not have permission to update this profile. Please contact support.',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        return;
      }

      // Verify the upsert returned data
      if (!data) {
        toast({
          title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
          description: currentLanguage === 'ar' ? 'فشل حفظ الملف الشخصي. حاول مرة أخرى.' : 'Failed to save profile. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      // Reload profile to verify changes persisted
      await loadProfile();
      setHasUnsavedChanges(false);
      toast({
        title: currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved',
        description: currentLanguage === 'ar' ? 'تم تحديث معلومات الحساب بنجاح' : 'Profile updated successfully'
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (currentLanguage === 'ar' ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const handleChangePassword = async () => {
    try {
      const parsed = passwordSchema.parse(pwdForm);
      setChangingPwd(true);
      const {
        error
      } = await supabase.auth.updateUser({
        password: parsed.password
      });
      if (error) throw error;
      setPwdForm({
        password: '',
        confirm: ''
      });
      toast({
        title: currentLanguage === 'ar' ? 'تم التحديث' : 'Updated',
        description: currentLanguage === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password updated successfully'
      });
    } catch (err: any) {
      const message = err?.errors?.[0]?.message || (currentLanguage === 'ar' ? 'فشل تحديث كلمة المرور' : 'Failed to update password');
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setChangingPwd(false);
    }
  };
  const handleUpgrade = async (tier: SubscriptionTier) => {
    const {
      error
    } = await updateSubscriptionTier(tier);
    if (error) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل تحديث الخطة' : 'Failed to update plan',
        variant: 'destructive'
      });
    } else {
      toast({
        title: currentLanguage === 'ar' ? 'نجح!' : 'Success!',
        description: currentLanguage === 'ar' ? 'تم تحديث خطتك بنجاح' : 'Plan updated successfully'
      });
    }
  };
  const handleDowngrade = async (tier: SubscriptionTier) => {
    const {
      error
    } = await updateSubscriptionTier(tier);
    if (error) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل تحديث الخطة' : 'Failed to update plan',
        variant: 'destructive'
      });
    } else {
      toast({
        title: currentLanguage === 'ar' ? 'نجح!' : 'Success!',
        description: currentLanguage === 'ar' ? 'سيتم تخفيض خطتك في نهاية الفترة' : 'Plan will be downgraded at period end'
      });
    }
  };
  const handleCancelSubscription = async () => {
    const {
      error
    } = await cancelSub();
    if (error) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل إلغاء الاشتراك' : 'Failed to cancel subscription',
        variant: 'destructive'
      });
    } else {
      toast({
        title: currentLanguage === 'ar' ? 'تم الإلغاء' : 'Cancelled',
        description: currentLanguage === 'ar' ? 'تم إلغاء اشتراكك' : 'Your subscription has been cancelled'
      });
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(currentLanguage === 'ar' ? 'ar' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  const content = {
    en: {
      title: 'Account Settings',
      subtitle: 'Manage your account preferences and subscription',
      profile: 'Profile Information',
      profileDesc: 'Update your personal details',
      fullName: 'Full Name',
      email: 'Email Address',
      save: 'Save Changes',
      subscription: 'Subscription',
      subscriptionDesc: 'Manage your subscription plan',
      currentPlan: 'Current Plan',
      status: 'Status',
      trialEnds: 'Trial Ends',
      subEnds: 'Subscription Ends',
      managePlan: 'Manage Plan',
      notifications: 'Notifications',
      notificationsDesc: 'Control your email preferences',
      emailUpdates: 'Email Updates',
      emailUpdatesDesc: 'Receive updates about new features',
      weeklyDigest: 'Weekly Digest',
      weeklyDigestDesc: 'Get a summary of the week',
      tenderAlerts: 'Tender Alerts',
      tenderAlertsDesc: 'Get notified about new tenders',
      security: 'Security',
      securityDesc: 'Manage your account security',
      changePassword: 'Change Password',
      signOut: 'Sign Out',
      signOutDesc: 'Sign out from your account'
    },
    ar: {
      title: 'إعدادات الحساب',
      subtitle: 'إدارة تفضيلات حسابك واشتراكك',
      profile: 'معلومات الملف الشخصي',
      profileDesc: 'تحديث تفاصيلك الشخصية',
      fullName: 'الاسم الكامل',
      email: 'البريد الإلكتروني',
      save: 'حفظ التغييرات',
      subscription: 'الاشتراك',
      subscriptionDesc: 'إدارة خطة اشتراكك',
      currentPlan: 'الخطة الحالية',
      status: 'الحالة',
      trialEnds: 'تنتهي الفترة التجريبية',
      subEnds: 'ينتهي الاشتراك',
      managePlan: 'إدارة الخطة',
      notifications: 'الإشعارات',
      notificationsDesc: 'التحكم في تفضيلات البريد الإلكتروني',
      emailUpdates: 'تحديثات البريد الإلكتروني',
      emailUpdatesDesc: 'تلقي تحديثات حول الميزات الجديدة',
      weeklyDigest: 'ملخص أسبوعي',
      weeklyDigestDesc: 'احصل على ملخص الأسبوع',
      tenderAlerts: 'تنبيهات العطاءات',
      tenderAlertsDesc: 'احصل على إشعارات حول العطاءات الجديدة',
      security: 'الأمان',
      securityDesc: 'إدارة أمان حسابك',
      changePassword: 'تغيير كلمة المرور',
      signOut: 'تسجيل الخروج',
      signOutDesc: 'تسجيل الخروج من حسابك'
    }
  };
  const t = content[currentLanguage];
  if (loading || subLoading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>;
  }
  return <div className="min-h-screen bg-paper py-16 px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mb-8">
          <h1 className="text-headline-1 text-ink mb-2">{t.title}</h1>
          <p className="text-dek">{t.subtitle}</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Information */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }}>
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="text-accent" size={24} />
                  <div>
                    <CardTitle className="px-[10px]">{t.profile}</CardTitle>
                    <CardDescription className="px-[10px]">{t.profileDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t.fullName}</Label>
                  <Input id="fullName" value={profile.full_name} onChange={e => {
                  setProfile({
                    ...profile,
                    full_name: e.target.value
                  });
                  setHasUnsavedChanges(true);
                }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authEmail">{currentLanguage === 'ar' ? 'البريد الإلكتروني للحساب' : 'Account Email'}</Label>
                  <Input id="authEmail" type="email" value={authEmail} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    {currentLanguage === 'ar' ? 'البريد الإلكتروني لتسجيل الدخول (للقراءة فقط). لتغيير بريدك الإلكتروني، استخدم القسم أدناه.' : 'Login email (read-only). To change your login email, use the section below.'}
                  </p>
                </div>

                {/* Change Login Email Section */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {currentLanguage === 'ar' ? 'تغيير البريد الإلكتروني' : 'Change Login Email'}
                    </CardTitle>
                    <CardDescription>
                      {currentLanguage === 'ar' ? 'قم بتحديث بريدك الإلكتروني. ستتلقى رسالة تأكيد على العنوان الجديد.' : 'Update your login email. You will receive a confirmation email at the new address.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={async e => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newEmail = formData.get('newEmail') as string;
                    if (!newEmail || !newEmail.includes('@')) {
                      toast({
                        title: currentLanguage === 'ar' ? 'بريد إلكتروني غير صالح' : 'Invalid Email',
                        description: currentLanguage === 'ar' ? 'يرجى إدخال عنوان بريد إلكتروني صالح' : 'Please enter a valid email address',
                        variant: 'destructive'
                      });
                      return;
                    }
                    try {
                      const {
                        error: authError
                      } = await supabase.auth.updateUser({
                        email: newEmail
                      });
                      if (authError) throw authError;

                      // Update profile email for consistency
                      if (user) {
                        await supabase.from('profiles').update({
                          email: newEmail
                        }).eq('id', user.id);
                      }
                      toast({
                        title: currentLanguage === 'ar' ? 'تم إرسال بريد التأكيد' : 'Confirmation Email Sent',
                        description: currentLanguage === 'ar' ? 'تحقق من بريدك الإلكتروني الجديد وانقر على رابط التأكيد لإكمال التغيير.' : 'Check your new email and click the confirmation link to complete the change.'
                      });
                      (e.target as HTMLFormElement).reset();
                    } catch (error) {
                      console.error('Error updating email:', error);
                      toast({
                        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
                        description: currentLanguage === 'ar' ? 'فشل تحديث البريد الإلكتروني. حاول مرة أخرى.' : 'Failed to update email. Please try again.',
                        variant: 'destructive'
                      });
                    }
                  }} className="space-y-4">
                      <div>
                        <Label htmlFor="newEmail">
                          {currentLanguage === 'ar' ? 'عنوان البريد الإلكتروني الجديد' : 'New Email Address'}
                        </Label>
                        <Input id="newEmail" name="newEmail" type="email" placeholder={currentLanguage === 'ar' ? 'بريد.جديد@مثال.com' : 'new.email@example.com'} required />
                      </div>
                      <Button type="submit" variant="outline">
                        {currentLanguage === 'ar' ? 'تحديث البريد الإلكتروني' : 'Update Email'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                {userType === 'seller' && <>
                    <div className="space-y-2">
                      <Label htmlFor="company">{currentLanguage === 'ar' ? 'اسم الشركة' : 'Company Name'}</Label>
                      <Input id="company" value={profile.company_name} onChange={e => {
                    setProfile({
                      ...profile,
                      company_name: e.target.value
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">{currentLanguage === 'ar' ? 'السيرة الذاتية' : 'Bio'}</Label>
                      <Textarea id="bio" rows={3} value={profile.bio} onChange={e => {
                    setProfile({
                      ...profile,
                      bio: e.target.value
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{currentLanguage === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
                      <Input id="phone" value={profile.phone} onChange={e => {
                    setProfile({
                      ...profile,
                      phone: e.target.value
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">{currentLanguage === 'ar' ? 'سنوات الخبرة' : 'Years of Experience'}</Label>
                      <Input id="experience" type="number" value={profile.years_of_experience} onChange={e => {
                    setProfile({
                      ...profile,
                      years_of_experience: parseInt(e.target.value) || 0
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">{currentLanguage === 'ar' ? 'الموقع الإلكتروني' : 'Website URL'}</Label>
                      <Input id="website" type="url" value={profile.website_url} onChange={e => {
                    setProfile({
                      ...profile,
                      website_url: e.target.value
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">{currentLanguage === 'ar' ? 'لينكد إن' : 'LinkedIn URL'}</Label>
                      <Input id="linkedin" type="url" value={profile.linkedin_url} onChange={e => {
                    setProfile({
                      ...profile,
                      linkedin_url: e.target.value
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{currentLanguage === 'ar' ? 'إظهار الأعمال السابقة' : 'Show Past Work'}</Label>
                        <p className="text-sm text-muted-foreground">
                          {currentLanguage === 'ar' ? 'السماح للمشترين برؤية محفظة أعمالك' : 'Allow buyers to see your portfolio'}
                        </p>
                      </div>
                      <Switch checked={profile.show_past_work} onCheckedChange={checked => {
                    setProfile({
                      ...profile,
                      show_past_work: checked
                    });
                    setHasUnsavedChanges(true);
                  }} />
                    </div>
                    
                    {/* Service Focus */}
                    <div className="space-y-3">
                      <Label>{currentLanguage === 'ar' ? 'تركيز الخدمة' : 'Service Focus'}</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        {currentLanguage === 'ar' ? 'اختر نوع الخدمات التي تقدمها' : 'Select the type of services you provide'}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profile.service_focus?.includes('home') || false} onChange={e => {
                        const newFocus = [...(profile.service_focus || ['both'])];
                        if (e.target.checked) {
                          if (!newFocus.includes('home')) newFocus.push('home');
                        } else {
                          const idx = newFocus.indexOf('home');
                          if (idx > -1) newFocus.splice(idx, 1);
                        }
                        setProfile({
                          ...profile,
                          service_focus: newFocus.length ? newFocus : ['both']
                        });
                        setHasUnsavedChanges(true);
                      }} className="rounded border-gray-300" />
                          🏠 {currentLanguage === 'ar' ? 'خدمات منزلية' : 'Home Services'}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profile.service_focus?.includes('project') || false} onChange={e => {
                        const newFocus = [...(profile.service_focus || ['both'])];
                        if (e.target.checked) {
                          if (!newFocus.includes('project')) newFocus.push('project');
                        } else {
                          const idx = newFocus.indexOf('project');
                          if (idx > -1) newFocus.splice(idx, 1);
                        }
                        setProfile({
                          ...profile,
                          service_focus: newFocus.length ? newFocus : ['both']
                        });
                        setHasUnsavedChanges(true);
                      }} className="rounded border-gray-300" />
                          🏗️ {currentLanguage === 'ar' ? 'مشاريع' : 'Project Work'}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={profile.service_focus?.includes('both') || false} onChange={e => {
                        const newFocus = [...(profile.service_focus || ['both'])];
                        if (e.target.checked) {
                          if (!newFocus.includes('both')) newFocus.push('both');
                        } else {
                          const idx = newFocus.indexOf('both');
                          if (idx > -1) newFocus.splice(idx, 1);
                        }
                        setProfile({
                          ...profile,
                          service_focus: newFocus.length ? newFocus : ['both']
                        });
                        setHasUnsavedChanges(true);
                      }} className="rounded border-gray-300" />
                          {currentLanguage === 'ar' ? 'كلاهما' : 'Both'}
                        </label>
                      </div>
                    </div>

                    {/* Crew Size */}
                    <div className="space-y-2">
                      <Label htmlFor="crew_size">{currentLanguage === 'ar' ? 'حجم الفريق' : 'Crew Size Range'}</Label>
                      <Select value={profile.crew_size_range || ''} onValueChange={value => {
                    setProfile({
                      ...profile,
                      crew_size_range: value
                    });
                    setHasUnsavedChanges(true);
                  }}>
                        <SelectTrigger>
                          <SelectValue placeholder={currentLanguage === 'ar' ? 'اختر حجم الفريق' : 'Select crew size'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solo">{currentLanguage === 'ar' ? 'فردي / Solo' : 'Solo / Individual'}</SelectItem>
                          <SelectItem value="2-4">2-4</SelectItem>
                          <SelectItem value="5-10">5-10</SelectItem>
                          <SelectItem value="10+">10+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>}
                <Button onClick={handleSaveProfile} disabled={saving || !hasUnsavedChanges}>
                  {saving ? currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...' : t.save}
                  {hasUnsavedChanges && !saving && ' *'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Seller Visibility Settings - Only for sellers */}
          {userType === 'seller' && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.15
        }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Eye className="text-accent" size={24} />
                    <div>
                      <CardTitle>{currentLanguage === 'ar' ? 'إعدادات الظهور' : 'Visibility Settings'}</CardTitle>
                      <CardDescription>
                        {currentLanguage === 'ar' ? 'تحكم في ظهورك في صفحة الاستكشاف وإعدادات الحجز' : 'Control your visibility in Explore and booking settings'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Discoverable Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        {profile.discoverable ? <Eye size={16} /> : <EyeOff size={16} />}
                        {currentLanguage === 'ar' ? 'إظهار الملف الشخصي' : 'Show Profile in Explore'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {currentLanguage === 'ar' ? 'اجعل ملفك الشخصي مرئيًا للمشترين في صفحة الاستكشاف' : 'Make your profile visible to buyers in the Explore page'}
                      </p>
                    </div>
                    <Switch checked={profile.discoverable} onCheckedChange={checked => {
                  setProfile({
                    ...profile,
                    discoverable: checked
                  });
                  setHasUnsavedChanges(true);
                }} />
                  </div>

                  <Separator />

                  {/* Availability Status */}
                  <div className="space-y-2">
                    <Label>{currentLanguage === 'ar' ? 'حالة التوفر' : 'Availability Status'}</Label>
                    <Select value={profile.availability_status} onValueChange={value => {
                  setProfile({
                    ...profile,
                    availability_status: value
                  });
                  setHasUnsavedChanges(true);
                }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accepting_requests">
                          ✅ {currentLanguage === 'ar' ? 'قبول الطلبات' : 'Accepting Requests'}
                        </SelectItem>
                        <SelectItem value="busy">
                          ⏳ {currentLanguage === 'ar' ? 'مشغول' : 'Busy'}
                        </SelectItem>
                        <SelectItem value="not_available">
                          ⛔ {currentLanguage === 'ar' ? 'غير متاح' : 'Not Available'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {currentLanguage === 'ar' ? 'اجعل المشترين يعرفون مدى توفرك الحالي' : 'Let buyers know your current availability'}
                    </p>
                  </div>

                  <Separator />

                  {/* Instant Booking */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Zap size={16} />
                        {currentLanguage === 'ar' ? 'الحجز الفوري' : 'Instant Booking'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {currentLanguage === 'ar' ? 'السماح للمشترين بحجز خدماتك على الفور دون موافقة يدوية' : 'Allow buyers to book your services instantly without manual approval'}
                      </p>
                    </div>
                    <Switch checked={profile.instant_booking_enabled} onCheckedChange={checked => {
                  setProfile({
                    ...profile,
                    instant_booking_enabled: checked
                  });
                  setHasUnsavedChanges(true);
                }} />
                  </div>

                  <Separator />

                  {/* Service Radius */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin size={16} />
                      {currentLanguage === 'ar' ? 'نطاق الخدمة (كم)' : 'Service Radius (km)'}
                    </Label>
                    <Input type="number" min="1" max="500" value={profile.service_radius_km} onChange={e => {
                  setProfile({
                    ...profile,
                    service_radius_km: parseInt(e.target.value) || 50
                  });
                  setHasUnsavedChanges(true);
                }} />
                    <p className="text-sm text-muted-foreground">
                      {currentLanguage === 'ar' ? 'المسافة القصوى التي ترغب في السفر لها للوظائف' : 'Maximum distance you\'re willing to travel for jobs'}
                    </p>
                  </div>

                  <Separator />

                  {/* Service Categories */}
                  <div className="space-y-4">
                    <div>
                      <Label>{currentLanguage === 'ar' ? 'فئات الخدمة' : 'Service Categories'}</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentLanguage === 'ar' ? 'اختر الخدمات التي تقدمها لتظهر في نتائج البحث المناسبة' : 'Select services you offer to appear in relevant search results'}
                      </p>
                      {profile.service_categories?.length === 0 && <p className="text-sm text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                          <span>⚠️</span>
                          {currentLanguage === 'ar' ? 'يجب اختيار فئة خدمة واحدة على الأقل لتلقي طلبات الحجز' : 'You must select at least one service category to receive booking requests'}
                        </p>}
                    </div>

                    {/* Home Services */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <span>🏠</span>
                        {currentLanguage === 'ar' ? 'خدمات المنازل' : 'Home Services'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {getHomeCategories().map(category => <label key={category.key} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                            <input type="checkbox" checked={profile.service_categories?.includes(category.key) || false} onChange={e => {
                        const newCategories = [...(profile.service_categories || [])];
                        if (e.target.checked) {
                          if (!newCategories.includes(category.key)) newCategories.push(category.key);
                        } else {
                          const idx = newCategories.indexOf(category.key);
                          if (idx > -1) newCategories.splice(idx, 1);
                        }
                        setProfile({
                          ...profile,
                          service_categories: newCategories
                        });
                        setHasUnsavedChanges(true);
                      }} className="rounded border-border" />
                            <span className="text-sm flex items-center gap-1">
                              <span>{category.icon}</span>
                              <span>{currentLanguage === 'ar' ? category.ar : category.en}</span>
                            </span>
                          </label>)}
                      </div>
                    </div>

                    {/* Project Services */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <span>🏗️</span>
                        {currentLanguage === 'ar' ? 'خدمات المشاريع' : 'Project Services'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {getProjectCategories().map(category => <label key={category.key} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
                            <input type="checkbox" checked={profile.service_categories?.includes(category.key) || false} onChange={e => {
                        const newCategories = [...(profile.service_categories || [])];
                        if (e.target.checked) {
                          if (!newCategories.includes(category.key)) newCategories.push(category.key);
                        } else {
                          const idx = newCategories.indexOf(category.key);
                          if (idx > -1) newCategories.splice(idx, 1);
                        }
                        setProfile({
                          ...profile,
                          service_categories: newCategories
                        });
                        setHasUnsavedChanges(true);
                      }} className="rounded border-border" />
                            <span className="text-sm flex items-center gap-1">
                              <span>{category.icon}</span>
                              <span>{currentLanguage === 'ar' ? category.ar : category.en}</span>
                            </span>
                          </label>)}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {profile.service_categories?.length || 0} {currentLanguage === 'ar' ? 'فئات محددة' : 'categories selected'}
                    </p>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={saving || !hasUnsavedChanges} className="w-full">
                    {saving ? currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...' : t.save}
                    {hasUnsavedChanges && !saving && ' *'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>}

          {/* Subscription - Only show for non-buyers */}
          {userType !== 'buyer' && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="text-accent" size={24} />
                    <div>
                      <CardTitle>{t.subscription}</CardTitle>
                      <CardDescription>{t.subscriptionDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.currentPlan}</p>
                      <p className="text-lg font-semibold capitalize">{subscription?.tier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t.status}</p>
                      <p className="text-lg font-semibold capitalize">{subscription?.status}</p>
                    </div>
                  </div>
                  {subscription?.trial_ends_at && <div>
                      <p className="text-sm text-muted-foreground">{t.trialEnds}</p>
                      <p className="font-medium">{formatDate(subscription.trial_ends_at)}</p>
                    </div>}
                  {subscription?.subscription_ends_at && <div>
                      <p className="text-sm text-muted-foreground">{t.subEnds}</p>
                      <p className="font-medium">{formatDate(subscription.subscription_ends_at)}</p>
                    </div>}
                  <Button variant="outline" onClick={() => setIsSubModalOpen(true)}>
                    {t.managePlan}
                  </Button>
                </CardContent>
            </Card>
          </motion.div>}

          {/* Legal Signature */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.25
        }} className="px-[5px]">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <PenTool className="text-accent" size={24} />
                  <div>
                    <CardTitle className="px-[10px] py-0">{currentLanguage === 'ar' ? 'التوقيع القانوني' : 'Legal Signature'}</CardTitle>
                    <CardDescription className="px-[10px] py-[8px]">
                      {currentLanguage === 'ar' ? 'إدارة توقيعك الإلكتروني للعقود' : 'Manage your electronic signature for contracts'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.signature_data ? <div className="space-y-3">
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <img src={profile.signature_data.data} alt="Your signature" className="max-h-20 max-w-full" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentLanguage === 'ar' ? 'تم إنشاء التوقيع' : 'Signature created'}: {new Date(profile.signature_data.created_at).toLocaleDateString()}
                    </p>
                    <Button variant="outline" onClick={() => setIsSignatureModalOpen(true)} className="w-full">
                      {currentLanguage === 'ar' ? 'تحديث التوقيع' : 'Update Signature'}
                    </Button>
                  </div> : <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      {currentLanguage === 'ar' ? 'لم يتم إنشاء توقيع بعد' : 'No signature created yet'}
                    </p>
                    <Button onClick={() => setIsSignatureModalOpen(true)}>
                      {currentLanguage === 'ar' ? 'إنشاء التوقيع' : 'Create Signature'}
                    </Button>
                  </div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.35
        }}>
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="text-accent" size={24} />
                  <div>
                    <CardTitle>{t.notifications}</CardTitle>
                    <CardDescription className="py-[3px]">{t.notificationsDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.emailUpdates}</Label>
                    <p className="text-sm text-muted-foreground">{t.emailUpdatesDesc}</p>
                  </div>
                  <Switch checked={notifications.email_updates} onCheckedChange={checked => setNotifications({
                  ...notifications,
                  email_updates: checked
                })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.weeklyDigest}</Label>
                    <p className="text-sm text-muted-foreground">{t.weeklyDigestDesc}</p>
                  </div>
                  <Switch checked={notifications.weekly_digest} onCheckedChange={checked => setNotifications({
                  ...notifications,
                  weekly_digest: checked
                })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t.tenderAlerts}</Label>
                    <p className="text-sm text-muted-foreground">{t.tenderAlertsDesc}</p>
                  </div>
                  <Switch checked={notifications.tender_alerts} onCheckedChange={checked => setNotifications({
                  ...notifications,
                  tender_alerts: checked
                })} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.45
        }}>
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="text-accent" size={24} />
                  <div>
                    <CardTitle>{t.security}</CardTitle>
                    <CardDescription>{t.securityDesc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="newPassword">{t.changePassword}</Label>
                  <Input id="newPassword" type="password" value={pwdForm.password} onChange={e => setPwdForm({
                  ...pwdForm,
                  password: e.target.value
                })} placeholder={currentLanguage === 'ar' ? 'كلمة مرور جديدة' : 'New password'} />
                  <Input id="confirmPassword" type="password" value={pwdForm.confirm} onChange={e => setPwdForm({
                  ...pwdForm,
                  confirm: e.target.value
                })} placeholder={currentLanguage === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} />
                  <Button variant="outline" className="w-full justify-start" onClick={handleChangePassword} disabled={changingPwd}>
                    <Key className="mr-2" size={16} />
                    {changingPwd ? currentLanguage === 'ar' ? 'جاري التحديث...' : 'Updating...' : currentLanguage === 'ar' ? 'تحديث كلمة المرور' : 'Update Password'}
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t.signOutDesc}</p>
                  <Button variant="destructive" onClick={handleSignOut} className="w-full justify-start">
                    <LogOut className="mr-2" size={16} />
                    {t.signOut}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} currentTier={subscription?.tier as SubscriptionTier || 'free'} onUpgrade={handleUpgrade} onDowngrade={handleDowngrade} onCancel={handleCancelSubscription} currentLanguage={currentLanguage} />

      {/* Signature Modal */}
      <SignatureModal open={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={async signatureData => {
      if (!user) return;
      const {
        error
      } = await supabase.from('profiles').update({
        signature_data: {
          ...signatureData,
          created_at: new Date().toISOString()
        }
      }).eq('id', user.id);
      if (!error) {
        toast({
          title: currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved',
          description: currentLanguage === 'ar' ? 'تم حفظ توقيعك' : 'Your signature has been saved'
        });
        loadProfile();
        setIsSignatureModalOpen(false);
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    }} currentLanguage={currentLanguage} defaultName={profile.full_name} />
    </div>;
};
export default Settings;