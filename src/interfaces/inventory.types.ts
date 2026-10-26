// Inventory Module Type Definitions

export interface IWarehouse {
    id: number;
    warehouse_type_id: number;
    user_id?: number | null;
    code: string;
    name: string;
    description?: string;
    location?: string;
    is_active: boolean;
    is_main: boolean;
    warehouse_type?: IWarehouseType;
    user?: IUser;
    // Metrics
    total_products_unique?: number;
    total_items_stock?: number;
    created_at?: string;
    updated_at?: string;
}

export interface IWarehouseType {
    id: number;
    code: string;
    name: string;
    description?: string;
    is_physical: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface IInventory {
    id: number;
    warehouse_id: number;
    product_id: number;
    quantity: number;
    /** Incluidas en quantity: piezas retiradas en cambios, pendientes de revisión (no se venden). */
    defective_stock?: number;
    /** Tarea 4: stock de cada variante (talla, color) en este almacén */
    variants_stock?: IVariantStock[];
    /** Lo que el total tiene de más: stock cargado sin decir la variante */
    unassigned?: number;
    warehouse?: IWarehouse;
    product?: IProduct;
    created_at: string;
    updated_at: string;
}

/** Una variante del catálogo (tarea 4): una talla, un color o la combinación ("Negro / M"). */
export interface IProductVariant {
    id: number;
    product_id?: number;
    title: string;
    sku?: string | null;
    shopify_variant_id?: string | number | null;
    is_active: boolean;
}

/** Stock de una variante en un almacén. */
export interface IVariantStock {
    variant_id: number;
    title: string;
    is_active: boolean;
    quantity: number;
    defective_stock: number;
}

export interface IInventoryMovement {
    id: number;
    product_id: number;
    from_warehouse_id?: number | null;
    to_warehouse_id?: number | null;
    quantity: number;
    /** Tarea 4: la talla o variante que se movió (su nombre) */
    variant_id?: number | null;
    size?: string | null;
    movement_type: 'transfer' | 'in' | 'out' | 'adjustment';
    reference_type?: string | null;
    reference_id?: number | null;
    user_id?: number | null;
    notes?: string | null;
    product?: IProduct;
    from_warehouse?: IWarehouse;
    to_warehouse?: IWarehouse;
    user?: IUser;
    created_at: string;
    updated_at: string;
}

export interface IProduct {
    id: number;
    title: string;
    name?: string;
    showable_name?: string;
    sku?: string;
    price?: number;
    cost?: number;
    cost_usd?: number;
    image?: string;
    stock?: number;
    variants?: IProductVariant[];        // Tallas y variantes del producto (tarea 4)
    created_at?: string;
    updated_at?: string;
}

export interface IUser {
    id: number;
    names: string;
    surnames: string;
    email: string;
}

export interface IProductStock {
    product_id: number;
    product?: IProduct;
    warehouses: Array<{
        warehouse_id: number;
        warehouse_name: string;
        warehouse_code: string;
        quantity: number;
        variants_stock?: IVariantStock[]; // Stock por variante en este almacén (tarea 4)
        unassigned?: number;              // Cargado sin variante
        defective_stock?: number;         // Piezas defectuosas: están, pero no cuentan como disponibles
    }>;
    total_quantity: number;
}

export interface IInventoryFilters {
    warehouse_id?: number;
    product_id?: number;
    movement_type?: 'transfer' | 'in' | 'out' | 'adjustment';
    from_date?: string;
    to_date?: string;
    search?: string;
}

export interface IStockTransferRequest {
    product_id: number;
    from_warehouse_id: number;
    to_warehouse_id: number;
    quantity: number;
    notes?: string;
}

export interface IStockAdjustmentRequest {
    product_id: number;
    warehouse_id: number;
    quantity?: number;
    new_quantity?: number;
    notes?: string;
    reference_type?: string;
    reference_id?: number;
}

// ── Fase 5: Proveedores y Órdenes de Compra ──────────────────────────────────

export interface ISupplier {
    id: number;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    currency: 'USD' | 'VES';
    default_lead_time_days: number;
    notes?: string | null;
    is_active: boolean;
    purchase_orders_count?: number;
    created_at?: string;
    updated_at?: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export interface IPurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    product_id: number;
    product?: IProduct;
    quantity_ordered: number;
    quantity_received: number;
    pending_quantity: number;
    unit_cost_usd: number;
    unit_cost_ves: number;
    subtotal_usd: number;
    notes?: string | null;
}

export interface IPurchaseOrder {
    id: number;
    supplier_id: number;
    supplier?: ISupplier;
    warehouse_id: number;
    warehouse?: IWarehouse;
    created_by: number;
    reference_number: string;
    status: PurchaseOrderStatus;
    status_label: string;
    expected_at?: string | null;
    received_at?: string | null;
    total_usd: number;
    total_ves: number;
    notes?: string | null;
    items?: IPurchaseOrderItem[];
    items_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ICreatePurchaseOrderPayload {
    supplier_id: number;
    warehouse_id: number;
    expected_at?: string;
    notes?: string;
    items: Array<{
        product_id: number;
        quantity_ordered: number;
        unit_cost_usd?: number;
        unit_cost_ves?: number;
        notes?: string;
    }>;
}

export interface IReceiveItemsPayload {
    items: Array<{
        purchase_order_item_id: number;
        quantity_received: number;
    }>;
}
