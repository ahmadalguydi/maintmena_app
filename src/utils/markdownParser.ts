import { Block } from '@/components/admin/blog-editor/types';

export interface MarkdownParseOptions {
  language: 'en' | 'ar';
}

/**
 * Parses markdown content and converts it to blog blocks
 */
export const parseMarkdownToBlocks = (markdown: string, options: MarkdownParseOptions = { language: 'en' }): Block[] => {
  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // Headings (# ## ### etc)
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 2;
      const text = line.replace(/^#+\s*/, '');
      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'heading',
        content: {
          text,
          level: Math.min(level, 6) as 1 | 2 | 3 | 4 | 5 | 6,
        },
      });
      i++;
      continue;
    }

    // Horizontal rule (---)
    if (line.match(/^---+$/)) {
      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'divider',
        content: {},
      });
      i++;
      continue;
    }

    // Images (![alt](url "caption"))
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)"]+)(?:\s+"([^"]*)")?\)/);
    if (imageMatch) {
      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'image',
        content: {
          imageUrl: imageMatch[2],
          altText: imageMatch[1] || '',
          caption: imageMatch[3] || '',
        },
      });
      i++;
      continue;
    }

    // Blockquotes (> text)
    if (line.startsWith('>')) {
      let quote = line.replace(/^>\s*/, '');
      let author = '';
      i++;

      // Collect multi-line quotes
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote += '\n' + lines[i].trim().replace(/^>\s*/, '');
        i++;
      }

      // Check for author on next line (-- Author)
      if (i < lines.length && lines[i].trim().startsWith('--')) {
        author = lines[i].trim().replace(/^--\s*/, '');
        i++;
      }

      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'quote',
        content: {
          quote,
          author,
        },
      });
      continue;
    }

    // Code blocks (```)
    if (line.startsWith('```')) {
      let text = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        text += lines[i] + '\n';
        i++;
      }
      i++; // Skip closing ```

      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'callout',
        content: {
          calloutType: 'info',
          title: 'Code',
          text: text.trim(),
        },
      });
      continue;
    }

    // Tables (|Header|Header|)
    if (line.startsWith('|')) {
      const headers = line
        .split('|')
        .filter(h => h.trim())
        .map(h => h.trim());
      
      i++; // Skip separator line (|---|---|)
      if (i < lines.length && lines[i].includes('---')) {
        i++;
      }

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i]
          .split('|')
          .filter(c => c.trim())
          .map(c => c.trim());
        rows.push(row);
        i++;
      }

      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'table',
        content: {
          headers,
          rows,
        },
      });
      continue;
    }

    // Unordered lists (- item or * item)
    if (line.match(/^[-*]\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*]\s+/)) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }

      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'list',
        content: {
          listItems,
          ordered: false,
        },
      });
      continue;
    }

    // Ordered lists (1. item)
    if (line.match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }

      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'list',
        content: {
          listItems,
          ordered: true,
        },
      });
      continue;
    }

    // Checklists (- [ ] item or - [x] item)
    if (line.match(/^-\s+\[([ x])\]\s+/)) {
      const items: { id: string; text: string; checked: boolean }[] = [];
      while (i < lines.length && lines[i].trim().match(/^-\s+\[([ x])\]\s+/)) {
        const match = lines[i].trim().match(/^-\s+\[([ x])\]\s+(.+)/);
        if (match) {
          items.push({
            id: `item-${Date.now()}-${Math.random()}`,
            text: match[2],
            checked: match[1] === 'x',
          });
        }
        i++;
      }

      blocks.push({
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'checklist',
        content: {
          items,
        },
      });
      continue;
    }

    // Regular paragraphs
    let text = line;
    i++;
    // Collect multi-line paragraphs
    while (i < lines.length && lines[i].trim() && !isSpecialLine(lines[i])) {
      text += '\n' + lines[i].trim();
      i++;
    }

    blocks.push({
      id: `block-${Date.now()}-${Math.random()}`,
      type: 'paragraph',
      content: {
        text,
      },
    });
  }

  return blocks;
};

/**
 * Converts blocks back to markdown format
 */
export const blocksToMarkdown = (blocks: Block[]): string => {
  const markdown: string[] = [];

  blocks.forEach(block => {
    switch (block.type) {
      case 'heading':
        const level = block.content.level || 2;
        markdown.push(`${'#'.repeat(level)} ${block.content.text || ''}`);
        markdown.push('');
        break;

      case 'paragraph':
        markdown.push(block.content.text || '');
        markdown.push('');
        break;

      case 'list':
        const items = block.content.listItems || [];
        items.forEach((item, index) => {
          if (block.content.ordered) {
            markdown.push(`${index + 1}. ${item}`);
          } else {
            markdown.push(`- ${item}`);
          }
        });
        markdown.push('');
        break;

      case 'checklist':
        const checkItems = block.content.items || [];
        checkItems.forEach(item => {
          markdown.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`);
        });
        markdown.push('');
        break;

      case 'image':
        const caption = block.content.caption ? ` "${block.content.caption}"` : '';
        markdown.push(`![${block.content.altText || ''}](${block.content.imageUrl || ''}${caption})`);
        markdown.push('');
        break;

      case 'quote':
        const quoteLines = (block.content.quote || '').split('\n');
        quoteLines.forEach(line => {
          markdown.push(`> ${line}`);
        });
        if (block.content.author) {
          markdown.push(`-- ${block.content.author}`);
        }
        markdown.push('');
        break;

      case 'table':
        const headers = block.content.headers || [];
        const rows = block.content.rows || [];
        
        if (headers.length > 0) {
          markdown.push(`| ${headers.join(' | ')} |`);
          markdown.push(`| ${headers.map(() => '---').join(' | ')} |`);
          rows.forEach(row => {
            markdown.push(`| ${row.join(' | ')} |`);
          });
          markdown.push('');
        }
        break;

      case 'callout':
        markdown.push('```');
        if (block.content.title) {
          markdown.push(block.content.title);
        }
        if (block.content.text) {
          markdown.push(block.content.text);
        }
        markdown.push('```');
        markdown.push('');
        break;

      case 'divider':
        markdown.push('---');
        markdown.push('');
        break;

      case 'stats':
        markdown.push(`**${block.content.label || 'Stat'}**: ${block.content.value || ''}`);
        markdown.push('');
        break;
    }
  });

  return markdown.join('\n').trim();
};

/**
 * Helper function to detect special markdown lines
 */
const isSpecialLine = (line: string): boolean => {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('>') ||
    trimmed.startsWith('|') ||
    trimmed.startsWith('```') ||
    trimmed.startsWith('![')||
    trimmed.match(/^\d+\./) !== null ||
    trimmed.match(/^---+$/) !== null
  );
};