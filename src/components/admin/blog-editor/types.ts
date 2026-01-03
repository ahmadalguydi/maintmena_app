export type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'list' 
  | 'image' 
  | 'table' 
  | 'checklist' 
  | 'callout' 
  | 'stats' 
  | 'divider'
  | 'quote';

export interface Block {
  id: string;
  type: BlockType;
  content: BlockContent;
}

export interface BlockContent {
  // Text blocks
  text?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  listItems?: string[];
  ordered?: boolean;
  
  // Image blocks
  imageUrl?: string;
  altText?: string;
  caption?: string;
  
  // Table blocks
  headers?: string[];
  rows?: string[][];
  
  // Checklist blocks
  items?: { id: string; text: string; checked: boolean }[];
  
  // Callout blocks
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  
  // Stats blocks
  value?: string;
  label?: string;
  icon?: string;
  
  // Quote blocks
  quote?: string;
  author?: string;
}

export interface BlogEditorData {
  id?: string;
  title_en: string;
  title_ar: string;
  slug: string;
  excerpt_en: string;
  excerpt_ar: string;
  content_en: string;
  content_ar: string;
  blocks_en: Block[];
  blocks_ar: Block[];
  category: string;
  tags: string[];
  featured_image_url: string;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  seo_keywords: string;
  author_name: string;
  status: string;
  published_at?: string;
  scheduled_at?: string | null;
}

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  readingTime: number;
  seoScore: number;
}
