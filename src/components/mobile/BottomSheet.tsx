import { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[];
}

export const BottomSheet = ({
  open,
  onOpenChange,
  children,
  title,
  description,
  snapPoints = [1]
}: BottomSheetProps) => {
  return (
    <Drawer.Root 
      open={open} 
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-background max-h-[95vh]">
          {/* Drag Handle */}
          <div className="flex justify-center py-4">
            <div className="w-12 h-1.5 rounded-full bg-muted" />
          </div>

          {/* Header */}
          {(title || description) && (
            <div className="px-6 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {title && (
                    <Drawer.Title className="text-xl font-bold text-foreground">
                      {title}
                    </Drawer.Title>
                  )}
                  {description && (
                    <Drawer.Description className="text-sm text-muted-foreground mt-1">
                      {description}
                    </Drawer.Description>
                  )}
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="ml-4 p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
