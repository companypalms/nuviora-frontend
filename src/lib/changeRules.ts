// src/lib/changeRules.ts
// Quién da el vuelto según cómo pagó el cliente (Fran, 2026-10-03). La misma regla está en el backend
// (app/Services/Orders/ChangeRules.php): la agencia solo da vuelto del efectivo que cobró.

export const CASH_METHODS = ["DOLARES_EFECTIVO", "BOLIVARES_EFECTIVO", "EUROS_EFECTIVO"];

/** none: sin pagos · cash: solo efectivo · digital: solo pago móvil, transferencia, Zelle… · mixed: las dos */
export type PaymentKind = "none" | "cash" | "digital" | "mixed";

export const paymentKind = (payments?: { method?: string; amount?: unknown }[] | null): PaymentKind => {
    let cash = false;
    let digital = false;
    for (const p of payments ?? []) {
        if (!p.method || !(Number(p.amount) > 0)) continue;
        if (CASH_METHODS.includes(p.method)) cash = true;
        else digital = true;
    }
    if (cash && digital) return "mixed";
    return cash ? "cash" : digital ? "digital" : "none";
};

export interface ChangeApproval {
    payment_kind: PaymentKind;
    required: boolean;
    pending: boolean;
    approved: boolean;
    approved_by: string | null;
    approved_at: string | null;
}
