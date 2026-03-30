import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Camera, CheckCircle } from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { loadCameraPlugin } from '@/lib/nativePlugins';

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

const MAX_PHOTOS = 10;

export const PortfolioGallery = ({ currentLanguage }: PortfolioGalleryProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isAr = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Portfolio',
      subtitle: 'Showcase your completed work',
      addPhoto: 'Add Photo',
      noPhotos: 'Your portfolio is empty',
      addFirst: 'Add before & after photos to attract more clients and show off your quality work',
      takePhoto: 'Camera',
      chooseGallery: 'Gallery',
      tipTitle: 'Pro tip',
      tipBody: 'Sellers with 5+ portfolio photos receive 3× more job requests',
      photoCount: 'photos',
      photoCountOf: 'of',
      editTitle: 'Edit Title',
      titleLabel: 'Photo Title',
      titlePlaceholder: 'e.g. Kitchen renovation, AC installation…',
      saveTitle: 'Save',
      viewFull: 'View Full Photo',
      delete: 'Delete Photo',
      deleteConfirm: 'Delete this photo?',
      deleteConfirmSub: 'This cannot be undone.',
      deleteYes: 'Delete',
      cancel: 'Cancel',
      maxReached: 'Maximum 10 photos reached',
    },
    ar: {
      title: 'معرض الأعمال',
      subtitle: 'اعرض أعمالك المكتملة',
      addPhoto: 'إضافة صورة',
      noPhotos: 'معرضك فارغ',
      addFirst: 'أضف صور قبل وبعد لجذب المزيد من العملاء وإظهار جودة عملك',
      takePhoto: 'الكاميرا',
      chooseGallery: 'المعرض',
      tipTitle: 'نصيحة',
      tipBody: 'الفنيون الذين لديهم 5+ صور في المعرض يحصلون على طلبات أكثر بـ 3 مرات',
      photoCount: 'صور',
      photoCountOf: 'من',
      editTitle: 'تعديل العنوان',
      titleLabel: 'عنوان الصورة',
      titlePlaceholder: 'مثلاً: تجديد مطبخ، تركيب تكييف…',
      saveTitle: 'حفظ',
      viewFull: 'عرض الصورة كاملة',
      delete: 'حذف الصورة',
      deleteConfirm: 'حذف هذه الصورة؟',
      deleteConfirmSub: 'لا يمكن التراجع عن هذا الإجراء.',
      deleteYes: 'حذف',
      cancel: 'إلغاء',
      maxReached: 'الحد الأقصى 10 صور',
    },
  }[currentLanguage];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('portfolio_items')
        .eq('id', user.id)
        .single();

      if (data?.portfolio_items) {
        setPortfolio(data.portfolio_items as unknown as PortfolioItem[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const persistPortfolio = async (updated: PortfolioItem[]) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        portfolio_items: updated as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      })
      .eq('id', user?.id);
    if (error) throw error;
    setPortfolio(updated);
  };

  const handleAddPhoto = async (source: 'camera' | 'photos') => {
    if (portfolio.length >= MAX_PHOTOS) {
      toast.info(t.maxReached);
      return;
    }

    const addItem = async (dataUrl: string) => {
      const newItem: PortfolioItem = {
        id: Date.now().toString(),
        imageUrl: dataUrl,
        title: '',
        description: '',
      };
      const updated = [...portfolio, newItem];
      await persistPortfolio(updated);
      toast.success(isAr ? 'تمت الإضافة' : 'Photo added');
    };

    try {
      const { Camera: CapacitorCamera, CameraResultType, CameraSource } = await loadCameraPlugin();
      const image = await CapacitorCamera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });
      if (image.dataUrl) await addItem(image.dataUrl);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('not available') || errMsg.includes('not implemented')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: Event) => {
          const file = (e.target as HTMLInputElement)?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            if (!dataUrl) return;
            try {
              await addItem(dataUrl);
            } catch {
              toast.error(isAr ? 'فشلت الإضافة' : 'Failed to add photo');
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } else if (errMsg !== 'User cancelled photos app') {
        toast.error(isAr ? 'فشلت الإضافة' : 'Failed to add photo');
      }
    }
  };

  const handleSaveTitle = async () => {
    if (!selectedItem) return;
    const updated = portfolio.map(item =>
      item.id === selectedItem.id ? { ...item, title: editTitle } : item,
    );
    try {
      await persistPortfolio(updated);
      setSelectedItem({ ...selectedItem, title: editTitle });
      toast.success(isAr ? 'تم الحفظ' : 'Title saved');
    } catch {
      toast.error(isAr ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedItem) return;
    try {
      const updated = portfolio.filter(item => item.id !== selectedItem.id);
      await persistPortfolio(updated);
      setSelectedItem(null);
      setConfirmDelete(false);
      toast.success(isAr ? 'تم الحذف' : 'Photo deleted');
    } catch {
      toast.error(isAr ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const openItem = (item: PortfolioItem) => {
    setSelectedItem(item);
    setEditTitle(item.title || '');
    setConfirmDelete(false);
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="px-4 py-5 space-y-5">

        {/* Count + tip */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {portfolio.length} {t.photoCountOf} {MAX_PHOTOS} {t.photoCount}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-4 rounded-full transition-colors',
                  i < portfolio.length ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </div>
        </div>

        {portfolio.length < 5 && (
          <SoftCard className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Camera className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-0.5">{t.tipTitle}</p>
                <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">{t.tipBody}</p>
              </div>
            </div>
          </SoftCard>
        )}

        {/* Add buttons */}
        {portfolio.length < MAX_PHOTOS && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAddPhoto('camera')}
              variant="outline"
              className="h-14 gap-2 rounded-2xl"
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">{t.takePhoto}</span>
            </Button>
            <Button
              onClick={() => handleAddPhoto('photos')}
              variant="outline"
              className="h-14 gap-2 rounded-2xl"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">{t.chooseGallery}</span>
            </Button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : portfolio.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {portfolio.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04 }}
                className="relative aspect-square"
              >
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className="w-full h-full rounded-2xl overflow-hidden border border-border/50"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title || `Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {item.title ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 rounded-b-2xl">
                      <p className="text-[10px] text-white font-medium truncate">{item.title}</p>
                    </div>
                  ) : null}
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <SoftCard className="text-center py-16">
            <div className="space-y-3">
              <div className="text-5xl opacity-20 mb-2">📸</div>
              <p className={cn('text-base font-bold', isAr ? 'font-ar-display' : 'font-display')}>
                {t.noPhotos}
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {t.addFirst}
              </p>
            </div>
          </SoftCard>
        )}
      </div>

      {/* Photo options sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => { if (!open) { setSelectedItem(null); setConfirmDelete(false); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader>
            <SheetTitle className={isAr ? 'text-right font-ar-display' : 'font-display'}>
              {confirmDelete ? t.deleteConfirm : t.editTitle}
            </SheetTitle>
          </SheetHeader>

          {confirmDelete ? (
            <div className="mt-4 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
              <p className="text-sm text-muted-foreground">{t.deleteConfirmSub}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setConfirmDelete(false)}>
                  {t.cancel}
                </Button>
                <Button variant="destructive" className="flex-1 rounded-full" onClick={handleDeletePhoto}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.deleteYes}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
              {selectedItem && (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="w-full h-48 object-cover rounded-2xl"
                />
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.titleLabel}
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                  className="rounded-full"
                  dir={isAr ? 'rtl' : 'ltr'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-full gap-2" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="text-destructive">{t.delete}</span>
                </Button>
                <Button className="rounded-full gap-2" onClick={handleSaveTitle}>
                  <CheckCircle className="w-4 h-4" />
                  {t.saveTitle}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
