import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';

interface CategoryGridProps {
  currentLanguage: 'en' | 'ar';
}

const CategoryGrid = ({ currentLanguage }: CategoryGridProps) => {
  const navigate = useNavigate();

  const content = {
    en: {
      title: 'Browse by Category',
      homeLabel: 'Home Services',
      projectLabel: 'Project Work',
    },
    ar: {
      title: 'تصفح حسب الفئة',
      homeLabel: 'خدمات منزلية',
      projectLabel: 'مشاريع',
    }
  };

  const lang = content[currentLanguage];

  const handleCategoryClick = (cat: any, audience: 'home' | 'project') => {
    const params = new URLSearchParams({
      serviceType: cat.serviceType,
      category: cat.category,
      audience: audience
    });
    navigate(`/marketplace?${params.toString()}`);
  };

  return (
    <section className="py-16 bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
        >
          {lang.title}
        </motion.h2>

        {/* Home Services */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-2xl font-bold">🏠 {lang.homeLabel}</h3>
            <Badge variant="secondary">Home</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SERVICE_CATEGORIES.home.map((cat, idx) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => handleCategoryClick(cat, 'home')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{cat.icon}</div>
                    <p className="font-semibold text-sm">
                      {currentLanguage === 'ar' ? cat.ar : cat.en}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Project Work */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-2xl font-bold">🏗️ {lang.projectLabel}</h3>
            <Badge variant="secondary">Project</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SERVICE_CATEGORIES.project.map((cat, idx) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                  onClick={() => handleCategoryClick(cat, 'project')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-3">{cat.icon}</div>
                    <p className="font-semibold text-sm">
                      {currentLanguage === 'ar' ? cat.ar : cat.en}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;