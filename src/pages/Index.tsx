import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Masthead from '@/components/Masthead';
import Hero from '@/components/Hero';
import SearchBarHook from '@/components/SearchBarHook';
import WhyMaintMENA from '@/components/landing/WhyMaintMENA';
import HowItWorks from '@/components/landing/HowItWorks';
import CategoryGrid from '@/components/landing/CategoryGrid';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import FAQ from '@/components/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Footer from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { ReviewSchema } from '@/components/ReviewSchema';

interface IndexProps {
  currentLanguage: 'en' | 'ar';
}

const Index = ({ currentLanguage }: IndexProps) => {
  const location = useLocation();

  useEffect(() => {
    // Handle scroll to section from navigation
    if (location.state?.scrollTo) {
      const element = document.getElementById(location.state.scrollTo);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-hidden" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <SEOHead 
        title={currentLanguage === 'ar' 
          ? 'MaintMENA — منصة الصيانة والتجديد الموثوقة في السعودية'
          : 'MaintMENA — Trusted Maintenance & Renovation Platform in Saudi Arabia'
        }
        description={currentLanguage === 'ar'
          ? 'احصل على خدمات صيانة وتجديد موثوقة أو انضم كمحترف للحصول على مشاريع حقيقية. مقارنة عروض، حجز سريع، ومراجعات موثوقة'
          : 'Get trusted maintenance and renovation services or join as a professional to get real projects. Submit a request, get matched, and track the job.'
        }
        keywords="Saudi maintenance, home repair Saudi Arabia, contractors Riyadh, technicians Jeddah, home renovation, plumbers electricians Saudi, مقاولين السعودية, صيانة منازل"
        canonical="https://maintmena.com"
      />
      <main className="overflow-x-hidden">
        <Masthead currentLanguage={currentLanguage} />
        
        <section id="overview">
          <Hero 
            currentLanguage={currentLanguage} 
          />
        </section>
        
        <SearchBarHook currentLanguage={currentLanguage} />
        
        <WhyMaintMENA currentLanguage={currentLanguage} />
        
        <section id="how-it-works">
          <HowItWorks currentLanguage={currentLanguage} />
        </section>
        
        <section id="services">
          <CategoryGrid currentLanguage={currentLanguage} />
        </section>
        
        <TestimonialsSection currentLanguage={currentLanguage} />
        
        <section id="faq">
          <FAQ currentLanguage={currentLanguage} />
        </section>
        
        <FinalCTA currentLanguage={currentLanguage} />
      </main>

      <Footer currentLanguage={currentLanguage} />

      {/* Review Schema for Google Rich Results */}
      <ReviewSchema
        businessName="MaintMENA"
        businessType="ProfessionalService"
        aggregateRating={{
          ratingValue: 4.8,
          reviewCount: 127,
          bestRating: 5,
          worstRating: 1
        }}
        url="https://maintmena.com"
        description="Trusted maintenance and renovation platform connecting homeowners with verified professionals across Saudi Arabia"
        image="https://storage.googleapis.com/gpt-engineer-file-uploads/58avFXkGlXebFRFWQGQlYqeB9VG2/social-images/social-1761387330281-aint 2)-Photoroom.png"
      />
      
      {/* SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "MaintMENA",
            "description": "On-demand maintenance dispatch connecting customers with verified professionals across Saudi Arabia.",
            "url": "https://maintmena.com",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service"
            },
            "product": {
              "@type": "Product",
              "name": "MaintMENA Maintenance Dispatch",
              "description": "On-demand service dispatch for home maintenance, renovation, and construction across Saudi Arabia",
              "category": "Home Services"
            },
            "faqPage": {
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Is MaintMENA free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. Buyers can submit requests and sellers can receive dispatched jobs without a subscription plan."
                  }
                },
                {
                  "@type": "Question", 
                  "name": "How are professionals verified?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "All professionals go through identity verification, license checks, and review validation. Verified pros display a badge and are rated by real clients."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What areas does MaintMENA cover?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "MaintMENA currently serves all major cities across Saudi Arabia including Riyadh, Jeddah, Dammam, Khobar, and more."
                  }
                }
              ]
            }
          })
        }}
      />
    </div>
  );
};

export default Index;
