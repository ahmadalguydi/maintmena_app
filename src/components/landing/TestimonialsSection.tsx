import { motion } from 'framer-motion';

interface TestimonialsSectionProps {
  currentLanguage: 'en' | 'ar';
}

const TestimonialsSection = ({ currentLanguage }: TestimonialsSectionProps) => {
  const content = {
    en: {
      tagline: 'TESTIMONIALS',
      headline: 'Trusted by homeowners and professionals across Saudi Arabia',
      testimonials: [
        {
          quote: 'I found a reliable AC technician in minutes.',
          author: 'Aisha',
          role: 'Homeowner',
          company: 'Riyadh'
        },
        {
          quote: 'I get real projects every week.',
          author: 'Ali',
          role: 'Contractor',
          company: 'Jeddah'
        },
        {
          quote: 'Posted once and got 5 quotes within hours.',
          author: 'Hussain',
          role: 'Developer',
          company: 'Dammam'
        },
        {
          quote: 'MaintMENA keeps me busy and growing.',
          author: 'Mohammed',
          role: 'Professional',
          company: 'Khobar'
        }
      ]
    },
    ar: {
      tagline: 'شهادات العملاء',
      headline: 'موثوق به من قبل أصحاب المنازل والمحترفين في السعودية',
      testimonials: [
        {
          quote: 'لقيت فني تكييف موثوق بدقايق.',
          author: 'عائشة',
          role: 'صاحبة منزل',
          company: 'الرياض'
        },
        {
          quote: 'تجيني مشاريع كل أسبوع والشغل ما يوقف.',
          author: 'علي',
          role: 'مقاول',
          company: 'جدة'
        },
        {
          quote: 'طلبت مرة وجاني خمس عروض بنفس اليوم.',
          author: 'حسين',
          role: 'مطور',
          company: 'الدمام'
        },
        {
          quote: 'MaintMENA تساعدني أشتغل وأنمو بثقة.',
          author: 'محمد',
          role: 'محترف',
          company: 'الخبر'
        }
      ]
    }
  };

  const lang = content[currentLanguage];

  return (
    <section className="py-20 bg-paper border-y border-rule" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 bg-accent/10 text-accent text-sm font-semibold rounded-full mb-4">
            {lang.tagline}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-ink">
            {lang.headline}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {lang.testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="bg-gradient-to-br from-muted/30 to-paper border-2 border-rule rounded-xl p-8 hover:border-accent/30 hover:shadow-xl transition-all"
            >
              <p className="text-ink mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-rule pt-4">
                <p className="font-bold text-ink">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                <p className="text-xs text-muted-foreground mt-1">{testimonial.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
