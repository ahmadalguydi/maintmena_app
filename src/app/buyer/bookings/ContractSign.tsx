import { useParams } from "react-router-dom";
import { ContractAgreementScreen } from "@/components/contracts/ContractAgreementScreen";

interface ContractSignProps {
  currentLanguage: "en" | "ar";
}

export const ContractSign = ({ currentLanguage }: ContractSignProps) => {
  const { id } = useParams();

  if (!id) return null;

  return (
    <ContractAgreementScreen
      contractId={id}
      currentUserRole="buyer"
      currentLanguage={currentLanguage}
    />
  );
};
