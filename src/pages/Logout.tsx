import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Shield, BookOpen, Mail, Coffee } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface LogoutProps {
  currentLanguage: 'en' | 'ar';
}

const Logout = ({ currentLanguage }: LogoutProps) => {
  const content = {
    en: {
      title: 'You\'ve Been Signed Out',
      subtitle: 'Thanks for staying informed with MaintMENA',
      message: 'Your session has been securely ended. All your data remains safe and your preferences are saved for next time.',
      sessionSummary: {
        title: 'Session Summary',
        stats: [
          { label: 'Tenders Reviewed', value: '8' },
          { label: 'Time Spent', value: '23 min' },
          { label: 'Briefs Read', value: '2' },
          { label: 'Alerts Checked', value: '5' }
        ]
      },
      whileAway: {
        title: 'While You\'re Away',
        items: [
          {
            icon: Mail,
            title: 'Stay Connected',
            description: 'We\'ll keep monitoring for opportunities and send weekly briefs to your inbox'
          },
          {
            icon: Shield,
            title: 'Secure Access',
            description: 'Your account is protected. Sign back in anytime to access your personalized dashboard'
          },
          {
            icon: BookOpen,
            title: 'Knowledge Base',
            description: 'Explore our free resources on maintenance best practices and industry trends'
          },
          {
            icon: Coffee,
            title: 'Take a Break',
            description: 'Industrial maintenance never stops, but you should. We\'ve got you covered while you recharge'
          }
        ]
      },
      resources: {
        title: 'Free Resources',
        links: [
          'Maintenance Planning Guide',
          'MENA Industrial Report 2024',
          'Tender Preparation Checklist',
          'Safety Compliance Updates'
        ]
      },
      cta: {
        primary: 'Sign Back In',
        secondary: 'Browse Resources',
        tertiary: 'Contact Support'
      }
    },
    ar: {
      title: 'تم تسجيل خروجك',
      subtitle: 'شكراً لك على البقاء مطلعاً مع MaintMENA',
      message: 'تم إنهاء جلستك بأمان. جميع بياناتك محفوظة وتفضيلاتك محفوظة للمرة القادمة.',
      sessionSummary: {
        title: 'ملخص الجلسة',
        stats: [
          { label: 'مناقصات تمت مراجعتها', value: '8' },
          { label: 'الوقت المقضي', value: '23 دقيقة' },
          { label: 'موجزات مقروءة', value: '2' },
          { label: 'تنبيهات تم فحصها', value: '5' }
        ]
      },
      whileAway: {
        title: 'بينما أنت بعيد',
        items: [
          {
            icon: Mail,
            title: 'ابق متصلاً',
            description: 'سنستمر في مراقبة الفرص وإرسال الموجزات اليومية إلى صندوق بريدك'
          },
          {
            icon: Shield,
            title: 'وصول آمن',
            description: 'حسابك محمي. سجل الدخول في أي وقت للوصول إلى لوحة التحكم المخصصة لك'
          },
          {
            icon: BookOpen,
            title: 'قاعدة المعرفة',
            description: 'استكشف مواردنا المجانية حول أفضل ممارسات الصيانة واتجاهات الصناعة'
          },
          {
            icon: Coffee,
            title: 'خذ استراحة',
            description: 'الصيانة الصناعية لا تتوقف، لكن يجب أن تستريح أنت. نحن نغطيك بينما تعيد شحن طاقتك'
          }
        ]
      },
      resources: {
        title: 'الموارد المجانية',
        links: [
          'دليل تخطيط الصيانة',
          'تقرير الصناعة في الشرق الأوسط وشمال أفريقيا 2024',
          'قائمة فحص إعداد المناقصات',
          'تحديثات الامتثال للسلامة'
        ]
      },
      cta: {
        primary: 'تسجيل الدخول مرة أخرى',
        secondary: 'تصفح الموارد',
        tertiary: 'اتصل بالدعم'
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
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <div className="w-16 h-16 bg-muted border-2 border-rule rounded-full flex items-center justify-center mx-auto">
                <LogOut className="w-8 h-8 text-muted-foreground" />
              </div>
            </motion.div>
            
            <h1 className="text-headline-1 mb-4">{content[currentLanguage].title}</h1>
            <p className="text-dek mb-6">{content[currentLanguage].subtitle}</p>
            
            <div className="bg-muted/30 border border-rule p-4 rounded-md max-w-2xl mx-auto">
              <p className="text-muted-foreground">
                {content[currentLanguage].message}
              </p>
            </div>
          </motion.div>

          {/* Session Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-headline-2 text-center mb-8">
              {content[currentLanguage].sessionSummary.title}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {content[currentLanguage].sessionSummary.stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center p-4 border border-rule rounded-lg"
                >
                  <div className="text-2xl font-display font-bold text-accent-2 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* While Away Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-headline-2 text-center mb-8">
              {content[currentLanguage].whileAway.title}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {content[currentLanguage].whileAway.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex gap-4 p-6 border border-rule rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <item.icon className="w-6 h-6 text-accent-2" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Free Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12 bg-muted/20 rounded-lg p-8 border border-rule"
          >
            <h2 className="text-headline-2 text-center mb-6">
              {content[currentLanguage].resources.title}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {content[currentLanguage].resources.links.map((link, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  <Button variant="ghost" className="w-full justify-start text-sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {link}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center space-y-4"
          >
            <div className="space-x-4">
              <Link to="/login">
                <Button size="lg">
                  {content[currentLanguage].cta.primary}
                </Button>
              </Link>
              <Link to="/resources">
                <Button variant="outline" size="lg">
                  {content[currentLanguage].cta.secondary}
                </Button>
              </Link>
            </div>
            <div>
              <Link to="/support">
                <Button variant="link" size="sm">
                  {content[currentLanguage].cta.tertiary}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Logout;