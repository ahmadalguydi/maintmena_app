import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Phone, Sparkles } from 'lucide-react';
import { SoftCard } from './SoftCard';

interface ConciergeCardProps {
  currentLanguage: 'en' | 'ar';
  onContact?: () => void;
}

export const ConciergeCard = ({ currentLanguage, onContact }: ConciergeCardProps) => {
  const navigate = useNavigate();

  const content = {
    en: {
      title: 'MaintMENA Concierge',
      description: "Can't find what you need? We'll match you manually with a verified professional.",
      action: 'Find Me a Pro'
    },
    ar: {
      title: 'خدمة MaintMENA الشخصية',
      description: 'لم تجد ما تبحث عنه؟ سنجد لك محترفاً موثوقاً يدوياً.',
      action: 'ابحث لي عن محترف'
    }
  };

  const t = content[currentLanguage];

  const handleContact = () => {
    if (onContact) {
      onContact();
    } else {
      // Navigate to contact page within the app
      navigate('/app/help');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <SoftCard className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Concierge Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Phone className="w-7 h-7 text-primary" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
              <Sparkles className="w-3 h-3 bg-primary/10" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className={`text-lg font-bold text-foreground ${currentLanguage === 'ar' ? 'font-ar-heading' : ''}`}>
              🛎️ {t.title}
            </h3>
            <p className={`text-sm text-muted-foreground max-w-xs ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
              {t.description}
            </p>
          </div>

          {/* Action */}
          <Button
            onClick={handleContact}
            variant="default"
            className="rounded-full px-6"
          >
            {t.action}
          </Button>
        </div>
      </SoftCard>
    </motion.div>
  );
};