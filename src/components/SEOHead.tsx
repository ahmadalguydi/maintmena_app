import { useEffect } from 'react';

interface ReviewSchemaData {
  businessName: string;
  businessType?: 'LocalBusiness' | 'ProfessionalService' | 'Organization';
  aggregateRating: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  url: string;
  description?: string;
  image?: string;
  reviews?: Array<{
    author: string;
    rating: number;
    reviewBody?: string;
    datePublished: string;
  }>;
}

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  reviewSchema?: ReviewSchemaData;
}

export const SEOHead = ({
  title = 'MaintMENA — Early Maintenance Signals & Verified Tenders for MENA Facilities',
  description = 'Discover maintenance opportunities before competitors. Get weekly intelligence briefs, verified tenders, and direct buyer access for MENA facilities. Start your 14-day free trial.',
  keywords = 'MENA maintenance, facility management, industrial tenders, RFQ platform, maintenance intelligence',
  canonical,
  ogImage = 'https://maintmena.com/og-image.jpg',
  noindex = false,
  reviewSchema
}: SEOHeadProps) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    
    // Open Graph
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', ogImage, true);
    
    // Twitter
    updateMetaTag('twitter:title', title, true);
    updateMetaTag('twitter:description', description, true);
    updateMetaTag('twitter:image', ogImage, true);

    // Canonical URL
    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', canonical);
    }
  }, [title, description, keywords, canonical, ogImage, noindex]);

  return (
    <>
      {reviewSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': reviewSchema.businessType || 'ProfessionalService',
              name: reviewSchema.businessName,
              url: reviewSchema.url,
              ...(reviewSchema.description && { description: reviewSchema.description }),
              ...(reviewSchema.image && { image: reviewSchema.image }),
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: reviewSchema.aggregateRating.ratingValue,
                reviewCount: reviewSchema.aggregateRating.reviewCount,
                bestRating: reviewSchema.aggregateRating.bestRating || 5,
                worstRating: reviewSchema.aggregateRating.worstRating || 1
              },
              ...(reviewSchema.reviews && reviewSchema.reviews.length > 0 && {
                review: reviewSchema.reviews.map(review => ({
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
            })
          }}
        />
      )}
    </>
  );
};
