import { TrendingDown, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface QuoteCompetitionIndicatorProps {
  myQuote: number;
  lowestQuote: number;
  totalQuotes: number;
  myRank: number;
  budget?: number;
  currentLanguage: 'en' | 'ar';
}

export const QuoteCompetitionIndicator = ({
  myQuote,
  lowestQuote,
  totalQuotes,
  myRank,
  budget,
  currentLanguage
}: QuoteCompetitionIndicatorProps) => {
  const { formatAmount } = useCurrency();

  // Calculate competitiveness percentage (0-100)
  // Rank 1 = 100% (full green), higher ranks get lower percentage
  let competitiveness: number;
  if (myRank === 1) {
    competitiveness = 100;
  } else {
    const maxRange = budget || lowestQuote * 2;
    competitiveness = Math.max(0, Math.min(100, 100 - ((myQuote / maxRange) * 100)));
  }

  return (
    <div className="bg-muted/30 border border-border/50 rounded-2xl p-3 space-y-2">

      {/* Competitiveness bar */}
      <div className="space-y-1">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-500"
            style={{ width: `${competitiveness}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">
            {currentLanguage === 'ar' ? 'تنافسي' : 'Competitive'}
          </span>
          <span className="text-[10px] font-medium">
            {myRank === 1
              ? (currentLanguage === 'ar' ? '🏆 الأفضل' : '🏆 Best')
              : myRank <= 3
                ? (currentLanguage === 'ar' ? '✨ تنافسي' : '✨ Competitive')
                : (currentLanguage === 'ar' ? '⚠️ مرتفع' : '⚠️ High')}
          </span>
        </div>
      </div>
    </div>
  );
};
