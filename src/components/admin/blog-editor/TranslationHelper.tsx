import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useContentTranslation } from '@/hooks/useContentTranslation';
import { BlogEditorData, Block } from './types';

interface TranslationHelperProps {
  data: BlogEditorData;
  currentLanguage: 'en' | 'ar';
  onUpdate: (field: keyof BlogEditorData, value: any) => void;
}

export const TranslationHelper = ({ data, currentLanguage, onUpdate }: TranslationHelperProps) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const { translateContent } = useContentTranslation();
  const { toast } = useToast();

  const targetLanguage = currentLanguage === 'en' ? 'ar' : 'en';

  const translateField = async (sourceField: keyof BlogEditorData, targetField: keyof BlogEditorData) => {
    const sourceText = data[sourceField] as string;
    if (!sourceText) return;

    setIsTranslating(true);
    try {
      const translated = await translateContent({
        text: sourceText,
        sourceLang: currentLanguage,
        targetLang: targetLanguage,
        context: 'blog post content',
      });

      onUpdate(targetField, translated);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateAllFields = async () => {
    setIsTranslating(true);
    toast({
      title: 'Translating...',
      description: 'This may take a moment',
    });

    try {
      const fields = [
        { source: `title_${currentLanguage}`, target: `title_${targetLanguage}` },
        { source: `excerpt_${currentLanguage}`, target: `excerpt_${targetLanguage}` },
        { source: `seo_title_${currentLanguage}`, target: `seo_title_${targetLanguage}` },
        { source: `seo_description_${currentLanguage}`, target: `seo_description_${targetLanguage}` },
      ];

      for (const field of fields) {
        await translateField(field.source as keyof BlogEditorData, field.target as keyof BlogEditorData);
      }

      // Translate blocks - Create NEW block IDs to ensure complete independence
      const sourceBlocks = data[`blocks_${currentLanguage}` as keyof BlogEditorData] as Block[];
      if (sourceBlocks && sourceBlocks.length > 0) {
        const translatedBlocks = await Promise.all(
          sourceBlocks.map(async (block) => {
            // Create a completely NEW block with a NEW ID to ensure independence
            const translatedBlock: Block = { 
              id: `block-${Date.now()}-${Math.random()}`,
              type: block.type,
              content: {}
            };
            
            if (block.type === 'paragraph' || block.type === 'heading') {
              translatedBlock.content = {
                ...(block.content.level && { level: block.content.level }), // Preserve heading level
                text: await translateContent({
                  text: block.content.text || '',
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: `${block.type} block`,
                }),
              };
            } else if (block.type === 'list') {
              const listItems = block.content.listItems || [];
              const translatedItems = await Promise.all(
                listItems.map((item: string) => translateContent({
                  text: item,
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'list item',
                }))
              );
              translatedBlock.content = {
                ordered: block.content.ordered, // Preserve list type
                listItems: translatedItems,
              };
            } else if (block.type === 'checklist') {
              const items = block.content.items || [];
              const translatedItems = await Promise.all(
                items.map(async (item: any) => ({
                  id: `item-${Date.now()}-${Math.random()}`, // New ID for checklist item
                  checked: item.checked,
                  text: await translateContent({
                    text: item.text,
                    sourceLang: currentLanguage,
                    targetLang: targetLanguage,
                    context: 'checklist item',
                  }),
                }))
              );
              translatedBlock.content = {
                items: translatedItems,
              };
            } else if (block.type === 'table') {
              const headers = block.content.headers || [];
              const rows = block.content.rows || [];
              const translatedHeaders = await Promise.all(
                headers.map((h: string) => translateContent({
                  text: h,
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'table header',
                }))
              );
              const translatedRows = await Promise.all(
                rows.map((row: string[]) =>
                  Promise.all(row.map((cell: string) => translateContent({
                    text: cell,
                    sourceLang: currentLanguage,
                    targetLang: targetLanguage,
                    context: 'table cell',
                  })))
                )
              );
              translatedBlock.content = {
                headers: translatedHeaders,
                rows: translatedRows,
              };
            } else if (block.type === 'quote') {
              translatedBlock.content = {
                quote: await translateContent({
                  text: block.content.quote || '',
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'quote text',
                }),
                author: block.content.author || '',
              };
            } else if (block.type === 'callout') {
              translatedBlock.content = {
                calloutType: block.content.calloutType, // Preserve callout type
                title: await translateContent({
                  text: block.content.title || '',
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'callout title',
                }),
                text: await translateContent({
                  text: block.content.text || '',
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'callout text',
                }),
              };
            } else if (block.type === 'stats') {
              translatedBlock.content = {
                value: block.content.value, // Preserve numeric value
                icon: block.content.icon, // Preserve icon
                label: await translateContent({
                  text: block.content.label || '',
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'stats label',
                }),
              };
            } else if (block.type === 'image') {
              // Image blocks: preserve URL, translate text fields
              translatedBlock.content = {
                imageUrl: block.content.imageUrl,
                altText: block.content.altText ? await translateContent({
                  text: block.content.altText,
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'image alt text',
                }) : '',
                caption: block.content.caption ? await translateContent({
                  text: block.content.caption,
                  sourceLang: currentLanguage,
                  targetLang: targetLanguage,
                  context: 'image caption',
                }) : '',
              };
            } else if (block.type === 'divider') {
              // Divider has no translatable content
              translatedBlock.content = {};
            }
            
            return translatedBlock;
          })
        );

        onUpdate(`blocks_${targetLanguage}` as keyof BlogEditorData, translatedBlocks);
      }

      toast({
        title: 'Success',
        description: 'Content translated successfully',
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to translate content',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Translation Helper
        </CardTitle>
        <CardDescription>
          Automatically translate content to {targetLanguage === 'ar' ? 'Arabic' : 'English'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={translateAllFields}
          disabled={isTranslating}
          className="w-full"
        >
          {isTranslating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Languages className="mr-2 h-4 w-4" />
              Translate All Content
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
