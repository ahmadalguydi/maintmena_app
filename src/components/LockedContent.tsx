import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface LockedContentProps {
  requiredTier?: string;
  currentLanguage: 'en' | 'ar';
  title?: string;
  description?: string;
}

export function LockedContent({
  currentLanguage,
  title,
  description,
}: LockedContentProps) {
  const navigate = useNavigate();
  const isArabic = currentLanguage === 'ar';

  return (
    <Card className="p-8 text-center border-2 border-dashed border-rule">
      <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-xl font-semibold text-ink mb-2">
        {title || (isArabic ? 'سجّل للمتابعة' : 'Sign in to continue')}
      </h3>
      <p className="text-muted-foreground mb-4">
        {description || (isArabic
          ? 'أرسل طلبك وسنوصلك بمقدم الخدمة المناسب.'
          : 'Submit your request and we will match you with the right provider.')}
      </p>
      <Button
        onClick={() => navigate('/signup-choice?type=buyer')}
        className="mt-4"
      >
        {isArabic ? 'ابدأ الآن' : 'Get Started'}
      </Button>
    </Card>
  );
}
