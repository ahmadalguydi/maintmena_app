import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Camera, X } from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Heading3, Body, Label } from '@/components/mobile/Typography';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PortfolioGalleryProps {
  currentLanguage: 'en' | 'ar';
}

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  beforeImage?: string;
  afterImage?: string;
}

export const PortfolioGallery = ({ currentLanguage }: PortfolioGalleryProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const content = {
    ar: {
      title: 'معرض الأعمال',
      subtitle: 'عرض مشاريعك المكتملة',
      addPhotos: 'إضافة صور',
      noPhotos: 'لا توجد صور في المعرض',
      addFirst: 'اعرض أعمالك لجذب المزيد من العملاء',
      beforeAfter: 'قبل وبعد',
      delete: 'حذف',
      takePhoto: 'التقاط صورة',
      chooseFromGallery: 'اختر من المعرض',
      cancel: 'إلغاء'
    },
    en: {
      title: 'Portfolio Gallery',
      subtitle: 'Showcase your completed projects',
      addPhotos: 'Add Photos',
      noPhotos: 'No photos in gallery',
      addFirst: 'Showcase your work to attract more clients',
      beforeAfter: 'Before & After',
      delete: 'Delete',
      takePhoto: 'Take Photo',
      chooseFromGallery: 'Choose from Gallery',
      cancel: 'Cancel'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    loadPortfolio();
  }, [user]);

  const loadPortfolio = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('portfolio_items')
      .eq('id', user.id)
      .single();

    if (data?.portfolio_items) {
      setPortfolio(data.portfolio_items as any as PortfolioItem[]);
    }
    setLoading(false);
  };

  const handleAddPhoto = async (source: CameraSource) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      if (image.dataUrl) {
        // Upload to storage and add to portfolio
        const newItem: PortfolioItem = {
          id: Date.now().toString(),
          imageUrl: image.dataUrl,
          title: '',
          description: ''
        };

        const updatedPortfolio = [...portfolio, newItem];
        
        const { error } = await supabase
          .from('profiles')
          .update({
            portfolio_items: updatedPortfolio as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', user?.id);

        if (error) throw error;

        setPortfolio(updatedPortfolio);
        toast.success(currentLanguage === 'ar' ? 'تمت الإضافة' : 'Photo added');
      }
    } catch (error: any) {
      console.error('Error adding photo:', error);
      
      // Web fallback: use file input instead
      if (error?.message?.includes('not available') || error?.message?.includes('not implemented')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const dataUrl = event.target?.result as string;
              
              const newItem: PortfolioItem = {
                id: Date.now().toString(),
                imageUrl: dataUrl,
                title: '',
                description: ''
              };

              const updatedPortfolio = [...portfolio, newItem];
              
              const { error } = await supabase
                .from('profiles')
                .update({
                  portfolio_items: updatedPortfolio as any,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

              if (error) throw error;

              setPortfolio(updatedPortfolio);
              toast.success(currentLanguage === 'ar' ? 'تمت الإضافة' : 'Photo added');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        toast.error(currentLanguage === 'ar' ? 'فشلت الإضافة' : 'Failed to add photo');
      }
    }
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      const updatedPortfolio = portfolio.filter(item => item.id !== id);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          portfolio_items: updatedPortfolio as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setPortfolio(updatedPortfolio);
      toast.success(currentLanguage === 'ar' ? 'تم الحذف' : 'Photo deleted');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate('/app/seller/profile')}
      />

      <div className="px-4 py-6 space-y-6">
        {/* Tip Banner */}
        {portfolio.length < 5 && (
          <SoftCard className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Camera size={20} className="text-blue-600" />
              </div>
              <Body lang={currentLanguage} className="text-sm">
                {currentLanguage === 'ar' 
                  ? '💡 البائعون الذين لديهم 5+ صور في المعرض يحصلون على حجوزات أكثر بـ 3 مرات'
                  : '💡 Sellers with 5+ portfolio photos get 3× more bookings'}
              </Body>
            </div>
          </SoftCard>
        )}

        {/* Add Photos Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleAddPhoto(CameraSource.Camera)}
            variant="outline"
            size="lg"
            className="h-auto py-4"
          >
            <div className="flex flex-col items-center gap-2">
              <Camera size={24} />
              <span className={cn(
                'text-sm',
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
              )}>
                {t.takePhoto}
              </span>
            </div>
          </Button>
          
          <Button
            onClick={() => handleAddPhoto(CameraSource.Photos)}
            variant="outline"
            size="lg"
            className="h-auto py-4"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus size={24} />
              <span className={cn(
                'text-sm',
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
              )}>
                {t.chooseFromGallery}
              </span>
            </div>
          </Button>
        </div>

        {/* Portfolio Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : portfolio.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {portfolio.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square"
              >
                <SoftCard
                  animate={false}
                  onClick={() => setSelectedImage(item.imageUrl)}
                  className="p-0 overflow-hidden h-full cursor-pointer"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </SoftCard>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePhoto(item.id);
                  }}
                  className={cn(
                    'absolute top-2 right-2 p-2 rounded-full',
                    'bg-destructive/90 backdrop-blur-sm',
                    'hover:bg-destructive transition-colors',
                    'active:scale-95'
                  )}
                >
                  <Trash2 size={16} className="text-white" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <SoftCard className="text-center py-16">
            <div className="space-y-3">
              <div className="text-6xl opacity-20">📸</div>
              <Heading3 lang={currentLanguage}>{t.noPhotos}</Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground max-w-xs mx-auto">
                {t.addFirst}
              </Body>
            </div>
          </SoftCard>
        )}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[90vw] p-0">
          <div className="relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-background/90 backdrop-blur-sm z-10"
            >
              <X size={20} />
            </button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
