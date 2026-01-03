import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Block } from '../types';

interface ListBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const ListBlock = ({ block, onUpdate }: ListBlockProps) => {
  const listItems = block.content.listItems || [''];
  const ordered = block.content.ordered || false;

  const addItem = () => {
    onUpdate({ listItems: [...listItems, ''] });
  };

  const deleteItem = (index: number) => {
    const newItems = listItems.filter((_, i) => i !== index);
    onUpdate({ listItems: newItems.length > 0 ? newItems : [''] });
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...listItems];
    newItems[index] = value;
    onUpdate({ listItems: newItems });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch
          checked={ordered}
          onCheckedChange={(checked) => onUpdate({ ordered: checked })}
          id="list-type"
        />
        <Label htmlFor="list-type" className="text-sm">
          {ordered ? 'Ordered List (1, 2, 3...)' : 'Unordered List (•)'}
        </Label>
      </div>

      <div className="space-y-2">
        {listItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <span className="text-muted-foreground text-sm w-6">
              {ordered ? `${index + 1}.` : '•'}
            </span>
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder="List item"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteItem(index)}
              disabled={listItems.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" /> Add Item
      </Button>
    </div>
  );
};