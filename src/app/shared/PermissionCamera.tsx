import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { toast } from 'sonner';

export const PermissionCamera = () => {
  const [isRequesting, setIsRequesting] = useState(false);
  const navigate = useNavigate();
  const currentLanguage = (localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      await CapacitorCamera.requestPermissions({ permissions: ['camera', 'photos'] });
      localStorage.setItem('cameraPermission', 'granted');
      toast.success(currentLanguage === 'ar' ? 'تم منح الإذن' : 'Permission granted');
      navigate('/app/permissions/location');
    } catch (error) {
      toast.error(currentLanguage === 'ar' ? 'تم رفض الإذن' : 'Permission denied');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    navigate('/app/permissions/location');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md"
      >
        <div className="mb-8 inline-flex p-8 rounded-full bg-primary/10">
          <Camera className="w-20 h-20 text-primary" />
        </div>

        <h2 className="text-2xl font-display font-bold mb-4">
          {currentLanguage === 'ar' ? 'الوصول للكاميرا' : 'Camera Access'}
        </h2>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          {currentLanguage === 'ar'
            ? 'التقط صوراً للمشاكل التي تحتاج إصلاح أو أعمالك المكتملة'
            : 'Take photos of issues that need fixing or your completed work'}
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
      </motion.div>
    </div>
  );
};
