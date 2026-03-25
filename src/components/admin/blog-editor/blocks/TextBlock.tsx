import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Block } from '../types';

interface TextBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const TextBlock = ({ block, onUpdate }: TextBlockProps) => {
  const [text, setText] = useState(block.content.text || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate({ text });
    }, 150); // Reduced from 300ms for better responsiveness
    return () => clearTimeout(timer);
  }, [text]);

  const getPlaceholder = () => {
    if (block.type === 'heading') {
      return `Heading ${block.content.level || 2}`;
    }
    return 'Type your text here...';
  };

  const getClassName = () => {
    if (block.type === 'heading') {
      const level = block.content.level || 2;
      const sizes = {
        1: 'text-4xl font-bold',
        2: 'text-3xl font-bold',
        3: 'text-2xl font-semibold',
        4: 'text-xl font-semibold',
        5: 'text-lg font-semibold',
        6: 'text-base font-semibold',
      };
      return sizes[level as keyof typeof sizes];
    }
    return 'text-base';
  };

  return (
    <div className="space-y-2">
      {block.type === 'heading' && (
        <Select
          value={String(block.content.level || 2)}
          onValueChange={(value) => onUpdate({ level: Number(value) as 1 | 2 | 3 | 4 | 5 | 6 })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Heading 1</SelectItem>
            <SelectItem value="2">Heading 2</SelectItem>
            <SelectItem value="3">Heading 3</SelectItem>
            <SelectItem value="4">Heading 4</SelectItem>
            <SelectItem value="5">Heading 5</SelectItem>
            <SelectItem value="6">Heading 6</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={getPlaceholder()}
        className={`min-h-[60px] resize-none border-0 focus-visible:ring-0 ${getClassName()}`}
      />
    </div>
  );
};
