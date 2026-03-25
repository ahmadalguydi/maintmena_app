import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

interface AppNotFoundProps {
  currentLanguage?: 'en' | 'ar';
}

export const AppNotFound = ({ currentLanguage: propLanguage }: AppNotFoundProps) => {
  const navigate = useNavigate();
  // Use prop language first, then localStorage, default to 'ar'
  const currentLanguage = propLanguage || (localStorage.getItem('language') || 'ar') as 'en' | 'ar';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl mb-6">🔍</div>

        <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>

        <h2 className="text-2xl font-bold mb-4">
          {currentLanguage === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h2>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          {currentLanguage === 'ar'
            ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها'
            : 'Sorry, the page you are looking for does not exist or has been moved'}
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/app/buyer/home')} size="lg" className="w-full">
            <Home className="w-5 h-5 mr-2" />
            {currentLanguage === 'ar' ? 'العودة للرئيسية' : 'Go to Home'}
          </Button>

          <Button onClick={() => navigate(-1)} variant="outline" size="lg" className="w-full">
            {currentLanguage === 'ar' ? 'العودة للخلف' : 'Go Back'}
          </Button>
        </div>

        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {currentLanguage === 'ar'
              ? 'هل تحتاج مساعدة؟ تواصل معنا من قسم الدعم'
              : 'Need help? Contact us from the support section'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
