// src/components/orders/ChangeRuleNotice.tsx
// Aviso en la sección de vuelto: con pago digital la agencia no da vuelto, y con pago mixto el vuelto de la
// agencia lo valida administración antes de que la orden siga (Fran, 2026-10-03).
import React from "react";
import { Alert } from "@mui/material";
import moment from "moment";
import { ChangeApproval, PaymentKind } from "../../lib/changeRules";

interface Props {
    kind: PaymentKind;
    /** Lo elegido en el formulario (puede no estar guardado todavía). */
    coveredBy: string;
    /** Lo que dice el servidor de la orden guardada. */
    approval?: ChangeApproval | null;
}

export const ChangeRuleNotice: React.FC<Props> = ({ kind, coveredBy, approval }) => {
    if (kind === "digital") {
        return (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
                El cliente pagó todo digital (pago móvil, transferencia…): <b>la agencia no da vuelto</b>. Si pagó de más, lo devuelve la empresa.
            </Alert>
        );
    }
    if (kind !== "mixed" || !["agency", "partial"].includes(coveredBy)) return null;

    if (approval?.approved) {
        return (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
                Vuelto de la agencia validado{approval.approved_by ? ` por ${approval.approved_by}` : ""}
                {approval.approved_at ? ` el ${moment(approval.approved_at).format("DD/MM hh:mm A")}` : ""}.
            </Alert>
        );
    }
    return (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
            El cliente pagó en efectivo y digital. <b>Administración tiene que validar el vuelto de la agencia</b> antes de mandar la orden a la agencia o marcarla entregada.
        </Alert>
    );
};
