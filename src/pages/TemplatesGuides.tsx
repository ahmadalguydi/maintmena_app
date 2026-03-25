import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, CheckCircle, Star, Search, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

interface TemplatesGuidesProps {
  currentLanguage: 'en' | 'ar';
}

const TemplatesGuides = ({ currentLanguage }: TemplatesGuidesProps) => {
  const { user } = useAuth();
  const { hasAccess } = useSubscription();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('templates_guides')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const content = {
    en: {
      title: "Templates & Guides",
      subtitle: "Ready-to-use templates and step-by-step guides for industrial operations",
      searchPlaceholder: "Search templates and guides...",
      categories: {
        all: "All Resources",
        maintenance: "Maintenance",
        safety: "Safety & Risk",
        planning: "Planning & Budget",
        vendor: "Vendor Management"
      },
      downloadBtn: "Download Template",
      previewBtn: "Preview",
      rating: "Rating",
      downloads: "Downloads",
      templates: [
        {
          title: "Maintenance Schedule Template",
          description: "Comprehensive maintenance planning template with scheduling, resource allocation, and tracking features.",
          type: "Excel",
          size: "156 KB",
          category: "maintenance",
          rating: 4.8,
          downloads: "2.3k",
          features: ["Automated scheduling", "Resource tracking", "Cost analysis", "Reporting dashboard"],
          premium: false
        },
        {
          title: "Risk Assessment Checklist",
          description: "Complete risk assessment framework with hazard identification, risk matrix, and mitigation strategies.",
          type: "PDF",
          size: "245 KB", 
          category: "safety",
          rating: 4.9,
          downloads: "1.8k",
          features: ["Risk matrix", "Hazard categories", "Mitigation plans", "Compliance tracking"],
          premium: false,
          downloadOnly: true
        },
        {
          title: "Vendor Evaluation Framework",
          description: "Systematic vendor assessment template with scoring criteria, performance metrics, and comparison tools.",
          type: "Excel",
          size: "198 KB",
          category: "vendor",  
          rating: 4.7,
          downloads: "1.5k",
          features: ["Scoring matrix", "Performance KPIs", "Cost analysis", "Contract tracking"],
          premium: true
        },
        {
          title: "Budget Planning Template",
          description: "Annual maintenance budget planning tool with forecasting, variance analysis, and reporting capabilities.",
          type: "Excel", 
          size: "312 KB",
          category: "planning",
          rating: 4.6,
          downloads: "2.1k", 
          features: ["Budget forecasting", "Variance tracking", "Category breakdown", "Visual reports"],
          premium: false
        },
        {
          title: "Equipment Inspection Checklist",
          description: "Standardized inspection procedures for various equipment types with digital forms and photo documentation.",
          type: "PDF",
          size: "189 KB",
          category: "maintenance", 
          rating: 4.8,
          downloads: "2.7k",
          features: ["Equipment categories", "Photo documentation", "Digital forms", "Compliance tracking"],
          premium: false
        },
        {
          title: "Safety Incident Report Template",
          description: "Comprehensive incident reporting template with investigation workflow and corrective action tracking.",
          type: "PDF",
          size: "167 KB",
          category: "safety",
          rating: 4.9,
          downloads: "1.9k", 
          features: ["Investigation workflow", "Root cause analysis", "Action tracking", "Regulatory compliance"],
          premium: true
        }
      ]
    },
    ar: {
      title: "القوالب والأدلة",
      subtitle: "قوالب جاهزة للاستخدام وأدلة خطوة بخطوة للعمليات الصناعية",
      searchPlaceholder: "ابحث في القوالب والأدلة...",
      categories: {
        all: "جميع المصادر",
        maintenance: "الصيانة", 
        safety: "السلامة والمخاطر",
        planning: "التخطيط والميزانية",
        vendor: "إدارة الموردين"
      },
      downloadBtn: "تحميل القالب",
      previewBtn: "معاينة",
      rating: "التقييم",
      downloads: "التحميلات",
      templates: [
        {
          title: "قالب جدولة الصيانة",
          description: "قالب شامل لتخطيط الصيانة مع الجدولة وتخصيص الموارد وميزات التتبع.",
          type: "Excel",
          size: "156 كيلو",
          category: "maintenance",
          rating: 4.8,
          downloads: "2.3k",
          features: ["جدولة آلية", "تتبع الموارد", "تحليل التكلفة", "لوحة التقارير"],
          premium: false
        },
        {
          title: "قائمة تقييم المخاطر",
          description: "إطار شامل لتقييم المخاطر مع تحديد المخاطر ومصفوفة المخاطر واستراتيجيات التخفيف.",
          type: "PDF", 
          size: "245 كيلو",
          category: "safety",
          rating: 4.9,
          downloads: "1.8k",
          features: ["مصفوفة المخاطر", "فئات المخاطر", "خطط التخفيف", "تتبع الامتثال"],
          premium: false,
          downloadOnly: true
        },
        {
          title: "إطار تقييم الموردين",
          description: "قالب منهجي لتقييم الموردين مع معايير التقييم ومقاييس الأداء وأدوات المقارنة.",
          type: "Excel",
          size: "198 كيلو", 
          category: "vendor",
          rating: 4.7,
          downloads: "1.5k",
          features: ["مصفوفة التقييم", "مؤشرات الأداء", "تحليل التكلفة", "تتبع العقود"],
          premium: true
        },
        {
          title: "قالب تخطيط الميزانية",
          description: "أداة تخطيط ميزانية الصيانة السنوية مع التنبؤ وتحليل الانحراف وقدرات التقارير.",
          type: "Excel",
          size: "312 كيلو",
          category: "planning", 
          rating: 4.6,
          downloads: "2.1k",
          features: ["التنبؤ بالميزانية", "تتبع الانحراف", "تفصيل الفئات", "تقارير مرئية"],
          premium: false
        },
        {
          title: "قائمة فحص المعدات",
          description: "إجراءات فحص موحدة لأنواع مختلفة من المعدات مع نماذج رقمية وتوثيق الصور.",
          type: "PDF",
          size: "189 كيلو",
          category: "maintenance",
          rating: 4.8, 
          downloads: "2.7k",
          features: ["فئات المعدات", "توثيق الصور", "نماذج رقمية", "تتبع الامتثال"],
          premium: false
        },
        {
          title: "قالب تقرير حادثة السلامة",
          description: "قالب شامل لتقرير الحوادث مع سير عمل التحقيق وتتبع الإجراءات التصحيحية.",
          type: "PDF",
          size: "167 كيلو",
          category: "safety",
          rating: 4.9,
          downloads: "1.9k", 
          features: ["سير عمل التحقيق", "تحليل السبب الجذري", "تتبع الإجراءات", "الامتثال التنظيمي"],
          premium: true
        }
      ]
    }
  };

  const currentContent = content[currentLanguage];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = async (template: any) => {
    const canAccess = hasAccess(template.access_tier);
    
    if (!canAccess && !user) {
      window.location.href = '/login';
      return;
    }
    
    if (!canAccess) {
      window.location.href = '/pricing';
      return;
    }

    // Track download
    await supabase
      .from('templates_guides')
      .update({ downloads_count: (template.downloads_count || 0) + 1 })
      .eq('id', template.id);

    // Open file
    if (template.file_url) {
      window.open(template.file_url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-headline-1 text-ink mb-4">{currentContent.title}</h1>
          <p className="text-dek max-w-3xl mx-auto mb-8">{currentContent.subtitle}</p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder={currentContent.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {Object.entries(currentContent.categories).map(([key, label]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        )}

        {/* Templates Grid */}
        {!loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => {
              const canAccess = hasAccess(template.access_tier);
              const isPremium = template.access_tier !== 'free';
              
              return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {template.file_type === 'excel' || template.file_type === 'xlsx' ? (
                          <FileSpreadsheet className="text-green-600" size={24} />
                        ) : (
                          <FileText className="text-red-600" size={24} />
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-ink">{template.title}</h3>
                            {isPremium && !canAccess && (
                              <Lock size={14} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant={isPremium ? "default" : "secondary"} className="text-xs">
                              {template.file_type?.toUpperCase() || 'PDF'}
                            </Badge>
                            {isPremium && (
                              <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800">
                                Premium
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{template.description}</p>

                    {/* Category */}
                    <div className="mb-4">
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download size={14} />
                        {template.downloads_count || 0} {currentContent.downloads}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button 
                      className="w-full" 
                      onClick={() => handleDownload(template)}
                      disabled={isPremium && !canAccess}
                    >
                      <Download size={16} className="mr-2" />
                      {canAccess 
                        ? currentContent.downloadBtn 
                        : user 
                          ? (currentLanguage === 'ar' ? 'ترقية للوصول' : 'Upgrade to Access')
                          : (currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign in')
                      }
                    </Button>

                    {isPremium && !canAccess && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {currentLanguage === 'ar' ? 'يتطلب اشتراك مدفوع' : 'Requires premium subscription'}
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
            })}
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-ink mb-2">
              {currentLanguage === 'ar' ? 'لم يتم العثور على نتائج' : 'No templates found'}
            </h3>
            <p className="text-muted-foreground">
              {currentLanguage === 'ar' 
                ? 'جرب تغيير مصطلحات البحث أو الفئة المحددة'
                : 'Try adjusting your search terms or selected category'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesGuides;