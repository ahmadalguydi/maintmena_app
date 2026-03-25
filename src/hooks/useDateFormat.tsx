import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type DateFormatType = 'gregorian' | 'hijri';

export const useDateFormat = () => {
  const { user } = useAuth();
  const [dateFormat, setDateFormat] = useState<DateFormatType>('gregorian');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDateFormat();
  }, [user]);

  const loadDateFormat = async () => {
    if (!user) {
      // Fallback to localStorage for non-authenticated users
      const stored = localStorage.getItem('preferredDateFormat') as DateFormatType;
      setDateFormat(stored || 'gregorian');
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_date_format')
        .eq('id', user.id)
        .single();

      const format = (profile?.preferred_date_format as DateFormatType) || 'gregorian';
      setDateFormat(format);
      localStorage.setItem('preferredDateFormat', format);
    } catch (error) {
      console.error('Error loading date format:', error);
      const stored = localStorage.getItem('preferredDateFormat') as DateFormatType;
      setDateFormat(stored || 'gregorian');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string, locale: 'en' | 'ar' = 'en'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (dateFormat === 'hijri') {
      // Note: For production, integrate a proper Hijri calendar library
      // like @hebcal/core or moment-hijri
      return dateObj.toLocaleDateString(locale === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-SA-u-ca-islamic');
    }

    return dateObj.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date | string, locale: 'en' | 'ar' = 'en'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (dateFormat === 'hijri') {
      return dateObj.toLocaleString(locale === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-SA-u-ca-islamic');
    }

    return dateObj.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    dateFormat,
    loading,
    formatDate,
    formatDateTime,
    setDateFormat: async (format: DateFormatType) => {
      setDateFormat(format);
      localStorage.setItem('preferredDateFormat', format);
      
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_date_format: format })
          .eq('id', user.id);
      }
    }
  };
};
