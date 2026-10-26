
import { orderNo } from "../lib/functions";

/** Carreras de las agencias (tarea 5): nombres para mostrar y filas para Excel. */

export type AgencyTrip = {
    id: number;
    order_id: number;
    order_name?: string;
    agency_name?: string;
    deliverer_name?: string | null;
    type: string;
    type_label: string;
    result: string | null;
    result_label: string;
    price_usd: number;
    trip_date: string;
    started_at: string;
    closed_at: string | null;
    voided_at: string | null;
    voided_by?: string | null;
    void_reason?: string | null;
};

/** Fila de carrera en la liquidación (sale de las ganancias de la agencia en el período). */
export type SettlementTrip = {
    trip_id: number | null;
    order_id: number;
    order_name: string;
    trip_date: string;
    type: string;
    result: string | null;
    amount_usd: number;
};

export const TRIP_TYPES: Record<string, string> = { normal: 'Entrega', reentrega: 'Re-entrega', cambio: 'Cambio' };

export const TRIP_RESULTS: Record<string, string> = {
    entregado: 'Entregado',
    novedad: 'Novedad',
    rechazado: 'Rechazado',
    cancelado: 'Cancelado',
    otro: 'Otro',
    anterior: 'Registro anterior',
    en_curso: 'En curso',
};

export const tripResultLabel = (r: string | null | undefined) => TRIP_RESULTS[r ?? 'en_curso'] ?? r ?? 'En curso';

export const tripResultColor = (r: string | null | undefined): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    if (r === 'entregado') return 'success';
    if (r === 'novedad') return 'warning';
    if (r === 'rechazado' || r === 'cancelado') return 'error';
    if (!r) return 'info';
    return 'default';
};

export const tripSheetRows = (trips: SettlementTrip[]) => trips.map((t) => ({
    Fecha: t.trip_date,
    Orden: `${orderNo(t.order_name)}`,
    Tipo: TRIP_TYPES[t.type] ?? t.type,
    Resultado: tripResultLabel(t.result),
    'Monto USD': t.amount_usd,
}));
