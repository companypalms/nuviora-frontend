// src/components/owner-panel/ownerPanel.ts
// Panel del dueño (Etapa 2, guias/DICCIONARIO-METRICAS.md): tipos, llamadas y formatos. Los números y sus
// explicaciones vienen calculados del backend (Metrics\Rules): aquí solo se muestran.
import { api, money, pct } from "../finance/finance";
export { money, pct, day } from "../finance/finance";

export type Preset = "today" | "yesterday" | "7d" | "month" | "last_month" | "custom";
export type ViewKey = "sales" | "money" | "funnel" | "losses" | "team";

export const PRESETS: { key: Preset; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "yesterday", label: "Ayer" },
    { key: "7d", label: "Últimos 7 días" },
    { key: "month", label: "Este mes" },
    { key: "last_month", label: "Mes pasado" },
    { key: "custom", label: "Elegir fechas" },
];

/** Las secciones que se prenden y apagan con "Ver". Las que tienen "soon" llegan en los próximos pasos. */
export const VIEWS: { key: ViewKey; label: string; soon?: boolean }[] = [
    { key: "sales", label: "Ventas" },
    { key: "money", label: "Dinero" },
    { key: "funnel", label: "Embudo", soon: true },
    { key: "losses", label: "Pérdidas", soon: true },
    { key: "team", label: "Equipo", soon: true },
];

export type Option = { id: number; name: string };
export type PanelOptions = { shops: Option[]; cities: Option[]; products: Option[] };

export type Filters = { preset: Preset; from: string; to: string; shop: string; city: string; product: string };

export type PeriodInfo = { preset: string; label: string; from: string; to: string; until: string; days: number; compare_label?: string };

export type MetricFormat = "count" | "money" | "percent";

export type MetricCardData = {
    key: string; label: string; help: string; detail: string | null; format: MetricFormat;
    value: number | null; previous: number | null; change: number | null; change_unit: "percent" | "points"; neutral: boolean;
    /** Si subir es bueno ("higher") o malo ("lower", un costo). */
    better: "higher" | "lower";
    /** En false no se compara con el período anterior (lo de ahora mismo, o una estimación): se muestra "note". */
    compare: boolean;
    note: string | null;
    /** Una explicación más, para el cursor (de dónde sale una estimación). */
    extra?: string | null;
};

/** Lo que tienen en común las respuestas de todas las secciones. */
export type SectionBase = {
    period: PeriodInfo; previous: PeriodInfo; maturing: boolean; maturity_days: number; pending: number; updated_at: string;
    cards: MetricCardData[];
};

export type StatusKey = "delivered" | "open" | "not_delivered";

export type SeriesPoint = {
    date: string; created: number; delivered: number; open: number; not_delivered: number; revenue: number;
    effectiveness: number | null; ticket: number | null;
};

export type Granularity = "day" | "week" | "month";

export type SalesResponse = SectionBase & {
    status: { key: StatusKey; label: string; help: string; count: number }[];
    series: { granularity: Granularity; points: SeriesPoint[]; help: string };
    excluded: { exchange: number; return: number; help: string };
};

export type MoneyPoint = {
    date: string; revenue: number; product: number; commissions: number; shipping: number; ads: number; expenses: number;
    profit: number; open: number; pending: number;
};

export type WaterfallStep = { key: string; label: string; help: string; kind: "start" | "cost" | "total"; amount: number };

export type ProductProfit = {
    product_id: number | null; name: string; others?: boolean; revenue: number; costs: number; ads: number; profit: number; delivered: number;
};

export type MoneyResponse = SectionBase & {
    filtered: boolean;
    waterfall: WaterfallStep[];
    series: { granularity: Granularity; points: MoneyPoint[]; help: string };
    products: { rows: ProductProfit[]; help: string };
    receivables: { rows: { agency_id: number | null; name: string; usd: number }[]; total: number; help: string };
    warnings: string[];
};

export const fetchOptions = () => api<PanelOptions>("/owner-panel/options");

const query = (f: Filters) => {
    const qs = new URLSearchParams({ preset: f.preset });
    if (f.preset === "custom") {
        qs.set("from", f.from);
        qs.set("to", f.to);
    }
    if (f.shop) qs.set("shop_id", f.shop);
    if (f.city) qs.set("city_id", f.city);
    if (f.product) qs.set("product_id", f.product);
    return qs.toString();
};

export const fetchSales = (f: Filters) => api<SalesResponse>(`/owner-panel/sales?${query(f)}`);
export const fetchMoney = (f: Filters) => api<MoneyResponse>(`/owner-panel/money?${query(f)}`);

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Lo que dice el cursor sobre una barra: "lunes 26/10", "Semana del 19/10" u "octubre 2026". */
export const pointTitle = (date: string, granularity: Granularity) => {
    const d = new Date(`${date}T12:00:00`);
    if (granularity === "month") return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (granularity === "week") return `Semana del ${shortDay(date)}`;
    return `${WEEKDAYS[d.getDay()]} ${shortDay(date)}`;
};

/** La etiqueta corta bajo cada barra: "26/10" o "oct". */
export const pointLabel = (date: string, granularity: Granularity) =>
    granularity === "month" ? MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3) : shortDay(date);

const intFmt = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });
export const count = (v: number | null | undefined) => (v === null || v === undefined ? "—" : intFmt.format(v));

export const formatValue = (v: number | null, format: MetricFormat) =>
    format === "money" ? money(v) : format === "percent" ? pct(v) : count(v);

/** Fecha corta para los gráficos: "26/10". */
export const shortDay = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

/* ── Lo que el panel recuerda en este navegador (secciones prendidas y período). Si el navegador no deja guardar,
   el panel funciona igual con lo de siempre. ── */

const PREFS_KEY = "nuviora.ownerPanel.v1";
type Prefs = { views: ViewKey[]; preset: Preset };
const DEFAULT_PREFS: Prefs = { views: ["sales"], preset: "7d" };

export const loadPrefs = (): Prefs => {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return DEFAULT_PREFS;
        const p = JSON.parse(raw) as Partial<Prefs>;
        return {
            views: Array.isArray(p.views) ? p.views.filter((v) => VIEWS.some((x) => x.key === v && !x.soon)) : DEFAULT_PREFS.views,
            preset: PRESETS.some((x) => x.key === p.preset) && p.preset !== "custom" ? p.preset! : DEFAULT_PREFS.preset,
        };
    } catch {
        return DEFAULT_PREFS;
    }
};

export const savePrefs = (p: Prefs) => {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch {
        /* sin almacenamiento: no pasa nada */
    }
};
