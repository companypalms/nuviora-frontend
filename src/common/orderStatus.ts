import { request } from "./request";
import { askCancelReason } from "../components/orders/cancelReason";

/**
 * Un doble toque en "Confirmar entrega" o "En ruta" mandaba dos cambios de estado iguales en el mismo segundo, y cada
 * uno abría su carrera de agencia (14/10/2026). Mientras el cambio de una orden va en camino, otro de esa misma orden
 * no sale: devuelve null y quien llamó no hace nada. El servidor también lo frena (OrderController::updateStatus).
 */
const inFlight = new Set<string>();

export const sendOrderStatus = async (orderId: number | string, body: URLSearchParams) => {
    const key = String(orderId);
    if (inFlight.has(key)) return null;

    // Dueño (2026-10-29): para cancelar, desde cualquier pantalla, hay que escribir el motivo. Si se cierra sin
    // escribirlo, no cambia nada (null, como el doble toque).
    if (body.get("status") === "Cancelado" && (!body.get("cancel_reason") || !body.get("cancel_category"))) {
        const answer = await askCancelReason();
        if (!answer) return null;
        body.set("cancel_reason", answer.reason);
        body.set("cancel_category", answer.category);
        if (inFlight.has(key)) return null;
    }

    inFlight.add(key);
    try {
        return await request(`/orders/${orderId}/status`, "PUT", body);
    } finally {
        inFlight.delete(key);
    }
};
