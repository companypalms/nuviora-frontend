// src/components/replenishment/replenishment.ts
// Tipos y textos de Reabastecimiento (Módulo 5 de Fran): la configuración del plan de inventario (entrega 2).
export type Weights<K extends string> = Record<K, number>;

export type ReplSettings = {
    coverage_days: number; safety_days: number; sin_stock_pct: number;
    window_weights: Weights<"d7" | "d14" | "d30">;
    transfer_min_units: number;
    score_weights: Weights<"stockout" | "velocity" | "lead_time" | "economics" | "confidence">;
    score_ranges: Weights<"critical" | "high" | "monitor">;
    reliability_weights: Weights<"accuracy" | "stockout" | "excess">;
    paused_demand_pct: number; excess_multiplier: number; dead_stock_days: number; trend_stable_pct: number;
    auto_plan_before_route: number;
};

export type ProductRow = {
    id: number; name: string; stock: number; commercial_status: string; coverage_days: number | null; safety_days: number | null;
    sin_stock_pct: number | null; notes: string | null; cities: Record<string, boolean>; suppliers: number;
};

export type SupplierProductRow = {
    id: number; supplier_id: number; supplier: string; product_id: number; product: string; city_id: number | null; city: string | null;
    expected_unit_cost_usd: number | null; lead_time_days: number; receiving_warehouse_id: number | null; receiving_warehouse: string | null;
    is_active: boolean; is_preferred: boolean; notes: string | null;
};

export type RouteRow = {
    id: number; name: string; start_city_id: number | null; start_city: string | null; lead_time_days: number; usual_days: number[];
    cost_usd: number | null; is_active: boolean; notes: string | null;
    stops: { warehouse_id: number; warehouse: string; city_id: number | null; position: number }[];
};

export type ReplConfig = {
    settings: ReplSettings; defaults: ReplSettings; pending: string[];
    statuses: Record<string, string>; days: Record<string, string>;
    products: ProductRow[];
    cities: { id: number; name: string }[];
    warehouses: { id: number; name: string; city_id: number | null }[];
    suppliers: { id: number; name: string; is_active: boolean }[];
    supplier_products: SupplierProductRow[];
    routes: RouteRow[];
};

export type AuditRow = {
    id: number; at: string; user: string | null; action: string; entity_type: string; entity_id: number | null;
    before: Record<string, unknown> | null; after: Record<string, unknown> | null; reason: string | null;
};

export const WEIGHT_LABELS: Record<string, string> = {
    d7: "Últimos 7 días", d14: "Últimos 14 días", d30: "Últimos 30 días",
    stockout: "Riesgo de quedarse sin stock", velocity: "Velocidad y tendencia", lead_time: "Tiempo de reposición",
    economics: "Salud económica (CPA y margen)", confidence: "Confianza estadística",
    critical: "Crítico desde", high: "Alta prioridad desde", monitor: "Monitorizar desde",
    accuracy: "Precisión del forecast", excess: "Control de exceso",
};

export const ACTION_LABELS: Record<string, string> = {
    replenishment_settings_updated: "Cambió la configuración",
    product_inventory_settings_updated: "Cambió un producto",
    product_city_availability_updated: "Cambió una ciudad de un producto",
    supplier_product_created: "Agregó un proveedor a un producto",
    supplier_product_updated: "Cambió un proveedor de un producto",
    route_created: "Creó una ruta",
    route_updated: "Cambió una ruta",
    transfer_created: "Creó un traslado",
    transfer_preparing: "Traslado en preparación",
    transfer_dispatched: "Salió un traslado",
    transfer_received: "Recibió un traslado",
    transfer_cancelled: "Canceló un traslado",
    purchase_ordered: "Registró una compra por recibir",
    purchase_received: "Recibió una compra",
    purchase_cancelled: "Canceló una compra por recibir",
    stock_adjusted: "Ajustó stock",
    stock_written_off: "Sacó stock (muestra, regalo o uso interno)",
    plan_approved: "Aprobó un plan de inventario",
    plan_evaluated: "Se evaluó un plan de inventario",
};

export const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0);
