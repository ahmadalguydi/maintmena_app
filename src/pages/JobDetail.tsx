import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, DollarSign, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobDetailProps {
  currentLanguage: 'en' | 'ar';
}

interface QuoteSection {
  id: string;
  name: string;
  label: string;
  required: boolean;
  enabled: boolean;
  placeholder?: string;
}

const JobDetail = ({ currentLanguage }: JobDetailProps) => {
  const { id } = useParams<{ id: string }>();
  const { user, userType } = useAuth();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [hasQuoted, setHasQuoted] = useState(false);
  const [proposedStartDate, setProposedStartDate] = useState<Date>();
  const [templateSections, setTemplateSections] = useState<QuoteSection[]>([]);

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

  const isBuyer = userType === 'buyer';
  const isSeller = userType === 'seller';

  const [quoteData, setQuoteData] = useState<Record<string, any>>({
    proposed_price: '',
    proposed_timeline_days: '',
  });

  useEffect(() => {
    if (id && user) {
      fetchRequestDetails();
      checkIfQuoted();
      incrementViews();
      if (isSeller) {
        fetchQuoteTemplate();
      }
    }
  }, [id, user, isSeller]);

  const fetchRequestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setRequest(data);
    } catch (error: any) {
      toast({
        title: 'Error loading request',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteTemplate = async () => {
    if (!id) return;

    try {
      const { data } = await supabase
        .from('request_quote_templates')
        .select('sections')
        .eq('request_id', id)
        .maybeSingle();

      if (data?.sections) {
        setTemplateSections((data.sections as any[]).filter((s: QuoteSection) => s.enabled));
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    }
  };

  const checkIfQuoted = async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('quote_submissions')
        .select('id')
        .eq('request_id', id)
        .eq('seller_id', user.id)
        .maybeSingle();

      setHasQuoted(!!data);
    } catch (error) {
      // No quote found - this is fine
    }
  };

  const incrementViews = async () => {
    if (!id || !user) return;

    try {
      await supabase
        .from('request_views')
        .upsert({ request_id: id, user_id: user.id }, { onConflict: 'request_id,user_id' });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !id) return;

    // Validate required fields
    const requiredSections = templateSections.filter(s => s.required);
    for (const section of requiredSections) {
      if (!quoteData[section.name] || quoteData[section.name].trim() === '') {
        toast({
          title: 'Missing Required Field',
          description: `Please fill in the ${section.label} field`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Build the submission object with all template fields
      const submissionData: Record<string, any> = {
        request_id: id,
        seller_id: user.id,
        price: parseFloat(quoteData.proposed_price),
        estimated_duration: `${quoteData.proposed_timeline_days} days`,
        proposal: quoteData.cover_letter || '',
      };

      // Add standard template fields if they exist
      if (quoteData.cover_letter) submissionData.cover_letter = quoteData.cover_letter;
      if (quoteData.technical_approach) submissionData.technical_approach = quoteData.technical_approach;
      if (quoteData.team_experience) submissionData.team_experience = quoteData.team_experience;
      if (quoteData.certifications) submissionData.certifications = quoteData.certifications;
      if (quoteData.timeline_details) submissionData.timeline_details = quoteData.timeline_details;
      if (quoteData.client_references) submissionData.client_references = quoteData.client_references;

      // Add custom sections
      const customSections: Record<string, any> = {};
      templateSections.forEach(section => {
        if (section.id.startsWith('custom_') && quoteData[section.name]) {
          customSections[section.name] = quoteData[section.name];
        }
      });

      if (Object.keys(customSections).length > 0) {
        submissionData.custom_sections = customSections;
      }

      const { error } = await supabase
        .from('quote_submissions')
        .insert(submissionData as any);

      if (error) throw error;

      // Auto-track the request after submitting quote
      const { error: trackError } = await supabase
        .from('tracked_items')
        .insert({
          user_id: user.id,
          item_id: id,
          item_type: 'tender'
        })
        .select()
        .single();

      // Ignore duplicate tracking errors
      if (trackError && !trackError.message.includes('duplicate')) {
        console.warn('Failed to auto-track request:', trackError);
      }

      toast({
        title: 'Quote submitted successfully!',
        description: 'The client will review your proposal',
      });

      setHasQuoted(true);
      navigate('/seller-dashboard');
    } catch (error: any) {
      toast({
        title: 'Error submitting quote',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (section: QuoteSection) => {
    const isTextarea = ['cover_letter', 'technical_approach', 'team_experience', 'timeline_details', 'client_references'].includes(section.name) || section.id.startsWith('custom_');

    return (
      <div key={section.id} className="space-y-2">
        <Label htmlFor={section.name}>
          {section.label} {section.required && <span className="text-destructive">*</span>}
        </Label>
        {isTextarea ? (
          <Textarea
            id={section.name}
            placeholder={section.placeholder}
            rows={4}
            value={quoteData[section.name] || ''}
            onChange={(e) => setQuoteData(prev => ({ ...prev, [section.name]: e.target.value }))}
            required={section.required}
          />
        ) : (
          <Input
            id={section.name}
            placeholder={section.placeholder}
            value={quoteData[section.name] || ''}
            onChange={(e) => setQuoteData(prev => ({ ...prev, [section.name]: e.target.value }))}
            required={section.required}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">{currentLanguage === 'ar' ? 'الطلب غير موجود' : 'Request not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
          ← Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={request.urgency === 'critical' ? 'destructive' : 'default'}>
                        {request.urgency.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{request.category}</Badge>
                    </div>
                    <CardTitle className="text-2xl font-display">{getTranslatedField(request, 'title')}</CardTitle>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {request.buyer_type === 'individual' ? (
                        <div className="flex items-center gap-2 px-3 py-1 h-8 rounded-full bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/40">
                          <span className="text-lg">👤</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-accent leading-tight">Individual Client</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">Personal Project</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1 h-8 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40">
                          <span className="text-lg">🏢</span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-primary leading-tight">{request.buyer_company_name || 'Company Client'}</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">Business Account</span>
                          </div>
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Posted {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm whitespace-pre-line">{getTranslatedField(request, 'description')}</p>
                </div>

                {request.scope_of_work && (
                  <div>
                    <h3 className="font-semibold mb-2">Scope of Work</h3>
                    <p className="text-sm whitespace-pre-line">{request.scope_of_work}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{request.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Deadline</p>
                      <p className="text-sm text-muted-foreground">
                        {request.deadline ? format(new Date(request.deadline), 'MMM dd, yyyy') : (currentLanguage === 'ar' ? 'مرن' : 'Flexible')}
                      </p>
                    </div>
                  </div>

                  {(request.estimated_budget_min || request.estimated_budget_max) && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Budget Range</p>
                        <p className="text-sm text-muted-foreground">
                          {request.estimated_budget_min && request.estimated_budget_max
                            ? `${formatAmount(request.estimated_budget_min)} - ${formatAmount(request.estimated_budget_max)}`
                            : formatAmount(request.estimated_budget_min || request.estimated_budget_max)}
                        </p>
                      </div>
                    </div>
                  )}

                  {request.facility_type && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Facility Type</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {request.facility_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quote Form - Only for sellers */}
            {isSeller && !hasQuoted ? (
              <Card>
                <CardHeader>
                  <CardTitle>Submit Your Quote</CardTitle>
                  {templateSections.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Please complete all required sections as specified by the buyer
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitQuote} className="space-y-6">
                    {/* Price and Timeline - Always required */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Proposed Price (SAR) <span className="text-destructive">*</span></Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="25000"
                          value={quoteData.proposed_price}
                          onChange={(e) => setQuoteData(prev => ({ ...prev, proposed_price: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timeline">Timeline (days) <span className="text-destructive">*</span></Label>
                        <Input
                          id="timeline"
                          type="number"
                          placeholder="30"
                          value={quoteData.proposed_timeline_days}
                          onChange={(e) => setQuoteData(prev => ({ ...prev, proposed_timeline_days: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Proposed Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !proposedStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {proposedStartDate ? format(proposedStartDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={proposedStartDate}
                            onSelect={setProposedStartDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Dynamic template sections */}
                    {templateSections.length > 0 ? (
                      templateSections.map(section => renderFormField(section))
                    ) : (
                      // Default form if no template is set
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="cover">Cover Letter <span className="text-destructive">*</span></Label>
                          <Textarea
                            id="cover"
                            placeholder="Introduce yourself and explain why you're the best fit..."
                            rows={4}
                            value={quoteData.cover_letter || ''}
                            onChange={(e) => setQuoteData(prev => ({ ...prev, cover_letter: e.target.value }))}
                            required
                          />
                        </div>
                      </>
                    )}

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Quote'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : isSeller ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Quote Already Submitted</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You've already submitted a quote for this job
                  </p>
                  <Button onClick={() => navigate('/seller-dashboard')}>
                    View My Quotes
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quotes Received</span>
                  <span className="font-medium">{request.quotes_received}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-medium">{request.views_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{request.status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{request.profiles?.company_name || 'Company'}</p>
                  {request.profiles?.verified_seller && (
                    <Badge variant="secondary" className="mt-2">✓ Verified</Badge>
                  )}
                </div>
                {request.profiles?.seller_rating > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="font-medium">⭐ {request.profiles.seller_rating.toFixed(1)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
