import React, { useEffect, useState } from 'react';
import { Camera, Upload, Loader2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateFile, ALLOWED_IMAGE_TYPES } from '@/lib/fileValidation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isNativePlatform, loadCameraPlugin } from '@/lib/nativePlugins';

interface JobPhotosUploaderProps {
    currentLanguage: 'en' | 'ar';
    onBeforeUpload: (url: string) => void;
    onAfterUpload: (url: string) => void;
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
}

export function JobPhotosUploader({
    currentLanguage,
    onBeforeUpload,
    onAfterUpload,
    beforePhotoUrl,
    afterPhotoUrl
}: JobPhotosUploaderProps) {
    const { toast } = useToast();
    const [uploadingBefore, setUploadingBefore] = useState(false);
    const [uploadingAfter, setUploadingAfter] = useState(false);
    const [canUseNativeCamera, setCanUseNativeCamera] = useState(false);

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

    const handleUpload = async (file: File, type: 'before' | 'after') => {
        const validation = validateFile(file, { allowedTypes: ALLOWED_IMAGE_TYPES });
        if (!validation.valid) {
            toast({
                title: 'Invalid File',
                description: validation.error,
                variant: 'destructive'
            });
            return;
        }

        const setUploading = type === 'before' ? setUploadingBefore : setUploadingAfter;
        setUploading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}_${type}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('job-photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('job-photos')
                .getPublicUrl(fileName);

            if (type === 'before') {
                onBeforeUpload(publicUrl);
            } else {
                onAfterUpload(publicUrl);
            }
        } catch (error: any) {
            if (import.meta.env.DEV) console.error(`Error uploading ${type} photo:`, error);
            toast({
                title: currentLanguage === 'ar' ? 'فشل الرفع' : 'Upload Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const file = event.target.files?.[0];
        if (file) {
            handleUpload(file, type);
        }
    };

    const handleCameraCapture = async (type: 'before' | 'after') => {
        if (!canUseNativeCamera) return;

        try {
            const { Camera, CameraResultType, CameraSource } = await loadCameraPlugin();
            const image = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });

            if (image.base64String) {
                const blob = await fetch(`data:image/jpeg;base64,${image.base64String}`).then(r => r.blob());
                const file = new File([blob], `camera_${type}.jpg`, { type: 'image/jpeg' });
                await handleUpload(file, type);
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('Camera error:', error);
        }
    };

    const renderUploadBox = (type: 'before' | 'after', url?: string, uploading?: boolean) => {
        const title = type === 'before' 
            ? (currentLanguage === 'ar' ? 'صورة قبل' : 'Before Photo')
            : (currentLanguage === 'ar' ? 'صورة بعد' : 'After Photo');

        if (url) {
            return (
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border shadow-sm group">
                    <img src={url} alt={title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-white drop-shadow-md" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-md py-1 px-2 pointer-events-none">
                        <p className="text-[10px] font-medium text-white text-center tracking-wide">{title}</p>
                    </div>
                </div>
            );
        }

        return (
            <label className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden group">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileInput(e, type)}
                    disabled={uploading}
                />
                
                {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                    <>
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {canUseNativeCamera ? (
                                <Camera className="h-5 w-5 text-primary/70" onClick={(e) => { e.preventDefault(); handleCameraCapture(type); }} />
                            ) : (
                                <Upload className="h-5 w-5 text-primary/70" />
                            )}
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                            {title}
                        </span>
                    </>
                )}
            </label>
        );
    };

    return (
        <div className="pt-2 pb-1 border-t border-border/40 space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className={cn("text-sm font-semibold text-foreground", currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {currentLanguage === 'ar' ? 'صور العمل (قبل وبعد)' : 'Job Photos (Before & After)'}
                </span>
            </div>
            
            <p className={cn(
                "text-[12px] text-muted-foreground/90 leading-relaxed bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30", 
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}>
                {currentLanguage === 'ar' 
                    ? 'يُرجى الاستئذان من صاحب المنزل قبل التقاط أي صور لموقع العمل.' 
                    : 'Please ask the homeowner for permission before taking any photos of the work site.'}
            </p>

            <div className="grid grid-cols-2 gap-3">
                {renderUploadBox('before', beforePhotoUrl, uploadingBefore)}
                {renderUploadBox('after', afterPhotoUrl, uploadingAfter)}
            </div>
        </div>
    );
}
