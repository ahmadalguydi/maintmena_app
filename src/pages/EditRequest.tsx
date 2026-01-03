import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { SAUDI_CITIES } from '@/lib/saudiCities';
import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';


export default function EditRequest({ currentLanguage = 'en' }: { currentLanguage?: 'en' | 'ar' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { convertAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [requestType, setRequestType] = useState<'home' | 'project'>('home');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serviceCategory: '',
    location: '',
    city: '',
    country: 'Saudi Arabia',
    urgency: 'medium',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    preferredStartDate: '',
    timeline: '',
    projectSize: '',
    facilityType: '',
    scopeOfWork: ''
  });

  useEffect(() => {
    if (id && user) {
      fetchRequestData();
    }
  }, [id, user]);

  const fetchRequestData = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', id)
        .eq('buyer_id', user.id)
        .single();

      if (error) throw error;

      if (data.quotes_count > 0) {
        toast.error('Cannot edit request that has received quotes');
        navigate('/my-requests');
        return;
      }

      setRequestType(data.service_type || ((data.tags as any)?.audience) || 'home');
      const requestData = data as any;
      setFormData({
        title: requestData.title,
        description: requestData.description || '',
        serviceCategory: requestData.category || ((data.tags as any)?.service_category) || '',
        location: requestData.location || '',
        city: requestData.city || '',
        country: requestData.country || 'Saudi Arabia',
        urgency: requestData.urgency || 'medium',
        budgetMin: data.estimated_budget_min?.toString() || '',
        budgetMax: data.estimated_budget_max?.toString() || '',
        deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : '',
        preferredStartDate: data.preferred_start_date ? new Date(data.preferred_start_date).toISOString().split('T')[0] : '',
        timeline: data.project_duration_days?.toString() || '',
        projectSize: (data.tags as any)?.project_size || '',
        facilityType: data.facility_type || '',
        scopeOfWork: data.scope_of_work || ''
      });
    } catch (error: any) {
      toast.error('Failed to load request: ' + error.message);
      navigate('/my-requests');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.serviceCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const budgetMinUSD = formData.budgetMin ? convertAmount(parseFloat(formData.budgetMin), 'SAR') / 3.75 : null;
      const budgetMaxUSD = formData.budgetMax ? convertAmount(parseFloat(formData.budgetMax), 'SAR') / 3.75 : null;

      const tags: any = {
        audience: requestType,
        service_category: formData.serviceCategory
      };

      if (requestType === 'project') {
        tags.project_size = formData.projectSize;
      }

      const updateData: any = {
        title: formData.title,
        description: formData.description,
        service_type: requestType,
        category: formData.serviceCategory,
        location: formData.location,
        city: formData.city,
        country: formData.country,
        urgency: formData.urgency,
        estimated_budget_min: budgetMinUSD,
        estimated_budget_max: budgetMaxUSD,
        deadline: formData.deadline || null,
        preferred_start_date: formData.preferredStartDate || null,
        project_duration_days: formData.timeline ? parseInt(formData.timeline) : null,
        facility_type: requestType === 'project' ? formData.facilityType : null,
        scope_of_work: requestType === 'project' ? formData.scopeOfWork : null,
        tags,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم تحديث الطلب بنجاح' : 'Request updated successfully');
      navigate('/buyer-dashboard');
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? 'فشل تحديث الطلب: ' + error.message : 'Failed to update request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-paper pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/my-requests')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Requests
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Service Request</CardTitle>
            <CardDescription>Update your service request details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs value={requestType} onValueChange={(v) => setRequestType(v as 'home' | 'project')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="home">Home Services</TabsTrigger>
                  <TabsTrigger value="project">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="home" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Service Category *</Label>
                    <Select value={formData.serviceCategory} onValueChange={(v) => setFormData({ ...formData, serviceCategory: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.home.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>{cat.en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="project" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Service Category *</Label>
                    <Select value={formData.serviceCategory} onValueChange={(v) => setFormData({ ...formData, serviceCategory: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.project.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>{cat.en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for your request"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description"
                  rows={5}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAUDI_CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget Min</Label>
                  <Input
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                    placeholder="Minimum budget"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget Max</Label>
                  <Input
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                    placeholder="Maximum budget"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Start Date</Label>
                  <Input
                    type="date"
                    value={formData.preferredStartDate}
                    onChange={(e) => setFormData({ ...formData, preferredStartDate: e.target.value })}
                  />
                </div>
              </div>

              {requestType === 'project' && (
                <>
                  <div className="space-y-2">
                    <Label>Project Size</Label>
                    <Select value={formData.projectSize} onValueChange={(v) => setFormData({ ...formData, projectSize: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (under 100 sqm)</SelectItem>
                        <SelectItem value="medium">Medium (100-500 sqm)</SelectItem>
                        <SelectItem value="large">Large (500+ sqm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Facility Type</Label>
                    <Input
                      value={formData.facilityType}
                      onChange={(e) => setFormData({ ...formData, facilityType: e.target.value })}
                      placeholder="e.g., Office, Warehouse, Retail"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Scope of Work</Label>
                    <Textarea
                      value={formData.scopeOfWork}
                      onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
                      placeholder="Detailed scope of work"
                      rows={4}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate('/my-requests')} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
