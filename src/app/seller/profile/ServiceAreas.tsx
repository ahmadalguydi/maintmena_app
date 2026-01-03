import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Plus, X } from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Heading3, Body, Label } from '@/components/mobile/Typography';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { Slider } from '@/components/ui/slider';
import { CityCombobox } from '@/components/mobile/CityCombobox';

interface ServiceAreasProps {
  currentLanguage: 'en' | 'ar';
}

export const ServiceAreas = ({ currentLanguage }: ServiceAreasProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [radius, setRadius] = useState(50);
  const [loading, setLoading] = useState(true);

  const cities = SAUDI_CITIES_BILINGUAL;

  const content = {
    ar: {
      title: 'مناطق الخدمة',
      subtitle: 'المدن التي تخدمها',
      serviceRadius: 'نطاق الخدمة',
      km: 'كم',
      selectedCities: 'المدن المحددة',
      addCity: 'إضافة مدينة',
      noCities: 'لم تحدد مدن بعد',
      selectFirst: 'حدد المدن التي تخدمها',
      save: 'حفظ التغييرات',
      availableCities: 'المدن المتاحة'
    },
    en: {
      title: 'Service Areas',
      subtitle: 'Cities you serve',
      serviceRadius: 'Service Radius',
      km: 'km',
      selectedCities: 'Selected Cities',
      addCity: 'Add City',
      noCities: 'No cities selected',
      selectFirst: 'Select cities you serve',
      save: 'Save Changes',
      availableCities: 'Available Cities'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    loadServiceAreas();
  }, [user]);

  const loadServiceAreas = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('service_radius_km, service_cities')
        .eq('id', user.id)
        .single();

      if (data) {
        if (data.service_radius_km) {
          setRadius(data.service_radius_km);
        }
        if (data.service_cities && Array.isArray(data.service_cities)) {
          setSelectedCities(data.service_cities);
        }
      }
    } catch (error) {
      console.error('Error loading service areas:', error);
    }
    setLoading(false);
  };

  const toggleCity = (cityEn: string) => {
    if (selectedCities.includes(cityEn)) {
      setSelectedCities(selectedCities.filter(c => c !== cityEn));
    } else {
      setSelectedCities([...selectedCities, cityEn]);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          service_radius_km: radius,
          service_cities: selectedCities,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      navigate('/app/seller/profile');
    } catch (error) {
      console.error('Error saving service areas:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate('/app/seller/profile')}
      />

      <div className="px-4 py-6 space-y-6">
        {/* Service Radius */}
        <SoftCard animate={false} className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label lang={currentLanguage}>{t.serviceRadius}</Label>
              <span className={cn(
                'text-2xl font-bold text-primary',
                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
              )}>
                {radius} {t.km}
              </span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={(value) => setRadius(value[0])}
              min={10}
              max={200}
              step={10}
              className="w-full"
            />
            <Body lang={currentLanguage} className="text-sm text-muted-foreground text-center">
              {currentLanguage === 'ar' 
                ? `سوف تصلك فرص العمل ضمن ${radius} كم من موقعك`
                : `You'll receive job opportunities within ${radius} km of your location`
              }
            </Body>
          </div>
        </SoftCard>

        {/* Selected Cities */}
        <div>
          <Heading3 lang={currentLanguage} className="text-lg mb-3">
            {t.selectedCities}
          </Heading3>
          
          {selectedCities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedCities.map((cityEn) => {
                const city = cities.find(c => c.en === cityEn);
                return (
                  <motion.button
                    key={cityEn}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={() => toggleCity(cityEn)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full',
                      'bg-primary/10 border border-primary/20',
                      'hover:bg-primary/20 transition-colors',
                      currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}
                  >
                    <MapPin size={16} className="text-primary" />
                    <span className="text-sm font-medium">
                      {currentLanguage === 'ar' ? city?.ar : city?.en}
                    </span>
                    <X size={14} />
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <SoftCard className="text-center py-8">
              <div className="space-y-2">
                <div className="text-4xl opacity-20">📍</div>
                <Body lang={currentLanguage} className="text-muted-foreground">
                  {t.noCities}
                </Body>
                <Body lang={currentLanguage} className="text-sm text-muted-foreground">
                  {t.selectFirst}
                </Body>
              </div>
            </SoftCard>
          )}
        </div>

        {/* Available Cities */}
        <div>
          <Heading3 lang={currentLanguage} className="text-lg mb-3">
            {t.addCity}
          </Heading3>
          
          <CityCombobox
            value=""
            onValueChange={(value) => {
              if (value && !selectedCities.includes(value)) {
                toggleCity(value);
              }
            }}
            currentLanguage={currentLanguage}
            placeholder={currentLanguage === 'ar' ? 'اختر مدينة' : 'Select a city'}
          />
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} size="lg" className="w-full">
          {t.save}
        </Button>
      </div>
    </div>
  );
};