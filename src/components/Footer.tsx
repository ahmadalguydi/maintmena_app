interface FooterProps {
  currentLanguage: 'en' | 'ar';
}

const Footer = ({ currentLanguage }: FooterProps) => {
  const content = {
    en: {
      tagline: 'Verified pros. Clear pricing. Jobs done right.',
      subtitle: 'Home & Project Services',
      copyright: '© 2024 MaintMENA. All rights reserved.',
      nav: [
        { label: 'How It Works', href: '#brief' },
        { label: 'Categories', href: '#board' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'About', href: '/about' },
        { label: 'FAQ', href: '#faq' }
      ],
      legal: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' }
      ]
    },
    ar: {
      tagline: 'محترفون موثقون. أسعار واضحة. عمل صحيح.',
      subtitle: 'خدمات المنازل والمشاريع',
      copyright: '© 2024 مينت مينا. كل الحقوق محفوظة.',
      nav: [
        { label: 'كيف يعمل', href: '#brief' },
        { label: 'الفئات', href: '#board' },
        { label: 'الأسعار', href: '#pricing' },
        { label: 'عن', href: '/about' },
        { label: 'الأسئلة', href: '#faq' }
      ],
      legal: [
        { label: 'سياسة الخصوصية', href: '/privacy' },
        { label: 'شروط الخدمة', href: '/terms' }
      ]
    }
  };

  return (
    <footer className="py-16 border-t border-rule bg-muted/10" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Top CTA strip */}
        <div className="mb-10 p-6 rounded-xl bg-gradient-to-r from-accent/10 to-accent-2/10 border border-rule flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-ink mb-1">
              {currentLanguage === 'ar' ? 'انضم لشبكة MaintMENA' : 'Join the MaintMENA Network'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentLanguage === 'ar' ? 'مكان تُصلح فيه البيوت وتنمو فيه الأعمال' : 'Where homes get fixed and pros grow fast.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/explore" className="px-4 py-2 rounded-md border border-rule text-ink hover:bg-muted/50 transition-colors">
              {currentLanguage === 'ar' ? 'للمشترين' : 'For Buyers'}
            </a>
            <a href="/marketplace" className="px-4 py-2 rounded-md bg-accent-2 hover:bg-accent-2/90 text-white transition-colors">
              {currentLanguage === 'ar' ? 'للمحترفين' : 'For Pros'}
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-semibold text-ink mb-3">{currentLanguage === 'ar' ? 'للمشترين' : 'For Buyers'}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/explore" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'ابحث عن محترف' : 'Find a Pro'}</a></li>
              <li><a href="/pricing" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'الأسعار' : 'Pricing'}</a></li>
              <li><a href="#how-it-works" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'كيف يعمل' : 'How it works'}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink mb-3">{currentLanguage === 'ar' ? 'للمحترفين' : 'For Pros'}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/marketplace" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'ابحث عن عمل' : 'Find a Job'}</a></li>
              <li><a href="/pricing" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'الأسعار' : 'Pricing'}</a></li>
              <li><a href="/resources" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'المصادر' : 'Resources'}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink mb-3">{currentLanguage === 'ar' ? 'الشركة' : 'Company'}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'عن المنصة' : 'About'}</a></li>
              <li><a href="/blog" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'المدونة' : 'Blog'}</a></li>
              <li><a href="/contact" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'تواصل معنا' : 'Contact'}</a></li>
              <li><a href="/support" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'الدعم' : 'Support'}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-ink mb-3">{currentLanguage === 'ar' ? 'القانوني' : 'Legal'}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/privacy" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</a></li>
              <li><a href="/terms" className="text-muted-foreground hover:text-accent transition-colors">{currentLanguage === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-rule text-center">
          <p className="text-sm text-muted-foreground">
            {content[currentLanguage].copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;