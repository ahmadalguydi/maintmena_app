import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Home, Info, Archive, DollarSign, Mail, Briefcase, BookOpen, HelpCircle, Shield, Menu, X, BarChart3, User, FileText, Plus } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
interface StickyTopBarProps {
  currentLanguage: 'en' | 'ar';
  onLanguageToggle: () => void;
}
const StickyTopBar = ({
  currentLanguage,
  onLanguageToggle
}: StickyTopBarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    user,
    userType,
    loading
  } = useAuth();
  const { subscription } = useSubscription();
  const location = useLocation();
  
  // Determine effective user type - if userType is null but subscription tier is a seller tier, treat as seller
  const effectiveUserType = userType || 
    (subscription?.tier && ['starter', 'professional', 'elite'].includes(subscription.tier) ? 'seller' : null);
    
  const isBuyer = effectiveUserType === 'buyer';
  const isSeller = effectiveUserType === 'seller';
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  const homeNavItems = [{
    label: 'Overview',
    scrollTo: 'overview',
    arLabel: 'نظرة عامة'
  }, {
    label: 'How It Works',
    scrollTo: 'how-it-works',
    arLabel: 'آلية العمل'
  }, {
    label: 'Services',
    scrollTo: 'services',
    arLabel: 'الخدمات'
  }, {
    label: 'Pricing',
    scrollTo: 'pricing',
    arLabel: 'الأسعار'
  }, {
    label: 'FAQ',
    scrollTo: 'faq',
    arLabel: 'الأسئلة الشائعة'
  }];
  const allNavItems = [{
    label: 'Home',
    href: '/',
    arLabel: 'الرئيسية',
    icon: Home,
    description: 'Industrial Brief',
    arDescription: 'الموجز الصناعي',
    roles: ['buyer', 'seller', 'admin']
  }, {
    label: 'Briefs',
    href: '/briefs',
    arLabel: 'الملخصات',
    icon: FileText,
    description: 'Weekly Intelligence',
    arDescription: 'الذكاء الأسبوعي',
    roles: ['seller', 'admin']
  }, {
    label: 'Marketplace',
    href: '/marketplace',
    arLabel: 'السوق',
    icon: Briefcase,
    description: 'Find Jobs',
    arDescription: 'ابحث عن عمل',
    roles: ['seller']
  }, {
    label: 'Explore',
    href: '/explore',
    arLabel: 'استكشف',
    icon: User,
    description: 'Find Service Providers',
    arDescription: 'ابحث عن مقدمي الخدمات',
    roles: ['buyer']
  }, {
    label: 'Post Request',
    href: '/post-job',
    arLabel: 'نشر طلب',
    icon: Plus,
    description: 'Request a Service',
    arDescription: 'اطلب خدمة',
    roles: ['buyer']
  }, {
    label: 'Contracts',
    href: '/contracts',
    arLabel: 'العقود',
    icon: FileText,
    description: 'Service Agreements',
    arDescription: 'اتفاقيات الخدمة',
    roles: ['buyer', 'seller']
  }, {
    label: 'About',
    href: '/about',
    arLabel: 'عنا',
    icon: Info,
    description: 'Our Story',
    arDescription: 'قصتنا',
    roles: []
  }, {
    label: 'Blog',
    href: '/blog',
    arLabel: 'المدونة',
    icon: BookOpen,
    description: 'Articles & Insights',
    arDescription: 'مقالات ونصائح',
    roles: []
  }, {
    label: 'Resources',
    href: '/resources',
    arLabel: 'المصادر',
    icon: Archive,
    description: 'Industry Tools',
    arDescription: 'أدوات الصناعة',
    roles: ['seller', 'admin']
  }, {
    label: 'Support',
    href: '/support',
    arLabel: 'الدعم',
    icon: HelpCircle,
    description: 'Help Center',
    arDescription: 'مركز المساعدة',
    roles: []
  }, {
    label: 'Contact',
    href: '/contact',
    arLabel: 'تواصل معانا',
    icon: Mail,
    description: 'Get In Touch',
    arDescription: 'كلمنا',
    roles: []
  }];

  // Filter navigation items based on user role (using effectiveUserType)
  const globalNavItems = !user 
    ? allNavItems.filter(item => !item.roles || item.roles.length === 0)
    : allNavItems.filter(item => {
        if (!item.roles || item.roles.length === 0) return true;
        if (!effectiveUserType) return false;
        // Buyers can only see buyer items
        if (effectiveUserType === 'buyer' && item.roles.includes('buyer')) return true;
        // Sellers can only see seller items  
        if (effectiveUserType === 'seller' && item.roles.includes('seller')) return true;
        // Admins can see everything
        if (effectiveUserType === 'admin') return true;
        return false;
      });
  const isHomePage = location.pathname === '/';
  const isActive = (href: string) => location.pathname === href;
  return <>
      <div className={`sticky top-0 z-50 bg-paper/95 backdrop-blur-sm transition-shadow duration-base ${isScrolled ? 'shadow-sm border-b border-rule' : ''}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            {/* Left: Navigation or Menu Button */}
            {isHomePage ? <nav className={`hidden sm:flex items-center gap-8 ${currentLanguage === 'ar' ? 'space-x-reverse' : ''}`} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                {homeNavItems.map(item => <button key={item.scrollTo} onClick={() => {
              const element = document.getElementById(item.scrollTo);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            }} className="text-ink hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded px-1">
                    {currentLanguage === 'ar' ? item.arLabel : item.label}
                  </button>)}
              </nav> : <div className="hidden sm:flex items-center space-x-4">
                <Link to="/" className={`text-byline hover:text-accent transition-colors ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                  {currentLanguage === 'ar' ? 'الرئيسية' : 'Home'}
                </Link>
              </div>}

            {/* Mobile: Menu + Language on left, Desktop: keeps same structure */}
            <div className="flex items-center justify-between flex-1 sm:flex-none sm:justify-end">
              {/* Mobile Left: Menu + Language */}
              <div className="flex items-center space-x-2 sm:hidden">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="bg-accent hover:bg-accent-hover text-paper p-2 rounded-md shadow-sm transition-colors" aria-label="Toggle menu">
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                
                <button onClick={onLanguageToggle} className="text-byline hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded px-2 py-1" aria-label={currentLanguage === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
                  <span className={currentLanguage === 'en' ? 'font-medium' : 'opacity-60'}>EN</span>
                  <span className="mx-1">|</span>
                  <span className={currentLanguage === 'ar' ? 'font-medium' : 'opacity-60'}>AR</span>
                </button>
              </div>

              {/* Mobile Right: NotificationBell + Dashboard or Sign In */}
              <div className="flex items-center space-x-2 sm:hidden">
                {!loading && (user ? <>
                      <NotificationBell />
                      <Link to={isBuyer ? '/buyer-dashboard' : isSeller ? '/seller-dashboard' : '/admin'} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm">
                        <BarChart3 size={16} />
                        <span className={`hidden xs:inline ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>{currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                      </Link>
                    </> : <Link to="/login" className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm">
                      <User size={16} />
                      <span className="hidden xs:inline">{currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                    </Link>)}
              </div>

              {/* Desktop: Dashboard/Sign In + Menu + Language */}
              <div className="hidden sm:flex items-center space-x-3">
                {!loading && (user ? <div className="flex items-center gap-2">
                      <NotificationBell />
                      <Link to={isBuyer ? '/buyer-dashboard' : isSeller ? '/seller-dashboard' : '/admin'} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm">
                        <BarChart3 size={16} />
                        <span className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>{currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                      </Link>
                    </div> : <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-paper rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm">
                      <User size={16} />
                      {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                    </Link>)}
                
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="bg-accent hover:bg-accent-hover text-paper p-2 rounded-md shadow-sm transition-colors" aria-label="Toggle menu">
                  {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
                
                <button onClick={onLanguageToggle} className="text-byline hover:text-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 rounded px-2 py-1" aria-label={currentLanguage === 'en' ? 'Switch to Arabic' : 'Switch to English'}>
                  <span className={currentLanguage === 'en' ? 'font-medium' : 'opacity-60'}>EN</span>
                  <span className="mx-1">|</span>
                  <span className={currentLanguage === 'ar' ? 'font-medium' : 'opacity-60'}>AR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-40" onClick={() => setIsMenuOpen(false)}>
            <motion.nav initial={{
          x: '100%'
        }} animate={{
          x: 0
        }} exit={{
          x: '100%'
        }} transition={{
          type: 'spring',
          damping: 30,
          stiffness: 300
        }} className="fixed right-0 top-0 h-full w-80 bg-paper shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()} dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-8 pt-12">
                  <h2 className="text-headline-2 text-ink">
                    {currentLanguage === 'ar' ? 'القائمة' : 'Menu'}
                  </h2>
                  <button onClick={onLanguageToggle} className="text-byline hover:text-accent transition-colors px-3 py-2 rounded border border-rule">
                    <span className={currentLanguage === 'en' ? 'font-medium' : 'opacity-60'}>EN</span>
                    <span className="mx-2">|</span>
                    <span className={currentLanguage === 'ar' ? 'font-medium' : 'opacity-60'}>AR</span>
                  </button>
                </div>
                
                <div className="space-y-1">
                  {globalNavItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return <motion.div key={item.href} initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: index * 0.1
                }}>
                        <Link to={item.href} onClick={() => setIsMenuOpen(false)} className={`group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 ${active ? 'bg-accent text-paper shadow-md' : 'hover:bg-accent/10 text-ink hover:text-accent'} ${currentLanguage === 'ar' ? 'space-x-reverse' : ''}`}>
                          <Icon size={24} className={active ? 'text-paper' : 'text-accent'} />
                          <div className="flex-1">
                            <div className="font-medium">
                              {currentLanguage === 'ar' ? item.arLabel : item.label}
                            </div>
                            <div className={`text-sm opacity-70 ${active ? 'text-paper/80' : 'text-muted-foreground'}`}>
                              {currentLanguage === 'ar' ? item.arDescription : item.description}
                            </div>
                          </div>
                        </Link>
                      </motion.div>;
              })}
                  
                   {/* Auth Links in Mobile Menu */}
                  {!user ? <>
                      <motion.div key="signin" initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: globalNavItems.length * 0.1
                }} className="border-t border-rule pt-4 mt-4">
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-accent/10 text-ink hover:text-accent">
                          <User className="text-accent" size={24} />
                          <div className="flex-1">
                            <div className="font-medium">
                              {currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                            </div>
                            <div className="text-sm opacity-70 text-muted-foreground">
                              {currentLanguage === 'ar' ? 'الدخول للحساب' : 'Access your account'}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    </> : <>
                      <motion.div key="dashboard" initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: globalNavItems.length * 0.1
                }} className="border-t border-rule pt-4 mt-4">
                        <Link to={isBuyer ? '/buyer-dashboard' : isSeller ? '/seller-dashboard' : '/admin'} onClick={() => setIsMenuOpen(false)} className="group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-accent/10 text-ink hover:text-accent">
                          <BarChart3 className="text-accent" size={24} />
                          <div className="flex-1">
                            <div className="font-medium px-[10px]">
                              {currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                            </div>
                            <div className="text-sm opacity-70 text-muted-foreground mx-0 my-0 px-[10px]">
                              {currentLanguage === 'ar' ? 'إدارة حسابك' : 'Manage your account'}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                      <motion.div key="settings" initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: (globalNavItems.length + 1) * 0.1
                }}>
                        <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="group flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 hover:bg-accent/10 text-ink hover:text-accent">
                          <Shield className="text-accent" size={24} />
                          <div className="flex-1">
                            <div className="font-medium px-[10px]">
                              {currentLanguage === 'ar' ? 'الإعدادات' : 'Settings'}
                            </div>
                            <div className="text-sm opacity-70 text-muted-foreground px-[10px]">
                              {currentLanguage === 'ar' ? 'إعدادات الحساب' : 'Account settings'}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                      <motion.div key="currency" initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: (globalNavItems.length + 2) * 0.1
                }}>
                        <div className="p-4 rounded-lg border border-rule">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-ink">
                                {currentLanguage === 'ar' ? 'العملة' : 'Currency'}
                              </div>
                              <div className="text-sm opacity-70 text-muted-foreground">
                                {currentLanguage === 'ar' ? 'اختر عملتك المفضلة' : 'Choose your preferred currency'}
                              </div>
                            </div>
                            <CurrencySwitcher />
                          </div>
                        </div>
                      </motion.div>
                    </>}
                </div>
              </div>
            </motion.nav>
          </motion.div>}
      </AnimatePresence>
    </>;
};
export default StickyTopBar;