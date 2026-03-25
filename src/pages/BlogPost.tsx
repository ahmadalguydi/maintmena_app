import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import Masthead from '@/components/Masthead';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, ArrowLeft, Share2, Eye, Twitter, Linkedin, MessageCircle, Mail, User, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { trackEvent, trackScrollDepth, trackCTAClick } from '@/lib/analytics';
import { Block } from '@/components/admin/blog-editor/types';
import { BlockRenderer } from '@/components/admin/blog-editor/BlockRenderer';
import { createSafeHtml } from '@/lib/sanitize';

interface BlogPost {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  content_en: string;
  content_ar: string | null;
  blocks_en?: Block[];
  blocks_ar?: Block[];
  excerpt_en: string;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string;
  reading_time_minutes: number;
  featured_image_url: string | null;
  views_count: number;
  seo_title_en: string | null;
  seo_description_en: string | null;
  seo_keywords: string | null;
}

interface BlogPostProps {
  currentLanguage: 'en' | 'ar';
}

export default function BlogPost({ currentLanguage }: BlogPostProps) {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showFloatingShare, setShowFloatingShare] = useState(false);
  const isRTL = currentLanguage === 'ar';

  useEffect(() => {
    if (slug) {
      fetchBlog();
    }
  }, [slug]);

  // Track blog view and scroll depth
  useEffect(() => {
    if (blog) {
      trackEvent('blog_view', {
        blog_slug: blog.slug,
        blog_title: getTitle(),
        language: currentLanguage
      });

      let tracked50 = false;
      let tracked90 = false;

      const handleScroll = () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const scrollPercentage = (scrollTop / (documentHeight - windowHeight)) * 100;

        setReadingProgress(Math.min(scrollPercentage, 100));
        setShowFloatingShare(scrollTop > 800);

        if (scrollPercentage >= 50 && !tracked50) {
          trackScrollDepth(50, blog.slug);
          tracked50 = true;
        }

        if (scrollPercentage >= 90 && !tracked90) {
          trackScrollDepth(90, blog.slug);
          tracked90 = true;
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [blog, currentLanguage]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      setBlog({
        ...data,
        blocks_en: (data.blocks_en as unknown) as Block[] | undefined,
        blocks_ar: (data.blocks_ar as unknown) as Block[] | undefined,
      });

      // Increment view count
      await supabase
        .from('blogs')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id);

      // Fetch related blogs
      const { data: related } = await supabase
        .from('blogs')
        .select('*')
        .eq('category', data.category)
        .eq('status', 'published')
        .neq('id', data.id)
        .limit(3);

      setRelatedBlogs(related?.map(item => ({
        ...item,
        blocks_en: (item.blocks_en as unknown) as Block[] | undefined,
        blocks_ar: (item.blocks_ar as unknown) as Block[] | undefined,
      })) || []);
    } catch (error) {
      console.error('Error fetching blog:', error);
      toast.error(isRTL ? 'خطأ في تحميل المقال' : 'Error loading article');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (platform?: string) => {
    trackCTAClick('blog_post', 'share', blog?.slug);
    const url = window.location.href;
    const title = getTitle();

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
    } else {
      if (navigator.share) {
        navigator.share({ title, url });
      } else {
        navigator.clipboard.writeText(url);
        toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied!');
      }
    }
  };

  const handleCTAClick = (ctaLocation: string) => {
    trackCTAClick(ctaLocation, 'navigation', blog?.slug);
  };

  const getTitle = () => {
    if (!blog) return '';
    return isRTL && blog.title_ar ? blog.title_ar : blog.title_en;
  };

  const getContent = () => {
    if (!blog) return '';
    return isRTL && blog.content_ar ? blog.content_ar : blog.content_en;
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-paper ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Masthead currentLanguage={currentLanguage} />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className={`min-h-screen bg-paper ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <Masthead currentLanguage={currentLanguage} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {isRTL ? 'المقال غير موجود' : 'Article Not Found'}
          </h1>
          <Link to="/blog">
            <Button>{isRTL ? 'العودة إلى المدونة' : 'Back to Blog'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    'Maintenance Tips': 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
    'Industry News': 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
    'Cost Guides': 'from-green-500/10 to-emerald-500/10 border-green-500/20',
    'Contractor Advice': 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
    'Smart Home': 'from-teal-500/10 to-cyan-500/10 border-teal-500/20',
    'Home Maintenance': 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
  };

  const categoryGradient = categoryColors[blog.category] || 'from-primary/10 to-accent/10 border-primary/20';

  return (
    <div className={`min-h-screen bg-paper ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <SEOHead
        title={blog.seo_title_en || `${getTitle()} | MaintMENA Blog`}
        description={blog.seo_description_en || blog.excerpt_en}
        keywords={blog.seo_keywords || blog.tags.join(', ')}
        canonical={`https://maintmena.com/blog/${blog.slug}`}
        ogImage={blog.featured_image_url || undefined}
      />

      {/* Reading Progress Bar */}
      <div
        className="reading-progress"
        style={{ width: `${readingProgress}%` }}
      />

      {/* Floating Share Buttons */}
      <div className={`floating-share hidden lg:flex ${showFloatingShare ? 'visible' : ''}`}>
        <Button size="icon" variant="outline" className="rounded-full shadow-lg" onClick={() => handleShare('twitter')}>
          <Twitter className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" className="rounded-full shadow-lg" onClick={() => handleShare('linkedin')}>
          <Linkedin className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" className="rounded-full shadow-lg" onClick={() => handleShare('whatsapp')}>
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" className="rounded-full shadow-lg" onClick={() => handleShare('email')}>
          <Mail className="h-4 w-4" />
        </Button>
      </div>

      <Masthead currentLanguage={currentLanguage} />

      <article className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/blog">
            <Button variant="ghost" size="sm" className="mb-6 hover:bg-muted">
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'العودة' : 'Back to Blog'}
            </Button>
          </Link>

          {/* Category Badge & Tags */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="default" className={`text-xs font-medium px-3 py-1 bg-gradient-to-r ${categoryGradient}`}>
              {blog.category}
            </Badge>
            {blog.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight tracking-tight text-foreground">
            {getTitle()}
          </h1>

          {/* Author & Meta Info */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{blog.author_name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(blog.published_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{blog.reading_time_minutes} {isRTL ? 'دقيقة' : 'min read'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{blog.views_count.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleShare()} className="gap-2 text-xs">
              <Share2 className="h-3.5 w-3.5" />
              {isRTL ? 'مشاركة' : 'Share'}
            </Button>
          </div>

          {/* Featured Image */}
          {blog.featured_image_url && (
            <div className="relative mb-10 -mx-4 md:mx-0">
              <div className="aspect-video md:aspect-[2.4/1] overflow-hidden md:rounded-xl shadow-xl">
                <img
                  src={blog.featured_image_url}
                  alt={getTitle()}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent`} />
              </div>
            </div>
          )}

          {/* Content */}
          {(() => {
            const blocks = isRTL && blog.blocks_ar ? blog.blocks_ar : blog.blocks_en;

            if (blocks && blocks.length > 0) {
              return (
                <div className="blog-content">
                  <BlockRenderer blocks={blocks} />
                </div>
              );
            } else {
              // Fallback to HTML content for legacy blogs
              return (
                <div className="blog-content prose prose-lg max-w-none
                  prose-headings:scroll-mt-20
                  prose-p:text-foreground/80
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-a:transition-all
                  prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
                  prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono"
                  dangerouslySetInnerHTML={createSafeHtml(getContent())}
                />
              );
            }
          })()}

          {/* Author Card */}
          <div className="author-card mt-12 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <User className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">{blog.author_name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isRTL
                    ? 'كاتب متخصص في صيانة المنازل والعقارات في المملكة العربية السعودية'
                    : 'Expert writer specializing in home maintenance and property management in Saudi Arabia'}
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className={`mt-12 p-6 md:p-8 bg-gradient-to-br ${categoryGradient} rounded-xl border shadow-sm`}>
            <div className="text-center">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="text-xl md:text-2xl font-bold mb-2">
                {isRTL ? 'جاهز لبدء مشروعك؟' : 'Ready to Start Your Project?'}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-5 max-w-2xl mx-auto">
                {isRTL
                  ? 'احصل على عروض أسعار مجانية من مقاولين موثوقين في منطقتك'
                  : 'Get free quotes from verified contractors in your area'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/explore" onClick={() => handleCTAClick('blog_cta_explore')}>
                  <Button size="lg" className="w-full sm:w-auto font-medium">
                    {isRTL ? 'استكشف المقاولين' : 'Explore Contractors'}
                  </Button>
                </Link>
                <Link to="/pricing" onClick={() => handleCTAClick('blog_cta_pricing')}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium">
                    {isRTL ? 'الأسعار' : 'View Pricing'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Separator className="my-12" />

          {/* Related Articles */}
          {relatedBlogs.length > 0 && (
            <div className="mt-12">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {isRTL ? 'مقالات ذات صلة' : 'Related Articles'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'استمر في القراءة لمعرفة المزيد' : 'Continue reading to learn more'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedBlogs.map((related) => (
                  <Link key={related.id} to={`/blog/${related.slug}`} className="group">
                    <Card className="h-full hover:shadow-lg transition-all duration-300 border hover:border-primary/30 overflow-hidden bg-card">
                      {related.featured_image_url && (
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <img
                            src={related.featured_image_url}
                            alt={isRTL && related.title_ar ? related.title_ar : related.title_en}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      <div className="p-4">
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {related.category}
                        </Badge>
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2 mb-3">
                          {isRTL && related.title_ar ? related.title_ar : related.title_en}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{related.reading_time_minutes} {isRTL ? 'د' : 'min'}</span>
                          </div>
                          <span className="text-primary font-medium group-hover:translate-x-1 transition-transform">
                            {isRTL ? '←' : '→'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": getTitle(),
          "description": blog.excerpt_en,
          "image": blog.featured_image_url,
          "datePublished": blog.published_at,
          "author": {
            "@type": "Organization",
            "name": blog.author_name
          },
          "publisher": {
            "@type": "Organization",
            "name": "MaintMENA",
            "logo": {
              "@type": "ImageObject",
              "url": "https://maintmena.com/logo.png"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://maintmena.com/blog/${blog.slug}`
          }
        })}
      </script>

      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
