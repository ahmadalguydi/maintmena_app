import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useKeyboardAvoidance } from '@/hooks/useKeyboardAvoidance';

interface ResetPasswordProps {
  currentLanguage?: 'en' | 'ar';
  onToggle?: () => void;
}

export const ResetPassword = ({ currentLanguage: propLang, onToggle }: ResetPasswordProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(true);
  const navigate = useNavigate();
  const currentLanguage = propLang || (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';
  const { containerStyle, isKeyboardVisible } = useKeyboardAvoidance();

  // Check for valid recovery session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setHasValidSession(false);
        toast.error(
          currentLanguage === 'ar'
            ? 'رابط إعادة التعيين غير صالح أو منتهي. يرجى طلب رابط جديد.'
            : 'Reset link is invalid or expired. Please request a new one.'
        );
      }
    });
  }, [currentLanguage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(currentLanguage === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }

    // Enforce same password strength as signup
    if (!/[A-Z]/.test(password)) {
      toast.error(currentLanguage === 'ar' ? 'يجب أن تحتوي على حرف كبير' : 'Must contain an uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast.error(currentLanguage === 'ar' ? 'يجب أن تحتوي على حرف صغير' : 'Must contain a lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error(currentLanguage === 'ar' ? 'يجب أن تحتوي على رقم' : 'Must contain a number');
      return;
    }

    if (password !== confirmPassword) {
      toast.error(currentLanguage === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('session') || errorMsg.includes('token') || errorMsg.includes('expired')) {
        toast.error(currentLanguage === 'ar' ? 'انتهت صلاحية الرابط. يرجى طلب رابط جديد.' : 'Link expired. Please request a new reset link.');
      } else {
        toast.error(currentLanguage === 'ar' ? 'فشل تحديث كلمة المرور' : 'Failed to update password');
      }
      return;
    }

    toast.success(currentLanguage === 'ar' ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
    navigate('/app/onboarding/login');
  };

  return (
    <div
      className={`min-h-full overflow-y-auto bg-background ${isKeyboardVisible ? 'pb-4' : 'pb-safe-or-4'}`}
      style={containerStyle}
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <GradientHeader
        title={currentLanguage === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
        subtitle={currentLanguage === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter your new password'}
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
              <Lock className="w-12 h-12 text-primary" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">
                {currentLanguage === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`text-lg h-12 ${currentLanguage === 'ar' ? 'pl-12' : 'pr-12'}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${currentLanguage === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {currentLanguage === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`text-lg h-12 ${currentLanguage === 'ar' ? 'pl-12' : 'pr-12'}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${currentLanguage === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2`}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !hasValidSession}
              className="w-full"
              size="lg"
            >
              {isLoading
                ? (currentLanguage === 'ar' ? 'جاري التحديث...' : 'Updating...')
                : (currentLanguage === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
