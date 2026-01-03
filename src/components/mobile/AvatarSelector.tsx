import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Heading3, Body } from './Typography';

interface AvatarSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLanguage: 'en' | 'ar';
  currentSeed?: string | null;
  onSelect?: (seed: string) => void;
}

const AVATAR_SEEDS = [
  'warrior', 'hero', 'explorer', 'builder', 'creator',
  'sage', 'guardian', 'pioneer', 'master', 'champion',
  'knight', 'wizard', 'ranger', 'scholar', 'artisan',
  'phoenix', 'titan', 'atlas', 'oracle', 'sentinel',
  'nomad', 'voyager', 'sovereign', 'legend', 'maverick',
  'spark', 'storm', 'shadow', 'flame', 'frost'
];

export const AvatarSelector = ({
  open,
  onOpenChange,
  currentLanguage,
  currentSeed,
  onSelect
}: AvatarSelectorProps) => {
  const { user } = useAuth();
  const { invalidateProfile } = useProfile(user?.id);
  const [selectedSeed, setSelectedSeed] = useState(currentSeed || user?.id || 'warrior');
  const [saving, setSaving] = useState(false);

  const content = {
    en: {
      title: 'Choose Your Avatar',
      description: 'Select an avatar that represents you',
      save: 'Save Avatar'
    },
    ar: {
      title: 'اختر صورتك الرمزية',
      description: 'اختر صورة رمزية تمثلك',
      save: 'حفظ الصورة'
    }
  };

  const t = content[currentLanguage];

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_seed: selectedSeed })
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate profile cache immediately with new avatar_seed
      invalidateProfile({ avatar_seed: selectedSeed });

      toast.success(currentLanguage === 'ar' ? 'تم حفظ الصورة الرمزية' : 'Avatar saved successfully');
      onSelect?.(selectedSeed);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل حفظ الصورة' : 'Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[80vh] rounded-t-3xl"
        dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>
            <Heading3 lang={currentLanguage}>{t.title}</Heading3>
          </SheetTitle>
          <Body lang={currentLanguage} className="text-muted-foreground">
            {t.description}
          </Body>
        </SheetHeader>

        {/* Avatar Grid */}
        <div className="grid grid-cols-3 gap-4 pb-24 overflow-y-auto h-[calc(80vh-180px)]">
          {AVATAR_SEEDS.map((seed) => (
            <button
              key={seed}
              onClick={() => setSelectedSeed(seed)}
              className={cn(
                'relative p-3 rounded-3xl transition-all',
                'hover:scale-105 active:scale-95',
                'border-2',
                selectedSeed === seed
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border/30 bg-muted/30'
              )}
            >
              <Avatar className="w-full aspect-square">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                  alt={seed}
                />
                <AvatarFallback className="bg-primary/10">
                  {seed.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {selectedSeed === seed && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check size={14} className="text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Save Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t pb-safe">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full h-14 rounded-full font-semibold',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}
          >
            {saving ? (currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.save}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
