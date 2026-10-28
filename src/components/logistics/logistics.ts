// src/components/logistics/logistics.ts
// Tipos y utilidades de la logística propia (documento de Fran del 2026-10-21, respuestas R1–R8): la torre de control
// del operador (§21) y la configuración del Admin (§23). Los permisos los valida el backend (§33).
export { api } from "../meta-ads/metaAds";
export { errorMessage } from "../finance/finance";

export type CenterState = "inactivo" | "cerrado" | "sin_operador" | "abierto";

export type Alert = { id: number; type: string; level: "critical" | "red" | "warning" | "info"; message: string; order_id: number | null; rider_id: number | null; created_at: string };

export type CenterBoard = {
    id: number; name: string; city: string | null; is_active: boolean; state: CenterState; state_label: string;
    today_hours: [string, string] | null; dispatch_cutoff: string | null; before_cutoff: boolean;
    active_shift: { id: number; user: { id: number; names: string } | null; started_at: string } | null;
    counts: Record<string, number>; alerts: Alert[];
    last_close: { id: number; user_id: number; ended_at: string; close_type: string; close_reason: string | null; close_cash_usd: string | number | null; close_cash_ves: string | number | null; user?: { names: string } | null } | null;
    // Informe del 27/10, sección 06: el efectivo del centro (lo recibido de los riders menos lo que administración marcó recibido)
    cash: { usd: number; ves: number; returns: number };
};

export type Novelty = {
    id: number; type: string; type_label: string; commercial: boolean; description: string | null; owner: "operador" | "ventas";
    reporter: string | null; opened_at: string; escalated_at: string | null; comments: { at: string; name: string; text: string }[];
};

export type TowerOrder = {
    id: number; order_id: number; status: string; status_label: string; rider_id: number | null; agency_id: number | null;
    sla_started_at: string | null; ready_at: string | null; departed_at: string | null; overflow_reason: string | null;
    sla_minutes: number | null; sla_level: "ok" | "riesgo" | "vencido" | null;
    searching_seconds: number | null; calls_in_seconds: number | null; agency_in_seconds: number | null;
    round: { number: number; expires_at: string } | null; ready: boolean; handed_to_agency: boolean;
    // §16.1: el plazo del retorno (R7) y si al recibirlo va a revisión o queda apartada para la orden (R5)
    return_deadline: string | null; return_overdue: boolean; return_to_review: boolean | null;
    // §14: la incidencia de ruta abierta (o interrumpida, esperando el traspaso) y el rider que todavía tiene el paquete
    open_incident: {
        id: number; type: string; type_label: string; comment: string | null; status: "abierta" | "interrumpida"; pickup: "rider" | "almacen" | null;
        rider: { id: number; names: string; phone: string | null } | null; lat: number | null; lng: number | null; reported_at: string;
    } | null;
    pickup_rider: { id: number; names: string; phone: string | null } | null;
    open_novelty: Novelty | null; priority: number | null; priority_key: string | null; priority_label: string | null;
    order: {
        id: number; name: string; current_total_price: string | number | null; location: string | null;
        client: { first_name: string | null; last_name: string | null; phone: string | null; address1: string | null } | null;
        status: { description: string } | null;
    } | null;
    rider: { id: number; names: string; phone: string | null } | null;
    agency: { id: number; names: string } | null;
    // §10, §20.2: la ruta de varias paradas en la que va (la salida es de toda la ruta)
    route: { id: number; status: string; exceptional: boolean; stop: number | null; stops: number; locked: boolean } | null;
    route_stop: number | null;
};

/** §24.1: una ruta que propone el sistema (sumar una orden que busca rider a la de un rider que todavía no salió). */
export type RouteProposal = {
    add_logistics_order_id: number; add_order_name: string | null; route_id: number | null; exceptional: boolean;
    rider: { id: number; names: string | null };
    stops: { logistics_order_id: number; order_name: string | null; stop: number; leg_seconds: number; leg_meters: number; consumed_minutes: number; projected_minutes: number }[];
    worst_minutes: number; total_minutes: number; depart_in_minutes: number; service_minutes: number; limit_minutes: number;
};

export type TowerSummary = {
    sin_rider: number; preparando_listos: number; rutas_activas: number; en_agencia: number; sla_riesgo: number; novedades: number; retornos: number;
    efectivo_limite: number; diferencias: number; incidencias: number;
};

/** El efectivo bajo custodia de un rider (§17): dólares, bolívares y todo en USD (los bolívares a la tasa de su orden, R6). */
export type RiderCashBalance = { usd: number; ves: number; total_usd: number };

export const cashText = (c: RiderCashBalance) =>
    [c.usd ? `$${c.usd.toFixed(2)}` : null, c.ves ? `Bs ${c.ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : null].filter(Boolean).join(" + ") || "$0";

/** §15: una incidencia vial que reportó un rider, mientras siga activa. */
export type RoadReport = {
    id: number; type: string; type_label: string; comment: string | null; lat: number; lng: number; reported_at: string; expires_at: string;
    reporter: string | null; still_count: number;
};

export type OrdersResponse = {
    orders: TowerOrder[]; summary: TowerSummary; server_time: string; road_reports: RoadReport[];
    settings: { sla_target_minutes: number; sla_limit_minutes: number; manual_calls_at_seconds: number; hard_cap_seconds: number; cash_limit_usd: number };
};

export type CenterRider = {
    id: number; user_id: number; is_active: boolean; suspended_at: string | null; suspended_reason: string | null;
    platform: string | null; app_version: string | null; notifications_enabled: boolean | null; location_permission: string | null;
    last_lat: number | null; last_lng: number | null; last_location_at: string | null; mock_location_at?: string | null; eta_center_seconds: number | null; eta_center_meters: number | null;
    has_push: boolean; alarm_ready: boolean; gps_ok: boolean; routes_today: number; push_error: string | null;
    cash: RiderCashBalance; cash_over_limit: boolean; returns_pending: number;
    user: { id: number; names: string; phone: string | null } | null;
    current: { logistics_order_id: number; order: string | null; status: string; status_label: string }[];
};

export type Candidate = {
    rider_id: number; name: string; rank?: number; eta_center_seconds?: number; projected_minutes?: number; delivered_today?: number;
    reason?: string; reason_label?: string;
};
export type CandidatesResponse = { eligible: Candidate[]; excluded: Candidate[]; limit_minutes: number; warning: string | null };

export type OrderDetail = TowerOrder & {
    rounds: { id: number; number: number; started_at: string; expires_at: string; ended_at: string | null; result: string | null;
        offers: { id: number; rider: { names: string } | null; push_ok: boolean | null; push_error: string | null; seen_at: string | null; responded_at: string | null; response: string | null }[] }[];
    events: { id: number; action: string; from_status: string | null; to_status: string | null; reason: string | null; created_at: string; actor: { names: string } | null }[];
};

export const STATUS_COLOR: Record<string, "default" | "info" | "warning" | "success" | "error" | "primary" | "secondary"> = {
    pendiente_ventana: "default", buscando_rider: "warning", rider_confirmado: "info", preparando: "info", listo_despacho: "primary",
    en_via: "success", novedad: "error", asignado_agencia: "secondary", retorno_pendiente: "warning", en_revision: "warning",
    entregado: "success", cerrada: "default",
};

export const SLA_COLOR = { ok: "success", riesgo: "warning", vencido: "error" } as const;

/** "12:05" a partir de segundos. */
export const clock = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return "—";
    const s = Math.max(0, Math.round(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const minutes = (m: number | null | undefined) => (m === null || m === undefined ? "—" : `${Math.floor(m)} min`);

export const hour = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas" }) : "—";

export const ago = (iso: string | null | undefined) => {
    if (!iso) return "nunca";
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `hace ${Math.max(0, s)} s`;
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    return `hace ${Math.floor(s / 3600)} h`;
};

export const clientName = (o: TowerOrder) => [o.order?.client?.first_name, o.order?.client?.last_name].filter(Boolean).join(" ") || "—";

export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
