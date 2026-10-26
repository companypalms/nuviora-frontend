// Tipos del reparto de órdenes por grupos (fase 4).

export interface GroupRef {
    id: number;
    name: string;
}

export interface SalesGroupMember {
    user_id: number;
    name: string;
    weight: number | null;
    since: string | null;
}

export interface SalesGroup {
    id: number;
    name: string;
    leader_commission_pct: number;
    leader: { id: number; name: string; weight: number | null } | null;
    members: SalesGroupMember[];
}

export interface GroupSeller {
    id: number;
    name: string;
    max_active_orders: number | null;
    active_orders: number;
    group_id: number | null;
    is_leader: boolean;
}

export interface SalesGroupsData {
    groups: SalesGroup[];
    sellers: GroupSeller[];
}

export interface OverviewSeller {
    id: number;
    name: string;
    group: GroupRef | null;
    is_leader: boolean;
    weight: number | null;
    active_orders: number;
    max_active_orders: number | null;
    at_capacity: boolean;
    target_share: number;
    received_today: number;
}

export interface OverviewShop {
    id: number;
    name: string;
    is_open: boolean;
    received_today: number;
    sellers: OverviewSeller[];
}

export interface SellerRef {
    id: number;
    name: string;
    group: GroupRef | null;
    active_orders: number;
}

export interface AssignmentOverview {
    shops: OverviewShop[];
    sellers: SellerRef[];
    load_balanced: boolean;
}

export interface ReassignStatus {
    id: number;
    description: string;
    count: number;
    default: boolean;
}

export interface ReassignPreview {
    statuses: ReassignStatus[];
    group_mate_ids: number[];
}

// ── "Mi grupo" de la Líder ──────────────────────────────────────────────

export interface MyGroupMember {
    id: number;
    name: string;
    is_leader: boolean;
    weight: number | null;
    max_active_orders: number | null;
    active_orders: number;
    /** status_id => órdenes que tiene ahora en ese estado. */
    pipeline: Record<string, number>;
    /** Carga activa (Asignado a vendedor + Reprogramado para hoy) y alerta de saturación (spec §9). */
    load: number;
    saturated: boolean;
    over_pct: number | null;
}

export interface MyGroupShopMember {
    user_id: number;
    /** Trabaja en esa tienda (puede entrar a su roster). */
    linked: boolean;
    in_roster: boolean;
    last_change: { active: boolean; reason: string | null; by: string; at: string } | null;
}

export interface MyGroupShop {
    id: number;
    name: string;
    /** Jornada de hoy abierta. */
    is_open: boolean;
    members: MyGroupShopMember[];
}

export interface MyGroupData {
    group: { id: number; name: string; leader_commission_pct: number };
    /** La Líder del grupo. */
    me: number;
    /** true cuando lo mira el administrador: solo lectura. */
    read_only: boolean;
    statuses: { id: number; description: string }[];
    members: MyGroupMember[];
    shops: MyGroupShop[];
    saturation: { average: number | null; threshold: number; min_load: number };
}

export interface GroupMetricsRow {
    assigned: number;
    delivered: number;
    effectiveness: number | null;
    cancelled: number;
    cancelled_pct: number | null;
    to_agency: number;
    to_agency_pct: number | null;
    delivered_with_upsell: number;
    upsell_pct: number | null;
    commission_sales: number;
    commission_upsells: number;
    commission_total: number;
    /** Pasaron por Novedades y cuántas se resolvieron (spec §8.3). */
    novelties: number;
    novelties_resolved: number;
    resolved_pct: number | null;
}

/** Ganancias de la Líder en el período (spec §12.2 y §12.4). */
export interface LeaderEarnings {
    personal: { sales: number; upsells: number; total: number };
    leadership: {
        total: number;
        base_total: number;
        by_seller: { seller_id: number; name: string; base_usd: number; pcts: number[]; amount_usd: number }[];
    };
    total: number;
}

export interface GroupMetrics {
    start_date: string;
    end_date: string;
    rows: (GroupMetricsRow & { user_id: number })[];
    totals: GroupMetricsRow;
    /** El período con el que se compara (spec §7.2), si se pidió. */
    compare?: { start_date: string; end_date: string; rows: (GroupMetricsRow & { user_id: number })[]; totals: GroupMetricsRow } | null;
    earnings?: LeaderEarnings;
    /** Para los gráficos (spec §17) */
    series?: GroupSeries;
}

/** Evolución del período por día (o por semana si pasa de 31 días) y dónde están hoy sus órdenes. */
export interface GroupSeries {
    granularity: "day" | "week";
    points: { date: string; assigned: number; delivered: number; deliveries: number; effectiveness: number | null }[];
    funnel: { stage: string; count: number }[];
}

/** Una agencia, solo con los pedidos del grupo de la Líder (spec §10). */
export interface GroupAgency {
    agency_id: number;
    name: string;
    received: number;
    delivered: number;
    effectiveness: number | null;
    pending: number;
    novelties: number;
    novelties_resolved: number;
    resolved_pct: number | null;
    by_status: { status: string; count: number }[];
}
