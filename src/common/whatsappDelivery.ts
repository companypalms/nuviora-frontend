import { alpha } from "@mui/material";

// Lo que Meta contestó de un mensaje que salió (15/10/2026): enviado, entregado, leído o no entregado con su motivo.
// El motivo llega del servidor ya en español (WhatsAppService::explainError). Llega también por el websocket
// (evento WhatsappMessageStatus) con el id del mensaje y su cliente.
export interface DeliveryInfo {
    id?: number | string;
    client_id?: number | string | null;
    status?: string;
    error_code?: number | null;
    error_reason?: string | null;
}

export const isUndelivered = (m: DeliveryInfo) => m.status === "failed";

// Los que fallaron antes del 15/10/2026 no tienen el motivo guardado
export const undeliveredText = (m: DeliveryInfo) => (m.error_reason ? `WhatsApp no lo entregó: ${m.error_reason}` : "WhatsApp no lo entregó.");

// Rojo que se lee sobre la burbuja verde clara y sobre la oscura
export const failureColor = (dark: boolean) => (dark ? "#fecaca" : "#b91c1c");

/** Borde rojo de la burbuja de un mensaje que no llegó. */
export const undeliveredOutline = (m: DeliveryInfo) => (isUndelivered(m) ? `0 0 0 1.5px ${alpha("#ef4444", 0.75)}` : undefined);

/** La lista con el mensaje del aviso actualizado. */
export const withDelivery = <T extends DeliveryInfo>(list: T[], update: DeliveryInfo): T[] =>
    list.map((m) => (String(m.id) === String(update.id)
        ? { ...m, status: update.status, error_code: update.error_code, error_reason: update.error_reason }
        : m));
