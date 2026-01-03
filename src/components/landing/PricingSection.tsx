import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Wrench } from 'lucide-react';
import BuyerPricing from './BuyerPricing';
import SellerPricing from './SellerPricing';
import { trackEvent } from '@/lib/analytics';

interface PricingSectionProps {
  currentLanguage: 'en' | 'ar';
}

type PricingType = 'buyer' | 'seller';

const PricingSection = ({ currentLanguage }: PricingSectionProps) => {
  const [selectedType, setSelectedType] = useState<PricingType>('buyer');

  const handleTypeChange = (type: PricingType) => {
    setSelectedType(type);
    trackEvent('pricing_toggle_switch', {
      from_type: selectedType,
      to_type: type,
      language: currentLanguage
    });
  };

  return (
    <div className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-ink">
            {currentLanguage === 'ar' ? 'اختر الخطة المناسبة' : 'Choose Your Plan'}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {currentLanguage === 'ar' 
              ? 'خطط مرنة للجميع سواء كنت تبحث عن خدمة أو تقدمها'
              : 'Flexible plans for everyone — whether you need a service or provide one'}
          </p>
        </motion.div>

        {/* Creative Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative bg-muted/50 backdrop-blur-sm border-2 border-rule/30 rounded-2xl p-2 shadow-lg">
            {/* Sliding Background */}
            <motion.div
              className="absolute top-2 bottom-2 w-[calc(50%-0.25rem)] bg-gradient-to-br from-accent to-accent-2 rounded-xl shadow-md"
              initial={false}
              animate={{
                x: currentLanguage === 'ar' 
                  ? (selectedType === 'buyer' ? 0 : '-100%')
                  : (selectedType === 'buyer' ? 0 : '100%'),
              }}
              style={{
                left: currentLanguage === 'ar' ? 'auto' : '0.5rem',
                right: currentLanguage === 'ar' ? '0.5rem' : 'auto',
              }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Toggle Buttons */}
            <div className="relative grid grid-cols-2 gap-2">
              {/* Buyer Toggle */}
              <button
                onClick={() => handleTypeChange('buyer')}
                className={`relative py-4 px-6 rounded-xl transition-all duration-300 ${
                  selectedType === 'buyer'
                    ? 'text-paper'
                    : 'text-muted-foreground hover:text-ink'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Home className="w-6 h-6" />
                  <span className="font-bold text-base">
                    {currentLanguage === 'ar' ? 'أبحث عن خدمة' : 'I Need a Service'}
                  </span>
                  <span className="text-xs opacity-80">
                    {currentLanguage === 'ar' ? 'للمنازل والمشاريع' : 'For Homeowners'}
                  </span>
                </div>
              </button>

              {/* Seller Toggle */}
              <button
                onClick={() => handleTypeChange('seller')}
                className={`relative py-4 px-6 rounded-xl transition-all duration-300 ${
                  selectedType === 'seller'
                    ? 'text-paper'
                    : 'text-muted-foreground hover:text-ink'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Wrench className="w-6 h-6" />
                  <span className="font-bold text-base">
                    {currentLanguage === 'ar' ? 'أقدم خدمة' : 'I Provide a Service'}
                  </span>
                  <span className="text-xs opacity-80">
                    {currentLanguage === 'ar' ? 'للمحترفين' : 'For Professionals'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Stats Below Toggle */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-accent text-xl">✓</span>
              <span>{currentLanguage === 'ar' ? 'بدون رسوم خفية' : 'No Hidden Fees'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-xl">✓</span>
              <span>{currentLanguage === 'ar' ? 'إلغاء في أي وقت' : 'Cancel Anytime'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-xl">✓</span>
              <span>{currentLanguage === 'ar' ? 'دعم سريع' : 'Fast Support'}</span>
            </div>
          </div>
        </motion.div>

        {/* Pricing Content with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, x: selectedType === 'buyer' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: selectedType === 'buyer' ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedType === 'buyer' ? (
              <BuyerPricing currentLanguage={currentLanguage} />
            ) : (
              <SellerPricing currentLanguage={currentLanguage} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PricingSection;
