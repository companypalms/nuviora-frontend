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
    created_at?: string;
    updated_at?: string;
}

export interface ICompanyAccountOptions {
    methods: Record<string, string>;
    currencies: string[];
    sources: string[];
}
