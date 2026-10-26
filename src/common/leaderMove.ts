/** Estados en que el pedido sigue en manos de la vendedora (BulkReassignService::REASSIGNABLE_STATUSES). */
const MOVABLE_STATUSES = [
    "Nuevo", "Asignado a vendedor", "Llamado 1", "Llamado 2", "Llamado 3", "Esperando Ubicacion",
    "Programado para mas tarde", "Programado para otro dia", "Reprogramado para hoy", "Cambio de ubicacion",
    "Novedades", "Sin Stock",
];

/** Si la Líder puede pasar este pedido: los entregados, cancelados o en manos de la agencia, no. */
export const leaderCanMove = (status?: string | null) =>
    !!status && MOVABLE_STATUSES.some((s) => s.toLowerCase() === status.toLowerCase());
