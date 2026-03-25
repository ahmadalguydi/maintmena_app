import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MotionButton = motion.create(Button);

interface HeroProps {
  currentLanguage: "en" | "ar";
  onSamplePdfOpen: () => void;
}

type H1Variant = "B" | "C" | "D" | "E" | "F" | "G" | "H" | "J" | "K" | "L" | "M" | "N" | "O" | "P";

const Hero = ({ currentLanguage, onSamplePdfOpen }: HeroProps) => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();
  const [h1Variant, setH1Variant] = useState<H1Variant>("B");

  useEffect(() => {
    // Check URL params for A/B testing
    const urlParams = new URLSearchParams(window.location.search);
    const paramVariant = urlParams.get("h1");

    const validVariants: H1Variant[] = ["B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P"];

    if (paramVariant && validVariants.includes(paramVariant as H1Variant)) {
      setH1Variant(paramVariant as H1Variant);
    } else {
      // Default random assignment with persistence
      const stored = localStorage.getItem("h1Variant");
      if (stored && validVariants.includes(stored as H1Variant)) {
        setH1Variant(stored as H1Variant);
      } else {
        const randomVariant = validVariants[Math.floor(Math.random() * validVariants.length)];
        setH1Variant(randomVariant);
        localStorage.setItem("h1Variant", randomVariant);
      }
    }

    // Analytics tracking
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "h1_variant_shown",
        variant: h1Variant,
        timestamp: Date.now(),
      });
    }
  }, [h1Variant]);

  const h1Content = {
    en: {
      B: "Where Every Project Finds Its Expert",
      C: "Your Home, Your Project, Our Network",
      D: "Connect. Create. Complete.",
      E: "From Small Fixes to Grand Builds",
      F: "Trusted Work Begins Here",
      G: "The Modern Way to Maintain and Build",
      H: "Find the Right Hands for Every Job",
      J: "Your Project Partner in Every Step",
      K: "A Well-Kept Home, A Better Life",
      L: "We Found the Right Hands for You",
      M: "Build or Fix, At Your Pace",
      N: "Request. Compare. Book.",
      O: "Trust Delivered to Your Door",
      P: "Less Time, Better Results",
    },
    ar: {
      B: "المكان اللي كل مشروع يلقى فيه خبيره",
      C: "بيتك، مشروعك، شبكتنا",
      D: "تواصل أنشئ وخلّص",
      E: "من تصليح بسيط إلى مشروع كبير",
      F: "الشغل الموثوق يبدأ من هنا",
      G: "الطريقة الحديثة للصيانة والبناء",
      H: "إلقى الأيادي الصح لكل شغله",
      J: "شريكك بكل خطوة في مشروعك",
      K: "بيت مرتّب وحياة أهدى",
      L: "لقينا لك الأيدين الصح",
      M: "تبني أو تصلّح على راحتك",
      N: "اطلب وقارن واحجز",
      O: "ثقة توصل لين بابك",
      P: "وقت أقل ونتيجة أفضل",
    },
  };

  const dekContent = {
    en: {
      B: "From home repairs to major builds, MaintMENA connects the right people for every job.",
      C: "Thousands of verified contractors ready to help you build, renovate, or maintain. All in one place.",
      D: "MaintMENA bridges homeowners, developers, and professionals in one seamless experience.",
      E: "Get the right team for your needs. Repairs, renovations, or full projects made easy.",
      F: "MaintMENA is where professionals grow and homeowners build with confidence.",
      G: "Compare quotes, sign contracts, and track progress. Everything in one smart dashboard.",
      H: "Search, compare, and book verified pros for maintenance, renovation, or construction.",
      J: "MaintMENA helps you hire, manage, and grow. From quick fixes to long-term builds.",
      K: "From quick repairs to full renovations, book, track, and complete your projects without hassle.",
      L: "Choose from verified professionals with real reviews and transparent pricing across all cities. Get multiple quotes and make informed decisions.",
      M: "A platform connecting homeowners and developers with the best technicians and contractors, ensuring quality delivery on time. Digital contracts and documented files make the experience easier and more secure.",
      N: "See prices before you commit and track every step. If you're a technician, submit organized proposals with photos of your work and services, and get priority in search with a verified profile.",
      O: "We verify profiles and showcase each service provider's expertise so you can choose with confidence. Secure payments, options, and contracts build a safe relationship between client and provider.",
      P: "Reduce random calls and questions, and get the best offer based on real reviews. Save time with ready proposals, smart contract templates, and clear pricing.",
    },
    ar: {
      B: "من تصليحات بسيطة إلى مشاريع ضخمة. نوصلك بالشخص المناسب لكل شغل.",
      C: "آلاف المقاولين الموثوقين جاهزين يساعدونك في البناء أو الترميم أو الصيانة. الكل في مكان واحد.",
      D: "تجمع أصحاب المنازل والمطورين والمحترفين في تجربة وحدة سهلة ومتكاملة.",
      E: "تلقى الفريق المناسب لأي نوع من الشغل. صيانة أو ترميم أو بناء كامل بكل سهولة.",
      F: "المكان الي المحترفين يكبرون فيه وأصحاب البيوت يصلحون بثقة وراحة بال.",
      G: "قارن الأسعار ووقّع العقود وتابع الشغل من لوحة تحكم ذكية وسهلة.",
      H: "ابحث وقارن واحجز محترفين موثوقين لأي خدمة تحتاجها من الصيانة إلى البناء.",
      J: "نساعدك توظّف وتتابع وتنجز من أصغر تصليح لأكبر مشروع.",
      K: "من تصليحات سريعة لترميم كامل تقدر تحجز وتتابع وتنهي بدون لف ودوران.",
      L: "اختَر من محترفين موثوقين بتقييمات حقيقية وأسعار واضحة في كل مدن المملكة. استلم أكثر من عرض وخل القرار لك.",
      M: "منصّة تربط أصحاب البيوت والمطورين مع أفضل الفنيين والمقاولين وتضمن جودة وتسليم في الوقت. عقود رقمية وملفات موثّقة  تخلي التجربة أسهل وأضمن.",
      N: "شف الأسعار قبل ما توافق وخلك متابع لكل خطوة. وإذا كنت فني، قدّم عروض مرتّبة بصور أعمالك وخدماتك وخذ أولوية في البحث مع ملف موثّق.",
      O: "نتحقق من الملفات ونبيّن خبرات كل مقدم خدمة عشان تختار وانت مرتاح. دفع آمن وخيارات وعقود تبني علاقة آمنة بين العميل والمزوّد.",
      P: "خفف السؤال والاتصال العشوائي وخذ أفضل عرض مبني على تقييمات حقيقية. اختصر وقتك بعروض جاهزة ونماذج عقد ذكية وتسعير واضح.",
    },
  };

  const handleStartTrial = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "hero_cta_click",
        variant: h1Variant,
        cta_type: "start_trial",
        timestamp: Date.now(),
      });
    }
    // Memberstack will handle this via data-ms-plan:add attribute
  };

  const handleSampleClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "sample_pdf_open",
        variant: h1Variant,
        timestamp: Date.now(),
      });
    }
    onSamplePdfOpen();
  };

  const handleFindProClick = () => {
    // Not logged in
    if (!user) {
      toast.info(
        currentLanguage === "ar"
          ? "سجّل كمشتري عشان تلقى مقدمي خدمات موثوقين. احصل على عروض، قارن، واحجز بثقة!"
          : "Sign up as a buyer to find trusted service providers. Get quotes, compare, and book with confidence!",
        {
          duration: 5000,
          action: {
            label: currentLanguage === "ar" ? "سجّل الآن" : "Sign Up",
            onClick: () => navigate("/login"),
          },
        },
      );
      navigate("/login");
      return;
    }

    // Logged in as seller
    if (userType === "seller") {
      toast.warning(
        currentLanguage === "ar"
          ? "هذه الميزة للمشترين فقط. عشان توظف محترفين لمشاريعك، لازم تسوي حساب مشتري."
          : "This feature is only for buyers. To hire professionals for your projects, you'll need to create a buyer account.",
        {
          duration: 5000,
        },
      );
      return;
    }

    // Logged in as buyer or admin - allow navigation
    navigate("/explore");
  };

  const handleFindJobClick = () => {
    // Not logged in
    if (!user) {
      toast.info(
        currentLanguage === "ar"
          ? "سجّل كبائع عشان تحصل على مشاريع حقيقية وتنمي شغلك. انضم لمئات المحترفين الموثوقين!"
          : "Sign up as a seller to find real projects and grow your business. Join hundreds of verified professionals!",
        {
          duration: 5000,
          action: {
            label: currentLanguage === "ar" ? "سجّل الآن" : "Sign Up",
            onClick: () => navigate("/login"),
          },
        },
      );
      navigate("/login");
      return;
    }

    // Logged in as buyer
    if (userType === "buyer") {
      toast.warning(
        currentLanguage === "ar"
          ? "هذه الميزة لمقدمي الخدمات فقط. عشان تقدم خدماتك وتحصل على مشاريع، لازم تسوي حساب بائع."
          : "This feature is only for service providers. To offer your services and get projects, you'll need to create a seller account.",
        {
          duration: 5000,
        },
      );
      return;
    }

    // Logged in as seller or admin - allow navigation
    navigate("/marketplace");
  };

  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-paper to-muted/30"
      dir={currentLanguage === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Headline */}
        <motion.div
          className="text-center mb-12 overflow-visible"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 bg-gradient-to-r from-ink via-accent to-accent-2 bg-clip-text text-transparent leading-snug md:leading-normal py-2">
            {h1Content[currentLanguage][h1Variant] || h1Content[currentLanguage]["B"]}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {dekContent[currentLanguage][h1Variant] || dekContent[currentLanguage]["B"]}
          </p>
        </motion.div>

        {/* Split Hero - Two Paths */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Buyer Path */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl border-2 border-rule/40 bg-gradient-to-br from-paper to-muted/50 p-8 md:p-10 hover:border-accent/60 transition-all duration-300 hover:shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>

            <div className="relative">
              <div className="text-5xl mb-4">🏠</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-ink">
                {currentLanguage === "ar" ? "أحتاج خدمة" : "I Need a Service"}
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {currentLanguage === "ar"
                  ? "ابحث عن محترفين موثوقين للصيانة، التجديد، أو البناء. قارن العروض واحجز بثقة"
                  : "Find trusted professionals for maintenance, renovation, or construction. Compare quotes and book with confidence."}
              </p>

              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <span>{currentLanguage === "ar" ? "فنيين موثقين ومراجعين" : "Verified & Reviewed Pros"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <span>{currentLanguage === "ar" ? "ردود سريعة خلال ساعات" : "Fast Responses in Hours"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <span>{currentLanguage === "ar" ? "احجز وتتبع كل شيء بسهولة" : "Easy Booking & Tracking"}</span>
                </li>
              </ul>

              <Button
                size="lg"
                onClick={handleFindProClick}
                className="w-full bg-accent hover:bg-accent-hover text-paper font-bold shadow-lg group-hover:shadow-xl transition-shadow"
              >
                {currentLanguage === "ar" ? "ابحث عن محترف" : "Find a Pro"}
              </Button>
            </div>
          </motion.div>

          {/* Seller Path */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group relative overflow-hidden rounded-2xl border-2 border-rule/40 bg-gradient-to-br from-paper to-accent/5 p-8 md:p-10 hover:border-accent-2/60 transition-all duration-300 hover:shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-accent-2/5 rounded-full -translate-y-16 -translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>

            <div className="relative">
              <div className="text-5xl mb-4">🔧</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-ink">
                {currentLanguage === "ar" ? "أقدم خدمة" : "I Provide a Service"}
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {currentLanguage === "ar"
                  ? "انضم كمحترف واحصل على مشاريع حقيقية من عملاء موثوقين. نمّي عملك بثبات"
                  : "Join as a professional and get real projects from verified clients. Grow your business steadily."}
              </p>

              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-accent-2">✓</span>
                  <span>{currentLanguage === "ar" ? "طلبات فورية كل أسبوع" : "Instant Requests Every Week"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-2">✓</span>
                  <span>
                    {currentLanguage === "ar" ? "عملاء موثوقين ومدفوعات آمنة" : "Trusted Clients & Secure Payments"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-2">✓</span>
                  <span>
                    {currentLanguage === "ar" ? "بناء سمعتك عبر المراجعات" : "Build Your Reputation via Reviews"}
                  </span>
                </li>
              </ul>

              <Button
                size="lg"
                onClick={handleFindJobClick}
                className="w-full bg-accent-2 hover:bg-accent-2/90 text-paper font-bold shadow-lg group-hover:shadow-xl transition-shadow"
              >
                {currentLanguage === "ar" ? "انضم كمحترف" : "Find a Job"}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <span className="font-medium">{currentLanguage === "ar" ? "موثق ومراجع" : "Verified & Reviewed"}</span>
          </div>
          <span className="hidden md:block w-1 h-1 rounded-full bg-muted-foreground"></span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <span className="font-medium">{currentLanguage === "ar" ? "بسيط وسهل" : "Simple & Easy"}</span>
          </div>
          <span className="hidden md:block w-1 h-1 rounded-full bg-muted-foreground"></span>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <span className="font-medium">{currentLanguage === "ar" ? "ردود سريعة" : "Fast Responses"}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
