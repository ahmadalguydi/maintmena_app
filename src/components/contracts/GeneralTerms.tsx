import { useState } from 'react';
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { SoftCard } from '@/components/mobile/SoftCard';

interface GeneralTermsProps {
  currentLanguage: 'en' | 'ar';
}

export const GeneralTerms = ({ currentLanguage }: GeneralTermsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const termsEn = [
    {
      title: '1. Governing Law & Jurisdiction',
      content: `This contract shall be governed by and interpreted in accordance with the laws and regulations of the Kingdom of Saudi Arabia.
Any disputes arising from this contract shall be subject to the jurisdiction of the competent courts of Saudi Arabia, unless resolved amicably.`
    },
    {
      title: '2. Scope of Work',
      content: `The Seller shall perform only the services explicitly described in the agreed job scope.
Any additional work must be agreed upon by both parties in writing prior to execution.`
    },
    {
      title: '3. Seller Responsibilities',
      content: `The Seller confirms that they possess the necessary skills, experience, tools, and any required permits or licenses to perform the service.
The Seller is responsible for work quality, safety practices, and proper execution in accordance with local standards.`
    },
    {
      title: '4. Buyer Responsibilities',
      content: `The Buyer shall provide accurate job details, reasonable site access, and a safe working environment.
Any changes affecting the job must be communicated in a timely manner.`
    },
    {
      title: '5. Completion & Acceptance',
      content: `The service shall be deemed completed upon delivery of the agreed scope of work.
The Buyer must report any defects or concerns within a reasonable period after completion.`
    },
    {
      title: '6. Delays & Force Majeure',
      content: `Neither party shall be held liable for delays caused by circumstances beyond reasonable control, including but not limited to weather conditions, access limitations, or emergencies.
Any delays must be communicated promptly.`
    },
    {
      title: '7. Cancellation',
      content: `Either party may cancel the job prior to commencement with reasonable notice.
Any consequences of cancellation shall depend on the job stage and mutual agreement between the parties.`
    },
    {
      title: '8. Liability & Damages',
      content: `The Seller shall be responsible for damages resulting from negligence or improper workmanship.
MaintMENA bears no liability for service execution, outcomes, or disputes.`
    },
    {
      title: '9. Platform Disclaimer (MaintMENA)',
      content: `MaintMENA is a technology platform facilitating connections between buyers and sellers.
MaintMENA does not supervise, guarantee, or control the quality, timing, or outcome of services and is not a party to the service contract.`
    },
    {
      title: '10. Dispute Resolution',
      content: `The parties agree to attempt resolution of disputes amicably and in good faith.
Unresolved disputes may be escalated through legal channels within Saudi Arabia.`
    },
    {
      title: '11. Confidentiality',
      content: `All personal, commercial, and job-related information shared between parties shall remain confidential and used solely for the purpose of executing the service.`
    },
    {
      title: '12. Amendments',
      content: `Any amendments to this contract must be mutually agreed upon and documented through the platform or written communication.`
    },
    {
      title: '13. Language Priority',
      content: `In the event of any inconsistency between language versions, the Arabic version shall prevail.`
    },
    {
      title: '14. Acknowledgment',
      content: `By proceeding with this contract, both parties acknowledge that they have read, understood, and accepted these General Terms & Policies.`
    }
  ];

  const termsAr = [
    {
      title: '1. القانون الواجب التطبيق والاختصاص القضائي',
      content: `يخضع هذا العقد ويفسر وفقاً لأنظمة وقوانين المملكة العربية السعودية.
تكون المحاكم المختصة في المملكة العربية السعودية هي الجهة المخولة بالنظر في أي نزاع، ما لم يتم حله ودياً.`
    },
    {
      title: '2. نطاق العمل',
      content: `يلتزم مقدم الخدمة بتنفيذ الأعمال الموضحة صراحة في نطاق العمل المتفق عليه فقط.
أي أعمال إضافية تتطلب موافقة خطية مسبقة من الطرفين.`
    },
    {
      title: '3. مسؤوليات مقدم الخدمة',
      content: `يقر مقدم الخدمة بامتلاكه المهارات والخبرة والأدوات اللازمة، وأي تراخيص مطلوبة لتنفيذ الخدمة.
يتحمل مقدم الخدمة مسؤولية جودة العمل، والسلامة، والتنفيذ السليم وفق المعايير المعمول بها.`
    },
    {
      title: '4. مسؤوليات العميل',
      content: `يلتزم العميل بتقديم معلومات دقيقة عن العمل، وتوفير إمكانية الوصول للموقع، وبيئة عمل آمنة.
يجب إشعار مقدم الخدمة بأي تغييرات تؤثر على العمل في الوقت المناسب.`
    },
    {
      title: '5. الإنجاز والاستلام',
      content: `تُعتبر الخدمة مكتملة عند تنفيذ نطاق العمل المتفق عليه.
يجب على العميل الإبلاغ عن أي ملاحظات أو عيوب خلال فترة معقولة بعد الإنجاز.`
    },
    {
      title: '6. التأخير والقوة القاهرة',
      content: `لا يتحمل أي طرف مسؤولية التأخير الناتج عن ظروف خارجة عن الإرادة مثل الأحوال الجوية أو القيود الطارئة أو الحالات الطارئة.
يجب الإبلاغ عن أي تأخير فور حدوثه.`
    },
    {
      title: '7. الإلغاء',
      content: `يحق لأي من الطرفين إلغاء العمل قبل البدء فيه مع إشعار مسبق معقول.
تحدد آثار الإلغاء حسب مرحلة العمل وبما يتفق عليه الطرفان.`
    },
    {
      title: '8. المسؤولية والتعويض',
      content: `يتحمل مقدم الخدمة المسؤولية عن الأضرار الناتجة عن الإهمال أو سوء التنفيذ.
لا تتحمل منصة MaintMENA أي مسؤولية عن تنفيذ الخدمة أو نتائجها أو النزاعات.`
    },
    {
      title: '9. إخلاء مسؤولية المنصة (MaintMENA)',
      content: `تعمل منصة MaintMENA كوسيط تقني لربط العملاء بمقدمي الخدمات فقط.
لا تشرف المنصة على جودة الخدمات ولا تضمن نتائجها، ولا تُعد طرفاً في عقد الخدمة.`
    },
    {
      title: '10. تسوية النزاعات',
      content: `يتعهد الطرفان بمحاولة حل النزاعات ودياً وبحسن نية.
وفي حال عدم التوصل إلى حل، يجوز اللجوء إلى الجهات القضائية المختصة داخل المملكة.`
    },
    {
      title: '11. السرية',
      content: `تُعد جميع المعلومات الشخصية أو المتعلقة بالعمل سرية، ولا يجوز استخدامها أو مشاركتها إلا لغرض تنفيذ الخدمة.`
    },
    {
      title: '12. التعديلات',
      content: `لا يجوز تعديل هذا العقد إلا بموافقة الطرفين وتوثيق ذلك عبر المنصة أو بموجب اتفاق مكتوب.`
    },
    {
      title: '13. أولوية اللغة',
      content: `في حال وجود أي تعارض بين النسخ اللغوية، تُعتمد النسخة العربية.`
    },
    {
      title: '14. الإقرار',
      content: `بالموافقة على هذا العقد، يقر الطرفان بأنهما قرآ وفهما ووافقا على هذه الشروط والأحكام العامة.`
    }
  ];

  const terms = currentLanguage === 'ar' ? termsAr : termsEn;
  const headerText = currentLanguage === 'ar' ? 'الشروط والأحكام العامة' : 'General Terms & Policies';
  const expandText = currentLanguage === 'ar' ? 'عرض الشروط' : 'View Terms';
  const collapseText = currentLanguage === 'ar' ? 'إخفاء الشروط' : 'Hide Terms';

  return (
    <SoftCard className="border border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <div lang={currentLanguage} className="text-foreground font-semibold text-base">
            {headerText}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <BodySmall lang={currentLanguage}>
            {isExpanded ? collapseText : expandText}
          </BodySmall>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-border/30 space-y-4 max-h-96 overflow-y-auto">
              {terms.map((term, index) => (
                <div key={index} className="space-y-1">
                  <BodySmall lang={currentLanguage} className="font-semibold text-foreground">
                    {term.title}
                  </BodySmall>
                  <Body lang={currentLanguage} className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {term.content}
                  </Body>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SoftCard>
  );
};
