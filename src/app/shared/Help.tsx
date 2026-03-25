import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Body, BodySmall, Caption, Heading3 } from '@/components/mobile/Typography';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  MessageSquare,
  Book,
  Mail,
  Loader2,
  HelpCircle,
  FileText,
  CreditCard,
  Shield,
  Users,
  Briefcase,
  ChevronRight,
  Headphones,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HelpProps {
  currentLanguage: 'en' | 'ar';
}

const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    icon: Book,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    en: { name: 'Getting Started', desc: 'Learn the basics' },
    ar: { name: 'البداية', desc: 'تعلم الأساسيات' },
  },
  {
    id: 'requests',
    icon: FileText,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    en: { name: 'Requests', desc: 'How to post and track' },
    ar: { name: 'الطلبات والعروض', desc: 'كيفية النشر والمقارنة' },
  },
  {
    id: 'payments',
    icon: CreditCard,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    en: { name: 'Payments', desc: 'Billing and transactions' },
    ar: { name: 'المدفوعات', desc: 'الفوترة والمعاملات' },
  },
  {
    id: 'safety',
    icon: Shield,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    en: { name: 'Safety & Trust', desc: 'Your security matters' },
    ar: { name: 'الأمان والثقة', desc: 'أمانك يهمنا' },
  },
];

const FAQ_DATA: Record<string, { en: { q: string; a: string }[]; ar: { q: string; a: string }[] }> = {
  'getting-started': {
    en: [
      { q: 'Is the app free to use?', a: 'Yes! Posting requests and browsing providers is completely free. There are no hidden fees.' },
      { q: 'How do I find a service provider?', a: 'Post a request from the home screen and we will match you with the best available provider.' },
      { q: 'How do I know if a provider is trustworthy?', a: 'Look for the blue verification badge. Verified providers have passed our identity and license checks.' },
    ],
    ar: [
      { q: 'هل التطبيق مجاني؟', a: 'نعم! نشر الطلبات وتصفح مقدمي الخدمات مجاني تماماً. لا توجد رسوم خفية.' },
      { q: 'كيف أجد مقدم خدمة؟', a: 'طريقتان: 1) تصفح علامة "استكشاف" واحجز مباشرة، أو 2) انشر طلباً واستلم عروض أسعار من مقدمي الخدمات المهتمين.' },
      { q: 'كيف أعرف أن مقدم الخدمة موثوق؟', a: 'ابحث عن علامة التحقق الزرقاء. مقدمو الخدمات الموثقون اجتازوا فحوصات الهوية والتراخيص.' },
    ],
  },
  requests: {
    en: [
      { q: 'How do I post a maintenance request?', a: 'Tap the request entry point on the home screen, describe your need, add photos if helpful, and submit.' },
      { q: 'How long until a provider is assigned?', a: 'Most requests receive provider activity quickly. Urgent requests usually move faster.' },
      { q: 'Can I edit my request after posting?', a: 'Yes, as long as the request is still dispatching and a provider has not started the job yet. Open the request and choose "Edit".' },
    ],
    ar: [
      { q: 'كيف أنشر طلب صيانة؟', a: 'اضغط على زر + في الشاشة الرئيسية، صف حاجتك، أضف صوراً إذا لزم الأمر، وأرسل.' },
      { q: 'كم يستغرق استلام العروض؟', a: 'معظم الطلبات تحصل على عروض خلال 24 ساعة. الطلبات العاجلة تحصل على ردود أسرع.' },
      { q: 'هل يمكنني تعديل طلبي بعد النشر؟', a: 'نعم، طالما لم يتم تقديم عروض بعد. اضغط على الطلب واختر "تعديل".' },
    ],
  },
  payments: {
    en: [
      { q: 'How do I pay for services?', a: 'Payment is arranged directly with the service provider after work is completed to your satisfaction.' },
      { q: 'Is my payment information secure?', a: 'We use industry-standard encryption. Your card details are never stored on our servers.' },
      { q: 'Can I get a refund?', a: 'Disputes are handled case-by-case. Contact support within 48 hours of service completion.' },
    ],
    ar: [
      { q: 'كيف أدفع مقابل الخدمات؟', a: 'يتم ترتيب الدفع مباشرة مع مقدم الخدمة بعد إتمام العمل بما يرضيك.' },
      { q: 'هل معلومات الدفع الخاصة بي آمنة؟', a: 'نستخدم تشفيراً معيارياً. لا يتم تخزين تفاصيل بطاقتك على خوادمنا أبداً.' },
      { q: 'هل يمكنني استرداد المبلغ؟', a: 'يتم التعامل مع النزاعات حسب الحالة. تواصل مع الدعم خلال 48 ساعة من إتمام الخدمة.' },
    ],
  },
  safety: {
    en: [
      { q: 'How are service providers verified?', a: 'We verify identity, business licenses, and review past work. Verified sellers show a blue badge.' },
      { q: 'What if I have a problem with a provider?', a: 'Report the issue immediately via the app. We investigate all reports within 24 hours.' },
      { q: 'How do reviews work?', a: 'Only users who complete jobs can leave reviews. All reviews are genuine and unedited.' },
    ],
    ar: [
      { q: 'كيف يتم التحقق من مقدمي الخدمات؟', a: 'نتحقق من الهوية، ورخص العمل، ونراجع الأعمال السابقة. البائعون الموثقون يظهرون شارة زرقاء.' },
      { q: 'ماذا لو واجهت مشكلة مع مقدم خدمة؟', a: 'أبلغ عن المشكلة فوراً عبر التطبيق. نحقق في جميع البلاغات خلال 24 ساعة.' },
      { q: 'كيف تعمل التقييمات؟', a: 'فقط المستخدمون الذين أتموا مشاريع يمكنهم ترك تقييمات. جميع التقييمات حقيقية وغير معدلة.' },
    ],
  },
};

export const Help = ({ currentLanguage }: HelpProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = currentLanguage === 'ar';

  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '' });

  const content = {
    en: {
      title: 'Help Center',
      greeting: 'How can we help?',
      browseTopics: 'Browse Topics',
      quickActions: 'Quick Actions',
      contactUs: 'Contact Support',
      chatWithUs: 'Chat with Us',
      liveChat: 'Live Chat',
      emailSupport: 'Email Support',
      subject: 'Subject',
      message: 'Describe your issue...',
      send: 'Send Message',
      sent: 'Message sent!',
      email: 'support@maintmena.com',
      responseTime: 'Typically responds in 2-4 hours',
    },
    ar: {
      title: 'مركز المساعدة',
      greeting: 'كيف يمكننا مساعدتك؟',
      browseTopics: 'تصفح المواضيع',
      quickActions: 'إجراءات سريعة',
      contactUs: 'تواصل مع الدعم',
      chatWithUs: 'تحدث معنا',
      liveChat: 'الدردشة المباشرة',
      emailSupport: 'الدعم عبر البريد',
      subject: 'الموضوع',
      message: 'صف مشكلتك...',
      send: 'إرسال الرسالة',
      sent: 'تم إرسال الرسالة!',
      email: 'support@maintmena.com',
      responseTime: 'عادة يرد خلال 2-4 ساعات',
    },
  };

  const t = content[currentLanguage];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error(isArabic ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('contact_form_submissions').insert({
        name: user?.email || 'Anonymous',
        email: user?.email || '',
        subject: formData.subject,
        message: formData.message,
        status: 'new',
      });

      if (error) throw error;
      toast.success(t.sent);
      setFormData({ subject: '', message: '' });
      setShowContactSheet(false);
    } catch (error) {
      toast.error(isArabic ? 'فشل الإرسال' : 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const selectedFaqs = selectedCategory ? FAQ_DATA[selectedCategory]?.[currentLanguage] || [] : [];

  return (
    <div className="min-h-screen bg-background pb-28" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <div className="px-4 py-6 space-y-6">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <Heading3 lang={currentLanguage} className="text-2xl">{t.greeting}</Heading3>
        </motion.div>

        {/* Help Categories Grid */}
        <div>
          <BodySmall lang={currentLanguage} className="font-semibold mb-3 text-muted-foreground">
            {t.browseTopics}
          </BodySmall>
          <div className="grid grid-cols-2 gap-3">
            {HELP_CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              const catContent = cat[currentLanguage];
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <SoftCard
                    className="p-4 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', cat.bgColor)}>
                      <Icon size={20} className="text-foreground" />
                    </div>
                    <BodySmall lang={currentLanguage} className="font-semibold">{catContent.name}</BodySmall>
                    <Caption lang={currentLanguage} className="text-muted-foreground text-xs">{catContent.desc}</Caption>
                  </SoftCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <BodySmall lang={currentLanguage} className="font-semibold mb-3 text-muted-foreground">
            {t.quickActions}
          </BodySmall>
          <div className="space-y-2">
            <SoftCard
              className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowContactSheet(true)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <div>
                  <BodySmall lang={currentLanguage} className="font-medium">{t.contactUs}</BodySmall>
                  <Caption lang={currentLanguage} className="text-muted-foreground">{t.responseTime}</Caption>
                </div>
              </div>
              <ChevronRight size={18} className={cn('text-muted-foreground', isArabic && 'rotate-180')} />
            </SoftCard>

            <SoftCard
              className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(`mailto:${t.email}`, '_blank')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail size={20} className="text-primary" />
                </div>
                <div>
                  <BodySmall lang={currentLanguage} className="font-medium">{t.emailSupport}</BodySmall>
                  <Caption lang={currentLanguage} className="text-muted-foreground">{t.email}</Caption>
                </div>
              </div>
              <ExternalLink size={16} className="text-muted-foreground" />
            </SoftCard>
          </div>
        </div>
      </div>

      {/* FAQ Category Sheet */}
      <Sheet open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
              {selectedCategory && HELP_CATEGORIES.find(c => c.id === selectedCategory)?.[currentLanguage].name}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
            {selectedFaqs.map((faq, idx) => (
              <div key={idx} className="p-4 bg-muted rounded-2xl">
                <BodySmall lang={currentLanguage} className="font-semibold mb-2">{faq.q}</BodySmall>
                <Caption lang={currentLanguage} className="text-muted-foreground leading-relaxed">{faq.a}</Caption>
              </div>
            ))}
            {selectedFaqs.length === 0 && (
              <div className="text-center py-8">
                <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <Body lang={currentLanguage} className="text-muted-foreground">No FAQs available</Body>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Contact Sheet */}
      <Sheet open={showContactSheet} onOpenChange={setShowContactSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
              {t.contactUs}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="space-y-2">
              <Label className={isArabic ? 'font-ar-body' : ''}>{t.subject}</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t.subject}
                className={cn('rounded-xl', isArabic && 'text-right')}
              />
            </div>

            <div className="space-y-2">
              <Label className={isArabic ? 'font-ar-body' : ''}>{t.message}</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.message}
                rows={5}
                className={cn('rounded-xl', isArabic && 'text-right')}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full h-12">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.send}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};
