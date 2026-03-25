import { useState } from 'react';
import { FileText, Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { parseMarkdownToBlocks } from '@/utils/markdownParser';
import { Block } from './types';
import { BlockRenderer } from './BlockRenderer';

interface MarkdownImportProps {
  language: 'en' | 'ar';
  onImport: (blocks: Block[]) => void;
  onClose: () => void;
}

export const MarkdownImport = ({ language, onImport, onClose }: MarkdownImportProps) => {
  const [markdown, setMarkdown] = useState('');
  const [preview, setPreview] = useState<Block[]>([]);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a .md (markdown) file',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMarkdown(content);
      generatePreview(content);
    };
    reader.readAsText(file);
  };

  const generatePreview = (mdContent: string) => {
    try {
      const blocks = parseMarkdownToBlocks(mdContent, { language });
      setPreview(blocks);
      toast({
        title: 'Preview generated',
        description: `Parsed ${blocks.length} blocks`,
      });
    } catch (error) {
      console.error('Error parsing markdown:', error);
      toast({
        title: 'Parsing error',
        description: 'Failed to parse markdown. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = () => {
    if (preview.length === 0) {
      toast({
        title: 'No content',
        description: 'Please paste markdown or upload a file first',
        variant: 'destructive',
      });
      return;
    }

    onImport(preview);
    toast({
      title: 'Success',
      description: `Imported ${preview.length} blocks`,
    });
    onClose();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Import from Markdown</h2>
        <p className="text-muted-foreground">
          Paste markdown content or upload a .md file to convert it into blog blocks
        </p>
      </div>

      {/* File Upload */}
      <div>
        <Label>Upload Markdown File</Label>
        <label className="mt-2 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">.md files only</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".md"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Manual Input */}
      <div>
        <Label>Or Paste Markdown Content</Label>
        <Textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="# Your Blog Title

This is a paragraph of text.

## Subheading

- List item 1
- List item 2

![Image](https://example.com/image.jpg)"
          className="mt-2 min-h-[300px] font-mono text-sm"
        />
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => generatePreview(markdown)}
          disabled={!markdown.trim()}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Preview
        </Button>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <Label>Preview ({preview.length} blocks)</Label>
          <Card className="mt-2 p-4 max-h-[400px] overflow-y-auto">
            <BlockRenderer blocks={preview} />
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={preview.length === 0}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Import Blocks
        </Button>
      </div>
    </div>
  );
};