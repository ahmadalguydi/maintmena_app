import { motion } from 'framer-motion';
import { MapPin, DollarSign, Calendar, TrendingDown, TrendingUp, Trash2, Edit2 } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { StatusPill } from './StatusPill';
import { getAllCategories } from '@/lib/serviceCategories';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useCurrency } from '@/hooks/useCurrency';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface EnhancedRequestCardProps {
  request: any;
  quotes: any[];
  currentLanguage: 'en' | 'ar';
  onClick: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  status?: 'open' | 'in_review';
}

export const EnhancedRequestCard = ({ request, quotes, currentLanguage, onClick, onDelete, onEdit, status }: EnhancedRequestCardProps) => {
  const { formatAmount } = useCurrency();
  const allCategories = getAllCategories();
  const category = allCategories.find(c => c.key === request.category);

  // Filter out rejected quotes (to match RequestDetail display)
  const activeQuotes = quotes.filter(q => q.status !== 'rejected');

  // Calculate quote statistics from active quotes only
  const quotePrices = activeQuotes.map(q => q.price).filter(Boolean);
  const lowestQuote = quotePrices.length > 0 ? Math.min(...quotePrices) : null;
  const avgQuote = quotePrices.length > 0 ? quotePrices.reduce((a, b) => a + b, 0) / quotePrices.length : null;

  // Check if has quotes
  const hasQuotes = activeQuotes.length > 0;

  // Get urgency config
  const urgencyConfig: Record<string, { color: string; label: string; label_ar: string }> = {
    urgent: { color: 'bg-red-500/10 text-red-600 border-red-200', label: '🔴 High Urgency', label_ar: '🔴 عاجل' },
    normal: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200', label: '🟡 Normal', label_ar: '🟡 عادي' },
    flexible: { color: 'bg-green-500/10 text-green-600 border-green-200', label: '🟢 Flexible', label_ar: '🟢 مرن' }
  };

  const urgency = urgencyConfig[request.urgency] || urgencyConfig.normal;

  // Parse budget
  const budgetMin = request.estimated_budget_min || 0;
  const budgetMax = request.estimated_budget_max || request.budget || 0;

  // Clean description from flexible markers
  const cleanDescription = (desc: string) => {
    if (!desc) return '';
    return desc
      .split(/(?:Preferred Date:|Time Window:)/i)[0]
      .replace(/\s?\[Flexible Date\]/g, '')
      .replace(/\s?\[Flexible Time\]/g, '')
      .replace(/\s?\[تاريخ مرن\]/g, '')
      .replace(/\s?\[وقت مرن\]/g, '')
      .trim();
  };

  return (
    <SoftCard onClick={onClick} className="space-y-4">
      {/* Header with category and urgency */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category?.icon || '🔧'}</span>
          <span className="text-sm font-medium text-foreground/80">
            {currentLanguage === 'ar' ? category?.ar : category?.en}
          </span>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full border ${urgency.color}`}>
          {currentLanguage === 'ar' ? urgency.label_ar : urgency.label}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-base leading-tight line-clamp-1">
        {currentLanguage === 'ar' ? request.title_ar || request.title : request.title}
      </h3>

      {/* Description preview */}
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {cleanDescription(currentLanguage === 'ar'
          ? request.description_ar || request.description
          : request.description)}
      </p>

      {/* Metadata row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>
            {(() => {
              const cityValue = request.city || request.location;
              if (!cityValue) return '-';
              const cityMatch = SAUDI_CITIES_BILINGUAL.find(c =>
                c.en.toLowerCase() === cityValue.toLowerCase() ||
                c.ar === cityValue
              );
              return currentLanguage === 'ar'
                ? (cityMatch?.ar || cityValue)
                : (cityMatch?.en || cityValue);
            })()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            {formatDistanceToNow(new Date(request.created_at), {
              addSuffix: true,
              locale: currentLanguage === 'ar' ? arSA : undefined
            })}
          </span>
        </div>
      </div>

      {/* Budget */}
      {budgetMax > 0 && (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">
            {budgetMin > 0
              ? `${formatAmount(budgetMin, 'SAR')} - ${formatAmount(budgetMax, 'SAR')}`
              : formatAmount(budgetMax, 'SAR')
            }
          </span>
        </div>
      )}

      {/* Quote statistics */}
      {hasQuotes ? (
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-accent">
              {currentLanguage === 'ar' ? `👥 ${activeQuotes.length} عروض أسعار` : `👥 ${activeQuotes.length} Quotes Received`}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-green-600">
              <TrendingDown className="w-3 h-3" />
              <span>{currentLanguage === 'ar' ? 'الأقل:' : 'Lowest:'}</span>
              <span className="font-semibold">{lowestQuote ? formatAmount(lowestQuote, 'SAR') : '-'}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>{currentLanguage === 'ar' ? 'المتوسط:' : 'Avg:'}</span>
              <span className="font-semibold">{avgQuote ? formatAmount(avgQuote, 'SAR') : '-'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-border/50 rounded-2xl p-3 text-center">
          <span className="text-xs text-muted-foreground">
            {currentLanguage === 'ar' ? '⏳ في انتظار العروض' : '⏳ Awaiting quotes'}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {(onDelete || onEdit) && (
        <div className="flex gap-2">
          {onEdit && status === 'open' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 bg-primary/10 text-primary rounded-full px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex-1 bg-destructive/10 text-destructive rounded-full px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
            </motion.button>
          )}
        </div>
      )}

      {/* CTA Button */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="w-full bg-accent text-white rounded-full px-4 py-2.5 text-center text-sm font-medium"
      >
        {currentLanguage === 'ar' ? 'عرض العروض ←' : 'View Quotes →'}
      </motion.div>
    </SoftCard>
  );
};
