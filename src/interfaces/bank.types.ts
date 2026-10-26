export interface IBank {
    id: number;
    name: string;
    code: string | null;
    active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface IPagoMovilData {
    cedula: string;
    bank_id: number | string;
    phone_prefix: string;
    phone_number: string;
}

export interface ITransferData {
    account_number: string;
    cedula: string;
    bank_id: number | string;
}

export interface IEmailChangeData {
    email: string;
}
