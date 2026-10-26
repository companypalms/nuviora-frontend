// src/components/delivery-tariffs/deliveryTariffs.ts
// Tipos y utilidades del control interno de tarifas de delivery (documento de Fran del 2026-10-09, Módulo 3). Todo lo
// de aquí es solo de administración: el backend no se lo entrega a las agencias (§14).
export { api } from "../meta-ads/metaAds";

export type Option = { id: number; name: string };

export type AgencyWarehouse = {
    id: number; name: string; city_id: number | null; city: string | null; maps_url: string | null;
    latitude: number | null; longitude: number | null; is_active: boolean; created_at: string | null;
};
export type AgencyWithWarehouses = { id: number; name: string; cities: Option[]; warehouses: AgencyWarehouse[] };

export type TariffRange = { min_km: number; max_km: number | null; price: number | null; price_per_km: number | null; label?: string };
export type TariffVersion = {
    id: number; version: number; is_active: boolean; valid_from: string; valid_to: string | null; notes: string | null;
    created_by: string | null; created_at: string | null; routes: number; ranges: TariffRange[];
};
export type TariffGroup = { agency_id: number; agency: string; city_id: number; city: string; current_id: number | null; versions: TariffVersion[] };

export type DeliveryRoute = {
    id: number; order_id: number; order: string | null; order_status: string | null; agency: string | null; warehouse: string | null;
    distance_km: number | null; range: string | null; tariff_version: number | null; tariff_date: string | null;
    expected_cost: number | null; status: string; status_label: string; error: string | null; attempts: number;
    is_active: boolean; reason: string; requires_review: boolean; review_note: string | null; distance_approved_at: string | null; trips: number;
    maps_url: string | null; calculated_at: string | null; created_at: string | null;
};
export type RoutesResponse = {
    routes: DeliveryRoute[]; page: number; last_page: number; total: number;
    counts: Record<string, number>; labels: Record<string, string>; google_configured: boolean;
};

const nf = (d: number) => new Intl.NumberFormat("es-VE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const money = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `$${nf(2).format(v)}`);
export const km = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${nf(3).format(v)} km`);
export const day = (ymd: string | null | undefined) => (ymd ? ymd.split("-").reverse().join("/") : "—");
export const todayCaracas = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

/** Color del estado de una ruta. */
export const routeStatusColor = (s: string): "success" | "warning" | "error" | "default" | "info" =>
    s === "calculated" ? "success" : s === "error" ? "error" : s === "pending" ? "info" : "warning";

/** Lo mismo que valida el backend (§11), para avisar antes de guardar. */
export const rangeProblem = (ranges: TariffRange[]): string | null => {
    if (ranges.length === 0) return "Agrega al menos un rango.";
    let expected = 0;
    for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const n = i + 1;
        if (Math.abs(r.min_km - expected) > 0.0005) return i === 0 ? "El primer rango empieza en 0 km." : `Rango ${n}: tiene que empezar en ${expected} km.`;
        if (r.max_km === null && i !== ranges.length - 1) return `Rango ${n}: solo el último puede quedar "en adelante".`;
        if (r.max_km !== null && r.max_km <= r.min_km) return `Rango ${n}: "hasta" tiene que ser mayor que "desde".`;
        if (r.price === null) return `Rango ${n}: falta el precio.`;
        if ((r.price ?? 0) < 0 || (r.price_per_km ?? 0) < 0) return `Rango ${n}: el precio no puede ser negativo.`;
        expected = r.max_km ?? r.min_km;
    }
    return null;
};

export const rangeLabel = (r: TariffRange) =>
    r.max_km === null
        ? (r.min_km === 0 ? "cualquier distancia" : `más de ${nf(r.min_km % 1 ? 1 : 0).format(r.min_km)} km`)
        : `${nf(r.min_km % 1 ? 1 : 0).format(r.min_km)}–${nf(r.max_km % 1 ? 1 : 0).format(r.max_km)} km`;
/** Fran (2026-10-09): en PYP, desde 20 km, $4 más $0,20 por cada km extra. */
export const rangePrice = (r: TariffRange) => money(r.price) + (r.price_per_km !== null ? ` + $${nf(2).format(r.price_per_km)} por km extra` : "");
