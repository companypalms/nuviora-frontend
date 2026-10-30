// src/components/finance/finance.ts
// Finanzas (Módulo 4 de Fran, 2026-10-12): tipos y utilidades de la pantalla de gastos (§24 a §33). Solo el Admin (§81).
export { api } from "../meta-ads/metaAds";
import { money as plainMoney } from "../delivery-tariffs/deliveryTariffs";
export { day, todayCaracas } from "../delivery-tariffs/deliveryTariffs";

/** Dólares con el signo delante en los negativos: "−$23,30" y no "$-23,30". */
export const money = (v: number | null | undefined) => (v !== null && v !== undefined && v < 0 ? `−${plainMoney(-v)}` : plainMoney(v));
export { download } from "../agency-closures/closures";

export type Currency = "USD" | "USDT" | "VES";
export type Frequency = "weekly" | "monthly" | "annual" | "custom";

export type Option = { id: number; name: string };

export type PaymentType = "cash" | "credit";

export type FinanceOptions = {
    categories: { id: number; name: string; is_active: boolean }[];
    products: { id: number; title: string }[];
    cities: Option[];
    warehouses: Option[];
    agencies: { id: number; names: string }[];
    suppliers: (Option & { is_active: boolean })[];
    currencies: Currency[];
    frequencies: Record<Frequency, string>;
    weekdays: Record<string, string>;
    financial_accounts: CashAccountOption[];
    cash_start_date: string;
    payee_types: Record<string, string>;
    payment_types: Record<PaymentType, string>;
    vehicle_wear: WearRule & { label: string };
};

/** Una cuenta de la caja de donde puede salir un pago (entrega 3). */
export type CashAccountOption = { id: number; name: string; currency: string; kind?: string };

const moneyFamily = (c: string) => (c === "USD" || c === "USDT" ? "USD" : c);

/** Las cuentas de la caja en la moneda de un pago (USD y USDT valen igual, §33). */
export const accountsFor = <T extends { currency: string }>(accounts: T[], currency: string) =>
    accounts.filter((a) => moneyFamily(a.currency) === moneyFamily(currency));

export type WearMode = "percent" | "fixed";
export type WearRule = { mode: WearMode; value: number };

export type Expense = {
    id: number; concept: string; expense_category_id: number; category: string | null;
    amount: number; currency: Currency; rate: number; amount_usd: number; expense_date: string; description: string | null;
    has_receipt: boolean; product_id: number | null; product: string | null; city_id: number | null; city: string | null;
    warehouse_id: number | null; warehouse: string | null; agency_id: number | null; agency: string | null;
    supplier_id: number | null; supplier: string | null; scope: "general" | "assigned"; inventory_trip_id: number | null;
    cash_movement_id: number | null; financial_account_id: number | null; account: string | null;
    payable: { id: number; payee_type: string; payee: string | null; due_date: string | null; balance: number; status: PayableStatus } | null;
    voided_at: string | null; voided_by: string | null; void_reason: string | null; created_by: string | null; created_at: string | null;
};

export type ExpensesResponse = {
    from: string; to: string; expenses: Expense[];
    summary: { total: number; manual: number; recurring: number; general: number; assigned: number; trips: number; by_category: { category: string; amount_usd: number }[] };
};

export type RecurringVersion = {
    id: number; valid_from: string; is_active: boolean; amount: number; currency: Currency; rate: number; amount_usd: number; created_by: string | null;
};

export type RecurringExpense = {
    id: number; name: string; expense_category_id: number; category: string | null; frequency: Frequency; frequency_label: string;
    interval_days: number | null; payment_day: number | null; payment_date: string | null; schedule: string;
    product_id: number | null; product: string | null; city_id: number | null; city: string | null; scope: "general" | "assigned";
    is_active: boolean; active_today: boolean; current: RecurringVersion | null; scheduled: RecurringVersion | null;
    monthly_usd: number; next_payment: string | null; versions: RecurringVersion[];
    // Entrega 3 (§28): los vencimientos desde el arranque de la caja y sus pagos
    due: { due_date: string; amount: number; currency: Currency; amount_usd: number; paid: boolean; overdue: boolean }[];
    payments: {
        id: number; due_date: string; paid_at: string; account: string | null; amount: number; currency: Currency; rate: number; amount_usd: number;
        notes: string | null; has_receipt: boolean; voided_at: string | null; void_reason: string | null;
    }[];
};

export type AuditEntry = {
    id: number; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null;
    reason: string | null; user: string | null; at: string;
};

export const CURRENCY_LABEL: Record<Currency, string> = { USD: "Dólares (USD)", USDT: "USDT", VES: "Bolívares (Bs)" };

/** Lo que muestra el monto original: "Bs 5.000,00 a 100" o "$150,00". */
export const original = (amount: number, currency: Currency, rate: number) => {
    const n = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    if (currency === "VES") return `Bs ${n} (tasa ${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 4 }).format(rate)})`;
    return currency === "USDT" ? `${n} USDT` : `$${n}`;
};

/** §31 a §33: el equivalente en USD que va a guardar el backend. */
export const toUsd = (amount: string, currency: Currency, rate: string): number | null => {
    const a = Number(amount.replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) return null;
    if (currency !== "VES") return Math.round(a * 100) / 100;
    const r = Number(rate.replace(",", "."));
    return Number.isFinite(r) && r > 0 ? Math.round((a / r) * 100) / 100 : null;
};

export const num = (s: string) => Number(s.replace(",", "."));

/** Primer y último día de un mes, en AAAA-MM-DD. */
export const monthRange = (offset = 0): [string, string] => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return [ymd(first), ymd(last)];
};

/** El mensaje de error de una respuesta del backend (el primero de la validación, si lo hay). */
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "No se pudo guardar.");

// ---- Rentabilidad (§47 a §52, §57, §58) ----
export type Levels = {
    revenue: number; revenue_main: number; revenue_upsell: number; revenue_refunded: number; cogs: number; logistics: number;
    delivery: number; delivery_legacy: number; commission_sellers: number; commission_leaders: number; advertising: number;
    other_variable: number; shrinkage: number; contribution: number; margin_pct: number | null; orders_delivered: number; orders_not_delivered: number;
    meta_purchases: number;
    upsell: { revenue: number; cogs: number; commission: number; profit: number };
    checks: {
        cogs_missing_lines: number; delivery_trips: number; delivery_final_trips: number; delivery_missing_trips: number; delivery_estimated_trips: number;
        shrinkage_provisional_units: number;
    };
};

export type CompanyLevels = Levels & {
    advertising_unclassified: number; fixed: number; operating_profit: number; expenses_total: number; operating_pct: number | null;
};

export type GroupRow = Levels & { product_id: number | null; city_id: number | null; name: string; unassigned: boolean };

export type PnlReport = {
    from: string; to: string; status: { label: "PROVISIONAL" | "CONSOLIDADO"; reasons: string[] };
    company: CompanyLevels; groups: GroupRow[] | null; warnings: string[];
};

export type GroupBy = "product" | "city" | "product_city";

export type OrderRow = {
    order_id: number; name: string; status: string | null; kind: string; outcome: string; created_date: string | null; delivered_date: string | null;
    cost_date: string | null; revenue: number; cogs: number; logistics: number; cogs_source: "lots" | "catalog" | "mixed" | null;
    delivery: number; commissions: number; result: number; cogs_missing_lines: number; delivery_missing_trips: number; delivery_estimated: boolean;
};

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 }).format(v)} %`);

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** §57: hoy, semana actual (lunes a hoy), mes actual y mes pasado. */
export const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
    { key: "today", label: "Hoy", range: () => { const t = ymd(new Date()); return [t, t]; } },
    { key: "week", label: "Semana actual", range: () => { const d = new Date(); const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [ymd(monday), ymd(d)]; } },
    { key: "month", label: "Mes actual", range: () => [monthRange()[0], ymd(new Date())] },
    { key: "last_month", label: "Mes pasado", range: () => monthRange(-1) },
];

// ---- Cohortes, CPA y configuración (§59 a §74, §22, §66) ----
export type CohortRow = {
    period: string; period_end: string; mature: boolean; created: number; delivered: number; not_delivered: number; open: number;
    effectiveness: number | null; revenue: number; variable: number; contribution: number; spend: number; purchases: number;
    meta_cpa: number | null; after_ads: number;
};

export type CohortResponse = {
    from: string; to: string; group: "day" | "week"; mature_until: string; rows: CohortRow[];
    total: { created: number; delivered: number; effectiveness: number | null };
    effectiveness: { product_id: number; city_id: number | null; name: string; created: number; delivered: number; open: number; effectiveness: number | null }[];
};

export type CpaVersion = {
    id: number; product_id: number; city_id: number | null; version: number; period_from: string; period_to: string;
    orders_created: number; orders_delivered: number; effectiveness: number | null; revenue: number; variable_costs: number; contribution: number;
    cogs: number; purchases: number; spend: number; meta_cpa: number | null; target_type: "sales" | "cost"; target_pct: number;
    break_even: number | null; target: number | null; fully_loaded: number | null; viable: boolean | null; trigger: string; computed_at: string;
    fixed_pct: number | null; fixed_source: "real" | "minimum" | null; window_days: number | null; detail: CpaDetail | null;
};

/** El % de gastos fijos que se aparta: el real de los últimos 30 días o el mínimo, el mayor. */
export type FixedShare = {
    pct: number; source: "real" | "minimum"; real_pct: number | null; min_pct: number; expenses: number; revenue: number; from: string; to: string;
};

/** Una de las dos cohortes (7 y 28 días) con su objetivo y su break-even. */
export type CpaWindow = {
    from: string; to: string; days: number; purchases: number; effectiveness: number | null; meta_cpa: number | null;
    target: number | null; break_even: number | null; missing_trips: number; shipping_filled: number;
};

export type CpaDetail = {
    chosen: "short" | "long" | "product"; basis: "own" | "product"; city_min_purchases: number;
    short: CpaWindow | null; long: CpaWindow | null; fixed: FixedShare;
};

export type CpaRow = CpaVersion & { product: string; city: string | null };

// ---- Proveedores, compras y deudas (entrega 2b; §9, §10, §16, §17, §44) ----
export type PayableStatus = "open" | "overdue" | "paid";

export const PAYABLE_STATUS: Record<PayableStatus, { label: string; color: "warning" | "error" | "success" }> = {
    open: { label: "Pendiente", color: "warning" }, overdue: { label: "Vencida", color: "error" }, paid: { label: "Pagada", color: "success" },
};

export type PayablePayment = {
    id: number; amount: number; currency: Currency; rate: number; amount_usd: number; applied_amount: number; paid_at: string;
    financial_account_id: number | null; account: string | null; cash_movement_id: number | null; notes: string | null; has_receipt: boolean;
    voided_at: string | null; voided_by: string | null; void_reason: string | null; created_by: string | null;
};

export type Payable = {
    id: number; payee_type: string; payee: string; supplier_id: number | null; source_type: string | null; source_id: number | null;
    description: string; currency: Currency; amount: number; rate: number; amount_usd: number; paid_amount: number; paid_usd: number;
    balance: number; balance_usd: number; issued_at: string; due_date: string | null; terms: string | null; status: PayableStatus;
    payments?: PayablePayment[];
};

export type Purchase = {
    id: number; supplier_id: number; supplier: string | null; product_id: number; product: string | null; warehouse_id: number; warehouse: string | null;
    quantity: number; total_amount: number; currency: Currency; rate: number; total_usd: number; unit_cost_usd: number;
    payment_type: PaymentType; payment_type_label: string; purchased_at: string; due_date: string | null; terms: string | null;
    notes: string | null; has_receipt: boolean; created_by: string | null;
};

export type SupplierRow = {
    id: number; name: string; contact_name: string | null; phone: string | null; notes: string | null; is_active: boolean;
    purchases: number; purchased_usd: number; last_purchase: string | null; debt_usd: number; overdue_usd: number; open_debts: number; next_due: string | null;
};

export type SuppliersResponse = {
    suppliers: SupplierRow[];
    totals: { debt_usd: number; overdue_usd: number; due_soon_usd: number; open_debts: number };
};

export type SupplierDetail = { supplier: { id: number; name: string; is_active: boolean }; payables: Payable[]; purchases: Purchase[] };

/** Un monto en la moneda de una deuda: "Bs 5.000,00", "150,00 USDT" o "$150,00" (sin la tasa). */
export const inCurrency = (amount: number, currency: Currency) => {
    const n = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    return currency === "VES" ? `Bs ${n}` : currency === "USDT" ? `${n} USDT` : `$${n}`;
};

// ---- Finanzas › Inventario (entrega 2e; §9 a §17, R3, R5, R8) ----
export type LotPlace = { warehouse: string; state: "available" | "review"; units: number };

export type InventoryLotRow = {
    id: number; product_id: number; product: string; variant: string | null; kind: string; kind_label: string; supplier: string | null;
    purchase_id: number | null; received_at: string; initial: number; remaining: number; unit_cost: number | null; cost_source: string | null;
    landed: number; notes: string | null; origin: string | null; user: string | null; where: LotPlace[];
};

export type InventoryResponse = {
    from: string; to: string; initialized: boolean; started_at: string | null;
    totals: { units: number; value: number; logistics: number; without_cost_units: number; review_units: number; review_value: number };
    products: {
        product_id: number; product: string; units: number; value: number; logistics: number; avg_unit_cost: number | null;
        without_cost_units: number; review_units: number; review_value: number;
    }[];
    warehouses: { warehouse_id: number; warehouse: string; units: number; value: number }[];
    pending: InventoryLotRow[];
    lots: InventoryLotRow[];
    review: { product_id: number; product: string; warehouse: string; units: number; value: number; from_exchange: number }[];
    adjustments: {
        up_units: number; up_value: number; down_units: number; down_value: number;
        rows: { movement_id: number; date: string; product: string; warehouse: string; units: number; value: number; notes: string | null; user: string | null }[];
    };
    trips: { count: number; units: number; total_usd: number };
    check: { differences: number; pending: number };
};

export const COST_SOURCE: Record<string, string> = {
    purchase: "de la compra", catalog: "de catálogo", manual: "puesto a mano", last_lot: "del lote anterior", recovered: "pieza de un cambio",
};

// ---- Viajes de traslado (entrega 2c; §13, §14, §15, R8) ----
export type TripMovement = {
    id: number; date: string; product_id: number; product: string | null; variant: string | null; from: string | null; to: string | null;
    quantity: number; trip_id: number | null;
};

export type Trip = {
    id: number; trip_date: string; description: string | null; currency: Currency; rate: number; labor: number; fuel: number; other: number;
    wear: number; total: number; total_usd: number; wear_mode: WearMode; wear_value: number; wear_label: string; units: number; unit_cost_usd: number;
    financial_account_id: number | null; account: string | null; notes: string | null; has_receipt: boolean;
    voided_at: string | null; voided_by: string | null; void_reason: string | null; created_by: string | null;
    destinations: string[]; movements: TripMovement[];
};

export type TripsResponse = {
    from: string; to: string; trips: Trip[]; summary: { trips: number; units: number; total_usd: number };
    wear: WearRule & { label: string };
};

/** §13, §15: el desgaste, el total y su equivalente en USD de un viaje (igual que el backend). */
export const tripTotals = (labor: number, fuel: number, other: number, currency: Currency, rate: number, rule: WearRule) => {
    const r = currency === "VES" ? rate : 1;
    const base = labor + fuel + other;
    const wear = Math.round((rule.mode === "fixed" ? rule.value * r : (base * rule.value) / 100) * 100) / 100;
    const total = Math.round((base + wear) * 100) / 100;
    return { wear, total, totalUsd: r > 0 ? Math.round((total / r) * 100) / 100 : 0 };
};

/** Dólares con 2 decimales, o hasta 4 si hacen falta: "$0,55", "$0,525". */
export const usd4 = (v: number) => `$${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v)}`;

export type FinanceSettings = {
    maturity_lag_days: number; analysis_window_days: number; analysis_long_window_days: number;
    fixed_cost_min_pct: number; cpa_city_min_purchases: number;
    commissions: { order: number; upsell_unit: number; deliverer: number };
    vehicle_wear: WearRule;
    wear_modes: Record<WearMode, string>;
    target_types: Record<"sales" | "cost", string>;
    products: { id: number; name: string; cost_usd: number | null; target_type: "sales" | "cost"; target_pct: number }[];
};

// ---- Caja (entrega 3; §34 a §36, §42, §75, §76, R14) ----
export type CashCurrency = "VES" | "USD" | "USDT" | "EUR";

export type CashAccount = {
    id: number; name: string; kind: string; kind_label: string; currency: CashCurrency; agency_id: number | null;
    opening_balance: number | null; opening_date: string; is_active: boolean; notes: string | null; movements: number;
    balance: number; balance_usd: number | null; approximate: boolean; pending: number; not_found: number; not_found_count: number;
    methods: { id: number; name: string; method: string }[];
};

export type CashCompanyAccount = {
    id: number; name: string; method: string; method_label: string; currency: string; is_active: boolean; statement_source: string | null;
    financial_account_id: number | null;
};

/** §46 y §48: el tablero de la caja. Todo en USD aproximado (los Bs con la tasa de Binance). */
export type UpcomingPayment = {
    type: "payable" | "recurring"; date: string | null; payee: string; description: string; amount: number; currency: Currency; amount_usd: number;
    overdue: boolean; payable_id: number | null; closure_id: number | null; recurring_id: number | null;
};
export type CashDashboard = {
    from: string; to: string; binance_rate: number | null; available_usd: number; agencies_usd: number; receivable_usd: number; other_receivable_usd: number;
    payable_usd: number; payable_overdue_usd: number; inflow_usd: number; outflow_usd: number;
    inflow_by_kind: { kind: string; label: string; usd: number }[]; outflow_by_kind: { kind: string; label: string; usd: number }[];
    upcoming: UpcomingPayment[]; upcoming_usd: number; upcoming_days: number; inventory_capital_usd: number; recurring_soon_usd: number;
};

// Reportes (entrega 4; §53 a §58, §80, R18)
export type ReportType = "daily" | "weekly" | "monthly" | "custom";
export type ReportChange = { key: string; label: string; before: number | string | null; after: number | string | null };
export type ReportSummary = Record<string, number | string | null>;
/** "Beneficio operativo: $1.200,00 → $1.170,00" (§21: qué cambió entre versiones). */
export const changeText = (c: ReportChange) => {
    const show = (v: ReportChange["before"]) => (c.key === "status" || c.key.startsWith("orders_") ? String(v ?? "—") : money(Number(v)));
    return `${c.label}: ${show(c.before)} → ${show(c.after)}`;
};
export type FinancialReportRow = {
    id: number; type: ReportType; type_label: string; title: string; from: string; to: string; trigger: "auto" | "manual"; created_by: string | null;
    version: number | null; versions: number | null; status: "PROVISIONAL" | "CONSOLIDADO" | null; summary: ReportSummary | null; changes: ReportChange[] | null;
    reason: string | null; generated_at: string | null; whatsapp_sent_at: string | null; whatsapp_result: { to: string; ok: boolean; error?: string }[] | null;
};
export type ReportVersion = {
    id: number; version: number; status: string; summary: ReportSummary; changes: ReportChange[] | null; reason: string; generated_by: string | null;
    generated_at: string; whatsapp_sent_at: string | null; whatsapp_result: { to: string; ok: boolean; error?: string }[] | null;
};
export type ReportContent = {
    from: string; to: string; days: number; generated_at: string; status: PnlReport["status"]; company: CompanyLevels;
    previous: { from: string; to: string; company: CompanyLevels }; warnings: string[]; cash: CashDashboard;
    transport: { trips: number; total_usd: number; units: number };
    closures_pending: { agency: string | null; from: string; to: string; status: string }[];
};
export type ReportsConfig = {
    daily: { enabled: boolean; lag_days: number; time: string };
    weekly: { enabled: boolean; weekday: number; time: string };
    monthly: { enabled: boolean; day: number; time: string };
    whatsapp: { enabled: boolean; to: string[]; template: string | null; language: string; types: ReportType[] };
};
export type ReportsResponse = {
    reports: FinancialReportRow[]; page: number; last_page: number; types: Record<ReportType, string>; config: ReportsConfig;
    next: Record<"daily" | "weekly" | "monthly", { from: string; to: string } | null>;
};

/** §77: un reembolso cuyo método no dice de qué cuenta salió (efectivo, "Otro"): lo dice el Admin. */
export type RefundWithoutAccount = { id: number; order_id: number; order: string | null; amount_usd: number; method: string | null; refunded_at: string };

export type CashResponse = {
    start_date: string; binance_rate: number; accounts: CashAccount[];
    totals: { available_usd: number; agencies_usd: number; pending_usd: number; not_found_usd: number; not_found_count: number; without_opening: number };
    company_accounts: CashCompanyAccount[];
    warnings: { unlinked: string[]; items_without_account: number; refunds_without_account: RefundWithoutAccount[] };
    kinds: Record<string, string>; currencies: CashCurrency[]; transaction_kinds: Record<string, string>; statuses: Record<string, string>;
    movement_kinds: Record<string, string>;
};

export type CashTransaction = {
    id: number; date: string; account_id: number; account: string | null; kind: string; kind_label: string; description: string | null;
    amount: number; currency: CashCurrency; rate: number; amount_usd: number; status: "confirmed" | "pending" | "not_found"; status_label: string;
    order_id: number | null; order_name: string | null; source_type: string; source_id: number;
    voided_at: string | null; void_reason: string | null; created_at: string | null;
    movement: { id: number; kind: string; kind_label: string; reference: string | null; has_receipt: boolean; voided: boolean } | null;
};

export type CashTransactionsResponse = {
    inflow_usd: number; outflow_usd: number; total: number; page: number; last_page: number; transactions: CashTransaction[];
};

/** Un monto en la moneda de una cuenta de la caja, con signo: "−Bs 210,00", "25,00 USDT", "$35,00" o "€10,00". */
export const cashAmount = (amount: number, currency: CashCurrency) => {
    const n = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    const sign = amount < 0 ? "−" : "";
    return currency === "VES" ? `${sign}Bs ${n}` : currency === "USDT" ? `${sign}${n} USDT` : currency === "EUR" ? `${sign}€${n}` : `${sign}$${n}`;
};

export const CASH_CURRENCY_LABEL: Record<CashCurrency, string> = { VES: "Bolívares (Bs)", USD: "Dólares (USD)", USDT: "USDT", EUR: "Euros (EUR)" };

// ---- Agencias (entrega 3c; §43, §101 a §104, R16) ----
export type AgencyClosureSummary = {
    id: number; period_start: string; period_end: string; status: string; status_label: string; provisional: number; approved: number | null;
    paid_at: string | null; payment_amount: number | null; payment_method: string | null;
};

export type AgencyCashRow = {
    id: number; name: string; color: string | null; cash_usd: number; owed_usd: number;
    cash: { account_id: number; currency: CashCurrency; balance: number; balance_usd: number | null; opening_balance: number | null }[];
    payables: { id: number; description: string; amount: number; paid: number; balance: number; issued_at: string; status: PayableStatus; closure_id: number | null }[];
    closures: AgencyClosureSummary[];
};
