import { useState } from 'react';
import { Image, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Block } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageBlockProps {
  block: Block;
  onUpdate: (content: Partial<Block['content']>) => void;
}

export const ImageBlock = ({ block, onUpdate }: ImageBlockProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, GIF, or WEBP image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `blog-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message || 'Upload failed');
      }

      const { data } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      onUpdate({ imageUrl: data.publicUrl });
      
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!block.content.imageUrl ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <label className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click to upload image'}
              </span>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative group">
            <img
              src={block.content.imageUrl}
              alt={block.content.altText || ''}
              className="w-full rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onUpdate({ imageUrl: undefined })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Alt text (for SEO and accessibility)"
            value={block.content.altText || ''}
            onChange={(e) => onUpdate({ altText: e.target.value })}
          />
          <Input
            placeholder="Caption (optional)"
            value={block.content.caption || ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};
