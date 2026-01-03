import { useState, useEffect } from 'react';
import { SoftCard } from '@/components/mobile/SoftCard';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PenTool, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsProps {
  currentLanguage: 'en' | 'ar';
  onLanguageChange?: (lang: 'en' | 'ar') => void;
}

export const Settings = ({ currentLanguage, onLanguageChange }: SettingsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dateFormat, setDateFormat] = useState<'gregorian' | 'hijri'>('gregorian');
  const [loading, setLoading] = useState(true);

  const content = {
    en: {
      title: 'Settings',
      language: 'Language',
      currency: 'Currency',
      dateFormat: 'Date Format',
      gregorian: 'Gregorian',
      hijri: 'Hijri',
      notifications: 'Push Notifications',
      emailNotifs: 'Email Notifications',
      appearance: 'Appearance',
      privacy: 'Privacy',
      signature: 'Signature',
      manageSignature: 'Manage your digital signature',
      english: 'English',
      arabic: 'العربية'
    },
    ar: {
      title: 'الإعدادات',
      language: 'اللغة',
      currency: 'العملة',
      dateFormat: 'تنسيق التاريخ',
      gregorian: 'ميلادي',
      hijri: 'هجري',
      notifications: 'الإشعارات الفورية',
      emailNotifs: 'إشعارات البريد',
      appearance: 'المظهر',
      privacy: 'الخصوصية',
      signature: 'التوقيع',
      manageSignature: 'إدارة توقيعك الرقمي',
      english: 'English',
      arabic: 'العربية'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency, push_notifications_enabled, email_notifications_enabled, preferred_date_format')
        .eq('id', user.id)
        .single();

      if (data) {
        if (data.preferred_currency) {
          setCurrency(data.preferred_currency as 'USD' | 'SAR' | 'AED' | 'KWD');
        }
        setPushNotifications(data.push_notifications_enabled ?? true);
        setEmailNotifications(data.email_notifications_enabled ?? true);
        setDateFormat((data.preferred_date_format as 'gregorian' | 'hijri') || 'gregorian');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setLoading(false);
  };

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
    localStorage.setItem('preferredLanguage', lang);
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!user) return;

    try {
      setCurrency(newCurrency as 'USD' | 'SAR' | 'AED' | 'KWD');

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_currency: newCurrency,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved');
    } catch (error) {
      console.error('Error saving currency:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  const handleDateFormatChange = async (format: 'gregorian' | 'hijri') => {
    if (!user) return;

    try {
      setDateFormat(format);
      localStorage.setItem('dateFormat', format);

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_date_format: format,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved');
    } catch (error) {
      console.error('Error saving date format:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  const handleNotificationToggle = async (type: 'push' | 'email', value: boolean) => {
    if (!user) return;

    try {
      const updates = type === 'push'
        ? { push_notifications_enabled: value }
        : { email_notifications_enabled: value };

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      if (type === 'push') {
        setPushNotifications(value);
      } else {
        setEmailNotifications(value);
      }

      toast.success(currentLanguage === 'ar' ? 'تم الحفظ' : 'Saved');
    } catch (error) {
      console.error('Error saving notification preference:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <div className="p-4 space-y-4">
        <SoftCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t.language}</Label>
              <Select value={currentLanguage} onValueChange={(val: 'en' | 'ar') => handleLanguageChange(val)}>
                <SelectTrigger className="w-32 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t.english}</SelectItem>
                  <SelectItem value="ar">{t.arabic}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t.currency}</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-32 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t.dateFormat}</Label>
              <Select value={dateFormat} onValueChange={(val: 'gregorian' | 'hijri') => handleDateFormatChange(val)}>
                <SelectTrigger className="w-32 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gregorian">{t.gregorian}</SelectItem>
                  <SelectItem value="hijri">{t.hijri}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SoftCard>

        <SoftCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t.notifications}</Label>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(value) => handleNotificationToggle('push', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>{t.emailNotifs}</Label>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(value) => handleNotificationToggle('email', value)}
              />
            </div>
          </div>
        </SoftCard>

        <SoftCard>
          <button
            onClick={() => navigate('/app/settings/signature')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-primary" />
              </div>
              <div className={currentLanguage === 'ar' ? 'text-right' : 'text-left'}>
                <Label className="block">{t.signature}</Label>
                <p className="text-xs text-muted-foreground">{t.manageSignature}</p>
              </div>
            </div>
            {currentLanguage === 'ar' ? (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </SoftCard>
      </div>
    </div>
  );
};