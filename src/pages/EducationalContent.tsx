import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Users, BookOpen, Download, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { LockedContent } from '@/components/LockedContent';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EducationalContentProps {
  currentLanguage: 'en' | 'ar';
}

const EducationalContent = ({ currentLanguage }: EducationalContentProps) => {
  const { user } = useAuth();
  const { hasAccess, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('educational_content')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    if (data) {
      setContent(data);
    }
    setLoading(false);
  };

  const handleViewIncrement = async (contentItem: any) => {
    const newCount = (contentItem.views_count || 0) + 1;
    await supabase
      .from('educational_content')
      .update({ views_count: newCount })
      .eq('id', contentItem.id);
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group content by category
  const groupedContent = filteredContent.reduce((acc: any, item: any) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const categories = ['all', ...Object.keys(groupedContent)];

  const contentText = {
    en: {
      title: "Educational Content",
      subtitle: "Video tutorials and webinars for industrial professionals",
      searchPlaceholder: "Search educational content...",
      allCategories: "All Categories",
      watchNow: "Watch Now",
      downloadMaterials: "Download Materials",
      viewTranscript: "View Transcript",
      views: "views",
      loading: "Loading...",
      noContent: "No content available",
      categories: [
        {
          title: "Maintenance Best Practices",
          description: "Essential maintenance strategies and techniques",
          videos: [
            {
              title: "Maintenance Best Practices Webinar",
              duration: "45 min",
              views: "2.3k",
              description: "Comprehensive overview of maintenance strategies, preventive maintenance scheduling, and cost optimization techniques.",
              thumbnail: "maintenance-webinar",
              type: "Webinar"
            },
            {
              title: "Predictive Maintenance Implementation",
              duration: "32 min",
              views: "1.8k",
              description: "Step-by-step guide to implementing predictive maintenance programs using vibration analysis and thermal imaging.",
              thumbnail: "predictive-maintenance",
              type: "Tutorial"
            }
          ]
        },
        {
          title: "Industry 4.0 & Digital Transformation",
          description: "Modern industrial technologies and implementation",
          videos: [
            {
              title: "Industry 4.0 Implementation Guide",
              duration: "38 min",
              views: "3.1k",
              description: "Complete guide to digital transformation in manufacturing, IoT integration, and smart factory concepts.",
              thumbnail: "industry-4",
              type: "Guide"
            },
            {
              title: "Digital Twin Technology",
              duration: "28 min",
              views: "1.5k",
              description: "Understanding digital twin technology and its applications in industrial maintenance and operations.",
              thumbnail: "digital-twin",
              type: "Tutorial"
            }
          ]
        },
        {
          title: "Safety & Compliance",
          description: "Safety management systems and regulatory compliance",
          videos: [
            {
              title: "Safety Management Systems",
              duration: "42 min",
              views: "2.7k",
              description: "Comprehensive coverage of safety management systems, risk assessment, and incident prevention strategies.",
              thumbnail: "safety-systems",
              type: "Webinar"
            },
            {
              title: "Regulatory Compliance in Saudi Arabia",
              duration: "35 min",
              views: "1.9k",
              description: "Overview of Saudi industrial regulations, compliance requirements, and best practices for regulatory adherence.",
              thumbnail: "compliance",
              type: "Guide"
            }
          ]
        }
      ],
    },
    ar: {
      title: "المحتوى التعليمي",
      subtitle: "فيديوهات تعليمية وندوات للمهنيين الصناعيين",
      searchPlaceholder: "ابحث في المحتوى التعليمي...",
      allCategories: "جميع الفئات",
      watchNow: "شاهد الآن",
      downloadMaterials: "تحميل المواد",
      viewTranscript: "عرض النص",
      views: "مشاهدة",
      loading: "جاري التحميل...",
      noContent: "لا يوجد محتوى متاح",
      categories: [
        {
          title: "أفضل ممارسات الصيانة",
          description: "استراتيجيات وتقنيات الصيانة الأساسية",
          videos: [
            {
              title: "ندوة أفضل ممارسات الصيانة",
              duration: "45 دقيقة",
              views: "2.3k",
              description: "نظرة شاملة على استراتيجيات الصيانة وجدولة الصيانة الوقائية وتقنيات تحسين التكلفة.",
              thumbnail: "maintenance-webinar",
              type: "ندوة"
            },
            {
              title: "تطبيق الصيانة التنبؤية",
              duration: "32 دقيقة",
              views: "1.8k",
              description: "دليل خطوة بخطوة لتطبيق برامج الصيانة التنبؤية باستخدام تحليل الاهتزاز والتصوير الحراري.",
              thumbnail: "predictive-maintenance",
              type: "دليل"
            }
          ]
        },
        {
          title: "الصناعة 4.0 والتحول الرقمي",
          description: "التقنيات الصناعية الحديثة والتطبيق",
          videos: [
            {
              title: "دليل تطبيق الصناعة 4.0",
              duration: "38 دقيقة",
              views: "3.1k",
              description: "دليل كامل للتحول الرقمي في التصنيع وتكامل إنترنت الأشياء ومفاهيم المصنع الذكي.",
              thumbnail: "industry-4",
              type: "دليل"
            },
            {
              title: "تقنية التوأم الرقمي",
              duration: "28 دقيقة",
              views: "1.5k",
              description: "فهم تقنية التوأم الرقمي وتطبيقاتها في الصيانة والعمليات الصناعية.",
              thumbnail: "digital-twin",
              type: "درس"
            }
          ]
        },
        {
          title: "السلامة والامتثال",
          description: "أنظمة إدارة السلامة والامتثال التنظيمي",
          videos: [
            {
              title: "أنظمة إدارة السلامة",
              duration: "42 دقيقة",
              views: "2.7k",
              description: "تغطية شاملة لأنظمة إدارة السلامة وتقييم المخاطر واستراتيجيات منع الحوادث.",
              thumbnail: "safety-systems",
              type: "ندوة"
            },
            {
              title: "الامتثال التنظيمي في السعودية",
              duration: "35 دقيقة",
              views: "1.9k",
              description: "نظرة عامة على الأنظمة الصناعية السعودية ومتطلبات الامتثال وأفضل الممارسات للالتزام التنظيمي.",
              thumbnail: "compliance",
              type: "دليل"
            }
          ]
        }
      ],
    }
  };

  const currentContent = contentText[currentLanguage];

  const VideoPlayer = ({ video, onClose }: { video: any; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl bg-paper rounded-lg overflow-hidden">
        <div className="aspect-video bg-black flex items-center justify-center">
          <div className="text-center text-white">
            <Play size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">{video.title}</p>
            <p className="text-sm opacity-75">Video player would be integrated here</p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-ink">{video.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {video.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {selectedVideo?.views_count || 0} {currentContent.views}
                </span>
                <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs">
                  {video.type}
                </span>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
          <p className="text-muted-foreground mb-4">{video.description}</p>
          <div className="flex gap-3">
            <Button size="sm">
              <Download size={14} className="mr-2" />
              {currentContent.downloadMaterials}
            </Button>
            <Button size="sm" variant="outline">
              <Eye size={14} className="mr-2" />
              {currentContent.viewTranscript}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

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
          <div className="max-w-md mx-auto relative mb-6">
            <Search className={`absolute ${currentLanguage === 'ar' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`} size={20} />
            <input
              type="text"
              placeholder={currentContent.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${currentLanguage === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper`}
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? currentContent.allCategories : category}
              </Button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{currentContent.loading}</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{currentContent.noContent}</p>
          </div>
        ) : (
          <div className="space-y-12">
          {Object.entries(groupedContent).map(([categoryName, items]: [string, any], categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-headline-2 text-ink mb-2">{categoryName}</h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item: any, itemIndex: number) => {
                  const canAccess = hasAccess(item.access_tier);
                  const isPremium = item.access_tier !== 'free';

                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Video Thumbnail */}
                      <div 
                        className="aspect-video bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center relative group cursor-pointer"
                        onClick={() => {
                          if (canAccess) {
                            setSelectedVideo(item);
                            handleViewIncrement(item);
                          } else if (!user) {
                            window.location.href = '/login';
                          } else {
                            window.location.href = '/pricing';
                          }
                        }}
                      >
                        <Play size={48} className="text-accent group-hover:scale-110 transition-transform" />
                        {item.duration_minutes && (
                          <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                            {item.duration_minutes} min
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-accent/90 text-accent-foreground px-2 py-1 rounded text-xs">
                          {item.content_type}
                        </div>
                      </div>

                      {/* Video Info */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-ink line-clamp-2">{item.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{item.description}</p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {item.duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {item.duration_minutes} min
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {item.views_count || 0}
                            </span>
                          </div>
                          {isPremium && (
                            <Badge variant="default" className="text-xs">Premium</Badge>
                          )}
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => {
                            if (canAccess) {
                              setSelectedVideo(item);
                              handleViewIncrement(item);
                            } else if (!user) {
                              window.location.href = '/login';
                            } else {
                              window.location.href = '/pricing';
                            }
                          }}
                          disabled={isPremium && !canAccess}
                        >
                          <Play size={16} className="mr-2" />
                          {canAccess 
                            ? currentContent.watchNow 
                            : user 
                              ? (currentLanguage === 'ar' ? 'ترقية للوصول' : 'Upgrade')
                              : (currentLanguage === 'ar' ? 'تسجيل الدخول' : 'Sign in')
                          }
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}
    </div>
  );
};

export default EducationalContent;