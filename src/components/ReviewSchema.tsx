interface Review {
  author: string;
  rating: number;
  reviewBody?: string;
  datePublished: string;
}

interface AggregateRating {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

interface ReviewSchemaProps {
  businessName: string;
  businessType?: 'LocalBusiness' | 'ProfessionalService' | 'Organization';
  aggregateRating: AggregateRating;
  url: string;
  description?: string;
  image?: string;
  address?: string;
  telephone?: string;
  reviews?: Review[];
}

export const ReviewSchema = ({
  businessName,
  businessType = 'ProfessionalService',
  aggregateRating,
  url,
  description,
  image,
  address,
  telephone,
  reviews = []
}: ReviewSchemaProps) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': businessType,
    name: businessName,
    url,
    ...(description && { description }),
    ...(image && { image }),
    ...(address && { address }),
    ...(telephone && { telephone }),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
      bestRating: aggregateRating.bestRating || 5,
      worstRating: aggregateRating.worstRating || 1
    },
    ...(reviews.length > 0 && {
      review: reviews.map(review => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: review.author
        },
        datePublished: review.datePublished,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: 5,
          worstRating: 1
        },
        ...(review.reviewBody && { reviewBody: review.reviewBody })
      }))
    })
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};
