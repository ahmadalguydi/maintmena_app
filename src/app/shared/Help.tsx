import { useState } from 'react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageSquare, Book, Phone, Mail, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface HelpProps {
  currentLanguage: 'en' | 'ar';
}

export const Help = ({ currentLanguage }: HelpProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const content = {
    en: {
      title: 'Help & Support',
      faq: 'Frequently Asked Questions',
      contact: 'Contact Us',
      subject: 'Subject',
      message: 'Message',
      send: 'Send Message',
      phone: '+966 11 234 5678',
      email: 'support@maintmena.com',
      faqs: [
        {
          q: 'How do I post a maintenance request?',
          a: 'Navigate to the Home tab and tap "Post Request". Fill in the details about your maintenance need and submit.'
        },
        {
          q: 'How long does it take to get quotes?',
          a: 'Most requests receive quotes within 24 hours. Urgent requests typically get responses even faster.'
        },
        {
          q: 'How do I compare quotes?',
          a: 'Go to your Requests tab, select a request, and view all submitted quotes. You can compare prices, timelines, and seller ratings.'
        },
        {
          q: 'Is my payment secure?',
          a: 'Yes, all payments are processed securely through our platform. We use industry-standard encryption.'
        }
      ]
    },
    ar: {
      title: 'المساعدة والدعم',
      faq: 'الأسئلة الشائعة',
      contact: 'اتصل بنا',
      subject: 'الموضوع',
      message: 'الرسالة',
      send: 'إرسال الرسالة',
      phone: '+966 11 234 5678',
      email: 'support@maintmena.com',
      faqs: [
        {
          q: 'كيف أنشر طلب صيانة؟',
          a: 'انتقل إلى علامة التبويب الرئيسية واضغط على "نشر طلب". املأ تفاصيل احتياجات الصيانة وأرسل.'
        },
        {
          q: 'كم من الوقت يستغرق الحصول على عروض أسعار؟',
          a: 'معظم الطلبات تحصل على عروض أسعار في غضون 24 ساعة. الطلبات العاجلة عادة تحصل على ردود أسرع.'
        },
        {
          q: 'كيف أقارن العروض؟',
          a: 'انتقل إلى علامة تبويب طلباتي، اختر طلبًا، واعرض جميع العروض المقدمة. يمكنك مقارنة الأسعار والجداول الزمنية وتقييمات البائعين.'
        },
        {
          q: 'هل دفعتي آمنة؟',
          a: 'نعم، يتم معالجة جميع المدفوعات بشكل آمن من خلال منصتنا. نستخدم التشفير المعياري في الصناعة.'
        }
      ]
    }
  };

  const t = content[currentLanguage];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.message) {
      toast.error(currentLanguage === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contact_form_submissions')
        .insert({
          name: user?.email || 'Anonymous',
          email: user?.email || '',
          subject: formData.subject,
          message: formData.message,
          status: 'new'
        });

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم إرسال رسالتك!' : 'Message sent successfully!');
      setFormData({ subject: '', message: '' });
    } catch (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل الإرسال' : 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => window.history.back()} />

      <div className="p-4 space-y-6">
        {/* FAQ Section */}
        <SoftCard>
          <div className="flex items-center gap-3 mb-4">
            <Book className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t.faq}</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {t.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-2xl px-4">
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SoftCard>

        {/* Contact Form */}
        <SoftCard>
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">{t.contact}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.subject}</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t.subject}
                className="rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label>{t.message}</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.message}
                rows={5}
                className="rounded-3xl"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.send}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail size={16} />
              <span>{t.email}</span>
            </div>
          </div>
        </SoftCard>
      </div>
    </div>
  );
};
