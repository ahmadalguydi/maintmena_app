import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BlogEditorData } from './types';

interface SEOPanelProps {
  data: BlogEditorData;
  currentLanguage: 'en' | 'ar';
  onUpdate: (field: keyof BlogEditorData, value: any) => void;
}

export const SEOPanel = ({ data, currentLanguage, onUpdate }: SEOPanelProps) => {
  const [seoScore, setSeoScore] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  const metaTitleField = `seo_title_${currentLanguage}` as keyof BlogEditorData;
  const metaDescField = `seo_description_${currentLanguage}` as keyof BlogEditorData;
  const titleField = `title_${currentLanguage}` as keyof BlogEditorData;
  const contentField = `content_${currentLanguage}` as keyof BlogEditorData;

  useEffect(() => {
    calculateSEOScore();
    calculateReadingTime();
  }, [data, currentLanguage]);

  const calculateReadingTime = () => {
    const content = data[contentField] as string || '';
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    setReadingTime(minutes);
  };

  const calculateSEOScore = () => {
    let score = 0;
    const metaTitle = data[metaTitleField] as string;
    const metaDesc = data[metaDescField] as string;
    const title = data[titleField] as string;

    // Title length (10 points)
    if (metaTitle && metaTitle.length >= 30 && metaTitle.length <= 60) score += 10;
    
    // Description length (10 points)
    if (metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160) score += 10;
    
    // Has slug (10 points)
    if (data.slug && data.slug.length > 0) score += 10;
    
    // Has keywords (10 points)
    if (data.seo_keywords && data.seo_keywords.split(',').length >= 3) score += 10;
    
    // Has featured image (10 points)
    if (data.featured_image_url) score += 10;
    
    // Has category (10 points)
    if (data.category) score += 10;
    
    // Has tags (10 points)
    if (data.tags && data.tags.length >= 2) score += 10;
    
    // Content length (20 points)
    const content = data[contentField] as string || '';
    const words = content.split(/\s+/).length;
    if (words >= 300) score += 20;
    
    // Title matches meta title (10 points)
    if (title && metaTitle && title === metaTitle) score += 10;

    setSeoScore(score);
  };

  const getSEOColor = () => {
    if (seoScore >= 80) return 'text-green-600';
    if (seoScore >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Optimization</CardTitle>
        <CardDescription>
          Optimize your blog post for search engines
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SEO Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>SEO Score</Label>
            <span className={`text-2xl font-bold ${getSEOColor()}`}>
              {seoScore}/100
            </span>
          </div>
          <Progress value={seoScore} className="h-2" />
        </div>

        {/* Reading Time */}
        <div>
          <Label>Estimated Reading Time</Label>
          <p className="text-sm text-muted-foreground">{readingTime} min read</p>
        </div>

        {/* Meta Title */}
        <div className="space-y-2">
          <Label htmlFor="meta-title">
            Meta Title {currentLanguage === 'en' ? '(EN)' : '(AR)'}
          </Label>
          <Input
            id="meta-title"
            value={data[metaTitleField] as string || ''}
            onChange={(e) => onUpdate(metaTitleField, e.target.value)}
            placeholder="Enter meta title (30-60 characters)"
            maxLength={60}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {(data[metaTitleField] as string || '').length}/60 characters
            </span>
            {(data[metaTitleField] as string || '').length >= 30 && 
             (data[metaTitleField] as string || '').length <= 60 && (
              <Badge variant="secondary" className="text-green-600">Good length</Badge>
            )}
          </div>
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <Label htmlFor="meta-desc">
            Meta Description {currentLanguage === 'en' ? '(EN)' : '(AR)'}
          </Label>
          <Textarea
            id="meta-desc"
            value={data[metaDescField] as string || ''}
            onChange={(e) => onUpdate(metaDescField, e.target.value)}
            placeholder="Enter meta description (120-160 characters)"
            maxLength={160}
            rows={3}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {(data[metaDescField] as string || '').length}/160 characters
            </span>
            {(data[metaDescField] as string || '').length >= 120 && 
             (data[metaDescField] as string || '').length <= 160 && (
              <Badge variant="secondary" className="text-green-600">Good length</Badge>
            )}
          </div>
        </div>

        {/* URL Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug</Label>
          <Input
            id="slug"
            value={data.slug}
            onChange={(e) => onUpdate('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="url-friendly-slug"
          />
          <p className="text-xs text-muted-foreground">
            Preview: /blog/{data.slug || 'your-slug-here'}
          </p>
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            value={data.seo_keywords || ''}
            onChange={(e) => onUpdate('seo_keywords', e.target.value)}
            placeholder="home maintenance, saudi arabia, repairs"
          />
          <p className="text-xs text-muted-foreground">
            {data.seo_keywords?.split(',').filter(k => k.trim()).length || 0} keywords added (aim for 3-5)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
