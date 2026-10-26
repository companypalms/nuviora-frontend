// src/components/dashboard/admin/types.ts
// Lo que devuelve GET /dashboard (stats) y GET /orders/pending-vueltos, para el dashboard del Admin, el Gerente y el Master.

export type OrderRef = { id: number; name: string; current_total_price: number; created_at?: string; city_name?: string };

export interface DashboardStats {
    total_sales?: number;
    orders_sin_stock_count?: number;
    orders_sin_stock?: OrderRef[];
    unassigned_agency_count?: number;
    unassigned_agency_orders?: OrderRef[];
    inventory_deficit?: Array<{
        agency_id: number;
        agency_name: string;
        products: Array<{ name: string; current_stock: number; total_required: number }>;
    }>;
    low_stock_alerts?: Array<{
        warehouse_name: string;
        products: Array<{ name: string; quantity: number }>;
    }>;
    unassigned_city_count?: number;
    unassigned_city_orders?: OrderRef[];
    missing_cities_summary?: Record<string, number>;
    pending_reviews?: {
        rejections: number;
        locations: number;
    };
    orders_today?: {
        created?: number;
        delivered?: number;
        cancelled?: number;
        assigned?: number;
        pending?: number;
    };
    top_sellers?: Array<{ id: number; names: string; agent_orders_count: number }>;
    top_deliverers?: Array<{ id: number; names: string; deliverer_orders_count: number }>;
    sales_history?: Array<{ date: string; count: number }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending_route_orders?: Array<any>;

    // Los demás roles
    orders?: {
        assigned?: number;
        completed?: number;
        delivered?: number;
        cancelled?: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recent_orders?: Array<any>;
    earnings_breakdown?: {
        orders?: number;
        upsells?: number;
        upsell_count?: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending_vueltos?: Array<any>;
    earnings_usd?: number;
    earnings_local?: number;
    rule?: string;
    message?: string;
}

export interface PendingVuelto {
    id: number;
    name: string;
    change_amount: number;
    change_amount_company: number;
    change_method_company: string;
    client: { first_name: string; last_name: string };
    agency?: { names: string };
}
