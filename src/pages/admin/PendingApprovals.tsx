// Principal → Por aprobar: la cola diaria de pagos por revisar (comprobantes, vueltos de agencia y vueltos por pagar).
// La líder sigue viendo sus vueltos en /mi-grupo/vueltos.
import { SectionTabsPage, PageSection } from "../../components/ui/SectionTabsPage";
import { ReceiptReview } from "./ReceiptReview";
import { ChangeApprovals } from "./ChangeApprovals";
import { PendingVueltos } from "./PendingVueltos";

const SECTIONS: PageSection[] = [
    { key: "comprobantes", label: "Comprobantes", roles: ["Admin", "Gerente", "Master"], render: () => <ReceiptReview isEmbedded /> },
    { key: "validar", label: "Vueltos por validar", roles: ["Admin", "Gerente", "Master"], render: () => <ChangeApprovals isEmbedded /> },
    { key: "pagar", label: "Vueltos por pagar", roles: ["Admin", "Gerente"], render: () => <PendingVueltos isEmbedded /> },
];

export const PendingApprovals = () => (
    <SectionTabsPage
        title="Por aprobar"
        description="Lo que espera una revisión de administración: comprobantes que la IA no pudo confirmar, vueltos de agencia por validar y vueltos por pagar."
        sections={SECTIONS}
    />
);
