import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ContractsProps {
  currentLanguage: 'en' | 'ar';
}

export const Contracts = ({ currentLanguage }: ContractsProps) => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, []);

  // Deep link: /contracts?booking_id=... or ?quote_id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');
    const quoteId = params.get('quote_id');

    const resolve = async () => {
      try {
        if (bookingId) {
          const { data, error } = await supabase
            .from('contracts')
            .select('id')
            .eq('booking_id', bookingId)
            .maybeSingle();
          if (!error && data?.id) {
            navigate(`/contracts/${data.id}`);
            return;
          }
        }
        if (quoteId) {
          const { data, error } = await supabase
            .from('contracts')
            .select('id')
            .eq('quote_id', quoteId)
            .maybeSingle();
          if (!error && data?.id) {
            navigate(`/contracts/${data.id}`);
          }
        }
      } catch { }
    };

    resolve();
  }, [navigate]);
  const fetchContracts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          maintenance_requests(title),
          quote_submissions(price)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .neq('status', 'pending_buyer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? 'فشل تحميل العقود' : 'Failed to load contracts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      pending_buyer: { variant: 'outline', label: 'Pending Buyer' },
      pending_seller: { variant: 'outline', label: 'Pending Seller' },
      ready_to_sign: { variant: 'default', label: 'Ready to Sign' },
      executed: { variant: 'default', label: 'Executed' },
    };

    const s = config[status] || config.draft;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center">{currentLanguage === 'ar' ? 'جاري تحميل العقود...' : 'Loading contracts...'}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {currentLanguage === 'ar' ? 'عقودي' : 'My Contracts'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {currentLanguage === 'ar'
              ? 'عرض وإدارة عقود الخدمة الخاصة بك'
              : 'View and manage your service contracts'}
          </p>

          {/* How Contracts Work Info */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {currentLanguage === 'ar' ? 'كيف تعمل العقود' : 'How Contracts Work'}
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {currentLanguage === 'ar' ? 'يتم إنشاء العقود تلقائيًا عند قبول عرض أسعار أو حجز' : 'Contracts are auto-generated when you accept a quote or booking'}</li>
                <li>• {currentLanguage === 'ar' ? 'يجب أن يوافق الطرفان على شروط العقد' : 'Both parties must accept the contract terms'}</li>
                <li>• {currentLanguage === 'ar' ? 'بعد قبول الطرفين، يصبح العقد ملزمًا' : 'Once both parties accept, the contract becomes binding'}</li>
                <li>• {currentLanguage === 'ar' ? 'يمكنك دائمًا الوصول إليها هنا للضمان والسجلات' : 'You can always access them here for warranty and records'}</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {contracts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {currentLanguage === 'ar' ? 'لا توجد عقود بعد' : 'No contracts yet'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'سيتم إنشاء العقود تلقائيًا عند قبول عرض أسعار'
                  : 'Contracts are automatically created when you accept a quote'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {contract.maintenance_requests?.title || 'Service Contract'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(contract.status)}
                        <Badge variant="outline">v{contract.version}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Contract ID: {contract.id.slice(0, 8)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {currentLanguage === 'ar' ? 'عرض' : 'View'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p className="font-medium">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {contract.quote_submissions?.price && (
                      <div>
                        <span className="text-muted-foreground">Value:</span>
                        <p className="font-medium">
                          {contract.quote_submissions.price} SAR
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Language:</span>
                      <p className="font-medium capitalize">
                        {contract.language_mode.replace('_', ' ')}
                      </p>
                    </div>
                    {contract.executed_at && (
                      <div>
                        <span className="text-muted-foreground">Executed:</span>
                        <p className="font-medium">
                          {new Date(contract.executed_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;
