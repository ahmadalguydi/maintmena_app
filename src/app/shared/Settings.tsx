import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { setLanguage } from '@/lib/preferences';
import { Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import {
  Globe,
  DollarSign,
  CalendarDays,
  Bell,
  Mail,
  Megaphone,
  ChevronRight,
  Info,
  Trash2,
  Star,
  ExternalLink,
  Shield,
  Palette,
  Moon,
  Sun,
  Monitor,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsProps {
  currentLanguage: 'en' | 'ar';
  onLanguageChange?: (lang: 'en' | 'ar') => void;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const Settings = ({ currentLanguage, onLanguageChange }: SettingsProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [promotionNotifications, setPromotionNotifications] = useState(false);
  const [dateFormat, setDateFormat] = useState<'gregorian' | 'hijri'>('gregorian');
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isArabic = currentLanguage === 'ar';

  const content = {
    en: {
      title: 'Settings',
      preferences: 'Preferences',
      language: 'Language',
      currency: 'Currency',
      dateFormat: 'Date Format',
      gregorian: 'Gregorian',
      hijri: 'Hijri',
      english: 'English',
      arabic: 'العربية',
      notifications: 'Notifications',
      pushNotifs: 'Push Notifications',
      pushNotifsDesc: 'Receive instant alerts for job updates',
      emailNotifs: 'Email Notifications',
      emailNotifsDesc: 'Important updates and weekly summary',
      promoNotifs: 'Promotional',
      promoNotifsDesc: 'Tips, offers, and platform news',
      appearance: 'Appearance',
      theme: 'Theme',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
      about: 'About',
      version: 'Version',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      rateApp: 'Rate MaintMENA',
      rateAppDesc: 'Love the app? Leave a review!',
      signOut: 'Sign Out',
      signOutDesc: 'Log out of your MaintMENA account',
      dangerZone: 'Danger Zone',
      deleteAccount: 'Delete Account',
      deleteAccountDesc: 'Permanently delete your account and all data',
      deleteConfirmTitle: 'Are you sure?',
      deleteConfirmDesc: 'This action cannot be undone. All your data will be permanently removed.',
      deleteConfirmBtn: 'Yes, Delete My Account',
      deleteCancel: 'Cancel',
      saved: 'Saved',
      saveFailed: 'Failed to save',
    },
    ar: {
      title: 'الإعدادات',
      preferences: 'التفضيلات',
      language: 'اللغة',
      currency: 'العملة',
      dateFormat: 'تنسيق التاريخ',
      gregorian: 'ميلادي',
      hijri: 'هجري',
      english: 'English',
      arabic: 'العربية',
      notifications: 'الإشعارات',
      pushNotifs: 'الإشعارات الفورية',
      pushNotifsDesc: 'تلقي تنبيهات فورية لتحديثات الطلبات',
      emailNotifs: 'إشعارات البريد',
      emailNotifsDesc: 'التحديثات المهمة والملخص الأسبوعي',
      promoNotifs: 'العروض الترويجية',
      promoNotifsDesc: 'نصائح وعروض وأخبار المنصة',
      appearance: 'المظهر',
      theme: 'السمة',
      system: 'النظام',
      light: 'فاتح',
      dark: 'داكن',
      about: 'حول',
      version: 'الإصدار',
      termsOfService: 'شروط الخدمة',
      privacyPolicy: 'سياسة الخصوصية',
      rateApp: 'قيّم MaintMENA',
      rateAppDesc: 'أعجبك التطبيق؟ اترك تقييماً!',
      signOut: 'تسجيل الخروج',
      signOutDesc: 'الخروج من حساب MaintMENA',
      dangerZone: 'منطقة الخطر',
      deleteAccount: 'حذف الحساب',
      deleteAccountDesc: 'حذف حسابك وجميع بياناتك نهائياً',
      deleteConfirmTitle: 'هل أنت متأكد؟',
      deleteConfirmDesc: 'لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع بياناتك نهائياً.',
      deleteConfirmBtn: 'نعم، احذف حسابي',
      deleteCancel: 'إلغاء',
      saved: 'تم الحفظ',
      saveFailed: 'فشل الحفظ',
    },
  } as const;

  const t = content[currentLanguage];

  useEffect(() => {
    // Restore saved theme
    const saved = (localStorage.getItem('theme') as 'system' | 'light' | 'dark') || 'system';
    setTheme(saved);

    if (!user) return;

    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select(
            'preferred_currency, preferred_language, notification_settings, content_preferences',
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (!data) return;

        if (data.preferred_currency) {
          setCurrency(data.preferred_currency as 'USD' | 'SAR' | 'AED' | 'KWD');
        }

        const notifSettings = (data.notification_settings as Record<string, unknown>) || {};
        setPushNotifications((notifSettings.push_enabled as boolean) ?? true);
        setEmailNotifications((notifSettings.email_enabled as boolean) ?? true);

        const contentPrefs = (data.content_preferences as Record<string, unknown>) || {};
        setDateFormat((contentPrefs.date_format as 'gregorian' | 'hijri') || 'gregorian');
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error loading settings:', error);
      }
    };

    void loadSettings();
  }, [setCurrency, user]);

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    onLanguageChange?.(lang);
    setLanguage(lang);
    window.dispatchEvent(new CustomEvent('mm:language-change', { detail: { lang } }));
    toast.success(lang === 'ar' ? 'تم تغيير اللغة' : 'Language changed');
  };

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!user) return;
    try {
      setCurrency(newCurrency as 'USD' | 'SAR' | 'AED' | 'KWD');
      const { error } = await supabase
        .from('user_preferences')
        .update({ preferred_currency: newCurrency, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(t.saved);
    } catch {
      toast.error(t.saveFailed);
    }
  };

  const handleDateFormatChange = async (format: 'gregorian' | 'hijri') => {
    if (!user) return;
    try {
      setDateFormat(format);
      localStorage.setItem('dateFormat', format);
      let currentPrefs: Record<string, unknown> = {};
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('content_preferences')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.content_preferences) {
          currentPrefs = data.content_preferences as Record<string, unknown>;
        }
      } catch {}

      const { error } = await supabase
        .from('user_preferences')
        .update({
          content_preferences: { ...currentPrefs, date_format: format },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success(t.saved);
    } catch {
      toast.error(t.saveFailed);
    }
  };

  const handleNotificationToggle = async (type: 'push' | 'email', value: boolean) => {
    if (!user) return;
    try {
      let currentNotifs: Record<string, unknown> = {};
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('notification_settings')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.notification_settings) {
          currentNotifs = data.notification_settings as Record<string, unknown>;
        }
      } catch {}

      const updates = type === 'push' ? { push_enabled: value } : { email_enabled: value };

      const { error } = await supabase
        .from('user_preferences')
        .update({
          notification_settings: { ...currentNotifs, ...updates },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      if (type === 'push') setPushNotifications(value);
      else setEmailNotifications(value);

      toast.success(t.saved);
    } catch {
      toast.error(t.saveFailed);
    }
  };

  const handleDeleteAccount = () => {
    toast.info(
      isArabic
        ? 'تم إرسال طلب الحذف. سيتواصل معك فريق الدعم خلال 24 ساعة.'
        : 'Deletion request sent. Support will contact you within 24 hours.',
    );
    setShowDeleteConfirm(false);
  };

  const Section = ({
    icon,
    title,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => (
    <motion.div variants={fadeUp}>
      <SoftCard className="overflow-hidden">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
            {icon}
          </div>
          <Heading3 lang={currentLanguage} className="text-sm font-semibold">
            {title}
          </Heading3>
        </div>
        <div className="space-y-4">{children}</div>
      </SoftCard>
    </motion.div>
  );

  const SettingRow = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className={cn('text-sm', isArabic && 'font-ar-body')}>{label}</Label>
        {description && (
          <p className={cn('text-xs text-muted-foreground mt-0.5', isArabic && 'font-ar-body')}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <motion.div
        className="space-y-4 p-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Preferences ─── */}
        <Section icon={<Globe size={16} className="text-primary" />} title={t.preferences}>
          {/* Language pill toggle */}
          <SettingRow label={t.language}>
            <div className="flex gap-1 rounded-full border border-border p-1 bg-muted/30">
              {(['en', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    currentLanguage === lang
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {lang === 'en' ? '🇺🇸' : '🇸🇦'}{' '}
                  {lang === 'en' ? t.english : t.arabic}
                </button>
              ))}
            </div>
          </SettingRow>

          <Separator className="opacity-50" />

          <SettingRow label={t.currency}>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-28 rounded-full h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAR">🇸🇦 SAR</SelectItem>
                <SelectItem value="USD">🇺🇸 USD</SelectItem>
                <SelectItem value="AED">🇦🇪 AED</SelectItem>
                <SelectItem value="KWD">🇰🇼 KWD</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator className="opacity-50" />

          <SettingRow label={t.dateFormat}>
            <Select
              value={dateFormat}
              onValueChange={(val: 'gregorian' | 'hijri') => handleDateFormatChange(val)}
            >
              <SelectTrigger className="w-28 rounded-full h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gregorian">📅 {t.gregorian}</SelectItem>
                <SelectItem value="hijri">🌙 {t.hijri}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </Section>

        {/* ─── Appearance ─── */}
        <Section icon={<Palette size={16} className="text-primary" />} title={t.appearance}>
          <SettingRow label={t.theme}>
            <div className="flex gap-1 rounded-full border border-border p-1 bg-muted/30">
              {(
                [
                  { value: 'light', Icon: Sun },
                  { value: 'system', Icon: Monitor },
                  { value: 'dark', Icon: Moon },
                ] as const
              ).map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleThemeChange(value)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all',
                    theme === value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon size={12} />
                  {t[value]}
                </button>
              ))}
            </div>
          </SettingRow>
        </Section>

        {/* ─── Notifications ─── */}
        <Section icon={<Bell size={16} className="text-primary" />} title={t.notifications}>
          <SettingRow label={t.pushNotifs} description={t.pushNotifsDesc}>
            <Switch
              checked={pushNotifications}
              onCheckedChange={(value) => void handleNotificationToggle('push', value)}
            />
          </SettingRow>

          <Separator className="opacity-50" />

          <SettingRow label={t.emailNotifs} description={t.emailNotifsDesc}>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(value) => void handleNotificationToggle('email', value)}
            />
          </SettingRow>

          <Separator className="opacity-50" />

          <SettingRow label={t.promoNotifs} description={t.promoNotifsDesc}>
            <Switch
              checked={promotionNotifications}
              onCheckedChange={setPromotionNotifications}
            />
          </SettingRow>
        </Section>

        {/* ─── About ─── */}
        <Section icon={<Info size={16} className="text-primary" />} title={t.about}>
          <SettingRow label={t.version}>
            <Caption lang={currentLanguage} className="text-muted-foreground font-mono">
              1.0.0-beta
            </Caption>
          </SettingRow>

          <Separator className="opacity-50" />

          <button
            onClick={() => window.open('/terms', '_blank')}
            className="flex items-center justify-between w-full py-1 group"
          >
            <Label className={cn('text-sm cursor-pointer', isArabic && 'font-ar-body')}>
              {t.termsOfService}
            </Label>
            <ExternalLink
              size={14}
              className="text-muted-foreground group-hover:text-primary transition-colors"
            />
          </button>

          <Separator className="opacity-50" />

          <button
            onClick={() => window.open('/privacy', '_blank')}
            className="flex items-center justify-between w-full py-1 group"
          >
            <Label className={cn('text-sm cursor-pointer', isArabic && 'font-ar-body')}>
              {t.privacyPolicy}
            </Label>
            <ExternalLink
              size={14}
              className="text-muted-foreground group-hover:text-primary transition-colors"
            />
          </button>

          <Separator className="opacity-50" />

          <button
            className="flex items-center justify-between w-full py-1 group"
            onClick={() =>
              toast.info(isArabic ? 'سيتم فتح متجر التطبيقات' : 'Would open app store')
            }
          >
            <div>
              <Label className={cn('text-sm cursor-pointer', isArabic && 'font-ar-body')}>
                {t.rateApp}
              </Label>
              <p className={cn('text-xs text-muted-foreground mt-0.5', isArabic && 'font-ar-body')}>
                {t.rateAppDesc}
              </p>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={12} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
          </button>
        </Section>

        {/* ─── Sign Out ─── */}
        <motion.div variants={fadeUp}>
          <SoftCard>
            <button
              type="button"
              onClick={() => void signOut(currentLanguage)}
              className="flex items-center justify-between w-full py-1 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                  <LogOut size={16} className="text-rose-500" />
                </div>
                <div>
                  <p className={cn('text-sm font-medium text-rose-600', isArabic && 'font-ar-body')}>
                    {t.signOut}
                  </p>
                  <p className={cn('text-xs text-muted-foreground mt-0.5', isArabic && 'font-ar-body')}>
                    {t.signOutDesc}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={16}
                className={cn('text-rose-400/50 group-hover:text-rose-400 transition-colors', isArabic && 'rotate-180')}
              />
            </button>
          </SoftCard>
        </motion.div>

        {/* ─── Danger Zone ─── */}
        <motion.div variants={fadeUp}>
          <SoftCard className="border-destructive/20 bg-destructive/3">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-destructive/8 flex items-center justify-center">
                <Shield size={16} className="text-destructive" />
              </div>
              <Heading3
                lang={currentLanguage}
                className="text-sm font-semibold text-destructive"
              >
                {t.dangerZone}
              </Heading3>
            </div>

            <AnimatePresence mode="wait">
              {showDeleteConfirm ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <Body
                      lang={currentLanguage}
                      className="text-sm font-semibold text-destructive mb-1"
                    >
                      {t.deleteConfirmTitle}
                    </Body>
                    <BodySmall lang={currentLanguage} className="text-muted-foreground">
                      {t.deleteConfirmDesc}
                    </BodySmall>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      {t.deleteCancel}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 size={14} className={isArabic ? 'ml-1.5' : 'mr-1.5'} />
                      {t.deleteConfirmBtn}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-between w-full py-1 group"
                  >
                    <div>
                      <Label
                        className={cn(
                          'text-sm cursor-pointer text-destructive',
                          isArabic && 'font-ar-body',
                        )}
                      >
                        {t.deleteAccount}
                      </Label>
                      <p
                        className={cn(
                          'text-xs text-muted-foreground mt-0.5',
                          isArabic && 'font-ar-body',
                        )}
                      >
                        {t.deleteAccountDesc}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={cn('text-destructive/50', isArabic && 'rotate-180')}
                    />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </SoftCard>
        </motion.div>
      </motion.div>
    </div>
  );
};
