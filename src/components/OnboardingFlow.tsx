import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Wrench, 
  TrendingUp, 
  ShoppingCart, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingFlowProps {
  currentLanguage: 'en' | 'ar';
  userId: string;
  onComplete: () => void;
}

type UserRole = 'buyer' | 'seller' | null;
type InterestArea = 'intelligence' | 'marketplace' | 'both' | null;

const OnboardingFlow = ({ currentLanguage, userId, onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [interests, setInterests] = useState<InterestArea>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const content = {
    en: {
      step1: {
        title: 'Welcome to MaintMENA!',
        subtitle: 'First, tell us about yourself',
        buyer: {
          title: 'Homeowner / Property Manager',
          description: 'I need services for my home or property'
        },
        seller: {
          title: 'Service Provider / Contractor',
          description: 'I provide services and want to find clients'
        }
      },
      step2: {
        title: 'What type of work?',
        subtitle: 'Choose what you\'re focused on',
        intelligence: {
          title: 'Home Services',
          description: 'AC, plumbing, electrical, cleaning, handyman'
        },
        marketplace: {
          title: 'Project Work',
          description: 'Fit-out, tiling, MEP, construction, renovations'
        },
        both: {
          title: 'Both',
          description: 'Home services and project work'
        }
      },
      step3: {
        title: 'You\'re all set!',
        subtitle: 'Start posting jobs or browsing opportunities',
        features: [
          'Post unlimited jobs (free for buyers)',
          'Compare quotes from verified pros',
          'Direct messaging and tracking',
          'Secure payment protection'
        ],
        cta: 'Start Now'
      },
      back: 'Back',
      continue: 'Continue'
    },
    ar: {
      step1: {
        title: 'مرحباً بك في MaintMENA!',
        subtitle: 'أولاً، أخبرنا عن نفسك',
        buyer: {
          title: 'صاحب منزل / مدير عقارات',
          description: 'أحتاج خدمات لمنزلي أو عقاري'
        },
        seller: {
          title: 'مقدم خدمة / مقاول',
          description: 'أقدم خدمات وأريد إيجاد عملاء'
        }
      },
      step2: {
        title: 'أي نوع من العمل؟',
        subtitle: 'اختر ما تركز عليه',
        intelligence: {
          title: 'الخدمات المنزلية',
          description: 'مكيفات، سباكة، كهرباء، تنظيف، عامل ماهر'
        },
        marketplace: {
          title: 'أعمال المشاريع',
          description: 'تشطيب، بلاط، ميكانيكا، بناء، تجديدات'
        },
        both: {
          title: 'كلاهما',
          description: 'الخدمات المنزلية وأعمال المشاريع'
        }
      },
      step3: {
        title: 'كل شيء جاهز!',
        subtitle: 'ابدأ نشر الوظائف أو تصفح الفرص',
        features: [
          'انشر وظائف غير محدودة (مجاني للمشترين)',
          'قارن عروضاً من محترفين موثقين',
          'مراسلة مباشرة وتتبع',
          'حماية دفع آمنة'
        ],
        cta: 'ابدأ الآن'
      },
      back: 'رجوع',
      continue: 'متابعة'
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Update user role
      if (userRole) {
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: userRole });
      }

      // Update user preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          content_preferences: {
            primary_interest: interests,
            onboarding_completed: true
          }
        });

      toast({
        title: currentLanguage === 'ar' ? 'تم الإعداد بنجاح!' : 'Setup Complete!',
        description: currentLanguage === 'ar' 
          ? 'تبدأ تجربتك المجانية الآن' 
          : 'Your free trial starts now'
      });

      onComplete();

      // Navigate based on role and interests
      if (userRole === 'buyer') {
        navigate('/buyer-dashboard');
      } else if (userRole === 'seller') {
        if (interests === 'intelligence') {
          navigate('/weekly-brief');
        } else {
          navigate('/seller-dashboard');
        }
      } else {
        navigate('/seller-dashboard'); // Fallback to seller dashboard
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: currentLanguage === 'ar' 
          ? 'حدث خطأ أثناء الإعداد' 
          : 'An error occurred during setup',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-12 bg-accent' : s < step ? 'w-8 bg-accent/50' : 'w-8 bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold text-center mb-2">
                {content[currentLanguage].step1.title}
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                {content[currentLanguage].step1.subtitle}
              </p>

              <div className="grid gap-4">
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    userRole === 'buyer' ? 'border-accent border-2' : 'border-rule'
                  }`}
                  onClick={() => setUserRole('buyer')}
                >
                  <div className="flex items-start gap-4">
                    <Building2 className="w-12 h-12 text-accent" />
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {content[currentLanguage].step1.buyer.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {content[currentLanguage].step1.buyer.description}
                      </p>
                    </div>
                    {userRole === 'buyer' && (
                      <CheckCircle2 className="w-6 h-6 text-accent ml-auto" />
                    )}
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    userRole === 'seller' ? 'border-accent border-2' : 'border-rule'
                  }`}
                  onClick={() => setUserRole('seller')}
                >
                  <div className="flex items-start gap-4">
                    <Wrench className="w-12 h-12 text-accent-2" />
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {content[currentLanguage].step1.seller.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {content[currentLanguage].step1.seller.description}
                      </p>
                    </div>
                    {userRole === 'seller' && (
                      <CheckCircle2 className="w-6 h-6 text-accent ml-auto" />
                    )}
                  </div>
                </Card>
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                disabled={!userRole}
                onClick={() => setStep(2)}
              >
                {content[currentLanguage].continue}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Interest Selection */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-bold text-center mb-2">
                {content[currentLanguage].step2.title}
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                {content[currentLanguage].step2.subtitle}
              </p>

              <div className="grid gap-4">
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    interests === 'intelligence' ? 'border-accent border-2' : 'border-rule'
                  }`}
                  onClick={() => setInterests('intelligence')}
                >
                  <div className="flex items-start gap-4">
                    <TrendingUp className="w-12 h-12 text-accent" />
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {content[currentLanguage].step2.intelligence.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {content[currentLanguage].step2.intelligence.description}
                      </p>
                    </div>
                    {interests === 'intelligence' && (
                      <CheckCircle2 className="w-6 h-6 text-accent ml-auto" />
                    )}
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    interests === 'marketplace' ? 'border-accent border-2' : 'border-rule'
                  }`}
                  onClick={() => setInterests('marketplace')}
                >
                  <div className="flex items-start gap-4">
                    <ShoppingCart className="w-12 h-12 text-accent-2" />
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {content[currentLanguage].step2.marketplace.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {content[currentLanguage].step2.marketplace.description}
                      </p>
                    </div>
                    {interests === 'marketplace' && (
                      <CheckCircle2 className="w-6 h-6 text-accent ml-auto" />
                    )}
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    interests === 'both' ? 'border-accent border-2' : 'border-rule'
                  }`}
                  onClick={() => setInterests('both')}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex gap-2">
                      <TrendingUp className="w-6 h-6 text-accent" />
                      <ShoppingCart className="w-6 h-6 text-accent-2" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold">
                          {content[currentLanguage].step2.both.title}
                        </h3>
                        <Badge className="bg-accent">
                          {currentLanguage === 'ar' ? 'موصى به' : 'Recommended'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {content[currentLanguage].step2.both.description}
                      </p>
                    </div>
                    {interests === 'both' && (
                      <CheckCircle2 className="w-6 h-6 text-accent ml-auto" />
                    )}
                  </div>
                </Card>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  {content[currentLanguage].back}
                </Button>
                <Button
                  size="lg"
                  disabled={!interests}
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  {content[currentLanguage].continue}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10">
                <CheckCircle2 className="w-12 h-12 text-accent" />
              </div>

              <h2 className="text-3xl font-bold mb-2">
                {content[currentLanguage].step3.title}
              </h2>
              <p className="text-muted-foreground mb-8">
                {content[currentLanguage].step3.subtitle}
              </p>

              <Card className="p-6 mb-6 text-left">
                <ul className="space-y-3">
                  {content[currentLanguage].step3.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  {content[currentLanguage].back}
                </Button>
                <Button
                  size="lg"
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-accent to-accent-2"
                >
                  {loading ? '...' : content[currentLanguage].step3.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingFlow;
