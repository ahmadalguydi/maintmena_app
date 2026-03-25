import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useBriefData } from '@/hooks/useBriefData';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { LockedContent } from '@/components/LockedContent';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  TrendingUp,
  FileText,
  Phone,
  Mail as MailIcon,
  AlertCircle,
  Bookmark,
  ExternalLink,
  Lock,
  BookOpen,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createSafeHtml } from '@/lib/sanitize';

interface BriefsProps {
  currentLanguage: 'en' | 'ar';
}

interface Brief {
  id: string;
  title: string;
  content: string;
  publication_date: string;
  status: string;
  tags?: string[];
}

const Briefs = ({ currentLanguage }: BriefsProps) => {
  const { user, loading: authLoading, userType } = useAuth();
  const { hasAccess, isOnTrial, subscription, loading: subLoading } = useSubscription();
  const { latestBrief, signals, tenders, loading: dataLoading } = useBriefData();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [archivedBriefs, setArchivedBriefs] = useState<Brief[]>([]);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [trackedItems, setTrackedItems] = useState<Set<string>>(new Set());
  const [archiveSearch, setArchiveSearch] = useState("");

  const loading = authLoading || subLoading || dataLoading;
  const canAccessArchive = hasAccess('professional') || isOnTrial;
  // Allow admin and any seller (regardless of subscription tier for now)
  const canAccessBriefs = userType === 'admin' || userType === 'seller';

  // Debug logging for archive access
  console.debug('Briefs Archive Access Debug:', {
    hasProfessionalAccess: hasAccess('professional'),
    isOnTrial,
    canAccessArchive,
    subscription: subscription ? {
      tier: subscription.tier,
      status: subscription.status,
      trial_ends_at: subscription.trial_ends_at,
      subscription_ends_at: subscription.subscription_ends_at
    } : null
  });

  const handleTrackItem = async (itemId: string, itemType: 'signal' | 'tender') => {
    if (!user) return;

    try {
      const isTracked = trackedItems.has(itemId);

      if (isTracked) {
        await supabase
          .from('tracked_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId);

        setTrackedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        toast.success('Removed from tracking');
      } else {
        await supabase
          .from('tracked_items')
          .insert({
            user_id: user.id,
            item_id: itemId,
            item_type: itemType
          });

        setTrackedItems(prev => new Set(prev).add(itemId));
        toast.success('Added to tracking');
      }
    } catch (error) {
      toast.error('Failed to update tracking');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    if (!loading && user && !canAccessBriefs) {
      toast.error('This page is only accessible to sellers and admins');
      navigate('/seller-dashboard');
    }
  }, [user, loading, navigate, canAccessBriefs]);

  useEffect(() => {
    if (user) {
      fetchTrackedItems();
      fetchArchivedBriefs();
    }
  }, [user]);

  useEffect(() => {
    // Check if there's a briefId in the URL params
    const briefId = searchParams.get('briefId');
    if (briefId) {
      setSelectedBriefId(briefId);
    } else if (latestBrief) {
      setSelectedBriefId(latestBrief.id);
    }
  }, [searchParams, latestBrief]);

  const fetchTrackedItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tracked_items')
      .select('item_id')
      .eq('user_id', user.id);

    if (data) {
      setTrackedItems(new Set(data.map(item => item.item_id)));
    }
  };

  const fetchArchivedBriefs = async () => {
    const { data } = await supabase
      .from('briefs')
      .select('*')
      .in('status', ['published', 'archived'])
      .order('publication_date', { ascending: false });

    if (data) {
      setArchivedBriefs(data);
    }
  };

  const displayedBrief = selectedBriefId
    ? archivedBriefs.find(b => b.id === selectedBriefId) || latestBrief
    : latestBrief;

  const displayedSignals = selectedBriefId === latestBrief?.id || selectedBriefId === null
    ? signals
    : [];

  const displayedTenders = selectedBriefId === latestBrief?.id || selectedBriefId === null
    ? tenders
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentDate = new Date().toLocaleDateString(
    currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );

  return (
    <div className="min-h-screen bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/seller-dashboard">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentLanguage === 'ar' ? 'العودة' : 'Back'}
          </Button>
        </Link>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Header */}
            <div className="text-center border-b border-rule pb-6 mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-masthead text-ink mb-2"
              >
                {currentLanguage === 'ar' ? 'مينت مينا' : 'MaintMENA'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-dek"
              >
                {currentLanguage === 'ar'
                  ? 'ملخص الفرص الأسبوعية لمحترفي الخدمات'
                  : 'Weekly Opportunities Digest for Service Professionals'
                }
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-6 text-sm text-muted-foreground mt-4"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{currentDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{currentLanguage === 'ar' ? '٨ دقائق قراءة' : '8 min read'}</span>
                </div>
              </motion.div>
            </div>

            <div className="flex justify-center gap-3 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success(currentLanguage === 'ar' ? 'تم نسخ الرابط' : 'Link copied to clipboard');
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {currentLanguage === 'ar' ? 'مشاركة' : 'Share'}
              </Button>
            </div>

            {/* Current Brief Content */}
            {displayedBrief ? (
              <>
                <Card className="border-rule mb-8">
                  <CardHeader>
                    <CardTitle className="text-2xl">{displayedBrief.title}</CardTitle>
                    <CardDescription>
                      {new Date(displayedBrief.publication_date).toLocaleDateString(
                        currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
                        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none text-ink"
                      dangerouslySetInnerHTML={createSafeHtml(displayedBrief.content)}
                    />
                  </CardContent>
                </Card>

                {/* Signals Section */}
                {displayedSignals.length > 0 && (
                  <Card className="border-rule mb-8">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        {currentLanguage === 'ar' ? 'إشارات هذا الأسبوع' : "This Week's Signals"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {displayedSignals.map((signal) => (
                        <div key={signal.id} className="p-4 border border-rule rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-ink mb-1">{signal.company_name}</h3>
                              <Badge variant={
                                signal.urgency === 'high' ? 'destructive' :
                                  signal.urgency === 'medium' ? 'default' : 'secondary'
                              }>
                                {signal.urgency.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{signal.description}</p>
                          <div className="space-y-2 text-sm">
                            {signal.estimated_value && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{currentLanguage === 'ar' ? 'القيمة المقدرة:' : 'Est. Value:'}</span>
                                <span className="text-primary font-semibold">{signal.estimated_value}</span>
                              </div>
                            )}
                            {signal.location && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{currentLanguage === 'ar' ? 'الموقع:' : 'Location:'}</span>
                                <span>{signal.location}</span>
                              </div>
                            )}
                            {(signal.contact_name || signal.contact_email || signal.contact_phone) && (
                              <div className="pt-2 border-t border-rule">
                                <p className="font-medium mb-1">{currentLanguage === 'ar' ? 'معلومات الاتصال:' : 'Contact:'}</p>
                                {signal.contact_name && <p className="text-sm">{signal.contact_name}</p>}
                                {signal.contact_email && (
                                  <a href={`mailto:${signal.contact_email}`} className="flex items-center gap-1 text-accent hover:underline">
                                    <MailIcon className="w-3 h-3" />
                                    {signal.contact_email}
                                  </a>
                                )}
                                {signal.contact_phone && (
                                  <a href={`tel:${signal.contact_phone}`} className="flex items-center gap-1 text-accent hover:underline">
                                    <Phone className="w-3 h-3" />
                                    {signal.contact_phone}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant={trackedItems.has(signal.id) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTrackItem(signal.id, 'signal')}
                            >
                              <Bookmark className="w-4 h-4 mr-1" />
                              {trackedItems.has(signal.id)
                                ? (currentLanguage === 'ar' ? 'متتبع' : 'Tracked')
                                : (currentLanguage === 'ar' ? 'تتبع' : 'Track')
                              }
                            </Button>
                            {signal.source_link && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={signal.source_link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  {currentLanguage === 'ar' ? 'المصدر' : 'Source'}
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Tenders Section */}
                {displayedTenders.length > 0 && (
                  <Card className="border-rule">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-accent-2" />
                        {currentLanguage === 'ar' ? 'المناقصات الرسمية' : 'Official Tenders'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {displayedTenders.map((tender) => (
                        <div key={tender.id} className="p-4 border border-rule rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">{tender.tender_number}</p>
                              <h3 className="font-semibold text-ink mb-2">{tender.title}</h3>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{tender.description}</p>
                          <div className="space-y-2 text-sm">
                            {(tender.value_min || tender.value_max) && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{currentLanguage === 'ar' ? 'القيمة:' : 'Value:'}</span>
                                <span className="text-primary font-semibold">
                                  {tender.value_min && tender.value_max
                                    ? `${formatAmount(tender.value_min)} - ${formatAmount(tender.value_max)}`
                                    : tender.value_max
                                      ? formatAmount(tender.value_max)
                                      : formatAmount(tender.value_min || 0)
                                  }
                                </span>
                              </div>
                            )}
                            {tender.location && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{currentLanguage === 'ar' ? 'الموقع:' : 'Location:'}</span>
                                <span>{tender.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium">
                                {currentLanguage === 'ar' ? 'الموعد النهائي:' : 'Deadline:'} {' '}
                                {new Date(tender.submission_deadline).toLocaleDateString(
                                  currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
                                  { year: 'numeric', month: 'long', day: 'numeric' }
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant={trackedItems.has(tender.id) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTrackItem(tender.id, 'tender')}
                            >
                              <Bookmark className="w-4 h-4 mr-1" />
                              {trackedItems.has(tender.id)
                                ? (currentLanguage === 'ar' ? 'متتبع' : 'Tracked')
                                : (currentLanguage === 'ar' ? 'تتبع' : 'Track')
                              }
                            </Button>
                            {tender.source_link && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={tender.source_link} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  {currentLanguage === 'ar' ? 'المصدر' : 'Source'}
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-rule">
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {currentLanguage === 'ar' ? 'لا توجد ملخصات متاحة' : 'No briefs available'}
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Archived Briefs Section */}
          {archivedBriefs.length > 0 && (
            <Card className="border-rule">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-2xl font-display">
                    <FileText className="w-6 h-6" />
                    {currentLanguage === 'ar' ? 'أرشيف الموجزات' : 'Brief Archive'}
                  </CardTitle>
                  <Badge variant="secondary">
                    {archivedBriefs.length - 1} {currentLanguage === 'ar' ? 'إصدار' : 'Issues'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-2">
                  {currentLanguage === 'ar'
                    ? 'تصفح الإصدارات السابقة من الموجز الصناعي'
                    : 'Browse past editions of the Industrial Brief'}
                </p>
                {!canAccessArchive && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {currentLanguage === 'ar'
                      ? 'ترقية إلى الباقة الاحترافية للوصول إلى جميع الموجزات المؤرشفة'
                      : 'Upgrade to Professional tier to access all archived briefs'}
                  </p>
                )}
                {canAccessArchive && (
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={currentLanguage === 'ar' ? 'البحث في الموجزات المؤرشفة...' : 'Search archived briefs...'}
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {archivedBriefs.slice(1).filter((brief) => {
                    if (!archiveSearch) return true;
                    const searchLower = archiveSearch.toLowerCase();
                    return (
                      brief.title.toLowerCase().includes(searchLower) ||
                      brief.content.toLowerCase().includes(searchLower) ||
                      brief.tags?.some(tag => tag.toLowerCase().includes(searchLower))
                    );
                  }).map((brief, index) => {
                    const isLocked = !canAccessArchive;
                    const isSelected = selectedBriefId === brief.id;
                    const briefDate = new Date(brief.publication_date);
                    const briefNumber = archivedBriefs.length - index - 1;

                    return (
                      <motion.article
                        key={brief.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border rounded-lg p-6 hover:shadow-lg transition-all ${isSelected ? 'border-accent-2 bg-accent/10' : 'border-rule'
                          } ${isLocked ? 'opacity-60' : 'cursor-pointer'}`}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedBriefId(brief.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                      >
                        <div className="grid md:grid-cols-4 gap-6">
                          {/* Issue Info */}
                          <div className="md:col-span-1">
                            <div className="text-center md:text-left">
                              <div className="text-2xl font-display font-bold text-accent-2 mb-2">
                                #{briefNumber.toString().padStart(3, '0')}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {briefDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="md:col-span-2">
                            <h2 className="text-xl font-display font-semibold mb-3">
                              {brief.title}
                            </h2>
                            <div
                              className="text-muted-foreground mb-4 line-clamp-2"
                              dangerouslySetInnerHTML={createSafeHtml(brief.content.substring(0, 200) + '...')}
                            />

                            {/* Tags */}
                            {brief.tags && brief.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {brief.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="md:col-span-1 flex md:flex-col justify-center items-center gap-4">
                            {isLocked ? (
                              <Button
                                className="w-full md:w-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/pricing');
                                }}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                {currentLanguage === 'ar' ? 'اشترك' : 'Subscribe'}
                              </Button>
                            ) : (
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                className="w-full md:w-auto"
                              >
                                <BookOpen className="w-4 h-4 mr-2" />
                                {currentLanguage === 'ar' ? 'اقرأ' : 'Read'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>

                {!canAccessArchive && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-rule text-center">
                    <Button
                      variant="default"
                      onClick={() => navigate('/pricing')}
                      className="w-full"
                    >
                      {currentLanguage === 'ar' ? 'ترقية الآن' : 'Upgrade Now'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Briefs;
