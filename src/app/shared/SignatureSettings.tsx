import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading2, Body, BodySmall } from '@/components/mobile/Typography';
import { Button } from '@/components/ui/button';
import { SignatureModal } from '@/components/SignatureModal';
import { PenTool, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface SignatureSettingsProps {
  currentLanguage: 'en' | 'ar';
}

export const SignatureSettings = ({ currentLanguage }: SignatureSettingsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSignature();
  }, [user]);

  const loadSignature = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('signature_data')
      .eq('id', user.id)
      .single();

    if (!error && data?.signature_data) {
      setSignature(data.signature_data);
    }
    setLoading(false);
  };

  const handleSaveSignature = async (sigData: { type: string; data: string; full_name: string }) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        signature_data: {
          type: sigData.type,
          data: sigData.data,
          full_name: sigData.full_name,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', user.id);

    if (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل حفظ التوقيع' : 'Failed to save signature');
      return;
    }

    toast.success(currentLanguage === 'ar' ? 'تم حفظ التوقيع!' : 'Signature saved!');
    setShowSignatureModal(false);
    loadSignature();
  };

  const handleDeleteSignature = async () => {
    if (!user?.id) return;
    
    if (!confirm(currentLanguage === 'ar' ? 'هل تريد حذف التوقيع؟' : 'Delete signature?')) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ signature_data: null })
      .eq('id', user.id);

    if (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل الحذف' : 'Failed to delete');
      return;
    }

    toast.success(currentLanguage === 'ar' ? 'تم الحذف' : 'Deleted');
    setSignature(null);
  };

  const content = {
    en: {
      title: 'Signature Settings',
      description: 'Manage your digital signature for contracts',
      currentSignature: 'Current Signature',
      noSignature: 'No signature saved',
      createSignature: 'Create Signature',
      updateSignature: 'Update Signature',
      delete: 'Delete Signature',
      lastUpdated: 'Last updated'
    },
    ar: {
      title: 'إعدادات التوقيع',
      description: 'إدارة توقيعك الرقمي للعقود',
      currentSignature: 'التوقيع الحالي',
      noSignature: 'لا يوجد توقيع محفوظ',
      createSignature: 'إنشاء توقيع',
      updateSignature: 'تحديث التوقيع',
      delete: 'حذف التوقيع',
      lastUpdated: 'آخر تحديث'
    }
  };

  const t = content[currentLanguage];

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <div className="px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SoftCard>
            <Body lang={currentLanguage} className="text-muted-foreground mb-4">
              {t.description}
            </Body>

            <div className="space-y-4">
              <Heading2 lang={currentLanguage} className="text-base">{t.currentSignature}</Heading2>
              
              {loading ? (
                <div className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
              ) : signature ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-border/30">
                    <img
                      src={signature.data}
                      alt="Your signature"
                      className="max-h-24 max-w-full mx-auto"
                    />
                  </div>
                  {signature.updated_at && (
                    <BodySmall lang={currentLanguage} className="text-muted-foreground text-center">
                      {t.lastUpdated}: {new Date(signature.updated_at).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')}
                    </BodySmall>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => setShowSignatureModal(true)}
                    >
                      <PenTool size={20} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
                      {t.updateSignature}
                    </Button>
                    <Button
                      size="lg"
                      variant="destructive"
                      className="rounded-full"
                      onClick={handleDeleteSignature}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-32 bg-muted/30 rounded-2xl flex items-center justify-center">
                    <BodySmall lang={currentLanguage} className="text-muted-foreground">
                      {t.noSignature}
                    </BodySmall>
                  </div>
                  <Button
                    size="lg"
                    className="w-full rounded-full"
                    onClick={() => setShowSignatureModal(true)}
                  >
                    <PenTool size={20} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
                    {t.createSignature}
                  </Button>
                </div>
              )}
            </div>
          </SoftCard>
        </motion.div>
      </div>

      <SignatureModal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveSignature}
        currentLanguage={currentLanguage}
        defaultName={user?.user_metadata?.full_name || ''}
      />
    </div>
  );
};