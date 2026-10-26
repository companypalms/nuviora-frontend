// src/components/finance/purchase.ts
// La compra del ingreso de inventario (Módulo 4 de Fran, §9, §16, R6): su estado en el formulario, cuándo está completa,
// lo que se manda al backend y la subida del comprobante. La pantalla es PurchaseFields.tsx.
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { MoneyValue } from "./MoneyFields";
import { PaymentType, num, toUsd } from "./finance";

export type PurchaseValue = {
    enabled: boolean; supplierId: string; money: MoneyValue; paymentType: PaymentType | ""; dueDate: string; terms: string;
    accountId: string; receipt: File | null;
};

export const emptyPurchase = (): PurchaseValue => ({
    enabled: true, supplierId: "", money: { amount: "", currency: "USD", rate: "" }, paymentType: "", dueDate: "", terms: "", accountId: "", receipt: null,
});

/** Si la sección está apagada no pide nada; si está prendida, pide proveedor, costo, tasa en Bs y cómo se paga. */
export const purchaseReady = (v: PurchaseValue) => !v.enabled || (
    v.supplierId !== "" && toUsd(v.money.amount, v.money.currency, v.money.rate) !== null && v.paymentType !== ""
    && (v.paymentType !== "credit" || v.dueDate !== "") && (v.paymentType !== "cash" || v.accountId !== "")
);

/** Compra por recibir (Módulo 5, §16, R3): proveedor, costo esperado y la fecha en que llega. Sin forma de pago. */
export const pendingPurchaseReady = (v: PurchaseValue, expectedAt: string) =>
    v.supplierId !== "" && toUsd(v.money.amount, v.money.currency, v.money.rate) !== null && expectedAt !== "";

export const pendingPurchasePayload = (v: PurchaseValue, expectedAt: string) => ({
    supplier_id: Number(v.supplierId),
    total_amount: num(v.money.amount),
    currency: v.money.currency,
    ...(v.money.currency === "VES" ? { rate: num(v.money.rate) } : {}),
    expected_at: expectedAt,
});

export const purchasePayload = (v: PurchaseValue) => ({
    supplier_id: Number(v.supplierId),
    total_amount: num(v.money.amount),
    currency: v.money.currency,
    ...(v.money.currency === "VES" ? { rate: num(v.money.rate) } : {}),
    payment_type: v.paymentType,
    ...(v.paymentType === "credit" ? { due_date: v.dueDate, terms: v.terms.trim() || null } : {}),
    ...(v.paymentType === "cash" && v.accountId ? { financial_account_id: Number(v.accountId) } : {}),
});

/** Después del ingreso: el comprobante de la compra, si el Admin lo adjuntó. */
export const uploadPurchaseReceipt = async (purchaseId: number, file: File) => {
    const body = new FormData();
    body.append("receipt", file);
    const { status } = await request(`/finance/purchases/${purchaseId}/receipt`, "POST", body);
    if (status >= 400) toast.warn("La compra quedó registrada, pero no se pudo subir el comprobante. Súbelo desde Finanzas › Proveedores.");
};
