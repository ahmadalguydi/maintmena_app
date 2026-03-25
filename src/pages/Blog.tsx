import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import Masthead from '@/components/Masthead';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface BlogPost {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  excerpt_en: string;
  excerpt_ar: string | null;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string;
  reading_time_minutes: number;
  featured_image_url: string | null;
  views_count: number;
}

interface BlogProps {
  currentLanguage: 'en' | 'ar';
}

export default function Blog({ currentLanguage }: BlogProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isRTL = currentLanguage === 'ar';

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    filterBlogs();
  }, [blogs, searchQuery, selectedCategory]);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBlogs = () => {
    let filtered = [...blogs];

    if (searchQuery) {
      filtered = filtered.filter(blog =>
        blog.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.excerpt_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(blog => blog.category === selectedCategory);
    }

    setFilteredBlogs(filtered);
  };

  const categories = ['all', ...Array.from(new Set(blogs.map(blog => blog.category)))];

  const getTitle = (blog: BlogPost) => isRTL && blog.title_ar ? blog.title_ar : blog.title_en;
  const getExcerpt = (blog: BlogPost) => isRTL && blog.excerpt_ar ? blog.excerpt_ar : blog.excerpt_en;

  return (
    <div className={`min-h-screen bg-paper ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <SEOHead
        title={isRTL ? 'المدونة - نصائح وإرشادات الصيانة | MaintMENA' : 'Blog - Maintenance Tips & Industry Insights | MaintMENA'}
        description={isRTL ? 'اكتشف أحدث النصائح والاستراتيجيات لإدارة المرافق والصيانة في منطقة الشرق الأوسط' : 'Discover the latest facility management tips, maintenance strategies, and industry insights for MENA facilities.'}
        keywords="facility management blog, maintenance tips, MENA facilities, industry insights, preventive maintenance"
        canonical="https://maintmena.com/blog"
      />

      <Masthead currentLanguage={currentLanguage} />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="relative mb-16">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-3xl -z-10" />
          
          <div className="py-16 px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-primary">
                {isRTL ? 'أحدث النصائح والإرشادات' : 'Latest Tips & Insights'}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary-foreground to-accent bg-clip-text text-transparent">
                {isRTL ? 'مدونة' : 'Blog'}
              </span>
              <br />
              <span className="text-foreground">
                {isRTL ? 'MaintMENA' : 'MaintMENA'}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              {isRTL
                ? 'نصائح عملية، استراتيجيات مجربة، وحلول واقعية لمشاكل الصيانة اليومية. كل ما تحتاجه لإدارة منزلك أو منشأتك بكفاءة وتوفير المال'
                : 'Practical tips, proven strategies, and real solutions for everyday maintenance challenges. Everything you need to manage your home or facility efficiently and save money'}
            </p>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 flex-wrap text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">18</span>
                </div>
                <span className="text-muted-foreground">
                  {isRTL ? 'مقالات متخصصة' : 'Expert Articles'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <span className="text-accent font-bold">✓</span>
                </div>
                <span className="text-muted-foreground">
                  {isRTL ? 'محتوى موثق ومجرب' : 'Verified Content'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">🇸🇦</span>
                </div>
                <span className="text-muted-foreground">
                  {isRTL ? 'مخصص للسوق السعودي' : 'Saudi-Focused'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-12 space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5`} />
            <Input
              type="text"
              placeholder={isRTL ? 'ابحث عن مقال أو موضوع...' : 'Search for an article or topic...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isRTL ? 'pr-12' : 'pl-12'} h-14 text-base bg-background/50 backdrop-blur border-border/50 focus:border-primary rounded-2xl shadow-sm`}
            />
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>{isRTL ? 'تصفية حسب:' : 'Filter by:'}</span>
            </div>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category === 'all' ? (isRTL ? 'الكل' : 'All') : category}
              </Button>
            ))}
          </div>
          
          {/* Results count */}
          {searchQuery || selectedCategory !== 'all' ? (
            <p className="text-center text-sm text-muted-foreground">
              {isRTL 
                ? `عرض ${filteredBlogs.length} مقال${filteredBlogs.length !== 1 ? 'ات' : ''}`
                : `Showing ${filteredBlogs.length} article${filteredBlogs.length !== 1 ? 's' : ''}`
              }
            </p>
          ) : null}
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {isRTL ? 'لم يتم العثور على مقالات' : 'No articles found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <Link key={blog.id} to={`/blog/${blog.slug}`} className="group">
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/50 overflow-hidden">
                  {blog.featured_image_url && (
                    <div className="relative overflow-hidden aspect-video">
                      <img
                        src={blog.featured_image_url}
                        alt={getTitle(blog)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}
                  <CardHeader className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-medium">
                        {blog.category}
                      </Badge>
                      {blog.tags.slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2 text-xl leading-tight">
                      {getTitle(blog)}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 leading-relaxed">
                      {getExcerpt(blog)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="text-xs">{format(new Date(blog.published_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{blog.reading_time_minutes} {isRTL ? 'د' : 'min'}</span>
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium group-hover:translate-x-1 transition-transform">
                        {isRTL ? 'اقرأ المزيد ←' : 'Read more →'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
