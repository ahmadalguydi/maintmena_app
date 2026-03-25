import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EducationalContent {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  category: string;
  content_type: string;
  thumbnail_url: string | null;
  video_url: string | null;
  transcript_url: string | null;
  access_tier: string;
  views_count: number;
}

interface ContentByCategory {
  [category: string]: EducationalContent[];
}

export function useEducationalData() {
  const [content, setContent] = useState<ContentByCategory>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
    setupRealtimeSubscription();
  }, []);

  const fetchContent = async () => {
    try {
      const { data: contentData, error } = await supabase
        .from('educational_content')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (contentData) {
        // Group content by category
        const grouped = contentData.reduce((acc: ContentByCategory, item) => {
          if (!acc[item.category]) {
            acc[item.category] = [];
          }
          acc[item.category].push(item);
          return acc;
        }, {});

        setContent(grouped);
      }
    } catch (error) {
      console.error('Error fetching educational content:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('educational-content-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'educational_content' },
        () => fetchContent()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    content,
    loading,
    refreshData: fetchContent
  };
}
