import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, CheckCircle2, Loader2, Star, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface PhotoProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  requestId?: string;
  currentLanguage: 'en' | 'ar';
  onComplete: (photos: string[]) => void;
  userRole?: 'buyer' | 'seller';
}

export function PhotoProofModal({
  isOpen,
  onClose,
  bookingId,
  requestId,
  currentLanguage,
  onComplete,
  userRole = 'seller'
}: PhotoProofModalProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRtl = currentLanguage === 'ar';

  // Different content for seller vs buyer
  const content = {
    en: {
      // Seller-focused messaging (default)
      title: userRole === 'seller' ? '📸 Showcase Your Work' : 'Capture Completed Work',
      subtitle: userRole === 'seller'
        ? 'Photos of your completed work build your reputation and help you win more clients!'
        : 'Take 1-2 photos of the finished job to activate your 30-day warranty',
      addPhoto: 'Add Photo',
      takePhoto: 'Take Photo',
      uploadPhoto: 'Upload',
      minPhotos: 'At least 1 photo required',
      confirm: userRole === 'seller' ? 'Complete Job & Build Portfolio' : 'Confirm & Activate Warranty',
      skip: userRole === 'seller' ? 'Skip (not recommended)' : 'Skip (no warranty)',
      success: 'Photos uploaded successfully',
      warrantyNote: userRole === 'seller'
        ? '⭐ Quality photos increase your profile visibility by 40% and help you get more 5-star reviews!'
        : '📸 Photos help protect you and build the seller\'s portfolio',
    },
    ar: {
      title: userRole === 'seller' ? '📸 أظهر عملك' : 'التقط صور العمل المكتمل',
      subtitle: userRole === 'seller'
        ? 'صور عملك المكتمل تبني سمعتك وتساعدك في كسب المزيد من العملاء!'
        : 'التقط ١-٢ صورة للعمل المنجز لتفعيل ضمان ٣٠ يوم',
      addPhoto: 'إضافة صورة',
      takePhoto: 'التقط صورة',
      uploadPhoto: 'رفع',
      minPhotos: 'مطلوب صورة واحدة على الأقل',
      confirm: userRole === 'seller' ? 'إتمام العمل' : 'تأكيد وتفعيل الضمان',
      skip: userRole === 'seller' ? 'تخطي (غير مستحسن)' : 'تخطي (بدون ضمان)',
      success: 'تم رفع الصور بنجاح',
      warrantyNote: userRole === 'seller'
        ? '⭐ الصور عالية الجودة تزيد ظهور ملفك بنسبة ٤٠٪ وتساعدك في الحصول على تقييمات ٥ نجوم!'
        : '📸 الصور تحميك وتبني ملف البائع',
    }
  };

  const t = content[currentLanguage];

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);

      setPhotos(prev => [...prev, publicUrl]);
    } catch (error) {
      console.error('Photo upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera } = await import('@capacitor/camera');
        const { CameraResultType, CameraSource } = await import('@capacitor/camera');

        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera
        });

        if (image.base64String) {
          setIsUploading(true);
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const blob = await fetch(`data:image/jpeg;base64,${image.base64String}`).then(r => r.blob());
          const fileName = `${user.id}/${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('job-photos')
            .getPublicUrl(fileName);

          setPhotos(prev => [...prev, publicUrl]);
        }
      } catch (error) {
        console.error('Camera error:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (photos.length === 0) return;

    setIsSubmitting(true);
    try {
      // Save photos to database
      if (bookingId) {
        await supabase.from('booking_requests')
          .update({ completion_photos: photos })
          .eq('id', bookingId);
      } else if (requestId) {
        await supabase.from('maintenance_requests')
          .update({ completion_photos: photos })
          .eq('id', requestId);
      }

      toast({
        title: t.success,
        variant: 'default'
      });

      onComplete(photos);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Camera className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
          <p className="text-sm text-muted-foreground text-center">
            {t.subtitle}
          </p>

          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <img src={photo} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {photos.length < 3 && (
              <>
                <label className="aspect-square border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-primary mb-1" />
                      <span className="text-xs text-primary">{t.uploadPhoto}</span>
                    </>
                  )}
                </label>

                {Capacitor.isNativePlatform() && (
                  <button
                    onClick={handleCameraCapture}
                    disabled={isUploading}
                    className="aspect-square border-2 border-dashed border-emerald-500/30 rounded-xl flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-emerald-500 mb-1" />
                    <span className="text-xs text-emerald-600">{t.takePhoto}</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-center space-y-1">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t.warrantyNote}
            </p>
            {userRole === 'seller' && (
              <p className="text-xs text-amber-600 dark:text-amber-500">

              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleConfirm}
              disabled={photos.length === 0 || isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {t.confirm}
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-muted-foreground"
            >
              {t.skip}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
