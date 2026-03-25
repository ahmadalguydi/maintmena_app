import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion, TrendingUp, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  type: 'signals' | 'tenders' | 'briefs' | 'rfqs' | 'quotes' | 'requests' | 'general';
  currentLanguage: 'en' | 'ar';
  title?: string;
  description?: string;
  actionLabel?: string;
  actionPath?: string;
}

const EmptyState = ({ 
  type, 
  currentLanguage,
  title,
  description,
  actionLabel,
  actionPath 
}: EmptyStateProps) => {
  const navigate = useNavigate();

  const content = {
    en: {
      signals: {
        title: 'No Signals Yet',
        description: 'New maintenance opportunities and early signals will appear here',
        action: 'Check Back Later'
      },
      tenders: {
        title: 'No Active Tenders',
        description: 'Official tender opportunities will be listed here when available',
        action: 'View Archive'
      },
      briefs: {
        title: 'No Briefs Available',
        description: 'Weekly industry briefs will appear here',
        action: 'Explore Resources'
      },
      rfqs: {
        title: 'No RFQs Posted Yet',
        description: 'Request for quotes from buyers will appear here',
        action: 'Browse Marketplace'
      },
      quotes: {
        title: 'No Quotes Submitted',
        description: 'Your submitted quotes will appear here',
        action: 'Find Opportunities'
      },
      requests: {
        title: 'No Requests Posted',
        description: 'Your posted requests will appear here',
        action: 'Post an RFQ'
      },
      general: {
        title: 'Nothing Here Yet',
        description: 'Content will appear here soon',
        action: 'Go Back'
      }
    },
    ar: {
      signals: {
        title: 'لا توجد إشارات بعد',
        description: 'ستظهر فرص الصيانة الجديدة والإشارات المبكرة هنا',
        action: 'تحقق لاحقاً'
      },
      tenders: {
        title: 'لا توجد مناقصات نشطة',
        description: 'ستُدرج فرص المناقصات الرسمية هنا عند توفرها',
        action: 'عرض الأرشيف'
      },
      briefs: {
        title: 'لا توجد تقارير متاحة',
        description: 'ستظهر التقارير الصناعية الأسبوعية هنا',
        action: 'استكشف الموارد'
      },
      rfqs: {
        title: 'لم يتم نشر طلبات أسعار بعد',
        description: 'ستظهر طلبات الأسعار من المشترين هنا',
        action: 'تصفح السوق'
      },
      quotes: {
        title: 'لم يتم تقديم عروض أسعار',
        description: 'ستظهر عروض الأسعار المقدمة هنا',
        action: 'ابحث عن الفرص'
      },
      requests: {
        title: 'لم يتم نشر طلبات',
        description: 'ستظهر طلباتك المنشورة هنا',
        action: 'انشر طلب سعر'
      },
      general: {
        title: 'لا يوجد شيء هنا بعد',
        description: 'سيظهر المحتوى هنا قريباً',
        action: 'العودة'
      }
    }
  };

  const typeContent = content[currentLanguage][type];
  const displayTitle = title || typeContent.title;
  const displayDescription = description || typeContent.description;
  const displayAction = actionLabel || typeContent.action;

  const getIcon = () => {
    switch (type) {
      case 'signals':
      case 'tenders':
      case 'briefs':
        return <TrendingUp className="w-12 h-12 text-muted-foreground/30" />;
      case 'rfqs':
      case 'quotes':
      case 'requests':
        return <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />;
      default:
        return <FileQuestion className="w-12 h-12 text-muted-foreground/30" />;
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4">
          {getIcon()}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-ink">
          {displayTitle}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {displayDescription}
        </p>
        {actionPath && (
          <Button
            variant="outline"
            onClick={() => navigate(actionPath)}
          >
            {displayAction}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
