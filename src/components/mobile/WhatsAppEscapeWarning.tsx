import { AlertTriangle, Shield, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppEscapeWarningProps {
  currentLanguage: 'en' | 'ar';
  onDismiss: () => void;
  onKeepChat: () => void;
}

export function WhatsAppEscapeWarning({
  currentLanguage,
  onDismiss,
  onKeepChat
}: WhatsAppEscapeWarningProps) {
  const isRtl = currentLanguage === 'ar';
  
  const content = {
    en: {
      title: 'Stay Protected!',
      warning: 'Moving to WhatsApp means:',
      risks: [
        'No 30-day warranty protection',
        'No digital contract or proof',
        'No dispute resolution support',
        'No price guarantee'
      ],
      keepChat: 'Keep chatting here',
      understand: 'I understand the risks'
    },
    ar: {
      title: 'ابقَ محمياً!',
      warning: 'الانتقال إلى واتساب يعني:',
      risks: [
        'لا ضمان لمدة ٣٠ يوم',
        'لا عقد رقمي أو إثبات',
        'لا دعم لحل النزاعات',
        'لا ضمان للسعر'
      ],
      keepChat: 'استمر بالمحادثة هنا',
      understand: 'أفهم المخاطر'
    }
  };
  
  const t = content[currentLanguage];
  
  return (
    <div 
      className="mx-4 my-2 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-400"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className={`flex items-start gap-3 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <div className={`flex-1 ${isRtl ? 'text-right' : ''}`}>
          <h3 className="font-bold text-amber-800 dark:text-amber-300 text-lg mb-1">
            {t.title}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
            {t.warning}
          </p>
          <ul className="space-y-2">
            {t.risks.map((risk, i) => (
              <li key={i} className={`flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <Shield className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <Button
          onClick={onKeepChat}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {t.keepChat}
        </Button>
        <Button
          variant="ghost"
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
        >
          {t.understand}
        </Button>
      </div>
    </div>
  );
}

// Utility function to detect phone numbers in messages
export function detectPhoneNumber(text: string): boolean {
  // Patterns for Saudi/international phone numbers
  const patterns = [
    /\+?966\s*[-.]?\s*\d{2}\s*[-.]?\s*\d{3}\s*[-.]?\s*\d{4}/g, // Saudi format
    /0\d{9}/g, // Local format
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, // Generic format
    /\d{4}[-.\s]?\d{4}/g, // 8 digit
    /05\d{8}/g, // Saudi mobile
  ];
  
  return patterns.some(pattern => pattern.test(text));
}
