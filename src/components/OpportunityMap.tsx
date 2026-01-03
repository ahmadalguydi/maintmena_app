import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Wifi } from 'lucide-react';
import { getCityCoordinates } from '@/lib/cityCoordinates';

interface OpportunityMapProps {
  opportunities: Array<{
    id: string;
    title: string;
    location?: string;
    country?: string;
    city?: string;
    type: 'signal' | 'tender';
    urgency?: string;
  }>;
  currentLanguage: 'en' | 'ar';
}

const OpportunityMap = ({ opportunities, currentLanguage }: OpportunityMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [remoteCount, setRemoteCount] = useState(0);

  useEffect(() => {
    const remoteOpps = opportunities.filter(o => 
      o.country === 'remote' || 
      o.location?.toLowerCase().includes('remote') || 
      o.location?.toLowerCase().includes('online')
    );
    setRemoteCount(remoteOpps.length);
  }, [opportunities]);

  const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFpbnRtZW5hIiwiYSI6ImNtZ2llaG42MDA1NnIyanB3cDF4ZzFrY3EifQ.n7gHD7dPKeekWXgX7b-0Wg';

  const initializeMap = () => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [45, 23.8859], // Saudi Arabia center
        zoom: 4.5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for opportunities with city data
    opportunities.forEach((opp) => {
      // Skip remote opportunities or those without city data
      if (opp.country === 'remote' || !opp.city) return;
      
      // Get coordinates from city name
      const coords = getCityCoordinates(opp.city);
      
      if (coords && map.current) {
        // Updated colors: primary for signals, emerald for tenders
        const color = opp.type === 'signal' ? '#8B5CF6' : '#10b981';
        
        const el = document.createElement('div');
        el.className = 'opportunity-marker';
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.transition = 'transform 0.2s ease';
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.3)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const locationText = opp.location 
          ? `${opp.city}, ${opp.location}` 
          : opp.city;

        const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(
          `<div style="padding: 8px; min-width: 180px;">
            <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 13px;">${opp.title}</h3>
            <p style="font-size: 11px; color: #666; margin-bottom: 4px;">${locationText}</p>
            <span style="display: inline-block; padding: 2px 8px; background: ${color}; color: white; border-radius: 12px; font-size: 10px; text-transform: uppercase;">${opp.type}</span>
          </div>`
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([coords.lng, coords.lat])
          .setPopup(popup)
          .addTo(map.current);
        markersRef.current.push(marker);
      }
    });
  };

  useEffect(() => {
    initializeMap();
    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [opportunities]);


  return (
    <Card className="border-rule">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            {currentLanguage === 'ar' ? 'خريطة الفرص' : 'Opportunity Map'}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1 text-xs sm:text-sm whitespace-nowrap">
              <Wifi className="w-3 h-3 flex-shrink-0" />
              <span className="hidden sm:inline">{remoteCount} {currentLanguage === 'ar' ? 'عن بعد' : 'Remote'}</span>
              <span className="sm:hidden">{remoteCount}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="w-full h-[400px] rounded-lg overflow-hidden"
          />
          {opportunities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="text-muted-foreground">
                {currentLanguage === 'ar' ? 'لا توجد فرص لعرضها' : 'No opportunities to display'}
              </p>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
            <span className="text-muted-foreground">{currentLanguage === 'ar' ? 'إشارات' : 'Signals'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-muted-foreground">{currentLanguage === 'ar' ? 'مناقصات' : 'Tenders'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityMap;
