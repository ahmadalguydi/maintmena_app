import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SamplePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: 'en' | 'ar';
}

const SamplePdfModal = ({ isOpen, onClose, currentLanguage }: SamplePdfModalProps) => {
  if (!isOpen) return null;

  const content = {
    en: {
      title: 'MaintMENA Sample Issue',
      subtitle: 'Edition 001 • October 21, 2024',
      description: 'A preview of our weekly industrial brief with early signals, verified tenders, and actionable SOPs.',
      downloadBtn: 'Download full sample (PDF)',
      closeBtn: 'Close preview'
    },
    ar: {
      title: 'العدد النموذجي من مينت مينا',
      subtitle: 'العدد ٠٠١ • ٢١ أكتوبر ٢٠٢٤',
      description: 'معاينة موجزنا الصناعي الأسبوعي مع الإشارات المبكرة والمناقصات المؤكدة وإجراءات التشغيل القابلة للتطبيق.',
      downloadBtn: 'تحميل النموذج الكامل (PDF)',
      closeBtn: 'إغلاق المعاينة'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        className="bg-paper rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-rule sticky top-0 bg-paper z-10">
          <div>
            <h2 className="text-xl font-display font-semibold">
              {content[currentLanguage].title}
            </h2>
            <p className="text-byline mt-1">
              {content[currentLanguage].subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-ink transition-colors rounded-lg hover:bg-muted/50"
            aria-label={content[currentLanguage].closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <p className="text-dek mb-6">
            {content[currentLanguage].description}
          </p>

          {/* Sample PDF Preview */}
          <div className="bg-muted/30 rounded-lg p-8 mb-6 text-center border-2 border-dashed border-rule">
            <div className="w-24 h-32 bg-paper border border-rule rounded mx-auto mb-4 flex items-center justify-center">
              <div className="text-xs text-muted-foreground transform rotate-45">PDF</div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {currentLanguage === 'ar' 
                ? 'معاينة مبهمة للعدد النموذجي'
                : 'Blurred preview of sample issue'
              }
            </p>
            <Button 
              onClick={() => {
                // For demo purposes, just show an alert
                alert(currentLanguage === 'ar' ? 'تحميل العينة...' : 'Downloading sample...');
              }}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {content[currentLanguage].downloadBtn}
            </Button>
          </div>

          {/* Sample content structure */}
          <div className="space-y-4 text-sm">
            <div className="border-l-2 border-accent-2 pl-4">
              <h4 className="font-medium text-ink">
                {currentLanguage === 'ar' ? 'في هذا العدد:' : 'In this edition:'}
              </h4>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• {currentLanguage === 'ar' ? '٨ إشارات صيانة مبكرة' : '8 early maintenance signals'}</li>
                <li>• {currentLanguage === 'ar' ? '١٥ مناقصة مؤكدة مع الروابط' : '15 verified tenders with links'}</li>
                <li>• {currentLanguage === 'ar' ? 'دليل المشترين المحدث' : 'Updated buyer directory'}</li>
                <li>• {currentLanguage === 'ar' ? 'إجراء تشغيل: إعداد مسار الاهتزاز في ٣٠ يوماً' : 'SOP: Stand Up a Vibration Route in 30 Days'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SamplePdfModal;