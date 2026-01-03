import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationOptions {
  text: string;
  sourceLang?: string;
  targetLang: 'en' | 'ar';
  context?: string;
}

export const useContentTranslation = () => {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateContent = async ({ text, sourceLang, targetLang, context }: TranslationOptions): Promise<string> => {
    if (!text) return '';
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { text, sourceLang, targetLang, context }
      });

      if (error) throw error;
      return data?.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original
    } finally {
      setIsTranslating(false);
    }
  };

  return { translateContent, isTranslating };
};

// Helper hook to get the right language version of content
export const useTranslatedContent = (
  content: any,
  currentLanguage: 'en' | 'ar',
  fields: string[]
) => {
  const [translatedContent, setTranslatedContent] = useState(content);

  useEffect(() => {
    if (!content) return;

    const result = { ...content };
    
    fields.forEach(field => {
      const arField = `${field}_ar`;
      const enField = `${field}_en`;
      
      if (currentLanguage === 'ar' && content[arField]) {
        result[field] = content[arField];
      } else if (currentLanguage === 'en' && content[enField]) {
        result[field] = content[enField];
      } else {
        // Fallback to original
        result[field] = content[field];
      }
    });

    setTranslatedContent(result);
  }, [content, currentLanguage, fields]);

  return translatedContent;
};
