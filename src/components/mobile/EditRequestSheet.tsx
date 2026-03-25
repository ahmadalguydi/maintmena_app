import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LocationHeader } from './LocationHeader';
import { TimeSelector } from './TimeSelector';
import { RequestDescriptionSheet } from './RequestDescriptionSheet';

interface EditRequestSheetProps {
    isOpen: boolean;
    currentLanguage: 'en' | 'ar';
    onClose: () => void;
    onSave: (updates: {
        location: { lat: number; lng: number; address: string; city: string };
        timeMode: 'asap' | 'scheduled';
        scheduledDate: Date | null;
        scheduledTimeSlot: 'morning' | 'afternoon' | 'evening' | null;
        description: string;
        photos: string[];
    }) => void;
    initialData: {
        location: { lat: number; lng: number; address: string; city: string };
        timeMode: 'asap' | 'scheduled';
        scheduledDate: Date | null;
        scheduledTimeSlot: 'morning' | 'afternoon' | 'evening' | null;
        description: string;
        photos: string[];
    };
}

export const EditRequestSheet = ({
    isOpen,
    currentLanguage,
    onClose,
    onSave,
    initialData
}: EditRequestSheetProps) => {
    const isRTL = currentLanguage === 'ar';
    const [location, setLocation] = useState(initialData.location);
    const [timeMode, setTimeMode] = useState(initialData.timeMode);
    const [scheduledDate, setScheduledDate] = useState(initialData.scheduledDate);
    const [scheduledTimeSlot, setScheduledTimeSlot] = useState(initialData.scheduledTimeSlot);
    const [description, setDescription] = useState(initialData.description);
    const [photos, setPhotos] = useState<string[]>(initialData.photos || []);

    const t = {
        title: isRTL ? 'تعديل الطلب' : 'Edit Request',
        save: isRTL ? 'حفظ التغييرات' : 'Save Changes',
        cancel: isRTL ? 'إلغاء' : 'Cancel',
        time: isRTL ? 'الوقت' : 'Time',
    };

    const handleSave = () => {
        onSave({
            location,
            timeMode,
            scheduledDate,
            scheduledTimeSlot,
            description,
            photos
        });
        onClose();
    };

    const handleLocationChange = (loc: { lat: number | null; lng: number | null; address: string; city: string }) => {
        if (loc.lat && loc.lng) {
            setLocation({
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address,
                city: loc.city,
            });
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="rounded-t-3xl min-h-[85vh] max-h-[95vh] p-0 flex flex-col">
                <div className="flex-1 flex flex-col min-h-0 p-6 pb-2" dir={isRTL ? 'rtl' : 'ltr'}>
                    <SheetHeader className="mb-6">
                        <SheetTitle className={cn("text-2xl font-bold", isRTL ? 'font-ar-heading' : 'font-heading')}>
                            {t.title}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6 flex-1 overflow-y-auto pb-24">
                        {/* Location Header (Reusable) */}
                        <LocationHeader
                            currentLanguage={currentLanguage}
                            location={{
                                ...location,
                                lat: location.lat,
                                lng: location.lng
                            }}
                            onLocationChange={handleLocationChange}
                        />

                        {/* Time Selector (Reusable) */}
                        <div className="space-y-3">
                            <label className={cn("text-base font-semibold", isRTL ? 'font-ar-heading' : '')}>
                                {t.time}
                            </label>
                            <TimeSelector
                                currentLanguage={currentLanguage}
                                urgency={timeMode}
                                scheduledDate={scheduledDate}
                                scheduledTimeSlot={scheduledTimeSlot}
                                onUrgencyChange={setTimeMode}
                                onScheduleChange={(date, slot) => {
                                    setScheduledDate(date);
                                    setScheduledTimeSlot(slot);
                                }}
                            />
                        </div>

                        {/* Description & Photos (Reusable) */}
                        <RequestDescriptionSheet
                            currentLanguage={currentLanguage}
                            description={description}
                            photos={photos}
                            onDescriptionChange={setDescription}
                            onPhotoAdd={(photo) => setPhotos([...photos, photo])}
                            onPhotoRemove={(index) => setPhotos(photos.filter((_, i) => i !== index))}
                            onSubmit={() => { }} // Not used because hidden
                            selectedProvidersCount={0}
                            hideActions={true}
                            className="bg-transparent p-0"
                        />
                    </div>
                </div>

                {/* Footer CTAs */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="flex gap-2.5">
                        <Button
                            onClick={handleSave}
                            className={cn(
                                "flex-[1.5] h-10.5 text-sm font-bold rounded-full shadow-md",
                                isRTL ? 'font-ar-heading' : 'font-heading'
                            )}
                        >
                            <span>{t.save}</span>
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className={cn(
                                "flex-1 h-10.5 rounded-full text-sm font-bold bg-muted hover:bg-muted/80 text-muted-foreground border-none",
                                isRTL ? 'font-ar-heading' : 'font-heading'
                            )}
                        >
                            <span>{t.cancel}</span>
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
