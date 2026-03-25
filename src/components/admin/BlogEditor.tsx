import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Globe, Clock, Calendar as CalendarIcon, Wand2, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBlogEditor } from '@/hooks/useBlogEditor';
import { BlockEditor } from './blog-editor/BlockEditor';
import { LivePreview } from './blog-editor/LivePreview';
import { SEOPanel } from './blog-editor/SEOPanel';
import { TranslationHelper } from './blog-editor/TranslationHelper';
import { MarkdownImport } from './blog-editor/MarkdownImport';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BlogEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showMarkdownImport, setShowMarkdownImport] = useState(false);
  const {
    data,
    currentLanguage,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    setCurrentLanguage,
    updateField,
    updateBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    saveBlog,
    autoSave,
  } = useBlogEditor(id);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  const handlePublish = async () => {
    const success = await saveBlog('published');
    if (success) {
      navigate('/admin?tab=blogs');
    }
  };

  const handleSaveDraft = async () => {
    await saveBlog('draft');
  };

  const titleField = `title_${currentLanguage}` as keyof typeof data;
  const excerptField = `excerpt_${currentLanguage}` as keyof typeof data;
  const blocksField = `blocks_${currentLanguage}` as keyof typeof data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin?tab=blogs')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {id ? 'Edit Blog Post' : 'Create New Blog Post'}
                </h1>
                {lastSaved && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last saved {lastSaved.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={data.status === 'published' ? 'default' : 'secondary'}>
                {data.status || 'draft'}
              </Badge>
              
              <Button
                variant="outline"
                onClick={() => setCurrentLanguage(currentLanguage === 'en' ? 'ar' : 'en')}
              >
                <Globe className="h-4 w-4 mr-2" />
                {currentLanguage === 'en' ? 'English' : 'العربية'}
              </Button>

              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="relative"
              >
                {hasUnsavedChanges && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>

              <Button onClick={handlePublish} disabled={isSaving}>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Core details about your blog post ({currentLanguage === 'en' ? 'English' : 'Arabic'})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={data[titleField] as string || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateField(titleField, val);
                      // Auto-generate slug if empty
                      if (!data.slug) {
                        const auto = val
                          .toLowerCase()
                          .trim()
                          .replace(/[^\p{L}\p{N}\s-]/gu, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-');
                        updateField('slug', auto);
                      }
                    }}
                    placeholder="Enter blog title"
                    className="text-2xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      value={data.slug}
                      onChange={(e) => {
                        const cleaned = e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^\p{L}\p{N}\s-]/gu, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-');
                        updateField('slug', cleaned);
                      }}
                      onBlur={async () => {
                        if (!data.slug) return;
                        const { data: existing } = await supabase
                          .from('blogs')
                          .select('id')
                          .eq('slug', data.slug)
                          .limit(1)
                          .maybeSingle();
                        if (existing && (!data.id || existing.id !== data.id)) {
                          const newSlug = `${data.slug}-${Date.now().toString().slice(-4)}`;
                          updateField('slug', newSlug);
                        }
                      }}
                      placeholder="auto-generated-from-title"
                    />
                    <Button type="button" variant="outline" onClick={() => {
                      const base = (data[titleField] as string || '').toLowerCase().trim();
                      const auto = base
                        .replace(/[^\p{L}\p{N}\s-]/gu, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-');
                      updateField('slug', auto);
                    }}>
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">URL: /blog/{data.slug || 'your-slug'}</p>
                </div>

                <div className="space-y-2">
                  <Label>Excerpt</Label>
                  <Textarea
                    value={data[excerptField] as string || ''}
                    onChange={(e) => updateField(excerptField, e.target.value)}
                    placeholder="Brief summary (shown in blog list)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={data.category} onValueChange={(value) => updateField('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Home Maintenance">Home Maintenance</SelectItem>
                        <SelectItem value="Industry Insights">Industry Insights</SelectItem>
                        <SelectItem value="Cost Guides">Cost Guides</SelectItem>
                        <SelectItem value="Contractor Advice">Contractor Advice</SelectItem>
                        <SelectItem value="Smart Home">Smart Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input
                      value={data.author_name}
                      onChange={(e) => updateField('author_name', e.target.value)}
                      placeholder="Author name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={data.tags?.join(', ') || ''}
                    onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()))}
                    placeholder="maintenance, tips, guides"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Featured Image URL</Label>
                  <Input
                    value={data.featured_image_url}
                    onChange={(e) => updateField('featured_image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {data.featured_image_url && (
                    <img
                      src={data.featured_image_url}
                      alt="Featured"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Content Blocks</CardTitle>
                  <CardDescription>
                    Build your blog post with drag-and-drop blocks
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowMarkdownImport(true)}
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Import Markdown
                </Button>
              </CardHeader>
              <CardContent>
                <BlockEditor
                  blocks={data[blocksField] as any[] || []}
                  onBlocksChange={updateBlocks}
                  onUpdateBlock={updateBlock}
                  onDeleteBlock={deleteBlock}
                  onDuplicateBlock={duplicateBlock}
                  onAddBlock={addBlock}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publishing */}
            <Card>
              <CardHeader>
                <CardTitle>Publishing</CardTitle>
                <CardDescription>Control visibility and schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={data.status} onValueChange={(v) => updateField('status', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {data.status === 'scheduled' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Publish at</Label>
                    <Input
                      type="datetime-local"
                      value={data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0,16) : ''}
                      onChange={(e) => updateField('scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="seo">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="translate">Translate</TabsTrigger>
              </TabsList>

              <TabsContent value="seo" className="mt-4">
                <SEOPanel
                  data={data}
                  currentLanguage={currentLanguage}
                  onUpdate={updateField}
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <LivePreview data={data} currentLanguage={currentLanguage} />
              </TabsContent>

              <TabsContent value="translate" className="mt-4">
                <TranslationHelper
                  data={data}
                  currentLanguage={currentLanguage}
                  onUpdate={updateField}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Markdown Import Dialog */}
      <Dialog open={showMarkdownImport} onOpenChange={setShowMarkdownImport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Markdown</DialogTitle>
          </DialogHeader>
          <MarkdownImport
            language={currentLanguage}
            onImport={(blocks) => {
              updateBlocks([...data[blocksField] as any[], ...blocks]);
              setShowMarkdownImport(false);
            }}
            onClose={() => setShowMarkdownImport(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
