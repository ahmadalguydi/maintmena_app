import { TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Block } from '../types';

interface StatsBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const StatsBlock = ({ block, onUpdate }: StatsBlockProps) => {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <Input
          value={block.content.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Stat label (e.g., 'Average Savings')"
          className="border-0 bg-transparent font-semibold"
        />
      </div>
      <Input
        value={block.content.value || ''}
        onChange={(e) => onUpdate({ value: e.target.value })}
        placeholder="Stat value (e.g., '2,500 SAR')"
        className="border-0 bg-transparent text-3xl font-bold"
      />
    </div>
  );
};
