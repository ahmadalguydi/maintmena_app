import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, MapPin, Phone, Clock, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, any>) => void;
  }
}

interface ContactProps {
  currentLanguage: 'en' | 'ar';
}

const Contact = ({ currentLanguage }: ContactProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const content = {
    en: {
      title: 'Contact Us',
      subtitle: 'Get in touch with the MaintMENA team',
      form: {
        name: 'Full Name',
        email: 'Email Address',
        company: 'Company',
        subject: 'Subject',
        message: 'Message',
        send: 'Send Message',
        sending: 'Sending...',
        namePlaceholder: 'Enter your full name',
        emailPlaceholder: 'Enter your email address',
        companyPlaceholder: 'Your company name',
        subjectPlaceholder: 'What is this about?',
        messagePlaceholder: 'Tell us more about your inquiry...'
      },
        info: {
        title: 'Contact Information',
        email: {
          title: 'General Inquiries',
          value: 'hello@maintmena.com',
          subtitle: 'For general questions and information'
        },
        sales: {
          title: 'Sales & Partnerships',
          value: 'sales@maintmena.com',
          subtitle: 'For subscription and partnership inquiries'
        },
        support: {
          title: 'Technical Support',
          value: 'support@maintmena.com',
          subtitle: 'For technical assistance and account help'
        },
        legal: {
          title: 'Legal',
          value: 'legal@maintmena.com',
          subtitle: 'For legal and compliance matters'
        },
        address: {
          title: 'Regional Offices',
          offices: [
            { city: 'Dubai, UAE', address: 'DIFC, Gate Village 7' },
            { city: 'Riyadh, KSA', address: 'King Abdullah Financial District' },
            { city: 'Cairo, Egypt', address: 'New Administrative Capital' }
          ]
        },
        hours: {
          title: 'Business Hours',
          value: 'Sunday - Thursday: 8:00 AM - 6:00 PM GST',
          subtitle: 'We respond to all inquiries within 24 hours'
        }
      },
      faq: {
        title: 'Quick Questions',
        items: [
          {
            question: 'What makes MaintMENA different?',
            answer: 'We combine verified home service pros and project contractors in one platform, with real reviews, clear pricing, and direct communication. No more WhatsApp hunting or unreliable referrals.'
          },
          {
            question: 'How do I start?',
            answer: 'Click "Post a Job" or "Sign Up as a Pro" on our homepage. Buyers can post for free and compare quotes; pros can browse jobs and submit competitive bids.'
          },
          {
            question: 'Do you offer team solutions?',
            answer: 'Yes, for property management companies or developers with multiple projects, contact us for volume pricing and dedicated account management.'
          }
        ]
      },
      success: 'Message sent successfully! We\'ll get back to you within 24 hours.',
      error: 'Failed to send message. Please try again or email us directly.'
    },
    ar: {
      title: 'اتصل بنا',
      subtitle: 'تواصل مع فريق MaintMENA',
      form: {
        name: 'الاسم الكامل',
        email: 'عنوان البريد الإلكتروني',
        company: 'الشركة',
        subject: 'الموضوع',
        message: 'الرسالة',
        send: 'إرسال الرسالة',
        sending: 'جاري الإرسال...',
        namePlaceholder: 'أدخل اسمك الكامل',
        emailPlaceholder: 'أدخل عنوان بريدك الإلكتروني',
        companyPlaceholder: 'اسم شركتك',
        subjectPlaceholder: 'ما هو الموضوع؟',
        messagePlaceholder: 'أخبرنا المزيد عن استفسارك...'
      },
        info: {
        title: 'معلومات الاتصال',
        email: {
          title: 'الاستفسارات العامة',
          value: 'hello@maintmena.com',
          subtitle: 'للأسئلة العامة والمعلومات'
        },
        sales: {
          title: 'المبيعات والشراكات',
          value: 'sales@maintmena.com',
          subtitle: 'لاستفسارات الاشتراك والشراكة'
        },
        support: {
          title: 'الدعم الفني',
          value: 'support@maintmena.com',
          subtitle: 'للمساعدة الفنية ودعم الحساب'
        },
        legal: {
          title: 'القانونية',
          value: 'legal@maintmena.com',
          subtitle: 'للمسائل القانونية والامتثال'
        },
        address: {
          title: 'المكاتب الإقليمية',
          offices: [
            { city: 'دبي، الإمارات العربية المتحدة', address: 'مركز دبي المالي العالمي، قرية البوابة 7' },
            { city: 'الرياض، المملكة العربية السعودية', address: 'حي الملك عبدالله المالي' },
            { city: 'القاهرة، مصر', address: 'العاصمة الإدارية الجديدة' }
          ]
        },
        hours: {
          title: 'ساعات العمل',
          value: 'الأحد - الخميس: 8:00 صباحاً - 6:00 مساءً بتوقيت الخليج',
          subtitle: 'نرد على جميع الاستفسارات خلال 24 ساعة'
        }
      },
      faq: {
        title: 'أسئلة سريعة',
        items: [
          {
            question: 'إيش اللي يميز MaintMENA؟',
            answer: 'نجمع محترفي الخدمات المنزلية ومقاولي المشاريع الموثقين في منصة واحدة، مع تقييمات حقيقية وأسعار واضحة وتواصل مباشر. لا مزيد من البحث في الواتساب أو الإحالات غير الموثوقة.'
          },
          {
            question: 'كيف أبدأ؟',
            answer: 'اضغط على "انشر وظيفة" أو "سجل كمحترف" في صفحتنا الرئيسية. المشترون يمكنهم النشر مجاناً ومقارنة العروض؛ المحترفون يمكنهم تصفح الوظائف وتقديم عروض تنافسية.'
          },
          {
            question: 'تقدمون حلول للفرق؟',
            answer: 'نعم، لشركات إدارة العقارات أو المطورين الذين لديهم مشاريع متعددة، تواصل معنا للحصول على أسعار مخفضة وإدارة حساب مخصصة.'
          }
        ]
      },
      success: 'تم إرسال الرسالة بنجاح! سنرد عليك خلال 24 ساعة.',
      error: 'فشل في إرسال الرسالة. يرجى المحاولة مرة أخرى أو مراسلتنا مباشرة.'
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form data
      const { contactFormSchema } = await import('@/lib/validationSchemas');
      const validatedData = contactFormSchema.parse(formData);

      // Save to database
      const { error } = await supabase
        .from('contact_form_submissions')
        .insert(validatedData);

      if (error) throw error;

      // Send GA4 event
      if (window.gtag) {
        window.gtag('event', 'contact_form_submission', {
          form_name: formData.subject,
          user_email: formData.email
        });
      }
      
      toast({
        title: currentLanguage === 'ar' ? 'تم الإرسال' : 'Message Sent',
        description: content[currentLanguage].success,
      });
      
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Handle validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const firstError = zodError.errors?.[0];
        toast({
          title: currentLanguage === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
          description: firstError?.message || content[currentLanguage].error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
          description: content[currentLanguage].error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-paper text-ink" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-rule py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              {currentLanguage === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Button>
          </Link>
          <div className="text-masthead">MaintMENA</div>
        </div>
      </header>

      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-headline-1 mb-4">{content[currentLanguage].title}</h1>
            <p className="text-dek">{content[currentLanguage].subtitle}</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{content[currentLanguage].form.name}</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={content[currentLanguage].form.namePlaceholder}
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{content[currentLanguage].form.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={content[currentLanguage].form.emailPlaceholder}
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company">{content[currentLanguage].form.company}</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder={content[currentLanguage].form.companyPlaceholder}
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">{content[currentLanguage].form.subject}</Label>
                  <Input
                    id="subject"
                    type="text"
                    placeholder={content[currentLanguage].form.subjectPlaceholder}
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="message">{content[currentLanguage].form.message}</Label>
                  <Textarea
                    id="message"
                    placeholder={content[currentLanguage].form.messagePlaceholder}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    content[currentLanguage].form.sending
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {content[currentLanguage].form.send}
                    </>
                  )}
                </Button>
              </form>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-headline-2 mb-6">{content[currentLanguage].info.title}</h2>
                
                <div className="space-y-6">
                  {/* General Email */}
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-accent-2 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="font-medium mb-1">{content[currentLanguage].info.email.title}</h3>
                      <a href="mailto:hello@maintmena.com" className="text-accent-2 font-mono hover:underline" dir="ltr">
                        {content[currentLanguage].info.email.value}
                      </a>
                      <p className="text-sm text-muted-foreground">{content[currentLanguage].info.email.subtitle}</p>
                    </div>
                  </div>

                  {/* Sales */}
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-accent-2 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="font-medium mb-1">{content[currentLanguage].info.sales.title}</h3>
                      <a href="mailto:sales@maintmena.com" className="text-accent-2 font-mono hover:underline" dir="ltr">
                        {content[currentLanguage].info.sales.value}
                      </a>
                      <p className="text-sm text-muted-foreground">{content[currentLanguage].info.sales.subtitle}</p>
                    </div>
                  </div>

                  {/* Support */}
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-accent-2 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="font-medium mb-1">{content[currentLanguage].info.support.title}</h3>
                      <a href="mailto:support@maintmena.com" className="text-accent-2 font-mono hover:underline" dir="ltr">
                        {content[currentLanguage].info.support.value}
                      </a>
                      <p className="text-sm text-muted-foreground">{content[currentLanguage].info.support.subtitle}</p>
                    </div>
                  </div>

                  {/* Legal */}
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-accent-2 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <h3 className="font-medium mb-1">{content[currentLanguage].info.legal.title}</h3>
                      <a href="mailto:legal@maintmena.com" className="text-accent-2 font-mono hover:underline" dir="ltr">
                        {content[currentLanguage].info.legal.value}
                      </a>
                      <p className="text-sm text-muted-foreground">{content[currentLanguage].info.legal.subtitle}</p>
                    </div>
                  </div>

                  {/* Offices */}
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-accent-2 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium mb-3">{content[currentLanguage].info.address.title}</h3>
                      <div className="space-y-2">
                        {content[currentLanguage].info.address.offices.map((office, index) => (
                          <div key={index} className="text-sm">
                            <p className="font-medium">{office.city}</p>
                            <p className="text-muted-foreground">{office.address}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex items-start gap-4">
                    <Clock className="w-5 h-5 text-accent-2 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium mb-1">{content[currentLanguage].info.hours.title}</h3>
                      <p className="text-sm">{content[currentLanguage].info.hours.value}</p>
                      <p className="text-sm text-muted-foreground">{content[currentLanguage].info.hours.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick FAQ */}
              <div className="border-t border-rule pt-8">
                <h3 className="text-xl font-display font-semibold mb-4">
                  {content[currentLanguage].faq.title}
                </h3>
                <div className="space-y-4">
                  {content[currentLanguage].faq.items.map((item, index) => (
                    <div key={index}>
                      <h4 className="font-medium mb-1">{item.question}</h4>
                      <p className="text-sm text-muted-foreground">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;