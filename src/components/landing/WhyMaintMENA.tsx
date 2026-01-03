import { motion } from 'framer-motion';
import { Shield, Zap, Clock } from 'lucide-react';

interface WhyMaintMENAProps {
  currentLanguage: 'en' | 'ar';
}

const WhyMaintMENA = ({ currentLanguage }: WhyMaintMENAProps) => {
  const content = {
    en: {
      tagline: 'WHY MAINTMENA',
      headline: 'One platform that serves both sides with real results.',
      subheadline: 'Every professional is verified and every client is credible. You get trusted service and consistent work without guesswork or hassle.',
      reasons: [
        {
          icon: Shield,
          title: 'Trust & Verification',
          description: 'Every professional is vetted and reviewed for quality.'
        },
        {
          icon: Zap,
          title: 'Simplicity',
          description: 'Post, compare, book, and track. Everything from one place.'
        },
        {
          icon: Clock,
          title: 'Speed',
          description: 'Get responses and new projects within hours, not days.'
        }
      ]
    },
    ar: {
      tagline: 'لماذا MAINTMENA',
      headline: 'منصة وحدة تخدم الطرفين وتعطي نتائج حقيقية',
      subheadline: 'كل محترف موثوق وكل عميل مؤكد. خدمات حقيقية وشغل مضمون بدون تعب ولا تعقيد.',
      reasons: [
        {
          icon: Shield,
          title: 'الثقة والتوثيق',
          description: 'كل محترف يتم التحقق منه وتقييمه حسب الجودة.'
        },
        {
          icon: Zap,
          title: 'البساطة',
          description: 'بكل بساطة اطلب وقارن واحجز وتابع كل شيء من مكان واحد.'
        },
        {
          icon: Clock,
          title: 'السرعة',
          description: 'ردود ومشاريع جديدة توصلك خلال ساعات مو أيام.'
        }
      ]
    }
  };

  const lang = content[currentLanguage];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-paper to-muted/20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            {lang.tagline}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-ink">
            {lang.headline}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {lang.reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-paper rounded-xl p-8 border border-rule/40 hover:border-accent/40 transition-all hover:shadow-lg"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 mb-5">
                  <Icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-ink">
                  {reason.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyMaintMENA;
