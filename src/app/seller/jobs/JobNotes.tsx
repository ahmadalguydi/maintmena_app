import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { JobPhotosUploader } from '@/components/seller/home/JobPhotosUploader';

export const JobNotes = ({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isRTL = currentLanguage === 'ar';

  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | undefined>();
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const content = {
    en: {
      title: 'Photo Notes',
      subtitle: 'Document your work with before & after photos and a note.',
      noteLabel: 'Work note (optional)',
      notePlaceholder: 'Describe the work done, issues found, materials used...',
      saveButton: 'Save Notes',
      backButton: 'Go Back',
      successMsg: 'Notes saved successfully.',
      errorMsg: 'Failed to save. Please try again.',
    },
    ar: {
      title: 'ملاحظات وصور',
      subtitle: 'وثّق عملك بصور قبل وبعد وملاحظة.',
      noteLabel: 'ملاحظة العمل (اختياري)',
      notePlaceholder: 'صف العمل المنجز، المشاكل المكتشفة، المواد المستخدمة...',
      saveButton: 'حفظ الملاحظات',
      backButton: 'رجوع',
      successMsg: 'تم حفظ الملاحظات بنجاح.',
      errorMsg: 'فشل الحفظ. يرجى المحاولة مرة أخرى.',
    },
  };

  const t = content[currentLanguage];

  const handleBeforeUpload = (url: string) => {
    setBeforePhotoUrl(url);
    toast.success(currentLanguage === 'ar' ? 'تم رفع الصورة' : 'Photo uploaded');
  };

  const handleAfterUpload = (url: string) => {
    setAfterPhotoUrl(url);
    toast.success(currentLanguage === 'ar' ? 'تم رفع الصورة' : 'Photo uploaded');
  };

  const handleSave = async () => {
    if (!id) return;

    const photos: string[] = [];
    if (beforePhotoUrl) photos.push(beforePhotoUrl);
    if (afterPhotoUrl) photos.push(afterPhotoUrl);

    // Only save if there's something to save
    if (photos.length === 0 && !note.trim()) {
      navigate(-1);
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (photos.length > 0) {
        updateData.completion_photos = photos;
      }
      if (note.trim()) {
        updateData.seller_notes = note.trim();
      }

      const { error } = await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success(t.successMsg);
      queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
      navigate(-1);
    } catch {
      toast.error(t.errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = !!beforePhotoUrl || !!afterPhotoUrl || !!note.trim();

  return (
    <div
      className="min-h-app bg-background flex flex-col pt-safe"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header className="px-5 py-4 flex items-center gap-3 border-b border-border/40 bg-card">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -mx-2 rounded-full hover:bg-muted transition-colors"
          aria-label={isRTL ? 'رجوع' : 'Go back'}
        >
          <ArrowLeft className={cn('h-5 w-5 text-foreground', isRTL && 'rotate-180')} />
        </button>
        <h1
          className={cn(
            'text-lg font-bold text-foreground',
            isRTL ? 'font-ar-heading' : 'font-heading',
          )}
        >
          {t.title}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-6">
          <p
            className={cn(
              'text-sm text-muted-foreground',
              isRTL ? 'font-ar-body' : 'font-body',
            )}
          >
            {t.subtitle}
          </p>

          {/* Photo uploader */}
          <JobPhotosUploader
            currentLanguage={currentLanguage}
            onBeforeUpload={handleBeforeUpload}
            onAfterUpload={handleAfterUpload}
            beforePhotoUrl={beforePhotoUrl}
            afterPhotoUrl={afterPhotoUrl}
          />

          {/* Note field */}
          <div className="space-y-2">
            <p
              className={cn(
                'text-sm font-semibold text-foreground',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.noteLabel}
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              rows={4}
              className={cn(
                'resize-none rounded-2xl text-sm',
                isRTL ? 'font-ar-body text-right' : 'font-body',
              )}
              maxLength={1000}
            />
          </div>
        </div>
      </main>

      {/* Actions */}
      <div className="px-5 pb-safe-or-6 pt-4 space-y-3 border-t border-border/30 bg-background">
        <Button
          size="lg"
          className="w-full h-12 rounded-2xl font-bold"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t.saveButton
          )}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full h-12 rounded-2xl font-semibold text-muted-foreground"
          disabled={isSaving}
          onClick={() => navigate(-1)}
        >
          {t.backButton}
        </Button>
      </div>
    </div>
  );
};
