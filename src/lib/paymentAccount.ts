import { fmtMoney } from "./money";
import { IOrderPaymentAccount } from "../interfaces/company-account.types";

/** .60: el método de pago móvil de la orden y el de la cuenta (Tasa y pagos › Cuentas). */
export const PAGO_MOVIL_METHOD = "PAGOMOVIL";
export const PAGO_MOVIL_KIND = "pago_movil";

/** Lo que se usa de una orden (GET /orders/{id}). */
export interface OrderPaymentInfo {
    payments?: { method: string; amount: number | string; rate?: number | string | null }[];
    binance_rate?: number | string;
    payment_account?: IOrderPaymentAccount | null;
}

/** Si la orden se paga (en parte o del todo) por pago móvil. */
export const paysByPagoMovil = (order?: OrderPaymentInfo | null): boolean =>
    (order?.payments ?? []).some((p) => p.method === PAGO_MOVIL_METHOD);

/** Lo que el cliente paga por pago móvil, en Bs: cada pago por su tasa (o la de Binance del día si no tiene). */
export const pagoMovilBs = (order?: OrderPaymentInfo | null): number =>
    (order?.payments ?? [])
        .filter((p) => p.method === PAGO_MOVIL_METHOD)
        .reduce((acc, p) => acc + Number(p.amount) * Number(p.rate || order?.binance_rate || 0), 0);

/**
 * .60: lo que va al final de la plantilla que copia la agencia para el motorizado, solo si la orden se paga por pago
 * móvil: los datos de la cuenta de ESA orden (tal como están en la cuenta, en el mismo orden) y el monto en Bs.
 * missing: se paga por pago móvil pero la orden todavía no tiene cuenta (quien copia ve un aviso).
 */
export const pagoMovilBlock = (order?: OrderPaymentInfo | null): { text: string; missing: boolean } => {
    if (!paysByPagoMovil(order)) return { text: "", missing: false };
    const account = order?.payment_account ?? null;
    if (!account) return { text: "", missing: true };
    const lines = account.details.map((d) => `${d.label}: ${d.value}`).join("\n");
    const bs = pagoMovilBs(order);
    return {
        text: `\n\n📲 *PAGO MÓVIL (datos para el cliente):*\n${lines}${bs > 0 ? `\n💰 *Monto a pagar:* ${fmtMoney(bs, "VES")}` : ""}`,
        missing: false,
    };
};
