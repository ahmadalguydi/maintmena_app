import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Trash2, CheckCircle, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CertificationsProps {
  currentLanguage: 'en' | 'ar';
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  verified: boolean;
  imageUrl?: string;
}

export const Certifications = ({ currentLanguage }: CertificationsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    year: new Date().getFullYear().toString(),
  });

  const isAr = currentLanguage === 'ar';

  const t = {
    en: {
      title: 'Certifications',
      subtitle: 'Your professional credentials',
      addCertification: 'Add Certification',
      noCerts: 'No certifications yet',
      addFirst: 'Add certifications to boost your credibility and increase your job acceptance rate',
      certName: 'Certification Name',
      certNamePlaceholder: 'e.g. HVAC Certification, Electrical License',
      issuer: 'Issuing Organization',
      issuerPlaceholder: 'e.g. Saudi TVTC, Ministry of Human Resources',
      year: 'Year Obtained',
      verified: 'Verified',
      pending: 'Pending Review',
      save: 'Add Certification',
      saving: 'Saving…',
      cancel: 'Cancel',
      delete: 'Delete',
      deleteConfirm: 'Delete this certification?',
      deleteConfirmSub: 'This action cannot be undone.',
      deleteYes: 'Delete',
      credentialNote: 'Verified credentials build buyer trust and unlock priority dispatch.',
    },
    ar: {
      title: 'الشهادات والتراخيص',
      subtitle: 'اعتماداتك المهنية',
      addCertification: 'إضافة شهادة',
      noCerts: 'لا توجد شهادات بعد',
      addFirst: 'أضف شهاداتك لرفع مصداقيتك وزيادة معدل قبول طلباتك',
      certName: 'اسم الشهادة',
      certNamePlaceholder: 'مثلاً: شهادة التكييف، رخصة الكهرباء',
      issuer: 'الجهة المانحة',
      issuerPlaceholder: 'مثلاً: المؤسسة العامة للتدريب، وزارة الموارد البشرية',
      year: 'سنة الحصول',
      verified: 'موثقة',
      pending: 'قيد المراجعة',
      save: 'إضافة الشهادة',
      saving: 'جاري الحفظ…',
      cancel: 'إلغاء',
      delete: 'حذف',
      deleteConfirm: 'حذف هذه الشهادة؟',
      deleteConfirmSub: 'لا يمكن التراجع عن هذا الإجراء.',
      deleteYes: 'حذف',
      credentialNote: 'الشهادات الموثقة تبني ثقة العملاء وتمنحك أولوية في توزيع المهام.',
    },
  }[currentLanguage];

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('certifications')
        .eq('id', user.id)
        .single();

      if (data?.certifications && Array.isArray(data.certifications)) {
        try {
          const parsed = (data.certifications as string[]).map((certStr, idx) => {
            try {
              return JSON.parse(certStr);
            } catch {
              return {
                id: idx.toString(),
                name: certStr,
                issuer: '',
                year: new Date().getFullYear().toString(),
                verified: false,
              };
            }
          });
          setCertifications(parsed);
        } catch {
          // ignore parse errors
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const persistCerts = async (updated: Certification[]) => {
    const certsAsStrings = updated.map(cert => JSON.stringify(cert));
    const { error } = await supabase
      .from('profiles')
      .update({
        certifications: certsAsStrings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user?.id);
    if (error) throw error;
    setCertifications(updated);
  };

  const handleAddCertification = async () => {
    if (!user || !formData.name.trim() || !formData.issuer.trim() || !formData.year) {
      toast.error(isAr ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      const newCert: Certification = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        issuer: formData.issuer.trim(),
        year: formData.year,
        verified: false,
      };
      await persistCerts([...certifications, newCert]);
      setShowAddSheet(false);
      setFormData({ name: '', issuer: '', year: new Date().getFullYear().toString() });
      toast.success(isAr ? 'تمت الإضافة' : 'Certification added');
    } catch {
      toast.error(isAr ? 'فشلت الإضافة' : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      await persistCerts(certifications.filter(cert => cert.id !== id));
      setConfirmDeleteId(null);
      toast.success(isAr ? 'تم الحذف' : 'Certification deleted');
    } catch {
      toast.error(isAr ? 'فشل الحذف' : 'Failed to delete');
    }
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={isAr ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        subtitle={t.subtitle}
        showBack
        onBack={() => navigate(-1)}
      />

      <div className="px-4 py-5 space-y-5">

        {/* Credential note */}
        <SoftCard className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20">
          <div className="flex items-start gap-2.5">
            <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {t.credentialNote}
            </p>
          </div>
        </SoftCard>

        {/* Add button */}
        <Button
          onClick={() => setShowAddSheet(true)}
          className="w-full rounded-2xl h-12 gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          {t.addCertification}
        </Button>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : certifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {certifications.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: isAr ? 40 : -40 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <SoftCard animate={false}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                        cert.verified ? 'bg-green-500/10' : 'bg-amber-500/10',
                      )}>
                        <Award className={cn('w-5 h-5', cert.verified ? 'text-green-600' : 'text-amber-600')} />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className={cn('text-sm font-semibold leading-tight', isAr ? 'font-ar-display' : 'font-display')}>
                          {cert.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {cert.year}
                          </span>
                          {cert.verified ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200">
                              <CheckCircle className="w-2.5 h-2.5" />
                              {t.verified}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                              {t.pending}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(cert.id)}
                        className="p-2 rounded-xl hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                    </div>

                    {/* Inline delete confirm */}
                    <AnimatePresence>
                      {confirmDeleteId === cert.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-destructive">{t.deleteConfirm}</p>
                              <p className="text-[10px] text-muted-foreground mb-2">{t.deleteConfirmSub}</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-8 rounded-full text-xs"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  {t.cancel}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 h-8 rounded-full text-xs"
                                  onClick={() => handleDeleteCertification(cert.id)}
                                >
                                  {t.deleteYes}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SoftCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <SoftCard className="text-center py-14">
            <div className="space-y-3">
              <div className="text-5xl opacity-20">🏆</div>
              <p className={cn('text-base font-bold', isAr ? 'font-ar-display' : 'font-display')}>
                {t.noCerts}
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {t.addFirst}
              </p>
            </div>
          </SoftCard>
        )}
      </div>

      {/* Add Certification Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader>
            <SheetTitle className={isAr ? 'text-right font-ar-display' : 'font-display'}>
              {t.addCertification}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-5 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t.certName}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.certNamePlaceholder}
                className="rounded-full"
                dir={isAr ? 'rtl' : 'ltr'}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t.issuer}
              </label>
              <Input
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder={t.issuerPlaceholder}
                className="rounded-full"
                dir={isAr ? 'rtl' : 'ltr'}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t.year}
              </label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder={new Date().getFullYear().toString()}
                min="1980"
                max={new Date().getFullYear()}
                className="rounded-full"
                dir="ltr"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddSheet(false)}
                className="flex-1 rounded-full"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleAddCertification}
                disabled={saving}
                className="flex-1 rounded-full"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? t.saving : t.save}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
