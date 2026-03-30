import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isSupabaseRelationKnownUnavailable,
  isMissingSupabaseRelationError,
  rememberMissingSupabaseRelation,
} from './supabaseSchema';

interface ReviewRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  request_id: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
}

interface BuyerProfileRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
}

type Language = 'en' | 'ar';

interface FindExistingSellerReviewArgs {
  client: SupabaseClient;
  buyerId: string;
  sellerId: string;
  requestId?: string | null;
  reviewId?: string | null;
}

interface SubmitSellerReviewArgs {
  client: SupabaseClient;
  buyerId: string;
  sellerId: string;
  rating: number;
  reviewText?: string | null;
  requestId?: string | null;
  reviewId?: string | null;
}

export const isReviewEligible = (status?: string | null, buyerMarkedComplete?: boolean | null) => {
  if (buyerMarkedComplete) {
    return true;
  }

  return ['buyer_confirmed', 'completed', 'closed'].includes(status ?? '');
};

export const normalizeReviewText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const getReviewSentiment = (rating: number, language: Language) => {
  const copy = {
    en: {
      0: {
        title: 'Rate the full experience',
        body: 'Focus on workmanship, communication, timing, and professionalism.',
      },
      1: {
        title: 'Something went wrong',
        body: 'Clear specifics help support and future buyers understand the issue.',
      },
      2: {
        title: 'There were notable gaps',
        body: 'Call out what reduced trust or made the experience harder than expected.',
      },
      3: {
        title: 'Solid overall',
        body: 'Mention what worked and what could have been handled better.',
      },
      4: {
        title: 'Very good job',
        body: 'Highlight the details that made the provider feel dependable.',
      },
      5: {
        title: 'Excellent experience',
        body: 'Tell others what made this provider stand out from the start to the finish.',
      },
    },
    ar: {
      0: {
        title: 'قيّم التجربة كاملة',
        body: 'ركّز على جودة العمل، التواصل، الالتزام بالوقت، والاحترافية.',
      },
      1: {
        title: 'كانت هناك مشكلة واضحة',
        body: 'التفاصيل المحددة تساعد الدعم والعملاء الآخرين على فهم ما حدث.',
      },
      2: {
        title: 'كانت هناك فجوات ملحوظة',
        body: 'اذكر ما الذي قلل الثقة أو جعل التجربة أصعب من المتوقع.',
      },
      3: {
        title: 'التجربة جيدة إجمالاً',
        body: 'اذكر ما الذي سار بشكل جيد وما الذي كان يحتاج معالجة أفضل.',
      },
      4: {
        title: 'عمل جيد جداً',
        body: 'أبرز التفاصيل التي جعلت مقدم الخدمة يبدو موثوقاً ويمكن الاعتماد عليه.',
      },
      5: {
        title: 'تجربة ممتازة',
        body: 'أخبر الآخرين ما الذي جعل مقدم الخدمة مميزاً من البداية حتى النهاية.',
      },
    },
  };

  return copy[language][Math.max(0, Math.min(5, rating)) as keyof (typeof copy)[Language]];
};

export const getReviewPromptChips = (rating: number, language: Language) => {
  const copy = {
    en: {
      1: ['Late arrival', 'Poor workmanship', 'Unclear pricing'],
      2: ['Slow communication', 'Needed rework', 'Mess left behind'],
      3: ['Professional', 'Reasonable price', 'Could be faster'],
      4: ['On time', 'Clear communication', 'Clean finish'],
      5: ['Exceeded expectations', 'Fast and careful', 'Would book again'],
    },
    ar: {
      1: ['تأخر في الوصول', 'جودة العمل ضعيفة', 'السعر غير واضح'],
      2: ['التواصل بطيء', 'احتاج إعادة عمل', 'ترك المكان غير مرتب'],
      3: ['تعامل احترافي', 'سعر مناسب', 'كان يمكن أن يكون أسرع'],
      4: ['وصل في الوقت', 'تواصل واضح', 'أنجز العمل بشكل مرتب'],
      5: ['فاق التوقعات', 'سريع ودقيق', 'سأحجز معه مرة أخرى'],
    },
  };

  return copy[language][rating as keyof (typeof copy)[Language]] ?? [];
};

export const getRelativeReviewDate = (value: string, language: Language) => {
  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: language === 'ar' ? ar : enUS,
    });
  } catch {
    return '';
  }
};

export const attachReviewBuyerProfiles = async (client: SupabaseClient, reviews: ReviewRow[]) => {
  const buyerIds = Array.from(new Set(reviews.map((review) => review.buyer_id).filter(Boolean)));

  if (!buyerIds.length) {
    return reviews.map((review) => ({ ...review, buyer: null }));
  }

  const { data: buyers, error } = await client
    .from('profiles')
    .select('id, full_name, company_name')
    .in('id', buyerIds);

  if (error) {
    throw error;
  }

  const buyersMap = new Map((buyers ?? []).map((buyer: BuyerProfileRow) => [buyer.id, buyer]));

  return reviews.map((review) => ({
    ...review,
    buyer: buyersMap.get(review.buyer_id) ?? null,
  }));
};

export const isSellerReviewsUnavailableError = (error: unknown) =>
  isMissingSupabaseRelationError(error, 'seller_reviews');

export const findExistingSellerReview = async ({
  client,
  buyerId,
  sellerId,
  requestId,
  reviewId,
}: FindExistingSellerReviewArgs) => {
  if (isSupabaseRelationKnownUnavailable('seller_reviews')) {
    return null;
  }

  if (reviewId) {
    const { data, error } = await client
      .from('seller_reviews')
      .select('id, seller_id, buyer_id, request_id, rating, review_text, created_at')
      .eq('id', reviewId)
      .maybeSingle();

    if (error) {
      if (rememberMissingSupabaseRelation(error, 'seller_reviews')) {
        return null;
      }
      throw error;
    }

    return data;
  }

  if (requestId) {
    const { data, error } = await client
      .from('seller_reviews')
      .select('id, seller_id, buyer_id, request_id, rating, review_text, created_at')
      .eq('request_id', requestId)
      .eq('seller_id', sellerId)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      if (rememberMissingSupabaseRelation(error, 'seller_reviews')) {
        return null;
      }
      throw error;
    }

    return data?.[0] ?? null;
  }

  return null;
};

export const submitSellerReview = async ({
  client,
  buyerId,
  sellerId,
  rating,
  reviewText,
  requestId,
  reviewId,
}: SubmitSellerReviewArgs) => {
  if (isSupabaseRelationKnownUnavailable('seller_reviews')) {
    throw new Error('seller_reviews unavailable');
  }

  const existingReview = await findExistingSellerReview({
    client,
    buyerId,
    sellerId,
    requestId,
    reviewId,
  });

  const payload = {
    seller_id: sellerId,
    buyer_id: buyerId,
    request_id: requestId ?? null,
    rating,
    review_text: normalizeReviewText(reviewText),
    updated_at: new Date().toISOString(),
  };

  if (existingReview?.id) {
    const { error } = await client
      .from('seller_reviews')
      .update(payload)
      .eq('id', existingReview.id);

    if (error) {
      throw error;
    }

    return {
      mode: 'updated' as const,
      reviewId: existingReview.id,
    };
  }

  const { data, error } = await client
    .from('seller_reviews')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return {
    mode: 'created' as const,
    reviewId: data.id,
  };
};
