// Desactivar y reactivar cuentas (Etapa 4, paso 6). Solo el Admin: el servidor lo exige.
import { request } from "../../common/request";

export type PendingLine = {
    key: string;
    text: string;
    /** warning: conviene resolverlo antes; info: solo avisa. */
    tone: "warning" | "info";
    count?: number;
    /** Qué ventana abre para resolverlo. */
    action?: "reassign_seller" | "reassign_agency";
};

export type AccountHistory = {
    action: "deactivated" | "reactivated";
    label: string;
    reason: string | null;
    by: string | null;
    at: string | null;
};

export type AccountSummary = {
    id: number;
    name: string;
    role: string | null;
    deactivated_at: string | null;
    deactivation_reason: string | null;
};

export type DeactivationInfo = {
    user: AccountSummary;
    /** Por qué no se puede desactivar (Admin, Master, uno mismo, la líder de un grupo…). */
    problem: string | null;
    pending: PendingLine[];
    history: AccountHistory[];
    reason_min: number;
};

/** Las cuentas que nunca se desactivan (el servidor también lo revisa). */
export const PROTECTED_ROLES = ["Admin", "Master", "Shopify"];

type Result<T> = { ok: boolean; data?: T; message?: string };

async function accountApi<T>(url: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<Result<T>> {
    const { ok, response } = await request(url, method, body);
    let json: { data?: T; message?: string; errors?: Record<string, string[]> } = {};
    try {
        json = await response.json();
    } catch {
        // sin JSON (error de red)
    }
    if (!ok) {
        const firstError = json.errors ? Object.values(json.errors).flat()[0] : undefined;
        return { ok: false, message: firstError ?? json.message ?? "No se pudo completar la acción" };
    }
    return { ok: true, data: json.data, message: json.message };
}

export const fetchDeactivation = (userId: number) => accountApi<DeactivationInfo>(`/users/${userId}/deactivation`);
export const deactivateUser = (userId: number, reason: string) => accountApi<AccountSummary>(`/users/${userId}/deactivate`, "POST", { reason });
export const reactivateUser = (userId: number) => accountApi<AccountSummary>(`/users/${userId}/reactivate`, "POST", {});

/** "29/10/2026" */
export const shortDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-VE") : "");
