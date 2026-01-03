import { useParams } from "react-router-dom";
import { ContractAgreementScreen } from "@/components/contracts/ContractAgreementScreen";
import { motion } from "framer-motion";

interface ContractReviewProps {
  currentLanguage: "en" | "ar";
}

export const ContractReview = ({ currentLanguage }: ContractReviewProps) => {
  const { id } = useParams();

  if (!id) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ContractAgreementScreen
        contractId={id}
        currentUserRole="seller"
        currentLanguage={currentLanguage}
      />
    </motion.div>
  );
};
