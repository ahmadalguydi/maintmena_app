import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { toast } from 'sonner';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';
import { supabase } from '@/integrations/supabase/client';

export const OTPVerification = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const currentLanguage = (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';
  const { containerStyle, isKeyboardVisible } = useKeyboardAvoidance();

  // Redirect if email is missing (e.g., page refresh losing location.state)
  useEffect(() => {
    if (!email) {
      toast.error(
        currentLanguage === 'ar'
          ? 'البريد الإلكتروني مفقود. يرجى إعادة التسجيل.'
          : 'Email address is missing. Please sign up again.'
      );
      navigate('/app/onboarding/signup', { replace: true });
    }
  }, [email, navigate, currentLanguage]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error(currentLanguage === 'ar' ? 'الرجاء إدخال الرمز كاملاً' : 'Please enter the complete code');
      return;
    }

    if (!email) {
      toast.error(currentLanguage === 'ar' ? 'البريد الإلكتروني مفقود' : 'Email address is missing');
      navigate('/app/onboarding/signup');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    setIsLoading(false);

    if (error) {
      toast.error(
        currentLanguage === 'ar'
          ? 'رمز التحقق غير صحيح أو منتهي الصلاحية'
          : 'Invalid or expired code'
      );
      return;
    }

    toast.success(currentLanguage === 'ar' ? 'تم التحقق بنجاح' : 'Verified successfully');
    navigate('/app/signup-success');
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    const { error } = await supabase.auth.resend({ type: 'signup', email });

    if (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل إعادة الإرسال' : 'Failed to resend code');
      return;
    }

    toast.success(currentLanguage === 'ar' ? 'تم إرسال الرمز مجدداً' : 'Code resent');
    setResendCooldown(60);
  };

  return (
    <div
      className={`min-h-full bg-background ${isKeyboardVisible ? 'pb-4' : 'pb-safe-or-4'}`}
      style={containerStyle}
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <GradientHeader
        title={currentLanguage === 'ar' ? 'التحقق من البريد' : 'Email Verification'}
        subtitle={currentLanguage === 'ar' ? `أرسلنا رمزاً إلى ${email}` : `We sent a code to ${email}`}
        showBack
      />

      <div className="p-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="mb-6">
            <div className="text-6xl mb-2">📧</div>
          </div>

          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            className="justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            {currentLanguage === 'ar'
              ? 'أدخل الرمز المكون من 6 أرقام'
              : 'Enter the 6-digit code'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading
              ? (currentLanguage === 'ar' ? 'جاري التحقق...' : 'Verifying...')
              : (currentLanguage === 'ar' ? 'تحقق' : 'Verify')}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {currentLanguage === 'ar' ? 'لم تستلم الرمز؟' : "Didn't receive the code?"}
            </p>
            <Button
              variant="link"
              onClick={handleResend}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0
                ? (currentLanguage === 'ar' ? `إعادة الإرسال (${resendCooldown}ث)` : `Resend (${resendCooldown}s)`)
                : (currentLanguage === 'ar' ? 'إعادة الإرسال' : 'Resend Code')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
