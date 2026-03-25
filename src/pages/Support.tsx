import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, Search, HelpCircle, Book, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import LiveChat from '@/components/LiveChat';

interface SupportProps {
  currentLanguage: 'en' | 'ar';
}

const Support = ({ currentLanguage }: SupportProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const content = {
    en: {
      title: "Support Center",
      subtitle: "We're here to help you get the most out of MaintMENA",
      searchPlaceholder: "Search for help...",
      contactMethods: [
        {
          icon: Mail,
          title: "Email Support",
          description: "Send us a detailed message",
          availability: "Response within 2 hours",
          action: "Send Email",
          link: "mailto:support@maintmena.com"
        }
      ],
      quickHelp: [
        {
          icon: Book,
          title: "Documentation",
          description: "Comprehensive guides and tutorials"
        },
        {
          icon: Video,
          title: "Video Tutorials",
          description: "Step-by-step video guides"
        },
        {
          icon: HelpCircle,
          title: "FAQ",
          description: "Frequently asked questions"
        }
      ],
      faqTitle: "Frequently Asked Questions",
      faqs: [
        {
          question: "How does MaintMENA help my business?",
          answer: "MaintMENA provides two core pillars: Intelligence (curated signals, tenders, and market insights) and Marketplace (connect directly with buyers/sellers for maintenance projects). This dual approach helps you stay ahead of opportunities and win more business."
        },
        {
          question: "What's included in the 14-day trial?",
          answer: "Your trial includes full access to Weekly Brief, tender tracking, marketplace features, and all tools in your chosen tier. No credit card required to start."
        },
        {
          question: "How accurate is your intelligence data?",
          answer: "Our signals and tenders are verified from official sources and industry contacts, with a 95%+ accuracy rate. We continuously validate all information before publishing."
        },
        {
          question: "Can I switch between plans?",
          answer: "Yes! You can upgrade or downgrade your subscription anytime from your account settings. Changes take effect immediately with prorated billing."
        },
        {
          question: "Do you support both Arabic and English?",
          answer: "Absolutely. All platform features, content, and support are available in both Arabic and English with full localization."
        },
        {
          question: "How do I cancel my subscription?",
          answer: "You can cancel anytime from your account settings. Your access continues until the end of your current billing period with no penalties."
        }
      ]
    },
    ar: {
      title: "مركز الدعم",
      subtitle: "احنا هنا علشان نساعدك تستفيد أقصى استفادة من مينت مينا",
      searchPlaceholder: "ابحث عن المساعدة...",
      contactMethods: [
        {
          icon: Mail,
          title: "الدعم بالإيميل",
          description: "ارسل لنا رسالة مفصلة",
          availability: "رد خلال ساعتين",
          action: "ارسل إيميل",
          link: "mailto:support@maintmena.com"
        }
      ],
      quickHelp: [
        {
          icon: Book,
          title: "التوثيق",
          description: "أدلة شاملة وتوجيهات"
        },
        {
          icon: Video,
          title: "فيديوهات تعليمية",
          description: "أدلة مرئية خطوة بخطوة"
        },
        {
          icon: HelpCircle,
          title: "الأسئلة الشائعة",
          description: "أكثر الأسئلة تكراراً"
        }
      ],
      faqTitle: "الأسئلة اللي تتكرر كثير",
      faqs: [
        {
          question: "كيف MaintMENA تساعد شغلي؟",
          answer: "MaintMENA توفر ركيزتين أساسيتين: المعلومات (إشارات منتقاة، مناقصات، ورؤى السوق) والسوق (تواصل مباشر مع المشترين/البائعين لمشاريع الصيانة). هالنهج المزدوج يخليك دايم متقدم على الفرص وتكسب مشاريع أكثر."
        },
        {
          question: "إيش المشمول في تجربة 14 يوم؟",
          answer: "تجربتك تشمل وصول كامل لموجز اليوم، تتبع المناقصات، ميزات السوق، وكل الأدوات في الطبقة اللي اخترتها. ما تحتاج بطاقة ائتمان للبدء."
        },
        {
          question: "قد إيش دقيقة بيانات المعلومات عندكم؟",
          answer: "إشاراتنا ومناقصاتنا مدققة من مصادر رسمية وجهات اتصال صناعية، مع معدل دقة +95%. نتحقق باستمرار من كل المعلومات قبل النشر."
        },
        {
          question: "أقدر أغير بين الخطط؟",
          answer: "أيوه! تقدر ترقي أو تخفض اشتراكك أي وقت من إعدادات حسابك. التغييرات تسري فوراً مع فوترة متناسبة."
        },
        {
          question: "تدعمون العربي والإنجليزي؟",
          answer: "طبعاً. كل ميزات المنصة والمحتوى والدعم متاحة بالعربي والإنجليزي مع ترجمة كاملة."
        },
        {
          question: "كيف ألغي اشتراكي؟",
          answer: "تقدر تلغي أي وقت من إعدادات حسابك. الوصول يستمر لين نهاية فترة الفوترة الحالية بدون عقوبات."
        }
      ]
    }
  };

  const currentContent = content[currentLanguage];
  
  const filteredFaqs = currentContent.faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-headline-1 text-ink mb-4">{currentContent.title}</h1>
            <p className="text-dek max-w-3xl mx-auto mb-8">{currentContent.subtitle}</p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder={currentContent.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
              />
            </div>
          </motion.div>

          {/* Contact Methods */}
          <div className="grid md:grid-cols-1 gap-6 mb-16">
            {currentContent.contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-paper border border-rule rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
                >
                  <Icon className="text-accent mx-auto mb-4" size={48} />
                  <h3 className="text-headline-2 text-ink mb-2">{method.title}</h3>
                  <p className="text-muted-foreground mb-2">{method.description}</p>
                  <div className="flex items-center justify-center text-sm text-accent mb-4">
                    <Clock size={16} className="mr-1" />
                    {method.availability}
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => window.location.href = method.link}
                  >
                    {method.action}
                  </Button>
                </motion.div>
              );
            })}
          </div>

        {/* Quick Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-headline-2 text-ink text-center mb-8">
            {currentLanguage === 'ar' ? 'مساعدة سريعة' : 'Quick Help'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {currentContent.quickHelp.map((help, index) => {
              const Icon = help.icon;
              return (
                <div
                  key={index}
                  className="bg-accent/5 border border-rule rounded-lg p-6 text-center cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  <Icon className="text-accent mx-auto mb-4" size={32} />
                  <h3 className="font-medium text-ink mb-2">{help.title}</h3>
                  <p className="text-sm text-muted-foreground">{help.description}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-headline-2 text-ink text-center mb-8">{currentContent.faqTitle}</h2>
            
            {searchQuery && filteredFaqs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {currentLanguage === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
              </p>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border border-rule rounded-lg px-6">
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </motion.div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-16 text-center bg-accent/5 border border-rule rounded-lg p-12"
          >
            <h2 className="text-headline-2 text-ink mb-4">
              {currentLanguage === 'ar' ? 'ما حصلت اللي تدور عليه؟' : "Can't find what you're looking for?"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {currentLanguage === 'ar' 
                ? 'تواصل معنا مباشرة وراح نساعدك نحل مشكلتك' 
                : 'Contact us directly and we\'ll help you resolve any issue'
              }
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/contact'}
            >
              {currentLanguage === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Live Chat Widget */}
      <LiveChat currentLanguage={currentLanguage} />
    </>
  );
};

export default Support;