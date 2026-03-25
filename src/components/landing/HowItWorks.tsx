import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileCheck, Wrench, Briefcase, UserCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HowItWorksProps {
  currentLanguage: 'en' | 'ar';
}

const HowItWorks = ({ currentLanguage }: HowItWorksProps) => {
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');

  const content = {
    en: {
      tagline: 'HOW IT WORKS',
      headline: 'Three simple steps to get started',
      buyerTab: 'I need a service',
      sellerTab: 'I provide a service',
      buyer: [
        {
          icon: Search,
          title: 'Post Your Request',
          description: 'Tell us what you need. Repair, renovation, or new construction.'
        },
        {
          icon: FileCheck,
          title: 'Compare Verified Professionals',
          description: 'Get quotes and reviews. Choose what fits you best.'
        },
        {
          icon: Wrench,
          title: 'Book and Relax',
          description: 'Book instantly and track every step until the job is done.'
        }
      ],
      seller: [
        {
          icon: Briefcase,
          title: 'Create Your Profile',
          description: 'Set up your professional profile with your services, rates, and portfolio. Get verified.'
        },
        {
          icon: UserCheck,
          title: 'Receive Job Requests Instantly',
          description: 'Get notified of relevant projects in your area. Submit quotes and connect with clients directly.'
        },
        {
          icon: TrendingUp,
          title: 'Deliver, Get Reviewed, & Grow',
          description: 'Complete jobs, earn 5-star reviews, and build your reputation. Grow your business steadily.'
        }
      ]
    },
    ar: {
      tagline: 'كيف تعمل المنصة',
      headline: 'ثلاث خطوات بسيطة للبدء',
      buyerTab: 'أحتاج خدمة',
      sellerTab: 'أقدم خدمة',
      buyer: [
        {
          icon: Search,
          title: 'اكتب وش تحتاج',
          description: 'صيانة أو ترميم أو بناء جديد'
        },
        {
          icon: FileCheck,
          title: 'قارِن بين المحترفين',
          description: 'تجيك عروض وأسعار من محترفين موثوقين'
        },
        {
          icon: Wrench,
          title: 'احجز وارتاح',
          description: 'احجز على طول وتابع الشغل خطوة بخطوة'
        }
      ],
      seller: [
        {
          icon: Briefcase,
          title: 'انشئ ملفك الشخصي',
          description: 'جهز ملفك الاحترافي مع خدماتك، أسعارك، وأعمالك السابقة. احصل على التوثيق.'
        },
        {
          icon: UserCheck,
          title: 'استقبل طلبات فورية',
          description: 'احصل على إشعارات بالمشاريع المناسبة في منطقتك. قدّم عروضك وتواصل مع العملاء مباشرة.'
        },
        {
          icon: TrendingUp,
          title: 'سلّم، احصل على مراجعات، ونمّي',
          description: 'أكمل المشاريع، اكسب تقييمات 5 نجوم، وابني سمعتك. نمّي عملك بثبات.'
        }
      ]
    }
  };

  const lang = content[currentLanguage];
  const steps = activeTab === 'buyer' ? lang.buyer : lang.seller;

  return (
    <section id="how-it-works" className="py-20 bg-muted/30 border-y border-rule" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full mb-4">
            {lang.tagline}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-ink mb-8">
            {lang.headline}
          </h2>

          {/* Toggle Tabs */}
          <div className="inline-flex gap-2 p-1 bg-paper rounded-lg border border-rule/40 shadow-sm">
            <Button
              variant={activeTab === 'buyer' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('buyer')}
              className="rounded-md"
            >
              {lang.buyerTab}
            </Button>
            <Button
              variant={activeTab === 'seller' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('seller')}
              className="rounded-md"
            >
              {lang.sellerTab}
            </Button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={`${activeTab}-${index}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 mb-6">
                  <Icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-ink">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
