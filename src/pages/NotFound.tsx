import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface NotFoundProps {
  currentLanguage: 'en' | 'ar';
}

const NotFound = ({ currentLanguage }: NotFoundProps) => {
  const content = {
    en: {
      title: "404 - Page Not Found",
      subtitle: "The page you're looking for doesn't exist.",
      homeButton: "Back to Home"
    },
    ar: {
      title: "404 - الصفحة مب موجودة",
      subtitle: "الصفحة اللي تدور عليها مب موجودة.",
      homeButton: "ارجع للرئيسية"
    }
  };

  const currentContent = content[currentLanguage];

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-6xl font-bold text-accent mb-4">404</h1>
          <h2 className="text-headline-2 text-ink mb-4">{currentContent.title}</h2>
          <p className="text-muted-foreground mb-8">{currentContent.subtitle}</p>
          <Link 
            to="/" 
            className="inline-flex items-center justify-center px-6 py-3 bg-accent text-paper rounded-lg hover:bg-accent-hover transition-colors"
          >
            {currentContent.homeButton}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
