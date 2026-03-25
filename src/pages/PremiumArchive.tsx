import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Download, Calendar, DollarSign, Building, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumArchiveProps {
  currentLanguage: 'en' | 'ar';
}

const PremiumArchive = ({ currentLanguage }: PremiumArchiveProps) => {
  const { user, userType, loading: authLoading } = useAuth();
  const { hasAccess, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const loading = authLoading || subLoading;

  // Determine dashboard route based on user type
  const getDashboardRoute = () => {
    if (userType === 'buyer') return '/buyer-dashboard';
    if (userType === 'seller') return '/seller-dashboard';
    if (userType === 'admin') return '/admin';
    return '/seller-dashboard'; // Default fallback
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Check access after loading
  if (!loading && user && !hasAccess('basic')) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-headline-2 mb-4">
            {currentLanguage === 'ar' ? 'مطلوب اشتراك' : 'Subscription Required'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {currentLanguage === 'ar'
              ? 'يتطلب الوصول إلى الأرشيف المتميز اشتراكاً نشطاً'
              : 'Access to Premium Archive requires an active subscription'}
          </p>
          <Button onClick={() => navigate('/pricing')}>
            {currentLanguage === 'ar' ? 'عرض الخطط' : 'View Plans'}
          </Button>
        </div>
      </div>
    );
  }

  const content = {
    en: {
      title: 'Premium Archive',
      subtitle: 'Full access to all past editions with complete content',
      search: 'Search issues...',
      allTags: 'All Tags',
      downloadPdf: 'Download PDF',
      viewOnline: 'View Online',
      tags: ['Petrochemicals', 'Utilities', 'Oil & Gas', 'Mining', 'Manufacturing', 'Infrastructure'],
      editions: [
        {
          number: 5,
          date: 'September 16, 2024',
          title: 'Major Refinery Turnarounds Announced Across Gulf States',
          excerpt: 'Three major petrochemical facilities announce scheduled maintenance windows for Q4 2024, with combined tender value exceeding $2.3B.',
          tags: ['Petrochemicals', 'Oil & Gas'],
          highlights: ['15 new tenders', '3 major turnarounds', '8 directory updates'],
          totalValue: '$2.3B',
          pdfUrl: '#'
        },
        {
          number: 4,
          date: 'September 9, 2024',
          title: 'Power Sector Maintenance Surge Following Summer Peak',
          excerpt: 'Regional utilities begin post-summer maintenance campaigns with focus on gas turbine overhauls and transmission upgrades.',
          tags: ['Utilities', 'Infrastructure'],
          highlights: ['22 new tenders', '5 utility announcements', '12 directory updates'],
          totalValue: '$890M',
          pdfUrl: '#'
        },
        {
          number: 3,
          date: 'September 2, 2024',
          title: 'Mining Operations Expansion Drives Equipment Demand',
          excerpt: 'New copper and gold projects across MENA region create opportunities in heavy machinery maintenance and specialized services.',
          tags: ['Mining', 'Manufacturing'],
          highlights: ['18 new tenders', '2 major projects', '15 directory updates'],
          totalValue: '$1.2B',
          pdfUrl: '#'
        }
      ]
    },
    ar: {
      title: 'الأرشيف المتميز',
      subtitle: 'وصول كامل لجميع الإصدارات السابقة مع المحتوى الكامل',
      search: 'البحث في الإصدارات...',
      allTags: 'جميع العلامات',
      downloadPdf: 'تحميل PDF',
      viewOnline: 'عرض أونلاين',
      tags: ['البتروكيماويات', 'المرافق', 'النفط والغاز', 'التعدين', 'التصنيع', 'البنية التحتية'],
      editions: [
        {
          number: 5,
          date: '16 سبتمبر 2024',
          title: 'إعلان عمليات صيانة كبرى للمصافي عبر دول الخليج',
          excerpt: 'ثلاث منشآت بتروكيماوية كبرى تعلن عن نوافذ صيانة مجدولة للربع الرابع من 2024.',
          tags: ['البتروكيماويات', 'النفط والغاز'],
          highlights: ['15 مناقصة جديدة', '3 عمليات صيانة', '8 تحديثات'],
          totalValue: '2.3 مليار دولار',
          pdfUrl: '#'
        },
        {
          number: 4,
          date: '9 سبتمبر 2024',
          title: 'زيادة صيانة قطاع الكهرباء',
          excerpt: 'المرافق الإقليمية تبدأ حملات الصيانة بعد الصيف.',
          tags: ['المرافق', 'البنية التحتية'],
          highlights: ['22 مناقصة', '5 إعلانات', '12 تحديث'],
          totalValue: '890 مليون',
          pdfUrl: '#'
        },
        {
          number: 3,
          date: '2 سبتمبر 2024',
          title: 'توسع عمليات التعدين',
          excerpt: 'مشاريع جديدة تخلق فرصاً في الصيانة.',
          tags: ['التعدين', 'التصنيع'],
          highlights: ['18 مناقصة', 'مشروعان', '15 تحديث'],
          totalValue: '1.2 مليار',
          pdfUrl: '#'
        }
      ]
    }
  };

  const filteredEditions = content[currentLanguage].editions.filter(edition => {
    const matchesSearch = edition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      edition.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || edition.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="border-b border-rule py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(getDashboardRoute())}>
            <ArrowLeft className="w-4 h-4" />
            {currentLanguage === 'ar' ? 'العودة' : 'Back'}
          </Button>
          <div className="text-masthead">MaintMENA</div>
        </div>
      </header>

      <main className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-headline-1 mb-4">{content[currentLanguage].title}</h1>
            <p className="text-dek mb-8">{content[currentLanguage].subtitle}</p>

            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={content[currentLanguage].search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge
                variant={selectedTag === null ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedTag(null)}
              >
                {content[currentLanguage].allTags}
              </Badge>
              {content[currentLanguage].tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </motion.div>

          <div className="space-y-8">
            {filteredEditions.map((edition, index) => (
              <motion.article
                key={edition.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-rule rounded-lg p-8 hover:shadow-lg transition-shadow"
              >
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <div className="text-center md:text-left">
                      <div className="text-2xl font-display font-bold text-accent-2 mb-2">
                        #{edition.number.toString().padStart(3, '0')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="w-4 h-4" />
                        {edition.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-accent-2 font-medium">
                        <DollarSign className="w-4 h-4" />
                        {edition.totalValue}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h2 className="text-xl font-display font-semibold mb-3">
                      {edition.title}
                    </h2>
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {edition.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {edition.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {edition.highlights.map((highlight, idx) => (
                        <div key={idx} className="text-center p-2 bg-muted/30 rounded">
                          <Building className="w-4 h-4 mx-auto mb-1 text-accent-2" />
                          <span className="text-muted-foreground">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex md:flex-col justify-center items-center gap-3">
                    <Button
                      className="w-full"
                      onClick={() => {
                        alert(currentLanguage === 'ar' ? 'جاري التحميل...' : 'Downloading...');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {content[currentLanguage].downloadPdf}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/weekly-brief')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {content[currentLanguage].viewOnline}
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {filteredEditions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'لم يتم العثور على إصدارات.'
                  : 'No issues found.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PremiumArchive;