import { request } from "../../common/request";
import { AgencyRouting } from "../../interfaces/agencyRouting.types";

type Method = "GET" | "POST" | "PUT";

/** Llama a /agency-routing y devuelve { ok, data, message } con el primer error de validación a mano. */
export async function routingApi<T = AgencyRouting>(path: string, method: Method = "GET", body?: unknown) {
    const { ok, response } = await request(`/agency-routing${path}`, method, body);
    const json = await response.json().catch(() => ({}));
    const first = json?.errors ? Object.values(json.errors as Record<string, string[]>)[0] : null;

    return {
        ok: ok && json?.status !== false,
        data: json?.data as T,
        message: (Array.isArray(first) ? first[0] : null) || json?.message || (ok ? '' : 'No se pudo guardar'),
    };
}
