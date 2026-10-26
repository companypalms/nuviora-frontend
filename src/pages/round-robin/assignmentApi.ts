import { request } from "../../common/request";

type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiResult<T> {
    ok: boolean;
    data?: T;
    message?: string;
}

/**
 * Llamada a la API del reparto (fase 4). Devuelve ok según el código HTTP (no solo "hubo respuesta")
 * y el mensaje del backend, incluidos los de validación (422), para mostrarlos tal cual.
 */
export async function assignmentApi<T>(url: string, method: Method = "GET", body?: unknown): Promise<ApiResult<T>> {
    const { ok, response } = await request(url, method, body);
    let json: { data?: T; message?: string; errors?: Record<string, string[]> } = {};
    try {
        json = await response.json();
    } catch {
        // respuesta sin JSON (por ejemplo, un error de red)
    }
    if (!ok) {
        const firstError = json.errors ? Object.values(json.errors).flat()[0] : undefined;
        return { ok: false, message: firstError ?? json.message ?? "No se pudo completar la acción" };
    }
    return { ok: true, data: json.data, message: json.message };
}

export const pct = (share: number) =>
    `${(share * 100).toLocaleString("es-VE", { maximumFractionDigits: 1 })} %`;
