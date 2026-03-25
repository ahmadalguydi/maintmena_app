import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Wrench } from 'lucide-react';
interface SignupChoiceProps {
  currentLanguage: 'en' | 'ar';
}
const SignupChoice = ({
  currentLanguage
}: SignupChoiceProps) => {
  const navigate = useNavigate();
  const content = {
    en: {
      title: 'Join MaintMENA',
      subtitle: 'Choose how you want to use our platform',
      buyer: {
        title: 'I Need Home or Project Services',
        description: 'Post jobs for your home or project, get quotes from verified pros, and hire with confidence',
        features: ['Post home repairs or project work', 'Compare quotes from verified pros', 'Track progress and pay securely', 'Message pros directly'],
        button: 'Sign Up as Buyer'
      },
      seller: {
        title: "I'm a Service Pro or Contractor",
        description: 'Find home service jobs and project work, submit competitive quotes, and grow your business',
        features: ['Browse home and project opportunities', 'Submit quotes with your best pricing', 'Build your reputation with reviews', 'Get paid securely'],
        button: 'Sign Up as Pro'
      },
      footer: 'Already have an account?',
      login: 'Log in'
    },
    ar: {
      title: 'انضم إلى MaintMENA',
      subtitle: 'اختر كيف تريد استخدام منصتنا',
      buyer: {
        title: 'أحتاج خدمات منزلية أو مشاريع',
        description: 'انشر طلبات لمنزلك أو مشروعك، واحصل على عروض من محترفين موثوقين، واستأجر بثقة',
        features: ['انشر طلبات إصلاح منزلية أو أعمال مشاريع', 'قارن عروض الأسعار من محترفين موثوقين', 'تتبع التقدم وادفع بأمان', 'راسل المحترفين مباشرة'],
        button: 'التسجيل كمشتري'
      },
      seller: {
        title: 'أنا محترف خدمات أو مقاول',
        description: 'ابحث عن وظائف خدمات منزلية وأعمال مشاريع، وقدم عروض أسعار تنافسية، وقم بتنمية عملك',
        features: ['تصفح الفرص المنزلية والمشاريع', 'قدم عروض أسعار بأفضل الأسعار لديك', 'ابن سمعتك من خلال التقييمات', 'احصل على أموالك بأمان'],
        button: 'التسجيل كمحترف'
      },
      footer: 'هل لديك حساب بالفعل؟',
      login: 'تسجيل الدخول'
    }
  };
  const t = content[currentLanguage];
  return <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/signup?type=buyer')}>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t.buyer.title}</CardTitle>
              
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                {t.buyer.features.map((feature, index) => <li key={index}>✓ {feature}</li>)}
              </ul>
              <Button className="w-full" size="lg">
                {t.buyer.button}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/signup?type=seller')}>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t.seller.title}</CardTitle>
              
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                {t.seller.features.map((feature, index) => <li key={index}>✓ {feature}</li>)}
              </ul>
              <Button className="w-full" size="lg">
                {t.seller.button}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            {t.footer}{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/login')}>
              {t.login}
            </Button>
          </p>
        </div>
      </motion.div>
    </div>;
};
export default SignupChoice;