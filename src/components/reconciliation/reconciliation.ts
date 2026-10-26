// src/components/reconciliation/reconciliation.ts
// Conciliación de pagos digitales con los extractos (documento de Fran del 2026-10-06, Módulo 1): tipos, textos de
// cada estado y formatos. Los nombres de los estados son los del documento (§15, §20, §24, §25).
import { toast } from "react-toastify";
import { request } from "../../common/request";

export type DayStatus = "pending" | "review" | "completed";
export type ItemStatus = "pending" | "matched" | "not_found" | "review" | "confirmed" | "not_received" | "linked";

export interface DayCard {
    date: string;
    status: DayStatus;
    payments: number;
    resolved: number;
    incidents: number;
    missing_statements: number;
}

export interface StatementInfo {
    id: number;
    source_id: number;
    source: string | null;
    file: string;
    uploaded_by: string | null;
    uploaded_at: string | null;
    date_from: string | null;
    date_to: string | null;
    rows_read: number;
    rows_credit: number;
    replaced_at: string | null;
}

export interface SourceCard {
    id: number;
    name: string;
    currency: string;
    payments: number;
    pending: number;
    range: { from: string; to: string };
    format_saved: boolean;
    statement: StatementInfo | null;
}

export interface Candidate {
    row_id: number;
    line: number;
    date: string | null;
    reference: string | null;
    amount: number;
    description: string | null;
    reason?: string;
    used_by?: string | null;
}

export interface ItemView {
    id: number;
    status: ItemStatus;
    order_id: number | null;
    order_name: string | null;
    client_name: string | null;
    method: string;
    method_label: string;
    currency: string | null;
    amount: number | null;
    reference: string | null;
    paid_on: string | null;
    source: string | null;
    match_note: string | null;
    candidates: Candidate[];
    row: { id: number; line: number; date: string | null; reference: string | null; amount: number; description: string | null; file: string | null } | null;
    receipt_url: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    note: string | null;
    order_payments: { id: number; status: ItemStatus; amount: number | null; currency: string | null }[];
}

export interface DayDetail {
    day: DayCard;
    sources: SourceCard[];
    summary: {
        total: number;
        by_status: Partial<Record<ItemStatus, number>>;
        amounts: { currency: string; expected: number; conciliated: number; not_received: number; pending: number }[];
    };
    items: ItemView[];
    statements: StatementInfo[];
    events: { action: string; user: string | null; at: string | null; item_id: number | null; statement_id: number | null; data: Record<string, unknown> | null; note: string | null }[];
}

/** §15, §24, §25 y §27: Pendiente, Requiere revisión, Completada. */
export const DAY_META: Record<DayStatus, { label: string; dot: string; color: "warning" | "success" }> = {
    pending: { label: "Pendiente", dot: "🟠", color: "warning" },
    review: { label: "Requiere revisión", dot: "🟠", color: "warning" },
    completed: { label: "Completada", dot: "🟢", color: "success" },
};

/** §20: los estados de cada pago, más "pendiente de verificar" (§16) mientras no se sube el extracto. */
export const ITEM_META: Record<ItemStatus, { label: string; icon: string; color: "default" | "success" | "error" | "warning" | "info" }> = {
    pending: { label: "Pendiente de verificar", icon: "⏳", color: "default" },
    matched: { label: "Conciliado", icon: "✅", color: "success" },
    not_found: { label: "Pago no encontrado", icon: "❌", color: "error" },
    review: { label: "Requiere revisión", icon: "🟡", color: "warning" },
    confirmed: { label: "Confirmado manualmente", icon: "✅", color: "success" },
    not_received: { label: "Confirmado como no recibido", icon: "❌", color: "error" },
    linked: { label: "Vinculado manualmente", icon: "🔗", color: "info" },
};

/** Para contar pagos en el resumen, como en el §24: "40 conciliados · 1 no encontrado · 1 requiere revisión". */
export const ITEM_COUNT: Record<ItemStatus, [string, string]> = {
    pending: ["pendiente de verificar", "pendientes de verificar"],
    matched: ["conciliado", "conciliados"],
    not_found: ["no encontrado", "no encontrados"],
    review: ["requiere revisión", "requieren revisión"],
    confirmed: ["confirmado manualmente", "confirmados manualmente"],
    not_received: ["confirmado como no recibido", "confirmados como no recibidos"],
    linked: ["vinculado manualmente", "vinculados manualmente"],
};

/** Los que ya no necesitan nada (§25). */
export const RESOLVED: ItemStatus[] = ["matched", "confirmed", "not_received", "linked"];
/** Los que cuentan como dinero que sí llegó. */
export const RECEIVED: ItemStatus[] = ["matched", "confirmed", "linked"];

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const parts = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return { y, m, d };
};

/** "2026-10-04" → "4 OCT" (§15). */
export const shortDate = (iso: string) => {
    const { m, d } = parts(iso);
    return `${d} ${MONTHS[m - 1].slice(0, 3).toUpperCase()}`;
};

/** "2026-10-04" → "4 de octubre" (§24). */
export const longDate = (iso: string) => {
    const { m, d } = parts(iso);
    return `${d} de ${MONTHS[m - 1]}`;
};

/** "2026-10" → "Octubre 2026" (§27). */
export const monthTitle = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
};

/** "2026-10-04 15:30:00" → "04/10 3:30 p. m." */
export const dateTime = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value.replace(" ", "T"));
    return date.toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "numeric", minute: "2-digit" });
};

/** Montos como en Venezuela: Bs. 33.550,71 · $32,57 · 10,00 USDT. */
export const money = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return "sin monto";
    const n = amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (currency === "VES") return `Bs. ${n}`;
    if (currency === "USD") return `$${n}`;
    return currency ? `${n} ${currency}` : n;
};

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Lo que falta de un día (§15): los extractos que hay que subir o las incidencias que hay que revisar. */
export const dayNeeds = (d: DayCard) =>
    d.missing_statements > 0
        ? plural(d.missing_statements, "extracto necesario", "extractos necesarios")
        : plural(d.incidents, "incidencia", "incidencias");

/** Baja el archivo original de un extracto (la ruta pide sesión, así que no basta un enlace). */
export const downloadStatement = async (id: number, name: string) => {
    try {
        const { status, response } = await request(`/reconciliation-statements/${id}/file`, "GET");
        if (status !== 200) {
            toast.error("No se pudo descargar el extracto");
            return;
        }
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        toast.error("Error de conexión");
    }
};
