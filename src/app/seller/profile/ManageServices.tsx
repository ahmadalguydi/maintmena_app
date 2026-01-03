import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, DollarSign, Clock } from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading3, Label, Body } from '@/components/mobile/Typography';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getAllCategories } from '@/lib/serviceCategories';
import { Switch } from '@/components/ui/switch';

interface ManageServicesProps {
  currentLanguage: 'en' | 'ar';
}

interface Service {
  id: string;
  category: string;
  price: number;
  duration: string;
  available: boolean;
}

export const ManageServices = ({ currentLanguage }: ManageServicesProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const categories = getAllCategories();

  const content = {
    ar: {
      title: 'إدارة الخدمات',
      subtitle: 'الخدمات التي تقدمها والأسعار',
      addService: 'إضافة خدمة جديدة',
      noServices: 'لم تضف خدمات بعد',
      addFirst: 'ابدأ بإضافة خدمتك الأولى',
      category: 'الفئة',
      price: 'السعر',
      duration: 'المدة المقدرة',
      available: 'متاح',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      perHour: 'ريال/ساعة',
      days: 'أيام',
      selectCategory: 'اختر فئة'
    },
    en: {
      title: 'Manage Services',
      subtitle: 'Services you offer and pricing',
      addService: 'Add New Service',
      noServices: 'No services added yet',
      addFirst: 'Start by adding your first service',
      category: 'Category',
      price: 'Price',
      duration: 'Estimated Duration',
      available: 'Available',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      perHour: 'SAR/hour',
      days: 'days',
      selectCategory: 'Select category'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    loadServices();
  }, [user]);

  const loadServices = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('services_pricing')
        .eq('id', user.id)
        .single();

      if (data?.services_pricing && Array.isArray(data.services_pricing)) {
        setServices(data.services_pricing as unknown as Service[]);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
    setLoading(false);
  };

  const handleSaveService = async (service: Partial<Service>) => {
    if (!user) return;

    try {
      let updatedServices: Service[];

      if (editingService) {
        // Update existing service
        updatedServices = services.map(s =>
          s.id === editingService.id
            ? { ...s, ...service }
            : s
        );
      } else {
        // Add new service
        const newService: Service = {
          id: Date.now().toString(),
          category: service.category || '',
          price: Number(service.price) || 0,
          duration: service.duration || '',
          available: service.available ?? true
        };
        updatedServices = [...services, newService];
      }

      // Extract service categories for backward compatibility
      const serviceCategories = updatedServices
        .filter(s => s.available)
        .map(s => s.category);

      const { error } = await supabase
        .from('profiles')
        .update({
          services_pricing: updatedServices as any,
          service_categories: serviceCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setServices(updatedServices);
      setShowAddForm(false);
      setEditingService(null);
      toast.success(currentLanguage === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!user) return;

    try {
      const updatedServices = services.filter(s => s.id !== id);

      // Extract service categories for backward compatibility
      const serviceCategories = updatedServices
        .filter(s => s.available)
        .map(s => s.category);

      const { error } = await supabase
        .from('profiles')
        .update({
          services_pricing: updatedServices as any,
          service_categories: serviceCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setServices(updatedServices);
      toast.success(currentLanguage === 'ar' ? 'تم الحذف' : 'Deleted');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  const toggleAvailability = async (id: string, available: boolean) => {
    if (!user) return;

    try {
      const updatedServices = services.map(s =>
        s.id === id ? { ...s, available } : s
      );

      // Extract service categories for backward compatibility
      const serviceCategories = updatedServices
        .filter(s => s.available)
        .map(s => s.category);

      const { error } = await supabase
        .from('profiles')
        .update({
          services_pricing: updatedServices as any,
          service_categories: serviceCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setServices(updatedServices);
      toast.success(currentLanguage === 'ar' ? 'تم التحديث' : 'Updated');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل التحديث' : 'Failed to update');
    }
  };

  const ServiceForm = ({ service, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
      category: service?.category || '',
      price: service?.price || '',
      duration: service?.duration || '',
      available: service?.available ?? true
    });

    return (
      <SoftCard animate={false} className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label lang={currentLanguage}>{t.category}</Label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={cn(
                'flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base',
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
              )}
            >
              <option value="">{t.selectCategory}</option>
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.icon} {currentLanguage === 'ar' ? cat.ar : cat.en}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label lang={currentLanguage}>
              {t.price} ({t.perHour}) <span className="text-xs text-muted-foreground">({currentLanguage === 'ar' ? 'اختياري' : 'Optional'})</span>
            </Label>
            <div className="relative">
              <DollarSign size={20} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="pl-10"
                placeholder={currentLanguage === 'ar' ? 'اترك فارغاً للتفاوض' : 'Leave blank for negotiation'}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {currentLanguage === 'ar'
                ? 'اترك السعر فارغاً إذا كنت تفضل التفاوض مع كل عميل'
                : 'Leave price blank if you prefer to negotiate with each client'}
            </p>
          </div>

          <div className="space-y-2">
            <Label lang={currentLanguage}>{t.duration}</Label>
            <div className="relative">
              <Clock size={20} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="pl-10"
                placeholder="2-4 hours"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label lang={currentLanguage}>{t.available}</Label>
            <Switch
              checked={formData.available}
              onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              {t.cancel}
            </Button>
            <Button onClick={() => onSave(formData)} className="flex-1">
              {t.save}
            </Button>
          </div>
        </div>
      </SoftCard>
    );
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
        {/* Add Service Button */}
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full"
            size="lg"
          >
            <Plus size={20} />
            {t.addService}
          </Button>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingService) && (
          <ServiceForm
            service={editingService}
            onSave={handleSaveService}
            onCancel={() => {
              setShowAddForm(false);
              setEditingService(null);
            }}
          />
        )}

        {/* Services List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="space-y-3">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SoftCard animate={false} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Heading3 lang={currentLanguage} className="text-base">
                        {categories.find(c => c.key === service.category)?.[currentLanguage === 'ar' ? 'ar' : 'en']}
                      </Heading3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className={cn(currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                          {service.price} {t.perHour}
                        </span>
                        <span className={cn(currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                          {service.duration}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.available}
                          onCheckedChange={(checked) => toggleAvailability(service.id, checked)}
                        />
                        <Body lang={currentLanguage} className="text-sm text-muted-foreground">
                          {service.available ? t.available : (currentLanguage === 'ar' ? 'غير متاح' : 'Unavailable')}
                        </Body>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setEditingService(service)}
                        className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} className="text-primary" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </SoftCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <SoftCard className="text-center py-12">
            <div className="space-y-3">
              <div className="text-5xl opacity-20">🔧</div>
              <Heading3 lang={currentLanguage}>{t.noServices}</Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground">
                {t.addFirst}
              </Body>
            </div>
          </SoftCard>
        )}
      </div>
    </div>
  );
};