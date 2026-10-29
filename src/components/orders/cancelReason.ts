// El motivo de una cancelación (dueño, 2026-10-29): obligatorio, de al menos 5 caracteres, y lo más específico posible.
// Se guarda en el servidor (order_cancellations) para analizarlo y mejorar la operación.
import { create } from "zustand";

export const MIN_CANCEL_REASON = 5;

export const isValidCancelReason = (reason: string) => reason.trim().length >= MIN_CANCEL_REASON;

type PromptState = {
    open: boolean;
    resolve: ((reason: string | null) => void) | null;
};

/** La ventana que pide el motivo (CancelReasonPrompt, montada una vez en App). */
export const useCancelReasonPrompt = create<PromptState>(() => ({ open: false, resolve: null }));

/** Abre la ventana y espera: el motivo escrito, o null si la persona cerró sin cancelar. */
export const askCancelReason = (): Promise<string | null> => {
    if (useCancelReasonPrompt.getState().open) return Promise.resolve(null);
    return new Promise((resolve) => useCancelReasonPrompt.setState({ open: true, resolve }));
};
