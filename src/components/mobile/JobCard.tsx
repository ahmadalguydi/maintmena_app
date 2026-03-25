import { SoftCard } from './SoftCard';
import { StatusPill } from './StatusPill';
import { DollarSign, MapPin, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { getCategoryIcon } from '@/lib/serviceCategories';
import { useCurrency } from '@/hooks/useCurrency';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface JobCardProps {
  title: string;
  description: string;
  category: string;
  city: string;
  urgency: 'urgent' | 'normal' | 'flexible' | 'critical' | 'high' | 'medium' | 'low';
  budgetMin?: number;
  budgetMax?: number;
  createdAt: string;
  quotesCount: number;
  onClick?: () => void;
  currentLanguage?: 'en' | 'ar';
}

export const JobCard = ({
  title,
  description,
  category,
  city,
  urgency,
  budgetMin,
  budgetMax,
  createdAt,
  quotesCount,
  onClick,
  currentLanguage = 'en'
}: JobCardProps) => {
  const { formatAmount } = useCurrency();

  const content = {
    en: {
      budgetUnknown: 'Budget unspecified',
      postedAgo: 'ago',
      quotes: 'quotes',
      few: 'Few',
      many: 'Many'
    },
    ar: {
      budgetUnknown: 'الميزانية غير محددة',
      postedAgo: 'منذ',
      quotes: 'عروض',
      few: 'قليل',
      many: 'كثير'
    }
  };

  const t = content[currentLanguage];

  const urgencyLabels: Record<string, { en: string; ar: string }> = {
    urgent: { en: 'High Urgency', ar: 'ضرورة عالية' },
    high: { en: 'High Urgency', ar: 'ضرورة عالية' },
    critical: { en: 'Critical', ar: 'ضروري' },
    normal: { en: 'Medium Urgency', ar: 'ضرورة متوسطة' },
    medium: { en: 'Medium Urgency', ar: 'ضرورة متوسطة' },
    flexible: { en: 'Low Urgency', ar: 'ضرورة منخفضة' },
    low: { en: 'Low Urgency', ar: 'ضرورة منخفضة' }
  };

  const getQuotesLabel = (count: number) => {
    if (count === 0) return t.few;
    if (count < 3) return t.few;
    return t.many;
  };

  const getUrgencyStatus = () => {
    if (urgency === 'urgent' || urgency === 'critical') return 'error';
    if (urgency === 'normal') return 'warning';
    return 'success';
  };

  const getUrgencyLabel = () => {
    const label = urgencyLabels[urgency as string];
    if (!label) return urgency; // Fallback to raw value
    return currentLanguage === 'ar' ? label.ar : label.en;
  };

  const getLocalizedCity = (cityKey: string) => {
    if (!cityKey) return currentLanguage === 'ar' ? 'غير محدد' : 'N/A';

    // Search in SAUDI_CITIES_BILINGUAL for exact match or alias
    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
      c.en.toLowerCase() === cityKey.toLowerCase() ||
      c.ar === cityKey ||
      c.aliases?.some(alias => alias.toLowerCase() === cityKey.toLowerCase())
    );

    if (cityData) {
      return currentLanguage === 'ar' ? cityData.ar : cityData.en;
    }

    return cityKey;
  };

  const getCleanDescription = (desc: string) => {
    if (!desc) return '';
    return desc
      .split(/(?:Preferred Date:|Time Window:)/i)[0]
      .replace(/\s?\[Flexible Date\]/g, '')
      .replace(/\s?\[Flexible Time\]/g, '')
      .replace(/\s?\[تاريخ مرن\]/g, '')
      .replace(/\s?\[وقت مرن\]/g, '')
      .replace(/Time Window: \w+/gi, '')
      .trim();
  };

  return (
    <SoftCard onClick={onClick}>
      <div className="space-y-3">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">{getCategoryIcon(category)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {getCleanDescription(description)}
            </p>
          </div>
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-2">
          {/* Budget */}
          <div className="flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs">
            {budgetMin && budgetMax ? (
              <span>{formatAmount(budgetMin, 'SAR')} - {formatAmount(budgetMax, 'SAR')}</span>
            ) : (
              <span>{t.budgetUnknown}</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
            <MapPin size={12} />
            {getLocalizedCity(city)}
          </div>



          {/* Time posted */}
          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-muted-foreground text-xs">
            <Clock size={12} />
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: true,
              locale: currentLanguage === 'ar' ? arSA : undefined
            })}
          </div>
        </div>
      </div>
    </SoftCard>
  );
};
