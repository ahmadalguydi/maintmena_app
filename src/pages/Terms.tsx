import { motion } from 'framer-motion';
import { FileText, Scale, CreditCard, Users, Shield, Gavel } from 'lucide-react';

interface TermsProps {
  currentLanguage: 'en' | 'ar';
}

const Terms = ({ currentLanguage }: TermsProps) => {
  const content = {
    en: {
      title: "Terms of Service",
      subtitle: "The legal framework for using MaintMENA services",
      lastUpdated: "Last updated: September 2024",
      sections: [
        {
          icon: Scale,
          title: "1. Acceptance of Terms",
          content: "By accessing MaintMENA services, you enter into a binding agreement with us. These terms govern your use of our industrial intelligence platform, including all content, features, and services we provide. If you don't agree with any part of these terms, please don't use our services."
        },
        {
          icon: FileText,
          title: "2. Service Description",
          content: "MaintMENA provides industrial intelligence through weekly briefings, tender notifications, buyer directories, and market analysis for the MENA region. Our platform delivers verified information about maintenance opportunities, shutdowns, and industry movements to help businesses identify and pursue relevant opportunities."
        },
        {
          icon: CreditCard,
          title: "3. Subscription and Billing",
          content: "Subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days notice. Your subscription automatically renews unless cancelled before the next billing cycle."
        },
        {
          icon: Users,
          title: "4. User Responsibilities",
          content: "You're responsible for maintaining account security, providing accurate information, and using our services in compliance with applicable laws. You may not share login credentials, redistribute our content without permission, or use our services for any illegal or harmful activities."
        },
        {
          icon: Shield,
          title: "5. Intellectual Property",
          content: "All content, data, analysis, and materials on our platform are proprietary to MaintMENA or our licensors. You receive a limited license to use our services for business purposes but may not copy, modify, distribute, or create derivative works from our content without written permission."
        },
        {
          icon: Gavel,
          title: "6. Limitation of Liability",
          content: "While we strive for accuracy, MaintMENA provides information 'as is' without warranties. We're not liable for business decisions made based on our intelligence, lost opportunities, or indirect damages. Our total liability is limited to the amount you paid for services in the 12 months preceding any claim."
        }
      ],
      footer: {
        governing: "These terms are governed by Saudi Arabian law. Disputes will be resolved through binding arbitration in Riyadh.",
        contact: "Questions about these terms? Contact our legal team at legal@maintmena.com",
        effective: "These terms are effective immediately and supersede all previous agreements."
      }
    },
    ar: {
      title: "شروط الخدمة",
      subtitle: "الإطار القانوني لاستخدام خدمات مينت مينا",
      lastUpdated: "آخر تحديث: سبتمبر 2024", 
      sections: [
        {
          icon: Scale,
          title: "1. قبول الشروط",
          content: "باستخدام خدمات مينت مينا، تدخل في اتفاقية ملزمة معانا. هذه الشروط تحكم استخدامك لمنصة الذكاء الصناعي، شاملة كل المحتوى والميزات والخدمات اللي نوفرها. إذا ما توافق على أي جزء من هذه الشروط، لا تستخدم خدماتنا."
        },
        {
          icon: FileText,
          title: "2. وصف الخدمة",
          content: "مينت مينا توفر ذكاء صناعي من خلال موجزات أسبوعية، تنبيهات المناقصات، أدلة المشترين، وتحليل السوق لمنطقة الشرق الأوسط وشمال أفريقيا. منصتنا توصل معلومات موثقة عن فرص الصيانة والإغلاقات وتحركات الصناعة لمساعدة الشركات تحدد وتتابع الفرص المناسبة."
        },
        {
          icon: CreditCard,
          title: "3. الاشتراك والفوترة",
          content: "الاشتراكات تُدفع مقدماً شهري أو سنوي. كل الرسوم غير قابلة للاسترداد إلا حسب ما يطلبه القانون. نحتفظ بالحق في تغيير الأسعار بإشعار 30 يوم. اشتراكك يتجدد تلقائياً إلا إذا ألغيته قبل دورة الفوترة الجاية."
        },
        {
          icon: Users,
          title: "4. مسؤوليات المستخدم",
          content: "أنت مسؤول عن الحفاظ على أمان الحساب، تقديم معلومات دقيقة، واستخدام خدماتنا بما يتوافق مع القوانين المعمول فيها. ما تقدر تشارك بيانات تسجيل الدخول، تعيد توزيع محتوانا بدون إذن، أو تستخدم خدماتنا لأي أنشطة غير قانونية أو ضارة."
        },
        {
          icon: Shield,
          title: "5. الملكية الفكرية",
          content: "كل المحتوى والبيانات والتحليلات والمواد في منصتنا ملكية خاصة لمينت مينا أو مرخصينا. تحصل على ترخيص محدود لاستخدام خدماتنا لأغراض تجارية بس ما تقدر تنسخ أو تعدل أو توزع أو تسوي أعمال مشتقة من محتوانا بدون إذن كتابي."
        },
        {
          icon: Gavel,
          title: "6. تحديد المسؤولية",
          content: "رغم إننا نسعى للدقة، مينت مينا توفر المعلومات 'كما هي' بدون ضمانات. ما نتحمل مسؤولية القرارات التجارية اللي تاخذها بناءً على ذكائنا، الفرص المفقودة، أو الأضرار غير المباشرة. مسؤوليتنا الكاملة محدودة بالمبلغ اللي دفعته للخدمات في الـ12 شهر اللي قبل أي مطالبة."
        }
      ],
      footer: {
        governing: "هذه الشروط محكومة بالقانون السعودي. المنازعات تُحل عبر التحكيم الملزم في الرياض.",
        contact: "أسئلة عن هذه الشروط؟ تواصل مع فريقنا القانوني على legal@maintmena.com",
        effective: "هذه الشروط سارية فوراً وتحل محل كل الاتفاقيات السابقة."
      }
    }
  };

  const currentContent = content[currentLanguage];

  return (
    <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <div className="bg-muted/30 border-b border-rule">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Scale className="w-16 h-16 text-accent mx-auto mb-6" />
            <h1 className="text-headline-1 text-ink mb-4">{currentContent.title}</h1>
            <p className="text-dek text-muted-foreground mb-2">{currentContent.subtitle}</p>
            <p className="text-sm text-muted-foreground">{currentContent.lastUpdated}</p>
          </motion.div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid gap-12">
          {currentContent.sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-paper border border-rule rounded-lg p-8 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-accent/10 p-3 rounded-lg flex-shrink-0">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-headline-2 text-ink mb-4">{section.title}</h2>
                    <p className="text-muted-foreground leading-relaxed text-lg">{section.content}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 space-y-6"
        >
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-2">
              {currentLanguage === 'ar' ? 'القانون الحاكم' : 'Governing Law'}
            </h3>
            <p className="text-muted-foreground">{currentContent.footer.governing}</p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-2">
              {currentLanguage === 'ar' ? 'تواصل معانا' : 'Contact Us'}
            </h3>
            <p className="text-muted-foreground">{currentContent.footer.contact}</p>
          </div>

          <div className="text-center pt-8 border-t border-rule">
            <p className="text-sm text-muted-foreground">{currentContent.footer.effective}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;