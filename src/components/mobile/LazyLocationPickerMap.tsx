import { Suspense, lazy } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import type { LocationPickerMapProps } from './LocationPickerMap';

const LocationPickerMap = lazy(async () => {
  const module = await import('./LocationPickerMap');
  return { default: module.LocationPickerMap };
});

export function LazyLocationPickerMap(props: LocationPickerMapProps) {
  const isArabic = props.currentLanguage === 'ar';

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 bg-background flex flex-col" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="flex-1 bg-muted/30 animate-pulse relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/90 shadow-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm font-semibold">
                {isArabic ? 'جاري تحميل الخريطة...' : 'Loading map...'}
              </p>
            </div>
          </div>
          <div className="bg-background border-t p-5 pb-8 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] rounded-t-3xl -mt-5 relative z-20">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
            <div className="mb-6 flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <p className="text-sm font-medium">
                {isArabic ? 'جهزنا اختيار الموقع' : 'Preparing location picker'}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <LocationPickerMap {...props} />
    </Suspense>
  );
}
