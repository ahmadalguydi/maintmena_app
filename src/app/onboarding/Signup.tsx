import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/contexts/RoleContext';
import { ArrowLeft, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { ProgressBar } from '@/components/mobile/ProgressBar';
import { signupSchema } from '@/lib/validationSchemas';
import { handleError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { LanguageToggle } from '@/components/mobile/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';

interface SignupProps {
  currentLanguage: 'en' | 'ar';
  onToggle: () => void;
}

export const Signup = ({ currentLanguage, onToggle }: SignupProps) => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { intendedRole } = useRole();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    accountType: 'individual' as 'company' | 'individual',
    email: '',
    phone: '',
    companyName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const content = {
    en: {
      step1: { title: 'Basic Info', name: 'Full Name', type: 'Account Type', individual: 'Individual', company: 'Company' },
      step2: { title: 'Contact', email: 'Email', phone: 'Phone', companyName: 'Company Name', optional: 'optional' },
      step3: { title: 'Password', password: 'Password', confirm: 'Confirm Password' },
      next: 'Next',
      back: 'Back',
      signUp: 'Get Started',
      hasAccount: 'Already have an account?',
      signIn: 'Sign In',
      passwordHints: {
        minLength: 'At least 8 characters',
        uppercase: 'One uppercase letter',
        lowercase: 'One lowercase letter',
        number: 'One number'
      }
    },
    ar: {
      step1: { title: 'معلومات أساسية', name: 'الاسم الكامل', type: 'نوع الحساب', individual: 'فرد', company: 'شركة' },
      step2: { title: 'معلومات التواصل', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', companyName: 'اسم الشركة', optional: 'اختياري' },
      step3: { title: 'كلمة المرور', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور' },
      next: 'التالي',
      back: 'رجوع',
      signUp: 'إبدأ الان',
      hasAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
      passwordHints: {
        minLength: '٨ أحرف على الأقل',
        uppercase: 'حرف كبير واحد',
        lowercase: 'حرف صغير واحد',
        number: 'رقم واحد'
      }
    }
  };

  const t = content[currentLanguage];

  const handleNext = () => {
    // Stage Validation
    if (step === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        toast.error(
          currentLanguage === 'ar'
            ? 'الاسم الكامل مطلوب (حرفين على الأقل)'
            : 'Full name is required (at least 2 characters)',
          { className: currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : "" }
        );
        return;
      }

      // Check for invalid characters (numbers, special symbols)
      const nameRegex = /^[a-zA-Z\u0600-\u06FF\s\-'.]+$/;
      if (!nameRegex.test(formData.name.trim())) {
        toast.error(
          currentLanguage === 'ar'
            ? 'الاسم يحتوي على رموز غير صالحة'
            : 'Name contains invalid characters',
          { className: currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : "" }
        );
        return;
      }
    }

    if (step === 2) {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error(
          currentLanguage === 'ar'
            ? 'البريد الإلكتروني غير صحيح'
            : 'Invalid email address',
          { className: currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : "" }
        );
        return;
      }

      if (formData.accountType === 'company' && !formData.companyName.trim()) {
        toast.error(
          currentLanguage === 'ar'
            ? 'اسم الشركة مطلوب'
            : 'Company name is required',
          { className: currentLanguage === 'ar' ? "font-['Noto_Sans_Arabic']" : "" }
        );
        return;
      }
    }

    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/app/onboarding/role-selection');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data with Zod
    try {
      signupSchema.parse(formData);
    } catch (error) {
      toast.error(handleError(error, 'Signup Validation'));
      return;
    }

    setLoading(true);

    // Auto-assign free plan for buyers
    const metadata: any = {
      full_name: formData.name,
      phone: formData.phone,
      user_type: intendedRole || 'buyer',
      buyer_type: formData.accountType,
      company_name: formData.companyName || undefined,
      original_language: currentLanguage
    };

    // Add subscription plan for buyers (auto-free)
    if (intendedRole === 'buyer') {
      metadata.subscription_plan = 'free';
    }

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.name,
      intendedRole || 'buyer',
      formData.phone,
      formData.companyName || undefined,
      formData.accountType,
      currentLanguage
    );

    if (!error) {
      // Sync pending guest address if exists
      try {
        const pendingAddressStr = localStorage.getItem('pendingGuestAddress');
        if (pendingAddressStr) {
          const pendingAddress = JSON.parse(pendingAddressStr);
          // Get the newly created user
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser && pendingAddress.city && pendingAddress.full_address) {
            await supabase
              .from('user_addresses')
              .insert({
                user_id: newUser.id,
                label: currentLanguage === 'ar' ? 'عنوان جديد' : 'New Address',
                city: pendingAddress.city,
                full_address: pendingAddress.full_address,
                is_default: true
              });
          }
          localStorage.removeItem('pendingGuestAddress');
        }
      } catch (e) {
        console.error('Failed to sync guest address:', e);
      }

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
            return;
          } else if (pendingAction.type === 'request') {
            // Redirect to post request to continue
            navigate('/app/buyer/requests/new');
            return;
          }
        } catch (e) {
          console.error('Failed to parse pending action');
        }
      }
      navigate('/app/signup-success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header with Back Button and Language Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-muted-foreground">
          <ArrowLeft size={20} />
        </button>

        <LanguageToggle language={currentLanguage} onToggle={onToggle} />
      </div>

      <ProgressBar value={(step / 3) * 100} size="sm" className="mb-6" />

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
      >
        <h2 className="text-2xl font-bold mb-6">
          {step === 1 && t.step1.title}
          {step === 2 && t.step2.title}
          {step === 3 && t.step3.title}
        </h2>

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>{t.step1.name}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t.step1.type}</Label>
                <RadioGroup
                  value={formData.accountType}
                  onValueChange={(value: any) => setFormData({ ...formData, accountType: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual">{t.step1.individual}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="company" />
                    <Label htmlFor="company">{t.step1.company}</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>{t.step2.email}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {t.step2.phone}{' '}
                  <span className="text-muted-foreground text-xs">({t.step2.optional})</span>
                </Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+\-]/g, '');
                    setFormData({ ...formData, phone: value });
                  }}
                  placeholder="+966"
                  className="h-12 text-base"
                />
              </div>

              {formData.accountType === 'company' && (
                <div className="space-y-2">
                  <Label>{t.step2.companyName}</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>{t.step3.password}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                {formData.password && (
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {formData.password.length >= 8 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{t.passwordHints.minLength}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/[A-Z]/.test(formData.password) ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{t.passwordHints.uppercase}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/[a-z]/.test(formData.password) ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{t.passwordHints.lowercase}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {/[0-9]/.test(formData.password) ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{t.passwordHints.number}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t.step3.confirm}</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`h-12 text-base ${currentLanguage === 'ar' ? 'pl-10' : 'pr-10'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${currentLanguage === 'ar' ? 'left-3' : 'right-3'}`}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {step === 3 ? (loading ? '...' : t.signUp) : t.next}
          </Button>
        </form>

        {step === 1 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t.hasAccount}{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/onboarding/login')}>
                {t.signIn}
              </Button>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};