// src/components/agency-closures/closures.ts
// Cierres semanales de las agencias (documento de Fran del 2026-10-09, Módulo 3, §20 a §38): tipos y utilidades.
// Lo del Admin trae los montos internos; lo de la agencia (MyClosure) no los trae nunca: lo controla el backend (§38).
import { toast } from "react-toastify";
import { request } from "../../common/request";
export { api } from "../meta-ads/metaAds";
export { money, day, km } from "../delivery-tariffs/deliveryTariffs";

export type ClosureStatus = "pendiente_archivo" | "archivo_recibido" | "procesando" | "pendiente_revision" | "listo_pago" | "pagado";

export type ClosureSummary = {
    rows?: number; ok?: number; discrepancies?: number; unmatched?: number; open?: number;
    open_by_kind?: Record<string, number>; by_method?: Record<string, number>; trips_without_row?: number;
    ai_note?: string | null; warnings?: string[] | null;
};

export type Closure = {
    id: number; agency_id: number; agency: string | null; period_start: string; period_end: string; week: string;
    status: ClosureStatus; status_label: string; trips_count: number; expected_total: number | null; reported_total: number | null;
    difference: number | null; final_approved_total: number | null; summary: ClosureSummary | null; processing_error: string | null;
    // El otro monto que eligió Fran para el cierre completo, con su motivo (15/10/2026)
    manual_total: number | null; manual_reason: string | null;
    uploaded_at: string | null; processed_at: string | null; paid_at: string | null; file: { name: string; version: number } | null;
    reminder_at: string; reminder_due: boolean;
};

export type ClosureDetail = Closure & {
    approved_by: string | null; approved_at: string | null; paid_by: string | null;
    payment: { amount: number | null; date: string | null; method: string | null; reference: string | null; has_receipt: boolean } | null;
    tolerance: { amount: number; percent: number | null };
    // Módulo 4 (§101, §102, R16): la deuda del cierre y las cuentas de la caja de donde puede salir el pago
    debt: { amount: number; paid: number; balance: number; compensated: number } | null;
    pay_accounts: { id: number; name: string; currency: string }[];
    cash_start_date: string;
    binance_rate: number;
    // Aprobar el cierre completo (Fran, 15/10/2026): casos abiertos, lo que cobra la agencia por ellos y el total del cierre
    // si se aprueba lo de la agencia
    approve_all: { cases: number; reported: number; total: number };
};

export type Discrepancy = {
    id: number; kind: string; kind_label: string; status: "open" | "resolved"; expected_cost: number | null; reported_cost: number | null;
    difference: number | null; resolution: string | null; resolution_label: string | null; approved_cost: number | null; reason: string | null;
    resolved_by: string | null; resolved_at: string | null; notes: { user: string; at: string; text: string }[];
};

export type ClosureRow = {
    id: number; position: number; raw: { fila?: number; celdas?: Record<string, string>; lineas?: number[]; texto?: string; monto_texto?: string | null; fecha_texto?: string | null };
    external_order_id: string | null; repeat_mark: boolean; client_name: string | null; phone: string | null; zone: string | null; row_date: string | null;
    reported_cost: number | null; expected_cost: number | null; approved_cost: number | null;
    match_status: "matched" | "possible_match" | "unmatched" | "manually_matched"; match_status_label: string;
    match_method: string | null; match_method_label: string | null; match_note: string | null; candidate_trip_ids: number[];
    order: { id: number; name: string; client: string; phone: string | null; location: string | null } | null;
    trip: { id: number; date: string | null; type: string; result: string } | null;
    route: { distance_km: number | null; status: string; status_label: string; error: string | null; tariff_version: number | null; range: string | null; tariff_date: string | null } | null;
    discrepancy: Discrepancy | null;
};

export type ClosureFile = {
    id: number; version: number; name: string; is_current: boolean; uploaded_by: string | null; uploaded_at: string | null;
    rows: number | null; reported_total: number | null;
    extraction: { method?: string; mapping_source?: string; columns?: Record<string, string>; header_row?: number; warnings?: string[]; total_text?: string | null } | null;
};

export type ClosureShow = {
    closure: ClosureDetail; rows: ClosureRow[]; files: ClosureFile[];
    history: { action: string; user: string | null; at: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }[];
    kinds: Record<string, string>; resolutions: Record<string, string>;
};

export type Trip = {
    id: number; order_id: number; order_name: string | null; client: string; phone: string | null; trip_date: string; in_week: boolean;
    result: string; expected_cost: number | null; linked_row: number | null;
};

export type ClosureSetting = {
    closing_day: number; closing_time: string; reminder_active: boolean; tolerance_amount: number; tolerance_percent: number | null; review_distance_km: number;
    mapping: { header_row: number; columns: Record<string, string>; source?: string; manual?: boolean } | null;
};

/** La vista de la agencia (§38): solo en qué punto está cada semana. */
export type MyClosure = {
    id: number; week: string; period_start: string; period_end: string; status: ClosureStatus; status_label: string;
    can_upload: boolean; needs_new_file: boolean; file_name: string | null; uploaded_at: string | null; paid_at: string | null; reminder: boolean;
};
export type MyClosuresResponse = { closures: MyClosure[]; reminder: { title: string; text: string; weeks: string[] } | null };

export const STATUS_COLOR: Record<ClosureStatus, "default" | "warning" | "info" | "success" | "secondary"> = {
    pendiente_archivo: "warning", archivo_recibido: "info", procesando: "info", pendiente_revision: "warning", listo_pago: "success", pagado: "secondary",
};

export const FIELD_LABEL: Record<string, string> = { orden: "Número de orden", cliente: "Cliente", telefono: "Teléfono", fecha: "Fecha", monto: "Monto cobrado", zona: "Zona / dirección" };

/** "+$1,00" / "−$0,50": la diferencia de lo que cobra la agencia contra lo calculado. */
export const signedMoney = (v: number | null | undefined) => {
    if (v === null || v === undefined) return "—";
    const n = Math.abs(v).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v > 0 ? `+$${n}` : v < 0 ? `−$${n}` : "$0,00";
};

export const dateTime = (value: string | null | undefined) =>
    value ? new Date(value.replace(" ", "T")).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "numeric", minute: "2-digit" }) : "—";

/** Sube un archivo (multipart) y devuelve el JSON, o lanza el mensaje del backend. */
export const upload = async <T = { message: string }>(url: string, fields: Record<string, string | Blob | null | undefined>): Promise<T> => {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") form.append(k, v); });
    const { status, response } = await request(url, "POST", form, true);
    const json = await response.json().catch(() => ({}));
    if (status >= 400) {
        const message = json?.message || (json?.errors ? Object.values(json.errors).flat().join(" ") : null) || `Error ${status}`;
        throw new Error(message);
    }
    return json as T;
};

/** Baja un archivo de una ruta que pide sesión. */
export const download = async (url: string, name: string) => {
    try {
        const { status, response } = await request(url, "GET");
        if (status !== 200) { toast.error("No se pudo descargar el archivo"); return; }
        const href = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = href;
        a.download = name;
        a.click();
        URL.revokeObjectURL(href);
    } catch {
        toast.error("Error de conexión");
    }
};

export const ACCEPT = ".xlsx,.xls,.csv,.ods,.pdf";
