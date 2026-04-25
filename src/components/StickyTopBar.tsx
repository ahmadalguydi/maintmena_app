import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  HelpCircle,
  Home,
  Info,
  Mail,
  Menu,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { NotificationBell } from '@/components/NotificationBell';

interface StickyTopBarProps {
  currentLanguage: 'en' | 'ar';
  onLanguageToggle: () => void;
}

interface NavItem {
  label: string;
  arLabel: string;
  href: string;
  description: string;
  arDescription: string;
  icon: typeof Home;
  roles?: Array<'buyer' | 'seller' | 'admin'>;
}

const REQUEST_ONLY_NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    arLabel: 'الرئيسية',
    href: '/',
    description: 'MaintMENA overview',
    arDescription: 'نظرة عامة على منتمنة',
    icon: Home,
  },
  {
    label: 'About',
    arLabel: 'عنّا',
    href: '/about',
    description: 'Our story',
    arDescription: 'قصتنا',
    icon: Info,
  },
  {
    label: 'Blog',
    arLabel: 'المدونة',
    href: '/blog',
    description: 'Articles and insights',
    arDescription: 'مقالات ونصائح',
    icon: BookOpen,
  },
  {
    label: 'Support',
    arLabel: 'الدعم',
    href: '/support',
    description: 'Help center',
    arDescription: 'مركز المساعدة',
    icon: HelpCircle,
  },
  {
    label: 'Contact',
    arLabel: 'تواصل معنا',
    href: '/contact',
    description: 'Get in touch',
    arDescription: 'تواصل معنا',
    icon: Mail,
  },
];

const HOME_SECTIONS = [
  { label: 'Overview', arLabel: 'نظرة عامة', scrollTo: 'overview' },
  { label: 'How It Works', arLabel: 'آلية العمل', scrollTo: 'how-it-works' },
  { label: 'Services', arLabel: 'الخدمات', scrollTo: 'services' },
  { label: 'Pricing', arLabel: 'الأسعار', scrollTo: 'pricing' },
  { label: 'FAQ', arLabel: 'الأسئلة الشائعة', scrollTo: 'faq' },
];

const StickyTopBar = ({ currentLanguage, onLanguageToggle }: StickyTopBarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, userType, loading } = useAuth();
  const { subscription } = useSubscription();

  const effectiveUserType =
    userType ||
    (subscription?.tier && ['starter', 'professional', 'elite'].includes(subscription.tier)
      ? 'seller'
      : null);

  const dashboardHref =
    effectiveUserType === 'buyer'
      ? '/app/buyer/home'
      : effectiveUserType === 'seller'
        ? '/app/seller/home'
        : '/admin';

  const globalNavItems = useMemo(() => {
    return REQUEST_ONLY_NAV_ITEMS.filter((item) => {
      if (!item.roles?.length) return true;
      if (!effectiveUserType) return false;
      if (effectiveUserType === 'admin') return true;
      return item.roles.includes(effectiveUserType as 'buyer' | 'seller' | 'admin');
    });
  }, [effectiveUserType]);

  const isHomePage = location.pathname === '/';
  const isActive = (href: string) => location.pathname === href;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div
        className={`sticky top-0 z-50 bg-paper/95 backdrop-blur-sm transition-shadow duration-base ${
          isScrolled ? 'shadow-sm border-b border-rule' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            {isHomePage ? (
              <nav
                className={`hidden sm:flex items-center gap-8 ${currentLanguage === 'ar' ? 'space-x-reverse' : ''}`}
                dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
              >
                {HOME_SECTIONS.map((item) => (
                  <button
                    key={item.scrollTo}
                    onClick={() => {
                      const element = document.getElementById(item.scrollTo);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="text-ink hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded px-1"
                  >
                    {currentLanguage === 'ar' ? item.arLabel : item.label}
                  </button>
                ))}
              </nav>
            ) : (
              <div className="hidden sm:flex items-center space-x-4">
                <Link to="/" className="text-byline hover:text-accent transition-colors">
                  {currentLanguage === 'ar' ? 'الرئيسية' : 'Home'}
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between flex-1 sm:flex-none sm:justify-end">
              <div className="flex items-center space-x-2 sm:hidden">
                <button
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="bg-accent hover:bg-accent-hover text-paper p-2 rounded-md shadow-sm transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>

                <button
                  onClick={onLanguageToggle}
                  className="text-byline hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded px-2 py-1"
                  aria-label={currentLanguage === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                >
                  <span className={currentLanguage === 'en' ? 'font-medium' : 'opacity-60'}>EN</span>
                  <span className="mx-1">|</span>
                  <span className={currentLanguage === 'ar' ? 'font-medium' : 'opacity-60'}>AR</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 sm:hidden">
                {!loading &&
                  (user ? (
                    <>
                      <NotificationBell />
                      <Link
                        to={dashboardHref}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm"
                      >
                        <BarChart3 size={16} />
                        <span className="hidden xs:inline">
                          {currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                        </span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm"
                    >
                      <User size={16} />
                      <span className="hidden xs:inline">
                        {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                      </span>
                    </Link>
                  ))}
              </div>

              <div className="hidden sm:flex items-center space-x-3">
                {!loading &&
                  (user ? (
                    <div className="flex items-center gap-2">
                      <NotificationBell />
                      <Link
                        to={dashboardHref}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm"
                      >
                        <BarChart3 size={16} />
                        <span>{currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm"
                    >
                      <User size={16} />
                      {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                    </Link>
                  ))}

                <button
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="bg-accent hover:bg-accent-hover text-paper p-2 rounded-md shadow-sm transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>

                <button
                  onClick={onLanguageToggle}
                  className="text-byline hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded px-2 py-1"
                  aria-label={currentLanguage === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                >
                  <span className={currentLanguage === 'en' ? 'font-medium' : 'opacity-60'}>EN</span>
                  <span className="mx-1">|</span>
                  <span className={currentLanguage === 'ar' ? 'font-medium' : 'opacity-60'}>AR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-paper shadow-2xl overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
              dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8 pt-12">
                  <h2 className="text-headline-2 text-ink">{currentLanguage === 'ar' ? 'القائمة' : 'Menu'}</h2>
                  <button
                    onClick={onLanguageToggle}
                    className="text-byline hover:text-accent transition-colors px-3 py-2 rounded border border-rule"
                  >
                    <span className={currentLanguage === 'en' ? 'font-medium' : 'opacity-60'}>EN</span>
                    <span className="mx-2">|</span>
                    <span className={currentLanguage === 'ar' ? 'font-medium' : 'opacity-60'}>AR</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {globalNavItems.map((item, index) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Link
                          to={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 ${
                            active ? 'bg-accent text-paper shadow-md' : 'hover:bg-accent/10 text-ink hover:text-accent'
                          } ${currentLanguage === 'ar' ? 'space-x-reverse' : ''}`}
                        >
                          <Icon size={24} className={active ? 'text-paper' : 'text-accent'} />
                          <div className="flex-1">
                            <div className="font-medium">{currentLanguage === 'ar' ? item.arLabel : item.label}</div>
                            <div className={`text-sm opacity-70 ${active ? 'text-paper/80' : 'text-muted-foreground'}`}>
                              {currentLanguage === 'ar' ? item.arDescription : item.description}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}

                  {!user ? (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: globalNavItems.length * 0.08 }}
                      className="border-t border-rule pt-4 mt-4"
                    >
                      <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-accent/10 text-ink hover:text-accent"
                      >
                        <User className="text-accent" size={24} />
                        <div className="flex-1">
                          <div className="font-medium">{currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</div>
                          <div className="text-sm opacity-70 text-muted-foreground">
                            {currentLanguage === 'ar' ? 'الدخول للحساب' : 'Access your account'}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: globalNavItems.length * 0.08 }}
                        className="border-t border-rule pt-4 mt-4"
                      >
                        <Link
                          to={dashboardHref}
                          onClick={() => setIsMenuOpen(false)}
                          className="group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-accent/10 text-ink hover:text-accent"
                        >
                          <BarChart3 className="text-accent" size={24} />
                          <div className="flex-1">
                            <div className="font-medium px-[10px]">
                              {currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                            </div>
                            <div className="text-sm opacity-70 text-muted-foreground px-[10px]">
                              {currentLanguage === 'ar' ? 'إدارة حسابك' : 'Manage your account'}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (globalNavItems.length + 1) * 0.08 }}
                      >
                        <Link
                          to="/settings"
                          onClick={() => setIsMenuOpen(false)}
                          className="group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-accent/10 text-ink hover:text-accent"
                        >
                          <Shield className="text-accent" size={24} />
                          <div className="flex-1">
                            <div className="font-medium px-[10px]">{currentLanguage === 'ar' ? 'الإعدادات' : 'Settings'}</div>
                            <div className="text-sm opacity-70 text-muted-foreground px-[10px]">
                              {currentLanguage === 'ar' ? 'إدارات الحساب' : 'Account settings'}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StickyTopBar;
