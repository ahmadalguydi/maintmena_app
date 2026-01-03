import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, ChevronDown } from 'lucide-react';
import { CityCombobox } from './CityCombobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface AddressPickerProps {
  currentLanguage: 'en' | 'ar';
  selectedCity?: string;
  selectedAddress?: string;
  onAddressSelect: (address: { city: string; full_address: string }) => void;
  required?: boolean;
}

interface UserAddress {
  id: string;
  label: string;
  city: string;
  neighborhood: string | null;
  full_address: string;
  is_default: boolean;
}

export const AddressPicker = ({ currentLanguage, selectedCity, selectedAddress, onAddressSelect, required }: AddressPickerProps) => {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: '',
    city: '',
    neighborhood: '',
    full_address: ''
  });

  const content = {
    en: {
      selectAddress: 'Select Address',
      addNew: 'Add New Address',
      label: 'Label (e.g., Home, Work)',
      city: 'City',
      neighborhood: 'Neighborhood',
      fullAddress: 'Full Address',
      save: 'Save & Use',
      cancel: 'Cancel',
      noAddresses: 'No saved addresses - add one below',
      or: 'Or enter manually',
      editAddress: 'Edit Address'
    },
    ar: {
      selectAddress: 'اختر العنوان',
      addNew: 'إضافة عنوان جديد',
      label: 'التسمية (مثل: المنزل، العمل)',
      city: 'المدينة',
      neighborhood: 'الحي',
      fullAddress: 'العنوان الكامل',
      save: 'حفظ واستخدام',
      cancel: 'إلغاء',
      noAddresses: 'لا توجد عناوين محفوظة - أضف واحداً أدناه',
      or: 'أو أدخل يدوياً',
      editAddress: 'تعديل العنوان'
    }
  };



  const t = content[currentLanguage];

  const getCityName = (cityEn: string) => {
    if (currentLanguage === 'en') return cityEn;
    const cityData = SAUDI_CITIES_BILINGUAL.find(c => c.en.toLowerCase() === cityEn.toLowerCase());
    return cityData ? cityData.ar : cityEn;
  };

  const { data: addresses = [], refetch } = useQuery({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return [];
      return data as UserAddress[];
    },
    enabled: !!user
  });

  // Sync saved address or set default
  useEffect(() => {
    if (addresses.length === 0) return;

    // Case 1: Props provided (Saved/Restored state), but internal ID not set
    if ((selectedCity || selectedAddress) && !selectedAddressId) {
      const match = addresses.find(a =>
        (a.city === selectedCity && a.full_address === selectedAddress) ||
        a.full_address === selectedAddress
      );
      if (match) {
        setSelectedAddressId(match.id);
      }
      return;
    }

    // Case 2: No selection (New Request), auto-select default
    if (!selectedAddressId && !selectedCity && !selectedAddress) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      onAddressSelect({
        city: defaultAddr.city,
        full_address: defaultAddr.full_address
      });
    }
  }, [addresses, selectedCity, selectedAddress, selectedAddressId]);

  const handleAddressSelect = (addressId: string) => {
    if (addressId === 'new') {
      setShowAddModal(true);
      return;
    }

    setSelectedAddressId(addressId);
    const addr = addresses.find(a => a.id === addressId);
    if (addr) {
      onAddressSelect({
        city: addr.city,
        full_address: addr.full_address
      });
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.city || !newAddress.full_address) {
      toast.error(currentLanguage === 'ar' ? 'يرجى ملء المدينة والعنوان' : 'Please fill city and address');
      return;
    }

    if (user) {
      if (editingAddressId) {
        // Update existing address
        const { error } = await supabase
          .from('user_addresses')
          .update({
            label: newAddress.label || (currentLanguage === 'ar' ? 'عنوان جديد' : 'New Address'),
            city: newAddress.city,
            neighborhood: newAddress.neighborhood || null,
            full_address: newAddress.full_address,
          })
          .eq('id', editingAddressId);

        if (!error) {
          refetch();
          toast.success(currentLanguage === 'ar' ? 'تم تحديث العنوان' : 'Address updated');
        }
      } else {
        // Save new address
        const { data, error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user.id,
            label: newAddress.label || (currentLanguage === 'ar' ? 'عنوان جديد' : 'New Address'),
            city: newAddress.city,
            neighborhood: newAddress.neighborhood || null,
            full_address: newAddress.full_address,
            is_default: addresses.length === 0
          })
          .select()
          .single();

        if (!error && data) {
          refetch();
          setSelectedAddressId(data.id);
        }
      }
    }

    // Use the address
    onAddressSelect({
      city: newAddress.city,
      full_address: newAddress.full_address
    });

    setShowAddModal(false);
    setEditingAddressId(null);
    setNewAddress({ label: '', city: '', neighborhood: '', full_address: '' });
  };

  const handleEditAddress = () => {
    const selectedAddr = addresses.find(a => a.id === selectedAddressId);
    if (selectedAddr) {
      setEditingAddressId(selectedAddr.id);
      setNewAddress({
        label: selectedAddr.label || '',
        city: selectedAddr.city || '',
        neighborhood: selectedAddr.neighborhood || '',
        full_address: selectedAddr.full_address || ''
      });
    } else if (selectedCity && selectedAddress) {
      // Fallback when we have the address data but no ID (e.g., from props/localStorage)
      setEditingAddressId(null);
      setNewAddress({
        label: currentLanguage === 'ar' ? 'العنوان' : 'Address',
        city: selectedCity,
        neighborhood: '',
        full_address: selectedAddress
      });
    }
    setShowAddModal(true);
  };

  const borderClass = required ? 'border-2 border-primary/50 focus:border-primary' : '';

  // Save guest address to localStorage for sync after signup
  const saveGuestAddress = (city: string, full_address: string) => {
    try {
      localStorage.setItem('pendingGuestAddress', JSON.stringify({ city, full_address }));
    } catch (e) {
      // localStorage not available
    }
  };

  // If no user (guest), show simple inputs with localStorage persistence
  if (!user) {
    return (
      <div className="space-y-3">
        <CityCombobox
          value={selectedCity || ''}
          onValueChange={(city) => {
            saveGuestAddress(city, selectedAddress || '');
            onAddressSelect({ city, full_address: selectedAddress || '' });
          }}
          currentLanguage={currentLanguage}
        />
        <Input
          placeholder={t.fullAddress}
          value={selectedAddress || ''}
          onChange={(e) => {
            saveGuestAddress(selectedCity || '', e.target.value);
            onAddressSelect({ city: selectedCity || '', full_address: e.target.value });
          }}
          className={cn(borderClass, currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.length > 0 ? (
        <Select value={selectedAddressId} onValueChange={handleAddressSelect}>
          <SelectTrigger className={cn(borderClass, currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
            <SelectValue placeholder={t.selectAddress} />
          </SelectTrigger>
          <SelectContent className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
            {addresses.map((addr) => (
              <SelectItem key={addr.id} value={addr.id} className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{addr.label}</span>
                  <span className="text-muted-foreground text-xs">
                    - {getCityName(addr.city)}
                  </span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="new" className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}>
              <div className="flex items-center gap-2 text-primary">
                <Plus size={14} />
                <span>{t.addNew}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddModal(true)}
          className={cn(
            "w-full justify-start",
            borderClass,
            currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
          )}
        >
          <Plus size={16} className="mr-2" />
          {t.addNew}
        </Button>
      )}

      {/* Display selected address - Card with Map Preview */}
      {selectedCity && selectedAddress && (() => {
        const selectedAddr = addresses.find(a => a.id === selectedAddressId);
        const label = selectedAddr?.label || (currentLanguage === 'ar' ? 'العنوان' : 'Address');

        return (
          <div className="w-full bg-gray-50/80 rounded-2xl p-4 flex items-center gap-4">
            {/* Map Thumbnail - Stylized CSS Map */}
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative bg-gradient-to-br from-[#e8f4ea] via-[#f5f5f0] to-[#e8eef4]">
              {/* Map grid pattern */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(90deg, rgba(200,200,200,0.3) 1px, transparent 1px), linear-gradient(rgba(200,200,200,0.3) 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }} />
              {/* Roads */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/90" />
              <div className="absolute top-0 bottom-0 left-1/3 w-[2px] bg-white/90" />
              <div className="absolute top-1/4 left-0 right-0 h-[1px] bg-gray-300/60" />
              <div className="absolute top-0 bottom-0 right-1/4 w-[1px] bg-gray-300/60" />
              {/* Location marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%]">
                <MapPin size={14} className="text-primary fill-primary drop-shadow-sm" />
              </div>
            </div>

            {/* Address Info */}
            <div className="flex-1 min-w-0">
              <div className={cn(
                "text-base font-semibold text-gray-900 truncate",
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
              )}>
                {label}
              </div>
              <div className={cn(
                "text-sm text-gray-500 truncate mt-0.5",
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
              )}>
                {selectedAddress}, {getCityName(selectedCity)}
              </div>
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={handleEditAddress}
              className={cn(
                "text-primary text-sm font-medium flex-shrink-0 hover:underline",
                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
              )}
            >
              {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
            </button>
          </div>
        );
      })()}

      {/* Add Address Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={cn(currentLanguage === 'ar' && 'font-ar-heading')}>
              {editingAddressId ? t.editAddress : t.addNew}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {user && (
              <div className="space-y-2">
                <Label>{t.label}</Label>
                <Input
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  placeholder={currentLanguage === 'ar' ? 'المنزل' : 'Home'}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t.city} *</Label>
              <CityCombobox
                value={newAddress.city}
                onValueChange={(city) => setNewAddress({ ...newAddress, city })}
                currentLanguage={currentLanguage}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.neighborhood}</Label>
              <Input
                value={newAddress.neighborhood}
                onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                className={cn(currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.fullAddress} *</Label>
              <Input
                value={newAddress.full_address}
                onChange={(e) => setNewAddress({ ...newAddress, full_address: e.target.value })}
                className={cn("border-2 border-primary/50", currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']")}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                {t.cancel}
              </Button>
              <Button onClick={handleSaveNewAddress} className="flex-1">
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};