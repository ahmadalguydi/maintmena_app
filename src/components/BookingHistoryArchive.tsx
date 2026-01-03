import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  RotateCcw,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import BookingRequestModal from './BookingRequestModal';


interface ArchivedBooking {
  id: string;
  service_category: string;
  job_description: string;
  location_city?: string;
  status: string;
  payment_status?: string;
  final_amount?: number;
  completed_at?: string;
  created_at: string;
  seller_id: string;
  seller_name?: string;
  seller_company?: string;
}

interface BookingHistoryArchiveProps {
  currentLanguage?: 'en' | 'ar';
}

export const BookingHistoryArchive = ({ currentLanguage = 'en' }: BookingHistoryArchiveProps) => {
  const { user } = useAuth();
  const [archivedBookings, setArchivedBookings] = useState<ArchivedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebookVendor, setRebookVendor] = useState<any>(null);
  const [showRebookModal, setShowRebookModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchArchivedBookings();
    }
  }, [user]);

  const fetchArchivedBookings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Fetch seller profiles
      const sellerIds = Array.from(new Set((data || []).map((b: any) => b.seller_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (sellerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', sellerIds);
        profilesMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }

      const formatted = (data || []).map((b: any) => ({
        ...b,
        seller_name: profilesMap[b.seller_id]?.full_name,
        seller_company: profilesMap[b.seller_id]?.company_name
      }));

      setArchivedBookings(formatted);
    } catch (error) {
      console.error('Error fetching archived bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRebook = async (booking: ArchivedBooking) => {
    // Fetch seller profile for rebooking
    const { data: seller } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', booking.seller_id)
      .single();

    if (seller) {
      setRebookVendor(seller);
      setShowRebookModal(true);
    }
  };

  const completedBookings = archivedBookings.filter(b => b.status === 'completed');
  const cancelledBookings = archivedBookings.filter(b => b.status === 'cancelled');

  if (loading) {
    return (
      <Card className="border-rule">
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground">{currentLanguage === 'ar' ? 'جاري تحميل السجل...' : 'Loading history...'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-rule">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-accent" />
            Booking History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="completed">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Completed ({completedBookings.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-2">
                <XCircle className="w-4 h-4" />
                Cancelled ({cancelledBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completedBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No completed bookings</p>
                </div>
              ) : (
                completedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border border-rule rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-ink capitalize mb-1">
                          {booking.service_category?.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {booking.seller_company || booking.seller_name}
                        </p>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      {booking.completed_at && (
                        <div>
                          <span className="text-muted-foreground">Completed: </span>
                          <span className="font-medium">
                            {format(new Date(booking.completed_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                      {booking.final_amount && (
                        <div>
                          <span className="text-muted-foreground">Paid: </span>
                          <span className="font-medium text-green-600">
                            ${booking.final_amount}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRebook(booking)}
                      className="w-full gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Re-book This Vendor
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-3 mt-4">
              {cancelledBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No cancelled bookings</p>
                </div>
              ) : (
                cancelledBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border border-rule rounded-lg opacity-75"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-ink capitalize mb-1">
                          {booking.service_category?.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {booking.seller_company || booking.seller_name}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Cancelled
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Created: {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rebook Modal */}
      {rebookVendor && (
        <BookingRequestModal
          open={showRebookModal}
          onOpenChange={setShowRebookModal}
          vendor={rebookVendor}
          currentLanguage={currentLanguage}
          onSuccess={() => {
            setShowRebookModal(false);
            setRebookVendor(null);
          }}
        />
      )}
    </>
  );
};
