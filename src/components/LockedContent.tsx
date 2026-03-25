import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { SubscriptionTier } from '@/hooks/useSubscription';

interface LockedContentProps {
  requiredTier: SubscriptionTier;
  currentLanguage: 'en' | 'ar';
  title?: string;
  description?: string;
}

export function LockedContent({ 
  requiredTier, 
  currentLanguage,
  title,
  description 
}: LockedContentProps) {
  const navigate = useNavigate();

  const content = {
    en: {
      locked: 'Locked Content',
      upgrade: 'Upgrade to Access',
      requiresTier: `Requires ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan or higher`,
      viewPlans: 'View Plans'
    },
    ar: {
      locked: 'محتوى مقفل',
      upgrade: 'ترقية للوصول',
      requiresTier: `يتطلب خطة ${requiredTier === 'basic' ? 'الأساسية' : requiredTier === 'professional' ? 'المحترف' : 'المؤسسة'} أو أعلى`,
      viewPlans: 'عرض الخطط'
    }
  };

  return (
    <Card className="p-8 text-center border-2 border-dashed border-rule">
      <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-xl font-semibold text-ink mb-2">
        {title || content[currentLanguage].locked}
      </h3>
      <p className="text-muted-foreground mb-4">
        {description || content[currentLanguage].requiresTier}
      </p>
      <Button 
        onClick={() => navigate('/pricing')}
        className="mt-4"
      >
        {content[currentLanguage].viewPlans}
      </Button>
    </Card>
  );
}
