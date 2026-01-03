import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, Clock } from 'lucide-react';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Heading2, Heading3, Body, Caption } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ContractPreviewProps {
  contractId: string;
  buyerName: string;
  sellerName: string;
  amount: number;
  startDate: string;
  completionDate: string;
  scope: string;
  terms: any;
  currentLanguage: 'en' | 'ar';
  onSign: () => void;
  onReject?: () => void;
  onScopeChange?: (scope: string) => void;
}

export const ContractPreview = ({
  contractId,
  buyerName,
  sellerName,
  amount,
  startDate,
  completionDate,
  scope,
  terms,
  currentLanguage,
  onSign,
  onReject,
  onScopeChange
}: ContractPreviewProps) => {
  const dateFormat = localStorage.getItem('dateFormat') || 'gregorian';
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (dateFormat === 'hijri') {
      return date.toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic');
    }
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const content = {
    ar: {
      title: 'معاينة العقد',
      parties: 'الأطراف',
      buyer: 'المشتري',
      seller: 'البائع',
      amount: 'المبلغ الإجمالي',
      duration: 'المدة',
      from: 'من',
      to: 'إلى',
      scope: 'نطاق العمل',
      payment: 'جدول الدفع',
      deposit: 'عربون',
      progress: 'عند التقدم',
      completion: 'عند الإنجاز',
      terms: 'الشروط والأحكام',
      warranty: 'فترة الضمان',
      days: 'يوم',
      signContract: 'توقيع العقد',
      reject: 'رجوع',
      editScope: 'تعديل نطاق العمل',
      adjustPayment: 'تعديل جدول الدفع',
      signed: 'موقع',
      pending: 'في انتظار التوقيع'
    },
    en: {
      title: 'Contract Preview',
      parties: 'Parties',
      buyer: 'Buyer',
      seller: 'Seller',
      amount: 'Total Amount',
      duration: 'Duration',
      from: 'From',
      to: 'To',
      scope: 'Scope of Work',
      payment: 'Payment Schedule',
      deposit: 'Deposit',
      progress: 'On Progress',
      completion: 'On Completion',
      terms: 'Terms & Conditions',
      warranty: 'Warranty Period',
      days: 'days',
      signContract: 'Sign Contract',
      reject: 'Go Back',
      editScope: 'Edit Scope',
      adjustPayment: 'Adjust Payment',
      signed: 'Signed',
      pending: 'Pending Signature'
    }
  };

  const t = content[currentLanguage];

  return (
    <div className="space-y-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <SoftCard animate={false} className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10">
            <FileText size={24} className="text-primary" />
          </div>
          <div className="flex-1">
            <Heading2 lang={currentLanguage} className="text-xl">
              {t.title}
            </Heading2>
            <Caption lang={currentLanguage} className="text-muted-foreground">
              #{contractId.slice(0, 8)}
            </Caption>
          </div>
        </div>
      </SoftCard>

      {/* Parties */}
      <SoftCard animate={false} className="p-6">
        <Heading3 lang={currentLanguage} className="text-base mb-4">
          {t.parties}
        </Heading3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <Body lang={currentLanguage} className="text-sm text-muted-foreground">
              {t.buyer}
            </Body>
            <Body lang={currentLanguage} className="text-sm font-semibold">
              {buyerName}
            </Body>
          </div>
          <div className="flex justify-between">
            <Body lang={currentLanguage} className="text-sm text-muted-foreground">
              {t.seller}
            </Body>
            <Body lang={currentLanguage} className="text-sm font-semibold">
              {sellerName}
            </Body>
          </div>
        </div>
      </SoftCard>

      {/* Financial Details */}
      <SoftCard animate={false} className="p-6">
        <div className="space-y-4">
          <div>
            <Caption lang={currentLanguage} className="text-muted-foreground mb-1">
              {t.amount}
            </Caption>
            <Heading2 lang={currentLanguage} className="text-3xl text-primary">
              {amount.toLocaleString()} {currentLanguage === 'ar' ? 'ريال' : 'SAR'}
            </Heading2>
          </div>
        </div>
      </SoftCard>

      {/* Duration */}
      <SoftCard animate={false} className="p-6">
        <Heading3 lang={currentLanguage} className="text-base mb-3">
          {t.duration}
        </Heading3>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1 text-center p-3 rounded-xl bg-muted/30">
            <Caption lang={currentLanguage} className="text-muted-foreground block mb-1">
              {t.from}
            </Caption>
            <Body lang={currentLanguage} className="font-semibold">
              {formatDate(startDate)}
            </Body>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex-1 text-center p-3 rounded-xl bg-muted/30">
            <Caption lang={currentLanguage} className="text-muted-foreground block mb-1">
              {t.to}
            </Caption>
            <Body lang={currentLanguage} className="font-semibold">
              {formatDate(completionDate)}
            </Body>
          </div>
        </div>
      </SoftCard>

      {/* Scope - Editable */}
      <SoftCard animate={false} className="p-6">
        <Heading3 lang={currentLanguage} className="text-base mb-3">
          {t.scope}
        </Heading3>
        <textarea
          value={scope}
          onChange={(e) => onScopeChange?.(e.target.value)}
          className="w-full min-h-[100px] p-3 rounded-xl bg-muted/30 border border-border/30 text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        />
      </SoftCard>

      {/* Actions */}
      <div className="flex gap-3 pt-2 pb-safe">
        {onReject && (
          <Button
            variant="outline"
            onClick={onReject}
            className="flex-1 h-11"
          >
            {t.reject}
          </Button>
        )}
        <Button
          onClick={onSign}
          className="flex-1 h-11 gap-2"
        >
          <CheckCircle size={18} />
          {t.signContract}
        </Button>
      </div>
    </div>
  );
};
