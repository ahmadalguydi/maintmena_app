import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MAPBOX_TOKEN } from '@/lib/mapbox';
import { cn } from '@/lib/utils';

interface DemandHeatmapProps {
    currentLanguage: 'en' | 'ar';
}

// Riyadh city centre as geographic fallback
const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

// Simulated demand hotspots expressed as offsets from the seller's position
// Each spot will be rendered as a blurred warm circle on the map
const DEMAND_SPOTS = [
    { dLat:  0.0028, dLng:  0.0046, weight: 0.85 },
    { dLat: -0.0041, dLng:  0.0071, weight: 0.60 },
    { dLat:  0.0063, dLng: -0.0032, weight: 0.90 },
    { dLat: -0.0055, dLng: -0.0058, weight: 0.50 },
    { dLat:  0.0019, dLng: -0.0082, weight: 0.72 },
    { dLat:  0.0087, dLng:  0.0054, weight: 0.45 },
    { dLat: -0.0022, dLng:  0.0093, weight: 0.65 },
    { dLat:  0.0075, dLng: -0.0067, weight: 0.55 },
];

export function DemandHeatmap({ currentLanguage }: DemandHeatmapProps) {
    const { user } = useAuth();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const { data: sellerLocation } = useQuery({
        queryKey: ['seller-location', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await (supabase as any)
                .from('profiles')
                .select('location_lat, location_lng')
                .eq('id', user.id)
                .maybeSingle();
            if (data?.location_lat && data?.location_lng) {
                return { lat: data.location_lat as number, lng: data.location_lng as number };
            }
            return null;
        },
        enabled: !!user?.id,
        staleTime: 120_000,
    });

    const lat = sellerLocation?.lat ?? DEFAULT_LAT;
    const lng = sellerLocation?.lng ?? DEFAULT_LNG;

    useEffect(() => {
        if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [lng, lat],
            zoom: 13.2,
            pitch: 0,
            bearing: 0,
            attributionControl: false,
            interactive: false,
        });

        mapRef.current = map;

        map.on('style.load', () => {
            // Build GeoJSON features for demand spots
            const features = DEMAND_SPOTS.map((spot) => ({
                type: 'Feature' as const,
                properties: { weight: spot.weight },
                geometry: {
                    type: 'Point' as const,
                    coordinates: [lng + spot.dLng, lat + spot.dLat],
                },
            }));

            map.addSource('demand-spots', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features },
            });

            // Outer glow — large blurred circles
            map.addLayer({
                id: 'demand-glow',
                type: 'circle',
                source: 'demand-spots',
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 60, 1.0, 100],
                    'circle-color': '#f97316',
                    'circle-opacity': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 0.10, 1.0, 0.18],
                    'circle-blur': 1,
                },
            });

            // Inner core — tighter, more opaque
            map.addLayer({
                id: 'demand-core',
                type: 'circle',
                source: 'demand-spots',
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 28, 1.0, 52],
                    'circle-color': '#ea580c',
                    'circle-opacity': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 0.20, 1.0, 0.38],
                    'circle-blur': 0.6,
                },
            });

            // Hot centre dot
            map.addLayer({
                id: 'demand-dot',
                type: 'circle',
                source: 'demand-spots',
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 8, 1.0, 14],
                    'circle-color': '#dc2626',
                    'circle-opacity': ['interpolate', ['linear'], ['get', 'weight'], 0.4, 0.45, 1.0, 0.70],
                    'circle-blur': 0,
                },
            });

            // Seller location — emerald dot
            map.addSource('seller-pos', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'Point', coordinates: [lng, lat] },
                    }],
                },
            });

            map.addLayer({
                id: 'seller-ring',
                type: 'circle',
                source: 'seller-pos',
                paint: {
                    'circle-radius': 22,
                    'circle-color': 'rgba(16, 185, 129, 0.15)',
                    'circle-stroke-width': 1.5,
                    'circle-stroke-color': 'rgba(16, 185, 129, 0.40)',
                },
            });

            map.addLayer({
                id: 'seller-dot',
                type: 'circle',
                source: 'seller-pos',
                paint: {
                    'circle-radius': 7,
                    'circle-color': '#10b981',
                    'circle-stroke-width': 2.5,
                    'circle-stroke-color': '#ffffff',
                },
            });
        });

        requestAnimationFrame(() => map.resize());

        return () => {
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng]);

    return (
        <div className="relative w-full h-48 overflow-hidden">
            {/* Map canvas */}
            <div
                ref={mapContainerRef}
                className="absolute inset-0 pointer-events-none"
            />

            {/* Top-left badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-border/40 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className={cn(
                    'text-[11px] font-semibold text-foreground/80',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                )}>
                    {currentLanguage === 'ar' ? 'الطلب في منطقتك' : 'Demand near you'}
                </span>
            </div>

            {/* Bottom-left "Your location" label */}
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className={cn(
                    'text-[10px] font-semibold text-emerald-700',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                )}>
                    {currentLanguage === 'ar' ? 'موقعك' : 'Your location'}
                </span>
            </div>

            {/* Subtle bottom fade to blend into next card section */}
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-card/60 to-transparent" />
        </div>
    );
}
