// src/components/meta-ads/metaAds.ts
// Tipos y utilidades de la integración de Meta Ads (documento de Fran del 2026-10-08, Módulo 2).
import type { CampaignAction, DecisionNote, Funnel, PriceOption, ProductPlan, Verdict } from "./MetaDecisionWidgets";
import { request } from "../../common/request";

export type MetaAccount = {
    id: number;
    meta_id: string;
    name: string | null;
    currency: string | null;
    timezone_name: string | null;
    account_status: number | null;
    is_active: boolean;
    activated_at: string | null;
    history_from: string | null;
    first_synced_at: string | null;
    last_synced_at: string | null;
    last_error_kind: string | null;
    last_error_label: string | null;
    last_error: string | null;
};

export type MetaConnection = {
    id: number;
    name: string;
    business_id: string | null;
    has_token: boolean;
    has_app_secret: boolean;
    meta_user_id: string | null;
    meta_user_name: string | null;
    scopes: string[] | null;
    extra_scopes: string[];
    status: "pending" | "ok" | "error";
    last_success_at: string | null;
    last_error_kind: string | null;
    last_error_label: string | null;
    last_error: string | null;
    last_error_at: string | null;
    accounts_checked_at: string | null;
    syncing: boolean;
    accounts: MetaAccount[];
    other_accounts: { meta_id: string; name: string | null; synced_by: string | null }[];
    active_accounts: number;
};

export type MetaSyncLog = {
    id: number;
    kind: string;
    status: "running" | "ok" | "partial" | "error";
    started_at: string | null;
    finished_at: string | null;
    records: number;
    calls: number;
    error_kind: string | null;
    error_label: string | null;
    error: string | null;
    requested_by: string | null;
    details: { errors?: { account: number | null; step: string; kind: string; message: string }[]; dropped_fields?: string[] } | null;
};

/** Estado de la cuenta en Meta (account_status). */
export const ACCOUNT_STATUS: Record<number, string> = {
    1: "Activa", 2: "Desactivada", 3: "Sin pagar", 7: "En revisión", 8: "Pago pendiente", 9: "Período de gracia",
    100: "Cierre pendiente", 101: "Cerrada", 201: "Activa", 202: "Cerrada",
};

export const SYNC_KIND: Record<string, string> = {
    scheduled: "Programada", manual: "Sincronizar ahora", recheck: "Revisión de días recientes",
};

export const SYNC_STATUS: Record<MetaSyncLog["status"], { label: string; color: "default" | "success" | "warning" | "error" }> = {
    running: { label: "En curso", color: "default" },
    ok: { label: "Correcta", color: "success" },
    partial: { label: "Incompleta", color: "warning" },
    error: { label: "Error", color: "error" },
};

/** Fecha y hora de Caracas, corta: "8 oct 14:30" (o solo la hora si es de hoy). */
export const dateTime = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    const tz = "America/Caracas";
    const day = d.toLocaleDateString("es-VE", { timeZone: tz, day: "numeric", month: "short" });
    const today = new Date().toLocaleDateString("es-VE", { timeZone: tz, day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("es-VE", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    return day === today ? time : `${day} ${time}`;
};

export const shortDay = (ymd: string | null | undefined): string => {
    if (!ymd) return "—";
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
};

// ---------------------------------------------------------------- reporte (§26 a §31, §33, §60)

export type Totals = {
    spend?: number | null; impressions: number | null; reach: number | null; clicks: number | null; link_clicks: number | null;
    outbound_clicks: number | null; landing_page_views: number | null; purchases: number | null; purchase_value?: number | null;
    video_plays: number | null; video_3s_plays: number | null; thruplays: number | null; video_p25: number | null; video_p50: number | null;
    video_p75: number | null; video_p95: number | null; video_p100: number | null;
};

export type Metrics = {
    cpa: number | null; ctr: number | null; unique_ctr: number | null; link_ctr: number | null; cpc: number | null; link_cpc: number | null; cpm: number | null;
    frequency: number | null; lpv_rate: number | null; conversion_rate: number | null; hook_rate: number | null; hold_rate: number | null;
    retention: { p25: number | null; p50: number | null; p75: number | null; p95: number | null; p100: number | null } | null;
    avg_watch_time: number | null;
};

export type Signal = { level: string; color: "green" | "yellow" | "orange" | "red"; label: string } | null;
export type RuleSignal = { type: string; severity: "info" | "alert" | "critical"; label: string };

export type Node = {
    totals: Totals;
    metrics: Metrics;
    frequency_exact: boolean;
    compare?: { from: string; to: string; totals: Totals; metrics: Metrics; change: Record<string, number | null> };
    signals: { frequency: Signal; cpa: Signal; rules: RuleSignal[] };
};

/** CPA financiero calculado (Módulo 4 de Fran, §70 a §72): reemplaza al manual cuando existe (R12). */
export type FinancialCpa = {
    target: number | null; break_even: number | null; fully_loaded: number | null; viable: boolean | null; city_level: boolean;
    period_from: string | null; period_to: string | null; computed_at: string | null; version: number;
    /** 2026-10-31: el producto nunca tuvo una compra registrada */
    no_cost?: boolean;
};
export type CityNode = Node & {
    city_id: number; name: string; accounts: (Node & { account_id: number; name: string | null })[];
    target_cpa?: number | null; break_even_cpa?: number | null; target_source?: "financial" | "manual"; financial?: FinancialCpa | null;
    actions?: CampaignAction[]; // Etapa 5, paso 2b
};
export type ProductNode = Node & {
    product_id: number; name: string; target_cpa: number | null; break_even_cpa: number | null; cities: CityNode[];
    target_source?: "financial" | "manual"; manual_target_cpa?: number | null; manual_break_even_cpa?: number | null; financial?: FinancialCpa | null;
    plan?: ProductPlan | null; // Etapa 5, paso 2b
};

export type RangeInfo = { key: string; label: string; from: string; to: string; prev_from: string; prev_to: string };

export type Overview = {
    range: RangeInfo;
    products: ProductNode[];
    unclassified: Node & { campaigns: number };
    pending_classification: number;
    last_sync_at: string | null;
    has_connections: boolean;
    can_see_financials: boolean;
};

export type ReportRow = Node & {
    level: "campaign" | "adset" | "ad" | "creative";
    id: number; meta_id?: string; name: string | null; account?: string | null; effective_status?: string | null; active?: boolean;
    missing_since?: string | null; last_known_state?: string | null; has_data?: boolean; target_cpa: number | null; break_even_cpa: number | null;
    product?: string | null; city?: string | null; product_id?: number | null; city_id?: number | null; objective?: string | null;
    campaign?: string | null; campaign_meta_id?: string; adset_meta_id?: string;
    creative_tracking_id?: string | null; tracking_id_source?: string | null; creative_id?: number | null; creative_status?: string | null;
    creative_type?: string | null; thumbnail_url?: string | null;
    tracking_id?: string; type?: string | null; status?: string | null; ads?: number; accounts?: number;
    // Etapa 5, paso 1b: lo que dice el nombre (anuncio, ad set o creativo)
    creative_label?: string | null; angle_code?: string | null; batch_code?: string | null; concept?: string | null;
    stage?: "test" | "proven" | null; iteration_of?: string | null;
    // Etapa 5, paso 2a: lo que dicen las reglas del dueño (3 días cerrados)
    verdict?: Verdict | null; decision_notes?: DecisionNote[]; funnel?: Funnel | null; status_source?: "auto" | "manual" | null;
    action?: CampaignAction | null; budget_notes?: string[]; price_option?: PriceOption | null;
};

export const RANGES: { key: string; label: string }[] = [
    { key: "today", label: "Hoy" }, { key: "yesterday", label: "Ayer" }, { key: "last_3d", label: "Últimos 3 días" },
    { key: "last_7d", label: "Últimos 7 días" }, { key: "last_14d", label: "Últimos 14 días" }, { key: "last_30d", label: "Últimos 30 días" },
    { key: "this_week_mon_today", label: "Esta semana" }, { key: "last_week_mon_sun", label: "Semana pasada" },
    { key: "this_month", label: "Este mes" }, { key: "last_month", label: "Mes pasado" }, { key: "custom", label: "Personalizado" },
];

/**
 * Las métricas que se pueden graficar (§26). "lower" = más bajo es mejor (para el color de la variación). CTR y CPC
 * solo del enlace: los de todos los clics no interesan (Fran, 2026-10-09, pregunta 2).
 */
export const CHART_METRICS: { key: string; label: string; kind: "money" | "pct" | "num" | "freq"; lower?: boolean; video?: boolean }[] = [
    { key: "cpa", label: "CPA", kind: "money", lower: true },
    { key: "unique_ctr", label: "CTR único", kind: "pct" },
    { key: "link_ctr", label: "CTR (enlace)", kind: "pct" },
    { key: "cpm", label: "CPM", kind: "money", lower: true },
    { key: "link_cpc", label: "CPC (enlace)", kind: "money", lower: true },
    { key: "frequency", label: "Frequency", kind: "freq", lower: true },
    { key: "purchases", label: "Purchases", kind: "num" },
    { key: "hook_rate", label: "Hook Rate", kind: "pct", video: true },
    { key: "hold_rate", label: "Hold Rate", kind: "pct", video: true },
    { key: "lpv_rate", label: "LPV Rate", kind: "pct" },
    { key: "conversion_rate", label: "Conversion Rate", kind: "pct" },
    { key: "spend", label: "Gasto", kind: "money" },
];

const nf = (d: number) => new Intl.NumberFormat("es-VE", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmt = {
    money: (v: number | null | undefined) => (v === null || v === undefined ? "N/A" : `$${nf(2).format(v)}`),
    pct: (v: number | null | undefined) => (v === null || v === undefined ? "N/A" : `${nf(2).format(v)} %`),
    num: (v: number | null | undefined) => (v === null || v === undefined ? "—" : nf(Number.isInteger(v) ? 0 : 2).format(v)),
    freq: (v: number | null | undefined) => (v === null || v === undefined ? "N/A" : nf(2).format(v)),
    secs: (v: number | null | undefined) => (v === null || v === undefined ? "N/A" : `${nf(1).format(v)} s`),
};

export const fmtKind = (kind: "money" | "pct" | "num" | "freq", v: number | null | undefined) => fmt[kind](v);

/** El valor de una métrica en un nodo (las sumas viven en totals, las fórmulas en metrics). */
export const metricOf = (n: Node, key: string): number | null => {
    const source = (key in n.metrics ? n.metrics : n.totals) as unknown as Record<string, unknown>;
    const value = source[key];
    return typeof value === "number" ? value : null;
};

export const SIGNAL_COLORS: Record<string, string> = { green: "#2e7d32", yellow: "#f9a825", orange: "#ef6c00", red: "#c62828" };
export const SIGNAL_DOT: Record<string, string> = { green: "🟢", yellow: "🟡", orange: "🟠", red: "🔴" };

export const CREATIVE_STATUS: Record<string, string> = {
    testing: "Testing", winner: "Winner", fatigued: "Fatigued", loser: "Loser", archived: "Archived",
};

// ---------------------------------------------------------------- filtros (§27, §28, §30, §42)

export type Filters = {
    range: string; from: string; to: string; compare: boolean;
    product_id: number | null; city_id: number | null; account_id: number | null;
    campaign: string | null; adset: string | null; creative: number | null;
    status: "" | "active" | "inactive"; include_inactive: boolean;
};

export const DEFAULT_FILTERS: Filters = {
    range: "last_7d", from: "", to: "", compare: false, product_id: null, city_id: null, account_id: null,
    campaign: null, adset: null, creative: null, status: "", include_inactive: false,
};

export type FilterOptions = {
    products: { id: number; name: string }[];
    cities: { id: number; name: string }[];
    accounts: { id: number; name: string | null; meta_id: string }[];
    campaigns: { meta_id: string; name: string | null; product_id: number | null; city_id: number | null; active: boolean }[];
    adsets: { meta_id: string; name: string | null; campaign_meta_id: string; active: boolean }[];
    creatives: { id: number; tracking_id: string; label: string; product_id: number | null; type: string | null; status: string | null }[];
};

/** Los filtros como parámetros de la API. */
export const filtersQuery = (f: Filters) => {
    const p = new URLSearchParams();
    p.set("range", f.range);
    if (f.range === "custom") { if (f.from) p.set("from", f.from); if (f.to) p.set("to", f.to); }
    if (f.compare) p.set("compare", "1");
    for (const k of ["product_id", "city_id", "account_id", "campaign", "adset", "creative"] as const) {
        if (f[k] !== null && f[k] !== "") p.set(k, String(f[k]));
    }
    if (f.status) p.set("status", f.status);
    if (f.include_inactive) p.set("include_inactive", "1");
    return p.toString();
};


/** Las columnas de métricas de las tablas (§29, §60). */
export const COLUMNS: { key: string; label: string; kind: "money" | "pct" | "num" | "freq"; lower?: boolean; video?: boolean; financial?: boolean }[] = [
    { key: "spend", label: "Gasto", kind: "money", financial: true },
    { key: "purchases", label: "Purchases", kind: "num" },
    { key: "cpa", label: "CPA", kind: "money", lower: true },
    { key: "unique_ctr", label: "CTR único", kind: "pct" },
    { key: "link_ctr", label: "CTR enlace", kind: "pct" },
    { key: "link_cpc", label: "CPC enlace", kind: "money", lower: true },
    { key: "cpm", label: "CPM", kind: "money", lower: true },
    { key: "frequency", label: "Frequency", kind: "freq", lower: true },
    { key: "lpv_rate", label: "LPV Rate", kind: "pct" },
    { key: "conversion_rate", label: "Conv. Rate", kind: "pct" },
    { key: "hook_rate", label: "Hook Rate", kind: "pct", video: true },
    { key: "hold_rate", label: "Hold Rate", kind: "pct", video: true },
];

/** GET/POST/PUT/DELETE al backend; devuelve el JSON o lanza el mensaje del backend. */
export const api = async <T = unknown>(url: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown): Promise<T> => {
    const { status, response } = await request(url, method, body as Parameters<typeof request>[2]);
    const json = await response.json().catch(() => ({}));
    if (status >= 400) {
        const message = json?.message || (json?.errors ? Object.values(json.errors).flat().join(" ") : null) || `Error ${status}`;
        // errors: casilla => mensajes (Laravel), para marcar la casilla que está mal
        throw Object.assign(new Error(message), { status, errors: json?.errors });
    }
    return json as T;
};
