import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MaintenanceCostEstimatorProps {
  currentLanguage: 'en' | 'ar';
  onClose: () => void;
}

const MaintenanceCostEstimator = ({ currentLanguage, onClose }: MaintenanceCostEstimatorProps) => {
  const [equipmentValue, setEquipmentValue] = useState('');
  const [equipmentAge, setEquipmentAge] = useState('');
  const [maintenanceFrequency, setMaintenanceFrequency] = useState('');
  const [laborRate, setLaborRate] = useState('');
  const [result, setResult] = useState<{
    annual: number;
    monthly: number;
    perMaintenance: number;
  } | null>(null);

  const content = {
    en: {
      title: 'Maintenance Cost Estimator',
      description: 'Estimate your annual maintenance costs based on equipment value and usage',
      equipmentValue: 'Equipment Value ($)',
      equipmentAge: 'Equipment Age (years)',
      frequency: 'Maintenance Frequency (per year)',
      laborRate: 'Labor Rate ($/hour)',
      calculate: 'Calculate Costs',
      annualCost: 'Annual Cost',
      monthlyCost: 'Monthly Cost',
      perMaintenance: 'Per Maintenance',
      close: 'Close'
    },
    ar: {
      title: 'مقدر تكلفة الصيانة',
      description: 'قدّر تكاليف الصيانة السنوية بناءً على قيمة المعدات والاستخدام',
      equipmentValue: 'قيمة المعدات (دولار)',
      equipmentAge: 'عمر المعدات (سنوات)',
      frequency: 'تكرار الصيانة (في السنة)',
      laborRate: 'معدل العمالة (دولار/ساعة)',
      calculate: 'احسب التكاليف',
      annualCost: 'التكلفة السنوية',
      monthlyCost: 'التكلفة الشهرية',
      perMaintenance: 'لكل صيانة',
      close: 'إغلاق'
    }
  };

  const t = content[currentLanguage];

  const calculateCosts = () => {
    const value = parseFloat(equipmentValue) || 0;
    const age = parseFloat(equipmentAge) || 0;
    const frequency = parseFloat(maintenanceFrequency) || 0;
    const rate = parseFloat(laborRate) || 0;

    // Base maintenance cost: 2-5% of equipment value per year
    const baseRate = 0.02 + (age * 0.003); // Increases with age
    const baseCost = value * baseRate;

    // Labor cost per maintenance (assume 4 hours average)
    const laborCost = rate * 4 * frequency;

    // Parts cost (assume 30% of base cost)
    const partsCost = baseCost * 0.3;

    const annual = baseCost + laborCost + partsCost;
    const monthly = annual / 12;
    const perMaintenance = frequency > 0 ? annual / frequency : 0;

    setResult({ annual, monthly, perMaintenance });
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
          className="w-full max-w-2xl"
        >
          <Card className="border-rule">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-accent" />
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
                  <Label>{t.equipmentValue}</Label>
                  <Input
                    type="number"
                    value={equipmentValue}
                    onChange={(e) => setEquipmentValue(e.target.value)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label>{t.equipmentAge}</Label>
                  <Input
                    type="number"
                    value={equipmentAge}
                    onChange={(e) => setEquipmentAge(e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label>{t.frequency}</Label>
                  <Input
                    type="number"
                    value={maintenanceFrequency}
                    onChange={(e) => setMaintenanceFrequency(e.target.value)}
                    placeholder="4"
                  />
                </div>
                <div>
                  <Label>{t.laborRate}</Label>
                  <Input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>

              <Button onClick={calculateCosts} className="w-full">
                {t.calculate}
              </Button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"
                >
                  <Card className="bg-accent/10">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{t.annualCost}</p>
                      <p className="text-2xl font-bold text-accent">
                        ${result.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-accent/10">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{t.monthlyCost}</p>
                      <p className="text-2xl font-bold text-accent">
                        ${result.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-accent/10">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{t.perMaintenance}</p>
                      <p className="text-2xl font-bold text-accent">
                        ${result.perMaintenance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MaintenanceCostEstimator;