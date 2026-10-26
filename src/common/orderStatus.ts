import { request } from "./request";

/**
 * Un doble toque en "Confirmar entrega" o "En ruta" mandaba dos cambios de estado iguales en el mismo segundo, y cada
 * uno abría su carrera de agencia (14/10/2026). Mientras el cambio de una orden va en camino, otro de esa misma orden
 * no sale: devuelve null y quien llamó no hace nada. El servidor también lo frena (OrderController::updateStatus).
 */
const inFlight = new Set<string>();

export const sendOrderStatus = async (orderId: number | string, body: URLSearchParams) => {
    const key = String(orderId);
    if (inFlight.has(key)) return null;
    inFlight.add(key);
    try {
        return await request(`/orders/${orderId}/status`, "PUT", body);
    } finally {
        inFlight.delete(key);
    }
};
