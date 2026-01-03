import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface FinalCTAProps {
  currentLanguage: 'en' | 'ar';
}

const FinalCTA = ({ currentLanguage }: FinalCTAProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const content = {
    en: {
      headline: 'Join the MaintMENA Network',
      subheadline: 'Where homes get fixed and professionals grow faster.',
      buyerCTA: 'Find a Professional',
      vendorCTA: 'Join as a Professional',
      guarantee: 'Free to start • Verified & trusted • Fast responses'
    },
    ar: {
      headline: 'انضم لعائلة MaintMENA',
      subheadline: 'المنصة اللي تصلّح البيوت وتكبر فيها الأعمال',
      buyerCTA: 'ابحث عن محترف',
      vendorCTA: 'انضم كمحترف',
      guarantee: 'مجاني للبدء • موثق وآمن • ردود سريعة'
    }
  };

  const lang = content[currentLanguage];

  return (
    <section className="py-24 bg-gradient-to-br from-accent via-accent-2 to-accent text-paper relative overflow-hidden" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
            {lang.headline}
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90">
            {lang.subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate(user ? '/explore' : '/signup-choice?type=buyer')}
                className="border-2 border-paper/50 bg-transparent hover:bg-paper/10 text-paper px-10 py-6 text-lg font-bold rounded-xl gap-2"
              >
                {lang.buyerCTA}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button 
                size="lg" 
                onClick={() => navigate(user ? '/marketplace' : '/signup-choice?type=seller')}
                className="bg-paper text-accent hover:bg-paper/90 px-10 py-6 text-lg font-bold rounded-xl shadow-2xl gap-2"
              >
                {lang.vendorCTA}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>

          <p className="text-sm opacity-75">
            {lang.guarantee}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
