import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { GradientHeader } from "@/components/mobile/GradientHeader";
import { SoftCard } from "@/components/mobile/SoftCard";
import { Heading3, Body, BodySmall } from "@/components/mobile/Typography";
import { StatusPill } from "@/components/mobile/StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

interface MyContractsProps {
  currentLanguage: "en" | "ar";
}

export const MyContracts = ({ currentLanguage }: MyContractsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["buyer-contracts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          binding_terms(*),
          profiles!contracts_seller_id_fkey(*),
          quote_submissions!contracts_quote_id_fkey(price, proposal),
          maintenance_requests!contracts_request_id_fkey(title, title_ar, description)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const content = {
    en: {
      title: "My Contracts",
      subtitle: "View all signed contracts",
      noContracts: "No contracts yet",
      description: "Your signed contracts will appear here",
      with: "with",
      view: "View Contract",
      draft: "Draft",
      pending: "Pending",
      executed: "Executed",
      cancelled: "Cancelled",
    },
    ar: {
      title: "عقودي",
      subtitle: "عرض جميع العقود الموقعة",
      noContracts: "لا توجد عقود بعد",
      description: "ستظهر عقودك الموقعة هنا",
      with: "مع",
      view: "عرض العقد",
      draft: "مسودة",
      pending: "قيد الانتظار",
      executed: "منفذ",
      cancelled: "ملغى",
    },
  };

  const t = content[currentLanguage];

  const getStatusPill = (status: string) => {
    switch (status) {
      case "executed":
      case "active":      // Old status - treat same as executed
      case "completed":   // Completed status
        return { status: "success" as const, label: t.executed };
      case "pending_buyer":
      case "pending_seller":
      case "pending_signature":
      case "pending_signatures":
        return { status: "pending" as const, label: t.pending };
      case "cancelled":
      case "terminated":
      case "rejected":
        return { status: "error" as const, label: t.cancelled };
      case "draft":
        return { status: "info" as const, label: t.draft };
      default:
        // Log unknown status for debugging
        console.warn('[BuyerContracts] Unknown contract status:', status);
        return { status: "info" as const, label: t.draft };
    }
  };

  if (isLoading) {
    return (
      <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
        <GradientHeader title={t.title} subtitle={t.subtitle} showBack onBack={() => navigate("/app/buyer/profile")} />
        <div className="px-6 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === "ar" ? "rtl" : "ltr"}>
      <GradientHeader title={t.title} subtitle={t.subtitle} showBack onBack={() => navigate("/app/buyer/profile")} />

      <div className="px-6 py-6">
        {!contracts || contracts.length === 0 ? (
          <SoftCard className="text-center py-16">
            <div className="space-y-3">
              <div className="text-6xl opacity-20">📄</div>
              <Heading3 lang={currentLanguage}>{t.noContracts}</Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground max-w-xs mx-auto">
                {t.description}
              </Body>
            </div>
          </SoftCard>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract: any, index: number) => {
              const seller = contract.profiles;
              const statusPill = getStatusPill(contract.status);
              const terms = Array.isArray(contract.binding_terms) ? contract.binding_terms[0] : contract.binding_terms;
              const quote = contract.quote_submissions;
              const request = contract.maintenance_requests;

              // Get price from quote or metadata
              const priceValue = quote?.price || (contract.metadata as any)?.final_price || (contract.metadata as any)?.total_amount || 0;

              // Get title from maintenance request
              const jobTitle = currentLanguage === 'ar'
                ? (request?.title_ar || request?.title || quote?.proposal?.substring(0, 50))
                : (request?.title || quote?.proposal?.substring(0, 50));

              return (
                <motion.button
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    const needsBuyerSignature = contract.status === "pending_buyer" && !contract.signed_at_buyer;

                    navigate(
                      needsBuyerSignature
                        ? `/app/buyer/contract/${contract.id}/sign`
                        : `/app/buyer/contract/${contract.id}`,
                    );
                  }}
                  className="w-full"
                >
                  <SoftCard>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 text-left">
                            <Heading3 lang={currentLanguage} className="mb-1 line-clamp-1">
                              {jobTitle || `${t.with} ${seller?.company_name || seller?.full_name}`}
                            </Heading3>
                            <BodySmall lang={currentLanguage} className="text-muted-foreground">
                              {t.with} {seller?.company_name || seller?.full_name}
                            </BodySmall>
                          </div>
                        </div>
                        <StatusPill status={statusPill.status} label={statusPill.label} animate={false} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-primary">
                          <DollarSign className="h-4 w-4" />
                          <Body lang={currentLanguage} className="font-semibold">
                            {priceValue > 0 ? formatAmount(priceValue, "SAR", 2) : "---"}
                          </Body>
                        </div>
                        {terms?.start_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <BodySmall lang={currentLanguage}>
                              {new Date(terms.start_date).toLocaleDateString(
                                currentLanguage === "ar" ? "ar-SA" : "en-US",
                              )}
                            </BodySmall>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/30">
                        <BodySmall lang={currentLanguage} className="text-accent font-medium">
                          {t.view} →
                        </BodySmall>
                      </div>
                    </div>
                  </SoftCard>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
