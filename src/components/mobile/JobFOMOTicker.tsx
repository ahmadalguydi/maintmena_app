import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';

interface JobFOMOTickerProps {
  currentLanguage: 'en' | 'ar';
}

interface JobCount {
  category: string;
  city: string;
  count: number;
}

export const JobFOMOTicker = ({ currentLanguage }: JobFOMOTickerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch actual job counts from database
  const { data: jobCounts } = useQuery({
    queryKey: ['fomo-job-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('category, city')
        .eq('status', 'open');

      if (error) throw error;

      // Group by category and city
      const grouped: Record<string, Record<string, number>> = {};
      data?.forEach((req) => {
        if (!grouped[req.category]) grouped[req.category] = {};
        if (!grouped[req.category][req.city || 'Unknown']) {
          grouped[req.category][req.city || 'Unknown'] = 0;
        }
        grouped[req.category][req.city || 'Unknown']++;
      });

      // Convert to array and apply "beta boost" multiplier
      const BETA_BOOST = 3;
      const counts: JobCount[] = [];
      
      Object.entries(grouped).forEach(([category, cities]) => {
        Object.entries(cities).forEach(([city, count]) => {
          counts.push({
            category,
            city,
            count: Math.round(count * BETA_BOOST) + Math.floor(Math.random() * 5) + 3
          });
        });
      });

      // If no real data, generate realistic-looking seed data
      if (counts.length === 0) {
        return [
          { category: 'plumbing', city: 'Jeddah', count: 14 },
          { category: 'ac_repair', city: 'Riyadh', count: 8 },
          { category: 'electrical', city: 'Dammam', count: 6 },
          { category: 'painting', city: 'Riyadh', count: 11 },
          { category: 'cleaning', city: 'Jeddah', count: 9 },
        ];
      }

      return counts.slice(0, 8); // Max 8 items
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Rotate through job counts
  useEffect(() => {
    if (!jobCounts || jobCounts.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % jobCounts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [jobCounts]);

  const categoryNames: Record<string, { en: string; ar: string }> = {
    plumbing: { en: 'plumbing', ar: 'سباكة' },
    ac_repair: { en: 'AC repair', ar: 'إصلاح تكييف' },
    electrical: { en: 'electrical', ar: 'كهرباء' },
    painting: { en: 'painting', ar: 'دهان' },
    cleaning: { en: 'cleaning', ar: 'تنظيف' },
    handyman: { en: 'handyman', ar: 'صيانة عامة' },
    carpentry: { en: 'carpentry', ar: 'نجارة' },
    landscaping: { en: 'landscaping', ar: 'تنسيق حدائق' },
  };

  const cityNames: Record<string, { en: string; ar: string }> = {
    'Jeddah': { en: 'Jeddah', ar: 'جدة' },
    'Riyadh': { en: 'Riyadh', ar: 'الرياض' },
    'Dammam': { en: 'Dammam', ar: 'الدمام' },
    'Mecca': { en: 'Mecca', ar: 'مكة' },
    'Medina': { en: 'Medina', ar: 'المدينة' },
  };

  if (!jobCounts || jobCounts.length === 0) return null;

  const currentJob = jobCounts[currentIndex];
  const categoryName = categoryNames[currentJob.category]?.[currentLanguage] || currentJob.category;
  const cityName = cityNames[currentJob.city]?.[currentLanguage] || currentJob.city;

  const text = currentLanguage === 'ar'
    ? `${currentJob.count} وظيفة ${categoryName} في ${cityName}`
    : `${currentJob.count} ${categoryName} jobs in ${cityName}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 overflow-hidden"
    >
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center justify-center gap-2"
      >
        <Flame className="w-4 h-4 text-orange-500" />
        <span className={`text-sm font-medium text-orange-700 dark:text-orange-400 ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
          {text}
        </span>
      </motion.div>
    </motion.div>
  );
};