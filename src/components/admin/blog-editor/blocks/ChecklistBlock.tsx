import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Block } from '../types';

interface ChecklistBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const ChecklistBlock = ({ block, onUpdate }: ChecklistBlockProps) => {
  const items = block.content.items || [{ id: `item-${Date.now()}`, text: '', checked: false }];

  const addItem = () => {
    const newItems = [
      ...items,
      { id: `item-${Date.now()}`, text: '', checked: false },
    ];
    onUpdate({ items: newItems });
  };

  const deleteItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    onUpdate({ items: newItems });
  };

  const updateItem = (id: string, updates: Partial<typeof items[0]>) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdate({ items: newItems });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) =>
              updateItem(item.id, { checked: checked as boolean })
            }
          />
          <Input
            value={item.text}
            onChange={(e) => updateItem(item.id, { text: e.target.value })}
            placeholder="Checklist item"
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" /> Add Item
      </Button>
    </div>
  );
};
