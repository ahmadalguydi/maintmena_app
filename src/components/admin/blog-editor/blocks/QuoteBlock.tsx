import { Quote } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Block } from '../types';

interface QuoteBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const QuoteBlock = ({ block, onUpdate }: QuoteBlockProps) => {
  return (
    <div className="border-l-4 border-primary pl-4 py-2 space-y-2">
      <div className="flex items-start gap-2">
        <Quote className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
        <Textarea
          value={block.content.quote || ''}
          onChange={(e) => onUpdate({ quote: e.target.value })}
          placeholder="Enter quote text..."
          className="border-0 resize-none text-lg italic"
        />
      </div>
      <Input
        value={block.content.author || ''}
        onChange={(e) => onUpdate({ author: e.target.value })}
        placeholder="Author name (optional)"
        className="border-0 text-sm text-muted-foreground"
      />
    </div>
  );
};
