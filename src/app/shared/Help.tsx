import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  MessageSquare,
  Mail,
  Loader2,
  HelpCircle,
  FileText,
  CreditCard,
  Shield,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Phone,
  Zap,
  Star,
  MapPin,
  ClipboardCheck,
  Users,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpProps {
  currentLanguage: 'en' | 'ar';
}

// ─── Category definitions ────────────────────────────────────────────────────

const BUYER_CATEGORIES = [
  {
    id: 'how-it-works',
    icon: Zap,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    en: { name: 'How It Works', desc: 'Dispatch model explained' },
    ar: { name: 'كيف يعمل التطبيق', desc: 'شرح نظام التوزيع' },
  },
  {
    id: 'my-requests',
    icon: FileText,
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-600',
    en: { name: 'My Requests', desc: 'Post, track & close jobs' },
    ar: { name: 'طلباتي', desc: 'نشر وتتبع وإغلاق الطلبات' },
  },
  {
    id: 'pricing',
    icon: CreditCard,
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-600',
    en: { name: 'Pricing & Payment', desc: 'Final amounts & approval' },
    ar: { name: 'الأسعار والدفع', desc: 'الأسعار النهائية والموافقة' },
  },
  {
    id: 'safety',
    icon: Shield,
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    en: { name: 'Safety & Trust', desc: 'Verified providers & disputes' },
    ar: { name: 'الأمان والثقة', desc: 'مقدمو خدمات موثقون والنزاعات' },
  },
];

const SELLER_CATEGORIES = [
  {
    id: 'dispatch',
    icon: Zap,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    en: { name: 'Dispatch System', desc: 'How opportunities are sent' },
    ar: { name: 'نظام التوزيع', desc: 'كيف تصلك فرص العمل' },
  },
  {
    id: 'job-flow',
    icon: ClipboardCheck,
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-600',
    en: { name: 'Job Flow', desc: 'Accept → complete → code' },
    ar: { name: 'سير العمل', desc: 'قبول ← إنجاز ← رمز الإنجاز' },
  },
  {
    id: 'seller-earnings',
    icon: TrendingUp,
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-600',
    en: { name: 'Earnings', desc: 'Fees, payment & history' },
    ar: { name: 'الأرباح', desc: 'الرسوم والدفع والسجل' },
  },
  {
    id: 'reputation',
    icon: Star,
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    en: { name: 'Profile & Levels', desc: 'Level up & get priority' },
    ar: { name: 'الملف والمستويات', desc: 'ارتقِ في المستويات للحصول على أولوية' },
  },
];

// ─── FAQ content ─────────────────────────────────────────────────────────────

type FaqEntry = { q: string; a: string };
const FAQ_DATA: Record<string, { en: FaqEntry[]; ar: FaqEntry[] }> = {
  // Buyer FAQs
  'how-it-works': {
    en: [
      {
        q: 'How does MaintMENA work?',
        a: 'Post a maintenance request from your home screen. Our dispatch engine automatically finds and assigns the best available nearby provider based on location, specialty, and ratings — no manual browsing needed.',
      },
      {
        q: 'How quickly is a provider assigned?',
        a: 'ASAP requests are dispatched instantly — most are assigned within minutes. Scheduled requests are assigned ahead of your chosen time slot.',
      },
      {
        q: 'Do I choose my provider?',
        a: 'No — the dispatch engine selects the best match for you automatically. This gives you faster service and removes the hassle of comparing quotes. You\'ll see the provider\'s name, rating, and verification status once assigned.',
      },
      {
        q: 'What categories of services are available?',
        a: 'We cover a wide range: plumbing, electrical, AC, appliances, painting, cleaning, carpentry, and more. We are continuously expanding coverage.',
      },
    ],
    ar: [
      {
        q: 'كيف يعمل تطبيق MaintMENA؟',
        a: 'أرسل طلب صيانة من شاشتك الرئيسية. نظام التوزيع الفوري يجد ويعيّن أفضل مقدم خدمة متاح بناءً على الموقع والتخصص والتقييم — دون الحاجة للبحث يدوياً.',
      },
      {
        q: 'كم يستغرق تعيين مقدم الخدمة؟',
        a: 'الطلبات الفورية تُوزَّع على الفور — معظمها يُعيَّن خلال دقائق. الطلبات المجدولة تُعيَّن قبل وقت موعدك المحدد.',
      },
      {
        q: 'هل أختار مقدم الخدمة بنفسي؟',
        a: 'لا — نظام التوزيع يختار لك أفضل مقدم خدمة تلقائياً. هذا يمنحك خدمة أسرع ويوفر عليك مقارنة العروض. ستقدر تشوف اسم مقدم الخدمة وتقييمه وحالة التحقق منه بمجرد التعيين.',
      },
      {
        q: 'ما هي الخدمات المتاحة؟',
        a: 'نغطي مجالات واسعة: السباكة، الكهرباء، التكييف، الأجهزة، الدهانات، التنظيف، النجارة وغيرها. نحن نوسع تغطيتنا باستمرار.',
      },
    ],
  },
  'my-requests': {
    en: [
      {
        q: 'How do I post a request?',
        a: 'Tap "New Request" on the home screen. Select a category, describe the issue, add photos if helpful, choose ASAP or a scheduled time, then submit. The system takes it from there.',
      },
      {
        q: 'Can I cancel a request?',
        a: 'Yes — as long as the provider hasn\'t started work yet. Open the request from your Activity tab and tap Cancel.',
      },
      {
        q: 'What is the completion code?',
        a: 'When the provider marks the job done and submits the final price, a 6-digit code appears on your screen. Share this code with the provider to confirm job completion. The code is only visible to you — this protects both parties.',
      },
      {
        q: 'How do I track the provider?',
        a: 'Once assigned, you can see the provider\'s status (On the Way, Arrived, In Progress) in real time from the request details screen.',
      },
    ],
    ar: [
      {
        q: 'كيف أنشر طلب؟',
        a: 'اضغط "طلب جديد" في الشاشة الرئيسية. اختر الفئة، صف المشكلة، أضف صوراً إذا أردت، حدد فوري أو مجدول، ثم أرسل. النظام يتولى الباقي.',
      },
      {
        q: 'هل يمكنني إلغاء الطلب؟',
        a: 'نعم — طالما لم يبدأ مقدم الخدمة العمل بعد. افتح الطلب من تبويب نشاطي واضغط إلغاء.',
      },
      {
        q: 'ما هو رمز الإنجاز؟',
        a: 'عندما يُنهي مقدم الخدمة العمل ويرسل السعر النهائي، يظهر رمز مكون من 6 أرقام على شاشتك. أعطِ هذا الرمز لمقدم الخدمة لتأكيد الإنجاز. الرمز مرئي لك فقط — هذا يحمي الطرفين.',
      },
      {
        q: 'كيف أتابع مقدم الخدمة؟',
        a: 'بمجرد التعيين، يمكنك متابعة حالة مقدم الخدمة (في الطريق، وصل، جاري العمل) في الوقت الفعلي من شاشة تفاصيل الطلب.',
      },
    ],
  },
  pricing: {
    en: [
      {
        q: 'How is the final price decided?',
        a: 'After assessing the job on site, the provider submits a final price and completion photos through the app. You review it and approve before the job is officially closed.',
      },
      {
        q: 'When do I pay?',
        a: 'Payment is arranged directly with the provider after you approve the final amount. MaintMENA does not process payments at this time.',
      },
      {
        q: 'Can I dispute a final price?',
        a: 'Yes. If you feel the price is unfair, contact support within 48 hours of the job closing. We review all disputes.',
      },
      {
        q: 'Are there platform fees for buyers?',
        a: 'No. Using MaintMENA as a buyer is completely free.',
      },
    ],
    ar: [
      {
        q: 'كيف يتحدد السعر النهائي؟',
        a: 'بعد تقييم العمل في الموقع، يرسل مقدم الخدمة السعر النهائي وصور الإنجاز عبر التطبيق. أنت تراجعه وتوافق عليه قبل إغلاق الطلب رسمياً.',
      },
      {
        q: 'متى أدفع؟',
        a: 'يتم ترتيب الدفع مباشرة مع مقدم الخدمة بعد موافقتك على المبلغ النهائي. لا تعالج MaintMENA المدفوعات حالياً.',
      },
      {
        q: 'هل يمكنني الاعتراض على السعر النهائي؟',
        a: 'نعم. إذا رأيت أن السعر غير عادل، تواصل مع الدعم خلال 48 ساعة من إغلاق الطلب. نراجع جميع النزاعات.',
      },
      {
        q: 'هل هناك رسوم للعملاء؟',
        a: 'لا. استخدام MaintMENA كعميل مجاني تماماً.',
      },
    ],
  },
  safety: {
    en: [
      {
        q: 'What does the "Verified" badge mean?',
        a: 'Verified providers have passed MaintMENA\'s identity verification and business license checks. Look for the blue checkmark on their profile.',
      },
      {
        q: 'What if I have a problem with a provider?',
        a: 'Tap the flag/report button inside the request screen. We investigate all reports within 24 hours. For urgent issues, contact support directly via WhatsApp.',
      },
      {
        q: 'Are reviews genuine?',
        a: 'Yes. Only buyers who completed a confirmed job can leave a review. Reviews cannot be edited after submission.',
      },
      {
        q: 'Is my personal data safe?',
        a: 'Yes. We use industry-standard encryption. Your contact information is only shared with the assigned provider for the duration of the job.',
      },
    ],
    ar: [
      {
        q: 'ماذا تعني شارة "موثق"؟',
        a: 'مقدمو الخدمات الموثقون اجتازوا فحوصات التحقق من الهوية والترخيص التجاري لدى MaintMENA. ابحث عن علامة الاختيار الزرقاء في ملفهم.',
      },
      {
        q: 'ماذا أفعل إذا واجهت مشكلة مع مقدم الخدمة؟',
        a: 'اضغط زر الإبلاغ داخل شاشة الطلب. نحقق في جميع البلاغات خلال 24 ساعة. للمشاكل العاجلة، تواصل مع الدعم مباشرة عبر واتساب.',
      },
      {
        q: 'هل التقييمات حقيقية؟',
        a: 'نعم. فقط العملاء الذين أتموا طلباً مؤكداً يمكنهم ترك تقييم. لا يمكن تعديل التقييمات بعد الإرسال.',
      },
      {
        q: 'هل بياناتي الشخصية آمنة؟',
        a: 'نعم. نستخدم تشفيراً معيارياً. معلومات التواصل تُشارك فقط مع مقدم الخدمة المعيَّن طوال مدة المهمة.',
      },
    ],
  },

  // Seller FAQs
  dispatch: {
    en: [
      {
        q: 'How do I receive job opportunities?',
        a: 'Go online from your home screen by toggling your availability. The dispatch engine automatically sends you opportunities that match your service categories and location. You\'ll get a push notification for each one.',
      },
      {
        q: 'How should I respond to opportunities?',
        a: 'Accept or decline quickly. Faster accept rates improve your dispatch priority, meaning you\'ll receive more opportunities. Declining too often or ignoring requests may reduce your match frequency.',
      },
      {
        q: 'What areas will I get jobs from?',
        a: 'Jobs come from within your service radius. Set or adjust it from Profile → Service Areas. A 15–30 km radius is typical for urban areas in Saudi Arabia.',
      },
      {
        q: 'Why am I not receiving opportunities?',
        a: 'Check that: (1) you\'re online, (2) you have at least one active service category set, (3) your service area is configured. If all are correct, demand may be low in your area right now — it fluctuates by time and day.',
      },
    ],
    ar: [
      {
        q: 'كيف أستلم فرص العمل؟',
        a: 'تأكد أنك متاح من شاشتك الرئيسية. نظام التوزيع يرسل لك تلقائياً الفرص التي تناسب خدماتك وموقعك. ستتلقى إشعاراً لكل فرصة.',
      },
      {
        q: 'كيف يجب أن أرد على الفرص؟',
        a: 'اقبل أو ارفض بسرعة. معدل القبول السريع يحسن أولويتك في التوزيع، مما يعني المزيد من الفرص. الرفض المتكرر أو تجاهل الطلبات قد يقلل من تكرار مطابقتك.',
      },
      {
        q: 'من أي مناطق ستأتيني المهام؟',
        a: 'تأتي المهام من ضمن نطاق خدمتك. اضبطه من الملف الشخصي ← مناطق الخدمة. نطاق 15-30 كم شائع للمناطق الحضرية في السعودية.',
      },
      {
        q: 'لماذا لا أستلم فرصاً؟',
        a: 'تأكد من: (1) أنك متاح، (2) لديك فئة خدمة نشطة واحدة على الأقل، (3) منطقة الخدمة محددة. إذا كان كل شيء صحيحاً، الطلب قد يكون منخفضاً في منطقتك الآن — يتفاوت حسب الوقت واليوم.',
      },
    ],
  },
  'job-flow': {
    en: [
      {
        q: 'What happens after I accept an opportunity?',
        a: 'Head to the customer\'s location. Update your status to "Arrived" in the app when you get there. After assessing and completing the work, submit your final price and completion photos.',
      },
      {
        q: 'How does the completion code work?',
        a: 'After you submit the final price and photos, the system shows a 6-digit code on the customer\'s screen — not yours. Ask the customer to read it to you, then enter it in the app to close the job. This protects both parties from disputes.',
      },
      {
        q: 'What if the customer is unreachable?',
        a: 'Tap "Customer Not Responding" in the active job screen to initiate a call. If still unreachable, document the situation in the job notes with a time-stamped photo, then contact support.',
      },
      {
        q: 'Can I cancel an accepted job?',
        a: 'Yes, but cancelling after accepting negatively affects your reliability score. Use Cancel only in genuine emergencies. Tap Cancel Job from the active job screen and select a reason.',
      },
    ],
    ar: [
      {
        q: 'ماذا يحدث بعد قبول الفرصة؟',
        a: 'توجه إلى موقع العميل. حدّث حالتك إلى "وصلت" في التطبيق عند وصولك. بعد تقييم العمل وإنجازه، أرسل السعر النهائي وصور الإنجاز.',
      },
      {
        q: 'كيف يعمل رمز الإنجاز؟',
        a: 'بعد إرسال السعر النهائي والصور، يظهر النظام رمزاً مكوناً من 6 أرقام على شاشة العميل — ليس شاشتك. اطلب من العميل قراءته لك، ثم أدخله في التطبيق لإغلاق المهمة. هذا يحمي الطرفين من النزاعات.',
      },
      {
        q: 'ماذا أفعل إذا كان العميل غير متاح؟',
        a: 'اضغط "العميل لا يرد" في شاشة المهمة النشطة لبدء مكالمة. إذا لم يرد، وثّق الموقف في ملاحظات المهمة بصورة مع الطابع الزمني، ثم تواصل مع الدعم.',
      },
      {
        q: 'هل يمكنني إلغاء مهمة مقبولة؟',
        a: 'نعم، لكن الإلغاء بعد القبول يؤثر سلباً على معدل موثوقيتك. استخدم الإلغاء فقط في الحالات الطارئة الحقيقية. اضغط إلغاء المهمة من شاشة المهمة النشطة واختر سبباً.',
      },
    ],
  },
  'seller-earnings': {
    en: [
      {
        q: 'How much does MaintMENA charge?',
        a: 'Currently 0% — you keep 100% of your earnings during the introductory period. Platform fees will be announced in advance when introduced.',
      },
      {
        q: 'How do I get paid?',
        a: 'Payment is arranged directly with the buyer after job completion. MaintMENA does not process payments at this time — you collect payment on-site.',
      },
      {
        q: 'Where do I see my earnings history?',
        a: 'Go to Profile → Earnings & History. You\'ll see this month vs last month, completed jobs count, and a transaction list.',
      },
      {
        q: 'Are there any upfront costs?',
        a: 'No. Joining and using MaintMENA as a service provider is completely free during the introductory period.',
      },
    ],
    ar: [
      {
        q: 'كم تأخذ MaintMENA من أرباحي؟',
        a: 'حالياً 0% — تحتفظ بـ 100% من أرباحك خلال الفترة التعريفية. سيتم الإعلان عن رسوم المنصة مسبقاً عند تطبيقها.',
      },
      {
        q: 'كيف أُحصّل مستحقاتي؟',
        a: 'يتم ترتيب الدفع مباشرة مع العميل بعد إتمام المهمة. لا تعالج MaintMENA المدفوعات حالياً — تحصّل المبلغ في الموقع.',
      },
      {
        q: 'أين أجد سجل أرباحي؟',
        a: 'اذهب إلى الملف الشخصي ← الأرباح والسجل. ستجد مقارنة هذا الشهر بالشهر الماضي، عدد المهام المكتملة، وقائمة المعاملات.',
      },
      {
        q: 'هل هناك تكاليف مسبقة؟',
        a: 'لا. الانضمام واستخدام MaintMENA كمقدم خدمة مجاني تماماً خلال الفترة التعريفية.',
      },
    ],
  },
  reputation: {
    en: [
      {
        q: 'How does the level system work?',
        a: 'Starter (0 jobs) → Pro (5 jobs) → Expert (15 jobs) → Master (30 jobs). Higher levels get higher dispatch priority, meaning you receive opportunities before lower-level providers in the same area.',
      },
      {
        q: 'Why should I complete my profile?',
        a: 'Complete profiles get significantly more job matches. Fill in your bio, add your services, set your service area, upload portfolio photos, and add certifications. Each section improves your match score.',
      },
      {
        q: 'How do reviews affect my dispatch priority?',
        a: 'Your average rating directly affects dispatch priority. Maintaining 4★+ keeps you competitive. After each completed job, the buyer receives a prompt to leave a rating.',
      },
      {
        q: 'What counts as a "completed job" for leveling?',
        a: 'A job is counted when both the seller submits completion (with final price and photos) and the buyer enters the 6-digit confirmation code, fully closing the request.',
      },
    ],
    ar: [
      {
        q: 'كيف يعمل نظام المستويات؟',
        a: 'مبتدئ (0 مهام) ← محترف (5 مهام) ← خبير (15 مهمة) ← خبير متميز (30 مهمة). المستويات الأعلى تحصل على أولوية أعلى في التوزيع، أي تستلم فرصاً قبل مقدمي الخدمات ذوي المستويات الأدنى في نفس المنطقة.',
      },
      {
        q: 'لماذا يجب أن أُكمل ملفي الشخصي؟',
        a: 'الملفات الشخصية الكاملة تحصل على مطابقات أكثر بكثير. أضف نبذة عنك، وخدماتك، ومنطقة خدمتك، وصور معرض الأعمال، والشهادات. كل قسم تكمله يحسن درجة المطابقة.',
      },
      {
        q: 'كيف تؤثر التقييمات على أولويتي في التوزيع؟',
        a: 'متوسط تقييمك يؤثر مباشرة على أولوية التوزيع. الحفاظ على 4★+ يبقيك تنافسياً. بعد كل مهمة مكتملة، يتلقى العميل دعوة لترك تقييم.',
      },
      {
        q: 'ما الذي يُحتسب "مهمة مكتملة" للترقي؟',
        a: 'تُحتسب المهمة عندما يرسل مقدم الخدمة الإنجاز (بالسعر النهائي والصور) ويُدخل العميل رمز التأكيد المكون من 6 أرقام، مما يغلق الطلب بالكامل.',
      },
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Help = ({ currentLanguage }: HelpProps) => {
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const isArabic = currentLanguage === 'ar';
  const isSeller = userType === 'seller';

  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '' });

  const t = {
    en: {
      title: 'Help Center',
      sellerGreeting: 'Help for Providers',
      buyerGreeting: 'Help for Clients',
      sellerSub: 'Everything about dispatch, jobs & earnings',
      buyerSub: 'Everything about requests, pricing & safety',
      faqTopics: 'FAQ Topics',
      contactUs: 'Contact Support',
      contactUsSub: 'Typically responds in 2–4 hours',
      whatsapp: 'WhatsApp Support',
      whatsappSub: 'Fastest response — direct chat',
      emailSupport: 'Email Us',
      emailAddr: 'support@maintmena.com',
      subject: 'Subject',
      message: 'Describe your issue…',
      send: 'Send Message',
      sent: 'Message sent!',
      needMore: 'Need more help?',
      whatsappNumber: 'https://wa.me/966500000000',
    },
    ar: {
      title: 'مركز المساعدة',
      sellerGreeting: 'مساعدة مقدمي الخدمة',
      buyerGreeting: 'مساعدة العملاء',
      sellerSub: 'كل شيء عن التوزيع والمهام والأرباح',
      buyerSub: 'كل شيء عن الطلبات والأسعار والأمان',
      faqTopics: 'مواضيع الأسئلة الشائعة',
      contactUs: 'تواصل مع الدعم',
      contactUsSub: 'عادة يرد خلال 2–4 ساعات',
      whatsapp: 'واتساب',
      whatsappSub: 'أسرع رد — محادثة مباشرة',
      emailSupport: 'راسلنا',
      emailAddr: 'support@maintmena.com',
      subject: 'الموضوع',
      message: 'صف مشكلتك…',
      send: 'إرسال الرسالة',
      sent: 'تم إرسال الرسالة!',
      needMore: 'تحتاج مساعدة إضافية؟',
      whatsappNumber: 'https://wa.me/966500000000',
    },
  }[currentLanguage];

  const categories = isSeller ? SELLER_CATEGORIES : BUYER_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error(isArabic ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('contact_form_submissions').insert({
        name: user?.email || 'Anonymous',
        email: user?.email || '',
        subject: formData.subject,
        message: formData.message,
        status: 'new',
      });
      if (error) throw error;
      toast.success(t.sent);
      setFormData({ subject: '', message: '' });
      setShowContactSheet(false);
    } catch {
      toast.error(isArabic ? 'فشل الإرسال' : 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const selectedFaqs = selectedCategory
    ? (FAQ_DATA[selectedCategory]?.[currentLanguage] ?? [])
    : [];

  const selectedCatName = selectedCategory
    ? (categories.find((c) => c.id === selectedCategory)?.[currentLanguage].name ?? '')
    : '';

  return (
    <div className="min-h-screen bg-background pb-28" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <div className="px-4 py-5 space-y-6">

        {/* ── Role-aware hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-3xl p-5 flex items-center gap-4',
            isSeller
              ? 'bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20'
              : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20',
          )}
        >
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
            isSeller ? 'bg-primary/10' : 'bg-blue-500/10',
          )}>
            {isSeller
              ? <Briefcase className="w-7 h-7 text-primary" />
              : <HelpCircle className="w-7 h-7 text-blue-600" />
            }
          </div>
          <div className="min-w-0">
            <p className={cn(
              'text-base font-bold',
              isArabic ? 'font-ar-heading' : 'font-heading',
            )}>
              {isSeller ? t.sellerGreeting : t.buyerGreeting}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
              {isSeller ? t.sellerSub : t.buyerSub}
            </p>
          </div>
        </motion.div>

        {/* ── FAQ Topics ── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            {t.faqTopics}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              const catContent = cat[currentLanguage];
              return (
                <motion.button
                  key={cat.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => { setSelectedCategory(cat.id); setOpenFaqIdx(null); }}
                  className="text-start"
                >
                  <div className="bg-card border border-border/50 rounded-3xl p-4 h-full hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.97]">
                    <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-3', cat.bgColor)}>
                      <Icon size={18} className={cat.iconColor} />
                    </div>
                    <p className={cn('text-sm font-semibold leading-tight', isArabic ? 'font-ar-display' : 'font-display')}>
                      {catContent.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {catContent.desc}
                    </p>
                    <div className="flex justify-end mt-3">
                      <ChevronRight size={14} className={cn('text-muted-foreground', isArabic && 'rotate-180')} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Contact / Support ── */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            {t.needMore}
          </p>
          <div className="space-y-2">
            {/* WhatsApp — primary */}
            <button
              type="button"
              onClick={() => window.open(t.whatsappNumber, '_blank')}
              className="w-full flex items-center gap-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-3xl p-4 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-green-600" />
              </div>
              <div className="flex-1 text-start">
                <p className={cn('text-sm font-semibold text-green-800 dark:text-green-300', isArabic && 'font-ar-body')}>
                  {t.whatsapp}
                </p>
                <p className="text-xs text-green-600/80 dark:text-green-400/80">{t.whatsappSub}</p>
              </div>
              <ExternalLink size={14} className="text-green-500 shrink-0" />
            </button>

            {/* Contact form */}
            <button
              type="button"
              onClick={() => setShowContactSheet(true)}
              className="w-full flex items-center gap-3 bg-card border border-border/50 rounded-3xl p-4 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-primary" />
              </div>
              <div className="flex-1 text-start">
                <p className={cn('text-sm font-semibold', isArabic && 'font-ar-body')}>{t.contactUs}</p>
                <p className="text-xs text-muted-foreground">{t.contactUsSub}</p>
              </div>
              <ChevronRight size={14} className={cn('text-muted-foreground shrink-0', isArabic && 'rotate-180')} />
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={() => window.open(`mailto:${t.emailAddr}`, '_blank')}
              className="w-full flex items-center gap-3 bg-card border border-border/50 rounded-3xl p-4 hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-primary" />
              </div>
              <div className="flex-1 text-start">
                <p className={cn('text-sm font-semibold', isArabic && 'font-ar-body')}>{t.emailSupport}</p>
                <p className="text-xs text-muted-foreground">{t.emailAddr}</p>
              </div>
              <ExternalLink size={14} className="text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* ── FAQ Sheet with inline accordion ── */}
      <Sheet open={!!selectedCategory} onOpenChange={() => { setSelectedCategory(null); setOpenFaqIdx(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-5">
            <SheetTitle className={cn('text-lg', isArabic ? 'text-right font-ar-display' : 'font-display')}>
              {selectedCatName}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-2" dir={isArabic ? 'rtl' : 'ltr'}>
            {selectedFaqs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isArabic ? 'لا توجد أسئلة متاحة' : 'No FAQs available'}
                </p>
              </div>
            ) : (
              selectedFaqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-start"
                  >
                    <p className={cn(
                      'text-sm font-semibold flex-1 leading-snug',
                      isArabic ? 'font-ar-body' : 'font-body',
                    )}>
                      {faq.q}
                    </p>
                    <ChevronDown
                      size={16}
                      className={cn(
                        'text-muted-foreground shrink-0 transition-transform duration-200',
                        openFaqIdx === idx && 'rotate-180',
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaqIdx === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-border/50">
                          <p className={cn(
                            'text-sm text-muted-foreground leading-relaxed pt-3',
                            isArabic ? 'font-ar-body' : '',
                          )}>
                            {faq.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-border/30">
            <button
              type="button"
              onClick={() => { setSelectedCategory(null); setShowContactSheet(true); }}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare size={15} />
              {isArabic ? 'لم تجد ما تبحث عنه؟ تواصل معنا' : 'Didn\'t find your answer? Contact us'}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Contact Form Sheet ── */}
      <Sheet open={showContactSheet} onOpenChange={setShowContactSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader>
            <SheetTitle className={cn(isArabic ? 'text-right font-ar-display' : 'font-display')}>
              {t.contactUs}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="space-y-1.5">
              <Label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider', isArabic && 'font-ar-body')}>
                {t.subject}
              </Label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={t.subject}
                className="w-full h-12 px-4 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider', isArabic && 'font-ar-body')}>
                {t.message}
              </Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.message}
                rows={5}
                className="rounded-2xl resize-none"
                dir={isArabic ? 'rtl' : 'ltr'}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full h-12 gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.send}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};
