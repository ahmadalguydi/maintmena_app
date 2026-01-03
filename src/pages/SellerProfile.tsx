import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { 
  Star, 
  MapPin, 
  Calendar, 
  Award, 
  Briefcase, 
  ExternalLink,
  CheckCircle,
  MessageSquare,
  ArrowLeft,
  Globe,
  Linkedin,
  CalendarCheck,
  Zap,
  Clock,
  Target,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import BookingRequestModal from '@/components/BookingRequestModal';
import { getCategoryLabel, getCategoryIcon } from '@/lib/serviceCategories';
import { ReviewSchema } from '@/components/ReviewSchema';
import { SEOHead } from '@/components/SEOHead';

interface SellerProfileProps {
  currentLanguage: 'en' | 'ar';
}

interface SellerProfile {
  id: string;
  full_name: string;
  company_name: string;
  company_description: string;
  bio: string;
  email: string;
  phone: string;
  seller_rating: number;
  verified_seller: boolean;
  years_of_experience: number;
  specializations: string[];
  certifications: string[];
  portfolio_items: any[];
  completed_projects: number;
  response_time_hours: number;
  website_url: string;
  linkedin_url: string;
  show_past_work: boolean;
  service_focus: string[];
  crew_size_range: string;
  discoverable: boolean;
  service_categories: string[];
  service_radius_km: number;
  instant_booking_enabled: boolean;
  availability_status: string;
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  buyer: {
    full_name: string;
    company_name: string;
  };
}

const SellerProfile = ({ currentLanguage }: SellerProfileProps) => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const getTranslatedField = (obj: any, field: string) => {
    if (!obj) return '';
    const arField = `${field}_ar`;
    const enField = `${field}_en`;
    
    if (currentLanguage === 'ar' && obj[arField]) {
      return obj[arField];
    } else if (currentLanguage === 'en' && obj[enField]) {
      return obj[enField];
    }
    return obj[field] || '';
  };
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    if (sellerId) {
      loadSellerProfile();
      loadSellerReviews();
    }
  }, [sellerId]);

  const loadSellerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error) throw error;
      setProfile({
        ...data,
        portfolio_items: (data.portfolio_items as any) || []
      } as SellerProfile);
    } catch (error) {
      console.error('Error loading seller profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load seller profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSellerReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('seller_reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          buyer:profiles!seller_reviews_buyer_id_fkey (
            full_name,
            company_name
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews((data as any) || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>
              {currentLanguage === 'en' ? 'Profile Not Available' : 'الملف الشخصي غير متاح'}
            </CardTitle>
            <CardDescription>
              {currentLanguage === 'en' 
                ? "This vendor hasn't completed their profile yet."
                : 'لم يكمل هذا البائع ملفه الشخصي بعد.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              {currentLanguage === 'en' ? 'Go Back' : 'العودة'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const getAvailabilityBadge = () => {
    switch (profile.availability_status) {
      case 'accepting_requests':
        return { variant: 'default' as const, text: '🟢 Available Now', color: 'bg-green-500' };
      case 'busy':
        return { variant: 'secondary' as const, text: '🟡 Busy', color: 'bg-yellow-500' };
      case 'not_available':
        return { variant: 'outline' as const, text: '🔴 Not Available', color: 'bg-red-500' };
      default:
        return { variant: 'outline' as const, text: 'Unknown', color: 'bg-gray-500' };
    }
  };

  const availabilityInfo = getAvailabilityBadge();

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : profile.seller_rating || 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <SEOHead
        title={`${profile.company_name || profile.full_name} - Professional Maintenance Services | MaintMENA`}
        description={`${profile.company_name || profile.full_name} - Verified professional with ${profile.completed_projects || 0} completed projects. ${avgRating.toFixed(1)} star rating from ${reviews.length} reviews.`}
        canonical={`https://maintmena.com/seller/${sellerId}`}
      />

      {reviews.length > 0 && (
        <ReviewSchema
          businessName={profile.company_name || profile.full_name}
          businessType="ProfessionalService"
          aggregateRating={{
            ratingValue: avgRating,
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1
          }}
          url={`https://maintmena.com/seller/${sellerId}`}
          description={profile.bio || profile.company_description}
          reviews={reviews.map(review => ({
            author: review.buyer?.full_name || review.buyer?.company_name || 'Anonymous',
            rating: review.rating,
            reviewBody: review.review_text,
            datePublished: new Date(review.created_at).toISOString().split('T')[0]
          }))}
        />
      )}

      <div className="container mx-auto max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                  </Avatar>
                  {/* Availability indicator */}
                  <div className={`absolute bottom-0 right-0 w-6 h-6 ${availabilityInfo.color} rounded-full border-4 border-background`}></div>
                </div>

                  <div className="flex-1">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h1 className="text-3xl font-bold">{getTranslatedField(profile, 'full_name')}</h1>
                          {profile.verified_seller && (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          )}
                        </div>
                        {profile.company_name && (
                          <p className="text-lg text-muted-foreground mb-2">{getTranslatedField(profile, 'company_name')}</p>
                        )}
                        {/* Availability Status Badge */}
                        <Badge variant={availabilityInfo.variant} className="text-sm">
                          {availabilityInfo.text}
                        </Badge>
                      </div>
                    {user && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {profile.availability_status === 'accepting_requests' ? (
                          <Button 
                            size="lg"
                            variant="default" 
                            onClick={() => setBookingModalOpen(true)}
                            className="gap-2"
                          >
                            {profile.instant_booking_enabled && <Zap className="w-4 h-4" />}
                            <CalendarCheck className="w-4 h-4" />
                            {profile.instant_booking_enabled ? 'Book Instantly' : 'Request Booking'}
                          </Button>
                        ) : (
                          <Button 
                            size="lg"
                            variant="outline" 
                            disabled
                            className="gap-2"
                          >
                            <CalendarCheck className="w-4 h-4" />
                            Currently Unavailable
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={() => {
                            if (!user) {
                              toast({
                                title: 'Login Required',
                                description: 'Please login to contact this seller',
                                variant: 'destructive'
                              });
                              navigate('/login');
                              return;
                            }
                            // Open contact options
                            if (profile.email) {
                              window.location.href = `mailto:${profile.email}`;
                            } else if (profile.phone) {
                              window.location.href = `tel:${profile.phone}`;
                            } else {
                              toast({
                                title: 'Contact Information Unavailable',
                                description: 'This seller has not provided contact information',
                                variant: 'destructive'
                              });
                            }
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Contact
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {renderStars(Math.round(profile.seller_rating || 0))}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{profile.seller_rating?.toFixed(1) || '0.0'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {reviews.length > 0 
                            ? `(${reviews.length} ${currentLanguage === 'ar' ? 'تقييم' : 'reviews'})` 
                            : `(${currentLanguage === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet'})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{profile.completed_projects || 0}</p>
                        <p className="text-xs text-muted-foreground truncate">Projects</p>
                      </div>
                    </div>
                    {profile.response_time_hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{profile.response_time_hours}h</p>
                          <p className="text-xs text-muted-foreground truncate">Response Time</p>
                        </div>
                      </div>
                    )}
                    {profile.service_radius_km && (
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{profile.service_radius_km} km</p>
                          <p className="text-xs text-muted-foreground truncate">Service Radius</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.instant_booking_enabled && (
                      <Badge variant="default" className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                        <Zap className="w-3 h-3" />
                        Instant Booking
                      </Badge>
                    )}
                    {profile.verified_seller && (
                      <Badge variant="default" className="gap-1">
                        ✅ Verified
                      </Badge>
                    )}
                    {profile.seller_rating >= 4.5 && (
                      <Badge variant="default" className="gap-1">
                        ⭐ Top Rated
                      </Badge>
                    )}
                    {profile.response_time_hours && profile.response_time_hours <= 2 && (
                      <Badge variant="default" className="gap-1">
                        ⚡ Fast Responder
                      </Badge>
                    )}
                    {profile.service_focus?.includes('home') && (
                      <Badge variant="outline">
                        🏠 Home Services
                      </Badge>
                    )}
                    {profile.service_focus?.includes('project') && (
                      <Badge variant="outline">
                        🏗️ Project Work
                      </Badge>
                    )}
                    {profile.crew_size_range && (
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {profile.crew_size_range}
                      </Badge>
                    )}
                    {profile.years_of_experience && (
                      <Badge variant="secondary" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {profile.years_of_experience} years
                      </Badge>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-muted-foreground mb-4">{getTranslatedField(profile, 'bio')}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {profile.website_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                    {profile.linkedin_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Service Categories */}
            {profile.service_categories && profile.service_categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Service Categories
                  </CardTitle>
                  <CardDescription>
                    Services this professional offers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {profile.service_categories.map((category, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/30">
                        <span className="text-lg">{getCategoryIcon(category)}</span>
                        <span className="text-sm font-medium">{getCategoryLabel(category, currentLanguage)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specializations */}
            {profile.specializations && profile.specializations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Specializations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.map((spec, idx) => (
                      <Badge key={idx} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {profile.certifications.map((cert, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Company Description */}
            {profile.company_description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {profile.company_description}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            {profile.show_past_work && profile.portfolio_items && profile.portfolio_items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.portfolio_items.map((item, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    {item.details && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{item.details}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No portfolio items available</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold">{review.buyer.full_name}</p>
                        {review.buyer.company_name && (
                          <p className="text-sm text-muted-foreground">{review.buyer.company_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {renderStars(review.rating)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-muted-foreground">{review.review_text}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No reviews yet</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Request Modal */}
      {profile && (
        <BookingRequestModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          vendor={profile}
          currentLanguage={currentLanguage}
          onSuccess={() => {
            setBookingModalOpen(false);
            toast({
              title: 'Booking request sent!',
              description: `Your request has been sent to ${profile.company_name || profile.full_name}`,
            });
          }}
        />
      )}
    </div>
  );
};

export default SellerProfile;
