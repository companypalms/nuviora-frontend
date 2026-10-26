export interface UserType {
    id: number;
    names: string;
    surnames: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
    delivery_cost?: string | number;
    is_lite_view?: boolean;
    can_handle_no_stock?: boolean;
}
