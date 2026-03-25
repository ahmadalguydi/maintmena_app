import { useEffect, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrialCountdownBannerProps {
  currentLanguage: 'en' | 'ar';
}

const TrialCountdownBanner = ({ currentLanguage }: TrialCountdownBannerProps) => {
  const { subscription, isOnTrial, daysLeftInTrial } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('trial_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('trial_banner_dismissed', 'true');
  };

  if (!isOnTrial || dismissed || !daysLeftInTrial) return null;

  const content = {
    en: {
      message: `${daysLeftInTrial} days left in your free trial`,
      cta: 'Upgrade Now',
      dismiss: 'Dismiss'
    },
    ar: {
      message: `${daysLeftInTrial} يوم متبقي في تجربتك المجانية`,
      cta: 'ترقية الآن',
      dismiss: 'إخفاء'
    }
  };

  // Show urgent styling when less than 3 days left
  const isUrgent = daysLeftInTrial <= 3;

  return (
    <div
      className={`sticky top-0 z-40 ${
        isUrgent
          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
          : 'bg-gradient-to-r from-accent to-accent-2 text-white'
      }`}
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5" />
          <span className="font-medium">
            {content[currentLanguage].message}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
            className={
              isUrgent
                ? 'bg-white text-red-600 hover:bg-white/90'
                : 'bg-white text-accent hover:bg-white/90'
            }
          >
            {content[currentLanguage].cta}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label={content[currentLanguage].dismiss}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialCountdownBanner;
