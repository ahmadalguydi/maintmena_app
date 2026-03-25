import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Image as ImageIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface RequestDescriptionSheetProps {
    currentLanguage: 'en' | 'ar';
    description: string;
    photos: string[];
    onDescriptionChange: (description: string) => void;
    onPhotoAdd: (photoUrl: string) => void;
    onPhotoRemove: (index: number) => void;
    onSubmit: () => void;
    isSubmitting?: boolean;
    selectedProvidersCount: number;
    hideActions?: boolean;
    className?: string;
}

const content = {
    ar: {
        describeIssue: 'صف المشكلة (اختياري)',
        placeholder: 'اشرح المشكلة بالتفصيل لتحصل على عرض أدق...',
        addPhotos: 'أضف صور',
        photosHelp: 'الصور تساعد المحترفين على فهم المشكلة',
        sendRequest: 'إرسال الطلب',
        sending: 'جاري الإرسال...',
        maxPhotos: 'بحد أقصى 4 صور',
        provider: 'مقدم خدمة',
        providers: 'مقدمي خدمة',
    },
    en: {
        describeIssue: 'Describe the issue (optional)',
        placeholder: 'Explain the issue in detail for more accurate quotes...',
        addPhotos: 'Add photos',
        photosHelp: 'Photos help pros understand the issue',
        sendRequest: 'Send to Pros',
        sending: 'Sending...',
        maxPhotos: 'Max 4 photos',
        provider: 'provider',
        providers: 'providers',
    },
};

export const RequestDescriptionSheet = ({
    currentLanguage,
    description,
    photos,
    onDescriptionChange,
    onPhotoAdd,
    onPhotoRemove,
    onSubmit,
    isSubmitting = false,
    selectedProvidersCount,
    hideActions = false,
    className,
}: RequestDescriptionSheetProps) => {
    const { vibrate } = useHaptics();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = content[currentLanguage];

    const handlePhotoClick = async () => {
        await vibrate('light');
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (photos.length >= 4) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    onPhotoAdd(reader.result);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemovePhoto = async (index: number) => {
        await vibrate('light');
        onPhotoRemove(index);
    };

    const handleSubmit = async () => {
        await vibrate('heavy');
        onSubmit();
    };

    const providerText = selectedProvidersCount === 1
        ? t.provider
        : t.providers;

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Text Area */}
            <div className="flex-1">
                <label className={cn(
                    'block text-sm font-medium text-foreground mb-2',
                    currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                )}>
                    {t.describeIssue}
                </label>
                <textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder={t.placeholder}
                    rows={4}
                    className={cn(
                        'w-full p-4 rounded-2xl bg-muted/30 border border-border/50',
                        'resize-none focus:outline-none focus:border-primary/50',
                        'text-foreground placeholder:text-muted-foreground',
                        currentLanguage === 'ar' ? 'font-ar-body text-right' : 'font-body'
                    )}
                />

                {/* Photo Upload Section */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                            'text-sm font-medium text-foreground',
                            currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                        )}>
                            {t.addPhotos}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {photos.length}/4 {t.maxPhotos.split(' ').slice(-2).join(' ')}
                        </span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto p-2 pt-3">
                        {/* Add Photo Button */}
                        {photos.length < 4 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePhotoClick}
                                className={cn(
                                    'w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-border/50',
                                    'flex flex-col items-center justify-center gap-1',
                                    'bg-muted/20 hover:bg-muted/30 transition-colors'
                                )}
                            >
                                <Camera size={24} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">+</span>
                            </motion.button>
                        )}

                        {/* Photo Previews */}
                        {photos.map((photo, index) => (
                            <div key={index} className="relative shrink-0">
                                <img
                                    src={photo}
                                    alt={`Photo ${index + 1}`}
                                    className="w-20 h-20 object-cover rounded-xl shadow-sm border border-border/10"
                                />
                                <button
                                    onClick={() => handleRemovePhoto(index)}
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md z-10 ring-2 ring-background"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        ))}

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    <p className={cn(
                        'text-xs text-muted-foreground mt-2',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        📸 {t.photosHelp}
                    </p>
                </div>
            </div>

            {/* Submit Button */}
            {!hideActions && (
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                        'w-full py-3.5 mb-8 rounded-full font-bold text-base',
                        'bg-primary text-primary-foreground shadow-lg',
                        'flex items-center justify-center gap-2',
                        'disabled:opacity-70 disabled:cursor-not-allowed',
                        currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                            />
                            {t.sending}
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            {t.sendRequest}
                        </>
                    )}
                </motion.button>
            )}
        </div>
    );
};
