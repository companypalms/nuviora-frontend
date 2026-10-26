import {
    Avatar,
    Box,
    Chip,
    Dialog,
    Divider,
    Tooltip,
    useTheme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { NotificationsActiveRounded, WarningAmberRounded, HistoryRounded, ReplayRounded, WhatsApp } from "@mui/icons-material";

import React, { FC, useState } from "react";
import { darken } from "@mui/material/styles";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { sendOrderStatus } from "../../common/orderStatus";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { TypographyCustom } from "../custom";
import DenseMenu from "../ui/content/DenseMenu";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { PostponeOrderDialog } from "./PostponeOrderDialog";
import { AssignAgencyDialog } from "./AssignAgencyDialog";
import { NoveltyDialog } from "./NoveltyDialog";
import { ResolveNovedadDialog } from "./ResolveNovedadDialog";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { PhoneActionMenu } from "./PhoneActionMenu";
import { OrderTimer } from "./OrderTimer";
import { ORDER_STATUS, STATUS_COLORS } from "../../constants/OrderStatus";
import { usePermissions, ROLES } from "../../hooks/usePermissions";
import { grey, orange, red } from "@mui/material/colors";
import { orderNo } from "../../lib/functions";
import { glowBorder } from "../ui/surface/glow";

interface OrderItemProps {
    order: any;
}
export const statusColors = STATUS_COLORS;
export const OrderItem: FC<OrderItemProps> = ({ order }) => {
    const { isAdmin, isSupervisor, isAgent, isAgency, userRole } = usePermissions();

    const userStore = useUserStore();
    const { updateOrderInColumns, setSelectedOrder, setActiveModal } = useOrdersStore();
    const [pendingStatus, setPendingStatus] = useState<{ description: string } | null>(null);
    const [targetStatus, setTargetStatus] = useState<string>("");
    const [targetStatusId, setTargetStatusId] = useState<number>(0);

    const [orderProducts, setOrderProducts] = useState<any>([]);
    const [orderProductsEmpty, setOrderProductsEmpty] = useState<boolean>(false);
    const theme = useTheme();

    const handleOpen = () => {
        setSelectedOrder(order, 'detail');
    };

    const getProducts = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setOrderProductsEmpty(false);
        toast.info('Cargando productos...', { autoClose: 1000 });
        const { status, response }: IResponse = await request(`/order/${order.id}/products`, 'GET');
        if (status == 200) {
            const { products } = await response.json();
            console.log({ products })
            if (products.length === 0) {
                setOrderProductsEmpty(true);
            } else {
                setOrderProducts(products)
            }
        } else {
            setOrderProductsEmpty(true);
            toast.error('No se pudieron cargar los productos');
            console.log('error consultando products')
        }
    }
    const changeStatus = async (status: string, extraData: any = null) => {
        // Intercept postponing
        if (status === ORDER_STATUS.PROGRAMADO_OTRO_DIA || status === ORDER_STATUS.PROGRAMADO_MAS_TARDE) {
            setActiveModal('postpone', { ...order, targetStatus: status });
            return;
        }

        // Intercept Entregado to ask for cash details if needed
        if (status === ORDER_STATUS.ENTREGADO && !extraData) {
            const cashMethods = ['DOLARES_EFECTIVO', 'BOLIVARES_EFECTIVO', 'EUROS_EFECTIVO'];
            const needsCashInfo = order.payment_method === 'EFECTIVO' ||
                order.payments?.some((p: any) => cashMethods.includes(p.method));

            if (needsCashInfo) {
                setActiveModal('mark_delivered', { ...order, pendingStatus: { description: status } });
                return;
            }
        }

        if (status === ORDER_STATUS.ASIGNAR_AGENCIA && (!order.agency || !order.agency.id)) {
            // If agency is not assigned, open the assign agency dialog
            setActiveModal('assign_agency', order);
            return;
        }

        // Intercept Novedad Solucionada
        if (status.trim() === ORDER_STATUS.NOVEDAD_SOLUCIONADA && !extraData) {
            // ... (keeping validation logic)
            // Validations
            if (!order.location) {
                toast.error("Se requiere una ubicación para marcar como solucionada 📍");
                return;
            }
            if (!order.payments || order.payments.length === 0) {
                // Skip payment validation for return orders
                if (!order.is_return) {
                    toast.error("Se requieren métodos de pago registrados 💳");
                    return;
                }
            }
            // Check coverage/change
            const totalPaid = (order.payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
            const total = Number(order.current_total_price);

            // Allow a small margin of error for float comparisons
            if (totalPaid < total - 0.01) {
                toast.error(`El monto pagado ($${totalPaid.toFixed(2)}) es menor al total ($${total.toFixed(2)}). Debe cubrirse el total.`);
                return;
            }

            // Validate excess payment (change)
            if (totalPaid > total + 0.01) {
                if (!order.change_covered_by) {
                    toast.error("El monto pagado excede el total. Debe registrar quién cubre el vuelto (Agencia/Empresa) 💸");
                    return;
                }
            }

            setActiveModal('resolve_novelty', { ...order, pendingStatus: { description: status } });
            return;
        }

        if (status === ORDER_STATUS.NOVEDADES) {
            setActiveModal('novelty', { ...order, targetStatus: status });
            return;
        }

        // caso normal: actualizar status
        const body = new URLSearchParams();
        body.append("status", status);

        if (extraData) {
            Object.keys(extraData).forEach(key => {
                body.append(key, String(extraData[key]));
            });
        }

        try {
            const sent: IResponse | null = await sendOrderStatus(order.id, body);
            if (!sent) return; // ya hay un cambio de esta orden en camino (doble toque)
            const { status: ok, response } = sent;
            if (ok === 200) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success(data.message || `Orden ${orderNo(order.name)} actualizada a ${status} ✅`);
                setPendingStatus(null);
            } else {
                const errorData = await response.json();

                // 🔹 Fallback: Si el backend pide asignar agencia manualmente (aunque el front pensara que ya tenía)
                if (errorData.require_manual_agency) {
                    toast.info(errorData.message);
                    setActiveModal('assign_agency', order); // Changed from setOpenAssignAgency(true)
                    return;
                }

                toast.error(errorData.message || "No se pudo actualizar el estado ❌");
            }
        } catch {
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };

    const handleNoveltySubmit = async (type: string, description: string) => {
        const body = new URLSearchParams();
        body.append("status", targetStatus);
        body.append("novedad_type", type);
        body.append("novedad_description", description);

        try {
            const sent: IResponse | null = await sendOrderStatus(order.id, body);
            if (!sent) return;
            const { status: ok, response } = sent;
            if (ok) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success(`Novedad registrada: ${type} ✅`);
            } else {
                toast.error("No se pudo registrar la novedad ❌");
            }
        } catch {
            toast.error("Error en el servidor 🚨");
        }
    };

    const handleResolveNovedadConfirm = (resolution: string) => {
        if (pendingStatus) {
            changeStatus(pendingStatus.description, { novedad_resolution: resolution });
        }
    };

    return (
        <Box
            onClick={handleOpen}
            sx={{
                ...glowBorder(theme),
                p: 1.75,
                cursor: 'pointer',
                flexShrink: 0,
                background:
                    theme.palette.mode === "dark"
                        ? darken(userStore.user.color, 0.7)
                        : "#f7f7f8",
                borderRadius: 3,
                width: "100%",
                display: "flex",
                flexFlow: "column wrap",
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.18)'
                }
            }}
        >

            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', flex: 1 }}>
                    <TypographyCustom
                        variant="subtitle1"
                        fontWeight={"bold"}
                        sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '160px'
                        }}
                    >
                        Orden {order.name}
                    </TypographyCustom>
                    {order.has_stock_warning && (
                        <Tooltip title="Stock insuficiente en almacén">
                            <WarningAmberRounded sx={{ color: red[500], fontSize: '1.2rem', flexShrink: 0 }} />
                        </Tooltip>
                    )}
                </Box>
                <Box onClick={(e) => e.stopPropagation()}>
                    <DenseMenu data={order} changeStatus={changeStatus} />
                </Box>
            </Box>

            {/* 🔁 INDICADOR: Orden atendida en día anterior */}
            {(order.reset_count > 0) && (
                <Tooltip title={`Esta orden ya fue atendida ${order.reset_count} vez${order.reset_count > 1 ? 'es' : ''} en días anteriores sin éxito`}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mb: 1,
                        px: 1,
                        py: 0.4,
                        borderRadius: 2,
                        bgcolor: 'rgba(230, 81, 0, 0.12)',
                        border: '1px solid rgba(230, 81, 0, 0.3)',
                    }}>
                        <ReplayRounded sx={{
                            fontSize: '0.85rem',
                            color: orange[700],
                            animation: 'spin-once 0.5s ease',
                            '@keyframes spin-once': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                            }
                        }} />
                        <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: orange[700] }}>
                            Día anterior ({order.reset_count}x)
                        </Box>
                    </Box>
                </Tooltip>
            )}

            {/* 📦 INDICADOR: Sin Stock aquí pero disponible en otro almacén */}
            {order.status?.description === ORDER_STATUS.SIN_STOCK && Array.isArray(order.stock_elsewhere) && order.stock_elsewhere.length > 0 && (
                <Tooltip title={`Disponible en: ${order.stock_elsewhere.map((w: any) => w.city_name ? `Agencia: ${w.city_name}` : (w.warehouse_name || 'Almacén')).join(', ')}. Reasigna la agencia para continuar.`}>
                    <Box
                        onClick={(e) => { e.stopPropagation(); setActiveModal('assign_agency', order); }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 1,
                            px: 1,
                            py: 0.4,
                            borderRadius: 2,
                            cursor: 'pointer',
                            bgcolor: 'rgba(46, 125, 50, 0.12)',
                            border: '1px solid rgba(46, 125, 50, 0.35)',
                        }}
                    >
                        <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'success.main' }}>
                            📦 Hay stock en otra agencia
                        </Box>
                    </Box>
                </Tooltip>
            )}

            <Box onClick={handleOpen} sx={{ cursor: "pointer" }}>
                <TypographyCustom
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{
                        maxWidth: "200px",   // 🔹 ajusta el ancho máximo permitido
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {order.client?.first_name} {order.client?.last_name}
                </TypographyCustom>
                {order.client?.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneActionMenu
                            phone={order.client.phone}
                            sx={{
                                maxWidth: "200px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        />
                        {!isAgency && (
                            <Tooltip title={order.whatsapp_unread_count > 0 ? `${order.whatsapp_unread_count} mensajes sin leer` : "Abrir Chat WhatsApp"}>
                                <Box
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrder(order, 'whatsapp');
                                    }}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        bgcolor: order.whatsapp_unread_count > 0 ? '#25D366' : 'rgba(128, 128, 128, 0.1)',
                                        color: order.whatsapp_unread_count > 0 ? '#fff' : 'rgba(128, 128, 128, 0.5)',
                                        '&:hover': {
                                            bgcolor: order.whatsapp_unread_count > 0 ? '#128C7E' : 'rgba(128, 128, 128, 0.2)',
                                            transform: 'scale(1.2)'
                                        },
                                        position: 'relative',
                                        animation: order.whatsapp_unread_count > 0 ? 'pulse-whatsapp 2s infinite' : 'none',
                                        '@keyframes pulse-whatsapp': {
                                            '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(37, 211, 102, 0.4)' },
                                            '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 10px rgba(37, 211, 102, 0)' },
                                            '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(37, 211, 102, 0)' },
                                        }
                                    }}
                                >
                                    <WhatsApp sx={{ fontSize: '1rem' }} />
                                    {order.whatsapp_unread_count > 0 && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: -5,
                                            right: -5,
                                            bgcolor: '#ef5350',
                                            color: 'white',
                                            borderRadius: '50%',
                                            minWidth: 14,
                                            height: 14,
                                            fontSize: '0.65rem',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid white',
                                            px: 0.3
                                        }}>
                                            {order.whatsapp_unread_count}
                                        </Box>
                                    )}
                                </Box>
                            </Tooltip>
                        )}


                    </Box>
                )}

                <TypographyCustom
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{
                        maxWidth: "200px",   // 🔹 ajusta el ancho máximo permitido
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {order.client?.city}
                </TypographyCustom>
                <TypographyCustom variant="subtitle2">
                    {order.current_total_price} {order.currency}
                </TypographyCustom>
                {order.agency && (
                    <TypographyCustom variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block' }}>
                        Agencia: {isAgent ? 'Asignada' : order.agency?.names}
                    </TypographyCustom>
                )}
                {order.novedad_type && (
                    <TypographyCustom variant="caption" sx={{ color: order.status.description === ORDER_STATUS.NOVEDAD_SOLUCIONADA ? 'green' : 'orange', fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                        {order.status.description === ORDER_STATUS.NOVEDAD_SOLUCIONADA ? 'Resuelta: ' : 'Novedad: '} {order.novedad_type}
                    </TypographyCustom>
                )}
                {isSupervisor && order.shop && (
                    <TypographyCustom variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        Tienda: <b>{order.shop.name}</b>
                    </TypographyCustom>
                )}

                <Divider sx={{ marginBlock: 2 }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                    <Chip
                        label={order.status.description}
                        size="small"
                        sx={{
                            backgroundColor: statusColors[order.status.description] || grey[400],
                            color: "#fff",
                            fontWeight: "bold",
                            maxWidth: 140,
                            '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }
                        }}
                    />
                    {isSupervisor ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Avatar
                                sx={{ width: 30, height: 30, cursor: "pointer", color: (theme) => theme.palette.getContrastText(order.agent?.color ?? '#4e4e4eff'), background: order.agent?.color ?? '#4e4e4eff' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveModal('assign_agent', order);
                                }}
                            >
                                {order.agent?.names ? (
                                    order.agent.names.charAt(0)
                                ) : (
                                    <AddRoundedIcon />
                                )}
                            </Avatar>
                            <Box
                                sx={{ width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: '50%', bgcolor: grey[300] }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveModal('assign_deliverer', order);
                                }}
                            >
                                <AddRoundedIcon sx={{ color: grey[500] }} />
                            </Box>
                        </Box>
                    ) : (
                        <Avatar
                            sx={{ width: 30, height: 30, color: (theme) => theme.palette.getContrastText(order.agent?.color ?? '#4e4e4eff'), background: order.agent?.color ?? '#4e4e4eff' }}
                        >
                            {order.agent?.names ? (
                                order.agent.names.charAt(0)
                            ) : (
                                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: grey[300] }}>
                                    <AddRoundedIcon sx={{ color: grey[500] }} />
                                </Box>
                            )}
                        </Avatar>
                    )}
                </Box>
                {order.reminder_at && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                        <TypographyCustom variant="caption" sx={{
                            color: new Date(order.reminder_at) < new Date() ? 'error.main' : 'info.main',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                        }}>
                            <NotificationsActiveRounded fontSize="small" sx={{
                                animation: new Date(order.reminder_at) < new Date() ? 'pulse 1.5s infinite' : 'none',
                                '@keyframes pulse': {
                                    '0%': { transform: 'scale(1)' },
                                    '50%': { transform: 'scale(1.2)' },
                                    '100%': { transform: 'scale(1)' },
                                }
                            }} />
                            R: {new Date(order.reminder_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TypographyCustom>
                    </Box>
                )}

                {order.received_at && (
                    <Box sx={{ mt: 1 }}>
                        <OrderTimer
                            receivedAt={order.status.description === ORDER_STATUS.NOVEDADES ? order.updated_at : order.received_at}
                            deliveredAt={order.status.description === ORDER_STATUS.ENTREGADO ? (order.processed_at || order.updated_at) : null}
                            status={order.status.description}
                        />
                    </Box>
                )}

                {[ORDER_STATUS.PROGRAMADO_MAS_TARDE, ORDER_STATUS.REPROGRAMADO_PARA_HOY, ORDER_STATUS.PROGRAMADO_OTRO_DIA, ORDER_STATUS.REPROGRAMADO].includes(order.status.description) && order.scheduled_for && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
                        <TypographyCustom variant="caption" sx={{
                            color: new Date(order.scheduled_for) < new Date() ? 'error.main' : 'warning.main',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                        }}>
                            <NotificationsActiveRounded fontSize="small" sx={{
                                color: new Date(order.scheduled_for) < new Date() ? 'error.main' : 'warning.main',
                                animation: new Date(order.scheduled_for) < new Date() ? 'pulse-fast 1s infinite' : 'none',
                                '@keyframes pulse-fast': {
                                    '0%': { transform: 'scale(1)', opacity: 1 },
                                    '50%': { transform: 'scale(1.3)', opacity: 0.7 },
                                    '100%': { transform: 'scale(1)', opacity: 1 },
                                }
                            }} />
                            {new Date(order.scheduled_for).toLocaleDateString() === new Date().toLocaleDateString()
                                ? `Hoy ${new Date(order.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : new Date(order.scheduled_for).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                            }
                        </TypographyCustom>
                    </Box>
                )}
                {order.updates_count > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
                        <TypographyCustom variant="caption" sx={{
                            color: 'text.secondary',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            opacity: 0.8
                        }}>
                            <HistoryRounded sx={{ fontSize: '1rem' }} />
                            {order.updates_count} act.
                        </TypographyCustom>
                    </Box>
                )}
            </Box>
            <TypographyCustom sx={{ margin: 'auto', color: userStore.user.color, mt: 1 }} variant="subtitle1" onClick={getProducts}>Ver productos</TypographyCustom>

            {orderProducts.length > 0 ? orderProducts.map((p: any) =>
                <Tooltip title={p.showable_name || p.title}>
                    <TypographyCustom variant="subtitle2"
                        color="text.secondary"
                        sx={{
                            maxWidth: "200px",   // 🔹 ajusta el ancho máximo permitido
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}>
                        ({p.quantity}) {p.showable_name || p.title}
                    </TypographyCustom>
                </Tooltip>
            ) : orderProductsEmpty ? 'No hay productos para mostrar' : ''}
        </Box>
    );
};
