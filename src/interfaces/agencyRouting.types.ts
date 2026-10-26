/** Varias agencias por ciudad (tareas 3c, 6 y 8). Ver AgencyRoutingController en el backend. */

export type RoutingAgency = {
    id: number;
    names: string;
    color?: string | null;
    /** Tarifa por carrera (USD). */
    delivery_cost: number;
    /** null = sin tope. */
    max_active_orders: number | null;
    /** Órdenes en Asignar a agencia, Asignar/Asignado a repartidor o En ruta. */
    active: number;
    full: boolean;
    cities: string[];
} & WorkingHoursFields;

/** Encendida o apagada (Fran, 2026-10-17). */
export type WorkingFields = {
    is_working: boolean;
    /** Por qué no trabaja ahora (apagada, fuera de horario o sin agencia que trabaje); null si trabaja. */
    stop_reason: string | null;
};

/** Y el horario, que es de cada agencia (Fran, 2026-10-17, 10:54). Sin horario = todo el día. */
export type WorkingHoursFields = WorkingFields & {
    /** HH:MM o null. */
    works_from: string | null;
    works_until: string | null;
};

export type CityAgency = {
    id: number;
    names: string;
    color?: string | null;
    /** % en esta ciudad; null = reparto parejo. */
    weight: number | null;
    is_active: boolean;
    /** Parte que le toca hoy entre las activas (0 a 1). */
    share: number;
    active: number;
    max_active_orders: number | null;
};

export type RoutingCity = {
    id: number;
    name: string;
    delivery_cost_usd: number;
    /** Órdenes esperando porque todas sus agencias están llenas. */
    pending: number;
    agencies: CityAgency[];
    /** Órdenes que no pasaron a vendedora porque la ciudad no trabajaba y esperan que vuelva. */
    waiting: number;
} & WorkingFields;

export type AgencyRouting = {
    agencies: RoutingAgency[];
    cities: RoutingCity[];
};
