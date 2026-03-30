import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Navigation, Check, Play, MoreVertical, CheckCircle2, ChevronUp, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobProgressStepper } from './JobProgressStepper';
import { JobPhotosUploader } from './JobPhotosUploader';
import { LazyServiceLocationMap } from '@/components/maps/LazyServiceLocationMap';

type MissionStatus =
  | 'accepted'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'seller_completed'
  | 'completed';

interface MissionHeroCardProps {
  currentLanguage: 'en' | 'ar';
  status: MissionStatus;
  serviceType?: string;
  description?: string;
  location?: string;
  lat?: number;
  lng?: number;
  buyerName?: string;
  buyerPhone?: string;
  eta?: number;
  onNavigate: () => void;
  onStartMoving: () => void;
  onMarkArrived: () => void;
  onStartWork: () => void;
  onComplete: () => void;
  onScanCode?: () => void;
  buyerPriceApproved?: boolean;
  onCall: () => void;
  onOpenManageMenu: () => void;
  disabled?: boolean;
  onBeforeUpload?: (url: string) => void;
  onAfterUpload?: (url: string) => void;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}

const SERVICE_EMOJI: Record<string, string> = {
  plumbing: '🔧',
  Plumbing: '🔧',
  electrical: '⚡',
  Electrical: '⚡',
  ac: '❄️',
  AC: '❄️',
  'AC Maintenance': '❄️',
  painting: '🎨',
  Painting: '🎨',
  cleaning: '🧹',
  Cleaning: '🧹',
  carpentry: '🪚',
  Carpentry: '🪚',
  appliance: '🔌',
};

const STATUS_CONFIG: Record<
  MissionStatus,
  { label: string; labelAr: string; color: string; bgColor: string; dot: string }
> = {
  accepted: {
    label: 'CONFIRMED',
    labelAr: 'مؤكد',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100 border-orange-200',
    dot: 'bg-orange-600',
  },
  en_route: {
    label: 'EN ROUTE',
    labelAr: 'في الطريق',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  arrived: {
    label: 'ARRIVED',
    labelAr: 'وصلت',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100 border-blue-200',
    dot: 'bg-blue-600',
  },
  in_progress: {
    label: 'IN PROGRESS',
    labelAr: 'جاري العمل',
    color: 'text-purple-800',
    bgColor: 'bg-purple-100 border-purple-200',
    dot: 'bg-purple-600',
  },
  seller_completed: {
    label: 'AWAITING BUYER',
    labelAr: 'في انتظار المشتري',
    color: 'text-orange-800',
    bgColor: 'bg-orange-100 border-orange-200',
    dot: 'bg-orange-600',
  },
  completed: {
    label: 'DONE',
    labelAr: 'تم',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100 border-slate-200',
    dot: 'bg-slate-500',
  },
};

export function MissionHeroCard({
  currentLanguage,
  status,
  serviceType,
  description,
  location,
  lat,
  lng,
  buyerName,
  buyerPhone,
  eta,
  onNavigate,
  onStartMoving,
  onMarkArrived,
  onStartWork,
  onComplete,
  onScanCode,
  buyerPriceApproved,
  onCall,
  onOpenManageMenu,
  disabled = false,
  onBeforeUpload,
  onAfterUpload,
  beforePhotoUrl,
  afterPhotoUrl,
}: MissionHeroCardProps) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  const handleMapToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsMapExpanded((previous) => !previous);
  };

  const content = {
    en: {
      navigate: 'Google Maps',
      startMoving: 'Start Moving',
      markArrived: 'Mark Arrived',
      startWork: 'Start Job',
      complete: 'Complete Job',
      scanCode: 'Scan / Enter Code',
      waitingForBuyer: 'Waiting for Buyer Approval',
      min: 'min',
      customer: 'Customer',
      mapHint: 'Drag and zoom for street detail',
      collapseMap: 'Collapse map',
      expandMap: 'Expand map',
      locationPending: 'Location pending',
      callBuyer: 'Call buyer',
    },
    ar: {
      navigate: 'خرائط جوجل',
      startMoving: 'بدء التحرك',
      markArrived: 'تأكيد الوصول',
      startWork: 'بدء العمل',
      complete: 'إتمام المهمة',
      scanCode: 'امسح أو أدخل الرمز',
      waitingForBuyer: 'في انتظار موافقة العميل',
      min: 'دقيقة',
      customer: 'العميل',
      mapHint: 'حرّك وكبّر الخريطة لرؤية أوضح',
      collapseMap: 'تصغير الخريطة',
      expandMap: 'توسيع الخريطة',
      locationPending: 'الموقع قيد التحديث',
      callBuyer: 'اتصال بالعميل',
    },
  };

  const t = content[currentLanguage];
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.accepted;
  const emoji = serviceType ? SERVICE_EMOJI[serviceType] || '🔧' : '🔧';

  const getPrimaryAction = () => {
    switch (status) {
      case 'accepted':
        return { label: t.startMoving, icon: Play, onClick: onStartMoving };
      case 'en_route':
        return { label: t.markArrived, icon: Check, onClick: onMarkArrived };
      case 'arrived':
        return { label: t.startWork, icon: Play, onClick: onStartWork };
      case 'in_progress':
        return { label: t.complete, icon: CheckCircle2, onClick: onComplete };
      case 'seller_completed':
        if (buyerPriceApproved && onScanCode) {
          return { label: t.scanCode, icon: CheckCircle2, onClick: onScanCode };
        }
        return {
          label: t.waitingForBuyer,
          icon: CheckCircle2,
          onClick: undefined,
          disabled: true,
        };
      default:
        return null;
    }
  };

  const primaryAction = getPrimaryAction();

  const getStepperStep = (): 'accepted' | 'en_route' | 'working' | 'completed' => {
    switch (status) {
      case 'accepted':
        return 'accepted';
      case 'en_route':
        return 'en_route';
      case 'arrived':
        return 'en_route';
      case 'in_progress':
      case 'seller_completed':
        return 'working';
      case 'completed':
        return 'completed';
      default:
        return 'accepted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card shadow-sm transition-all duration-500"
    >
      <motion.div
        className={cn(
          'relative overflow-hidden bg-[#F0EBE6]',
          !isMapExpanded && 'cursor-pointer',
        )}
        animate={{ height: isMapExpanded ? 360 : 208 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        onClick={!isMapExpanded ? handleMapToggle : undefined}
      >
        <LazyServiceLocationMap
          currentLanguage={currentLanguage}
          lat={lat}
          lng={lng}
          locationLabel={location || t.locationPending}
          interactive={false}
          showLocationPill={false}
          showInteractionHint={false}
          heightClassName={isMapExpanded ? 'h-[360px]' : 'h-[208px]'}
          className="rounded-none border-0 shadow-none"
          statusBadge={
            <Badge
              className={cn(
                'pointer-events-auto rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-sm',
                statusCfg.bgColor,
                statusCfg.color,
              )}
            >
              <span className="mr-1.5 inline-flex h-2 w-2 rounded-full">
                <span className={cn('absolute inline-flex h-2 w-2 rounded-full opacity-60 animate-ping', statusCfg.dot)} />
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusCfg.dot)} />
              </span>
              {currentLanguage === 'ar' ? statusCfg.labelAr : statusCfg.label}
            </Badge>
          }
          actionButton={
            isMapExpanded && hasCoordinates ? (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigate();
                }}
                className="flex h-9 items-center gap-2 rounded-full border border-black/5 bg-white px-4 shadow-md transition-colors hover:bg-gray-50"
              >
                <Navigation className="h-4 w-4 text-primary" />
                <span className={cn('text-xs font-bold text-slate-700', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                  {currentLanguage === 'ar' ? 'الاتجاهات' : 'Get Directions'}
                </span>
              </button>
            ) : null
          }
          footerOverlay={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleMapToggle(event);
              }}
              className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/5 bg-white/84 px-3 py-1.5 shadow-sm backdrop-blur-md"
            >
              <motion.div animate={{ rotate: isMapExpanded ? 0 : 180 }} transition={{ duration: 0.3 }}>
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {hasCoordinates
                  ? isMapExpanded
                    ? t.collapseMap
                    : t.expandMap
                  : t.locationPending}
              </span>
            </button>
          }
        />

        <div className="absolute bottom-16 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/90 shadow-sm backdrop-blur-sm">
          <span className="text-xl opacity-80 drop-shadow-sm">{emoji}</span>
        </div>
      </motion.div>

      <div className="relative z-10 -mt-6 space-y-7 rounded-t-[2.5rem] border-t border-border/10 bg-card px-6 pt-5 pb-6 shadow-[0_-8px_20px_rgb(0,0,0,0.02)]">
        <div className="space-y-1 pt-2">
          <h2
            className={cn(
              'text-[28px] font-extrabold leading-tight tracking-tight text-foreground',
              currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
            )}
          >
            {serviceType || 'Service'}
          </h2>
          {description ? (
            <p
              className={cn(
                'text-[15px] font-medium leading-relaxed text-muted-foreground',
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          <JobProgressStepper
            currentLanguage={currentLanguage}
            currentStep={getStepperStep()}
          />
        </div>

        <div className="space-y-3 border-y border-border/40 py-4 text-[14px] text-muted-foreground/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50">
              <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
            </div>
            <span className={cn('font-medium', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
              {location || t.locationPending}
            </span>
          </div>

          {(buyerName || buyerPhone || eta) ? (
            <div className="flex flex-wrap items-center gap-2">
              {buyerName ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 shadow-sm">
                  <UserRound className="h-3.5 w-3.5 text-primary" />
                  <span className={cn('text-xs font-semibold text-foreground', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {buyerName}
                  </span>
                </div>
              ) : null}

              {typeof eta === 'number' && eta > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 shadow-sm">
                  <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                  <span className={cn('text-xs font-semibold text-emerald-700', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {eta} {t.min}
                  </span>
                </div>
              ) : null}

              {buyerPhone ? (
                <button
                  type="button"
                  onClick={onCall}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 shadow-sm transition-colors hover:bg-primary/10"
                >
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span className={cn('text-xs font-semibold text-primary', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {t.callBuyer}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {status === 'in_progress' && onBeforeUpload && onAfterUpload ? (
          <div className="mb-4">
            <JobPhotosUploader
              currentLanguage={currentLanguage}
              onBeforeUpload={onBeforeUpload}
              onAfterUpload={onAfterUpload}
              beforePhotoUrl={beforePhotoUrl}
              afterPhotoUrl={afterPhotoUrl}
            />
          </div>
        ) : null}

        {primaryAction ? (
          <div className="space-y-3 pt-1">
            <Button
              size="lg"
              disabled={primaryAction.disabled || disabled}
              className={cn(
                'h-[3.5rem] w-full gap-3 rounded-[1.25rem] text-base font-bold transition-all duration-500',
                !(primaryAction.disabled || disabled)
                  ? 'bg-[#A75422] text-white shadow-[0_8px_20px_rgba(167,84,34,0.25)] hover:-translate-y-1 hover:bg-[#8e451b] hover:shadow-[0_12px_25px_rgba(167,84,34,0.35)]'
                  : 'bg-muted text-muted-foreground shadow-none',
              )}
              onClick={primaryAction.onClick}
            >
              <primaryAction.icon className="h-5 w-5" strokeWidth={2.5} />
              {primaryAction.label}
            </Button>

            {status === 'accepted' ? (
              <Button
                variant="outline"
                size="lg"
                className="h-[3.5rem] w-full gap-3 rounded-[1.25rem] border-2 border-border/60 text-base font-bold transition-all hover:bg-muted/50"
                onClick={onNavigate}
              >
                <Navigation className="h-5 w-5 text-primary" strokeWidth={2.5} />
                {t.navigate}
              </Button>
            ) : null}
          </div>
        ) : null}

        <button
          onClick={onOpenManageMenu}
          className="mt-2 flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <MoreVertical className="h-3 w-3" />
          <span>{currentLanguage === 'ar' ? 'إدارة' : 'Manage'}</span>
        </button>
      </div>
    </motion.div>
  );
}
