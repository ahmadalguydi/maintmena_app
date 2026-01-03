import { motion } from 'framer-motion';
import { ArrowRight, Factory, TrendingUp, FileText, Users, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServicesProps {
  currentLanguage: 'en' | 'ar';
}

const Services = ({ currentLanguage }: ServicesProps) => {
  const content = {
    en: {
      title: "What We Offer",
      subtitle: "Services and tools for homeowners and contractors",
      services: [
        {
          icon: Users,
          title: "For Homeowners",
          description: "Find trusted pros for all your home repair and maintenance needs.",
          features: ["AC Repair & Maintenance", "Plumbing & Electrical", "Painting & Cleaning", "Handyman Services"]
        },
        {
          icon: Factory,
          title: "For Developers & Contractors",
          description: "Access vetted contractors for your construction and fit-out projects.",
          features: ["Fit-Out & MEP Work", "Tiling & Flooring", "Gypsum & Carpentry", "Waterproofing & Landscaping"]
        },
        {
          icon: TrendingUp,
          title: "Quote Comparison",
          description: "Receive multiple quotes and compare pricing, timelines, and portfolios side-by-side.",
          features: ["Transparent Pricing", "Timeline Estimates", "Portfolio Viewing", "Direct Messaging"]
        },
        {
          icon: Settings,
          title: "Verified Professionals",
          description: "Every pro on our platform is background-checked with verified credentials.",
          features: ["Identity Verification", "License Checks", "Past Work Reviews", "Performance Ratings"]
        },
        {
          icon: FileText,
          title: "Secure Payments",
          description: "Milestone-based payments with built-in protection for both parties.",
          features: ["Escrow Protection", "Milestone Tracking", "Dispute Resolution", "Payment History"]
        },
        {
          icon: BarChart3,
          title: "Track Everything",
          description: "Monitor your job progress, communicate with pros, and manage payments all in one place.",
          features: ["Real-time Updates", "Message History", "Photo Documentation", "Invoice Management"]
        }
      ],
      cta: "Get Started",
      contact: "Everything you need to find the right pro"
    },
    ar: {
      title: "ما نقدمه",
      subtitle: "خدمات وأدوات لأصحاب المنازل والمقاولين",
      services: [
        {
          icon: Users,
          title: "لأصحاب المنازل",
          description: "ابحث عن محترفين موثوقين لجميع احتياجات إصلاح وصيانة منزلك.",
          features: ["إصلاح وصيانة المكيفات", "السباكة والكهرباء", "الدهان والتنظيف", "خدمات العامل الماهر"]
        },
        {
          icon: Factory,
          title: "للمطورين والمقاولين",
          description: "الوصول إلى مقاولين معتمدين لمشاريع البناء والتشطيب الخاصة بك.",
          features: ["أعمال التشطيب والميكانيكا", "البلاط والأرضيات", "الجبس والنجارة", "العزل والمناظر الطبيعية"]
        },
        {
          icon: TrendingUp,
          title: "مقارنة العروض",
          description: "احصل على عروض متعددة وقارن الأسعار والجداول الزمنية ونماذج الأعمال جنباً إلى جنب.",
          features: ["أسعار شفافة", "تقديرات الجدول الزمني", "عرض نماذج الأعمال", "المراسلة المباشرة"]
        },
        {
          icon: Settings,
          title: "محترفون موثقون",
          description: "كل محترف على منصتنا تم فحص خلفيته والتحقق من بيانات اعتماده.",
          features: ["التحقق من الهوية", "فحص التراخيص", "مراجعات الأعمال السابقة", "تقييمات الأداء"]
        },
        {
          icon: FileText,
          title: "مدفوعات آمنة",
          description: "مدفوعات قائمة على المراحل مع حماية مدمجة لكلا الطرفين.",
          features: ["حماية الضمان", "تتبع المراحل", "حل النزاعات", "سجل المدفوعات"]
        },
        {
          icon: BarChart3,
          title: "تتبع كل شيء",
          description: "راقب تقدم عملك، وتواصل مع المحترفين، وأدِر المدفوعات كلها في مكان واحد.",
          features: ["تحديثات فورية", "سجل الرسائل", "توثيق الصور", "إدارة الفواتير"]
        }
      ],
      cta: "ابدأ الآن",
      contact: "كل ما تحتاجه لإيجاد المحترف المناسب"
    }
  };

  const currentContent = content[currentLanguage];

  return (
    <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-headline-1 text-ink mb-4">{currentContent.title}</h1>
          <p className="text-dek max-w-3xl mx-auto">{currentContent.subtitle}</p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {currentContent.services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-paper border border-rule rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-accent/10 p-3 rounded-lg mr-4">
                    <Icon className="text-accent" size={24} />
                  </div>
                  <h3 className="text-headline-2 text-ink">{service.title}</h3>
                </div>
                
                <p className="text-muted-foreground mb-4">{service.description}</p>
                
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-ink">
                      <ArrowRight size={16} className="text-accent mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center bg-accent/5 border border-rule rounded-lg p-12"
        >
          <h2 className="text-headline-2 text-ink mb-4">{currentContent.contact}</h2>
          <Button 
            size="lg" 
            className="font-medium"
            onClick={() => window.location.href = '/#pricing'}
          >
            {currentContent.cta}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Services;