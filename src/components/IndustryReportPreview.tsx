import { useState } from 'react';
import { FileText, Download, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface IndustryReportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: 'en' | 'ar';
  reportTitle: string;
}

const IndustryReportPreview = ({ isOpen, onClose, currentLanguage, reportTitle }: IndustryReportPreviewProps) => {
  const [showFullContent, setShowFullContent] = useState(false);

  if (!isOpen) return null;

  const content = {
    en: {
      title: 'Industry Report Preview',
      subtitle: 'Sample content from the full report',
      downloadFull: 'Download Full Report (PDF)',
      subscribeTo: 'Subscribe to Access',
      closeBtn: 'Close Preview',
      sampleContent: {
        executive: 'Executive Summary',
        executiveText: 'The Saudi manufacturing sector showed robust growth of 8.2% in Q3 2024, driven primarily by petrochemical expansion and infrastructure development. Key performance indicators include increased capacity utilization (78% vs 71% in Q2) and growing export volumes.',
        keyFindings: 'Key Findings',
        findings: [
          'Petrochemical production increased by 12% quarter-over-quarter',
          'Energy efficiency improvements averaged 6% across major facilities',
          'Supply chain disruptions decreased by 23% compared to Q2',
          'New facility investments totaled $2.8 billion in the quarter'
        ],
        marketOutlook: 'Market Outlook',
        outlookText: 'Q4 2024 projections indicate continued growth momentum with planned capacity expansions at three major facilities...',
        lockedContent: 'The remaining 85% of this report includes detailed facility analysis, vendor comparisons, maintenance scheduling insights, and actionable recommendations.'
      }
    },
    ar: {
      title: 'معاينة التقرير الصناعي',
      subtitle: 'محتوى عينة من التقرير الكامل',
      downloadFull: 'تحميل التقرير الكامل (PDF)',
      subscribeTo: 'اشترك للوصول',
      closeBtn: 'إغلاق المعاينة',
      sampleContent: {
        executive: 'الملخص التنفيذي',
        executiveText: 'أظهر قطاع التصنيع السعودي نمواً قوياً بنسبة 8.2% في الربع الثالث من 2024، مدفوعاً بشكل أساسي بتوسع البتروكيماويات وتطوير البنية التحتية. تشمل المؤشرات الرئيسية زيادة استغلال الطاقة (78% مقابل 71% في الربع الثاني) وتنامي أحجام التصدير.',
        keyFindings: 'النتائج الرئيسية',
        findings: [
          'زاد إنتاج البتروكيماويات بنسبة 12% مقارنة بالربع السابق',
          'تحسينات كفاءة الطاقة بمتوسط 6% عبر المرافق الرئيسية',
          'انخفضت اضطرابات سلسلة التوريد بنسبة 23% مقارنة بالربع الثاني',
          'بلغت استثمارات المرافق الجديدة 2.8 مليار دولار في الربع'
        ],
        marketOutlook: 'نظرة السوق',
        outlookText: 'تشير توقعات الربع الرابع من 2024 إلى استمرار زخم النمو مع التوسعات المخططة للطاقة في ثلاث مرافق رئيسية...',
        lockedContent: '85% المتبقية من هذا التقرير تتضمن تحليل مفصل للمرافق، مقارنات الموردين، رؤى جدولة الصيانة، والتوصيات القابلة للتنفيذ.'
      }
    }
  };

  const currentContent = content[currentLanguage];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="text-accent" size={28} />
              <div>
                <h2 className="text-headline-2 text-ink">{currentContent.title}</h2>
                <p className="text-muted-foreground text-sm">{reportTitle}</p>
                <p className="text-muted-foreground text-xs">{currentContent.subtitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          {/* Preview Badge */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-6 flex items-center gap-3">
            <Eye className="text-accent" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">
                {currentLanguage === 'ar' ? 'معاينة مجانية - 15% من المحتوى' : 'Free Preview - 15% of Content'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentLanguage === 'ar' ? 'اشترك للوصول للتقرير الكامل' : 'Subscribe to access the full report'}
              </p>
            </div>
          </div>

          {/* Sample Content */}
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                {currentContent.sampleContent.executive}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sampleContent.executiveText}
              </p>
            </div>

            {/* Key Findings */}
            <div>
              <h3 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                {currentContent.sampleContent.keyFindings}
              </h3>
              <ul className="space-y-2">
                {currentContent.sampleContent.findings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-muted-foreground">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Market Outlook (partial) */}
            <div>
              <h3 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                {currentContent.sampleContent.marketOutlook}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {currentContent.sampleContent.outlookText}
              </p>
            </div>

            {/* Locked Content Indicator */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-paper/50 to-paper z-10 rounded-lg"></div>
              <div className="blur-sm opacity-50 p-6 bg-muted/20 rounded-lg border border-rule">
                <h3 className="text-lg font-semibold text-ink mb-3">Additional Sections</h3>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </div>
              
              {/* Lock Overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="bg-paper border border-rule rounded-lg p-6 text-center shadow-lg max-w-md">
                  <Lock className="text-accent mx-auto mb-3" size={32} />
                  <h4 className="font-semibold text-ink mb-2">
                    {currentLanguage === 'ar' ? 'محتوى مقفل' : 'Locked Content'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {currentContent.sampleContent.lockedContent}
                  </p>
                  <Button className="w-full">
                    {currentContent.subscribeTo}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-rule">
            <Button className="flex-1">
              <Download size={16} className="mr-2" />
              {currentContent.downloadFull}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {currentContent.closeBtn}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IndustryReportPreview;