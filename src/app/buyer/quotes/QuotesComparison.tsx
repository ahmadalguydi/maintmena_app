import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SoftCard } from '@/components/mobile/SoftCard';
import { StatusPill } from '@/components/mobile/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Star, TrendingDown, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Heading2, Heading3, Body, BodySmall } from '@/components/mobile/Typography';

interface QuotesComparisonProps {
  currentLanguage: 'en' | 'ar';
}

export const QuotesComparison = ({ currentLanguage }: QuotesComparisonProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['buyer-quotes', user?.id],
    queryFn: async () => {
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('buyer_id', user?.id);

      if (!requests) return [];

      const { data, error } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(title, title_ar), profiles(full_name, seller_rating, completed_projects)')
        .in('request_id', requests.map(r => r.id))
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const content = {
    en: { title: 'Quotes', recommended: 'Recommended', lowest: 'Lowest Price', topRated: 'Top Rated', days: 'days', view: 'View Details' },
    ar: { title: 'العروض', recommended: 'موصى به', lowest: 'أقل سعر', topRated: 'الأعلى تقييمًا', days: 'أيام', view: 'عرض التفاصيل' }
  };

  const t = content[currentLanguage];

  const getRecommendedQuote = (requestQuotes: any[]) => {
    const avgPrice = requestQuotes.reduce((sum, q) => sum + q.price, 0) / requestQuotes.length;
    return requestQuotes.find(q => 
      q.price <= avgPrice && (q.profiles?.seller_rating || 0) >= 4.5
    );
  };

  const groupedQuotes = quotes?.reduce((acc: any, quote) => {
    const requestId = quote.request_id;
    if (!acc[requestId]) {
      acc[requestId] = {
        request: quote.maintenance_requests,
        quotes: []
      };
    }
    acc[requestId].quotes.push(quote);
    return acc;
  }, {});

  const QuoteCard = ({ quote, badge, isRecommended }: any) => (
    <SoftCard onClick={() => navigate(`/app/buyer/quotes/${quote.id}`)}>
      <div className="space-y-3">
        {badge && (
          <div className={`mb-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
            isRecommended 
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-700'
              : 'bg-success/10 text-success border border-success/20'
          }`}>
            {badge}
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Heading3 lang={currentLanguage}>{quote.profiles?.full_name}</Heading3>
            <div className="flex items-center gap-1 mt-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <BodySmall lang={currentLanguage} className="text-muted-foreground">
                {quote.profiles?.seller_rating || 'New'}
              </BodySmall>
              {quote.profiles?.completed_projects && (
                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                  ({quote.profiles.completed_projects} jobs)
                </BodySmall>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-bold">{quote.price} SAR</div>
            <div className="text-sm text-muted-foreground">{quote.estimated_duration}</div>
          </div>
        </div>

        <Body lang={currentLanguage} className="text-sm text-muted-foreground line-clamp-2">
          {currentLanguage === 'ar' && quote.proposal_ar ? quote.proposal_ar : quote.proposal}
        </Body>

        <Button variant="outline" className="w-full rounded-full" size="sm">
          {t.view}
        </Button>
      </div>
    </SoftCard>
  );

  if (isLoading) {
    return (
      <div className="pb-20 p-4 space-y-6">
        {[1, 2, 3].map((i) => (
          <SoftCard key={i} animate={false}>
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          </SoftCard>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-20 p-4 space-y-6" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {groupedQuotes && Object.values(groupedQuotes).map((group: any) => {
        const recommended = getRecommendedQuote(group.quotes);
        const lowest = [...group.quotes].sort((a, b) => a.price - b.price)[0];

        return (
          <div key={group.request.id} className="space-y-3">
            <Heading2 lang={currentLanguage} className="px-2">
              {currentLanguage === 'ar' && group.request.title_ar ? group.request.title_ar : group.request.title}
            </Heading2>
            <BodySmall lang={currentLanguage} className="text-muted-foreground px-2">
              {group.quotes.length} quotes • Lowest: {lowest.price} SAR
            </BodySmall>

            {recommended && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <QuoteCard 
                  quote={recommended} 
                  badge={<><Award size={14} className="inline" /> {t.recommended}</>}
                  isRecommended={true}
                />
              </motion.div>
            )}

            {group.quotes.filter((q: any) => q.id !== recommended?.id).slice(0, 2).map((quote: any, index: number) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <QuoteCard 
                  quote={quote} 
                  badge={quote.id === lowest.id ? <><TrendingDown size={14} className="inline" /> {t.lowest}</> : null}
                  isRecommended={false}
                />
              </motion.div>
            ))}

            {group.quotes.length > 3 && (
              <Button variant="ghost" className="w-full">
                See all {group.quotes.length} quotes
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};
