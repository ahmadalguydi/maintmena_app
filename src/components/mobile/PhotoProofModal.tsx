import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, CheckCircle2, Loader2, Star, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isNativePlatform, loadCameraPlugin } from '@/lib/nativePlugins';

interface PhotoProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  requestId?: string;
  currentLanguage: 'en' | 'ar';
  onComplete: (photos: string[]) => void;
  userRole?: 'buyer' | 'seller';
  initialPhotos?: string[];
}

export function PhotoProofModal({
  isOpen,
  onClose,
  bookingId,
  requestId,
  currentLanguage,
  onComplete,
  userRole = 'seller',
  initialPhotos = []
}: PhotoProofModalProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canUseNativeCamera, setCanUseNativeCamera] = useState(false);

  const isRtl = currentLanguage === 'ar';

  useEffect(() => {
    let isMounted = true;

    void isNativePlatform().then((value) => {
      if (isMounted) {
        setCanUseNativeCamera(value);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Different content for seller vs buyer
  const content = {
    en: {
      title: 'Additional Proof (Optional)',
      subtitle: 'Add final photos? (Can be skipped if you already uploaded Before/After photos)',
      addPhoto: 'Add Photo',
      takePhoto: 'Take Photo',
      uploadPhoto: 'Upload',
      minPhotos: '',
      confirm: 'Confirm & Complete',
      skip: 'Skip & Complete',
      success: 'Photos uploaded successfully',
      warrantyNote: 'These photos will be saved in the request record to protect both parties.',
    },
    ar: {
      title: 'إثبات إضافي (اختياري)',
      subtitle: 'هل تود إضافة صور نهائية؟ (يمكن تجاوزها إذا قمت برفع صور قبل وبعد)',
      addPhoto: 'إضافة صورة',
      takePhoto: 'التقط صورة',
      uploadPhoto: 'رفع',
      minPhotos: '',
      confirm: 'تأكيد وإكمال',
      skip: 'تخطي وإكمال',
      success: 'تم رفع الصور بنجاح',
      warrantyNote: 'سيتم حفظ هذه الصور في سجل الطلب لحماية حقوق الطرفين.',
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
    if (canUseNativeCamera) {
      try {
        const { Camera, CameraResultType, CameraSource } = await loadCameraPlugin();

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
          <DialogDescription className="text-sm text-center">
            {t.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-[4/3]">
                <img src={photo} alt="" className="w-full h-full object-cover rounded-xl border border-border/50" />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {photos.length < 3 && (
              <>
                <label className="relative aspect-[4/3] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                        <Upload className="w-5 h-5 text-primary/70" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        {t.uploadPhoto}
                      </span>
                    </>
                  )}
                </label>

                {canUseNativeCamera && (
                  <button
                    onClick={handleCameraCapture}
                    disabled={isUploading}
                    className="relative aspect-[4/3] border-2 border-dashed border-emerald-500/30 rounded-xl flex flex-col items-center justify-center hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-full bg-emerald-500/5 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                        <Camera className="w-5 h-5 text-emerald-500/70" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-emerald-600 transition-colors">
                      {t.takePhoto}
                    </span>
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
