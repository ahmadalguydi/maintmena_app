import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  FileText,
  Video,
  BookOpen,
  Calculator,
  Search,
  TrendingUp,
  FileSpreadsheet,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ROICalculator from '@/components/ROICalculator';
import EnergyEfficiencyCalculator from '@/components/EnergyEfficiencyCalculator';
import MaintenanceCostEstimator from '@/components/MaintenanceCostEstimator';
import ProjectTimelinePlanner from '@/components/ProjectTimelinePlanner';
import IndustryReportPreview from '@/components/IndustryReportPreview';

interface ResourcesProps {
  currentLanguage: 'en' | 'ar';
}

const Resources = ({ currentLanguage }: ResourcesProps) => {
  const { user } = useAuth();
  const { hasAccess } = useSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCalculator, setActiveCalculator] = useState<'roi' | 'energy' | 'maintenance' | 'timeline' | null>(null);
  const [reportPreview, setReportPreview] = useState<{ isOpen: boolean; title: string }>({
    isOpen: false,
    title: ''
  });

  // Database state
  const [industryReports, setIndustryReports] = useState<any[]>([]);
  const [educationalContent, setEducationalContent] = useState<any[]>([]);
  const [templatesGuides, setTemplatesGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);

    // Fetch industry reports (limit 4)
    const { data: reports } = await supabase
      .from('industry_reports')
      .select('*')
      .eq('status', 'published')
      .order('publication_date', { ascending: false })
      .limit(4);

    // Fetch educational content (limit 4)
    const { data: education } = await supabase
      .from('educational_content')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(4);

    // Fetch templates/guides (limit 4)
    const { data: templates } = await supabase
      .from('templates_guides')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(4);

    setIndustryReports(reports || []);
    setEducationalContent(education || []);
    setTemplatesGuides(templates || []);
    setLoading(false);
  };

  const content = {
    en: {
      title: "Resources Hub",
      subtitle: "Tools, guides, and resources for homeowners and contractors",
      search: "Search resources...",
      featured: "Featured Resources",
      categories: {
        reports: {
          title: "Industry Reports",
          desc: "In-depth analysis and market insights"
        },
        tools: {
          title: "Calculators & Tools",
          desc: "Interactive tools for planning and analysis",
          items: [
            { name: "ROI Calculator", type: "Free", access: "free", id: "roi" },
            { name: "Energy Efficiency Calculator", type: "Free", access: "free", id: "energy" },
            { name: "Maintenance Cost Estimator", type: "Premium", access: "professional", id: "maintenance" },
            { name: "Project Timeline Planner", type: "Premium", access: "basic", id: "timeline" },
          ]
        },
        education: {
          title: "Educational Content",
          desc: "Video tutorials and webinars"
        },
        templates: {
          title: "Templates & Guides",
          desc: "Ready-to-use resources"
        }
      },
      access: "Access",
      locked: "Premium",
      upgrade: "Upgrade to Access",
      signIn: "Sign in to Access"
    },
    ar: {
      title: "مركز الموارد",
      subtitle: "أدوات وأدلة وموارد لأصحاب المنازل والمقاولين",
      search: "ابحث في الموارد...",
      featured: "الموارد المميزة",
      categories: {
        reports: {
          title: "التقارير الصناعية",
          desc: "تحليلات معمقة ورؤى السوق"
        },
        tools: {
          title: "الحاسبات والأدوات",
          desc: "أدوات تفاعلية للتخطيط والتحليل",
          items: [
            { name: "حاسبة عائد الاستثمار", type: "مجاني", access: "free", id: "roi" },
            { name: "حاسبة كفاءة الطاقة", type: "مجاني", access: "free", id: "energy" },
            { name: "مقدر تكلفة الصيانة", type: "مدفوع", access: "professional", id: "maintenance" },
            { name: "مخطط الجدول الزمني للمشروع", type: "مدفوع", access: "basic", id: "timeline" },
          ]
        },
        education: {
          title: "المحتوى التعليمي",
          desc: "دروس فيديو وندوات عبر الإنترنت"
        },
        templates: {
          title: "القوالب والأدلة",
          desc: "موارد جاهزة للاستخدام"
        }
      },
      access: "دخول",
      locked: "مدفوع",
      upgrade: "الترقية للوصول",
      signIn: "تسجيل الدخول للوصول"
    }
  };

  const t = content[currentLanguage];

  const handleResourceAccess = (item: any, categoryKey: string) => {
    const canAccess = hasAccess(item.access || item.access_tier);

    if (!canAccess && !user) {
      window.location.href = '/login';
      return;
    }

    if (!canAccess) {
      window.location.href = '/pricing';
      return;
    }

    // Handle different resource types
    if (categoryKey === 'tools') {
      if (item.id === 'roi') {
        setActiveCalculator('roi');
      } else if (item.id === 'energy') {
        setActiveCalculator('energy');
      } else if (item.id === 'maintenance') {
        setActiveCalculator('maintenance');
      } else if (item.id === 'timeline') {
        setActiveCalculator('timeline');
      }
    } else if (categoryKey === 'reports') {
      setReportPreview({ isOpen: true, title: item.title });
    } else if (categoryKey === 'education') {
      // Navigate to educational content page
      window.location.href = '/educational-content';
    } else if (categoryKey === 'templates') {
      // Navigate to templates & guides page
      window.location.href = '/templates-guides';
    }
  };

  const getIcon = (categoryKey: string) => {
    const icons: Record<string, any> = {
      reports: FileText,
      tools: Calculator,
      education: Video,
      templates: BookOpen
    };
    return icons[categoryKey] || FileText;
  };

  const getTierLabel = (tier: string, isPremium: boolean) => {
    if (currentLanguage === 'ar') {
      return isPremium ? 'مدفوع' : 'مجاني';
    }
    return isPremium ? 'Premium' : 'Free';
  };

  return (
    <div className="min-h-screen bg-paper py-16 px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-headline-1 text-ink mb-4">{t.title}</h1>
          <p className="text-dek max-w-3xl mx-auto mb-8">{t.subtitle}</p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative">
            <Search
              className={`absolute ${currentLanguage === 'ar' ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-muted-foreground`}
              size={20}
            />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${currentLanguage === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 border-2 border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-paper text-ink`}
            />
          </div>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Industry Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <FileText className="text-accent" size={24} />
                  </div>
                  <div>
                    <CardTitle>{t.categories.reports.title}</CardTitle>
                    <CardDescription>{t.categories.reports.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
                  ) : industryReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reports available</p>
                  ) : (
                    industryReports.map((report) => {
                      const canAccess = hasAccess(report.access_tier);
                      const isPremium = report.access_tier !== 'free';

                      return (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-3 border border-rule rounded-lg hover:border-accent/50 transition-colors group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium text-ink">{report.title}</p>
                              {isPremium && !canAccess && (
                                <Lock size={14} className="text-muted-foreground" />
                              )}
                            </div>
                            <Badge variant={isPremium ? "default" : "secondary"} className="text-xs">
                              {getTierLabel(report.access_tier, isPremium)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={canAccess ? "default" : "outline"}
                            onClick={() => handleResourceAccess(report, 'reports')}
                          >
                            {canAccess
                              ? t.access
                              : user
                                ? t.upgrade
                                : t.signIn
                            }
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Calculators & Tools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Calculator className="text-accent" size={24} />
                  </div>
                  <div>
                    <CardTitle>{t.categories.tools.title}</CardTitle>
                    <CardDescription>{t.categories.tools.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {t.categories.tools.items.map((tool: any, index: number) => {
                    const canAccess = hasAccess(tool.access);
                    const isPremium = tool.access !== 'free';

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-rule rounded-lg hover:border-accent/50 transition-colors group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-ink">{tool.name}</p>
                            {isPremium && !canAccess && (
                              <Lock size={14} className="text-muted-foreground" />
                            )}
                          </div>
                          <Badge variant={isPremium ? "default" : "secondary"} className="text-xs">
                            {tool.type}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant={canAccess ? "default" : "outline"}
                          onClick={() => handleResourceAccess(tool, 'tools')}
                        >
                          {canAccess
                            ? t.access
                            : user
                              ? t.upgrade
                              : t.signIn
                          }
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Educational Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Video className="text-accent" size={24} />
                  </div>
                  <div>
                    <CardTitle>{t.categories.education.title}</CardTitle>
                    <CardDescription>{t.categories.education.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
                  ) : educationalContent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No content available</p>
                  ) : (
                    educationalContent.map((content) => {
                      const canAccess = hasAccess(content.access_tier);
                      const isPremium = content.access_tier !== 'free';

                      return (
                        <div
                          key={content.id}
                          className="flex items-center justify-between p-3 border border-rule rounded-lg hover:border-accent/50 transition-colors group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium text-ink">{content.title}</p>
                              {isPremium && !canAccess && (
                                <Lock size={14} className="text-muted-foreground" />
                              )}
                            </div>
                            <Badge variant={isPremium ? "default" : "secondary"} className="text-xs">
                              {getTierLabel(content.access_tier, isPremium)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.location.href = '/educational-content'}
                          >
                            {t.access}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Templates & Guides */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <BookOpen className="text-accent" size={24} />
                  </div>
                  <div>
                    <CardTitle>{t.categories.templates.title}</CardTitle>
                    <CardDescription>{t.categories.templates.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
                  ) : templatesGuides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No templates available</p>
                  ) : (
                    templatesGuides.map((template) => {
                      const canAccess = hasAccess(template.access_tier);
                      const isPremium = template.access_tier !== 'free';

                      return (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-3 border border-rule rounded-lg hover:border-accent/50 transition-colors group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium text-ink">{template.title}</p>
                              {isPremium && !canAccess && (
                                <Lock size={14} className="text-muted-foreground" />
                              )}
                            </div>
                            <Badge variant={isPremium ? "default" : "secondary"} className="text-xs">
                              {getTierLabel(template.access_tier, isPremium)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.location.href = '/templates-guides'}
                          >
                            {t.access}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="flex justify-center space-x-6">
            <Link to="/weekly-brief" className="text-accent-2 hover:underline">
              {currentLanguage === 'ar' ? "الموجز الأسبوعي" : "Weekly Brief"}
            </Link>
            <Link to="/archive" className="text-accent-2 hover:underline">
              {currentLanguage === 'ar' ? "الأرشيف" : "Archive"}
            </Link>
            <Link to="/pricing" className="text-accent-2 hover:underline">
              {currentLanguage === 'ar' ? "خطط الاشتراك" : "Pricing Plans"}
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Calculators */}
      {activeCalculator === 'roi' && (
        <ROICalculator
          currentLanguage={currentLanguage}
          onClose={() => setActiveCalculator(null)}
        />
      )}

      {activeCalculator === 'energy' && (
        <EnergyEfficiencyCalculator
          currentLanguage={currentLanguage}
          onClose={() => setActiveCalculator(null)}
        />
      )}

      {activeCalculator === 'maintenance' && (
        <MaintenanceCostEstimator
          currentLanguage={currentLanguage}
          onClose={() => setActiveCalculator(null)}
        />
      )}

      {activeCalculator === 'timeline' && (
        <ProjectTimelinePlanner
          currentLanguage={currentLanguage}
          onClose={() => setActiveCalculator(null)}
        />
      )}

      {/* Report Preview */}
      <IndustryReportPreview
        isOpen={reportPreview.isOpen}
        onClose={() => setReportPreview({ isOpen: false, title: '' })}
        currentLanguage={currentLanguage}
        reportTitle={reportPreview.title}
      />
    </div>
  );
};

export default Resources;