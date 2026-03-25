import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SoftCard } from './SoftCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heading3, Body, BodySmall } from './Typography';
import { MapPin, Plus, Trash2, Star, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { CityCombobox } from './CityCombobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface AddressManagerProps {
  currentLanguage: 'en' | 'ar';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  city: string;
  neighborhood: string | null;
  full_address: string;
  is_default: boolean;
  created_at: string;
}

export const AddressManager = ({ currentLanguage, open, onOpenChange }: AddressManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    city: '',
    neighborhood: '',
    full_address: '',
    is_default: false
  });

  const content = {
    en: {
      title: 'My Addresses',
      addAddress: 'Add Address',
      editAddress: 'Edit Address',
      label: 'Label (e.g., Home, Work)',
      city: 'City',
      neighborhood: 'Neighborhood',
      fullAddress: 'Full Address',
      setDefault: 'Set as default',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      noAddresses: 'No saved addresses',
      addFirst: 'Add your first address',
      default: 'Default',
      deleteSuccess: 'Address deleted',
      saveSuccess: 'Address saved'
    },
    ar: {
      title: 'عناويني',
      addAddress: 'إضافة عنوان',
      editAddress: 'تعديل العنوان',
      label: 'التسمية (مثل: المنزل، العمل)',
      city: 'المدينة',
      neighborhood: 'الحي',
      fullAddress: 'العنوان الكامل',
      setDefault: 'تعيين كأساسي',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      noAddresses: 'لا توجد عناوين محفوظة',
      addFirst: 'أضف عنوانك الأول',
      default: 'أساسي',
      deleteSuccess: 'تم حذف العنوان',
      saveSuccess: 'تم حفظ العنوان'
    }
  };

  const t = content[currentLanguage];

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as UserAddress[];
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.is_default) {
        // Clear other defaults first
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user?.id);
      }

      if (data.id) {
        const { error } = await supabase
          .from('user_addresses')
          .update({
            label: data.label,
            city: data.city,
            neighborhood: data.neighborhood || null,
            full_address: data.full_address,
            is_default: data.is_default
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user?.id,
            label: data.label,
            city: data.city,
            neighborhood: data.neighborhood || null,
            full_address: data.full_address,
            is_default: data.is_default || addresses.length === 0
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      toast.success(t.saveSuccess);
      handleCloseModal();
    },
    onError: (error) => {
      toast.error(String(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      toast.success(t.deleteSuccess);
    }
  });

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setFormData({ label: '', city: '', neighborhood: '', full_address: '', is_default: false });
  };

  const handleEdit = (address: UserAddress) => {
    setFormData({
      label: address.label,
      city: address.city,
      neighborhood: address.neighborhood || '',
      full_address: address.full_address,
      is_default: address.is_default
    });
    setEditingId(address.id);
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!formData.label || !formData.city || !formData.full_address) {
      toast.error(currentLanguage === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    saveMutation.mutate({ ...formData, id: editingId || undefined });
  };

  const managerContent = (
    <div className="space-y-4">
      <Button
        onClick={() => setShowAddModal(true)}
        className="w-full h-12 rounded-full"
        variant="outline"
      >
        <Plus size={18} className="mr-2" />
        {t.addAddress}
      </Button>

      {/* Addresses List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <SoftCard className="text-center py-8">
          <MapPin className="mx-auto mb-3 text-muted-foreground" size={40} />
          <BodySmall lang={currentLanguage} className="text-muted-foreground">
            {t.noAddresses}
          </BodySmall>
        </SoftCard>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <SoftCard key={address.id} className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Heading3 lang={currentLanguage} className="text-base">
                      {address.label}
                    </Heading3>
                    {address.is_default && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                        <Star size={10} />
                        {t.default}
                      </span>
                    )}
                  </div>
                  <BodySmall lang={currentLanguage} className="text-muted-foreground">
                    {(() => {
                      const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
                        c.en.toLowerCase() === address.city?.toLowerCase() ||
                        c.ar === address.city ||
                        c.aliases?.some(alias => alias.toLowerCase() === address.city?.toLowerCase())
                      );
                      const displayCity = cityData
                        ? (currentLanguage === 'ar' ? cityData.ar : cityData.en)
                        : address.city;
                      return `${displayCity}${address.neighborhood ? `, ${address.neighborhood}` : ''}`;
                    })()}
                  </BodySmall>
                  <BodySmall lang={currentLanguage} className="text-muted-foreground line-clamp-1">
                    {address.full_address}
                  </BodySmall>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <Edit2 size={16} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(address.id)}
                    className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
            </SoftCard>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={handleCloseModal}>
        <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className={cn(currentLanguage === 'ar' && 'font-ar-heading')}>
              {editingId ? t.editAddress : t.addAddress}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingId ? t.editAddress : t.addAddress}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.label} *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder={currentLanguage === 'ar' ? 'المنزل' : 'Home'}
                className="border-2 border-primary/50 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>{t.city} *</Label>
              <CityCombobox
                value={formData.city}
                onValueChange={(value) => setFormData({ ...formData, city: value })}
                currentLanguage={currentLanguage}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.neighborhood}</Label>
              <Input
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.fullAddress} *</Label>
              <Input
                value={formData.full_address}
                onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                className="border-2 border-primary/50 focus:border-primary"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">{t.setDefault}</span>
            </label>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                {t.cancel}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={saveMutation.isPending}
              >
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // If open/onOpenChange props are provided, wrap in a dialog
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(currentLanguage === 'ar' && 'font-ar-heading')}>
              {t.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t.title}
            </DialogDescription>
          </DialogHeader>
          {managerContent}
        </DialogContent>
      </Dialog>
    );
  }

  return managerContent;
};