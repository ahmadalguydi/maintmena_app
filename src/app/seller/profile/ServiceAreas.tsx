import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Loader2, Check, AlertCircle, Zap,
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MAPBOX_STREET_STYLE, MAPBOX_TOKEN } from '@/lib/mapbox';
import { cn } from '@/lib/utils';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface ServiceAreasProps {
  currentLanguage: 'en' | 'ar';
}

interface Location {
  lat: number;
  lng: number;
  city?: string;
  address?: string;
}

const DEFAULT_CENTER: [number, number] = [46.6753, 24.7136];
const METERS_PER_PIXEL_AT_EQUATOR = 78271.484;
const RADIUS_OPTIONS = [1, 5, 10, 15, 20, 30, 40, 50, 75, 100];
const RADIUS_OVERLAY_BASE_RADIUS = 72;

function metersPerPixelAtLatitude(lat: number, zoom: number) {
  const safeLatitude = Math.max(-85, Math.min(85, lat));
  return (METERS_PER_PIXEL_AT_EQUATOR * Math.cos((safeLatitude * Math.PI) / 180)) / (2 ** zoom);
}

function getZoomForRadius(radiusKm: number, lat: number, mapViewport?: HTMLDivElement | null) {
  const viewportWidth = mapViewport?.clientWidth || 360;
  const viewportHeight = mapViewport?.clientHeight || 420;
  const targetRadiusPixels = Math.max(52, Math.min(Math.min(viewportWidth, viewportHeight) * 0.22, 150));
  const metersPerPixel = (radiusKm * 1000) / targetRadiusPixels;
  const zoom = Math.log2(
    (METERS_PER_PIXEL_AT_EQUATOR * Math.cos((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180))
      / Math.max(metersPerPixel, 0.0001),
  );

  return Math.min(15.8, Math.max(5.5, zoom));
}

function getLocationFocusZoom(
  radiusKm: number,
  lat: number,
  accuracyMeters?: number,
  mapViewport?: HTMLDivElement | null,
) {
  const radiusZoom = getZoomForRadius(radiusKm, lat, mapViewport);

  if (typeof accuracyMeters !== 'number' || Number.isNaN(accuracyMeters)) {
    return Math.max(radiusZoom, 15);
  }

  if (accuracyMeters <= 20) return Math.max(radiusZoom, 16.2);
  if (accuracyMeters <= 50) return Math.max(radiusZoom, 15.6);
  if (accuracyMeters <= 120) return Math.max(radiusZoom, 14.9);

  return Math.max(radiusZoom, 14.2);
}

function getTouchDistance(touches: TouchList) {
  if (touches.length < 2) return 0;

  const deltaX = touches[0].clientX - touches[1].clientX;
  const deltaY = touches[0].clientY - touches[1].clientY;

  return Math.hypot(deltaX, deltaY);
}

function updateMapLanguage(mapInstance: mapboxgl.Map, isArabic: boolean) {
  const style = mapInstance.getStyle();
  if (!style?.layers) return;

  style.layers.forEach((layer) => {
    if (layer.type !== 'symbol' || !layer.layout || !layer.layout['text-field']) return;

    const textField = JSON.stringify(layer.layout['text-field']);
    if (!textField.includes('name')) return;

    mapInstance.setLayoutProperty(
      layer.id,
      'text-field',
      isArabic
        ? ['coalesce', ['get', 'name_ar'], ['get', 'name']]
        : ['get', 'name'],
    );
  });
}

export const ServiceAreas = ({ currentLanguage }: ServiceAreasProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocodeRequestIdRef = useRef(0);
  const centerRef = useRef<Location | null>(null);
  const isDraggingRef = useRef(false);
  const didPanRef = useRef(false);
  const pinchZoomRef = useRef<{
    center: Location;
    startDistance: number;
    startZoom: number;
  } | null>(null);
  const radiusKmRef = useRef(30);
  const radiusOverlayRef = useRef<HTMLDivElement>(null);
  const radiusGlowRef = useRef<HTMLDivElement>(null);
  const radiusLabelRef = useRef<HTMLDivElement>(null);
  const radiusZoomTimeoutRef = useRef<number | null>(null);

  const [location, setLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<Location | null>(null);
  const [radiusKm, setRadiusKm] = useState(30);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  const isAr = currentLanguage === 'ar';
  useEffect(() => {
    radiusKmRef.current = radiusKm;
  }, [radiusKm]);

  const updateLocationSelection = useCallback((nextLocation: Location) => {
    setLocation((previous) => {
      if (
        previous &&
        Math.abs(previous.lat - nextLocation.lat) < 0.00001 &&
        Math.abs(previous.lng - nextLocation.lng) < 0.00001 &&
        previous.city === nextLocation.city &&
        previous.address === nextLocation.address
      ) {
        return previous;
      }

      return nextLocation;
    });
  }, []);

  const syncRadiusOverlay = useCallback((center: Location | null, zoom?: number) => {
    const overlay = radiusOverlayRef.current;
    const glow = radiusGlowRef.current;
    const label = radiusLabelRef.current;
    const viewport = mapContainer.current;
    const activeZoom = zoom ?? map.current?.getZoom();

    if (!overlay || !glow || !label || !viewport || !center || typeof activeZoom !== 'number') return;

    const metersPerPixel = metersPerPixelAtLatitude(center.lat, activeZoom);
    const rawRadiusPixels = (radiusKmRef.current * 1000) / Math.max(metersPerPixel, 0.0001);
    const radiusPixels = Math.max(6, rawRadiusPixels);
    const labelOffset = Math.min(radiusPixels + 26, (viewport.clientHeight || 320) * 0.34);
    const scale = radiusPixels / RADIUS_OVERLAY_BASE_RADIUS;

    overlay.style.opacity = '1';
    overlay.style.transform = `translate(-50%, -50%) scale(${scale})`;

    glow.style.opacity = '1';
    glow.style.transform = `translate(-50%, -50%) scale(${scale * 1.05})`;

    label.style.opacity = '1';
    label.style.transform = `translate(-50%, calc(-50% - ${labelOffset}px))`;
  }, []);

  const resizeMap = useCallback(() => {
    map.current?.resize();
    syncRadiusOverlay(centerRef.current ?? mapCenter ?? location, map.current?.getZoom());
  }, [location, mapCenter, syncRadiusOverlay]);

  const reverseGeocode = useCallback(async (lng: number, lat: number): Promise<Pick<Location, 'city' | 'address'>> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?language=${isAr ? 'ar' : 'en'}&access_token=${mapboxgl.accessToken}`,
      );
      const json = await response.json();
      const features = Array.isArray(json?.features) ? json.features : [];

      const cityFeature = features.find((feature: any) => (
        Array.isArray(feature.place_type) &&
        (feature.place_type.includes('place') || feature.place_type.includes('locality'))
      ));

      const addressFeature = features.find((feature: any) => (
        Array.isArray(feature.place_type) &&
        (
          feature.place_type.includes('address')
          || feature.place_type.includes('poi')
          || feature.place_type.includes('neighborhood')
          || feature.place_type.includes('locality')
          || feature.place_type.includes('place')
        )
      ));

      return {
        city: cityFeature?.text || features[0]?.text || undefined,
        address: addressFeature?.place_name || features[0]?.place_name || undefined,
      };
    } catch {
      return {};
    }
  }, [isAr]);

  const resolveLocationDetails = useCallback(async (lat: number, lng: number) => {
    const requestId = geocodeRequestIdRef.current + 1;
    geocodeRequestIdRef.current = requestId;
    setIsResolvingAddress(true);

    const resolved = await reverseGeocode(lng, lat);
    if (geocodeRequestIdRef.current !== requestId) return;

    updateLocationSelection({
      lat,
      lng,
      city: resolved.city,
      address: resolved.address,
    });
    setIsResolvingAddress(false);
  }, [reverseGeocode, updateLocationSelection]);

  const t = {
    en: {
      title: 'Service area',
      subtitle: 'Set where you work',
      useMyLocation: 'Use my location',
      gettingLocation: 'Getting location...',
      radius: 'Job radius',
      radiusHint: 'Drag the map under the pin to place your service center. The blue area updates as you change the slider.',
      save: 'Save area',
      saving: 'Saving...',
      saved: 'Service area saved!',
      locationError: 'Could not get your location. Make sure location is enabled.',
      noLocation: 'Move the map to position your service area',
      noLocationHint: 'Keep the pin over your preferred center point, then adjust the slider to define how far you will travel.',
      matchingNote: 'The matching engine uses your location and radius to send you nearby jobs.',
      km: 'km',
      locationSet: 'Service center selected',
      dragHint: 'Drag the map to adjust the center point',
      resolvingLocation: 'Updating service area...',
      radiusPreview: 'Coverage radius',
    },
    ar: {
      title: 'منطقة الخدمة',
      subtitle: 'حدد أين تعمل',
      useMyLocation: 'استخدم موقعي',
      gettingLocation: 'جاري تحديد الموقع...',
      radius: 'نطاق الخدمة',
      radiusHint: 'حرّك الخريطة أسفل الدبوس لتحديد مركز خدمتك. تتحدّث المنطقة الزرقاء عند تغيير شريط المسافة.',
      save: 'حفظ المنطقة',
      saving: 'جاري الحفظ...',
      saved: 'تم حفظ منطقة الخدمة!',
      locationError: 'تعذّر تحديد موقعك. تأكد من تفعيل خدمة الموقع.',
      noLocation: 'حرّك الخريطة لتحديد مركز منطقة الخدمة',
      noLocationHint: 'أبقِ الدبوس فوق نقطة المركز المناسبة ثم عدّل شريط المسافة لتحديد مدى تنقلك.',
      matchingNote: 'يستخدم محرك المطابقة موقعك ونطاقك لإرسال الفرص القريبة منك.',
      km: 'كم',
      locationSet: 'تم تحديد مركز الخدمة',
      dragHint: 'حرّك الخريطة لتعديل نقطة المركز',
      resolvingLocation: 'جاري تحديث منطقة الخدمة...',
      radiusPreview: 'نطاق التغطية',
    },
  }[currentLanguage];

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('location_lat, location_lng, service_radius_km, location_city')
        .eq('id', user.id)
        .single();

      const profile = data as {
        location_lat?: number | null;
        location_lng?: number | null;
        service_radius_km?: number | null;
        location_city?: string | null;
      } | null;

      if (profile?.location_lat != null && profile?.location_lng != null) {
        const existingLocation = {
          lat: profile.location_lat,
          lng: profile.location_lng,
          city: profile.location_city || undefined,
        };
        setLocation(existingLocation);
        setMapCenter(existingLocation);
        centerRef.current = existingLocation;
      }

      if (profile?.service_radius_km != null) {
        setRadiusKm(Math.min(100, Math.max(1, profile.service_radius_km)));
      }

      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (loading || !mapContainer.current || map.current) return;

    if (mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
      mapboxgl.setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
        (error) => {
          if (error) {
            if (import.meta.env.DEV) console.error('Failed to load RTL plugin:', error);
          }
        },
        true,
      );
    }

    const initialCenter = location
      ? [location.lng, location.lat] as [number, number]
      : DEFAULT_CENTER;
    const initialPoint = location ?? { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] };
    centerRef.current = initialPoint;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STREET_STYLE,
      center: initialCenter,
      zoom: getZoomForRadius(radiusKm, initialPoint.lat, mapContainer.current),
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    const resizeTimeoutIds = new Set<number>();
    const stabilizeMapLayout = () => {
      mapInstance.resize();
      [220, 700].forEach((delay) => {
        const scheduledId = window.setTimeout(() => {
          resizeTimeoutIds.delete(scheduledId);
          mapInstance.resize();
        }, delay);
        resizeTimeoutIds.add(scheduledId);
      });
    };

    const canvasContainer = mapInstance.getCanvasContainer();
    const canvas = mapInstance.getCanvas();
    const supportsTouch =
      typeof window !== 'undefined'
      && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    canvas.style.cursor = 'grab';

    if (supportsTouch) {
      mapInstance.touchZoomRotate.disable();
    } else {
      mapInstance.touchZoomRotate.disableRotation();
      mapInstance.scrollZoom.enable({ around: 'center' });
    }
    mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapInstance.on('error', (error) => {
      if (import.meta.env.DEV) console.error('Service area map error:', error);
    });

    mapInstance.on('load', () => {
      updateMapLanguage(mapInstance, isAr);
      setMapReady(true);
      stabilizeMapLayout();
      syncRadiusOverlay(initialPoint, mapInstance.getZoom());
    });

    mapInstance.on('style.load', () => {
      updateMapLanguage(mapInstance, isAr);
      stabilizeMapLayout();
    });

    mapInstance.on('dragstart', () => {
      isDraggingRef.current = true;
      didPanRef.current = false;
      pinchZoomRef.current = null;
      canvas.style.cursor = 'grabbing';
    });

    mapInstance.on('dragend', () => {
      isDraggingRef.current = false;
      canvas.style.cursor = 'grab';
    });

    mapInstance.on('move', () => {
      const pinchState = pinchZoomRef.current;
      if (pinchState) {
        centerRef.current = pinchState.center;
        syncRadiusOverlay(pinchState.center, mapInstance.getZoom());
        return;
      }

      const center = mapInstance.getCenter();
      const liveCenter = { lat: center.lat, lng: center.lng };

      centerRef.current = liveCenter;
      if (isDraggingRef.current) {
        didPanRef.current = true;
      }
      syncRadiusOverlay(liveCenter, mapInstance.getZoom());
    });

    mapInstance.on('moveend', () => {
      if (!didPanRef.current) return;

      const center = mapInstance.getCenter();
      const nextCenter = { lat: center.lat, lng: center.lng };

      didPanRef.current = false;
      centerRef.current = nextCenter;
      setMapCenter(nextCenter);
      updateLocationSelection(nextCenter);
      syncRadiusOverlay(nextCenter, mapInstance.getZoom());
      void resolveLocationDetails(center.lat, center.lng);
    });

    const handleTouchStart = (event: TouchEvent) => {
      if (!supportsTouch || event.touches.length !== 2) return;

      const center = centerRef.current ?? {
        lat: mapInstance.getCenter().lat,
        lng: mapInstance.getCenter().lng,
      };
      const startDistance = getTouchDistance(event.touches);

      if (!startDistance) return;

      pinchZoomRef.current = {
        center,
        startDistance,
        startZoom: mapInstance.getZoom(),
      };

      event.preventDefault();
    };

    const handleTouchMove = (event: TouchEvent) => {
      const pinchState = pinchZoomRef.current;
      if (!pinchState || event.touches.length !== 2) return;

      const nextDistance = getTouchDistance(event.touches);
      if (!nextDistance) return;

      const nextZoom = pinchState.startZoom + Math.log2(nextDistance / pinchState.startDistance);
      mapInstance.jumpTo({
        center: [pinchState.center.lng, pinchState.center.lat],
        zoom: nextZoom,
      });
      centerRef.current = pinchState.center;
      syncRadiusOverlay(pinchState.center, nextZoom);
      event.preventDefault();
    };

    const handleTouchEnd = () => {
      const pinchState = pinchZoomRef.current;
      if (!pinchState) return;

      centerRef.current = pinchState.center;
      syncRadiusOverlay(pinchState.center, mapInstance.getZoom());
      pinchZoomRef.current = null;
    };

    if (supportsTouch) {
      canvasContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvasContainer.addEventListener('touchend', handleTouchEnd);
      canvasContainer.addEventListener('touchcancel', handleTouchEnd);
    }

    map.current = mapInstance;

    const frameId = window.requestAnimationFrame(stabilizeMapLayout);
    const timeoutId = window.setTimeout(stabilizeMapLayout, 250);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      resizeTimeoutIds.forEach((scheduledTimeoutId) => window.clearTimeout(scheduledTimeoutId));
      if (radiusZoomTimeoutRef.current) {
        window.clearTimeout(radiusZoomTimeoutRef.current);
        radiusZoomTimeoutRef.current = null;
      }
      geocodeRequestIdRef.current += 1;
      pinchZoomRef.current = null;
      if (supportsTouch) {
        canvasContainer.removeEventListener('touchstart', handleTouchStart);
        canvasContainer.removeEventListener('touchmove', handleTouchMove);
        canvasContainer.removeEventListener('touchend', handleTouchEnd);
        canvasContainer.removeEventListener('touchcancel', handleTouchEnd);
      }
      mapInstance.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [isAr, loading, resolveLocationDetails, syncRadiusOverlay, updateLocationSelection]);

  useEffect(() => {
    if (!map.current || !mapReady) return;

    if (map.current.isStyleLoaded()) {
      updateMapLanguage(map.current, isAr);
    }
  }, [isAr, mapReady]);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container || !map.current) return;

    const frameId = window.requestAnimationFrame(resizeMap);
    const timeoutId = window.setTimeout(resizeMap, 250);
    const lateTimeoutId = window.setTimeout(resizeMap, 700);
    let observer: ResizeObserver | null = null;
    const hasResizeObserver = typeof window !== 'undefined' && 'ResizeObserver' in window;

    if (hasResizeObserver) {
      observer = new ResizeObserver(resizeMap);
      observer.observe(container);
    } else {
      window.addEventListener('resize', resizeMap);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.clearTimeout(lateTimeoutId);
      observer?.disconnect();
      if (!hasResizeObserver) {
        window.removeEventListener('resize', resizeMap);
      }
    };
  }, [mapReady, resizeMap]);

  useEffect(() => {
    if (!mapReady) return;
    syncRadiusOverlay(centerRef.current ?? mapCenter ?? location, map.current?.getZoom());
  }, [location, mapCenter, mapReady, syncRadiusOverlay]);

  useEffect(() => {
    if (!mapReady) return;
    syncRadiusOverlay(centerRef.current ?? mapCenter ?? location, map.current?.getZoom());
    if (!map.current) return;
    if (radiusZoomTimeoutRef.current) {
      window.clearTimeout(radiusZoomTimeoutRef.current);
    }

    radiusZoomTimeoutRef.current = window.setTimeout(() => {
      if (!map.current) return;

      const activeCenter = centerRef.current ?? mapCenter ?? location;
      if (!activeCenter) return;

      map.current.stop();
      map.current.easeTo({
        zoom: getZoomForRadius(radiusKm, activeCenter.lat, mapContainer.current),
        duration: 220,
        essential: true,
      });
    }, 140);

    return () => {
      if (radiusZoomTimeoutRef.current) {
        window.clearTimeout(radiusZoomTimeoutRef.current);
        radiusZoomTimeoutRef.current = null;
      }
    };
  }, [mapReady, radiusKm, syncRadiusOverlay]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t.locationError);
      return;
    }

    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const focusZoom = getLocationFocusZoom(
          radiusKm,
          nextLocation.lat,
          position.coords.accuracy,
          mapContainer.current,
        );

        setGettingLocation(false);
        centerRef.current = nextLocation;
        setMapCenter(nextLocation);
        updateLocationSelection(nextLocation);
        void resolveLocationDetails(nextLocation.lat, nextLocation.lng);

        if (map.current) {
          map.current.stop();
          map.current.easeTo({
            center: [nextLocation.lng, nextLocation.lat],
            zoom: focusZoom,
            duration: 850,
            essential: true,
          });
          return;
        }
      },
      () => {
        setLocationError(t.locationError);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [radiusKm, resolveLocationDetails, t.locationError, updateLocationSelection]);

  const handleSave = async () => {
    if (!user || !location) return;
    setSaving(true);

    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        location_lat: location.lat,
        location_lng: location.lng,
        service_radius_km: radiusKm,
        location_city: location.city || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast.error(isAr ? 'فشل الحفظ' : 'Failed to save');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['seller-profile-completeness', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['seller-online-status', user?.id] });
    toast.success(t.saved);
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentDisplayLocation = location ?? mapCenter;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="relative h-[55vh] shrink-0 overflow-hidden bg-slate-100">
        <div
          ref={mapContainer}
          className="h-full w-full"
          style={{ overscrollBehavior: 'contain' }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/5 via-transparent to-background/15" />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute top-3 left-3 right-3 z-10"
        >
          <div className="bg-background/92 backdrop-blur-md rounded-2xl px-4 py-3 shadow-md flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">
                {location
                  ? (isResolvingAddress ? t.resolvingLocation : location.address || location.city || t.locationSet)
                  : t.dragHint}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {currentDisplayLocation
                  ? `${currentDisplayLocation.lat.toFixed(5)}, ${currentDisplayLocation.lng.toFixed(5)}`
                  : t.noLocationHint}
              </p>
            </div>
            <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              {radiusKm} {t.km}
            </div>
          </div>
        </motion.div>

        {!location && (
          <div className="absolute bottom-4 left-4 right-20 z-10 pointer-events-none">
            <div className="bg-background/88 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md">
              <p className="text-sm font-semibold">{t.noLocation}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.noLocationHint}</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-10">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={requestLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Navigation className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[4]">
          <div
            ref={radiusGlowRef}
            className="absolute left-1/2 top-1/2 rounded-full bg-primary/12 blur-xl opacity-0"
            style={{
              width: `${RADIUS_OVERLAY_BASE_RADIUS * 2}px`,
              height: `${RADIUS_OVERLAY_BASE_RADIUS * 2}px`,
              willChange: 'transform',
            }}
          />
          <div
            ref={radiusOverlayRef}
            className="absolute left-1/2 top-1/2 rounded-full border-[2px] border-primary/80 bg-primary/[0.10] shadow-[0_0_0_1px_rgba(255,255,255,0.82)_inset,0_14px_36px_rgba(37,99,235,0.14)] opacity-0"
            style={{
              width: `${RADIUS_OVERLAY_BASE_RADIUS * 2}px`,
              height: `${RADIUS_OVERLAY_BASE_RADIUS * 2}px`,
              willChange: 'transform',
            }}
          />
          <div
            ref={radiusLabelRef}
            className="absolute left-1/2 top-1/2 rounded-full border border-primary/20 bg-background/92 px-3 py-1 text-[11px] font-bold text-primary shadow-md backdrop-blur-md"
          >
            {radiusKm} {t.km}
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none z-[5]">
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: 'translate(-50%, -87.5%)' }}
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute top-[34px] h-3 w-3 rounded-full bg-black/20 blur-[3px]" />
              <MapPin className="h-12 w-12 text-primary fill-background drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background px-4 pt-4 pb-32 space-y-4">
        <AnimatePresence>
          {locationError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-900 dark:text-red-200">{locationError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <SoftCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {t.radius}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{t.radiusPreview}</p>
            </div>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {radiusKm} <span className="text-base font-semibold">{t.km}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setRadiusKm(radius)}
                className={cn(
                  'text-xs font-semibold rounded-full px-3 py-1.5 border transition-all',
                  radiusKm === radius
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/50',
                )}
              >
                {radius} {t.km}
              </button>
            ))}
          </div>

          <Slider
            value={[radiusKm]}
            onValueChange={([value]) => setRadiusKm(value)}
            min={1}
            max={100}
            step={1}
            className="w-full"
          />

          <p className="text-xs text-muted-foreground leading-relaxed">{t.radiusHint}</p>
        </SoftCard>

        <div className="flex items-start gap-2.5 rounded-2xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 p-3">
          <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 dark:text-blue-200">{t.matchingNote}</p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={!location || saving}
          className="w-full rounded-2xl h-12 text-sm"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.saving}</>
            : <><Check className="w-4 h-4 mr-2" />{t.save}</>
          }
        </Button>
      </div>
    </div>
  );
};
