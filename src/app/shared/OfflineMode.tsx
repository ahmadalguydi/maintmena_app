import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineMode = () => {
  const isOnline = useOnlineStatus();
  const currentLanguage = (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';


  const handleRetry = () => {
    window.location.reload();
  };

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-8 inline-flex p-8 rounded-full bg-muted"
        >
          <WifiOff className="w-20 h-20 text-muted-foreground" />
        </motion.div>

        <h2 className="text-2xl font-display font-bold mb-4">
          {currentLanguage === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
        </h2>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          {currentLanguage === 'ar'
            ? 'يبدو أنك غير متصل بالإنترنت. تحقق من اتصالك وحاول مرة أخرى'
            : 'It seems you are offline. Check your connection and try again'}
        </p>

        <Button onClick={handleRetry} size="lg" className="w-full">
          <RefreshCw className="w-5 h-5 mr-2" />
          {currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </Button>

        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">
            {currentLanguage === 'ar'
              ? '💡 بعض الميزات قد تكون متاحة في وضع عدم الاتصال'
              : '💡 Some features may be available in offline mode'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
