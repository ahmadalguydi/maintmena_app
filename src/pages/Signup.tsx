import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Wrench, Eye, EyeOff } from 'lucide-react';
import PlanSelection from '@/components/PlanSelection';

interface SignupProps {
  currentLanguage: 'en' | 'ar';
}

const Signup = ({ currentLanguage }: SignupProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  const userType = (searchParams.get('type') as 'buyer' | 'seller') || 'buyer';
  const selectedPlan = searchParams.get('plan');
  const billingCycle = searchParams.get('billing') as 'monthly' | 'annual' || 'monthly';

  const [showPlanSelection, setShowPlanSelection] = useState(true);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    companyName: '',
    buyerType: 'company' as 'company' | 'individual',
    plan: selectedPlan || '',
    billingCycle: billingCycle
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const content = {
    en: {
      buyer: {
        title: 'Buyer Account',
        description: 'Post jobs and find qualified maintenance vendors',
        button: 'Sign Up as Buyer'
      },
      seller: {
        title: 'Vendor Account',
        description: 'Find jobs and grow your maintenance business',
        button: 'Sign Up as Vendor'
      },
      fields: {
        fullName: 'Full Name',
        accountType: 'Account Type',
        company: 'Company',
        companyDesc: 'Business account',
        individual: 'Individual',
        individualDesc: 'Personal projects',
        companyName: 'Company Name',
        companyNameOptional: 'Company Name (Optional)',
        phone: 'Phone Number',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password'
      },
      required: '*',
      loading: 'Creating account...',
      footer: {
        hasAccount: 'Already have an account?',
        login: 'Log in',
        change: '← Change account type'
      },
      validation: {
        passwordMismatch: 'Passwords do not match',
        nameRequired: 'Please enter your full name'
      }
    },
    ar: {
      buyer: {
        title: 'حساب مشتري',
        description: 'انشر الوظائف واعثر على موردي الصيانة المؤهلين',
        button: 'التسجيل كمشتري'
      },
      seller: {
        title: 'حساب مورد',
        description: 'ابحث عن الوظائف واعمل على نمو أعمال الصيانة الخاصة بك',
        button: 'التسجيل كمورد'
      },
      fields: {
        fullName: 'الاسم الكامل',
        accountType: 'نوع الحساب',
        company: 'شركة',
        companyDesc: 'حساب تجاري',
        individual: 'فرد',
        individualDesc: 'مشاريع شخصية',
        companyName: 'اسم الشركة',
        companyNameOptional: 'اسم الشركة (اختياري)',
        phone: 'رقم الهاتف',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        confirmPassword: 'تأكيد كلمة المرور'
      },
      required: '*',
      loading: 'جاري إنشاء الحساب...',
      footer: {
        hasAccount: 'هل لديك حساب بالفعل؟',
        login: 'تسجيل الدخول',
        change: '→ تغيير نوع الحساب'
      },
      validation: {
        passwordMismatch: 'كلمات المرور غير متطابقة',
        nameRequired: 'الرجاء إدخال اسمك الكامل'
      }
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    if (!searchParams.get('type')) {
      navigate('/signup-choice');
    }
  }, [searchParams, navigate]);

  const handlePlanSelect = (plan: string, isAnnual: boolean) => {
    setFormData({ ...formData, plan, billingCycle: isAnnual ? 'annual' : 'monthly' });
    setShowPlanSelection(false);

    // Update URL with plan selection
    const newParams = new URLSearchParams(searchParams);
    newParams.set('plan', plan);
    newParams.set('billing', isAnnual ? 'annual' : 'monthly');
    setSearchParams(newParams);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert(t.validation.passwordMismatch);
      return;
    }

    if (!formData.fullName.trim()) {
      alert(t.validation.nameRequired);
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.fullName,
      userType,
      formData.phone || undefined,
      formData.companyName || undefined,
      isBuyer ? formData.buyerType : undefined,
      currentLanguage
    );
    setLoading(false);

    if (!error) {
      // Redirect to confirmation page
      navigate(`/signup-confirmation?email=${encodeURIComponent(formData.email)}&type=${userType}`);
    }
  };

  const isBuyer = userType === 'buyer';

  // Show plan selection first
  if (showPlanSelection) {
    return (
      <PlanSelection
        userType={userType}
        currentLanguage={currentLanguage}
        onSelectPlan={handlePlanSelect}
        preSelectedPlan={selectedPlan || undefined}
        preSelectedBilling={billingCycle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {isBuyer ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <Wrench className="h-5 w-5 text-primary" />
              )}
              <CardTitle>
                {isBuyer ? t.buyer.title : t.seller.title}
              </CardTitle>
            </div>
            <CardDescription>
              {isBuyer ? t.buyer.description : t.seller.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.fields.fullName} {t.required}</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              {isBuyer && (
                <div className="space-y-2">
                  <Label>{t.fields.accountType} {t.required}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, buyerType: 'company', companyName: formData.buyerType === 'individual' ? '' : formData.companyName })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${formData.buyerType === 'company'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <Building2 className="w-5 h-5 mb-2" />
                      <div className="font-semibold">{t.fields.company}</div>
                      <div className="text-xs text-muted-foreground">{t.fields.companyDesc}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, buyerType: 'individual', companyName: '' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${formData.buyerType === 'individual'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <Wrench className="w-5 h-5 mb-2" />
                      <div className="font-semibold">{t.fields.individual}</div>
                      <div className="text-xs text-muted-foreground">{t.fields.individualDesc}</div>
                    </button>
                  </div>
                </div>
              )}

              {(isBuyer && formData.buyerType === 'company') && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t.fields.companyName} {t.required}</Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </div>
              )}

              {!isBuyer && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t.fields.companyNameOptional}</Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">{t.fields.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+966..."
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+\-]/g, '');
                    setFormData({ ...formData, phone: value });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.fields.email} {t.required}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.fields.password} {t.required}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className={`pr-10 ${currentLanguage === 'ar' ? 'pl-10' : 'pr-10'}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${currentLanguage === 'ar' ? 'left-3' : 'right-3'}`}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.fields.confirmPassword} {t.required}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className={`pr-10 ${currentLanguage === 'ar' ? 'pl-10' : 'pr-10'}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${currentLanguage === 'ar' ? 'left-3' : 'right-3'}`}>
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.loading : (isBuyer ? t.buyer.button : t.seller.button)}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">{t.footer.hasAccount} </span>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate('/login')}
                >
                  {t.footer.login}
                </Button>
              </div>
              <div>
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs"
                  onClick={() => navigate('/signup-choice')}
                >
                  {t.footer.change}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
