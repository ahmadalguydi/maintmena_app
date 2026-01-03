import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label, Body } from '@/components/mobile/Typography';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditProfileProps {
  currentLanguage: 'en' | 'ar';
}

export const EditProfile = ({ currentLanguage }: EditProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    company_description: '',
    phone: '',
    bio: '',
    years_of_experience: '',
    website_url: '',
    linkedin_url: '',
    response_time_hours: '',
    crew_size_range: '',
    availability_status: 'available',
    discoverable: true,
    service_categories: [] as string[],
    certifications: [] as string[]
  });

  const content = {
    en: {
      title: 'Edit Profile',
      fullName: 'Full Name',
      companyName: 'Company Name',
      companyDescription: 'Company Description',
      phone: 'Phone Number',
      bio: 'Bio',
      bioTip: '💡 A complete bio increases your chances of getting hired by 40%',
      yearsExperience: 'Years of Experience',
      website: 'Website URL',
      linkedin: 'LinkedIn URL',
      responseTime: 'Response Time (hours)',
      crewSize: 'Crew Size',
      availability: 'Availability Status',
      discoverable: 'Appear in search results',
      save: 'Save Changes',
      saving: 'Saving...',
      cancel: 'Cancel',
      available: 'Available',
      busy: 'Busy',
      unavailable: 'Unavailable'
    },
    ar: {
      title: 'تعديل الملف الشخصي',
      fullName: 'الاسم الكامل',
      companyName: 'اسم الشركة',
      companyDescription: 'وصف الشركة',
      phone: 'رقم الهاتف',
      bio: 'نبذة',
      bioTip: '💡 السيرة الذاتية الكاملة تزيد فرص التوظيف بنسبة 40%',
      yearsExperience: 'سنوات الخبرة',
      website: 'رابط الموقع',
      linkedin: 'رابط LinkedIn',
      responseTime: 'وقت الاستجابة (ساعات)',
      crewSize: 'حجم الفريق',
      availability: 'حالة التوفر',
      discoverable: 'الظهور في نتائج البحث',
      save: 'حفظ التغييرات',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء',
      available: 'متاح',
      busy: 'مشغول',
      unavailable: 'غير متاح'
    }
  };

  const t = content[currentLanguage];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error(currentLanguage === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load profile');
        return;
      }

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          company_name: data.company_name || '',
          company_description: data.company_description || '',
          phone: data.phone || '',
          bio: data.bio || '',
          years_of_experience: data.years_of_experience?.toString() || '',
          website_url: data.website_url || '',
          linkedin_url: data.linkedin_url || '',
          response_time_hours: data.response_time_hours?.toString() || '',
          crew_size_range: data.crew_size_range || '',
          availability_status: data.availability_status || 'available',
          discoverable: data.discoverable !== false,
          service_categories: data.service_categories || [],
          certifications: data.certifications || []
        });
      }
    };

    fetchProfile();
  }, [user, currentLanguage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
          company_description: formData.company_description,
          phone: formData.phone,
          bio: formData.bio,
          years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
          website_url: formData.website_url || null,
          linkedin_url: formData.linkedin_url || null,
          response_time_hours: formData.response_time_hours ? parseInt(formData.response_time_hours) : null,
          crew_size_range: formData.crew_size_range || null,
          availability_status: formData.availability_status,
          discoverable: formData.discoverable,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم حفظ التغييرات' : 'Profile updated successfully');
      navigate('/app/seller/profile');
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? 'فشل الحفظ' : 'Failed to save changes');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Tip Banner */}
        <SoftCard className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
          <Body lang={currentLanguage} className="text-sm">
            {t.bioTip}
          </Body>
        </SoftCard>

        <SoftCard>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.fullName}</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t.fullName}
                className="rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.companyName}</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder={t.companyName}
                className="rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.companyDescription}</Label>
              <Textarea
                value={formData.company_description}
                onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                placeholder={t.companyDescription}
                rows={3}
                className="rounded-3xl"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t.phone}
                className="rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.yearsExperience}</Label>
              <Input
                type="number"
                value={formData.years_of_experience}
                onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                placeholder={t.yearsExperience}
                className="rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.bio}</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder={t.bio}
                rows={5}
                className="rounded-3xl"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.website}</Label>
              <Input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://example.com"
                className="rounded-full"
              />
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.linkedin}</Label>
              <Input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                className="rounded-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label lang={currentLanguage}>{t.responseTime}</Label>
                <Input
                  type="number"
                  value={formData.response_time_hours}
                  onChange={(e) => setFormData({ ...formData, response_time_hours: e.target.value })}
                  placeholder="24"
                  className="rounded-full"
                />
              </div>

              <div className="space-y-2">
                <Label lang={currentLanguage}>{t.crewSize}</Label>
                <Input
                  value={formData.crew_size_range}
                  onChange={(e) => setFormData({ ...formData, crew_size_range: e.target.value })}
                  placeholder="1-5"
                  className="rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label lang={currentLanguage}>{t.availability}</Label>
              <select
                value={formData.availability_status}
                onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                className="w-full h-12 px-4 rounded-full border border-border bg-background"
              >
                <option value="available">{t.available}</option>
                <option value="busy">{t.busy}</option>
                <option value="unavailable">{t.unavailable}</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="discoverable"
                checked={formData.discoverable}
                onChange={(e) => setFormData({ ...formData, discoverable: e.target.checked })}
                className="w-5 h-5 rounded border-border"
              />
              <label 
                htmlFor="discoverable" 
                className="cursor-pointer text-sm font-medium"
              >
                {t.discoverable}
              </label>
            </div>
          </div>
        </SoftCard>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/app/seller/profile')}
            disabled={loading}
            className="flex-1 rounded-full"
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? t.saving : t.save}
          </Button>
        </div>
      </form>
    </div>
  );
};
