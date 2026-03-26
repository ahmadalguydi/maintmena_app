import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MAPBOX_STREET_STYLE, MAPBOX_TOKEN } from '@/lib/mapbox';

export interface LocationPickerMapProps {
    currentLanguage: 'en' | 'ar';
    initialLocation: { lat: number; lng: number } | null;
    onConfirm: (location: { lat: number; lng: number; address?: string }) => void;
    onCancel: () => void;
}

export const LocationPickerMap = ({
    currentLanguage,
    initialLocation,
    onConfirm,
    onCancel,
}: LocationPickerMapProps) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number } | null>(initialLocation);
    const [address, setAddress] = useState<string>('');
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);

    const isRTL = currentLanguage === 'ar';

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Enable RTL Text Plugin for Arabic support (lazy load)
        if (mapboxgl.getRTLTextPluginStatus() === 'unavailable') {
            mapboxgl.setRTLTextPlugin(
                'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
                (error) => {
                    if (error) console.error('Failed to load RTL plugin:', error);
                },
                true
            );
        }

        const defaultCenter = [46.6753, 24.7136]; // Riyadh
        const center = initialLocation ? [initialLocation.lng, initialLocation.lat] : defaultCenter;

        if (!map.current) {
            try {
                map.current = new mapboxgl.Map({
                    container: mapContainer.current,
                    style: MAPBOX_STREET_STYLE, // v12 has better improved Arabic support
                    center: center as [number, number],
                    zoom: 15,
                    attributionControl: false,
                });

                // Update center on move
                map.current.on('moveend', () => {
                    if (!map.current) return;
                    const { lng, lat } = map.current.getCenter();
                    setCurrentCenter({ lat, lng });
                    fetchAddress(lat, lng);
                });

                // Error handling
                map.current.on('error', (e) => {
                    console.error('Mapbox error:', e);
                });

                // Style load handling for localization
                map.current.on('style.load', () => {
                    updateMapLanguage();
                });

                // Geolocate immediately if no initial location
                if (!initialLocation) {
                    handleLocateMe();
                } else {
                    fetchAddress(initialLocation.lat, initialLocation.lng);
                }

                // Ensure map resizes correctly after mounting (increased delay)
                setTimeout(() => {
                    map.current?.resize();
                }, 500);

            } catch (error) {
                console.error('Map initialization error:', error);
            }
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update map language when prop changes
    useEffect(() => {
        if (map.current && map.current.isStyleLoaded()) {
            updateMapLanguage();
        }
    }, [currentLanguage]);

    const updateMapLanguage = () => {
        if (!map.current) return;
        const style = map.current.getStyle();
        if (!style) return;

        style.layers.forEach((layer) => {
            if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
                // Check if the layer likely uses the 'name' field
                const textField = JSON.stringify(layer.layout['text-field']);
                if (textField.includes('name')) {
                    if (isRTL) {
                        map.current?.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_ar'], ['get', 'name']]);
                    } else {
                        map.current?.setLayoutProperty(layer.id, 'text-field', ['get', 'name']);
                    }
                }
            }
        });
    };

    const fetchAddress = async (lat: number, lng: number) => {
        setIsLoadingAddress(true);
        try {
            let success = false;

            // Strategy 1: BigDataCloud (Client-side, usually reliable)
            try {
                const response = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${currentLanguage}`
                );
                const data = await response.json();

                if (data && (data.city || data.locality || data.principalSubdivision)) {
                    const components = [];
                    // Prioritize specific locality
                    if (data.locality && data.locality !== data.city) components.push(data.locality);
                    else if (data.principalSubdivision && data.principalSubdivision !== data.city) components.push(data.principalSubdivision);

                    // Add City
                    if (data.city) components.push(data.city);

                    if (components.length > 0) {
                        setAddress(components.join(', '));
                        success = true;
                    }
                }
            } catch (e) {
                console.warn('BigDataCloud failed, trying fallback...', e);
            }

            if (success) return;

            // Strategy 2: Nominatim (OpenStreetMap) Fallback
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'MaintMENA-App/1.0',
                        'Accept-Language': currentLanguage
                    }
                }
            );
            const data = await response.json();

            if (data && data.display_name) {
                const district = data.address?.neighbourhood || data.address?.suburb || data.address?.quarter || data.address?.district;
                const road = data.address?.road || data.address?.street;
                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state;

                if (city && (district || road)) {
                    setAddress(`${district || road}, ${city}`);
                } else {
                    // Fallback to first 3 parts
                    setAddress(data.display_name.split(',').slice(0, 3).join(','));
                }
            } else {
                setAddress(isRTL ? 'موقع محدد' : 'Selected Location');
            }
        } catch (error) {
            console.error('All geocoding strategies failed:', error);
            // Final fallback to coordinates
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setIsLoadingAddress(false);
        }
    };

    const handleLocateMe = () => {
        setIsLocating(true);
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    map.current?.flyTo({
                        center: [longitude, latitude],
                        zoom: 16,
                        essential: true,
                    });
                    setCurrentCenter({ lat: latitude, lng: longitude });
                    setIsLocating(false);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    toast.error(isRTL ? 'تعذر تحديد موقعك' : 'Could not detect location');
                    setIsLocating(false);
                }
            );
        } else {
            setIsLocating(false);
        }
    };

    const handleConfirm = () => {
        if (currentCenter) {
            onConfirm({
                lat: currentCenter.lat,
                lng: currentCenter.lng,
                address: address, // Pass the fetched address
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Map Container */}
            <div className="flex-1 relative">
                <div ref={mapContainer} className="w-full h-full" />

                {/* Center Pin (Uber style) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 pointer-events-none z-10">
                    <MapPin size={40} className="text-primary fill-primary/20 animate-bounce" />
                    <div className="w-2 h-2 bg-black/20 rounded-full mx-auto mt-1 blur-[2px]" />
                </div>

                {/* Locate Me Button */}
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-6 right-6 rounded-full w-12 h-12 shadow-lg z-10"
                    onClick={handleLocateMe}
                >
                    {isLocating ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <Navigation className="h-6 w-6" />
                    )}
                </Button>

                {/* Cancel Button */}
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-6 left-6 rounded-full w-10 h-10 bg-white/90 backdrop-blur shadow-sm z-10"
                    onClick={onCancel}
                >
                    <span className="text-xl">×</span>
                </Button>
            </div>

            {/* Bottom Sheet for Address & Confirm */}
            <div className="bg-background border-t p-5 pb-8 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] rounded-t-3xl -mt-5 relative z-20">
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />

                <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-1 text-center">
                        {isRTL ? 'الموقع المحدد' : 'Selected Location'}
                    </p>
                    <h3 className="font-semibold text-lg text-center px-4 line-clamp-2">
                        {isLoadingAddress ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isRTL ? 'جاري تحديد العنوان...' : 'Identifying address...'}
                            </span>
                        ) : (
                            address || (isRTL ? 'حرك الخريطة لتحديد الموقع' : 'Move map to select location')
                        )}
                    </h3>
                </div>

                <Button
                    className="w-full h-14 text-lg rounded-2xl shadow-lg"
                    onClick={handleConfirm}
                    disabled={!currentCenter || isLoadingAddress}
                >
                    {isRTL ? 'تأكيد الموقع' : 'Confirm Location'}
                </Button>
            </div>
        </div>
    );
};
