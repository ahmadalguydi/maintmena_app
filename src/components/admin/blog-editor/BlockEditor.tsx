import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Block } from './types';
import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { TableBlock } from './blocks/TableBlock';
import { ChecklistBlock } from './blocks/ChecklistBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { StatsBlock } from './blocks/StatsBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { ListBlock } from './blocks/ListBlock';
import { BlockToolbar } from './BlockToolbar';

interface BlockEditorProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  onUpdateBlock: (blockId: string, content: Partial<Block['content']>) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onAddBlock: (type: Block['type'], index?: number) => void;
}

const SortableBlock = ({ 
  block, 
  onUpdate, 
  onDelete, 
  onDuplicate 
}: { 
  block: Block; 
  onUpdate: (content: Partial<Block['content']>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderBlock = () => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        return <TextBlock block={block} onUpdate={onUpdate} />;
      case 'list':
        return <ListBlock block={block} onUpdate={onUpdate} />;
      case 'image':
        return <ImageBlock block={block} onUpdate={onUpdate} />;
      case 'table':
        return <TableBlock block={block} onUpdate={onUpdate} />;
      case 'checklist':
        return <ChecklistBlock block={block} onUpdate={onUpdate} />;
      case 'callout':
        return <CalloutBlock block={block} onUpdate={onUpdate} />;
      case 'quote':
        return <QuoteBlock block={block} onUpdate={onUpdate} />;
      case 'stats':
        return <StatsBlock block={block} onUpdate={onUpdate} />;
      case 'divider':
        return <DividerBlock />;
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1">
            {renderBlock()}
          </div>

          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDuplicate}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const BlockEditor = ({
  blocks,
  onBlocksChange,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onAddBlock,
}: BlockEditorProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              onUpdate={(content) => onUpdateBlock(block.id, content)}
              onDelete={() => onDeleteBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No blocks yet. Add your first block below!</p>
        </div>
      )}

      <BlockToolbar onAddBlock={(type) => onAddBlock(type)} />
    </div>
  );
};
