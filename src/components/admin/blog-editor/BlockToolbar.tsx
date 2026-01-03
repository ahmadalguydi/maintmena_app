import { 
  Type, 
  Image, 
  Table, 
  CheckSquare, 
  AlertCircle, 
  Minus, 
  Quote,
  TrendingUp,
  Heading1,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BlockType } from './types';

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
}

export const BlockToolbar = ({ onAddBlock }: BlockToolbarProps) => {
  const blockTypes = [
    { type: 'heading' as BlockType, icon: Heading1, label: 'Heading', description: 'Large section heading' },
    { type: 'paragraph' as BlockType, icon: Type, label: 'Text', description: 'Plain text paragraph' },
    { type: 'list' as BlockType, icon: List, label: 'List', description: 'Bulleted or numbered list' },
    { type: 'image' as BlockType, icon: Image, label: 'Image', description: 'Upload an image' },
    { type: 'table' as BlockType, icon: Table, label: 'Table', description: 'Structured data table' },
    { type: 'checklist' as BlockType, icon: CheckSquare, label: 'Checklist', description: 'Interactive checklist' },
    { type: 'callout' as BlockType, icon: AlertCircle, label: 'Callout', description: 'Info, warning, or tip box' },
    { type: 'quote' as BlockType, icon: Quote, label: 'Quote', description: 'Blockquote with attribution' },
    { type: 'stats' as BlockType, icon: TrendingUp, label: 'Stats', description: 'Highlight key statistics' },
    { type: 'divider' as BlockType, icon: Minus, label: 'Divider', description: 'Horizontal separator' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          + Add Block
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-1">
          {blockTypes.map(({ type, icon: Icon, label, description }) => (
            <Button
              key={type}
              variant="ghost"
              className="w-full justify-start h-auto py-3"
              onClick={() => onAddBlock(type)}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
