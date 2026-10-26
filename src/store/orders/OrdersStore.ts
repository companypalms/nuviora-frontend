import { create } from "zustand";
import { sendOrderStatus } from "../../common/orderStatus";
import { toast } from "react-toastify";

// Estructura de cada columna
interface ColumnState {
    id: string; // "Nuevo", "Asignado a vendedor", etc.
    items: any[];
    page: number;
    hasMore: boolean;
    isLoading: boolean;
    total: number;
}

interface OrdersState {
    // Mapa de columnas: key = status description
    columns: Record<string, ColumnState>;

    // Estado global
    selectedOrder: any | null;
    selectedAgentId: number | null;
    searchTerm: string;
    filters: {
        city_id: string;
        agency_id: string;
        seller_id: string;
        date_from: string;
        date_to: string;
        /** 'group': la Líder ve las órdenes de su grupo (el servidor lo valida). */
        scope: '' | 'group';
    };
    refreshSignal: number;
    activeModal: {
        type: "assign_agent" | "assign_deliverer" | "postpone" | "assign_agency" | "novelty" | "resolve_novelty" | "mark_delivered" | "order_details" | null;
        data?: any;
    };
    initialTabId: string;
    incomingWhatsappMessage: any | null;



    // Actions
    setFilters: (filters: Partial<OrdersState['filters']>) => void;
    setColumnsOrder: (status: string, orders: any[], isAppend?: boolean, hasMore?: boolean, total?: number) => void;
    setColumnLoading: (status: string, loading: boolean) => void;

    updateOrderInColumns: (order: any) => void; // Para realtime updates o ediciones
    moveOrder: (orderId: number, fromStatus: string, toStatus: string, orderData: any) => void; // Optimistic UI

    setSelectedOrder: (order: any | null, initialTab?: string) => void;
    setInitialTabId: (id: string) => void;
    setIncomingWhatsappMessage: (msg: any) => void;

    setSelectedAgentId: (id: number | null) => void;
    setSearchTerm: (term: string) => void;
    setRefreshSignal: (signal: number) => void;
    setActiveModal: (type: OrdersState['activeModal']['type'], data?: any) => void;
    setBulkColumns: (data: Record<string, { items: any[], total: number }>) => void;
    changeStatus: (orderId: number, status: string, extraData?: any) => Promise<boolean>;
    registerNovelty: (orderId: number, type: string, description: string) => Promise<boolean>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    columns: {},
    selectedOrder: null,
    selectedAgentId: null,
    searchTerm: "",
    filters: {
        city_id: '',
        agency_id: '',
        seller_id: '',
        date_from: '',
        date_to: '',
        scope: ''
    },
    refreshSignal: 0,
    activeModal: { type: null },
    initialTabId: 'detail',
    incomingWhatsappMessage: null,



    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),

    setColumnsOrder: (status, orders, isAppend = false, hasMore = true, total = 0) =>
        set((state) => {
            const currentCol = state.columns[status] || { id: status, items: [], page: 1, hasMore: true, isLoading: false, total: 0 };

            // Deduplicación simple
            const existingIds = new Set(isAppend ? currentCol.items.map(o => o.id) : []);
            const newItems = isAppend
                ? orders.filter(o => !existingIds.has(o.id))
                : orders;

            const nextItems = isAppend ? [...currentCol.items, ...newItems] : orders; // Si no es append, reemplaza todo

            return {
                columns: {
                    ...state.columns,
                    [status]: {
                        ...currentCol,
                        items: nextItems,
                        page: isAppend ? currentCol.page + 1 : 1, // Si es replace, reset page to 1? Ojo aqui
                        hasMore: hasMore,
                        isLoading: false,
                        total: total || (isAppend ? currentCol.total : orders.length)
                    }
                }
            };
        }),

    setColumnLoading: (status, loading) =>
        set((state) => {
            const currentCol = state.columns[status] || { id: status, items: [], page: 1, hasMore: true, isLoading: false, total: 0 };
            return {
                columns: {
                    ...state.columns,
                    [status]: { ...currentCol, isLoading: loading }
                }
            };
        }),

    updateOrderInColumns: (order) =>
        set((state) => {
            const newCols = { ...state.columns };
            const newStatus = order.status?.description; // Estatus actualizado
            let moved = false;
            let updated = false;

            // 1. Buscar order en todas las columnas
            Object.keys(newCols).forEach(colKey => {
                const col = newCols[colKey];
                const idx = col.items.findIndex(o => o.id === order.id);

                if (idx !== -1) {
                    // Encontramos la orden en la columna 'colKey'

                    // Caso A: El status cambió y ya no pertenece a esta columna
                    if (newStatus && newStatus !== colKey) {
                        // Remover de esta columna
                        const newItems = col.items.filter(o => o.id !== order.id);
                        newCols[colKey] = { ...col, items: newItems };
                        moved = true; // Marcamos para insertar en la nueva
                    }
                    // Caso B: El status sigue igual (o es update parcial sin cambio de columna)
                    else {
                        const newItems = [...col.items];
                        newItems[idx] = { ...newItems[idx], ...order };
                        newCols[colKey] = { ...col, items: newItems };
                        updated = true;
                    }
                }
            });

            // 2. Si se movió (se quitó de la vieja), hay que intentar ponerla en la nueva
            // O SI ES NUEVA EN EL BOARD (no estaba en ningún lado antes, ej: asignación inicial)
            if ((moved || !updated) && newStatus) {
                // Si la columna destino existe en memoria, la agregamos
                if (newCols[newStatus]) {
                    // Insertar al principio para feedback inmediato
                    const targetItems = [order, ...newCols[newStatus].items];
                    // Validar unicidad por si acaso (aunque acabamos de limpiar)
                    const uniqueItems = Array.from(new Map(targetItems.map(item => [item.id, item])).values());

                    // Ordenar por updated_at descendente para mantener consistencia
                    uniqueItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

                    newCols[newStatus] = {
                        ...newCols[newStatus],
                        items: uniqueItems
                    };
                }
                // Si no existe la columna destino en memoria (ej. no scrolleada aun), no hacemos nada, 
                // cuando el usuario vaya allá, se cargará.
            }

            // 3. Tambien actualizar selectedOrder si es el mismo
            const newSelected = state.selectedOrder?.id === order.id
                ? { ...state.selectedOrder, ...order }
                : state.selectedOrder;

            return { columns: newCols, selectedOrder: newSelected };
        }),

    moveOrder: (orderId, fromStatus, toStatus, orderData) =>
        set((state) => {
            const newCols = { ...state.columns };

            // 1. Remove from source
            if (newCols[fromStatus]) {
                newCols[fromStatus] = {
                    ...newCols[fromStatus],
                    items: newCols[fromStatus].items.filter(o => o.id !== orderId)
                };
            }

            // 2. Add to destination (al principio o ordenado por fecha)
            if (!newCols[toStatus]) {
                // Si la columna destino no está inicializada aún en el store
                newCols[toStatus] = { id: toStatus, items: [], page: 1, hasMore: true, isLoading: false, total: 0 };
            }

            // Asumimos que queremos verlo arriba de todo por ahora para feedback inmediato
            const targetItems = [orderData, ...newCols[toStatus].items];
            newCols[toStatus] = { ...newCols[toStatus], items: targetItems, total: newCols[toStatus].total + 1 };

            // Si venía de otra columna, bajar el anterior
            if (fromStatus && newCols[fromStatus]) {
                newCols[fromStatus] = { ...newCols[fromStatus], total: Math.max(0, newCols[fromStatus].total - 1) };
            }

            return { columns: newCols };
        }),

    setSelectedOrder: (order, initialTab) => set((state) => {
        const isNewOrder = order?.id !== state.selectedOrder?.id;
        let nextTabId = state.initialTabId;

        if (initialTab !== undefined) {
            nextTabId = initialTab;
        } else if (isNewOrder) {
            nextTabId = 'detail';
        }

        return {
            selectedOrder: order,
            initialTabId: nextTabId
        };
    }),
    setInitialTabId: (id) => set({ initialTabId: id }),
    setIncomingWhatsappMessage: (msg) => set({ incomingWhatsappMessage: msg }),


    setSelectedAgentId: (id) => set({ selectedAgentId: id }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    setRefreshSignal: (signal) => set({ refreshSignal: signal }),
    setActiveModal: (type, data) => set({ activeModal: { type, data } }),
    setBulkColumns: (data) =>
        set((state) => {
            const newColumns: Record<string, ColumnState> = { ...state.columns };
            if (!data || typeof data !== 'object') return { columns: state.columns };

            // 1. Reset all existing columns to empty state (prevents zombie cards when filtering)
            Object.keys(newColumns).forEach((status) => {
                newColumns[status] = {
                    ...newColumns[status],
                    items: [],
                    total: 0,
                    hasMore: false,
                    page: 1,
                    isLoading: false
                };
            });

            // 2. Fill with new data
            Object.keys(data).forEach((status) => {
                newColumns[status] = {
                    id: status,
                    items: data[status].items,
                    page: 1,
                    hasMore: data[status].total > data[status].items.length,
                    isLoading: false,
                    total: data[status].total,
                };
            });
            return { columns: newColumns };
        }),
    changeStatus: async (orderId, status, extraData = null) => {
        const body = new URLSearchParams();
        body.append("status", status);
        if (extraData) {
            Object.keys(extraData).forEach(key => {
                body.append(key, extraData[key]);
            });
        }

        try {
            const sent = await sendOrderStatus(orderId, body);
            if (!sent) return false; // ya hay un cambio de esta orden en camino (doble toque)
            const { ok, response } = sent;
            const data = await response.json();
            if (ok) {
                get().updateOrderInColumns(data.order);
                toast.success(data.message || `Estado actualizado a ${status} ✅`);
                return true;
            } else {
                toast.error(data.message || "Error al actualizar estado ❌");
                return false;
            }
        } catch (e) {
            console.error(e);
            toast.error("Error de conexión 🚨");
            return false;
        }
    },
    registerNovelty: async (orderId, type, description) => {
        const body = new URLSearchParams();
        body.append("status", "Novedades");
        body.append("novedad_type", type);
        body.append("novedad_description", description);

        try {
            const sent = await sendOrderStatus(orderId, body);
            if (!sent) return false;
            const { ok, response } = sent;
            const data = await response.json();
            if (ok) {
                get().setSelectedOrder(data.order);
                get().updateOrderInColumns(data.order);
                toast.success(`Novedad registrada: ${type} ✅`);
                return true;
            } else {
                toast.error(data.message || "No se pudo registrar la novedad ❌");
                return false;
            }
        } catch (e) {
            console.error(e);
            toast.error("Error de conexión 🚨");
            return false;
        }
    }
}));