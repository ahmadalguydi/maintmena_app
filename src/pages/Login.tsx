import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Clock, Briefcase, AlertCircle, TrendingUp, Mail, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
interface LoginProps {
  currentLanguage: 'en' | 'ar';
}
const Login = ({
  currentLanguage
}: LoginProps) => {
  const {
    user,
    loading,
    signIn,
    userType
  } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Check for verification status from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const lang = params.get('lang') || 'en';
    if (verified === 'success') {
      toast({
        title: lang === 'ar' ? 'تم بنجاح' : 'Success',
        description: lang === 'ar' ? 'تم التحقق من بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.' : 'Email verified successfully! You can now sign in.'
      });
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    } else if (verified === 'expired') {
      toast({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        description: lang === 'ar' ? 'انتهت صلاحية رابط التحقق. يرجى طلب رابط جديد.' : 'Verification link expired. Please request a new one.',
        variant: 'destructive'
      });
      window.history.replaceState({}, '', '/login');
    } else if (verified === 'invalid') {
      toast({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        description: lang === 'ar' ? 'رابط التحقق غير صالح. يرجى التحقق من البريد الإلكتروني.' : 'Invalid verification link. Please check your email.',
        variant: 'destructive'
      });
      window.history.replaceState({}, '', '/login');
    }
  }, []);
  useEffect(() => {
    if (!loading && user && userType) {
      // Redirect based on user type
      if (userType === 'buyer') {
        navigate('/buyer-dashboard');
      } else if (userType === 'seller') {
        navigate('/seller-dashboard');
      } else if (userType === 'admin') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, userType, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setEmailNotConfirmed(false);
    const {
      error
    } = await signIn(email, password);
    if (error) {
      // Check if it's an email not confirmed error
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setEmailNotConfirmed(true);
      } else {
        toast({
          title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    } else {
      // signIn now handles fetching userType, wait a bit and redirect
      setTimeout(() => {
        navigate('/');
      }, 500);
    }
    setIsSubmitting(false);
  };
  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'الرجاء إدخال بريدك الإلكتروني' : 'Please enter your email',
        variant: 'destructive'
      });
      return;
    }
    setResendingEmail(true);
    try {
      // Call edge function to resend verification
      const {
        error
      } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email,
          language: currentLanguage
        }
      });
      if (error) throw error;
      toast({
        title: currentLanguage === 'ar' ? 'تم الإرسال' : 'Email Sent',
        description: currentLanguage === 'ar' ? 'تم إرسال رابط التحقق مرة أخرى. يرجى التحقق من بريدك الإلكتروني.' : 'Verification link sent! Please check your email.'
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' ? 'فشل إعادة إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.' : 'Failed to resend email. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setResendingEmail(false);
    }
  };
  const content = {
    en: {
      title: 'Welcome Back!',
      subtitle: 'Ready to dive into today\'s maintenance intelligence?',
      status: 'Successfully Signed In',
      lastLogin: 'Last login: 2 hours ago',
      dashboard: {
        title: 'Your Dashboard Snapshot',
        stats: [{
          icon: Briefcase,
          label: 'New Tenders',
          value: '12',
          change: '+3'
        }, {
          icon: Clock,
          label: 'Due Today',
          value: '5',
          change: '2 critical'
        }, {
          icon: TrendingUp,
          label: 'Success Rate',
          value: '94%',
          change: '+2%'
        }, {
          icon: AlertCircle,
          label: 'Urgent Alerts',
          value: '3',
          change: 'Act now'
        }]
      },
      weeklyBrief: {
        title: 'Weekly Intelligence Brief',
        highlights: ['Major petrochemical tender opens in UAE - $45M maintenance contract', 'New safety regulations affecting HVAC maintenance in Saudi Arabia', 'Qatar utility company extends deadline for electrical maintenance bids', 'Oil & gas sector seeing 23% increase in predictive maintenance adoption']
      },
      quickActions: {
        title: 'Quick Actions',
        actions: ['View Full Brief', 'Check Tender Alerts', 'Update Profile', 'Download Reports']
      },
      cta: {
        primary: 'Go to Dashboard',
        secondary: 'Read Weekly Brief'
      },
      emailNotVerified: 'Email Not Verified',
      emailNotVerifiedDesc: 'Please check your email and click the verification link to activate your account. You can also sign in without verification - your account will be fully activated once you verify.',
      resendVerification: 'Resend Verification Email',
      resending: 'Sending...'
    },
    ar: {
      title: 'مرحباً بعودتك!',
      subtitle: 'مستعد للغوص في معلومات الصيانة الصناعية لهذا اليوم؟',
      status: 'تم تسجيل الدخول بنجاح',
      lastLogin: 'آخر تسجيل دخول: منذ ساعتين',
      dashboard: {
        title: 'لقطة من لوحة التحكم',
        stats: [{
          icon: Briefcase,
          label: 'مناقصات جديدة',
          value: '12',
          change: '+3'
        }, {
          icon: Clock,
          label: 'مستحق اليوم',
          value: '5',
          change: '2 حرج'
        }, {
          icon: TrendingUp,
          label: 'معدل النجاح',
          value: '94%',
          change: '+2%'
        }, {
          icon: AlertCircle,
          label: 'تنبيهات عاجلة',
          value: '3',
          change: 'اتخذ إجراءً الآن'
        }]
      },
      weeklyBrief: {
        title: 'موجز المعلومات الأسبوعي',
        highlights: ['مناقصة بتروكيماوية كبرى في الإمارات - عقد صيانة بقيمة 45 مليون دولار', 'لوائح السلامة الجديدة المؤثرة على صيانة التكييف في السعودية', 'شركة مرافق قطرية تمدد موعد عطاءات صيانة الكهرباء', 'قطاع النفط والغاز يشهد زيادة 23% في اعتماد الصيانة التنبؤية']
      },
      quickActions: {
        title: 'إجراءات سريعة',
        actions: ['عرض الموجز الكامل', 'فحص تنبيهات المناقصات', 'تحديث الملف الشخصي', 'تحميل التقارير']
      },
      cta: {
        primary: 'اذهب للوحة التحكم',
        secondary: 'اقرأ موجز اليوم'
      },
      emailNotVerified: 'البريد الإلكتروني غير موثق',
      emailNotVerifiedDesc: 'يرجى التحقق من بريدك الإلكتروني والنقر على رابط التحقق لتفعيل حسابك. يمكنك أيضًا تسجيل الدخول بدون تحقق - سيتم تفعيل حسابك بالكامل بمجرد التحقق.',
      resendVerification: 'إعادة إرسال رسالة التحقق',
      resending: 'جاري الإرسال...'
    }
  };
  return <div className="min-h-screen bg-paper text-ink" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
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
      <div className="max-w-5xl mx-auto px-4">
        {/* Hero Section */}
        <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} className="text-center mb-12">
          <motion.div initial={{
            scale: 0
          }} animate={{
            scale: 1
          }} transition={{
            delay: 0.2,
            type: "spring",
            stiffness: 200
          }} className="mb-6">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-accent-foreground" />
            </div>
          </motion.div>

          <h1 className="text-headline-1 mb-4">{content[currentLanguage].title}</h1>
          <p className="text-dek mb-4">{content[currentLanguage].subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            {emailNotConfirmed && <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-ink mb-1">
                    {content[currentLanguage].emailNotVerified}
                  </h4>
                  <p className="text-sm text-byline mb-3">
                    {content[currentLanguage].emailNotVerifiedDesc}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} disabled={resendingEmail} className="w-full">
                    {resendingEmail ? content[currentLanguage].resending : content[currentLanguage].resendVerification}
                  </Button>
                </div>
              </div>
            </div>}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                {currentLanguage === 'en' ? 'Email' : 'البريد الإلكتروني'}
              </label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-ink/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-paper" placeholder={currentLanguage === 'en' ? 'your@email.com' : 'بريدك@الإلكتروني.com'} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">
                {currentLanguage === 'en' ? 'Password' : 'كلمة المرور'}
              </label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className={`w-full px-4 py-3 border border-ink/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-paper ${currentLanguage === 'ar' ? 'pl-10' : 'pr-10'}`} placeholder={currentLanguage === 'en' ? 'Enter your password' : 'أدخل كلمة المرور'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute top-1/2 -translate-y-1/2 text-ink/50 hover:text-ink ${currentLanguage === 'ar' ? 'left-3' : 'right-3'}`}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? currentLanguage === 'en' ? 'Signing in...' : 'جاري تسجيل الدخول...' : currentLanguage === 'en' ? 'Sign In' : 'تسجيل الدخول'}
            </button>
          </form>

          {/* Prominent Sign Up Card */}
          <div className="mt-8 p-6 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-ink mb-2">
                  {currentLanguage === 'en' ? 'New to MaintMENA?' : 'جديد في مينت مينا؟'}
                </h3>
                <p className="text-sm text-ink/70 mb-4">
                  {currentLanguage === 'en' ? 'Join thousands of buyers and sellers connecting on our trusted platform. Get started in minutes.' : 'انضم لآلاف المشترين والبائعين المتواصلين على منصتنا الموثوقة. ابدأ خلال دقائق.'}
                </p>
                <Link to="/signup-choice">
                  <Button variant="default" className="w-full">
                    {currentLanguage === 'en' ? 'Create Your Account' : 'أنشئ حسابك'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>


        </motion.div>
      </div>
    </main>
  </div>;
};
export default Login;