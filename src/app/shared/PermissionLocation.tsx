import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { toast } from 'sonner';

export const PermissionLocation = () => {
  const [isRequesting, setIsRequesting] = useState(false);
  const navigate = useNavigate();
  const currentLanguage = (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      await Geolocation.requestPermissions();
      localStorage.setItem('locationPermission', 'granted');
      toast.success(currentLanguage === 'ar' ? 'تم منح الإذن' : 'Permission granted');
      navigate('/app/permissions/notifications');
    } catch (error) {
      toast.error(currentLanguage === 'ar' ? 'تم رفض الإذن' : 'Permission denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    navigate('/app/permissions/notifications');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md"
      >
        <div className="mb-8 inline-flex p-8 rounded-full bg-primary/10">
          <MapPin className="w-20 h-20 text-primary" />
        </div>

        <h2 className="text-2xl font-display font-bold mb-4">
          {currentLanguage === 'ar' ? 'الوصول للموقع' : 'Location Access'}
        </h2>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          {currentLanguage === 'ar'
            ? 'نستخدم موقعك لإيجاد أقرب الفنيين وعرض الطلبات القريبة منك'
            : 'We use your location to find nearby technicians and show relevant requests'}
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleAllow}
            disabled={isRequesting}
            className="w-full"
            size="lg"
          >
            {isRequesting
              ? (currentLanguage === 'ar' ? 'جاري الطلب...' : 'Requesting...')
              : (currentLanguage === 'ar' ? 'السماح بالوصول' : 'Allow Access')}
          </Button>

          <Button variant="ghost" onClick={handleSkip} className="w-full">
            {currentLanguage === 'ar' ? 'تخطي الآن' : 'Skip for Now'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          {currentLanguage === 'ar'
            ? 'يمكنك تغيير هذا لاحقاً من الإعدادات'
            : 'You can change this later in settings'}
        </p>
      </motion.div>
    </div>
  );
};
