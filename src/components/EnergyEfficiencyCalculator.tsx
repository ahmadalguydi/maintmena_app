import { useState } from 'react';
import { Zap, Leaf, BarChart3, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EnergyEfficiencyCalculatorProps {
  currentLanguage: 'en' | 'ar';
  onClose: () => void;
}

const EnergyEfficiencyCalculator = ({ currentLanguage, onClose }: EnergyEfficiencyCalculatorProps) => {
  const [values, setValues] = useState({
    currentConsumption: '',
    energyCost: '',
    targetReduction: '',
    equipmentCost: '',
    operatingHours: ''
  });

  const [results, setResults] = useState<{
    annualSavings: number;
    co2Reduction: number;
    paybackPeriod: number;
    efficiencyGain: number;
  } | null>(null);

  const content = {
    en: {
      title: 'Energy Efficiency Calculator',
      subtitle: 'Calculate energy savings and environmental impact',
      fields: {
        currentConsumption: 'Current Energy Consumption (kWh/month)',
        energyCost: 'Energy Cost ($/kWh)',
        targetReduction: 'Target Reduction (%)',
        equipmentCost: 'Equipment/Upgrade Cost ($)',
        operatingHours: 'Operating Hours per Day'
      },
      calculate: 'Calculate Savings',
      reset: 'Reset',
      results: {
        annualSavings: 'Annual Cost Savings',
        co2Reduction: 'CO2 Reduction per Year',
        paybackPeriod: 'Payback Period',
        efficiencyGain: 'Efficiency Improvement'
      },
      months: 'months',
      tons: 'tons'
    },
    ar: {
      title: 'حاسبة كفاءة الطاقة',
      subtitle: 'احسب توفير الطاقة والأثر البيئي',
      fields: {
        currentConsumption: 'استهلاك الطاقة الحالي (كيلو واط/شهر)',
        energyCost: 'تكلفة الطاقة ($/كيلو واط)',
        targetReduction: 'نسبة التوفير المستهدفة (%)',
        equipmentCost: 'تكلفة المعدات/التطوير ($)',
        operatingHours: 'ساعات التشغيل يومياً'
      },
      calculate: 'احسب التوفير',
      reset: 'إعادة تعيين',
      results: {
        annualSavings: 'التوفير السنوي',
        co2Reduction: 'تقليل ثاني أكسيد الكربون سنوياً',
        paybackPeriod: 'فترة الاسترداد',
        efficiencyGain: 'تحسن الكفاءة'
      },
      months: 'شهر',
      tons: 'طن'
    }
  };

  const currentContent = content[currentLanguage];

  const calculateEfficiency = () => {
    const consumption = parseFloat(values.currentConsumption) || 0;
    const cost = parseFloat(values.energyCost) || 0;
    const reduction = parseFloat(values.targetReduction) || 0;
    const equipCost = parseFloat(values.equipmentCost) || 0;
    const hours = parseFloat(values.operatingHours) || 0;

    if (consumption <= 0 || cost <= 0 || reduction <= 0) {
      alert(currentLanguage === 'ar' ? 'يرجى إدخال قيم صحيحة' : 'Please enter valid values');
      return;
    }

    const monthlySavings = consumption * cost * (reduction / 100);
    const annualSavings = monthlySavings * 12;
    
    // CO2 calculation (approx 0.5 kg CO2 per kWh)
    const energySavedMonthly = consumption * (reduction / 100);
    const co2ReductionTons = (energySavedMonthly * 12 * 0.5) / 1000;
    
    const paybackMonths = equipCost > 0 ? equipCost / monthlySavings : 0;
    const efficiencyImprovement = reduction;

    setResults({
      annualSavings,
      co2Reduction: co2ReductionTons,
      paybackPeriod: paybackMonths,
      efficiencyGain: efficiencyImprovement
    });
  };

  const resetCalculator = () => {
    setValues({
      currentConsumption: '',
      energyCost: '',
      targetReduction: '',
      equipmentCost: '',
      operatingHours: ''
    });
    setResults(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap className="text-accent" size={28} />
              <div>
                <h2 className="text-headline-2 text-ink">{currentContent.title}</h2>
                <p className="text-muted-foreground text-sm">{currentContent.subtitle}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>

          {/* Input Fields */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.currentConsumption}
              </label>
              <input
                type="number"
                value={values.currentConsumption}
                onChange={(e) => setValues(prev => ({ ...prev, currentConsumption: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.energyCost}
              </label>
              <input
                type="number"
                step="0.01"
                value={values.energyCost}
                onChange={(e) => setValues(prev => ({ ...prev, energyCost: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="0.12"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.targetReduction}
              </label>
              <input
                type="number"
                value={values.targetReduction}
                onChange={(e) => setValues(prev => ({ ...prev, targetReduction: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.equipmentCost}
              </label>
              <input
                type="number"
                value={values.equipmentCost}
                onChange={(e) => setValues(prev => ({ ...prev, equipmentCost: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="25000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.operatingHours}
              </label>
              <input
                type="number"
                value={values.operatingHours}
                onChange={(e) => setValues(prev => ({ ...prev, operatingHours: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="16"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button onClick={calculateEfficiency} className="flex-1">
              <BarChart3 size={16} className="mr-2" />
              {currentContent.calculate}
            </Button>
            <Button variant="outline" onClick={resetCalculator}>
              {currentContent.reset}
            </Button>
          </div>

          {/* Results */}
          {results && (
            <div className="bg-accent/5 border border-rule rounded-lg p-4">
              <h3 className="font-medium text-ink mb-4 flex items-center gap-2">
                <TrendingDown size={20} className="text-accent" />
                {currentLanguage === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.annualSavings}</div>
                  <div className="text-lg font-medium text-green-600">
                    ${results.annualSavings.toLocaleString()}
                  </div>
                </div>
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.co2Reduction}</div>
                  <div className="text-lg font-medium text-green-600 flex items-center gap-2">
                    <Leaf size={16} />
                    {results.co2Reduction.toFixed(1)} {currentContent.tons}
                  </div>
                </div>
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.paybackPeriod}</div>
                  <div className="text-lg font-medium text-accent">
                    {results.paybackPeriod > 0 ? `${results.paybackPeriod.toFixed(1)} ${currentContent.months}` : 'N/A'}
                  </div>
                </div>
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.efficiencyGain}</div>
                  <div className="text-lg font-medium text-accent">
                    {results.efficiencyGain}%
                  </div>
                </div>
              </div>
              
              {/* Environmental Impact */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                  <Leaf size={16} />
                  {currentLanguage === 'ar' ? 'الأثر البيئي' : 'Environmental Impact'}
                </div>
                <div className="text-sm text-green-600">
                  {currentLanguage === 'ar' 
                    ? `تقليل انبعاثات الكربون يعادل إزالة ${(results.co2Reduction / 4.6).toFixed(1)} سيارة من الطريق سنوياً`
                    : `Reducing ${results.co2Reduction.toFixed(1)} tons of CO2 is equivalent to removing ${(results.co2Reduction / 4.6).toFixed(1)} cars from the road annually`
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EnergyEfficiencyCalculator;