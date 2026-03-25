import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllCategories } from '@/lib/serviceCategories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarHookProps {
  currentLanguage: 'en' | 'ar';
}

const SearchBarHook = ({ currentLanguage }: SearchBarHookProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  
  const categories = getAllCategories();
  
  const filteredSuggestions = searchQuery.trim()
    ? categories.filter(cat => {
        const name = currentLanguage === 'ar' ? cat.ar : cat.en;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      }).slice(0, 5)
    : categories.slice(0, 5);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate('/signup-choice', { state: { searchQuery } });
    } else {
      navigate('/signup-choice');
    }
  };

  const handleSuggestionClick = (categoryName: string) => {
    setSearchQuery(categoryName);
    setShowSuggestions(false);
    navigate('/signup-choice', { state: { searchQuery: categoryName } });
  };

  const content = {
    en: {
      placeholder: 'Search for plumbers, electricians, painters...',
      button: 'Find Pros',
      tagline: 'What service do you need today?',
      popular: 'Popular services:'
    },
    ar: {
      placeholder: 'ابحث عن سباكين، كهربائيين، دهانين...',
      button: 'ابحث عن محترفين',
      tagline: 'ما الخدمة التي تحتاجها اليوم؟',
      popular: 'الخدمات الشائعة:'
    }
  };

  return (
    <section className="py-16 px-4 bg-muted/30 relative z-10">
      <div className="container max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Tagline */}
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground">
            {content[currentLanguage].tagline}
          </h2>

          {/* Search Bar */}
          <div className="relative">
            <div 
              className={`
                relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-2xl 
                bg-card shadow-lg transition-all duration-300
                ${isFocused ? 'ring-2 ring-primary shadow-2xl scale-[1.02]' : 'hover:shadow-xl'}
              `}
            >
              <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4">
                <Search className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors flex-shrink-0 ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} />
                <Input
                  type="text"
                  placeholder={content[currentLanguage].placeholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="border-0 bg-transparent text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0 h-9 sm:h-10"
                />
              </div>
              
              <Button
                onClick={handleSearch}
                size="default"
                className="rounded-xl w-full sm:w-auto gap-2 font-semibold"
              >
                {content[currentLanguage].button}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full mt-2 w-full bg-card rounded-xl shadow-2xl border border-border overflow-hidden z-50"
                >
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground px-3 py-2 font-medium">
                      {content[currentLanguage].popular}
                    </p>
                    {filteredSuggestions.map((category, index) => (
                      <motion.button
                        key={category.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSuggestionClick(
                          currentLanguage === 'ar' ? category.ar : category.en
                        )}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-2xl">{category.icon}</span>
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {currentLanguage === 'ar' ? category.ar : category.en}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trust indicator */}
          <p className="text-center text-sm text-muted-foreground">
            {currentLanguage === 'ar' 
              ? '🔒 آمن وموثوق • ✓ محترفون معتمدون • ⚡ استجابة سريعة'
              : '🔒 Safe & Trusted • ✓ Verified Pros • ⚡ Quick Response'
            }
          </p>
        </div>
      </div>
    </section>
  );
};

export default SearchBarHook;
