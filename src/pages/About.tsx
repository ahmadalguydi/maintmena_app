import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, LinkedinIcon, Users, Target, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AboutProps {
  currentLanguage: 'en' | 'ar';
}

const About = ({ currentLanguage }: AboutProps) => {
  const content = {
    en: {
      title: 'About MaintMENA',
      subtitle: 'Connecting Homeowners & Contractors Across MENA',
      mission: {
        title: 'Our Mission',
        text: 'Connect homeowners and project managers with trusted service professionals across MENA. From fixing a tap to delivering a full fit-out—fast, verified, and hassle-free.'
      },
      story: {
        title: 'Our Story',
        text: 'Founded by a team frustrated with unreliable contractors and endless WhatsApp hunting. Whether you\'re a homeowner with a leak or a developer with a deadline, we built MaintMENA to make finding the right pro simple, fast, and trustworthy.'
      },
      values: [
        {
          icon: Target,
          title: 'Trust, Not Guesswork',
          description: 'Verified pros with real reviews, portfolios, and transparent pricing.'
        },
        {
          icon: Globe,
          title: 'Built for MENA',
          description: 'Arabic + English, local categories, regional standards, cultural understanding.'
        },
        {
          icon: Users,
          title: 'Faster Starts',
          description: 'Post once, compare quotes, book with confidence. No more endless searching.'
        }
      ],
      team: {
        title: 'Our Team',
        members: [
          {
            name: 'Experienced Team',
            role: 'Co-Founders',
            background: 'Background in home services, construction management, and marketplace platforms',
            location: 'Dubai, UAE'
          },
          {
            name: 'Regional Experts',
            role: 'Operations',
            background: 'Deep understanding of MENA construction and home service markets',
            location: 'Riyadh, KSA'
          },
          {
            name: 'Tech & Product',
            role: 'Technology',
            background: 'Building tools that make hiring contractors simple and reliable',
            location: 'Cairo, Egypt'
          }
        ]
      },
      stats: [
        { number: '10,000+', label: 'Jobs Posted' },
        { number: '5,000+', label: 'Verified Pros' },
        { number: '50+', label: 'Cities Covered' },
        { number: '4.8★', label: 'Average Rating' }
      ],
      cta: {
        title: 'Ready to Get Started?',
        subtitle: 'Join thousands of homeowners and contractors using MaintMENA to get work done right.',
        button: 'Get Started'
      }
    },
    ar: {
      title: 'حول MaintMENA',
      subtitle: 'نربط أصحاب المنازل بالمقاولين في منطقة الشرق الأوسط',
      mission: {
        title: 'مهمتنا',
        text: 'ربط أصحاب المنازل ومديري المشاريع بمزودي خدمات موثوقين في الشرق الأوسط. من إصلاح صنبور إلى تسليم مشروع كامل—سريع، موثق، وبدون تعقيدات.'
      },
      story: {
        title: 'قصتنا',
        text: 'تأسست من قبل فريق محبط من المقاولين غير الموثوقين والبحث اللانهائي في الواتساب. سواء كنت صاحب منزل لديك تسريب أو مطور لديه موعد نهائي، بنينا MaintMENA لجعل إيجاد المحترف المناسب بسيطاً وسريعاً وموثوقاً.'
      },
      values: [
        {
          icon: Target,
          title: 'ثقة، بدون تخمين',
          description: 'محترفون موثقون مع تقييمات حقيقية وملفات عمل وأسعار شفافة.'
        },
        {
          icon: Globe,
          title: 'مصمم للشرق الأوسط',
          description: 'عربي + إنجليزي، فئات محلية، معايير إقليمية، فهم ثقافي.'
        },
        {
          icon: Users,
          title: 'بدايات أسرع',
          description: 'انشر مرة، قارن العروض، احجز بثقة. لا مزيد من البحث اللانهائي.'
        }
      ],
      team: {
        title: 'فريقنا',
        members: [
          {
            name: 'فريق ذو خبرة',
            role: 'المؤسسون',
            background: 'خبرة في خدمات المنازل وإدارة المشاريع ومنصات السوق',
            location: 'دبي، الإمارات'
          },
          {
            name: 'خبراء إقليميون',
            role: 'العمليات',
            background: 'فهم عميق لأسواق البناء والخدمات المنزلية في الشرق الأوسط',
            location: 'الرياض، السعودية'
          },
          {
            name: 'التقنية والمنتج',
            role: 'التكنولوجيا',
            background: 'بناء أدوات تجعل توظيف المقاولين بسيطاً وموثوقاً',
            location: 'القاهرة، مصر'
          }
        ]
      },
      stats: [
        { number: '10,000+', label: 'وظيفة منشورة' },
        { number: '5,000+', label: 'محترف موثق' },
        { number: '50+', label: 'مدينة مغطاة' },
        { number: '4.8★', label: 'متوسط التقييم' }
      ],
      cta: {
        title: 'مستعد للبدء؟',
        subtitle: 'انضم لآلاف أصحاب المنازل والمقاولين الذين يستخدمون MaintMENA لإنجاز العمل بشكل صحيح.',
        button: 'ابدأ الآن'
      }
    }
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
        <div className="max-w-4xl mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-headline-1 mb-4">{content[currentLanguage].title}</h1>
            <p className="text-dek">{content[currentLanguage].subtitle}</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-y border-rule py-8"
          >
            {content[currentLanguage].stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-display font-bold text-accent-2 mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Mission & Story */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-headline-2 mb-4">{content[currentLanguage].mission.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {content[currentLanguage].mission.text}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-headline-2 mb-4">{content[currentLanguage].story.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {content[currentLanguage].story.text}
              </p>
            </motion.div>
          </div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <div className="grid md:grid-cols-3 gap-8">
              {content[currentLanguage].values.map((value, index) => (
                <div key={index} className="text-center p-6 border border-rule rounded-lg">
                  <value.icon className="w-8 h-8 text-accent-2 mx-auto mb-4" />
                  <h3 className="text-xl font-display font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-16"
          >
            <h2 className="text-headline-2 text-center mb-12">
              {content[currentLanguage].team.title}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {content[currentLanguage].team.members.map((member, index) => (
                <div key={index} className="text-center">
                  <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-display font-semibold mb-1">{member.name}</h3>
                  <p className="text-accent-2 font-medium mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground mb-1">{member.background}</p>
                  <p className="text-xs text-muted-foreground">{member.location}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center bg-muted/30 rounded-lg p-12"
          >
            <h2 className="text-headline-2 mb-4">{content[currentLanguage].cta.title}</h2>
            <p className="text-dek mb-8">{content[currentLanguage].cta.subtitle}</p>
            <Link to="/">
              <Button size="lg">{content[currentLanguage].cta.button}</Button>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default About;