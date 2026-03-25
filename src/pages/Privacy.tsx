import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, Mail, Globe } from 'lucide-react';

interface PrivacyProps {
  currentLanguage: 'en' | 'ar';
}

const Privacy = ({ currentLanguage }: PrivacyProps) => {
  const content = {
    en: {
      title: "Privacy Policy",
      subtitle: "How we collect, use, and protect your information",
      lastUpdated: "Last updated: September 2024",
      sections: [
        {
          icon: Eye,
          title: "Information We Collect",
          content: "We collect information you provide directly to us when you create an account, subscribe to our services, or contact us. This includes your name, email address, company information, and payment details. We also automatically collect technical information like IP address, browser type, and usage patterns to improve our services."
        },
        {
          icon: FileText,
          title: "How We Use Your Information",
          content: "Your information helps us deliver personalized industrial intelligence, process payments securely, send relevant updates about tenders and opportunities, provide customer support, and improve our platform. We never use your data for purposes beyond what's necessary to provide our services."
        },
        {
          icon: Shield,
          title: "Information Sharing and Disclosure", 
          content: "We don't sell, trade, or rent your personal information to third parties. We only share data when legally required, with your explicit consent, or with trusted service providers who help us operate (payment processors, email services) under strict confidentiality agreements."
        },
        {
          icon: Lock,
          title: "Data Security",
          content: "We implement bank-level security measures including end-to-end encryption, secure data centers, regular security audits, and multi-factor authentication. Your payment information is processed through PCI DSS compliant providers and never stored on our servers."
        },
        {
          icon: Globe,
          title: "International Data Transfers",
          content: "As we serve clients across MENA, your data may be processed in different countries. We ensure appropriate safeguards are in place and comply with local data protection laws including GDPR where applicable."
        },
        {
          icon: Mail,
          title: "Your Rights and Choices",
          content: "You have the right to access, update, or delete your personal information. You can unsubscribe from our communications anytime, request data portability, or restrict processing. Contact us at privacy@maintmena.com to exercise these rights."
        }
      ],
      contact: {
        title: "Questions About Privacy?",
        content: "If you have questions about this Privacy Policy or how we handle your data, reach out to our privacy team at privacy@maintmena.com or use our contact form.",
        cta: "Contact Privacy Team"
      }
    },
    ar: {
      title: "سياسة الخصوصية", 
      subtitle: "كيف نجمع ونستخدم ونحمي معلوماتك",
      lastUpdated: "آخر تحديث: سبتمبر 2024",
      sections: [
        {
          icon: Eye,
          title: "المعلومات اللي نجمعها",
          content: "نجمع المعلومات اللي تقدمها لنا لما تسوي حساب أو تشترك في خدماتنا أو تتواصل معانا. هذا يشمل اسمك وإيميلك ومعلومات شركتك وتفاصيل الدفع. كمان نجمع معلومات تقنية بشكل تلقائي زي عنوان IP ونوع المتصفح وطريقة استخدامك للموقع علشان نحسن خدماتنا."
        },
        {
          icon: FileText,
          title: "كيف نستخدم معلوماتك",
          content: "معلوماتك تساعدنا نوصلك ذكاء صناعي شخصي، نعالج المدفوعات بأمان، نرسلك تحديثات مهمة عن المناقصات والفرص، نوفرلك دعم العملاء، ونحسن منصتنا. ما نستخدم بياناتك لأغراض غير ضرورية لتقديم خدماتنا."
        },
        {
          icon: Shield,
          title: "مشاركة المعلومات والإفصاح",
          content: "ما نبيع أو نتاجر أو نأجر معلوماتك الشخصية لأطراف ثالثة. نشارك البيانات بس لما يطلب القانون، أو بموافقتك الصريحة، أو مع مقدمي خدمات موثوقين يساعدونا في التشغيل (معالجات الدفع، خدمات الإيميل) تحت اتفاقيات سرية صارمة."
        },
        {
          icon: Lock,
          title: "أمان البيانات",
          content: "نطبق إجراءات أمان على مستوى البنوك تشمل التشفير الشامل، مراكز بيانات آمنة، مراجعات أمنية منتظمة، والمصادقة متعددة العوامل. معلومات الدفع تُعالج عبر مقدمين معتمدين PCI DSS وما تتخزن في خوادمنا."
        },
        {
          icon: Globe,
          title: "نقل البيانات الدولية",
          content: "لأننا نخدم عملاء عبر منطقة الشرق الأوسط وشمال أفريقيا، قد تُعالج بياناتك في دول مختلفة. نضمن وجود ضمانات مناسبة ونلتزم بقوانين حماية البيانات المحلية بما فيها GDPR حيث ينطبق."
        },
        {
          icon: Mail,
          title: "حقوقك وخياراتك",
          content: "عندك الحق في الوصول لمعلوماتك الشخصية وتحديثها أو حذفها. تقدر تلغي اشتراكك في رسائلنا أي وقت، تطلب نقل البيانات، أو تقيد المعالجة. تواصل معانا على privacy@maintmena.com لممارسة هذه الحقوق."
        }
      ],
      contact: {
        title: "عندك أسئلة عن الخصوصية؟",
        content: "إذا عندك أسئلة عن سياسة الخصوصية هذه أو كيف نتعامل مع بياناتك، تواصل مع فريق الخصوصية على privacy@maintmena.com أو استخدم نموذج التواصل.",
        cta: "تواصل مع فريق الخصوصية"
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
            <Shield className="w-16 h-16 text-accent mx-auto mb-6" />
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

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-accent/5 border border-accent/20 rounded-lg p-8 mt-12 text-center"
        >
          <h2 className="text-headline-2 text-ink mb-4">{currentContent.contact.title}</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{currentContent.contact.content}</p>
          <a 
            href="mailto:privacy@maintmena.com"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-accent-foreground px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            {currentContent.contact.cta}
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;