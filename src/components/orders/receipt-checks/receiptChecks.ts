// src/components/orders/receipt-checks/receiptChecks.ts
// Revisión de comprobantes con IA (Fran, 2026-10-03): tipos, textos de cada estado y la consulta al servidor.
import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../../../common/request";

export type ReceiptCheckStatus = "pending" | "ok" | "warning" | "fail" | "unreadable" | "error";

export interface ReceiptCheckView {
    id: number;
    payment_receipt_id: number;
    status: ReceiptCheckStatus;
    kind: string | null;
    kind_label: string | null;
    issues: { level: "fail" | "warning"; text: string; code?: string }[];
    error: string | null;
    summary: Record<string, string | number>;
    approved: boolean;
    approved_by: string | null;
    approved_at: string | null;
    review_note: string | null;
}

export const STATUS_META: Record<ReceiptCheckStatus, { label: string; short: string; color: "success" | "warning" | "error" | "info" | "default" }> = {
    pending: { label: "Revisando el comprobante…", short: "Revisando", color: "info" },
    ok: { label: "Verificado", short: "Verificado", color: "success" },
    warning: { label: "Verificado con dudas", short: "Revisar", color: "warning" },
    fail: { label: "No cuadra con el pago", short: "No cuadra", color: "error" },
    unreadable: { label: "No se lee bien", short: "No se lee", color: "warning" },
    error: { label: "No se pudo revisar", short: "Sin revisar", color: "default" },
};

/**
 * Una foto de billetes que está bien no dice "Verificado": la IA no cuenta los billetes, solo ve que son efectivo.
 * Si la única advertencia es que el cliente pagó más del 5 %, se llama como en el documento de Fran (§8).
 */
export const statusMeta = (check: ReceiptCheckView) => {
    if (check.kind === "efectivo" && check.status === "ok") {
        return { ...STATUS_META.ok, label: "Foto de billetes", short: "Billetes" };
    }
    if (check.status === "warning" && check.issues.length > 0 && check.issues.every((i) => i.code === "overpaid")) {
        return { ...STATUS_META.warning, label: "Validado con advertencia", short: "Con advertencia" };
    }
    return STATUS_META[check.status];
};

const POLL_MS = 4000;
const MAX_POLLS = 30;

/**
 * Las revisiones de los comprobantes de la orden. Mientras alguna está "revisando", vuelve a preguntar cada
 * 4 segundos (hasta 2 minutos). Se vuelve a pedir cuando cambian los comprobantes.
 */
export const useReceiptChecks = (orderId: number | undefined, receiptKey: string, enabled: boolean) => {
    const [checks, setChecks] = useState<ReceiptCheckView[]>([]);
    const [block, setBlock] = useState<string | null>(null);
    const [mode, setMode] = useState<string>("off");
    const polls = useRef(0);

    const load = useCallback(async () => {
        if (!orderId || !enabled) return;
        try {
            const { status, response } = await request(`/orders/${orderId}/receipt-checks`, "GET");
            if (status !== 200) return;
            const data = await response.json();
            setChecks(data.checks ?? []);
            setBlock(data.delivery_block ?? null);
            setMode(data.mode ?? "off");
        } catch {
            /* sin conexión: se mantiene lo último */
        }
    }, [orderId, enabled]);

    useEffect(() => {
        polls.current = 0;
        load();
    }, [load, receiptKey]);

    const pending = checks.some((c) => c.status === "pending");
    useEffect(() => {
        if (!pending || polls.current >= MAX_POLLS) return;
        const id = setTimeout(() => {
            polls.current += 1;
            load();
        }, POLL_MS);
        return () => clearTimeout(id);
    }, [pending, checks, load]);

    const byReceipt = (receiptId?: number) => checks.find((c) => c.payment_receipt_id === receiptId);

    return { checks, block, mode, byReceipt, reload: load };
};
