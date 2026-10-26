// src/pages/lite/LiteOrderCards.tsx
// Las órdenes de la vista simple en el teléfono: una tarjeta por orden en vez de la tabla, que no cabía y
// hacía que la página se moviera de lado (2026-10-03). También las piezas que comparte con la tabla.
import React from "react";
import { Box, Button, Chip, CircularProgress, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { WhatsApp } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import { statusColors } from "../../components/orders/OrderItem";
import { OrderTimer } from "../../components/orders/OrderTimer";
import { PhoneActionMenu } from "../../components/orders/PhoneActionMenu";
import { orderNo } from "../../lib/functions";

/* eslint-disable @typescript-eslint/no-explicit-any -- las órdenes llegan del API sin tipo, igual que en la tabla */

/** Botón redondo que abre el chat de WhatsApp de la orden, con los mensajes sin leer. */
export const WhatsAppBubble: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => (
    <Tooltip title={count > 0 ? `${count} mensajes sin leer` : "Abrir chat de WhatsApp"}>
        <Box
            component="button"
            type="button"
            aria-label={count > 0 ? `Abrir WhatsApp, ${count} mensajes sin leer` : "Abrir WhatsApp"}
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onClick();
            }}
            sx={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, p: 0, border: 0, borderRadius: "50%", cursor: "pointer", position: "relative",
                bgcolor: count > 0 ? "#25D366" : "rgba(128, 128, 128, 0.1)",
                color: count > 0 ? "#fff" : "rgba(128, 128, 128, 0.6)",
                transition: "background-color 0.2s",
                "&:hover": { bgcolor: count > 0 ? "#128C7E" : "rgba(128, 128, 128, 0.2)" },
                animation: count > 0 ? "pulse-whatsapp 2s infinite" : "none",
                "@keyframes pulse-whatsapp": {
                    "0%": { boxShadow: "0 0 0 0 rgba(37, 211, 102, 0.4)" },
                    "70%": { boxShadow: "0 0 0 10px rgba(37, 211, 102, 0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(37, 211, 102, 0)" },
                },
            }}
        >
            <WhatsApp sx={{ fontSize: "1.05rem" }} />
            {count > 0 && (
                <Box sx={{
                    position: "absolute", top: -5, right: -5, bgcolor: "#ef5350", color: "white", borderRadius: "50%",
                    minWidth: 15, height: 15, fontSize: "0.65rem", fontWeight: "bold", display: "flex",
                    alignItems: "center", justifyContent: "center", border: "1px solid white", px: 0.3,
                }}>
                    {count}
                </Box>
            )}
        </Box>
    </Tooltip>
);

const SCHEDULED = ["Programado para mas tarde", "Reprogramado para hoy", "Programado para otro dia", "Reprogramado"];

/** Novedad, fecha programada, stock en otra agencia y el reloj de la orden. */
export const OrderStatusInfo: React.FC<{ order: any; onOpenDetail: () => void }> = ({ order, onOpenDetail }) => {
    const status = order.status?.description || "";
    const scheduled = order.scheduled_for ? new Date(order.scheduled_for) : null;
    const isToday = scheduled && scheduled.toLocaleDateString() === new Date().toLocaleDateString();
    return (
        <>
            {order.novedad_type && (
                <Typography variant="caption" display="block" color="error" sx={{ mt: 0.5, fontWeight: "bold" }}>
                    ⚠️ {order.novedad_type}
                </Typography>
            )}
            {scheduled && SCHEDULED.includes(status) && (
                <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5, fontWeight: "bold" }}>
                    📅 {isToday
                        ? `Hoy ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : scheduled.toLocaleDateString([], { day: "2-digit", month: "2-digit" })}
                </Typography>
            )}
            {status === "Sin Stock" && Array.isArray(order.stock_elsewhere) && order.stock_elsewhere.length > 0 && (
                <Tooltip title={`Disponible en: ${order.stock_elsewhere.map((w: any) => w.city_name ? `Agencia: ${w.city_name}` : (w.warehouse_name || "Almacén")).join(", ")}. Abre la orden para reasignar la agencia.`}>
                    <Typography
                        variant="caption"
                        display="block"
                        onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
                        sx={{ mt: 0.5, fontWeight: "bold", color: "success.main", cursor: "pointer" }}
                    >
                        📦 Hay stock en otra agencia
                    </Typography>
                </Tooltip>
            )}
            <Box sx={{ mt: 0.5 }}>
                <OrderTimer
                    receivedAt={status === "Novedades" ? order.updated_at : order.received_at}
                    deliveredAt={status === "Entregado" ? (order.processed_at || order.updated_at) : null}
                    status={status}
                />
            </Box>
        </>
    );
};

export const StatusChip: React.FC<{ status?: string }> = ({ status }) => (
    <Chip
        label={status}
        size="small"
        sx={{ bgcolor: statusColors[status ?? ""] || grey[500], color: "white", fontWeight: "bold", fontSize: "0.7rem", maxWidth: "100%" }}
    />
);

interface CardsProps {
    orders: any[];
    loading: boolean;
    hasMore: boolean;
    userId: number;
    showWhatsApp: boolean;
    onOpen: (order: any, tab?: string) => void;
    onLoadMore: () => void;
}

export const LiteOrderCards: React.FC<CardsProps> = ({ orders, loading, hasMore, userId, showWhatsApp, onOpen, onLoadMore }) => (
    <Stack spacing={1.25}>
        {orders.map((order) => (
            <Paper
                key={order.id}
                elevation={0}
                sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
            >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{orderNo(order.name)}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {order.client?.first_name} {order.client?.last_name}
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography variant="subtitle2" fontWeight="bold">{order.current_total_price} {order.currency}</Typography>
                        {(order.item_count || order.products?.length) > 0 && (
                            <Typography variant="caption" color="text.secondary">{order.item_count || order.products?.length} items</Typography>
                        )}
                    </Box>
                </Box>

                {order.agent && order.agent_id !== userId && (
                    <Chip size="small" variant="outlined" color="warning" label={`de ${order.agent.names}`} sx={{ height: 20, fontSize: "0.7rem", mt: 0.5 }} />
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                    <PhoneActionMenu phone={order.client?.phone} sx={{ fontSize: "0.8rem", fontWeight: "bold" }} />
                    {showWhatsApp && <WhatsAppBubble count={order.whatsapp_unread_count || 0} onClick={() => onOpen(order, "whatsapp")} />}
                </Box>

                <Box sx={{ mt: 1 }}>
                    <StatusChip status={order.status?.description} />
                    <OrderStatusInfo order={order} onOpenDetail={() => onOpen(order, "detail")} />
                </Box>

                <Button fullWidth variant="contained" size="medium" onClick={() => onOpen(order)} sx={{ mt: 1.5, borderRadius: 2, textTransform: "none", fontWeight: "bold" }}>
                    Gestionar
                </Button>
            </Paper>
        ))}

        {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }} aria-busy="true">
                <CircularProgress size={24} />
            </Box>
        )}
        {!loading && orders.length === 0 && (
            <Paper elevation={0} role="status" sx={{ py: 5, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
                <Typography color="text.secondary">No hay órdenes en esta bandeja</Typography>
            </Paper>
        )}
        {!loading && hasMore && orders.length > 0 && (
            <Button onClick={onLoadMore} size="small">Cargar más</Button>
        )}
    </Stack>
);
