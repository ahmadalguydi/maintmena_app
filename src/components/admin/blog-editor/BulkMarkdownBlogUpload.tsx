import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseMarkdownToBlocks, blocksToMarkdown } from "@/utils/markdownParser";
import { Upload, CheckCircle, XCircle, BookOpen, FileUp } from "lucide-react";
import { BulkImportPreview } from "./BulkImportPreview";
import { Block } from "./types";

interface ParsedBlog {
  metadata: {
    title_en: string;
    title_ar?: string;
    slug: string;
    excerpt_en: string;
    excerpt_ar?: string;
    category: string;
    tags?: string[];
    author_name?: string;
    featured_image_url?: string;
    seo_title_en?: string;
    seo_title_ar?: string;
    seo_description_en?: string;
    seo_description_ar?: string;
    seo_keywords?: string;
    status?: string;
    scheduled_at?: string;
  };
  content_en: string;
  content_ar?: string;
  blocks_en: Block[];
  blocks_ar: Block[];
}

interface BulkMarkdownBlogUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkMarkdownBlogUpload = ({ onClose, onSuccess }: BulkMarkdownBlogUploadProps) => {
  const [markdownContent, setMarkdownContent] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentStep, setCurrentStep] = React.useState<'parsing' | 'validating' | 'importing'>('parsing');
  const [currentBlog, setCurrentBlog] = React.useState(0);
  const [totalBlogs, setTotalBlogs] = React.useState(0);
  const [showPreview, setShowPreview] = React.useState(false);
  const [parsedBlogs, setParsedBlogs] = React.useState<ParsedBlog[]>([]);
  const [existingSlugs, setExistingSlugs] = React.useState<string[]>([]);
  const [results, setResults] = React.useState<{
    success: number;
    failed: number;
    items: Array<{ title: string; status: 'success' | 'error'; message: string; details?: string }>;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseFrontmatter = (content: string): { metadata: any; body: string } => {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      return { metadata: {}, body: content };
    }

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2];
    const metadata: any = {};
    const lines = frontmatter.split('\n');
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        
        // Handle arrays (tags)
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            metadata[key.trim()] = JSON.parse(value);
          } catch {
            metadata[key.trim()] = value;
          }
        } 
        // Handle date fields
        else if (key.trim() === 'scheduled_at' || key.trim() === 'published_at') {
          const dateValue = value.replace(/^["']|["']$/g, '');
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            metadata[key.trim()] = date.toISOString();
          }
        }
        else {
          metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    }

    return { metadata, body };
  };

  const parseBlogs = (content: string): ParsedBlog[] => {
    const blogs: ParsedBlog[] = [];
    const sections = content.split('---BLOG---').filter(s => s.trim());

    sections.forEach(section => {
      const { metadata, body } = parseFrontmatter(section.trim());

      // Parse English blocks
      const blocks_en = parseMarkdownToBlocks(body, { language: 'en' });

      // Parse Arabic content if provided
      let blocks_ar: Block[] = [];
      if (metadata.content_ar) {
        blocks_ar = parseMarkdownToBlocks(metadata.content_ar, { language: 'ar' });
      }

      blogs.push({
        metadata: {
          title_en: metadata.title_en || '',
          title_ar: metadata.title_ar || metadata.title_en || '',
          slug: metadata.slug || '',
          excerpt_en: metadata.excerpt_en || '',
          excerpt_ar: metadata.excerpt_ar || metadata.excerpt_en || '',
          category: metadata.category || '',
          tags: Array.isArray(metadata.tags) ? metadata.tags : [],
          author_name: metadata.author_name || 'MaintMENA Team',
          featured_image_url: metadata.featured_image_url || null,
          seo_title_en: metadata.seo_title_en || metadata.title_en,
          seo_title_ar: metadata.seo_title_ar || metadata.title_ar,
          seo_description_en: metadata.seo_description_en || metadata.excerpt_en,
          seo_description_ar: metadata.seo_description_ar || metadata.excerpt_ar,
          seo_keywords: metadata.seo_keywords || '',
          status: metadata.status || 'draft',
          scheduled_at: metadata.scheduled_at || null,
        },
        content_en: body,
        content_ar: metadata.content_ar || body,
        blocks_en,
        blocks_ar: blocks_ar.length > 0 ? blocks_ar : blocks_en,
      });
    });

    return blogs;
  };

  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return Math.max(1, minutes);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setMarkdownContent(content);
        toast.success('Markdown file loaded successfully');
      };
      reader.readAsText(file);
    } else {
      toast.error('Please upload a .md file');
    }
  };

  const handlePreview = async () => {
    if (!markdownContent.trim()) {
      toast.error('Please enter markdown content');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('parsing');
    setProgress(20);

    try {
      const blogs = parseBlogs(markdownContent);
      
      if (blogs.length === 0) {
        toast.error('No valid blogs found in the content');
        setIsProcessing(false);
        return;
      }

      setProgress(50);
      setCurrentStep('validating');

      // Check for duplicate slugs in database
      const slugs = blogs.map(b => b.metadata.slug).filter(Boolean);
      const { data: existingBlogsData } = await supabase
        .from('blogs')
        .select('slug')
        .in('slug', slugs);

      setExistingSlugs(existingBlogsData?.map(b => b.slug) || []);
      setParsedBlogs(blogs);
      setProgress(100);
      setShowPreview(true);
      
      toast.success(`${blogs.length} blog${blogs.length !== 1 ? 's' : ''} parsed successfully`);
    } catch (error) {
      console.error('Error parsing blogs:', error);
      toast.error('Failed to parse markdown content');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImport = async (blogsToImport: ParsedBlog[]) => {
    setShowPreview(false);
    setIsProcessing(true);
    setCurrentStep('importing');
    setProgress(0);
    setTotalBlogs(blogsToImport.length);

    try {
      const results = {
        success: 0,
        failed: 0,
        items: [] as Array<{ title: string; status: 'success' | 'error'; message: string; details?: string }>,
      };

      for (let i = 0; i < blogsToImport.length; i++) {
        const blog = blogsToImport[i];
        setCurrentBlog(i + 1);
        setProgress(((i + 1) / blogsToImport.length) * 100);

        try {
          // Calculate reading time from blocks
          const readingTime = calculateReadingTime(blocksToMarkdown(blog.blocks_en));

          // Convert blocks to markdown for content fields
          const contentEnFromBlocks = blocksToMarkdown(blog.blocks_en);
          const contentArFromBlocks = blog.blocks_ar.length > 0 
            ? blocksToMarkdown(blog.blocks_ar) 
            : contentEnFromBlocks;

          const { error } = await supabase.from('blogs').insert({
            title_en: blog.metadata.title_en,
            title_ar: blog.metadata.title_ar || blog.metadata.title_en,
            slug: blog.metadata.slug,
            excerpt_en: blog.metadata.excerpt_en,
            excerpt_ar: blog.metadata.excerpt_ar || blog.metadata.excerpt_en,
            content_en: contentEnFromBlocks,
            content_ar: contentArFromBlocks,
            blocks_en: blog.blocks_en as any,
            blocks_ar: (blog.blocks_ar.length > 0 ? blog.blocks_ar : blog.blocks_en) as any,
            category: blog.metadata.category,
            tags: blog.metadata.tags || [],
            author_name: blog.metadata.author_name || 'MaintMENA Team',
            featured_image_url: blog.metadata.featured_image_url || null,
            seo_title_en: blog.metadata.seo_title_en || blog.metadata.title_en,
            seo_title_ar: blog.metadata.seo_title_ar || blog.metadata.title_ar || blog.metadata.title_en,
            seo_description_en: blog.metadata.seo_description_en || blog.metadata.excerpt_en,
            seo_description_ar: blog.metadata.seo_description_ar || blog.metadata.excerpt_ar || blog.metadata.excerpt_en,
            seo_keywords: blog.metadata.seo_keywords || '',
            status: blog.metadata.status || 'draft',
            reading_time_minutes: readingTime,
            scheduled_at: blog.metadata.scheduled_at || null,
          });

          if (error) throw error;

          results.success++;
          results.items.push({
            title: blog.metadata.title_en || 'Untitled',
            status: 'success',
            message: 'Created successfully',
          });
        } catch (error: any) {
          console.error('Error creating blog:', error);
          results.failed++;
          
          let errorMessage = 'Failed to create';
          
          if (error.message?.includes('duplicate key')) {
            errorMessage = 'Slug already exists in database';
          } else if (error.message?.includes('null value')) {
            errorMessage = 'Missing required field';
          } else if (error.message?.includes('foreign key')) {
            errorMessage = 'Invalid category or author';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          results.items.push({
            title: blog.metadata.title_en || 'Untitled',
            status: 'error',
            message: errorMessage,
            details: error.message,
          });
        }
      }

      setResults(results);
      
      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} blog${results.success !== 1 ? 's' : ''}`);
        onSuccess();
      }
      
      if (results.failed > 0) {
        toast.error(`Failed to import ${results.failed} blog${results.failed !== 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Error processing import:', error);
      toast.error(error.message || 'Failed to import blogs');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setMarkdownContent('');
    setResults(null);
    setProgress(0);
    setShowPreview(false);
    setParsedBlogs([]);
    setExistingSlugs([]);
    setCurrentStep('parsing');
    setCurrentBlog(0);
    setTotalBlogs(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (showPreview) {
    return (
      <div className="space-y-4">
        <BulkImportPreview
          blogs={parsedBlogs}
          existingSlugs={existingSlugs}
          onImport={handleImport}
          onCancel={() => setShowPreview(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Upload a markdown file or paste content with blogs separated by <code className="bg-muted px-1 rounded">---BLOG---</code>
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <FileUp className="h-4 w-4" />
          Upload .md File
        </Button>
        <Button
          variant="outline"
          asChild
          className="gap-2"
        >
          <a
            href="/MARKDOWN_IMPORT_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen className="h-4 w-4" />
            View Import Guide
          </a>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <Textarea
        value={markdownContent}
        onChange={(e) => setMarkdownContent(e.target.value)}
        placeholder="Paste your markdown content here or upload a file..."
        className="min-h-[200px] md:min-h-[300px] font-mono text-sm"
        disabled={isProcessing}
      />

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {currentStep === 'parsing' && '📝 Parsing markdown content...'}
              {currentStep === 'validating' && '✓ Validating blogs and checking duplicates...'}
              {currentStep === 'importing' && `💾 Importing blog ${currentBlog} of ${totalBlogs}...`}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {results.success} Successful
            </Badge>
            {results.failed > 0 && (
              <Badge variant="outline" className="gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                {results.failed} Failed
              </Badge>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
            {results.items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50"
              >
                {item.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.message}</div>
                  {item.details && item.status === 'error' && (
                    <div className="text-xs text-red-500 mt-1 font-mono">
                      {item.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
        <div className="font-medium">⚡ Markdown Features Supported:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>• Headings (# to ######) → Heading blocks</div>
          <div>• Tables (| | |) → Table blocks</div>
          <div>• Lists (-, 1.) → List blocks</div>
          <div>• Checklists (- [ ]) → Checklist blocks</div>
          <div>• Images (![alt](url)) → Image blocks</div>
          <div>• Quotes (&gt; text) → Quote blocks</div>
          <div>• Code (```) → Callout blocks</div>
          <div>• Dividers (---) → Divider blocks</div>
        </div>

        <div className="pt-2 border-t">
          <div className="font-medium mb-2">Example Format:</div>
          <pre className="text-xs overflow-x-auto bg-background p-3 rounded">
{`---
title_en: "Complete Guide to Home Maintenance"
title_ar: "الدليل الكامل لصيانة المنزل"
slug: "complete-home-maintenance-guide"
excerpt_en: "Everything you need to know"
excerpt_ar: "كل ما تحتاج لمعرفته"
category: "Guides"
tags: ["maintenance", "guide"]
author_name: "MaintMENA Team"
featured_image_url: "https://images.unsplash.com/..."
seo_title_en: "Complete Home Maintenance Guide 2024"
seo_description_en: "Comprehensive guide..."
seo_keywords: "home maintenance, property care"
status: "draft"
scheduled_at: "2024-12-31T10:00:00Z"
---

# Complete Guide to Home Maintenance

This guide will transform your approach.

## Why Regular Maintenance Matters

- **Cost Savings**: Prevent expensive repairs
- **Property Value**: Maintain home value
- **Safety**: Identify hazards early

## Seasonal Checklist

- [ ] Spring: Inspect roof
- [x] Summer: Service HVAC
- [ ] Fall: Weatherproof windows

## Maintenance Schedule

| Task | Frequency | Cost |
|------|-----------|------|
| HVAC | Quarterly | 200-400 SAR |
| Plumbing | Bi-annual | 150-300 SAR |

![Tools](https://images.unsplash.com/... "Essential tools")

> "Prevention is better than cure"
-- Benjamin Franklin

---BLOG---

(Next blog with frontmatter...)`}
          </pre>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1 sm:flex-none">
          Cancel
        </Button>
        <Button
          onClick={handlePreview}
          disabled={!markdownContent.trim() || isProcessing}
          className="gap-2 flex-1 sm:flex-none"
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Preview Blogs
            </>
          )}
        </Button>
        {results && (
          <Button onClick={handleReset} variant="outline" className="flex-1 sm:flex-none">
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};
