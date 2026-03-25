import { motion } from 'framer-motion';
import { Users, Briefcase } from 'lucide-react';

interface MastheadProps {
  currentLanguage: 'en' | 'ar';
}

const Masthead = ({ currentLanguage }: MastheadProps) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const arFormattedDate = currentDate.toLocaleDateString('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Mock stats for visual interest
  const stats = {
    en: [
      { label: 'Active Projects', mobileLabel: 'Projects', value: '2,847', icon: Briefcase },
      { label: 'Service Pros', mobileLabel: 'Pros', value: '1,200+', icon: Users }
    ],
    ar: [
      { label: 'مشاريع نشطة', value: '2,847', icon: Briefcase },
      { label: 'محترفون', value: '1,200+', icon: Users }
    ]
  };

  return (
    <motion.header 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="border-b border-rule bg-paper/95 backdrop-blur-sm py-6"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          {/* Date & Title */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight">
                {currentLanguage === 'ar' ? 'مينت مينا' : 'MaintMENA'}
              </h1>
              <p className={`text-byline ${currentLanguage === 'ar' ? 'text-sm' : 'text-xs sm:text-sm'}`}>
                {currentLanguage === 'ar' ? 'السوق الصناعي' : 'Industrial Marketplace'}
              </p>
            </div>
          </div>

          {/* Date badge - visible on all screen sizes */}
          <div className="text-right">
            <div className="text-xs text-byline uppercase tracking-wider mb-1">
              {currentLanguage === 'ar' ? 'اليوم' : 'Today'}
            </div>
            <div className="text-sm font-medium text-ink">
              {currentLanguage === 'ar' ? arFormattedDate : formattedDate}
            </div>
          </div>
        </div>

        {/* Live stats bar - center aligned on mobile, left aligned on desktop */}
        <div className="flex items-center justify-center sm:justify-start gap-6 pt-4 border-t border-rule/50">
          {stats[currentLanguage].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4 text-accent" />
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">{stat.value}</span>
                  <span className="text-xs text-byline">
                    <span className="sm:hidden">{currentLanguage === 'en' && 'mobileLabel' in stat ? stat.mobileLabel : stat.label}</span>
                    <span className="hidden sm:inline">{stat.label}</span>
                  </span>
                </div>
              </motion.div>
          );
          })}
        </div>
      </div>
    </motion.header>
  );
};

export default Masthead;