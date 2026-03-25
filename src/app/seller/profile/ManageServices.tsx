import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Check, X, ChevronDown, ChevronUp,
  Briefcase, Home, Loader2, Zap, ChevronRight,
} from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  SERVICE_CATEGORIES,
  getCategoryByKey,
  type ServiceCategory,
  type ServiceSubcategory,
} from '@/lib/serviceCategories';

interface ManageServicesProps {
  currentLanguage: 'en' | 'ar';
}

/** What we persist to profiles.services_pricing */
interface SellerService {
  id: string;
  category: string;               // category key
  subcategories: string[];         // subcategory keys
  duration: string;
  available: boolean;
}

export const ManageServices = ({ currentLanguage }: ManageServicesProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [services, setServices] = useState<SellerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [expandedTab, setExpandedTab] = useState<'home' | 'project'>('home');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const isAr = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Manage Services',
      subtitle: 'Select what you offer',
      activeServices: 'Your Services',
      noServices: 'No services yet',
      noServicesHint: 'Add services to start receiving job requests from the matching engine',
      addService: 'Add Service',
      homeServices: 'Home Services',
      projectServices: 'Project Services',
      matchingNote: 'Active services appear in the matching engine. Buyers looking for these services will be matched to you automatically.',
      alreadyAdded: 'Already added',
      saving: 'Saving…',
      remove: 'Remove',
      subcategories: 'Specialties',
      subcategoriesHint: 'Select the specific services you offer',
      selectAll: 'Select All',
      allSelected: 'All selected',
      active: 'Active',
      paused: 'Paused',
      cancel: 'Close',
    },
    ar: {
      title: 'إدارة الخدمات',
      subtitle: 'حدد ما تقدمه',
      activeServices: 'خدماتك',
      noServices: 'لا توجد خدمات بعد',
      noServicesHint: 'أضف خدمات للبدء في استقبال طلبات العمل من محرك المطابقة',
      addService: 'إضافة خدمة',
      homeServices: 'خدمات منزلية',
      projectServices: 'خدمات مشاريع',
      matchingNote: 'الخدمات النشطة تظهر في محرك المطابقة. العملاء الذين يبحثون عن هذه الخدمات يتم توجيههم إليك تلقائياً.',
      alreadyAdded: 'مضافة بالفعل',
      saving: 'جاري الحفظ…',
      remove: 'حذف',
      subcategories: 'التخصصات',
      subcategoriesHint: 'اختر الخدمات المحددة التي تقدمها',
      selectAll: 'اختر الكل',
      allSelected: 'تم اختيار الكل',
      active: 'نشط',
      paused: 'متوقف',
      cancel: 'إغلاق',
    },
  }[currentLanguage];

  // ── Load ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('services_pricing' as any)
        .eq('id', user.id)
        .single();
      const d = data as any;
      if (d?.services_pricing && Array.isArray(d.services_pricing)) {
        // Migrate old format (no subcategories field) to new
        const migrated: SellerService[] = d.services_pricing.map((s: any) => ({
          id: s.id || Date.now().toString(),
          category: s.category,
          subcategories: s.subcategories || [],
          duration: s.duration || '',
          available: s.available ?? true,
        }));
        setServices(migrated);
      }
      setLoading(false);
    })();
  }, [user]);

  // ── Persist ──
  const persistServices = async (updated: SellerService[]) => {
    if (!user) return;
    setSaving(true);

    const serviceCategories = updated
      .filter(s => s.available)
      .map(s => s.category);

    const { error } = await supabase
      .from('profiles')
      .update({
        services_pricing: updated as any,
        service_categories: serviceCategories,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', user.id);

    if (error) {
      toast.error(isAr ? 'فشل الحفظ' : 'Failed to save');
    } else {
      // Invalidate profile completeness so the checklist updates immediately
      queryClient.invalidateQueries({ queryKey: ['seller-profile-completeness', user?.id] });
    }
    setSaving(false);
  };

  // ── Handlers ──
  const addService = (categoryKey: string) => {
    if (services.some(s => s.category === categoryKey)) {
      toast.info(t.alreadyAdded);
      return;
    }
    const cat = getCategoryByKey(categoryKey);
    const newService: SellerService = {
      id: Date.now().toString(),
      category: categoryKey,
      subcategories: cat?.subcategories?.map(s => s.key) || [], // Select all by default
      duration: '',
      available: true,
    };
    const updated = [...services, newService];
    setServices(updated);
    setShowCategoryPicker(false);
    setExpandedServiceId(newService.id);
    persistServices(updated);
    toast.success(isAr ? 'تمت الإضافة — اختر التخصصات' : 'Added — choose your specialties');
  };

  const removeService = async (id: string) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    if (expandedServiceId === id) setExpandedServiceId(null);
    await persistServices(updated);
    toast.success(isAr ? 'تم الحذف' : 'Service removed');
  };

  const toggleSubcategory = async (serviceId: string, subKey: string) => {
    const updated = services.map(s => {
      if (s.id !== serviceId) return s;
      const has = s.subcategories.includes(subKey);
      return {
        ...s,
        subcategories: has
          ? s.subcategories.filter(k => k !== subKey)
          : [...s.subcategories, subKey],
      };
    });
    setServices(updated);
    await persistServices(updated);
  };

  const selectAllSubcategories = async (serviceId: string) => {
    const updated = services.map(s => {
      if (s.id !== serviceId) return s;
      const cat = getCategoryByKey(s.category);
      return {
        ...s,
        subcategories: cat?.subcategories?.map(sub => sub.key) || [],
      };
    });
    setServices(updated);
    await persistServices(updated);
  };

  const toggleAvailability = async (serviceId: string) => {
    const updated = services.map(s =>
      s.id === serviceId ? { ...s, available: !s.available } : s,
    );
    setServices(updated);
    await persistServices(updated);
  };

  const isCategoryAdded = (key: string) => services.some(s => s.category === key);

  // ── Category card in picker ──
  const CategoryCard = ({ cat }: { cat: ServiceCategory }) => {
    const added = isCategoryAdded(cat.key);
    const subCount = cat.subcategories?.length || 0;
    return (
      <button
        type="button"
        disabled={added}
        onClick={() => addService(cat.key)}
        className={cn(
          'flex items-center gap-3 rounded-2xl border p-3.5 transition-all text-start w-full',
          added
            ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800 opacity-50 cursor-default'
            : 'border-border hover:border-primary hover:bg-primary/5 active:scale-[0.98]',
        )}
      >
        <span className="text-xl shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <span className={cn('text-sm font-medium block truncate', isAr && 'text-right')}>
            {isAr ? cat.ar : cat.en}
          </span>
          {subCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {subCount} {isAr ? 'تخصص' : 'specialties'}
            </span>
          )}
        </div>
        {added && <Check className="w-4 h-4 text-green-500 shrink-0" />}
      </button>
    );
  };

  // ── Service list item ──
  const ServiceItem = ({ svc }: { svc: SellerService }) => {
    const cat = getCategoryByKey(svc.category);
    const isExpanded = expandedServiceId === svc.id;
    const subs = cat?.subcategories || [];
    const selectedCount = svc.subcategories.length;
    const totalCount = subs.length;
    const allSelected = totalCount > 0 && selectedCount === totalCount;

    return (
      <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <SoftCard animate={false} className={cn('p-0 overflow-hidden', !svc.available && 'opacity-50')}>
          {/* Header row */}
          <button
            type="button"
            className="w-full flex items-center gap-3 p-4"
            onClick={() => setExpandedServiceId(isExpanded ? null : svc.id)}
          >
            <span className="text-2xl">{cat?.icon || '🔧'}</span>
            <div className="flex-1 min-w-0 text-start">
              <p className="text-sm font-semibold truncate">
                {isAr ? cat?.ar : cat?.en || svc.category}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {totalCount > 0 ? (
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                    selectedCount === 0
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : allSelected
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                  )}>
                    {selectedCount}/{totalCount} {isAr ? 'تخصص' : 'selected'}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {cat?.type === 'project' ? (isAr ? 'مشروع' : 'Project') : (isAr ? 'منزلي' : 'Home')}
                  </span>
                )}
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                  svc.available
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                )}>
                  {svc.available ? t.active : t.paused}
                </span>
              </div>
            </div>
            {totalCount > 0 && (
              isExpanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {/* Expanded: subcategories + actions */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  {/* Subcategory chips */}
                  {subs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {t.subcategories}
                        </p>
                        {!allSelected && (
                          <button
                            type="button"
                            onClick={() => selectAllSubcategories(svc.id)}
                            className="text-[10px] font-semibold text-primary hover:underline"
                          >
                            {t.selectAll}
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {subs.map(sub => {
                          const selected = svc.subcategories.includes(sub.key);
                          return (
                            <button
                              key={sub.key}
                              type="button"
                              onClick={() => toggleSubcategory(svc.id, sub.key)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all active:scale-95',
                                selected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border text-muted-foreground hover:border-primary/50',
                              )}
                            >
                              {selected && <Check className="w-3 h-3" />}
                              {isAr ? sub.ar : sub.en}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(svc.id)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {svc.available ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تفعيل' : 'Activate')}
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => removeService(svc.id)}
                      className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t.remove}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SoftCard>
      </motion.div>
    );
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="px-4 py-5 space-y-5">

        {/* ── Matching engine note ── */}
        <SoftCard className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-blue-500/20">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">{t.matchingNote}</p>
          </div>
        </SoftCard>

        {/* ── Active services list ── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t.activeServices} ({services.length})
          </p>

          {services.length === 0 ? (
            <SoftCard className="text-center py-10">
              <div className="text-4xl mb-2 opacity-30">🔧</div>
              <p className="text-sm text-muted-foreground font-medium">{t.noServices}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.noServicesHint}</p>
            </SoftCard>
          ) : (
            <div className="space-y-3">
              {services.map(svc => (
                <ServiceItem key={svc.id} svc={svc} />
              ))}
            </div>
          )}
        </div>

        {/* ── Add service button ── */}
        <Button
          type="button"
          className="w-full rounded-2xl h-12 gap-2 text-sm"
          onClick={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          {showCategoryPicker ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCategoryPicker ? t.cancel : t.addService}
        </Button>

        {/* ── Category picker ── */}
        <AnimatePresence>
          {showCategoryPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {/* Home services */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedTab(expandedTab === 'home' ? 'project' : 'home')}
                    className="flex items-center gap-2 w-full mb-2"
                  >
                    <Home className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex-1 text-start">
                      {t.homeServices}
                    </span>
                    {expandedTab === 'home' ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {expandedTab === 'home' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-2">
                          {SERVICE_CATEGORIES.home.map(cat => (
                            <CategoryCard key={cat.key} cat={cat} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Project services */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedTab(expandedTab === 'project' ? 'home' : 'project')}
                    className="flex items-center gap-2 w-full mb-2"
                  >
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex-1 text-start">
                      {t.projectServices}
                    </span>
                    {expandedTab === 'project' ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {expandedTab === 'project' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-2">
                          {SERVICE_CATEGORIES.project.map(cat => (
                            <CategoryCard key={cat.key} cat={cat} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Saving indicator ── */}
        {saving && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t.saving}
          </div>
        )}
      </div>
    </div>
  );
};