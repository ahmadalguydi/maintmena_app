import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SoftCard } from '@/components/mobile/SoftCard';
import { toast } from 'sonner';
import { Plus, Trash2, Settings, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heading3, Body, BodySmall } from '@/components/mobile/Typography';

export interface QuoteSection {
  id: string;
  name: string;
  label: string;
  required: boolean;
  enabled: boolean;
  placeholder?: string;
}

interface QuoteTemplateManagerProps {
  requestId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (sections: QuoteSection[], customSections: QuoteSection[]) => void;
  initialSections?: QuoteSection[];
  initialCustomSections?: QuoteSection[];
  currentLanguage: 'en' | 'ar';
}

const getDefaultSections = (lang: 'en' | 'ar'): QuoteSection[] => [
  { 
    id: 'cover_letter', 
    name: 'cover_letter', 
    label: lang === 'ar' ? 'نبذة عن المقاول' : 'About the Contractor', 
    required: true, 
    enabled: true, 
    placeholder: lang === 'ar' ? 'اطلب من المقاول التعريف بشركته' : 'Ask contractor to introduce their company' 
  },
  { 
    id: 'technical_approach', 
    name: 'technical_approach', 
    label: lang === 'ar' ? 'طريقة العمل' : 'Work Method', 
    required: false, 
    enabled: true, 
    placeholder: lang === 'ar' ? 'اطلب شرح طريقة التنفيذ' : 'Ask about execution method' 
  },
  { 
    id: 'team_experience', 
    name: 'team_experience', 
    label: lang === 'ar' ? 'الخبرات السابقة' : 'Past Experience', 
    required: false, 
    enabled: true, 
    placeholder: lang === 'ar' ? 'اطلب مشاريع مشابهة' : 'Ask about similar projects' 
  },
  { 
    id: 'certifications', 
    name: 'certifications', 
    label: lang === 'ar' ? 'الشهادات' : 'Certifications', 
    required: false, 
    enabled: false, 
    placeholder: lang === 'ar' ? 'اطلب الشهادات المهنية' : 'Ask for professional certifications' 
  },
  { 
    id: 'timeline_details', 
    name: 'timeline_details', 
    label: lang === 'ar' ? 'الجدول الزمني' : 'Timeline', 
    required: false, 
    enabled: true, 
    placeholder: lang === 'ar' ? 'اطلب جدول زمني واضح' : 'Ask for clear timeline' 
  },
  { 
    id: 'client_references', 
    name: 'client_references', 
    label: lang === 'ar' ? 'تقييمات سابقة' : 'Client References', 
    required: false, 
    enabled: false, 
    placeholder: lang === 'ar' ? 'اطلب بيانات عملاء سابقين' : 'Ask for previous clients' 
  },
];

export const DEFAULT_SECTIONS: QuoteSection[] = getDefaultSections('en');

export const QuoteTemplateManager = ({ 
  requestId, 
  isOpen, 
  onClose,
  onSave,
  initialSections,
  initialCustomSections,
  currentLanguage = 'en'
}: QuoteTemplateManagerProps) => {
  const [sections, setSections] = useState<QuoteSection[]>(initialSections || getDefaultSections(currentLanguage));
  const [customSections, setCustomSections] = useState<QuoteSection[]>(initialCustomSections || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && requestId) {
      fetchTemplate();
    } else if (isOpen && initialSections) {
      setSections(initialSections);
      setCustomSections(initialCustomSections || []);
    }
  }, [isOpen, requestId, initialSections, initialCustomSections]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('request_quote_templates')
        .select('sections')
        .eq('request_id', requestId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.sections) {
        const savedSections = data.sections as any[];
        const defaultSectionsForLang = getDefaultSections(currentLanguage);
        const defaultSectionIds = defaultSectionsForLang.map(s => s.id);
        
        setSections(defaultSectionsForLang.map(section => {
          const saved = savedSections.find((s: any) => s.id === section.id);
          return saved ? { ...section, ...saved, label: section.label, placeholder: section.placeholder } : section;
        }));

        const custom = savedSections.filter((s: any) => !defaultSectionIds.includes(s.id));
        setCustomSections(custom);
      }
    } catch (error: any) {
      console.error('Error fetching template:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const allSections = [...sections, ...customSections];

      if (!requestId && onSave) {
        onSave(sections, customSections);
        toast.success(currentLanguage === 'ar' ? 'تم تكوين القالب!' : 'Template configured!');
        onClose();
        setLoading(false);
        return;
      }

      if (!requestId) {
        toast.error(currentLanguage === 'ar' ? 'لم يتم تقديم معرف الطلب' : 'No request ID provided');
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from('request_quote_templates')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('request_quote_templates')
          .update({
            sections: allSections as any,
            updated_at: new Date().toISOString()
          })
          .eq('request_id', requestId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('request_quote_templates')
          .insert({
            request_id: requestId,
            sections: allSections as any
          });

        if (error) throw error;
      }

      toast.success(currentLanguage === 'ar' ? 'تم حفظ القالب بنجاح!' : 'Template saved successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل حفظ القالب' : 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const toggleRequired = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, required: !s.required } : s
    ));
  };

  const addCustomSection = () => {
    const newSection: QuoteSection = {
      id: `custom_${Date.now()}`,
      name: `custom_${Date.now()}`,
      label: currentLanguage === 'ar' ? 'قسم مخصص' : 'Custom Section',
      required: false,
      enabled: true,
      placeholder: currentLanguage === 'ar' ? 'أدخل التفاصيل...' : 'Enter details...'
    };
    setCustomSections(prev => [...prev, newSection]);
  };

  const updateCustomSection = (id: string, updates: Partial<QuoteSection>) => {
    setCustomSections(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const removeCustomSection = (id: string) => {
    setCustomSections(prev => prev.filter(s => s.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] p-0 flex flex-col" 
        dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <div className="flex items-center justify-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <DialogTitle>
              {currentLanguage === 'ar' ? 'تخصيص متطلبات العروض' : 'Customize Quote Requirements'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 px-6 py-4">
          {/* Standard Sections */}
          <div>
            <Heading3 lang={currentLanguage} className="mb-4">
              {currentLanguage === 'ar' ? 'المعلومات المطلوبة' : 'Required Information'}
            </Heading3>
            <div className="space-y-3">
              {sections.map((section) => (
                <SoftCard key={section.id} className={!section.enabled ? 'opacity-60' : ''}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        checked={section.enabled}
                        onCheckedChange={() => toggleSection(section.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <Body lang={currentLanguage} className="font-medium">
                          {section.label}
                        </Body>
                        <BodySmall lang={currentLanguage} className="text-muted-foreground truncate">
                          {section.placeholder}
                        </BodySmall>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">
                        {currentLanguage === 'ar' ? 'مطلوب' : 'Required'}
                      </Label>
                      <Switch
                        checked={section.required}
                        onCheckedChange={() => toggleRequired(section.id)}
                        disabled={!section.enabled}
                      />
                    </div>
                  </div>
                </SoftCard>
              ))}
            </div>
          </div>

          {/* Custom Sections */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Heading3 lang={currentLanguage}>
                {currentLanguage === 'ar' ? 'الأقسام المخصصة' : 'Custom Sections'}
              </Heading3>
              <Button onClick={addCustomSection} variant="outline" size="sm" className="gap-2 rounded-full">
                <Plus className="w-4 h-4" />
                {currentLanguage === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>
            <AnimatePresence>
              {customSections.map((section) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3"
                >
                  <SoftCard>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder={currentLanguage === 'ar' ? 'عنوان القسم' : 'Section Label'}
                            value={section.label}
                            onChange={(e) => updateCustomSection(section.id, { label: e.target.value })}
                            className="rounded-full"
                          />
                          <Input
                            placeholder={currentLanguage === 'ar' ? 'نص مساعد...' : 'Placeholder...'}
                            value={section.placeholder}
                            onChange={(e) => updateCustomSection(section.id, { placeholder: e.target.value })}
                            className="rounded-full"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomSection(section.id)}
                          className="text-destructive hover:text-destructive rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.required}
                          onCheckedChange={(checked) => updateCustomSection(section.id, { required: checked })}
                        />
                        <Label className="text-sm text-muted-foreground">
                          {currentLanguage === 'ar' ? 'مطلوب' : 'Required'}
                        </Label>
                      </div>
                    </div>
                  </SoftCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border/30 bg-background">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-full">
            {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2 rounded-full">
            <Save className="w-4 h-4" />
            {loading 
              ? (currentLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
              : (currentLanguage === 'ar' ? 'حفظ' : 'Save')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
