import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectTimelinePlannerProps {
  currentLanguage: 'en' | 'ar';
  onClose: () => void;
}

const ProjectTimelinePlanner = ({ currentLanguage, onClose }: ProjectTimelinePlannerProps) => {
  const [projectType, setProjectType] = useState('installation');
  const [complexity, setComplexity] = useState('medium');
  const [teamSize, setTeamSize] = useState('');
  const [budget, setBudget] = useState('');
  const [result, setResult] = useState<{
    duration: number;
    phases: { name: string; weeks: number }[];
    criticalPath: string[];
  } | null>(null);

  const content = {
    en: {
      title: 'Project Timeline Planner',
      description: 'Plan your project timeline based on scope and resources',
      projectType: 'Project Type',
      complexity: 'Complexity',
      teamSize: 'Team Size',
      budget: 'Budget ($)',
      calculate: 'Generate Timeline',
      totalDuration: 'Total Duration',
      weeks: 'weeks',
      phases: 'Project Phases',
      criticalPath: 'Critical Path',
      close: 'Close',
      types: {
        installation: 'Equipment Installation',
        maintenance: 'Major Maintenance',
        upgrade: 'System Upgrade',
        construction: 'Construction'
      },
      complexityLevels: {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
      }
    },
    ar: {
      title: 'مخطط الجدول الزمني للمشروع',
      description: 'خطط للجدول الزمني لمشروعك بناءً على النطاق والموارد',
      projectType: 'نوع المشروع',
      complexity: 'التعقيد',
      teamSize: 'حجم الفريق',
      budget: 'الميزانية (دولار)',
      calculate: 'إنشاء جدول زمني',
      totalDuration: 'المدة الإجمالية',
      weeks: 'أسابيع',
      phases: 'مراحل المشروع',
      criticalPath: 'المسار الحرج',
      close: 'إغلاق',
      types: {
        installation: 'تركيب المعدات',
        maintenance: 'الصيانة الرئيسية',
        upgrade: 'ترقية النظام',
        construction: 'البناء'
      },
      complexityLevels: {
        low: 'منخفض',
        medium: 'متوسط',
        high: 'عالٍ'
      }
    }
  };

  const t = content[currentLanguage];

  const calculateTimeline = () => {
    const team = parseInt(teamSize) || 5;
    const complexityMultiplier = complexity === 'low' ? 0.7 : complexity === 'high' ? 1.5 : 1;
    const teamMultiplier = Math.max(0.5, 1 - (team - 5) * 0.05);

    const baseWeeks: Record<string, number> = {
      installation: 8,
      maintenance: 6,
      upgrade: 12,
      construction: 16
    };

    const totalWeeks = Math.ceil(baseWeeks[projectType] * complexityMultiplier * teamMultiplier);

    const phases = [
      { name: currentLanguage === 'en' ? 'Planning' : 'التخطيط', weeks: Math.ceil(totalWeeks * 0.2) },
      { name: currentLanguage === 'en' ? 'Design' : 'التصميم', weeks: Math.ceil(totalWeeks * 0.15) },
      { name: currentLanguage === 'en' ? 'Execution' : 'التنفيذ', weeks: Math.ceil(totalWeeks * 0.45) },
      { name: currentLanguage === 'en' ? 'Testing' : 'الاختبار', weeks: Math.ceil(totalWeeks * 0.1) },
      { name: currentLanguage === 'en' ? 'Closeout' : 'الإغلاق', weeks: Math.ceil(totalWeeks * 0.1) }
    ];

    const criticalPath = [
      currentLanguage === 'en' ? 'Resource allocation' : 'تخصيص الموارد',
      currentLanguage === 'en' ? 'Vendor selection' : 'اختيار البائع',
      currentLanguage === 'en' ? 'Main installation' : 'التركيب الرئيسي',
      currentLanguage === 'en' ? 'Quality checks' : 'فحوصات الجودة'
    ];

    setResult({ duration: totalWeeks, phases, criticalPath });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="border-rule">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-accent" />
                  <div>
                    <CardTitle>{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t.projectType}</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="installation">{t.types.installation}</SelectItem>
                      <SelectItem value="maintenance">{t.types.maintenance}</SelectItem>
                      <SelectItem value="upgrade">{t.types.upgrade}</SelectItem>
                      <SelectItem value="construction">{t.types.construction}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.complexity}</Label>
                  <Select value={complexity} onValueChange={setComplexity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t.complexityLevels.low}</SelectItem>
                      <SelectItem value="medium">{t.complexityLevels.medium}</SelectItem>
                      <SelectItem value="high">{t.complexityLevels.high}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.teamSize}</Label>
                  <Input
                    type="number"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label>{t.budget}</Label>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="50000"
                  />
                </div>
              </div>

              <Button onClick={calculateTimeline} className="w-full">
                {t.calculate}
              </Button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <Card className="bg-accent/10">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{t.totalDuration}</p>
                      <p className="text-3xl font-bold text-accent">
                        {result.duration} {t.weeks}
                      </p>
                    </CardContent>
                  </Card>

                  <div>
                    <h4 className="font-semibold mb-3">{t.phases}</h4>
                    <div className="space-y-2">
                      {result.phases.map((phase, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                          <span className="font-medium">{phase.name}</span>
                          <span className="text-sm text-accent">{phase.weeks} {t.weeks}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">{t.criticalPath}</h4>
                    <ul className="space-y-2">
                      {result.criticalPath.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-accent"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectTimelinePlanner;