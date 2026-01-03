import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Eye, FileText, Clock, MapPin, CheckCircle2, ChevronRight, Edit3, Trash2, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QuoteTemplateManager } from '@/components/QuoteTemplateManager';

interface MyRequestsProps {
  currentLanguage: 'en' | 'ar';
}

const MyRequests = ({ currentLanguage }: MyRequestsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'assigned' | 'completed'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<any>(null);
  const [templateRequestId, setTemplateRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await sb
        .from('maintenance_requests')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading requests',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      const { error } = await sb
        .from('maintenance_requests')
        .delete()
        .eq('id', requestToDelete.id);

      if (error) throw error;

      toast({
        title: 'Request deleted',
        description: 'Your request has been successfully deleted.',
      });

      // Refresh the list
      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error deleting request',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const confirmDelete = (request: any) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const filterRequests = (status: string) => {
    if (status === 'all') return requests;
    return requests.filter(r => r.status === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'assigned': return 'secondary';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-3.5 w-3.5" />;
      case 'assigned': return <Eye className="h-3.5 w-3.5" />;
      case 'completed': return <CheckCircle2 className="h-3.5 w-3.5" />;
      default: return <FileText className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const openRequests = filterRequests('open');
  const assignedRequests = filterRequests('assigned');
  const completedRequests = filterRequests('completed');

  const filteredRequests = filterRequests(activeFilter);

  const statsData = [
    { label: currentLanguage === 'ar' ? 'المجموع' : 'Total', value: requests.length, icon: FileText, color: 'text-foreground' },
    { label: currentLanguage === 'ar' ? 'مفتوح' : 'Open', value: openRequests.length, icon: Clock, color: 'text-primary' },
    { label: currentLanguage === 'ar' ? 'معين' : 'Assigned', value: assignedRequests.length, icon: Eye, color: 'text-secondary' },
    { label: currentLanguage === 'ar' ? 'مكتمل' : 'Completed', value: completedRequests.length, icon: CheckCircle2, color: 'text-accent' },
  ];

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-paper py-8 px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {currentLanguage === 'ar' ? 'وظائفي المنشورة' : 'My Posted Jobs'}
              </h1>
              <p className="text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'إدارة طلبات الخدمة ومراجعة العروض من المحترفين'
                  : 'Manage your service requests and review quotes from pros'}
              </p>
            </div>
            <Button onClick={() => navigate('/post-job')} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              {currentLanguage === 'ar' ? 'نشر وظيفة جديدة' : 'Post New Job'}
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {statsData.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop view - keeping original layout */}
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'open', 'assigned', 'completed'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? 'default' : 'outline'}
                  onClick={() => setActiveFilter(filter)}
                  size="sm"
                >
                  {currentLanguage === 'ar'
                    ? (filter === 'all' ? 'الكل' : filter === 'open' ? 'مفتوح' : filter === 'assigned' ? 'معين' : 'مكتمل')
                    : (filter.charAt(0).toUpperCase() + filter.slice(1))}
                  ({filterRequests(filter).length})
                </Button>
              ))}
            </div>

            {filteredRequests.map(request => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{request.category}</Badge>
                        <Badge variant="outline">{request.urgency}</Badge>
                      </div>
                      <h3 className="text-xl font-semibold">{request.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentLanguage === 'ar' ? 'تم النشر' : 'Posted'} {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/job/${request.id}`}>
                          {currentLanguage === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateRequestId(request.id)}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {currentLanguage === 'ar' ? 'قالب العروض' : 'Quote Template'}
                      </Button>
                      {request.quotes_count === 0 && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/edit-request/${request.id}`}>
                            {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
                          </Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDelete(request)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm mb-4 line-clamp-2">{request.description}</p>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{request.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {currentLanguage === 'ar' ? 'الموعد النهائي:' : 'Deadline:'} {format(new Date(request.deadline), 'MMM dd')}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'المشاهدات:' : 'Views:'}
                      </span>
                      <span className="font-medium">{request.views_count}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'العروض:' : 'Quotes:'}
                      </span>
                      <span className="font-medium">{request.quotes_count}</span>
                    </div>
                  </div>

                  {request.quotes_count > 0 && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">
                        {request.quotes_count} {currentLanguage === 'ar' ? 'محترف' : 'pro'}{request.quotes_count !== 1 && currentLanguage === 'en' ? 's' : ''} {currentLanguage === 'ar' ? 'قدم عروض' : 'submitted quotes'}
                      </p>
                      <Button variant="link" className="p-0 h-auto" asChild>
                        <Link to={`/manage-quotes/${request.id}`}>
                          {currentLanguage === 'ar' ? 'مراجعة العروض ←' : 'Review Quotes →'}
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {templateRequestId && (
              <QuoteTemplateManager
                requestId={templateRequestId}
                isOpen={true}
                onClose={() => setTemplateRequestId(null)}
                currentLanguage={currentLanguage}
              />
            )}

            {filteredRequests.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {currentLanguage === 'ar' ? 'لم يتم العثور على طلبات' : 'No requests found'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeFilter === 'all'
                      ? (currentLanguage === 'ar' ? 'انشر وظيفتك الأولى للبدء' : 'Post your first job to get started')
                      : (currentLanguage === 'ar' ? `لا توجد طلبات ${activeFilter === 'open' ? 'مفتوحة' : activeFilter === 'assigned' ? 'معينة' : 'مكتملة'} حتى الآن` : `No ${activeFilter} requests yet`)}
                  </p>
                  {activeFilter === 'all' && (
                    <Button onClick={() => navigate('/post-job')}>
                      <Plus className="h-4 w-4 mr-2" />
                      {currentLanguage === 'ar' ? 'نشر وظيفة' : 'Post a Job'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mobile-optimized layout
  return (
    <div className="min-h-screen bg-paper pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">
                {currentLanguage === 'ar' ? 'وظائفي' : 'My Jobs'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {requests.length} {currentLanguage === 'ar' ? 'إجمالي الطلبات' : 'total request'}
                {requests.length !== 1 && currentLanguage === 'en' ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => navigate('/post-job')} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {currentLanguage === 'ar' ? 'نشر وظيفة' : 'Post Job'}
            </Button>
          </div>

          {/* Horizontal Scrolling Stats */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {statsData.map((stat) => (
              <Card
                key={stat.label}
                className="flex-shrink-0 w-24 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => {
                  if (stat.label === 'Total') setActiveFilter('all');
                  else setActiveFilter(stat.label.toLowerCase() as any);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col items-center text-center">
                    <stat.icon className={`h-5 w-5 mb-1.5 ${stat.color}`} />
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {(['all', 'open', 'assigned', 'completed'] as const).map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'default' : 'outline'}
              onClick={() => setActiveFilter(filter)}
              size="sm"
              className="flex-shrink-0 h-8 text-xs"
            >
              {currentLanguage === 'ar'
                ? (filter === 'all' ? 'الكل' : filter === 'open' ? 'مفتوح' : filter === 'assigned' ? 'معين' : 'مكتمل')
                : (filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1))}
              <span className="ml-1.5 opacity-70">
                {filterRequests(filter).length}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Compact Request Cards */}
      <div className="px-4 pt-4 space-y-3">
        {filteredRequests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="overflow-hidden active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/job/${request.id}`)}
            >
              <CardContent className="p-4">
                {/* Status and Category Row */}
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={getStatusColor(request.status)}
                    className="text-[10px] h-5 gap-1 px-2"
                  >
                    {getStatusIcon(request.status)}
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5 px-2">
                    {request.category}
                  </Badge>
                  {request.urgency === 'urgent' && (
                    <Badge variant="destructive" className="text-[10px] h-5 px-2">
                      Urgent
                    </Badge>
                  )}
                </div>

                {/* Title and Description */}
                <h3 className="font-semibold text-base mb-1 line-clamp-1">
                  {request.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {request.description}
                </p>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{request.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{format(new Date(request.deadline), 'MMM dd')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{request.views_count}</span>
                    <span className="text-muted-foreground">
                      {currentLanguage === 'ar' ? 'مشاهدات' : 'views'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{request.quotes_count}</span>
                    <span className="text-muted-foreground">
                      {currentLanguage === 'ar' ? 'عروض' : 'quotes'}
                    </span>
                  </div>
                </div>

                {/* Quote Template Button - Always visible on mobile */}
                <div className="mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateRequestId(request.id);
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    {currentLanguage === 'ar' ? 'قالب العروض' : 'Quote Template'}
                  </Button>
                </div>

                {/* Action Area */}
                {request.quotes_count > 0 ? (
                  <div className="bg-primary/10 -mx-4 -mb-4 px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">
                        {request.quotes_count} {currentLanguage === 'ar' ? 'عرض' : 'quote'}{request.quotes_count !== 1 && currentLanguage === 'en' ? 's' : ''} {currentLanguage === 'ar' ? 'تم استلامه' : 'received'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {currentLanguage === 'ar' ? 'انقر للمراجعة والمقارنة' : 'Tap to review and compare'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      {currentLanguage === 'ar' ? 'تم النشر' : 'Posted'} {format(new Date(request.created_at), 'MMM dd')}
                    </p>
                    <div className="flex gap-1">
                      {request.quotes_count === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-request/${request.id}`);
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                          {currentLanguage === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(request);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredRequests.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">
                {currentLanguage === 'ar' ? 'لا توجد طلبات حتى الآن' : 'No requests yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {activeFilter === 'all'
                  ? (currentLanguage === 'ar' ? 'ابدأ بنشر طلب وظيفتك الأولى' : 'Start by posting your first job request')
                  : (currentLanguage === 'ar' ? `لا توجد طلبات ${activeFilter === 'open' ? 'مفتوحة' : activeFilter === 'assigned' ? 'معينة' : 'مكتملة'} في الوقت الحالي` : `No ${activeFilter} requests at the moment`)}
              </p>
              {activeFilter === 'all' && (
                <Button onClick={() => navigate('/post-job')} size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {currentLanguage === 'ar' ? 'انشر وظيفتك الأولى' : 'Post Your First Job'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentLanguage === 'ar' ? 'حذف الطلب' : 'Delete Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentLanguage === 'ar'
                ? `هل أنت متأكد من حذف "${requestToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${requestToDelete?.title}"? This action cannot be undone.`}
              {requestToDelete?.quotes_received > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  {currentLanguage === 'ar'
                    ? `تحذير: هذا الطلب يحتوي على ${requestToDelete.quotes_received} عرض سيتأثر أيضاً.`
                    : `Warning: This request has ${requestToDelete.quotes_received} quote(s) that will also be affected.`}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quote Template Manager Modal */}
      {templateRequestId && (
        <QuoteTemplateManager
          requestId={templateRequestId}
          isOpen={!!templateRequestId}
          currentLanguage={currentLanguage}
          onClose={() => setTemplateRequestId(null)}
        />
      )}
    </div>
  );
};

export default MyRequests;
