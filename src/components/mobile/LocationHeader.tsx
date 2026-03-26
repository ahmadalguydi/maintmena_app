import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { LazyLocationPickerMap } from './LazyLocationPickerMap';

interface LocationHeaderProps {
    currentLanguage: 'en' | 'ar';
    location: {
        city: string;
        address: string;
        lat: number | null;
        lng: number | null;
    };
    onLocationChange: (location: LocationHeaderProps['location']) => void;
}

const content = {
    ar: {
        detecting: 'جاري تحديد موقعك...',
        yourLocation: 'موقعك',
        change: 'تغيير',
        locationDisabled: 'يرجى تفعيل الموقع',
        notSet: 'غير محدد',
        selectedLocation: 'موقع محدد',
    },
    en: {
        detecting: 'Detecting your location...',
        yourLocation: 'Your location',
        change: 'Change',
        locationDisabled: 'Please enable location',
        notSet: 'Not set',
        selectedLocation: 'Selected Location',
    },
};

export const LocationHeader = ({
    currentLanguage,
    location,
    onLocationChange,
}: LocationHeaderProps) => {
    const { vibrate } = useHaptics();
    const [isMapOpen, setIsMapOpen] = useState(false);
    const t = content[currentLanguage];

    const handleLocationSelect = (newLocation: { lat: number, lng: number, address?: string }) => {
        // Extract city from address if possible, or default to general area
        const city = newLocation.address?.split(',').pop()?.trim() || t.selectedLocation;

        onLocationChange({
            lat: newLocation.lat,
            lng: newLocation.lng,
            city: city,
            address: newLocation.address || '',
        });
        setIsMapOpen(false);
        vibrate('medium'); // Changed from 'success' to 'medium'
    };

    return (
        <>
            <motion.div
                layout
                className="flex items-center justify-between py-2 mb-4 bg-muted/30 rounded-2xl px-4 border border-border/50"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block mb-0.5">
                            {t.yourLocation}
                        </span>
                        <h3 className="font-semibold text-sm line-clamp-1 max-w-[200px]">
                            {location.address || location.city || t.notSet}
                        </h3>
                    </div>
                </div>

                <button
                    onClick={() => {
                        vibrate('light');
                        setIsMapOpen(true);
                    }}
                    className="px-3 py-1.5 bg-background shadow-sm border rounded-full text-xs font-medium hover:bg-muted transition-colors"
                >
                    {t.change}
                </button>
            </motion.div>

            {/* Map Picker Modal */}
            <AnimatePresence>
                {isMapOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 bg-background"
                    >
                        <LazyLocationPickerMap
                            currentLanguage={currentLanguage}
                            initialLocation={location.lat && location.lng ? { lat: location.lat, lng: location.lng } : null}
                            onConfirm={handleLocationSelect}
                            onCancel={() => setIsMapOpen(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
