export interface ICompanyAccountDetail {
    label: string;
    value: string;
}

export interface ICompanyAccount {
    id: number;
    name: string;
    icon: string | null;
    // Documento de Fran (Módulo 1, §2): el método, la moneda y el extracto donde se verifica cada cuenta
    method?: string | null;
    currency?: string | null;
    statement_source_id?: number | null;
    statement_source_name?: string | null;
    details: ICompanyAccountDetail[] | null;
    is_active: boolean;
    /** .60: recibe órdenes nuevas de pago móvil (pausarla sin desactivarla). */
    takes_orders?: boolean;
    /** .60: lo que lleva hoy una cuenta de pago móvil (solo lo ve administración). */
    today?: { orders: number; bs: number };
    created_at?: string;
    updated_at?: string;
}

/** .60: la cuenta de pago móvil de una orden (la que trae GET /orders/{id}). */
export interface IOrderPaymentAccount {
    id: number;
    name: string;
    details: ICompanyAccountDetail[];
    is_active: boolean;
}

export interface ICompanyAccountOptions {
    methods: Record<string, string>;
    currencies: string[];
    sources: string[];
}
