import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Loader2, Check, ChevronUp, ChevronDown,
  AlertCircle, Zap,
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
import { MAPBOX_TOKEN } from '@/lib/mapbox';
import { cn } from '@/lib/utils';

// Public token — replace in .env as VITE_MAPBOX_TOKEN for production
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

const RADIUS_OPTIONS = [5, 10, 20, 30, 50, 75, 100, 150, 200];

// Convert km radius to rough meters for Mapbox circle layer
function kmToMeters(km: number) {
  return km * 1000;
}

// Build a GeoJSON circle (polygon) for a given center + radius in km
// Compute bounding box [west, south, east, north] for a center + radius
function circleBounds(lng: number, lat: number, radiusKm: number): [[number, number], [number, number]] {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat - dLat], // SW
    [lng + dLng, lat + dLat], // NE
  ];
}

function buildCircleGeoJSON(lng: number, lat: number, radiusKm: number, steps = 64) {
  const coords: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 360;
    const rad = (angle * Math.PI) / 180;
    // Approximate: 1 degree lat ≈ 111 km, 1 degree lng ≈ 111 km * cos(lat)
    const dx = (radiusKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad);
    const dy = (radiusKm / 111) * Math.cos(rad);
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]); // close ring
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [coords] },
        properties: {},
      },
    ],
  };
}

export const ServiceAreas = ({ currentLanguage }: ServiceAreasProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [location, setLocation] = useState<Location | null>(null);
  const [radiusKm, setRadiusKm] = useState(30);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isAr = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Service area',
      subtitle: 'Set where you work',
      useMyLocation: 'Use my location',
      gettingLocation: 'Getting location…',
      radius: 'Job radius',
      radiusHint: 'You will receive job requests from buyers within this distance of your location.',
      save: 'Save area',
      saving: 'Saving…',
      saved: 'Service area saved!',
      locationError: 'Could not get your location. Make sure location is enabled.',
      noLocation: 'Location not set',
      noLocationHint: 'Tap "Use my location" to set your position on the map.',
      matchingNote: 'The matching engine uses your location and radius to send you nearby jobs.',
      km: 'km',
      yourLocation: 'Your location',
      coverageArea: 'Coverage area',
      locationSet: 'Location set',
    },
    ar: {
      title: 'منطقة الخدمة',
      subtitle: 'حدد أين تعمل',
      useMyLocation: 'استخدم موقعي',
      gettingLocation: 'جاري تحديد الموقع…',
      radius: 'نطاق الخدمة',
      radiusHint: 'ستصلك طلبات العمل من العملاء ضمن هذه المسافة من موقعك.',
      save: 'حفظ المنطقة',
      saving: 'جاري الحفظ…',
      saved: 'تم حفظ منطقة الخدمة!',
      locationError: 'تعذّر تحديد موقعك. تأكد من تفعيل خدمة الموقع.',
      noLocation: 'الموقع غير محدد',
      noLocationHint: 'اضغط "استخدم موقعي" لتحديد موقعك على الخريطة.',
      matchingNote: 'يستخدم محرك المطابقة موقعك ونطاقك لإرسال الفرص القريبة منك.',
      km: 'كم',
      yourLocation: 'موقعك',
      coverageArea: 'منطقة التغطية',
      locationSet: 'تم تحديد الموقع',
    },
  }[currentLanguage];

  // ── Load existing profile location ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('location_lat, location_lng, service_radius_km, location_city' as any)
        .eq('id', user.id)
        .single();

      const d = data as any;
      if (d?.location_lat && d?.location_lng) {
        setLocation({
          lat: d.location_lat,
          lng: d.location_lng,
          city: d.location_city || undefined,
        });
      }
      if (d?.service_radius_km) {
        setRadiusKm(d.service_radius_km);
      }
      setLoading(false);
    })();
  }, [user]);

  // ── Init map once data is loaded ──
  useEffect(() => {
    if (loading || !mapContainer.current || map.current) return;

    const initialCenter: [number, number] = location
      ? [location.lng, location.lat]
      : [45.0, 24.0]; // Default to Saudi Arabia center

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: location ? 9 : 5,
      attributionControl: false,
    });

    m.addControl(new mapboxgl.AttributionControl({ compact: true }));

    m.on('load', () => {
      // Add circle fill source + layer
      m.addSource('radius-fill', {
        type: 'geojson',
        data: location
          ? buildCircleGeoJSON(location.lng, location.lat, radiusKm)
          : { type: 'FeatureCollection', features: [] },
      });

      m.addLayer({
        id: 'radius-fill-layer',
        type: 'fill',
        source: 'radius-fill',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.12,
        },
      });

      m.addLayer({
        id: 'radius-stroke-layer',
        type: 'line',
        source: 'radius-fill',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-opacity': 0.7,
        },
      });

      if (location) {
        marker.current = new mapboxgl.Marker({ color: '#3b82f6', scale: 1.2 })
          .setLngLat([location.lng, location.lat])
          .addTo(m);
      }

      setMapReady(true);
      map.current = m;
    });

    // Allow user to tap the map to reposition
    m.on('click', (e) => {
      const newLoc: Location = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      setLocation(newLoc);
      reverseGeocode(e.lngLat.lng, e.lngLat.lat).then(city => {
        setLocation(prev => prev ? { ...prev, city } : prev);
      });
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, [loading]);

  // ── Update map when location changes ──
  useEffect(() => {
    if (!map.current || !mapReady || !location) return;

    // Move marker
    if (marker.current) {
      marker.current.setLngLat([location.lng, location.lat]);
    } else {
      marker.current = new mapboxgl.Marker({ color: '#3b82f6', scale: 1.2 })
        .setLngLat([location.lng, location.lat])
        .addTo(map.current);
    }

    // Update circle
    const source = map.current.getSource('radius-fill') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildCircleGeoJSON(location.lng, location.lat, radiusKm));
    }

    // Fit map to the circle bounds
    map.current.fitBounds(
      circleBounds(location.lng, location.lat, radiusKm),
      { padding: 50, duration: 800 },
    );
  }, [location, mapReady]);

  // ── Update circle when radius changes ──
  useEffect(() => {
    if (!map.current || !mapReady || !location) return;
    const source = map.current.getSource('radius-fill') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildCircleGeoJSON(location.lng, location.lat, radiusKm));
    }
    // Re-fit map to new radius bounds
    map.current.fitBounds(
      circleBounds(location.lng, location.lat, radiusKm),
      { padding: 50, duration: 400 },
    );
  }, [radiusKm, mapReady]);

  // ── Reverse geocode to get city name ──
  const reverseGeocode = async (lng: number, lat: number): Promise<string | undefined> => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&language=${isAr ? 'ar' : 'en'}&access_token=${mapboxgl.accessToken}`
      );
      const json = await res.json();
      return json.features?.[0]?.text || json.features?.[0]?.place_name?.split(',')[0] || undefined;
    } catch {
      return undefined;
    }
  };

  // ── Get device location ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t.locationError);
      return;
    }
    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lng, lat);
        setLocation({ lat, lng, city });
        setGettingLocation(false);
      },
      () => {
        setLocationError(t.locationError);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [t.locationError, isAr]);

  // ── Save to database ──
  const handleSave = async () => {
    if (!user || !location) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        location_lat: location.lat,
        location_lng: location.lng,
        service_radius_km: radiusKm,
        location_city: location.city || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast.error(isAr ? 'فشل الحفظ' : 'Failed to save');
    } else {
      // Invalidate profile completeness so the checklist updates immediately
      queryClient.invalidateQueries({ queryKey: ['seller-profile-completeness', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['seller-online-status', user?.id] });
      toast.success(t.saved);
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate(-1)}
      />

      {/* ── Map ── */}
      <div className="relative flex-1 min-h-[55vh]">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Map overlay: tap hint */}
        {!location && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg mx-6 text-center space-y-1">
              <MapPin className="w-5 h-5 text-primary mx-auto" />
              <p className="text-sm font-medium">{t.noLocation}</p>
              <p className="text-xs text-muted-foreground">{t.noLocationHint}</p>
            </div>
          </div>
        )}

        {/* Location status badge */}
        {location && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-3 left-3 right-3"
          >
            <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-md flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">
                  {location.city ? location.city : t.locationSet}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                {radiusKm} {t.km}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Controls panel ── */}
      <div className="bg-background px-4 pt-4 pb-32 space-y-4">

        {/* GPS button */}
        <Button
          type="button"
          className="w-full rounded-2xl h-12 gap-2 text-sm"
          onClick={requestLocation}
          disabled={gettingLocation}
        >
          {gettingLocation
            ? <><Loader2 className="w-4 h-4 animate-spin" />{t.gettingLocation}</>
            : <><Navigation className="w-4 h-4" />{t.useMyLocation}</>
          }
        </Button>

        {/* Location error */}
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

        {/* Radius slider */}
        <SoftCard className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t.radius}
            </p>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {radiusKm} <span className="text-base font-semibold">{t.km}</span>
            </span>
          </div>

          {/* Quick radius chips */}
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                className={cn(
                  'text-xs font-semibold rounded-full px-3 py-1.5 border transition-all',
                  radiusKm === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/50',
                )}
              >
                {r} {t.km}
              </button>
            ))}
          </div>

          {/* Fine-tune slider */}
          <Slider
            value={[radiusKm]}
            onValueChange={([v]) => setRadiusKm(v)}
            min={5}
            max={200}
            step={5}
            className="w-full"
          />

          <p className="text-xs text-muted-foreground leading-relaxed">{t.radiusHint}</p>
        </SoftCard>

        {/* Matching engine note */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 p-3">
          <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 dark:text-blue-200">{t.matchingNote}</p>
        </div>

        {/* Save */}
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
