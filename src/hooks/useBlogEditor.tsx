import { useState, useCallback, useEffect } from 'react';
import { Block, BlogEditorData } from '@/components/admin/blog-editor/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { blocksToMarkdown } from '@/utils/markdownParser';

export const useBlogEditor = (blogId?: string) => {
  const [data, setData] = useState<BlogEditorData>({
    title_en: '',
    title_ar: '',
    slug: '',
    excerpt_en: '',
    excerpt_ar: '',
    content_en: '',
    content_ar: '',
    blocks_en: [],
    blocks_ar: [],
    category: '',
    tags: [],
    featured_image_url: '',
    seo_title_en: '',
    seo_title_ar: '',
    seo_description_en: '',
    seo_description_ar: '',
    seo_keywords: '',
    author_name: '',
    status: 'draft',
  });
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // Load existing blog
  useEffect(() => {
    if (blogId) {
      loadBlog(blogId);
    }
  }, [blogId]);

  const loadBlog = async (id: string) => {
    try {
      const { data: blog, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setData({
        id: blog.id,
        title_en: blog.title_en || '',
        title_ar: blog.title_ar || '',
        slug: blog.slug,
        excerpt_en: blog.excerpt_en || '',
        excerpt_ar: blog.excerpt_ar || '',
        content_en: blog.content_en || '',
        content_ar: blog.content_ar || '',
        blocks_en: (blog.blocks_en as any as Block[]) || [],
        blocks_ar: (blog.blocks_ar as any as Block[]) || [],
        category: blog.category,
        tags: blog.tags || [],
        featured_image_url: blog.featured_image_url || '',
        seo_title_en: blog.seo_title_en || '',
        seo_title_ar: blog.seo_title_ar || '',
        seo_description_en: blog.seo_description_en || '',
        seo_description_ar: blog.seo_description_ar || '',
        seo_keywords: blog.seo_keywords || '',
        author_name: blog.author_name || '',
        status: blog.status || 'draft',
        published_at: blog.published_at,
        scheduled_at: blog.scheduled_at,
      });
    } catch (error) {
      console.error('Error loading blog:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog post',
        variant: 'destructive',
      });
    }
  };

  const updateField = useCallback((field: keyof BlogEditorData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const updateBlocks = useCallback((blocks: Block[]) => {
    setData(prev => ({
      ...prev,
      [`blocks_${currentLanguage}`]: blocks,
    }));
    setHasUnsavedChanges(true);
  }, [currentLanguage]);

  const addBlock = useCallback((type: Block['type'], index?: number) => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      content: {},
    };

    setData(prev => {
      const blocksKey = `blocks_${currentLanguage}` as keyof BlogEditorData;
      const blocks = [...(prev[blocksKey] as Block[])];
      
      if (index !== undefined) {
        blocks.splice(index + 1, 0, newBlock);
      } else {
        blocks.push(newBlock);
      }
      
      return { ...prev, [blocksKey]: blocks };
    });

    return newBlock.id;
  }, [currentLanguage]);

  const updateBlock = useCallback((blockId: string, content: Partial<Block['content']>) => {
    setData(prev => {
      const blocksKey = `blocks_${currentLanguage}` as keyof BlogEditorData;
      const blocks = (prev[blocksKey] as Block[]).map(block =>
        block.id === blockId
          ? { ...block, content: { ...block.content, ...content } }
          : block
      );
      return { ...prev, [blocksKey]: blocks };
    });
  }, [currentLanguage]);

  const deleteBlock = useCallback((blockId: string) => {
    setData(prev => {
      const blocksKey = `blocks_${currentLanguage}` as keyof BlogEditorData;
      const blocks = (prev[blocksKey] as Block[]).filter(block => block.id !== blockId);
      return { ...prev, [blocksKey]: blocks };
    });
  }, [currentLanguage]);

  const duplicateBlock = useCallback((blockId: string) => {
    setData(prev => {
      const blocksKey = `blocks_${currentLanguage}` as keyof BlogEditorData;
      const blocks = [...(prev[blocksKey] as Block[])];
      const index = blocks.findIndex(b => b.id === blockId);
      
      if (index !== -1) {
        // Deep clone the content to avoid reference sharing
        const newBlock = {
          ...blocks[index],
          id: `block-${Date.now()}-${Math.random()}`,
          content: JSON.parse(JSON.stringify(blocks[index].content))
        };
        blocks.splice(index + 1, 0, newBlock);
      }
      
      return { ...prev, [blocksKey]: blocks };
    });
  }, [currentLanguage]);

  // Auto-save function with stable reference
  const autoSave = useCallback(async () => {
    if (!data.title_en && !data.title_ar) return; // Don't save empty blogs
    
    setIsSaving(true);
    try {
      await saveBlog('draft');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  const calculateReadingTime = (blocks: Block[]): number => {
    const text = blocksToMarkdown(blocks);
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  const saveBlog = async (status: string = 'draft') => {
    try {
      // Validate scheduled_at if provided
      if (data.scheduled_at && new Date(data.scheduled_at) <= new Date()) {
        toast({
          title: 'Invalid Schedule',
          description: 'Scheduled date must be in the future',
          variant: 'destructive',
        });
        return false;
      }

      // Sync blocks to content fields for search/indexing
      const content_en = data.blocks_en.length > 0 ? blocksToMarkdown(data.blocks_en) : data.content_en;
      const content_ar = data.blocks_ar.length > 0 ? blocksToMarkdown(data.blocks_ar) : data.content_ar;
      
      // Calculate reading time from blocks
      const reading_time_minutes = calculateReadingTime(data.blocks_en.length > 0 ? data.blocks_en : data.blocks_ar);

      const blogData: any = {
        title_en: data.title_en,
        title_ar: data.title_ar,
        slug: data.slug,
        excerpt_en: data.excerpt_en,
        excerpt_ar: data.excerpt_ar,
        content_en,
        content_ar,
        blocks_en: data.blocks_en as any,
        blocks_ar: data.blocks_ar as any,
        category: data.category,
        tags: data.tags,
        featured_image_url: data.featured_image_url,
        seo_title_en: data.seo_title_en,
        seo_title_ar: data.seo_title_ar,
        seo_description_en: data.seo_description_en,
        seo_description_ar: data.seo_description_ar,
        seo_keywords: data.seo_keywords,
        author_name: data.author_name,
        reading_time_minutes,
        status,
        published_at: status === 'published' && !data.published_at ? new Date().toISOString() : data.published_at,
        scheduled_at: data.scheduled_at,
      };

      if (data.id) {
        const { error } = await supabase
          .from('blogs')
          .update(blogData)
          .eq('id', data.id);

        if (error) throw error;
      } else {
        const { data: newBlog, error } = await supabase
          .from('blogs')
          .insert([blogData])
          .select()
          .single();

        if (error) throw error;
        setData(prev => ({ ...prev, id: newBlog.id }));
      }

      setHasUnsavedChanges(false);
      
      toast({
        title: 'Success',
        description: `Blog ${status === 'published' ? 'published' : 'saved'} successfully`,
      });

      return true;
    } catch (error) {
      console.error('Error saving blog:', error);
      toast({
        title: 'Error',
        description: 'Failed to save blog post',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
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
  };
};
