import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  currentLanguage: 'en' | 'ar';
}

const FAQ = ({ currentLanguage }: FAQProps) => {
  const content = {
    en: {
      title: 'Frequently Asked Questions',
      faqs: [
        {
          id: 'what',
          question: 'What services are covered?',
          answer: 'All maintenance, renovation, and project services.'
        },
        {
          id: 'verified',
          question: 'Are professionals verified?',
          answer: 'Yes, every vendor is vetted and reviewed.'
        },
        {
          id: 'payment',
          question: 'How does payment work?',
          answer: 'Secure payment through MaintMENA with optional deposit protection.'
        }
      ]
    },
    ar: {
      title: 'الأسئلة الشائعة',
      faqs: [
        {
          id: 'what',
          question: 'وش تشمل الخدمات؟',
          answer: 'كل خدمات الصيانة والترميم والمشاريع.'
        },
        {
          id: 'verified',
          question: 'هل المحترفين موثوقين؟',
          answer: 'أكيد كلهم يتم التحقق منهم وتقييمهم.'
        },
        {
          id: 'payment',
          question: 'وشلون أدفع؟',
          answer: 'عن طريق دفع آمن داخل MaintMENA وتقدر تختار نظام العربون للحماية.'
        }
      ]
    }
  };

  return (
    <section id="faq" className="py-16 rule-h" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-headline-2 mb-12 text-center">
          {content[currentLanguage].title}
        </h2>

        <Accordion type="single" collapsible className="space-y-2">
          {content[currentLanguage].faqs.map((faq) => (
            <AccordionItem 
              key={faq.id} 
              value={faq.id}
              className="border border-rule rounded-lg px-6 bg-paper"
            >
              <AccordionTrigger className="text-left hover:no-underline py-4">
                <span className="font-display font-medium text-lg">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;