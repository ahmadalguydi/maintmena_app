import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CheckCircle, Eye, Trash2 } from "lucide-react";
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface BlogWithValidation extends ParsedBlog {
  validation: ValidationResult;
  isDuplicate: boolean;
}

interface BulkImportPreviewProps {
  blogs: ParsedBlog[];
  existingSlugs: string[];
  onImport: (blogsToImport: ParsedBlog[]) => void;
  onCancel: () => void;
}

export const BulkImportPreview = ({ blogs, existingSlugs, onImport, onCancel }: BulkImportPreviewProps) => {
  const [selectedBlogs, setSelectedBlogs] = React.useState<Set<number>>(
    new Set(blogs.map((_, i) => i))
  );

  const blogsWithValidation: BlogWithValidation[] = blogs.map(blog => ({
    ...blog,
    validation: validateBlog(blog),
    isDuplicate: existingSlugs.includes(blog.metadata.slug)
  }));

  const validCount = blogsWithValidation.filter(b => b.validation.valid && !b.isDuplicate).length;
  const errorCount = blogsWithValidation.filter(b => !b.validation.valid).length;
  const warningCount = blogsWithValidation.filter(b => b.isDuplicate || b.validation.warnings.length > 0).length;

  const toggleBlog = (index: number) => {
    const newSelected = new Set(selectedBlogs);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedBlogs(newSelected);
  };

  const removeBlog = (index: number) => {
    const newSelected = new Set(selectedBlogs);
    newSelected.delete(index);
    setSelectedBlogs(newSelected);
  };

  const handleImport = () => {
    const blogsToImport = blogs.filter((_, i) => selectedBlogs.has(i));
    onImport(blogsToImport);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Import Preview</h3>
          <p className="text-sm text-muted-foreground">
            {blogs.length} blog{blogs.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {validCount} Valid
          </Badge>
          {warningCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              {warningCount} Warnings
            </Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              {errorCount} Errors
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="max-h-[50vh] min-h-[200px] rounded-md border p-4">
        <Accordion type="single" collapsible className="space-y-2">
          {blogsWithValidation.map((blog, index) => {
            const hasErrors = !blog.validation.valid;
            const hasWarnings = blog.isDuplicate || blog.validation.warnings.length > 0;
            const isSelected = selectedBlogs.has(index);

            return (
              <AccordionItem key={index} value={`blog-${index}`}>
                <Card className={`p-3 md:p-4 ${!isSelected ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-2 md:gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBlog(index)}
                      className="mt-1 cursor-pointer disabled:cursor-not-allowed"
                      disabled={hasErrors}
                      title={hasErrors ? 'Cannot select blog with errors' : undefined}
                    />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {hasErrors ? (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            ) : hasWarnings ? (
                              <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            <span className="font-medium truncate">
                              {blog.metadata.title_en || 'Untitled'}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1 md:gap-2 text-xs text-muted-foreground">
                            <span>{blog.blocks_en.length} blocks</span>
                            <span className="hidden md:inline">•</span>
                            <span className="hidden md:inline">Status: {blog.metadata.status || 'draft'}</span>
                            <span className="hidden md:inline">•</span>
                            <span className="truncate max-w-[200px]">Slug: {blog.metadata.slug}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <AccordionTrigger className="p-2 hover:bg-accent rounded-md transition-colors [&[data-state=open]>svg]:rotate-180">
                            <Eye className="h-4 w-4" />
                          </AccordionTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlog(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {(hasErrors || hasWarnings) && (
                        <div className="space-y-1">
                          {blog.validation.errors.map((error, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{error}</span>
                            </div>
                          ))}
                          {blog.isDuplicate && (
                            <div className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>Slug already exists in database</span>
                            </div>
                          )}
                          {blog.validation.warnings.map((warning, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <AccordionContent>
                        <div className="mt-4 space-y-3 border-t pt-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Content Blocks</h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {blog.blocks_en.map((block, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-xs">
                                    {block.type}
                                  </Badge>
                                  {block.type === 'heading' && <span className="ml-2 truncate inline-block max-w-[300px]">{block.content.text}</span>}
                                  {block.type === 'paragraph' && (
                                    <span className="ml-2 truncate inline-block max-w-[300px]">{block.content.text?.substring(0, 50)}...</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">Metadata</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Category:</span>{' '}
                                {blog.metadata.category}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Author:</span>{' '}
                                {blog.metadata.author_name || 'MaintMENA Team'}
                              </div>
                              {blog.metadata.tags && (
                                <div className="col-span-1 md:col-span-2">
                                  <span className="text-muted-foreground">Tags:</span>{' '}
                                  {blog.metadata.tags.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </div>
                  </div>
                </Card>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedBlogs.size} of {blogs.length} selected for import
        </p>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedBlogs.size === 0}
            className="flex-1 sm:flex-none"
          >
            Import {selectedBlogs.size} Blog{selectedBlogs.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

function validateBlog(blog: ParsedBlog): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!blog.metadata.title_en) errors.push('Missing required field: title_en');
  if (!blog.metadata.slug) errors.push('Missing required field: slug');
  if (!blog.metadata.category) errors.push('Missing required field: category');
  if (!blog.metadata.excerpt_en) errors.push('Missing required field: excerpt_en');

  // Slug format validation
  const slug = blog.metadata.slug;
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug must be lowercase with hyphens only (no spaces or special characters)');
  }

  // Status validation
  const status = blog.metadata.status;
  if (status && !['draft', 'published'].includes(status)) {
    errors.push('Status must be "draft" or "published"');
  }

  // Image URL validation
  const featuredImage = blog.metadata.featured_image_url;
  if (featuredImage && !featuredImage.startsWith('https://')) {
    errors.push('Featured image must be a valid HTTPS URL');
  }

  // Scheduled date validation
  if (blog.metadata.scheduled_at) {
    const scheduledDate = new Date(blog.metadata.scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Invalid scheduled_at date format');
    } else if (scheduledDate < new Date()) {
      warnings.push('Scheduled date is in the past');
    }
  }

  // Content warnings
  if (blog.blocks_en.length === 0) {
    warnings.push('No content blocks found');
  }

  if (!blog.metadata.seo_title_en) {
    warnings.push('Missing SEO title (will use main title)');
  }

  if (!blog.metadata.seo_description_en) {
    warnings.push('Missing SEO description (will use excerpt)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Add React import
import React from 'react';
