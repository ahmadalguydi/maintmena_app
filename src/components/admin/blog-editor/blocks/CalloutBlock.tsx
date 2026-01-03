import { AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Block } from '../types';

interface CalloutBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const CalloutBlock = ({ block, onUpdate }: CalloutBlockProps) => {
  const calloutType = block.content.calloutType || 'info';

  const getCalloutStyles = () => {
    const styles = {
      info: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', icon: Info },
      warning: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-900', icon: AlertCircle },
      success: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-900', icon: CheckCircle },
      error: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-900', icon: XCircle },
    };
    return styles[calloutType];
  };

  const { bg, border, text, icon: Icon } = getCalloutStyles();

  return (
    <div className="space-y-3">
      <Select
        value={calloutType}
        onValueChange={(value) => onUpdate({ calloutType: value as any })}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="error">Error</SelectItem>
        </SelectContent>
      </Select>

      <div className={`${bg} ${text} border-l-4 ${border} p-4 rounded-md space-y-2`}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <Input
            value={block.content.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Callout title (optional)"
            className="border-0 bg-transparent font-semibold"
          />
        </div>
        <Textarea
          value={block.content.text || ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Callout text"
          className="border-0 bg-transparent min-h-[80px]"
        />
      </div>
    </div>
  );
};
