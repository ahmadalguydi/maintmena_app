import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, CheckCircle, Clock, User, Building, Calendar, DollarSign, FileCheck, Shield, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { BindingTermsDrawer } from '@/components/contracts/BindingTermsDrawer';
import { SignatureModal } from '@/components/SignatureModal';
import { SignatureDisplay } from '@/components/contracts/SignatureDisplay';
import { CompletionWorkflowCard } from '@/components/CompletionWorkflowCard';
import { trackContractSigned } from '@/lib/brevoAnalytics';
import { createSafeHtml } from '@/lib/sanitize';

interface ContractDetailProps {
  currentLanguage: 'en' | 'ar';
}

export function ContractDetail({ currentLanguage }: ContractDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contract, setContract] = useState<any>(null);
  const [bindingTerms, setBindingTerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isTermsDrawerOpen, setIsTermsDrawerOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [linkedRequest, setLinkedRequest] = useState<any>(null);
  const [linkedBooking, setLinkedBooking] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchContract();
    }
  }, [id, user]);

  const fetchContract = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { data: contractData, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContract(contractData);

      const { data: termsData } = await supabase
        .from('binding_terms')
        .select('*')
        .eq('contract_id', id)
        .single();

      if (termsData) {
        setBindingTerms(termsData);
      }

      setIsBuyer(contractData.buyer_id === user?.id);

      // Fetch profiles with signatures
      const { data: buyerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', contractData.buyer_id)
        .single();

      const { data: sellerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', contractData.seller_id)
        .single();

      const { data: currentUserData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      setBuyerProfile(buyerData);
      setSellerProfile(sellerData);
      setUserProfile(currentUserData);

      // Fetch signatures
      const { data: signaturesData } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('contract_id', id)
        .eq('version', contractData.version);

      setSignatures(signaturesData || []);

      // Fetch linked request or booking
      if (contractData.request_id) {
        const { data: requestData } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('id', contractData.request_id)
          .single();
        setLinkedRequest(requestData);
      }

      if (contractData.booking_id) {
        const { data: bookingData } = await supabase
          .from('booking_requests')
          .select('*')
          .eq('id', contractData.booking_id)
          .single();
        setLinkedBooking(bookingData);
      }
    } catch (error: any) {
      console.error('Error fetching contract:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contract',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContract = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: { contractId: id },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Contract generated successfully',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptVersion = async () => {
    if (!contract || !user || !userProfile) return;

    // Check if user has a signature
    if (!userProfile.signature_data) {
      setIsSignatureModalOpen(true);
      return;
    }

    await signContract();
  };

  const handleSaveSignature = async (signatureData: { type: string; data: string; full_name: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          signature_data: {
            type: signatureData.type,
            data: signatureData.data,
            created_at: new Date().toISOString(),
            full_name: signatureData.full_name,
          },
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh user profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(updatedProfile);

      toast({
        title: 'Success',
        description: 'Signature saved to your profile',
      });

      // Now sign the contract
      await signContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const signContract = async () => {
    if (!contract || !user || !userProfile?.signature_data) return;

    setAccepting(true);
    try {
      // Generate signature hash
      const signatureInput = JSON.stringify(userProfile.signature_data) +
        (contract.content_hash || '') +
        new Date().toISOString();
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Insert signature record
      const { error: sigError } = await supabase
        .from('contract_signatures')
        .insert({
          contract_id: contract.id,
          user_id: user.id,
          version: contract.version,
          signature_method: userProfile.signature_data.type,
          signature_hash: signatureHash,
          user_agent: navigator.userAgent,
        });

      if (sigError) throw sigError;

      // Update contract with signature timestamp
      const updateField = isBuyer ? 'buyer_accepted_version' : 'seller_accepted_version';
      const signedAtField = isBuyer ? 'signed_at_buyer' : 'signed_at_seller';
      const otherSignedAtField = isBuyer ? 'signed_at_seller' : 'signed_at_buyer';

      const updates: any = {
        [updateField]: contract.version,
        [signedAtField]: new Date().toISOString(),
      };

      // Check if other party has signed
      if (contract[otherSignedAtField]) {
        updates.status = 'executed';
        updates.executed_at = new Date().toISOString();

        // Update linked quote/booking to 'assigned' status
        if (contract.quote_id) {
          // Get the request_id from the quote
          const { data: quoteData } = await supabase
            .from('quote_submissions')
            .select('request_id')
            .eq('id', contract.quote_id)
            .single();

          if (quoteData) {
            // Update maintenance request to assigned
            await supabase
              .from('maintenance_requests')
              .update({ status: 'assigned', assigned_at: new Date().toISOString() } as any)
              .eq('id', quoteData.request_id);
          }
        }

        if (contract.booking_id) {
          await supabase
            .from('booking_requests')
            .update({ status: 'accepted' })
            .eq('id', contract.booking_id);
        }
      } else {
        updates.status = 'pending_signature';
      }

      const { error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contract.id);

      if (updateError) throw updateError;

      // Track contract signing in Brevo
      if (user?.email) {
        trackContractSigned(user.email, {
          contractId: contract.id,
          role: isBuyer ? 'buyer' : 'seller'
        });
      }

      toast({
        title: 'Success',
        description: 'Contract signed successfully',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const isArabic = currentLanguage === 'ar';
    const badges = {
      draft: <Badge variant="secondary">{isArabic ? 'مسودة' : 'Draft'}</Badge>,
      pending_buyer: <Badge variant="default">{isArabic ? 'بانتظار مراجعة المشتري' : 'Pending Buyer Review'}</Badge>,
      pending_seller: <Badge variant="default">{isArabic ? 'بانتظار مراجعة البائع' : 'Pending Seller Review'}</Badge>,
      pending_signature: <Badge variant="default" className="bg-blue-500">{isArabic ? 'بانتظار التوقيع' : 'Pending Signature'}</Badge>,
      ready_to_sign: <Badge variant="default" className="bg-blue-500">{isArabic ? 'جاهز للتوقيع' : 'Ready to Sign'}</Badge>,
      executed: <Badge variant="default" className="bg-green-500">{isArabic ? '✓ تم التنفيذ' : '✓ Executed'}</Badge>,
      cancelled: <Badge variant="destructive">{isArabic ? 'ملغى' : 'Cancelled'}</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  const userHasSigned = signatures.some(sig => sig.user_id === user?.id && sig.version === contract?.version);
  const buyerSignature = signatures.find(sig => sig.user_id === contract?.buyer_id);
  const sellerSignature = signatures.find(sig => sig.user_id === contract?.seller_id);

  if (loading) {
    return <div className="p-8 text-center">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-muted-foreground">{currentLanguage === 'ar' ? 'العقد غير موجود' : 'Contract not found'}</p>
      </div>
    );
  }

  const userHasAcceptedCurrentVersion = isBuyer
    ? contract.buyer_accepted_version === contract.version
    : contract.seller_accepted_version === contract.version;

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {currentLanguage === 'ar' ? 'عقد الخدمة' : 'Service Contract'}
              </h1>
              <p className="text-muted-foreground">
                {currentLanguage === 'ar' ? 'معرف العقد:' : 'Contract ID:'} {contract.id.slice(0, 8)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(contract.status)}
              <Badge variant="outline">
                {currentLanguage === 'ar' ? 'الإصدار' : 'Version'} {contract.version}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="contract">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="contract">
                  {currentLanguage === 'ar' ? 'العقد' : 'Contract'}
                </TabsTrigger>
                <TabsTrigger value="terms">
                  {currentLanguage === 'ar' ? 'شروط ملزمة' : 'Binding Terms'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contract" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    {contract.html_snapshot ? (
                      <>
                        {/* Content Hash Verification */}
                        {contract.content_hash && !contract.content_hash_verified && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                            <Shield className="w-4 h-4 text-yellow-600" />
                            <p className="text-sm text-yellow-800">
                              {currentLanguage === 'ar'
                                ? 'تحذير: لم يتم التحقق من سلامة المحتوى'
                                : 'Warning: Content integrity not verified'}
                            </p>
                          </div>
                        )}
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={createSafeHtml(contract.html_snapshot)}
                        />
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {currentLanguage === 'ar' ? 'لم يتم إنشاء العقد بعد' : 'Contract not generated yet'}
                        </p>
                        <Button onClick={handleGenerateContract} disabled={generating}>
                          {generating
                            ? (currentLanguage === 'ar' ? 'جارٍ الإنشاء...' : 'Generating...')
                            : (currentLanguage === 'ar' ? 'إنشاء العقد' : 'Generate Contract')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terms" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {currentLanguage === 'ar' ? 'الشروط الملزمة' : 'Binding Terms'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bindingTerms ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground">Start Date</label>
                          <p className="font-medium">{bindingTerms.start_date || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Completion Date</label>
                          <p className="font-medium">{bindingTerms.completion_date || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Warranty Days</label>
                          <p className="font-medium">{bindingTerms.warranty_days || 90} days</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No binding terms set</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {currentLanguage === 'ar' ? 'الإجراءات' : 'Actions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contract.status === 'draft' && (
                  <Button
                    onClick={handleGenerateContract}
                    disabled={generating}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {generating
                      ? (currentLanguage === 'ar' ? 'جارٍ الإنشاء...' : 'Generating...')
                      : (currentLanguage === 'ar' ? 'إنشاء العقد' : 'Generate Contract')}
                  </Button>
                )}

                {contract.status !== 'draft' && !userHasSigned && (
                  <Button
                    onClick={handleAcceptVersion}
                    disabled={accepting}
                    className="w-full"
                  >
                    <PenTool className="w-4 h-4 mr-2" />
                    {accepting
                      ? (currentLanguage === 'ar' ? 'جارٍ المعالجة...' : 'Processing...')
                      : (currentLanguage === 'ar' ? 'توقيع العقد' : 'Sign Contract')}
                  </Button>
                )}

                {userHasSigned && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {currentLanguage === 'ar' ? 'لقد وقعت على هذا العقد' : 'You\'ve signed this contract'}
                      </span>
                    </div>
                  </div>
                )}

                {isBuyer && contract.status !== 'executed' && (
                  <Button
                    variant="outline"
                    onClick={() => setIsTermsDrawerOpen(true)}
                    className="w-full"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    {currentLanguage === 'ar' ? 'تعديل الشروط الملزمة' : 'Edit Binding Terms'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Signatures Section */}
            {(buyerSignature || sellerSignature || contract.signed_at_buyer || contract.signed_at_seller) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {currentLanguage === 'ar' ? 'التوقيعات الإلكترونية' : 'Electronic Signatures'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SignatureDisplay
                    signerName={buyerProfile?.full_name || 'Buyer'}
                    signatureData={buyerProfile?.signature_data}
                    signedAt={contract.signed_at_buyer}
                    role="buyer"
                    currentLanguage={currentLanguage}
                  />
                  <SignatureDisplay
                    signerName={sellerProfile?.full_name || 'Service Provider'}
                    signatureData={sellerProfile?.signature_data}
                    signedAt={contract.signed_at_seller}
                    role="seller"
                    currentLanguage={currentLanguage}
                  />
                </CardContent>
              </Card>
            )}

            {/* Deposit Status */}
            {bindingTerms?.use_deposit_escrow && (
              <Card className="bg-blue-50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-base">Deposit Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2">MaintMENA Escrow Protection Active</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Deposit Amount:</span>
                      <span className="font-medium">
                        {bindingTerms.payment_schedule?.deposit || 30}% of contract value
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="secondary">Held in Escrow</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completion Workflow */}
            {contract.status === 'executed' && (linkedRequest || linkedBooking) && (
              <CompletionWorkflowCard
                requestId={linkedRequest?.id}
                bookingId={linkedBooking?.id}
                buyerId={contract.buyer_id}
                sellerId={contract.seller_id}
                buyerMarkedComplete={linkedRequest?.buyer_marked_complete || linkedBooking?.buyer_marked_complete || false}
                sellerMarkedComplete={linkedRequest?.seller_marked_complete || linkedBooking?.seller_marked_complete || false}
                buyerCompletionDate={linkedRequest?.buyer_completion_date || linkedBooking?.buyer_completion_date}
                sellerCompletionDate={linkedRequest?.seller_completion_date || linkedBooking?.seller_completion_date}
                status={linkedRequest?.status || linkedBooking?.status || 'assigned'}
                paymentMethod={bindingTerms?.payment_method || 'cash'}
                contractFullyExecuted={contract.status === 'executed'}
                onRefresh={fetchContract}
                userRole={isBuyer ? 'buyer' : 'seller'}
                currentLanguage={currentLanguage}
              />
            )}
          </div>
        </div>
      </div>

      <BindingTermsDrawer
        isOpen={isTermsDrawerOpen}
        onClose={() => setIsTermsDrawerOpen(false)}
        contractId={contract.id}
        bindingTerms={bindingTerms}
        isBuyer={isBuyer}
        onUpdate={fetchContract}
        currentLanguage={currentLanguage}
      />

      <SignatureModal
        open={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSaveSignature}
        currentLanguage={currentLanguage}
        defaultName={userProfile?.full_name || ''}
      />
    </div>
  );
}
