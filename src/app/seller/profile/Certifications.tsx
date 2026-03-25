import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Upload, Trash2, CheckCircle, X } from 'lucide-react';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading3, Body, Label } from '@/components/mobile/Typography';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    year: new Date().getFullYear().toString()
  });

  const content = {
    ar: {
      title: 'الشهادات والتراخيص',
      subtitle: 'اعتماداتك المهنية',
      addCertification: 'إضافة شهادة',
      noCerts: 'لا توجد شهادات بعد',
      addFirst: 'أضف شهاداتك لزيادة مصداقيتك',
      certName: 'اسم الشهادة',
      issuer: 'الجهة المانحة',
      year: 'السنة',
      verified: 'موثق',
      pending: 'قيد المراجعة',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      uploadCert: 'رفع صورة الشهادة',
      optional: 'اختياري'
    },
    en: {
      title: 'Certifications & Licenses',
      subtitle: 'Your professional credentials',
      addCertification: 'Add Certification',
      noCerts: 'No certifications yet',
      addFirst: 'Add certifications to boost your credibility',
      certName: 'Certification Name',
      issuer: 'Issuing Organization',
      year: 'Year',
      verified: 'Verified',
      pending: 'Pending Review',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      uploadCert: 'Upload Certificate Image',
      optional: 'Optional'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    loadCertifications();
  }, [user]);

  const loadCertifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('certifications')
      .eq('id', user.id)
      .single();

    if (data?.certifications) {
      // Parse certifications from string array to object array
      try {
        const parsed = data.certifications.map((certStr: string, idx: number) => {
          try {
            return JSON.parse(certStr);
          } catch {
            return {
              id: idx.toString(),
              name: certStr,
              issuer: 'Unknown',
              year: new Date().getFullYear().toString(),
              verified: false
            };
          }
        });
        setCertifications(parsed);
      } catch (error) {
        console.error('Error parsing certifications:', error);
      }
    }
    setLoading(false);
  };

  const handleAddCertification = async () => {
    if (!user || !formData.name || !formData.issuer || !formData.year) {
      toast.error(currentLanguage === 'ar' ? 'املأ جميع الحقول' : 'Fill all fields');
      return;
    }

    try {
      const newCert: Certification = {
        id: Date.now().toString(),
        name: formData.name,
        issuer: formData.issuer,
        year: formData.year,
        verified: false
      };

      const updatedCerts = [...certifications, newCert];

      // Convert to string array for database
      const certsAsStrings = updatedCerts.map(cert => JSON.stringify(cert));

      const { error } = await supabase
        .from('profiles')
        .update({
          certifications: certsAsStrings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setCertifications(updatedCerts);
      setShowAddDialog(false);
      setFormData({ name: '', issuer: '', year: new Date().getFullYear().toString() });
      toast.success(currentLanguage === 'ar' ? 'تمت الإضافة' : 'Certification added');
    } catch (error) {
      console.error('Error adding certification:', error);
      toast.error(currentLanguage === 'ar' ? 'فشلت الإضافة' : 'Failed to add');
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      const updatedCerts = certifications.filter(cert => cert.id !== id);

      // Convert to string array for database
      const certsAsStrings = updatedCerts.map(cert => JSON.stringify(cert));

      const { error } = await supabase
        .from('profiles')
        .update({
          certifications: certsAsStrings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setCertifications(updatedCerts);
      toast.success(currentLanguage === 'ar' ? 'تم الحذف' : 'Certification deleted');
    } catch (error) {
      console.error('Error deleting certification:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل الحذف' : 'Failed to delete');
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
        {/* Add Certification Button */}
        <Button
          onClick={() => setShowAddDialog(true)}
          className="w-full"
          size="lg"
        >
          <Award size={20} />
          {t.addCertification}
        </Button>

        {/* Certifications List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted/50 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : certifications.length > 0 ? (
          <div className="space-y-3">
            {certifications.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SoftCard animate={false} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'p-3 rounded-2xl',
                      cert.verified ? 'bg-green-500/10' : 'bg-amber-500/10'
                    )}>
                      <Award size={24} className={cert.verified ? 'text-green-600' : 'text-amber-600'} />
                    </div>

                    <div className="flex-1 space-y-2">
                      <Heading3 lang={currentLanguage} className="text-base leading-tight">
                        {cert.name}
                      </Heading3>
                      <Body lang={currentLanguage} className="text-sm text-muted-foreground">
                        {cert.issuer} • {cert.year}
                      </Body>
                      <div className="flex items-center gap-2">
                        {cert.verified ? (
                          <div className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                          )}>
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">{t.verified}</span>
                          </div>
                        ) : (
                          <div className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                          )}>
                            <span className="text-xs font-medium">{t.pending}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCertification(cert.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} className="text-destructive" />
                    </button>
                  </div>
                </SoftCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <SoftCard className="text-center py-16">
            <div className="space-y-3">
              <div className="text-6xl opacity-20">🏆</div>
              <Heading3 lang={currentLanguage}>{t.noCerts}</Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground max-w-xs mx-auto">
                {t.addFirst}
              </Body>
            </div>
          </SoftCard>
        )}
      </div>

      {/* Add Certification Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[90vw]">
          <DialogHeader>
            <DialogTitle className={cn(currentLanguage === 'ar' ? 'font-ar-display' : 'font-display')}>
              {t.addCertification}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.certName}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., HVAC Certification"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.issuer}</Label>
              <Input
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder="e.g., Saudi TVTC"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.year}</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2024"
                min="1980"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                {t.cancel}
              </Button>
              <Button onClick={handleAddCertification} className="flex-1">
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
