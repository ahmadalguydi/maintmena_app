import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPasswordProps {
  currentLanguage?: 'en' | 'ar';
  onToggle?: () => void;
}

export const ForgotPassword = ({ currentLanguage: propLang, onToggle }: ForgotPasswordProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const currentLanguage = propLang || (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(currentLanguage === 'ar' ? 'الرجاء إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/app/onboarding/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل إرسال رابط إعادة التعيين' : 'Failed to send reset link');
      return;
    }

    toast.success(currentLanguage === 'ar' ? 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني' : 'Reset link sent to your email');
    navigate('/app/onboarding/login');
  };

  return (
    <div className="min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={currentLanguage === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password'}
        subtitle={currentLanguage === 'ar' ? 'سنرسل لك رابط إعادة التعيين' : "We'll send you a reset link"}
        showBack
        rightAction={
          onToggle && (
            <Button variant="ghost" size="sm" onClick={onToggle} className="text-sm">
              {currentLanguage === 'ar' ? 'English' : 'عربي'}
            </Button>
          )
        }
      />

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-full bg-primary/10">
              <Mail className="w-12 h-12 text-primary" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">
                {currentLanguage === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={currentLanguage === 'ar' ? 'example@email.com' : 'example@email.com'}
                className="text-lg h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading
                ? (currentLanguage === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                : (currentLanguage === 'ar' ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link')}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/app/onboarding/login')}
              >
                {currentLanguage === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
