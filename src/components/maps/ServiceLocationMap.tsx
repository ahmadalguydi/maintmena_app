import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Move, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAPBOX_STREET_STYLE, MAPBOX_TOKEN } from '@/lib/mapbox';

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
  statusBadge?: React.ReactNode;
  actionButton?: React.ReactNode;
  footerOverlay?: React.ReactNode;
  onMapClick?: React.MouseEventHandler<HTMLDivElement>;
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
}: ServiceLocationMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const staticMarkerSourceIdRef = useRef(`mm-static-marker-source-${Math.random().toString(36).slice(2)}`);
  const staticMarkerOuterLayerIdRef = useRef(`mm-static-marker-outer-${Math.random().toString(36).slice(2)}`);
  const staticMarkerInnerLayerIdRef = useRef(`mm-static-marker-inner-${Math.random().toString(36).slice(2)}`);
  const staticMarkerPinLayerIdRef = useRef(`mm-static-marker-pin-${Math.random().toString(36).slice(2)}`);
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  const interactionHint = currentLanguage === 'ar' ? 'حرك وكبر الخريطة' : 'Drag and zoom the map';
  const pendingLabel = currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending';
  const directionsLabel = currentLanguage === 'ar' ? 'الاتجاهات' : 'Directions';
  const camera = interactive ? INTERACTIVE_CAMERA : STATIC_CAMERA;

  const shouldShowInteractionHint = showInteractionHint ?? interactive;
  const markerElement = useMemo(() => buildMarkerElement(), []);

  const ensureStaticMarker = (map: mapboxgl.Map) => {
    const sourceId = staticMarkerSourceIdRef.current;
    const outerLayerId = staticMarkerOuterLayerIdRef.current;
    const innerLayerId = staticMarkerInnerLayerIdRef.current;
    const pinLayerId = staticMarkerPinLayerIdRef.current;

    const sourceData = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat],
          },
          properties: {},
        },
      ],
    };

    const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(sourceData);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: sourceData,
      });
    }

    if (!map.getLayer(outerLayerId)) {
      map.addLayer({
        id: outerLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 24,
          'circle-color': markerAccent.brand.ring,
          'circle-stroke-width': 1,
          'circle-stroke-color': markerAccent.brand.border,
        },
      });
    }

    if (!map.getLayer(innerLayerId)) {
      map.addLayer({
        id: innerLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 15,
          'circle-color': 'rgba(209, 115, 40, 0.1)',
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(167, 84, 34, 0.18)',
        },
      });
    }

    if (!map.getLayer(pinLayerId)) {
      map.addLayer({
        id: pinLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 7,
          'circle-color': markerAccent.brand.pin,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255,255,255,0.96)',
        },
      });
    }
  };

  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current || !MAPBOX_TOKEN) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_STREET_STYLE,
        center: [lng, lat],
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
        attributionControl: false,
        cooperativeGestures: interactive,
        interactive,
      });

      if (interactive) {
        mapRef.current.addControl(
          new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: true }),
          'bottom-right',
        );
        mapRef.current.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      }

      mapRef.current.on('style.load', () => {
        mapRef.current?.setFog({
          color: 'rgb(255, 250, 245)',
          'high-color': 'rgb(255, 243, 224)',
          'space-color': 'rgb(255, 255, 255)',
          'horizon-blend': 0.08,
        });

        if (!interactive && mapRef.current) {
          ensureStaticMarker(mapRef.current);
        }
      });
    } else {
      mapRef.current.jumpTo({
        center: [lng, lat],
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      });
    }

    if (interactive) {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ element: markerElement, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
    } else if (mapRef.current.isStyleLoaded()) {
      ensureStaticMarker(mapRef.current);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [camera.bearing, camera.pitch, camera.zoom, hasCoordinates, interactive, lat, lng, markerElement]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-border/50 bg-[linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))] shadow-[0_18px_40px_rgba(0,0,0,0.06)]',
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
        `}
      </style>

      <div className={cn('relative w-full', heightClassName)}>
        {hasCoordinates ? (
          <div
            ref={mapContainerRef}
            className={cn(
              'absolute inset-0',
              interactive ? 'touch-pan-x touch-pan-y' : 'pointer-events-none',
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(209,115,40,0.16),_transparent_55%),linear-gradient(180deg,rgba(255,247,237,0.95),rgba(255,255,255,0.98))]" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.0)_30%,rgba(255,255,255,0.6))]" />

        <div className="absolute left-4 top-4 z-10 flex max-w-[65%] items-start">
          {statusBadge}
        </div>

        <div className="absolute right-4 top-4 z-10">{actionButton}</div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between gap-3">
          {showLocationPill ? (
            <div className="max-w-[72%] rounded-full border border-white/70 bg-white/88 px-3.5 py-2 shadow-sm backdrop-blur-md">
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
            <div className="rounded-full border border-white/70 bg-white/88 px-3 py-2 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Move className="h-3.5 w-3.5" />
                <span>{interactionHint}</span>
              </div>
            </div>
          ) : !hasCoordinates ? (
            <div className="rounded-full border border-primary/10 bg-white/92 px-3 py-2 text-[11px] font-semibold text-muted-foreground shadow-sm">
              {pendingLabel}
            </div>
          ) : null}
        </div>

        {footerOverlay && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex justify-center">
            {footerOverlay}
          </div>
        )}

        {hasCoordinates && interactive && !actionButton && (
          <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-white/70 bg-white/88 px-3 py-2 shadow-sm backdrop-blur-md">
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
