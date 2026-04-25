import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Move, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAPBOX_TOKEN, getMapStyle, getStaticMapStylePath } from '@/lib/mapbox';
import { useDarkMode } from '@/hooks/useDarkMode';

export interface ServiceLocationMapProps {
  currentLanguage: 'en' | 'ar';
  lat?: number;
  lng?: number;
  locationLabel?: string;
  interactive?: boolean;
  showLocationPill?: boolean;
  showInteractionHint?: boolean;
  className?: string;
  heightClassName?: string;
  statusBadge?: ReactNode;
  actionButton?: ReactNode;
  footerOverlay?: ReactNode;
  onMapClick?: MouseEventHandler<HTMLDivElement>;
  /** Force dark-mode rendering regardless of the system/app theme. */
  forceDark?: boolean;
}

const markerAccent = {
  brand: {
    ring: 'rgba(209, 115, 40, 0.16)',
    border: 'rgba(167, 84, 34, 0.28)',
    pin: '#B45309',
  },
};

const STATIC_CAMERA = {
  zoom: 14.0,
  pitch: 0,
  bearing: 0,
};

const INTERACTIVE_CAMERA = {
  zoom: 14.2,
  pitch: 22,
  bearing: -10,
};

const buildStaticMapUrl = (lng: number, lat: number, stylePath: string) =>
  `https://api.mapbox.com/styles/v1/${stylePath}/static/${lng},${lat},14,0/1200x600@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;

const buildMarkerElement = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'relative flex items-center justify-center';
  wrapper.dir = 'ltr';
  wrapper.style.direction = 'ltr';
  wrapper.style.width = '18px';
  wrapper.style.height = '18px';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.transform = 'translateZ(0)';

  const pulse = document.createElement('div');
  pulse.style.position = 'absolute';
  pulse.style.left = '50%';
  pulse.style.top = '50%';
  pulse.style.width = '54px';
  pulse.style.height = '54px';
  pulse.style.transform = 'translate(-50%, -50%)';
  pulse.style.borderRadius = '9999px';
  pulse.style.background = markerAccent.brand.ring;
  pulse.style.border = `1px solid ${markerAccent.brand.border}`;
  pulse.style.animation = 'mm-map-pulse 2.2s ease-out infinite';
  pulse.style.pointerEvents = 'none';
  pulse.style.transformOrigin = 'center center';

  const innerPulse = document.createElement('div');
  innerPulse.style.position = 'absolute';
  innerPulse.style.left = '50%';
  innerPulse.style.top = '50%';
  innerPulse.style.width = '34px';
  innerPulse.style.height = '34px';
  innerPulse.style.transform = 'translate(-50%, -50%)';
  innerPulse.style.borderRadius = '9999px';
  innerPulse.style.background = 'rgba(209, 115, 40, 0.1)';
  innerPulse.style.border = '1px solid rgba(167, 84, 34, 0.18)';
  innerPulse.style.pointerEvents = 'none';
  innerPulse.style.transformOrigin = 'center center';

  const pin = document.createElement('div');
  pin.style.position = 'relative';
  pin.style.width = '18px';
  pin.style.height = '18px';
  pin.style.borderRadius = '9999px';
  pin.style.background = markerAccent.brand.pin;
  pin.style.border = '3px solid rgba(255,255,255,0.96)';
  pin.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.18)';
  pin.style.pointerEvents = 'none';

  wrapper.appendChild(pulse);
  wrapper.appendChild(innerPulse);
  wrapper.appendChild(pin);
  return wrapper;
};

const StaticMarkerOverlay = () => (
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: '54px',
          height: '54px',
          background: markerAccent.brand.ring,
          border: `1px solid ${markerAccent.brand.border}`,
          transform: 'translate(-50%, -50%)',
          animation: 'mm-static-map-pulse 2.2s ease-out infinite',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: '34px',
          height: '34px',
          background: 'rgba(209, 115, 40, 0.1)',
          border: '1px solid rgba(167, 84, 34, 0.18)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: '18px',
          height: '18px',
          background: markerAccent.brand.pin,
          border: '3px solid rgba(255,255,255,0.96)',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  </div>
);

export const ServiceLocationMap = ({
  currentLanguage,
  lat,
  lng,
  locationLabel,
  interactive = false,
  showLocationPill = true,
  showInteractionHint,
  className,
  heightClassName = 'h-40',
  statusBadge,
  actionButton,
  footerOverlay,
  onMapClick,
  forceDark,
}: ServiceLocationMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [staticMapFailed, setStaticMapFailed] = useState(false);
  const systemDark = useDarkMode();
  const isDark = forceDark ?? systemDark;
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  const interactionHint = currentLanguage === 'ar' ? 'حرّك وكبّر الخريطة' : 'Drag and zoom the map';
  const pendingLabel = currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending';
  const directionsLabel = currentLanguage === 'ar' ? 'الاتجاهات' : 'Directions';
  const camera = interactive ? INTERACTIVE_CAMERA : STATIC_CAMERA;
  const shouldShowInteractionHint = showInteractionHint ?? interactive;
  const markerElement = useMemo(() => buildMarkerElement(), []);
  const staticStylePath = forceDark
    ? 'mapbox/dark-v11'
    : getStaticMapStylePath();
  const staticMapUrl = useMemo(
    () => (!interactive && hasCoordinates && MAPBOX_TOKEN ? buildStaticMapUrl(lng, lat, staticStylePath) : null),
    [hasCoordinates, interactive, lat, lng, staticStylePath],
  );

  useEffect(() => {
    setStaticMapFailed(false);
  }, [staticMapUrl]);

  useEffect(() => {
    if (!interactive || !hasCoordinates || !mapContainerRef.current || !MAPBOX_TOKEN || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(),
      center: [lng, lat],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: true }),
      'bottom-right',
    );
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    const resizeTimeoutIds = new Set<number>();
    const stabilizeMapLayout = () => {
      map.resize();
      [220, 700].forEach((delay) => {
        const timeoutId = window.setTimeout(() => {
          resizeTimeoutIds.delete(timeoutId);
          map.resize();
        }, delay);
        resizeTimeoutIds.add(timeoutId);
      });
    };

    map.on('load', stabilizeMapLayout);
    map.on('style.load', () => {
      const dark = document.documentElement.classList.contains('dark');
      map.setFog({
        color: dark ? 'rgb(18, 18, 18)' : 'rgb(255, 250, 245)',
        'high-color': dark ? 'rgb(30, 30, 30)' : 'rgb(255, 243, 224)',
        'space-color': dark ? 'rgb(10, 10, 10)' : 'rgb(255, 255, 255)',
        'horizon-blend': 0.08,
      });
      stabilizeMapLayout();
    });
    map.once('idle', stabilizeMapLayout);

    map.on('error', (event) => {
      if (import.meta.env.DEV) console.error('[ServiceLocationMap] Mapbox error:', event.error);
    });

    const frameId = window.requestAnimationFrame(stabilizeMapLayout);
    const timeoutId = window.setTimeout(stabilizeMapLayout, 250);

    return () => {
      map.off('load', stabilizeMapLayout);
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      resizeTimeoutIds.forEach((scheduledTimeoutId) => window.clearTimeout(scheduledTimeoutId));
    };
  }, [camera.bearing, camera.pitch, camera.zoom, hasCoordinates, interactive, lat, lng]);

  useEffect(() => {
    if (!interactive || !hasCoordinates || !mapRef.current) {
      return;
    }

    mapRef.current.jumpTo({
      center: [lng, lat],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
    });

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ element: markerElement, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [camera.bearing, camera.pitch, camera.zoom, hasCoordinates, interactive, lat, lng, markerElement]);

  useEffect(() => {
    if (interactive && hasCoordinates) {
      return;
    }

    markerRef.current?.remove();
    markerRef.current = null;
    mapRef.current?.remove();
    mapRef.current = null;
  }, [hasCoordinates, interactive]);

  useEffect(() => () => {
    markerRef.current?.remove();
    markerRef.current = null;
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  const resizeMap = useCallback(() => {
    mapRef.current?.resize();
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!interactive || !container || !hasCoordinates) return;

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
  }, [hasCoordinates, interactive, resizeMap]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-border/50 shadow-[0_18px_40px_rgba(0,0,0,0.06)]',
        isDark
          ? 'bg-card'
          : 'bg-[linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))]',
        className,
      )}
      onClick={onMapClick}
    >
      <style>
        {`
          @keyframes mm-map-pulse {
            0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.9; }
            70% { transform: translate(-50%, -50%) scale(1.12); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0; }
          }
          @keyframes mm-static-map-pulse {
            0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.9; }
            70% { transform: translate(-50%, -50%) scale(1.12); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0; }
          }
        `}
      </style>

      <div className={cn('relative w-full', heightClassName)}>
        {interactive && hasCoordinates ? (
          <div
            ref={mapContainerRef}
            className="absolute inset-0 touch-none"
          />
        ) : hasCoordinates && staticMapUrl && !staticMapFailed ? (
          <img
            src={staticMapUrl}
            alt={locationLabel || pendingLabel}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={() => setStaticMapFailed(true)}
          />
        ) : (
          <div className={cn(
            'absolute inset-0',
            isDark
              ? 'bg-[radial-gradient(circle_at_top,_rgba(209,115,40,0.1),_transparent_55%)] bg-card'
              : 'bg-[radial-gradient(circle_at_top,_rgba(209,115,40,0.16),_transparent_55%),linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))]'
          )} />
        )}

        <div className={cn(
          'pointer-events-none absolute inset-0',
          isDark
            ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.0)_30%,rgba(0,0,0,0.4))]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.0)_30%,rgba(255,255,255,0.6))]'
        )} />

        {hasCoordinates && !interactive ? <StaticMarkerOverlay /> : null}

        <div className="absolute left-4 top-4 z-10 flex max-w-[65%] items-start">
          {statusBadge}
        </div>

        <div className="absolute right-4 top-4 z-10">{actionButton}</div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3">
          {showLocationPill ? (
            <div className={cn('max-w-[72%] rounded-full px-3.5 py-2 shadow-sm backdrop-blur-md', isDark ? 'border border-white/10 bg-black/60' : 'border border-white/70 bg-white/88')}>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-xs font-semibold text-foreground/80">
                  {locationLabel || pendingLabel}
                </span>
              </div>
            </div>
          ) : (
            <div />
          )}

          {hasCoordinates && shouldShowInteractionHint ? (
            <div className={cn('rounded-full px-3 py-2 shadow-sm backdrop-blur-md', isDark ? 'border border-white/10 bg-black/60' : 'border border-white/70 bg-white/88')}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Move className="h-3.5 w-3.5" />
                <span>{interactionHint}</span>
              </div>
            </div>
          ) : !hasCoordinates ? (
            <div className={cn('rounded-full px-3 py-2 text-[11px] font-semibold text-muted-foreground shadow-sm', isDark ? 'border border-white/10 bg-black/60' : 'border border-primary/10 bg-white/92')}>
              {pendingLabel}
            </div>
          ) : null}
        </div>

        {footerOverlay && (
          <div className="absolute inset-x-4 bottom-4 z-20 flex justify-center">
            {footerOverlay}
          </div>
        )}

        {hasCoordinates && interactive && !actionButton && (
          <div className={cn('pointer-events-none absolute right-4 top-4 z-10 rounded-full px-3 py-2 shadow-sm backdrop-blur-md', isDark ? 'border border-white/10 bg-black/60' : 'border border-white/70 bg-white/88')}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Navigation className="h-3.5 w-3.5" />
              <span>{directionsLabel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
