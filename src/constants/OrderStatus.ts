import { blue, green, grey, orange, purple, red, yellow } from "@mui/material/colors";

/**
 * Centralized Order Status Constants
 * Should match App\Constants\OrderStatus in the backend.
 */
export const ORDER_STATUS = {
    NUEVO: "Nuevo",
    ASIGNADO_VENDEDOR: "Asignado a vendedor",
    ASIGNADO_REPARTIDOR: "Asignado a repartidor",
    LLAMADO_1: "Llamado 1",
    LLAMADO_2: "Llamado 2",
    LLAMADO_3: "Llamado 3",
    CONFIRMADO: "Confirmado",
    ENTREGADO: "Entregado",
    EN_RUTA: "En ruta",
    PROGRAMADO_MAS_TARDE: "Programado para mas tarde",
    PROGRAMADO_OTRO_DIA: "Programado para otro dia",
    REPROGRAMADO: "Reprogramado",
    REPROGRAMADO_PARA_HOY: "Reprogramado para hoy",
    CAMBIO_UBICACION: "Cambio de ubicacion",
    RECHAZADO: "Rechazado",
    CANCELADO: "Cancelado",
    PENDIENTE_CANCELACION: "Pendiente Cancelación",
    POR_APROBAR_ENTREGA: "Por aprobar entrega",
    POR_APROBAR_UBICACION: "Por aprobar cambio de ubicacion",
    POR_APROBAR_RECHAZO: "Por aprobar rechazo",
    ASIGNAR_AGENCIA: "Asignar a agencia",
    ESPERANDO_UBICACION: "Esperando Ubicacion",
    SIN_STOCK: "Sin Stock",
    NOVEDADES: "Novedades",
    NOVEDAD_SOLUCIONADA: "Novedad Solucionada",
};

/**
 * Standard Status Color Map
 */
export const STATUS_COLORS: Record<string, string> = {
    [ORDER_STATUS.NUEVO]: purple[400],
    [ORDER_STATUS.ASIGNADO_VENDEDOR]: blue[500],
    [ORDER_STATUS.ASIGNADO_REPARTIDOR]: blue[700],
    [ORDER_STATUS.LLAMADO_1]: orange[400],
    [ORDER_STATUS.LLAMADO_2]: orange[600],
    [ORDER_STATUS.LLAMADO_3]: orange[800],
    [ORDER_STATUS.CONFIRMADO]: green[600],
    [ORDER_STATUS.ENTREGADO]: green[700],
    [ORDER_STATUS.EN_RUTA]: blue[900],
    [ORDER_STATUS.PROGRAMADO_MAS_TARDE]: yellow[600],
    [ORDER_STATUS.PROGRAMADO_OTRO_DIA]: yellow[800],
    [ORDER_STATUS.REPROGRAMADO]: yellow[900],
    [ORDER_STATUS.REPROGRAMADO_PARA_HOY]: yellow[900],
    [ORDER_STATUS.CAMBIO_UBICACION]: grey[500],
    [ORDER_STATUS.RECHAZADO]: red[600],
    [ORDER_STATUS.CANCELADO]: red[800],
    [ORDER_STATUS.PENDIENTE_CANCELACION]: red[400],
    [ORDER_STATUS.POR_APROBAR_ENTREGA]: yellow[700],
    [ORDER_STATUS.POR_APROBAR_UBICACION]: yellow[800],
    [ORDER_STATUS.POR_APROBAR_RECHAZO]: orange[900],
    [ORDER_STATUS.ASIGNAR_AGENCIA]: blue[400],
    [ORDER_STATUS.ESPERANDO_UBICACION]: purple[300],
    [ORDER_STATUS.SIN_STOCK]: grey[700],
    [ORDER_STATUS.NOVEDADES]: orange[500],
    [ORDER_STATUS.NOVEDAD_SOLUCIONADA]: green[500],
};
