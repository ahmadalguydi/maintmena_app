import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { toast } from 'sonner';

export const OTPVerification = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const currentLanguage = (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error(currentLanguage === 'ar' ? 'الرجاء إدخال الرمز كاملاً' : 'Please enter the complete code');
      return;
    }

    setIsLoading(true);
    // TODO: Implement OTP verification logic
    setTimeout(() => {
      setIsLoading(false);
      toast.success(currentLanguage === 'ar' ? 'تم التحقق بنجاح' : 'Verified successfully');
      navigate('/app/signup-success');
    }, 1500);
  };

  const handleResend = () => {
    toast.success(currentLanguage === 'ar' ? 'تم إرسال الرمز مجدداً' : 'Code resent');
    // TODO: Implement resend logic
  };

  return (
    <div className="min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
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
            <Button variant="link" onClick={handleResend}>
              {currentLanguage === 'ar' ? 'إعادة الإرسال' : 'Resend Code'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
