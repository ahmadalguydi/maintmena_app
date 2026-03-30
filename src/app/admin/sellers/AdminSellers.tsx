import { motion } from 'framer-motion';

export function AdminSellers({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 pb-32"
    >
      <h1 className="text-2xl font-bold mb-6">
        {currentLanguage === 'ar' ? 'المهنيين' : 'Sellers'}
      </h1>
      <p className="text-muted-foreground">
        {currentLanguage === 'ar' ? 'جاري تطوير هذه الصفحة...' : 'This page is under development...'}
      </p>
    </motion.div>
  );
}
