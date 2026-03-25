import { Block } from './types';
import { AlertCircle, Info, CheckCircle, XCircle, Quote as QuoteIcon, TrendingUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

interface BlockRendererProps {
  blocks: Block[];
}

export const BlockRenderer = ({ blocks }: BlockRendererProps) => {
  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.content.level || 2}` as keyof JSX.IntrinsicElements;
        return <HeadingTag className="font-bold mb-4">{block.content.text}</HeadingTag>;

      case 'paragraph':
        return <p className="mb-4 leading-relaxed">{block.content.text}</p>;

      case 'list':
        const ListTag = block.content.ordered ? 'ol' : 'ul';
        return (
          <ListTag className={`mb-4 ${block.content.ordered ? 'list-decimal' : 'list-disc'} pl-6 space-y-2`}>
            {block.content.listItems?.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ListTag>
        );

      case 'image':
        return (
          <figure className="mb-6">
            <img
              src={block.content.imageUrl}
              alt={block.content.altText || ''}
              className="w-full rounded-lg"
            />
            {block.content.caption && (
              <figcaption className="text-sm text-muted-foreground mt-2 text-center">
                {block.content.caption}
              </figcaption>
            )}
          </figure>
        );

      case 'table':
        return (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="bg-muted/50">
                  {block.content.headers?.map((header, i) => (
                    <th key={i} className="border border-border p-3 text-left font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.content.rows?.map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-border p-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'checklist':
        return (
          <div className="mb-6 space-y-2">
            {block.content.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox checked={item.checked} disabled />
                <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        );

      case 'callout':
        const calloutStyles = {
          info: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', icon: Info },
          warning: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-900', icon: AlertCircle },
          success: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', icon: CheckCircle },
          error: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: XCircle },
        };
        const { bg, border, text, icon: CalloutIcon } = calloutStyles[block.content.calloutType || 'info'];
        
        return (
          <div className={`${bg} ${text} border-l-4 ${border} p-4 rounded-md mb-6`}>
            <div className="flex items-start gap-2">
              <CalloutIcon className="h-5 w-5 mt-0.5" />
              <div>
                {block.content.title && (
                  <div className="font-semibold mb-1">{block.content.title}</div>
                )}
                <p>{block.content.text}</p>
              </div>
            </div>
          </div>
        );

      case 'quote':
        return (
          <blockquote className="border-l-4 border-primary pl-4 py-2 mb-6 italic">
            <div className="flex items-start gap-2">
              <QuoteIcon className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <p className="text-lg mb-2">{block.content.quote}</p>
                {block.content.author && (
                  <cite className="text-sm text-muted-foreground not-italic">
                    — {block.content.author}
                  </cite>
                )}
              </div>
            </div>
          </blockquote>
        );

      case 'stats':
        return (
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold">{block.content.label}</span>
            </div>
            <div className="text-3xl font-bold">{block.content.value}</div>
          </div>
        );

      case 'divider':
        return (
          <div className="py-6 mb-6">
            <Separator />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="prose prose-lg max-w-none">
      {blocks.map((block) => (
        <div key={block.id}>{renderBlock(block)}</div>
      ))}
    </div>
  );
};
