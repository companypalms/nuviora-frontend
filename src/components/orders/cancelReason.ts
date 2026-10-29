// El motivo de una cancelación (dueño, 2026-10-29): obligatorio, de al menos 5 caracteres, y lo más específico posible,
// más un motivo de la lista para poder agruparlos. Se guarda en el servidor (order_cancellations) para analizarlo y
// mejorar la operación (panel del dueño › Pérdidas).
import { create } from "zustand";

export const MIN_CANCEL_REASON = 5;

/** La lista de motivos. La misma está en el servidor (Orders\Cancellations::CATEGORIES): si se cambia aquí, se cambia allá. */
export const CANCEL_CATEGORIES: { key: string; label: string }[] = [
    { key: "no_contesta", label: "No contesta / no se pudo contactar" },
    { key: "no_lo_quiere", label: "Ya no lo quiere / se arrepintió" },
    { key: "dinero", label: "No tiene el dinero / precio" },
    { key: "duplicado", label: "Pedido duplicado o de prueba" },
    { key: "zona", label: "Fuera de zona / dirección no clara" },
    { key: "sin_stock", label: "Sin stock" },
    { key: "demora", label: "Tardó mucho la entrega" },
    { key: "otro", label: "Otro" },
];

export const isValidCancelReason = (reason: string) => reason.trim().length >= MIN_CANCEL_REASON;

export const isValidCancel = (reason: string, category: string) =>
    isValidCancelReason(reason) && CANCEL_CATEGORIES.some((c) => c.key === category);

export type CancelAnswer = { reason: string; category: string };

type PromptState = {
    open: boolean;
    resolve: ((answer: CancelAnswer | null) => void) | null;
};

/** La ventana que pide el motivo (CancelReasonPrompt, montada una vez en App). */
export const useCancelReasonPrompt = create<PromptState>(() => ({ open: false, resolve: null }));

/** Abre la ventana y espera: el motivo de la lista y el escrito, o null si la persona cerró sin cancelar. */
export const askCancelReason = (): Promise<CancelAnswer | null> => {
    if (useCancelReasonPrompt.getState().open) return Promise.resolve(null);
    return new Promise((resolve) => useCancelReasonPrompt.setState({ open: true, resolve }));
};
