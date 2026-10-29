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
    { key: "funnel", label: "Embudo" },
    { key: "losses", label: "Pérdidas" },
    { key: "team", label: "Equipo" },
];

export type Option = { id: number; name: string };
export type PanelOptions = { shops: Option[]; cities: Option[]; products: Option[] };

export type Filters = { preset: Preset; from: string; to: string; shop: string; city: string; product: string };

export type PeriodInfo = { preset: string; label: string; from: string; to: string; until: string; days: number; compare_label?: string };

/** "hours": un tiempo ("40 min", "3,5 h", "2,1 días"); "hours_total": horas sumadas ("62 h"). */
export type MetricFormat = "count" | "money" | "percent" | "hours" | "hours_total";

/** Si subir es bueno ("higher"), malo ("lower", un costo) o ninguna de las dos ("none", una cantidad). */
export type Better = "higher" | "lower" | "none";

export type MetricCardData = {
    key: string; label: string; help: string; detail: string | null; format: MetricFormat;
    value: number | null; previous: number | null; change: number | null; change_unit: "percent" | "points"; neutral: boolean;
    better: Better;
    /** En false no se compara con el período anterior (lo de ahora mismo, o una estimación): se muestra "note". */
    compare: boolean;
    note: string | null;
    /** Una explicación más, para el cursor (de dónde sale una estimación). */
    extra?: string | null;
    /** La meta del dueño para este número (Metas y límites), si puso una. */
    goal?: CardGoal;
};

/* ── Metas y alertas (diccionario §6). Solo el Admin. Qué es cada meta y cómo se compara viene del backend
   (Metrics\Rules\GoalRules y AlertRules); aquí solo se muestra y se edita. ── */

/** met: cumplida · on_track: va bien · behind: va atrasada (amarillo) · below: no llegó (rojo) · neutral: todavía no se sabe. */
export type GoalStatus = "met" | "on_track" | "behind" | "below" | "neutral";

/** La meta de una tarjeta, con su texto ya escrito ("Meta del mes: $6.000. Llevas…"). */
export type CardGoal = {
    label: string; value: number; red: number | null; format: MetricFormat; better: Better;
    /** % de la meta que ya se lleva (solo dinero). */
    progress: number | null;
    /** Lo que todavía puede sumar lo que está en camino (solo dinero, estimado). */
    pending: number | null;
    status: GoalStatus;
    /** "Este mes": dónde deberías ir hoy y cómo terminarías a este ritmo. */
    pace: { expected: number; projection: number } | null;
    text: string;
};

export type AlertLevel = "yellow" | "red";

export type AlertItem = { id: number | null; name: string | null; level: AlertLevel; value: number; text: string };

export type PanelAlert = {
    type: string; level: AlertLevel; title: string; help: string; section: ViewKey; role: string | null; items: AlertItem[];
    /** Los días que miró la alerta (null: es lo de ahora mismo). */
    period: { preset: Preset; from?: string; to?: string } | null;
};

export type AlertsResponse = { configured: boolean; alerts: PanelAlert[]; window: string | null; updated_at: string };

export type TeamGoal = { value: number | null; red: number | null; alert: boolean; people: { id: number; value: number }[] };
export type AlertLimits = { yellow: number | null; red: number | null; on: boolean };

export type GoalsConfig = {
    business: Record<string, number | null>;
    team: Record<string, TeamGoal>;
    alerts: Record<string, AlertLimits>;
    updated_by: string | null;
    updated_at: string | null;
};

export type GoalDef = { label: string; format: MetricFormat; better: Better; help: string; role?: string | null; title?: string };

export type GoalsResponse = {
    config: GoalsConfig;
    catalog: { business: Record<string, GoalDef>; team: Record<string, GoalDef>; alerts: Record<string, GoalDef> };
    people: { sellers: Option[]; agencies: Option[] };
    references: { label: string; business: Record<string, string>; team: Record<string, string>; alerts: Record<string, string> };
};

export const fetchAlerts = () => api<AlertsResponse>("/owner-panel/alerts");
export const fetchGoals = () => api<GoalsResponse>("/owner-panel/goals");
export const saveGoals = (c: Pick<GoalsConfig, "business" | "team" | "alerts">) => api<GoalsResponse>("/owner-panel/goals", "PUT", c);

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

export type FunnelStep = {
    key: "created" | "assigned" | "confirmed" | "on_route" | "delivered"; label: string; help: string; count: number;
    of_created: number | null; of_previous: number | null; median_hours: number | null; timed: number;
    stayed: { cancelled: number; rejected: number; open: number; total: number } | null;
};

export type FunnelResponse = SectionBase & {
    relation: string | null;
    steps: FunnelStep[];
    previous_steps: { key: string; of_created: number | null }[];
    help: string;
};

export const fetchSales = (f: Filters) => api<SalesResponse>(`/owner-panel/sales?${query(f)}`);
export const fetchMoney = (f: Filters) => api<MoneyResponse>(`/owner-panel/money?${query(f)}`);
export const fetchFunnel = (f: Filters) => api<FunnelResponse>(`/owner-panel/funnel?${query(f)}`);

export type CountRow = { key?: string; label: string; count: number };

export type LatestReason = { order_number: string; cancelled_at: string; category: string; stage: string; who: string; reason: string };

export type LossesResponse = SectionBase & {
    reasons: { rows: CountRow[]; help: string };
    stages: { rows: CountRow[]; help: string };
    who: { rows: CountRow[]; help: string };
    novelties: { rows: CountRow[]; help: string };
    latest: { rows: LatestReason[]; help: string };
};

export type InsightsAnalysis = {
    resumen: string;
    hallazgos: { titulo: string; detalle: string; pedidos_aprox: number; gravedad: "alta" | "media" | "baja" }[];
    mejoras: { accion: string; como: string; responsable: string; impacto: "alto" | "medio" | "bajo" }[];
    vendedoras: { nombre: string; observacion: string }[];
};

export type InsightsResponse = {
    status: "ok" | "few" | "unavailable" | "error";
    message?: string;
    analyzed: number;
    written: number;
    generated_at?: string;
    cached?: boolean;
    example?: boolean;
    analysis?: InsightsAnalysis;
};

/* ── Equipo: los KPIs de cada persona de un rol. Qué KPIs tiene cada rol y su explicación vienen del backend
   (Metrics\Team): esta pantalla sirve igual para un rol nuevo. ── */

export type TeamColumn = {
    key: string; label: string; help: string; format: MetricFormat; better: Better;
    /** Todavía puede cambiar en un período reciente: se compara en gris. */
    matures: boolean;
    /** Es lo de ahora mismo: no se compara. */
    now: boolean;
    /** Se marca a quien tiene el doble del promedio o más. */
    flag: boolean;
    /** La meta del dueño para todas (la rayita del ranking) y su rojo. */
    goal?: { value: number; red: number | null };
};

export type TeamValues = Record<string, number | null>;

export type TeamRow = {
    id: number; name: string; group: string | null; values: TeamValues; previous: TeamValues | null;
    /** No llega al mínimo de su rol: va al final del ranking, en gris. */
    low_data: boolean;
    flags: string[];
    /** KPI => si llega a su meta ("ok") o queda en amarillo o rojo. Sin marca: pocos datos o todavía se está entregando. */
    goal_levels?: Record<string, "ok" | AlertLevel>;
};

export type TeamTable = {
    columns: TeamColumn[]; rank_by: string; base: { key: string; min: number; label: string }; rows: TeamRow[];
};

export type TeamRoleData = TeamTable & {
    key: string; label: string; help: string; filters_note: string | null; totals: TeamValues; totals_previous: TeamValues;
};

export type TeamResponse = SectionBase & {
    roles: { key: string; label: string; people: number }[];
    coverage: { missing: string[]; unmeasured: { role: string; note: string }[] };
    role: TeamRoleData;
};

export type CountOf = { label: string; count: number; of: number };

export type TeamBlock =
    | { type: "bars"; title: string; subtitle: string; help: string; rows: CountOf[]; empty?: string }
    | ({ type: "table"; title: string; help: string } & TeamTable);

export type TeamPerson = {
    id: number; name: string; group: string | null; role: string; compare_label: string;
    cards: MetricCardData[]; blocks: TeamBlock[];
};

export const fetchTeam = (f: Filters, role: string) => api<TeamResponse>(`/owner-panel/team?${query(f)}&role=${encodeURIComponent(role)}`);
export const fetchTeamPerson = (f: Filters, role: string, id: number) =>
    api<TeamPerson>(`/owner-panel/team/person?${query(f)}&role=${encodeURIComponent(role)}&id=${id}`);

/**
 * Cuánto cambió un número contra el período anterior, como las tarjetas: los porcentajes en puntos y lo demás en %.
 * null si no se compara (lo de ahora mismo, o falta uno de los dos).
 */
export const teamChange = (col: TeamColumn, value: number | null | undefined, before: number | null | undefined) => {
    if (col.now || value === null || value === undefined || before === null || before === undefined) return null;
    if (col.format === "percent") return Math.round((value - before) * 10) / 10;
    return before !== 0 ? Math.round(((value - before) / Math.abs(before)) * 1000) / 10 : null;
};

/** El orden del ranking: lo mejor primero; los de pocos datos y los sin valor, al final (igual que el backend). */
export const sortTeam = (rows: TeamRow[], key: string, better: Better) =>
    [...rows].sort((a, b) => {
        if (a.low_data !== b.low_data) return a.low_data ? 1 : -1;
        const va = a.values[key] ?? null;
        const vb = b.values[key] ?? null;
        if ((va === null) !== (vb === null)) return va === null ? 1 : -1;
        if (va !== null && vb !== null && va !== vb) return better === "lower" ? va - vb : vb - va;
        return a.name.localeCompare(b.name, "es");
    });

export const fetchLosses = (f: Filters) => api<LossesResponse>(`/owner-panel/losses?${query(f)}`);
export const fetchInsights = (f: Filters, force = false) =>
    api<InsightsResponse>(`/owner-panel/losses/insights?${query(f)}${force ? "&force=1" : ""}`);

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

const oneDecimal = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

/** Un tiempo en horas, como lo dice una persona: "40 min", "3,5 h", "2,1 días". */
export const duration = (hours: number | null | undefined) => {
    if (hours === null || hours === undefined) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 48) return `${oneDecimal.format(hours)} h`;
    return `${oneDecimal.format(hours / 24)} días`;
};

export const formatValue = (v: number | null, format: MetricFormat) =>
    format === "money" ? money(v) : format === "percent" ? pct(v) : format === "hours" ? duration(v)
        : format === "hours_total" ? (v === null ? "—" : `${oneDecimal.format(v)} h`) : count(v);

/** Fecha corta para los gráficos: "26/10". */
export const shortDay = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

/* ── Lo que el panel recuerda en este navegador (secciones prendidas y período). Si el navegador no deja guardar,
   el panel funciona igual con lo de siempre. ── */

const PREFS_KEY = "nuviora.ownerPanel.v1";
/** teamRole: el rol que se mira en Equipo (si ya no existe, el backend muestra las vendedoras). */
type Prefs = { views: ViewKey[]; preset: Preset; teamRole: string };
const DEFAULT_PREFS: Prefs = { views: ["sales"], preset: "7d", teamRole: "sellers" };

export const loadPrefs = (): Prefs => {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return DEFAULT_PREFS;
        const p = JSON.parse(raw) as Partial<Prefs>;
        return {
            views: Array.isArray(p.views) ? p.views.filter((v) => VIEWS.some((x) => x.key === v && !x.soon)) : DEFAULT_PREFS.views,
            preset: PRESETS.some((x) => x.key === p.preset) && p.preset !== "custom" ? p.preset! : DEFAULT_PREFS.preset,
            teamRole: typeof p.teamRole === "string" && /^[a-z_]{1,30}$/.test(p.teamRole) ? p.teamRole : DEFAULT_PREFS.teamRole,
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
