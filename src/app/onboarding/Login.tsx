import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  currentLanguage: 'en' | 'ar';
  onToggle: () => void;
}

export const Login = ({ currentLanguage, onToggle }: LoginProps) => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const content = {
    en: {
      title: 'Welcome Back',
      subtitle: 'Sign in to continue',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign In',
      noAccount: "Don't have an account?",
      signUp: 'Get Started',
      forgot: 'Forgot password?'
    },
    ar: {
      title: 'مرحبًا بعودتك',
      subtitle: 'سجل الدخول للمتابعة',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      signIn: 'تسجيل الدخول',
      noAccount: 'ليس لديك حساب؟',
      signUp: 'إبدأ الان',
      forgot: 'نسيت كلمة المرور؟'
    }
  };

  const t = content[currentLanguage];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password, currentLanguage);

    if (!error) {
      // Check for pending action and redirect accordingly
      const pendingActionStr = localStorage.getItem('pendingAction');
      if (pendingActionStr) {
        try {
          const pendingAction = JSON.parse(pendingActionStr);
          // Clear the pending action flag but keep form data
          localStorage.removeItem('pendingAction');

          if (pendingAction.type === 'booking' && pendingAction.returnPath) {
            // Redirect to vendor profile to continue booking
            navigate(pendingAction.returnPath);
            setLoading(false);
            return;
          } else if (pendingAction.type === 'request') {
            // Redirect to post request to continue
            navigate('/app/buyer/requests/new');
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse pending action');
        }
      }

      // Default redirect based on user type
      setTimeout(() => {
        const userType = localStorage.getItem('userType');
        if (userType === 'seller') {
          navigate('/app/seller/home');
        } else {
          navigate('/app/buyer/home');
        }
      }, 500);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header with Back Button and Language Toggle */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/app/onboarding/role-selection')}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft size={20} />
        </button>

        <Button variant="ghost" size="sm" onClick={onToggle} className="text-sm">
          {currentLanguage === 'ar' ? 'English' : 'عربي'}
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.password}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-12 text-base ${currentLanguage === 'ar' ? 'pl-10' : 'pr-10'}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${currentLanguage === 'ar' ? 'left-3' : 'right-3'}`}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={loading}
          >
            {loading ? '...' : t.signIn}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/app/onboarding/forgot-password')}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.forgot}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t.noAccount}{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate('/app/onboarding/role-selection')}
            >
              {t.signUp}
            </Button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
