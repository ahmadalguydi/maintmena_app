# Markdown Import Guide for Blog Editor

## Overview

The blog editor supports importing content from Markdown files, allowing you to quickly create blog posts from existing markdown content or write in your preferred markdown editor and import the results.

## Table of Contents

1. [Single Blog Import](#single-blog-import)
2. [Bulk Blog Import](#bulk-blog-import)
3. [Supported Markdown Syntax](#supported-markdown-syntax)
4. [Frontmatter Fields](#frontmatter-fields)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Single Blog Import

### How to Use

1. Navigate to the Blog Editor (create or edit a blog post)
2. In the Content Blocks section, click "Import Markdown"
3. Either:
   - Paste your markdown content directly
   - Upload a `.md` file using the file picker
4. Click "Generate Preview" to see how your content will be converted to blocks
5. Review the preview and click "Import Blocks" to add them to your blog

### Example

```markdown
# Introduction to Home Maintenance

Regular home maintenance is essential for preserving property value and ensuring safety.

## Why Maintenance Matters

- Prevents costly repairs
- Maintains property value
- Ensures safety

![Maintenance](https://example.com/image.jpg "Home maintenance tools")

> "A stitch in time saves nine" - this old adage is especially true for home maintenance.
-- Benjamin Franklin

## Common Tasks

1. Inspect HVAC systems quarterly
2. Check plumbing for leaks
3. Clean gutters seasonally
```

---

## Bulk Blog Import

For importing multiple blog posts at once, use the Bulk Import feature in the Blog Manager.

### Format

Each blog must include:
1. **Frontmatter** (metadata in YAML format between `---` markers)
2. **Content** (markdown body)
3. **Separator** (`---BLOG---` between multiple blogs)

### Example Format

```markdown
---
title_en: "The Hidden Costs of Delayed Maintenance"
title_ar: "التكاليف الخفية للصيانة المتأخرة"
slug: "hidden-costs-delayed-maintenance"
excerpt_en: "Discover why postponing small repairs can lead to expensive problems"
excerpt_ar: "اكتشف لماذا يمكن أن يؤدي تأجيل الإصلاحات الصغيرة إلى مشاكل باهظة"
category: "Home Maintenance"
tags: ["maintenance", "cost-savings", "prevention"]
author_name: "MaintMENA Team"
featured_image_url: "https://images.unsplash.com/photo-1581578731548-c6469cc6952"
seo_title_en: "Hidden Costs of Delayed Home Maintenance | MaintMENA"
seo_description_en: "Learn about the expensive consequences of postponing home repairs and how to avoid them"
seo_keywords: "home maintenance, delayed repairs, maintenance costs"
status: "draft"
---

# The Hidden Costs of Delayed Maintenance

Small issues become big problems when ignored...

## Early Detection Saves Money

- Catch problems early
- Prevent water damage
- Avoid structural issues

---BLOG---

---
title_en: "Seasonal Maintenance Checklist"
title_ar: "قائمة الصيانة الموسمية"
slug: "seasonal-maintenance-checklist"
category: "Guides"
tags: ["checklist", "seasonal", "preventive"]
status: "draft"
---

# Your Seasonal Maintenance Checklist

Stay on top of home maintenance throughout the year...
```

---

## Supported Markdown Syntax

### Headings

All heading levels (H1-H6) are supported:

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

**Converts to:** Heading blocks with appropriate levels

---

### Paragraphs

Regular text automatically becomes paragraph blocks:

```markdown
This is a simple paragraph of text.

This is another paragraph after a blank line.
```

**Converts to:** Paragraph blocks

---

### Lists

#### Unordered Lists

```markdown
- First item
- Second item
- Third item
```

or

```markdown
* First item
* Second item
* Third item
```

**Converts to:** List block (unordered)

#### Ordered Lists

```markdown
1. First step
2. Second step
3. Third step
```

**Converts to:** List block (ordered)

---

### Checklists

```markdown
- [ ] Incomplete task
- [x] Completed task
- [ ] Another incomplete task
```

**Converts to:** Checklist block with items marked as checked/unchecked

---

### Images

```markdown
![Alt text](https://example.com/image.jpg)
![Alt text](https://example.com/image.jpg "Optional caption")
```

**Converts to:** Image block with URL, alt text, and optional caption

**Note:** Images should be hosted externally (use services like Unsplash, your CDN, or Supabase Storage)

---

### Blockquotes

```markdown
> This is a quote
> spanning multiple lines

-- Author Name
```

**Converts to:** Quote block
- Lines starting with `>` become the quote text
- Line starting with `--` becomes the author (optional)

---

### Tables

```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |
| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |
```

**Converts to:** Table block with headers and rows

---

### Code Blocks

```markdown
```
function example() {
  return "code here";
}
```
```

**Converts to:** Callout block with type "info" and title "Code"

---

### Horizontal Rules

```markdown
---
```

**Converts to:** Divider block

---

## Frontmatter Fields

### Required Fields

- `title_en` (string): English title
- `slug` (string): URL-friendly identifier (auto-generated from title if omitted)
- `category` (string): Blog category
- `status` (string): `"draft"` or `"published"`

### Optional Fields

- `title_ar` (string): Arabic title (defaults to title_en)
- `excerpt_en` (string): English excerpt/summary
- `excerpt_ar` (string): Arabic excerpt
- `tags` (array): Array of tags, e.g., `["tag1", "tag2"]`
- `author_name` (string): Author name (defaults to "MaintMENA Team")
- `featured_image_url` (string): URL to featured image
- `seo_title_en` (string): SEO title for English (defaults to title_en)
- `seo_title_ar` (string): SEO title for Arabic
- `seo_description_en` (string): Meta description for English
- `seo_description_ar` (string): Meta description for Arabic
- `seo_keywords` (string): Comma-separated keywords
- `content_ar` (string): If you want separate Arabic content, include it here

### Field Formats

```yaml
# String fields
title_en: "Your Title Here"

# Array fields (use square brackets with quoted items)
tags: ["maintenance", "tips", "guide"]

# Status must be either "draft" or "published"
status: "draft"

# URLs should be complete with protocol
featured_image_url: "https://example.com/image.jpg"
```

---

## Best Practices

### 1. Image Hosting

**Do:**
- Host images on reliable CDN services (Cloudinary, Imgix, Unsplash)
- Use Supabase Storage for uploaded images
- Use descriptive alt text for SEO and accessibility

**Don't:**
- Use local file paths (won't work in markdown import)
- Use images from sites that require authentication

### 2. SEO Optimization

**Title Best Practices:**
- Keep meta titles between 30-60 characters
- Include primary keyword near the beginning
- Make titles compelling and click-worthy

**Description Best Practices:**
- Keep meta descriptions between 120-160 characters
- Include target keywords naturally
- Write compelling copy that encourages clicks

**Keywords:**
- Include 3-5 relevant keywords
- Use comma-separated format
- Focus on long-tail keywords for better targeting

### 3. Translation Workflow

**Option 1: Separate Content**
```yaml
---
title_en: "English Title"
title_ar: "العنوان العربي"
content_ar: "المحتوى العربي هنا..."
---

English content here...
```

**Option 2: Use Translation Helper**
- Import English content first
- Use the Translation Helper in the editor to generate Arabic translations
- Review and adjust translations for accuracy

### 4. Content Structure

**Good Structure:**
```markdown
# Main Title (H1 - use once)

Brief introduction paragraph.

## Section 1 (H2)

Content for section 1...

### Subsection 1.1 (H3)

Detailed content...

## Section 2

More content...
```

**Avoid:**
- Skipping heading levels (H1 → H3 without H2)
- Multiple H1 headings
- Very long paragraphs (break them up)

### 5. Lists and Checklists

**Use lists for:**
- Sequential steps
- Feature lists
- Benefits and advantages

**Use checklists for:**
- Action items
- Maintenance tasks
- Requirements

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Failed to parse markdown"

**Causes:**
- Malformed tables (unequal columns)
- Unclosed code blocks
- Invalid frontmatter YAML

**Solutions:**
- Check table column counts match headers
- Ensure all code blocks have closing ``` 
- Validate YAML syntax in frontmatter

---

#### Issue: "Images not displaying"

**Causes:**
- Invalid image URLs
- Images behind authentication
- CORS issues

**Solutions:**
- Use direct image URLs (not webpage URLs)
- Host images on public CDNs
- Use Unsplash or upload to Supabase Storage

---

#### Issue: "Missing required fields"

**Causes:**
- Incomplete frontmatter
- Misspelled field names

**Solutions:**
- Include all required fields: `title_en`, `slug`, `category`, `status`
- Double-check field name spelling (case-sensitive)

---

#### Issue: "Blocks not rendering correctly"

**Causes:**
- Missing blank lines between blocks
- Incorrect markdown syntax

**Solutions:**
- Add blank line after each block type
- Review markdown syntax examples above
- Test with simple content first

---

#### Issue: "Bulk import creating wrong content"

**Causes:**
- Missing `---BLOG---` separators
- Frontmatter not properly closed with `---`

**Solutions:**
- Ensure each blog section has frontmatter between `---` markers
- Use `---BLOG---` exactly (case-sensitive) to separate multiple blogs
- Test with single blog first before bulk importing

---

## Example Templates

### Basic Blog Template

```markdown
---
title_en: "Your Blog Title"
title_ar: "عنوان المدونة"
slug: "your-blog-slug"
excerpt_en: "A brief description of your blog post"
category: "Home Maintenance"
tags: ["tag1", "tag2"]
author_name: "Your Name"
status: "draft"
---

# Your Blog Title

Introduction paragraph that hooks the reader...

## Main Section

Content with lists:

- Point 1
- Point 2
- Point 3

## Another Section

More detailed content...

### Subsection

Even more details...

## Conclusion

Wrap up your post...
```

### Blog with Images and Quotes

```markdown
---
title_en: "Visual Maintenance Guide"
slug: "visual-maintenance-guide"
category: "Guides"
tags: ["visual", "guide", "maintenance"]
featured_image_url: "https://images.unsplash.com/photo-example"
status: "draft"
---

# Visual Maintenance Guide

![Main inspection image](https://example.com/image1.jpg "Annual home inspection")

## Expert Advice

> "Regular inspections are the foundation of good home maintenance"
-- John Smith, Home Inspector

## Inspection Checklist

- [ ] Check roof for damage
- [ ] Inspect foundation
- [ ] Test smoke detectors
- [x] Clean gutters

![Gutter cleaning](https://example.com/image2.jpg)
```

---

## Additional Resources

- **Markdown Guide**: [https://www.markdownguide.org/](https://www.markdownguide.org/)
- **YAML Syntax**: [https://yaml.org/](https://yaml.org/)
- **SEO Best Practices**: Review the SEO panel in the blog editor
- **Image Hosting**: Use Supabase Storage or services like Unsplash

---

## Need Help?

If you encounter issues not covered in this guide:

1. Test with minimal content first
2. Check the browser console for errors
3. Verify your markdown syntax
4. Ensure frontmatter is properly formatted
5. Contact support with specific error messages

---

**Version**: 1.0  
**Last Updated**: 2025-11-19