import { useState } from 'react';
import { Mail, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmailVerificationBannerProps {
  email: string;
  currentLanguage: 'en' | 'ar';
  onDismiss?: () => void;
}

export const EmailVerificationBanner = ({ 
  email, 
  currentLanguage,
  onDismiss 
}: EmailVerificationBannerProps) => {
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const content = {
    en: {
      title: 'Verify your email',
      description: 'Please verify your email to unlock all features',
      resend: 'Resend',
      sent: 'Email sent!',
      error: 'Failed to send email'
    },
    ar: {
      title: 'تحقق من بريدك الإلكتروني',
      description: 'يرجى التحقق من بريدك الإلكتروني لفتح جميع الميزات',
      resend: 'إعادة إرسال',
      sent: 'تم إرسال البريد!',
      error: 'فشل إرسال البريد'
    }
  };

  const t = content[currentLanguage];

  const handleResend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: { email, language: currentLanguage }
      });

      if (error) {
        toast.error(t.error);
      } else {
        toast.success(t.sent);
      }
    } catch (err) {
      toast.error(t.error);
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <div 
      className={cn(
        "relative bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4",
        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
      )}
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-amber-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{t.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={sending}
            className="mt-2 h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 p-0"
          >
            {sending ? (
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Mail className="w-3 h-3 mr-1" />
            )}
            {t.resend}
          </Button>
        </div>
      </div>
    </div>
  );
};