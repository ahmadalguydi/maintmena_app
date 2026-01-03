import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';

interface SignupConfirmationProps {
  currentLanguage: 'en' | 'ar';
}

const SignupConfirmation = ({ currentLanguage }: SignupConfirmationProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const userType = searchParams.get('type') as 'buyer' | 'seller' || 'buyer';

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  const content = {
    en: {
      title: 'Welcome to MaintMENA!',
      subtitle: 'Your account has been created successfully',
      verificationTitle: 'Verify Your Email',
      verificationMessage: `We've sent a verification email to:`,
      instructions: 'Please check your inbox and click the verification link to activate your account.',
      importantNote: 'Important:',
      note: 'You won\'t be able to sign in until your email is verified.',
      tips: {
        title: 'While you wait, here\'s what you can do:',
        items: userType === 'buyer' ? [
          'Explore available service providers',
          'Review pricing plans',
          'Read our maintenance guides'
        ] : [
          'Complete your vendor profile',
          'Review job opportunities',
          'Explore our resources'
        ]
      },
      buttons: {
        login: 'Go to Login',
        explore: 'Explore Platform'
      },
      spam: 'Didn\'t receive the email? Check your spam folder.'
    },
    ar: {
      title: 'مرحباً بك في MaintMENA!',
      subtitle: 'تم إنشاء حسابك بنجاح',
      verificationTitle: 'تحقق من بريدك الإلكتروني',
      verificationMessage: 'لقد أرسلنا رسالة تحقق إلى:',
      instructions: 'يرجى التحقق من صندوق الوارد والنقر على رابط التحقق لتفعيل حسابك.',
      importantNote: 'مهم:',
      note: 'لن تتمكن من تسجيل الدخول حتى يتم التحقق من بريدك الإلكتروني.',
      tips: {
        title: 'أثناء الانتظار، يمكنك:',
        items: userType === 'buyer' ? [
          'استكشاف مقدمي الخدمات المتاحين',
          'مراجعة خطط التسعير',
          'قراءة أدلة الصيانة'
        ] : [
          'إكمال ملف المورد الخاص بك',
          'مراجعة فرص العمل',
          'استكشاف مواردنا'
        ]
      },
      buttons: {
        login: 'الانتقال لتسجيل الدخول',
        explore: 'استكشاف المنصة'
      },
      spam: 'لم تستلم البريد الإلكتروني؟ تحقق من مجلد البريد العشوائي.'
    }
  };

  const t = content[currentLanguage];

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4" 
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t.title}
            </CardTitle>
            <p className="text-muted-foreground mt-2">{t.subtitle}</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Email Verification Section */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{t.verificationTitle}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.verificationMessage}</p>
                </div>
              </div>
              
              <div className="bg-background/80 backdrop-blur rounded-lg p-4">
                <p className="text-center font-mono text-sm text-foreground break-all">
                  {email}
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {t.instructions}
              </p>
            </div>

            {/* Important Note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-semibold text-amber-700 dark:text-amber-400">{t.importantNote}</span>{' '}
                <span className="text-muted-foreground">{t.note}</span>
              </p>
            </div>

            {/* Tips Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">{t.tips.title}</h4>
              <ul className="space-y-2">
                {t.tips.items.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: currentLanguage === 'ar' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Spam Notice */}
            <p className="text-xs text-center text-muted-foreground italic">
              {t.spam}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={() => navigate('/login')} 
                className="flex-1 gap-2"
                size="lg"
              >
                {t.buttons.login}
                <ArrowRight className={`w-4 h-4 ${currentLanguage === 'ar' ? 'rotate-180' : ''}`} />
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {t.buttons.explore}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SignupConfirmation;
