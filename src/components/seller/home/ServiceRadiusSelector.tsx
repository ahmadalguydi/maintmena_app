import { MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceRadiusSelectorProps {
    currentLanguage: 'en' | 'ar';
    radius: number;
    onRadiusChange: (radius: number) => void;
}

export function ServiceRadiusSelector({
    currentLanguage,
    radius,
    onRadiusChange
}: ServiceRadiusSelectorProps) {
    const content = {
        ar: {
            serviceRadius: 'نطاق الخدمة',
            km: 'كم',
        },
        en: {
            serviceRadius: 'Service Radius',
            km: 'km',
        },
    };

    return (
        <div
            className="flex items-center justify-between bg-card rounded-3xl p-5 border border-border/40 shadow-soft"
        >
            <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#f6ede6] flex items-center justify-center">
                    <MapPin size={16} className="text-primary" />
                </div>
                <span className={cn(
                    "text-sm font-medium text-foreground",
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                    {content[currentLanguage].serviceRadius}
                </span>
            </div>

            <button
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors focus:outline-none"
                onClick={() => {
                    const options = [5, 8, 12, 20];
                    const currentIndex = options.indexOf(radius);
                    const nextIndex = (currentIndex + 1) % options.length;
                    onRadiusChange(options[nextIndex]);
                }}
            >
                <span>
                    {radius} {content[currentLanguage].km}
                </span>
                <ChevronDown size={16} />
            </button>
        </div>
    );
}
