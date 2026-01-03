import { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ROICalculatorProps {
  currentLanguage: 'en' | 'ar';
  onClose: () => void;
}

const ROICalculator = ({ currentLanguage, onClose }: ROICalculatorProps) => {
  const [values, setValues] = useState({
    initialCost: '',
    monthlySavings: '',
    implementationCost: '',
    operatingCost: ''
  });

  const [results, setResults] = useState<{
    paybackPeriod: number;
    roiPercentage: number;
    netPresentValue: number;
    yearlyReturn: number;
  } | null>(null);

  const content = {
    en: {
      title: 'ROI Calculator for Equipment',
      subtitle: 'Calculate return on investment for industrial equipment',
      fields: {
        initialCost: 'Initial Equipment Cost ($)',
        monthlySavings: 'Expected Monthly Savings ($)',
        implementationCost: 'Implementation Cost ($)',
        operatingCost: 'Monthly Operating Cost ($)'
      },
      calculate: 'Calculate ROI',
      reset: 'Reset',
      results: {
        paybackPeriod: 'Payback Period',
        roiPercentage: 'ROI Percentage',
        netPresentValue: 'Net Present Value',
        yearlyReturn: 'Yearly Return'
      },
      months: 'months',
      years: 'years'
    },
    ar: {
      title: 'حاسبة عائد الاستثمار للمعدات',
      subtitle: 'احسب عائد الاستثمار للمعدات الصناعية',
      fields: {
        initialCost: 'تكلفة المعدات الأولية ($)',
        monthlySavings: 'الوفورات الشهرية المتوقعة ($)',
        implementationCost: 'تكلفة التنفيذ ($)',
        operatingCost: 'تكلفة التشغيل الشهرية ($)'
      },
      calculate: 'احسب العائد',
      reset: 'إعادة تعيين',
      results: {
        paybackPeriod: 'فترة الاسترداد',
        roiPercentage: 'نسبة العائد',
        netPresentValue: 'القيمة الحالية الصافية',
        yearlyReturn: 'العائد السنوي'
      },
      months: 'شهر',
      years: 'سنة'
    }
  };

  const currentContent = content[currentLanguage];

  const calculateROI = () => {
    const initial = parseFloat(values.initialCost) || 0;
    const monthlySav = parseFloat(values.monthlySavings) || 0;
    const implementation = parseFloat(values.implementationCost) || 0;
    const monthlyOp = parseFloat(values.operatingCost) || 0;

    const totalInitialCost = initial + implementation;
    const netMonthlySavings = monthlySav - monthlyOp;
    
    if (netMonthlySavings <= 0) {
      alert(currentLanguage === 'ar' ? 'يجب أن تكون الوفورات أكبر من تكلفة التشغيل' : 'Monthly savings must be greater than operating costs');
      return;
    }

    const paybackMonths = totalInitialCost / netMonthlySavings;
    const yearlyNetSavings = netMonthlySavings * 12;
    const roiPercent = (yearlyNetSavings / totalInitialCost) * 100;
    const npv = yearlyNetSavings * 3 - totalInitialCost; // 3-year NPV simplified

    setResults({
      paybackPeriod: paybackMonths,
      roiPercentage: roiPercent,
      netPresentValue: npv,
      yearlyReturn: yearlyNetSavings
    });
  };

  const resetCalculator = () => {
    setValues({
      initialCost: '',
      monthlySavings: '',
      implementationCost: '',
      operatingCost: ''
    });
    setResults(null);
  };

  const formatPaybackPeriod = (months: number) => {
    if (months < 12) {
      return `${months.toFixed(1)} ${currentContent.months}`;
    } else {
      const years = (months / 12).toFixed(1);
      return `${years} ${currentContent.years}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-paper" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calculator className="text-accent" size={28} />
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
                {currentContent.fields.initialCost}
              </label>
              <input
                type="number"
                value={values.initialCost}
                onChange={(e) => setValues(prev => ({ ...prev, initialCost: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.monthlySavings}
              </label>
              <input
                type="number"
                value={values.monthlySavings}
                onChange={(e) => setValues(prev => ({ ...prev, monthlySavings: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.implementationCost}
              </label>
              <input
                type="number"
                value={values.implementationCost}
                onChange={(e) => setValues(prev => ({ ...prev, implementationCost: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                {currentContent.fields.operatingCost}
              </label>
              <input
                type="number"
                value={values.operatingCost}
                onChange={(e) => setValues(prev => ({ ...prev, operatingCost: e.target.value }))}
                className="w-full px-3 py-2 border border-rule rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 bg-paper"
                placeholder="500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button onClick={calculateROI} className="flex-1">
              <TrendingUp size={16} className="mr-2" />
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
                <DollarSign size={20} className="text-accent" />
                {currentLanguage === 'ar' ? 'النتائج' : 'Results'}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.paybackPeriod}</div>
                  <div className="text-lg font-medium text-accent flex items-center gap-2">
                    <Clock size={16} />
                    {formatPaybackPeriod(results.paybackPeriod)}
                  </div>
                </div>
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.roiPercentage}</div>
                  <div className="text-lg font-medium text-accent">
                    {results.roiPercentage.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.yearlyReturn}</div>
                  <div className="text-lg font-medium text-accent">
                    ${results.yearlyReturn.toLocaleString()}
                  </div>
                </div>
                <div className="bg-paper p-3 rounded border border-rule">
                  <div className="text-sm text-muted-foreground">{currentContent.results.netPresentValue}</div>
                  <div className={`text-lg font-medium ${results.netPresentValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${results.netPresentValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ROICalculator;