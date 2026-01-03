import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrustBannerProps {
  currentLanguage: 'en' | 'ar';
}

export const TrustBanner = ({ currentLanguage }: TrustBannerProps) => {
  const content = {
    en: {
      title: 'Every Job Protected',
      subtitle: 'Digital contracts. No disputes, just done.'
    },
    ar: {
      title: 'كل عمل محمي',
      subtitle: 'عقود رقمية. بدون نزاعات، فقط إنجاز.'
    }
  };

  const t = content[currentLanguage];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-5 bg-[#FDF8F3] dark:bg-amber-950/20 border border-[#E8DED4] dark:border-amber-900/30 rounded-2xl"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="flex-1">
        <h3 className={`text-lg font-bold text-foreground ${currentLanguage === 'ar' ? 'font-ar-heading' : ''}`}>
          {t.title}
        </h3>
        <p className={`text-sm text-muted-foreground mt-1 ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
          {t.subtitle}
        </p>
      </div>
      <div className={`w-14 h-14 rounded-full bg-[#F5EDE6] dark:bg-amber-900/30 flex items-center justify-center ${currentLanguage === 'ar' ? 'mr-4' : 'ml-4'}`}>
        <Shield className="w-7 h-7 text-amber-600" strokeWidth={1.5} />
      </div>
    </motion.div>
  );
};
