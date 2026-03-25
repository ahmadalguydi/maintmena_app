import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/Calendar';

interface CalendarPageProps {
  currentLanguage: 'en' | 'ar';
}

const CalendarPage = ({ currentLanguage }: CalendarPageProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentLanguage === 'ar' ? 'العودة' : 'Back'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-3xl font-bold text-ink">
                {currentLanguage === 'ar' ? 'التقويم' : 'Calendar'}
              </h1>
              <p className="text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'إدارة الأحداث والمواعيد النهائية'
                  : 'Manage your events and deadlines'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Calendar Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Calendar currentLanguage={currentLanguage} />
        </motion.div>
      </div>
    </div>
  );
};

export default CalendarPage;