import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { BlogEditorData } from './types';
import { BlockRenderer } from './BlockRenderer';

interface LivePreviewProps {
  data: BlogEditorData;
  currentLanguage: 'en' | 'ar';
}

export const LivePreview = ({ data, currentLanguage }: LivePreviewProps) => {
  const title = currentLanguage === 'en' ? data.title_en : data.title_ar;
  const blocks = currentLanguage === 'en' ? data.blocks_en : data.blocks_ar;

  return (
    <Card className="h-full">
      <CardHeader>
        <Tabs defaultValue="desktop" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="desktop">
              <Monitor className="h-4 w-4 mr-2" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="tablet">
              <Tablet className="h-4 w-4 mr-2" />
              Tablet
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="desktop" className="mt-4">
            <PreviewContent data={data} title={title} blocks={blocks} />
          </TabsContent>
          <TabsContent value="tablet" className="mt-4">
            <div className="max-w-2xl mx-auto">
              <PreviewContent data={data} title={title} blocks={blocks} />
            </div>
          </TabsContent>
          <TabsContent value="mobile" className="mt-4">
            <div className="max-w-sm mx-auto">
              <PreviewContent data={data} title={title} blocks={blocks} />
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

const PreviewContent = ({ data, title, blocks }: any) => (
  <CardContent className="space-y-6">
    {/* Featured Image */}
    {data.featured_image_url && (
      <img
        src={data.featured_image_url}
        alt={title}
        className="w-full rounded-lg"
      />
    )}

    {/* Title */}
    <h1 className="text-4xl font-bold">{title || 'Untitled Blog Post'}</h1>

    {/* Meta Info */}
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {data.author_name && <span>By {data.author_name}</span>}
      {data.category && (
        <span className="px-2 py-1 bg-primary/10 rounded-md">{data.category}</span>
      )}
      {data.published_at && (
        <span>{new Date(data.published_at).toLocaleDateString()}</span>
      )}
    </div>

    {/* Content */}
    <BlockRenderer blocks={blocks} />

    {/* Tags */}
    {data.tags && data.tags.length > 0 && (
      <div className="flex flex-wrap gap-2 pt-6 border-t">
        {data.tags.map((tag: string, i: number) => (
          <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">
            {tag}
          </span>
        ))}
      </div>
    )}
  </CardContent>
);
