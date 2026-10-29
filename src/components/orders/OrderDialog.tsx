import { AppBar, Box, Dialog, DialogActions, Divider, IconButton, Toolbar, Typography, useTheme, DialogContent, Tab, Tabs, Grid, Paper, Tooltip, Zoom, Fab, Menu, MenuItem, ListItemIcon, ListItemText, DialogTitle, TextField, Button, Alert, AlertTitle, Badge, Chip } from "@mui/material";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState, useEffect } from "react";
import { darken, lighten } from "@mui/material/styles";

import { useOrderDialogLogic } from "../../hooks/useOrderDialogLogic";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { PostponeOrderDialog } from "./PostponeOrderDialog";
import { ReviewCancellationDialog } from "./ReviewCancellationDialog";
import { ReviewDeliveryDialog } from "./ReviewDeliveryDialog";
import { ReminderDialog } from "./ReminderDialog";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { LeaderMoveOrderDialog } from "./LeaderMoveOrderDialog";
import { leaderCanMove } from "../../common/leaderMove";
import { AssignAgencyDialog } from "./AssignAgencyDialog";
import { OrderPaymentSection } from "./OrderPaymentSection";
import { OrderChangeSection } from "./OrderChangeSection";
import { OrderTimer } from "./OrderTimer";
import { OrderUpdatesList } from "./OrderUpdatesList";
import { OrderUpdateInput } from "./OrderUpdateInput";
import { OrderActivityList } from "./OrderActivityList";
import { OrderProductsList } from "./OrderProductsList";
import { OrderHeader } from "./OrderHeader";
import { OrderCompanyAccounts } from "./OrderCompanyAccounts";
import { OrderRefundsCard } from "./OrderRefundsCard";
import { OrderTripsCard } from "./OrderTripsCard";
import { RefundDialog } from "./RefundDialog";
import { fmtMoney } from "../../lib/money";
import { ButtonCustom } from "../custom";
import { ProductSearchDialog } from "../products/ProductsSearchDialog";
import { UpsellConfirmDialog } from "./UpsellConfirmDialog";
import { OrderInternalChat } from "./OrderInternalChat";
import { OrderProductItem } from "./OrderProductItem";
import { OrderWhatsApp } from "./OrderWhatsApp";
import { ProductTechnicalSheet } from "../products/ProductTechnicalSheet";
import {
    NotificationAddRounded,
    ShoppingCartRounded,
    ReceiptLongRounded,
    HistoryRounded,
    MoreVertRounded,
    DeleteSweepRounded,
    EventRepeatRounded,
    AssignmentIndRounded,
    LocalShippingRounded,
    ContentCopyRounded,
    WarningAmberRounded,
    ApartmentRounded,
    CheckCircleRounded,
    RuleRounded,
    Inventory2Outlined as Inventory2OutlinedIcon,
    ReplayRounded,
    CurrencyExchange,
    EditRounded,
    WhatsApp
} from "@mui/icons-material";
import { request } from "../../common/request";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { ReportNovedadDialog } from "./ReportNovedadDialog";
import { ResolveNovedadDialog } from "./ResolveNovedadDialog";
import { LogisticsDialog } from "./LogisticsDialog";
import DenseMenu from "../ui/content/DenseMenu";
import { toast } from "react-toastify";
import { DailyRatesDialog } from "./DailyRatesDialog";
import { orderNo } from "../../lib/functions";

interface OrderDialogProps {
    id?: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OrderDialog: FC<OrderDialogProps> = ({ id, open, setOpen }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const [activeTabId, setActiveTabId] = useState('detail');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const {
        selectedOrder: order,
        initialTabId,
        user,
        openCancel, setOpenCancel,

        openPostpone, setOpenPostpone,
        openApprove, setOpenApprove,
        openReject, setOpenReject,
        loadingReview,
        newLocation,
        handleClose,
        sendLocation,
        approveCancellation,
        rejectCancellation,
        changeStatus,
        handleChangeNewLocation,
        updateOrder,
        addUpsell,
        removeUpsell,
        changeProductVariant,
        openApproveDelivery, setOpenApproveDelivery,
        openRejectDelivery, setOpenRejectDelivery,
        approveDelivery,
        rejectDelivery,
        openApproveLocation, setOpenApproveLocation,
        openRejectLocation, setOpenRejectLocation,
        openApproveRejection, setOpenApproveRejection,
        openRejectRejection, setOpenRejectRejection,
        approveLocation,
        rejectLocation,
        approveRejection,
        rejectRejection,
        setReminder,
        openMarkDelivered, setOpenMarkDelivered,
        openReportNovedad, setOpenReportNovedad,
        openResolveNovedad, setOpenResolveNovedad,
        pendingStatus,
        targetStatus,
        pendingExtraData,
        fetchOrder,
        refreshOrder,
        updateProductQuantity,
        updateOrderTotal,
    } = useOrderDialogLogic(id, open, setOpen);

    const isAgencia = user?.role?.description === 'Agencia';
    const isAdmin = ['Admin', 'Gerente', 'Master'].includes(user?.role?.description || '');

    // Define available tabs
    const allTabs = [
        { id: 'detail', label: 'Detalle', icon: <ShoppingCartRounded sx={{ fontSize: '1.2rem' }} />, visible: true },
        { id: 'finance', label: 'Finanzas', icon: <ReceiptLongRounded sx={{ fontSize: '1.2rem' }} />, visible: true },
        {
            id: 'whatsapp',
            label: 'WhatsApp',
            icon: <WhatsApp sx={{ fontSize: '1.2rem' }} />,
            visible: !isAgencia,
            badge: order?.whatsapp_unread_count || 0
        },
        {
            id: 'history',
            label: 'Historial',
            icon: <HistoryRounded sx={{ fontSize: '1.2rem' }} />,
            visible: true,
            badge: order?.updates?.length || 0
        },
        {
            id: 'technical',
            label: 'Ficha Técnica',
            icon: <Inventory2OutlinedIcon sx={{ fontSize: '1.2rem' }} />,
            visible: !isAgencia
        },
        {
            id: 'actions',
            label: 'Acciones',
            icon: <RuleRounded sx={{ fontSize: '1.2rem' }} />,
            visible: isAdmin
        },
    ];

    const visibleTabs = allTabs.filter(t => t.visible);

    useEffect(() => {
        if (open && initialTabId) {
            setActiveTabId(initialTabId);
        }
    }, [open, initialTabId, order?.id]);

    const handleTabChange = (_: any, newValue: string) => {

        setActiveTabId(newValue);
    };



    const [openReminder, setOpenReminder] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);
    const [openInternalChat, setOpenInternalChat] = useState(false);
    const [openRates, setOpenRates] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [openLeaderMove, setOpenLeaderMove] = useState(false);
    const [openAssignAgency, setOpenAssignAgency] = useState(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openLogistics, setOpenLogistics] = useState(false);
    const [showUpsellConfirm, setShowUpsellConfirm] = useState(false);
    const [upsellCandidate, setUpsellCandidate] = useState<any>(null);
    const [stagedPayments, setStagedPayments] = useState<any[]>([]);
    const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
    // Devolución = reembolso (tarea 3b): se registra en la orden, sin crear otra
    const [openRefund, setOpenRefund] = useState(false);
    const [creatingReturn, setCreatingReturn] = useState(false);
    const [isAddingRegular, setIsAddingRegular] = useState(false);

    useEffect(() => {
        if (order?.payments) {
            setStagedPayments(order.payments);
        }
    }, [order?.payments]);

    const binanceRate = Number(order?.binance_rate || 0);

    const copyGeneralInfo = () => {
        if (!order) return;
        // Fran (3-oct): la talla en una línea aparte y en negrita, para que la agencia no se equivoque
        const sizeLine = (p: any) => {
            const size = p.variant_title || (p.variant_id ? p.size : null);
            if (size) return `\n   👕 *TALLA: ${String(size).toUpperCase()}*`;
            return (p.variants ?? []).some((v: any) => v.is_active) ? '\n   ⚠️ *TALLA: SIN ELEGIR*' : '';
        };
        const productsList = order.products?.map((p: any) => `• ${p.quantity}x ${p.showable_name || p.title}${sizeLine(p)}`).join('\n') || 'Sin productos';
        const agencyDisplay = order.agency?.names
            ? (user.role?.description === 'Vendedor' ? 'Asignada a Agencia' : order.agency.names)
            : 'No asignada';

        const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
        const total = Number(order.current_total_price) || 0;
        const difference = totalPaid - total;

        let paymentInfo = `💳 *Métodos de Pago:*\n${order.payments && order.payments.length > 0 ? order.payments.map((p: any) => {
            const isVes = ["PAGOMOVIL", "BOLIVARES_EFECTIVO", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(p.method);
            if (isVes) {
                const rate = Number(p.rate || order.binance_rate || 0);
                const amountBs = Number(p.amount) * rate;
                return `• ${p.method}: ${fmtMoney(amountBs, 'VES')}`;
            }
            return `• ${p.method}: $${Number(p.amount).toFixed(2)}`;
        }).join('\n') : "Pendiente"}`;

        // Reemplazo completo de líneas 151-195 en OrderDialog.tsx

        // 💵 Vuelto: Mostrar cada parte en su moneda correcta según método
        if (difference > 0.01) {
            const bcvEurRate = Number(order.change_rate || 0);

            // Helper: determinar si un método es en Bolívares
            const isMethodVes = (method: string) =>
                ["PAGOMOVIL", "BOLIVARES_PAGOMOVIL", "BOLIVARES_EFECTIVO", "BOLIVARES_TRANSFERENCIA", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(method);

            if (order.change_covered_by === 'partial') {
                // Distribución mixta: cada parte en su moneda
                const companyUSD = Number(order.change_amount_company || 0);
                const agencyUSD = Number(order.change_amount_agency || 0);

                const companyMethod = order.change_method_company || '';
                const agencyMethod = order.change_method_agency || '';

                console.log('🔍 DEBUG VUELTO:', {
                    companyMethod,
                    agencyMethod,
                    companyUSD,
                    agencyUSD,
                    bcvEurRate
                });

                const companyInVes = isMethodVes(companyMethod);
                const agencyInVes = isMethodVes(agencyMethod);

                paymentInfo += `\n💵 *Vuelto a entregar:*`;

                if (companyInVes) {
                    const companyBs = companyUSD * bcvEurRate;
                    paymentInfo += `\n   • Empresa: ${fmtMoney(companyBs, 'VES')}`;
                } else {
                    paymentInfo += `\n   • Empresa: $${companyUSD.toFixed(2)}`;
                }

                if (agencyInVes) {
                    const agencyBs = agencyUSD * bcvEurRate;
                    paymentInfo += `\n   • Agencia: ${fmtMoney(agencyBs, 'VES')}`;
                } else {
                    paymentInfo += `\n   • Agencia: $${agencyUSD.toFixed(2)}`;
                }
            } else if (order.change_covered_by === 'agency') {
                const method = order.change_method_agency || '';
                if (isMethodVes(method)) {
                    const changeInBs = difference * bcvEurRate;
                    paymentInfo += `\n💵 *Vuelto a entregar (Bs):* ${fmtMoney(changeInBs, 'VES')}`;
                    paymentInfo += `\n   • Agencia: ${fmtMoney(changeInBs, 'VES')}`;
                } else {
                    paymentInfo += `\n💵 *Vuelto a entregar (USD):* $${difference.toFixed(2)}`;
                    paymentInfo += `\n   • Agencia: $${difference.toFixed(2)}`;
                }
            } else if (order.change_covered_by === 'company') {
                const method = order.change_method_company || '';
                if (isMethodVes(method)) {
                    const changeInBs = difference * bcvEurRate;
                    paymentInfo += `\n💵 *Vuelto a entregar (Bs):* ${fmtMoney(changeInBs, 'VES')}`;
                    paymentInfo += `\n   • Empresa: ${fmtMoney(changeInBs, 'VES')}`;
                } else {
                    paymentInfo += `\n💵 *Vuelto a entregar (USD):* $${difference.toFixed(2)}`;
                    paymentInfo += `\n   • Empresa: $${difference.toFixed(2)}`;
                }
            }
        }

        let locationDetails = '';
        if (order.client?.address1) locationDetails += `\n🏠 *Dirección:* ${order.client.address1}`;
        if (order.client?.address2) locationDetails += `\n📍 *Referencia:* ${order.client.address2}`;
        if (order.location) locationDetails += `\n🔗 *Link Maps:* ${order.location}`;

        const message = `🚀 *ORDEN ${orderNo(order.name)}*${locationDetails || '\n📍 *Ubicación:* No asignada'}\n🏢 *Agencia:* ${agencyDisplay}\n👤 *Cliente:* ${order.client?.first_name} ${order.client?.last_name}\n📞 *Teléfono:* ${order.client?.phone}\n📦 *Productos:*\n${productsList}\n${paymentInfo}`;
        navigator.clipboard.writeText(message);
        toast.info('📋 Información copiada');
    };

    const handleCreateReturn = async () => {
        if (!order) return;
        setCreatingReturn(true);
        try {
            const body = new URLSearchParams();
            body.append('type', 'cambio');
            const { status, response } = await request(`/orders/${order.id}/create-return`, 'POST', body);
            const data = await response.json();
            if (status === 200 && data.status) {
                toast.success('✅ Orden de cambio creada: #' + data.order?.name);
                setConfirmReturnOpen(false);
                refreshOrder();
            } else {
                toast.error(data.message || 'Error al crear el cambio');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setCreatingReturn(false);
        }
    };

    if (!order) return null;

    // Tarea 4: cambiar la talla de una línea. La agencia no; en una orden entregada, solo el Admin (como el backend).
    const canChangeVariant = user?.role?.description !== 'Agencia'
        && (order.status?.description !== 'Entregado' || user?.role?.description === 'Admin');

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    return (
        <>
            <Dialog
                fullScreen
                onClose={handleClose}
                open={open}
                TransitionComponent={Zoom}
                PaperProps={{
                    sx: {
                        background: isDark ? darken(user.color, 0.96) : '#f8fafc',
                    }
                }}
            >
                {/* 🏗️ MODER HEADER SUMARIO */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        background: isDark ? darken(user.color, 0.85) : user.color,
                        borderBottom: '1px solid',
                        borderColor: 'rgba(255,255,255,0.1)',
                    }}
                >
                    <Toolbar sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'space-between',
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 1.5, sm: 0 },
                        minHeight: { xs: 'auto', sm: 64 },
                        gap: { xs: 1.5, sm: 0 }
                    }}>
                        {/* 1️⃣ BLOQUE INFO (Orden, Tienda, etc) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>
                                        Orden
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                        {orderNo(order.name)}
                                    </Typography>
                                </Box>

                                {order.agent_id && order.agency_id &&
                                 ['Vendedor', 'Agencia', 'Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && (
                                    <Button
                                        size="small"
                                        startIcon={<ForumRoundedIcon fontSize="small" />}
                                        onClick={() => setOpenInternalChat(true)}
                                        sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' } }}
                                    >
                                        {user.role?.description === 'Agencia' ? 'Chat con la vendedora' : 'Chat interno'}
                                    </Button>
                                )}

                                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1, display: { xs: 'none', md: 'block' } }} />

                                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                    <Typography variant="caption" color="text.secondary" display="block">Provincia / Ciudad</Typography>
                                    <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                                        {order.client?.province || 'No esp.'} / {order.client?.city || 'No esp.'}
                                    </Typography>
                                </Box>

                                {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && order.shop && (
                                    <>
                                        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1, display: { xs: 'none', md: 'block' } }} />
                                        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                            <Typography variant="caption" color="text.secondary" display="block">Tienda</Typography>
                                            <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                                                {order.shop.name}
                                            </Typography>
                                        </Box>
                                    </>
                                )}
                                {order.received_at && (
                                    <>
                                        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1, display: { xs: 'none', md: 'block' } }} />
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>Timer Entrega</Typography>
                                            <Box sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.1)', px: 1, py: 0.2, borderRadius: 1 }}>
                                                <OrderTimer
                                                    receivedAt={order.status?.description === 'Novedades' ? order.updated_at : order.received_at}
                                                    deliveredAt={order.status?.description === 'Entregado' ? (order.processed_at || order.updated_at) : null}
                                                    status={order.status?.description || ''}
                                                />
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>

                            {/* ❌ CLOSE BUTTON (MOBILE ONLY - Top Right) */}
                            <IconButton onClick={handleClose} sx={{ color: 'white', display: { xs: 'flex', sm: 'none' }, p: 0.5 }}>
                                <CloseRoundedIcon />
                            </IconButton>
                        </Box>

                        {/* 2️⃣ BLOQUE ACCIONES (Estado + Botones) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                            {/* ESTADO DEL PEDIDO */}
                            <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}>
                                    Estado Actual
                                </Typography>
                                <DenseMenu
                                    data={order}
                                    changeStatus={changeStatus}
                                    icon={false}
                                    customComponent={
                                        <Paper elevation={0} sx={{
                                            px: { xs: 1.5, sm: 1.5 }, py: 0.2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                                            display: 'flex', alignItems: 'center', gap: 1
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                                {order.status?.description || 'Desconocido'}
                                            </Typography>
                                            <MoreVertRounded sx={{ fontSize: '1rem', opacity: 0.7 }} />
                                        </Paper>
                                    }
                                />
                            </Box>

                            {/* BOTONES ACCION */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                                {['Admin', 'Gerente', 'Master', 'Agencia'].includes(user.role?.description || '') && (
                                    <Tooltip title="Copiar resumen">
                                        <IconButton onClick={copyGeneralInfo} sx={{ color: 'white', p: { xs: 1, sm: 1 } }}>
                                            <ContentCopyRounded sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                <Tooltip title="Tasas del día">
                                    <IconButton onClick={() => setOpenRates(true)} sx={{ color: 'white', p: { xs: 1, sm: 1 } }}>
                                        <CurrencyExchange sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Recordatorio">
                                    <IconButton onClick={() => setOpenReminder(true)} sx={{ color: 'white', p: { xs: 1, sm: 1 } }}>
                                        <NotificationAddRounded sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Acciones">
                                    <IconButton onClick={handleMenuOpen} sx={{ color: 'white', p: { xs: 1, sm: 1 }, display: { xs: 'none', sm: 'flex' } }}>
                                        <MoreVertRounded sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                {/* ❌ CLOSE BUTTON (DESKTOP ONLY) */}
                                <IconButton onClick={handleClose} sx={{ ml: 1, color: 'white', display: { xs: 'none', sm: 'flex' } }}>
                                    <CloseRoundedIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    </Toolbar>

                    {/* 📱 TABS NAVIGATION */}
                    <Box sx={{
                        bgcolor: 'rgba(0,0,0,0.15)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        justifyContent: 'center',
                        borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Tabs
                            value={activeTabId}
                            onChange={handleTabChange}
                            textColor="inherit"
                            indicatorColor="secondary"
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                px: 2,
                                '& .MuiTab-root': {
                                    minHeight: 64,
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    transition: 'all 0.2s',
                                    opacity: 0.7,
                                    '&.Mui-selected': { opacity: 1, color: 'secondary.main' }
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: '3px 3px 0 0',
                                    bgcolor: 'secondary.main',
                                    boxShadow: '0 -4px 12px rgba(255, 64, 129, 0.5)'
                                }
                            }}
                        >
                            {visibleTabs.map((tab) => (
                                <Tab
                                    key={tab.id}
                                    value={tab.id}
                                    label={tab.badge ? (
                                        <Badge badgeContent={tab.badge} color="error" max={99} sx={{ '& .MuiBadge-badge': { right: -10, top: 2 } }}>
                                            {tab.label}
                                        </Badge>
                                    ) : tab.label}
                                    icon={tab.icon}
                                    iconPosition="start"
                                />
                            ))}
                        </Tabs>
                    </Box>
                </AppBar>

                {/* 📋 CONTENT AREA (Massive pb to ensure space for the large absolute comment bar at bottom) */}
                <DialogContent sx={{ p: { xs: 1, sm: 3 }, pb: 45 }}>
                    <Box sx={{ maxWidth: '100%', margin: 'auto' }}>

                        {/* ⚠️ STOCK WARNING ALERT */}
                        {order.has_stock_warning && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(211, 47, 47, 0.1)',
                                border: '1px solid',
                                borderColor: 'error.main',
                                display: 'flex', gap: 2, alignItems: 'center'
                            }}>
                                <Inventory2OutlinedIcon color="error" />
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="error">
                                        Stock Insuficiente
                                    </Typography>
                                    <Typography variant="body2">
                                        Uno o más productos no tienen existencias suficientes en el almacén de la agencia asignada ({user.role?.description === 'Vendedor' ? 'asignada' : (order.agency?.names || 'Principal')}). No se puede marcar como Entregado ni En ruta hasta corregir el stock.
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {/* 📦 STOCK DISPONIBLE EN OTROS ALMACENES (solo cuando está en "Sin Stock") */}
                        {order.status?.description === 'Sin Stock' && Array.isArray(order.stock_elsewhere) && order.stock_elsewhere.length > 0 && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(46, 125, 50, 0.1)',
                                border: '1px solid',
                                borderColor: 'success.main',
                            }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1.5 }}>
                                    <Inventory2OutlinedIcon color="success" />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                                            Hay stock en otros almacenes
                                        </Typography>
                                        <Typography variant="body2">
                                            Esta orden está en <b>Sin Stock</b> para la agencia actual, pero sí hay existencias en los siguientes almacenes. Puedes reasignar la agencia para mover la orden a otro estado.
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, pl: { sm: 5 } }}>
                                    {order.stock_elsewhere.map((w: any) => (
                                        <Chip
                                            key={w.warehouse_id}
                                            color="success"
                                            variant="outlined"
                                            icon={<Inventory2OutlinedIcon />}
                                            label={w.city_name ? `Agencia: ${w.city_name}` : (w.warehouse_name || w.agency_name || 'Almacén')}
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ pl: { sm: 5 } }}>
                                    <ButtonCustom size="small" color="success" onClick={() => setOpenAssignAgency(true)}>
                                        Reasignar agencia
                                    </ButtonCustom>
                                </Box>
                            </Paper>
                        )}

                        {(Boolean(order.is_return) || Boolean(order.is_exchange)) && (
                            <Alert severity="warning" variant="outlined" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle fontWeight="black" sx={{ fontSize: '1.1rem' }}>
                                    {Boolean(order.is_exchange) ? 'ORDEN DE CAMBIO' : 'ORDEN DE DEVOLUCIÓN'}
                                </AlertTitle>
                                Esta es una orden de {Boolean(order.is_exchange) ? 'cambio' : 'devolución'}. El total es $0 y no requiere registro de pagos.
                            </Alert>
                        )}

                        {/* ⚠️ NOVEDADES ALERT */}
                        {order.status?.description === 'Novedades' && (
                            <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>Novedad Reportada</AlertTitle>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                    {order.novedad_type}
                                </Typography>
                                <Typography variant="body2">
                                    {order.novedad_description}
                                </Typography>
                            </Alert>
                        )}

                        {order.status?.description === 'Novedad Solucionada' && (
                            <Alert severity="success" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>Novedad Solucionada</AlertTitle>
                                <Typography variant="body2" fontWeight="bold">
                                    {order.novedad_resolution || "No se especificó resolución."}
                                </Typography>
                            </Alert>
                        )}

                        {/* ✅ HAS RETURNS CREATED */}
                        {order.return_orders && order.return_orders.length > 0 && (
                            <Alert severity="warning" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>📦 Cambio generado</AlertTitle>
                                <Typography variant="body2">
                                    Se {order.return_orders.length === 1 ? 'ha' : 'han'} creado {order.return_orders.length} {order.return_orders.length === 1 ? 'orden' : 'órdenes'} desde esta orden: {order.return_orders.map((r: any) => r.name).join(', ')}
                                </Typography>
                            </Alert>
                        )}

                        {/* 💸 REEMBOLSADA (devolución, tarea 3b) */}
                        {Number(order.refunded_usd) > 0 && (
                            <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>💸 Devolución: se reembolsaron {fmtMoney(Number(order.refunded_usd), 'USD')}</AlertTitle>
                                <Typography variant="body2">
                                    El producto se quedó con el cliente. El detalle está en la pestaña <b>Finanzas</b>.
                                </Typography>
                            </Alert>
                        )}

                        {/* ⚠️ POSTPONEMENT WARNING */}
                        {order.postponements && order.postponements.length > 0 && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(255, 152, 0, 0.1)',
                                border: '1px solid',
                                borderColor: 'warning.main',
                                display: 'flex', gap: 2, alignItems: 'center'
                            }}>
                                <EventRepeatRounded sx={{ color: 'warning.dark' }} />
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                                        Esta orden ha sido reprogramada {order.postponements.length} {order.postponements.length === 1 ? 'vez' : 'veces'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Puedes ver los detalles y motivos en la pestaña de <b>Historial</b>.
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {/* 🔁 ORDEN ATENDIDA ANTERIORMENTE */}
                        {order.reset_count > 0 && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(230, 81, 0, 0.08)',
                                border: '1px solid',
                                borderColor: 'rgba(230, 81, 0, 0.4)',
                                display: 'flex', gap: 2, alignItems: 'center'
                            }}>
                                <ReplayRounded sx={{ color: '#e65100', fontSize: '1.5rem', flexShrink: 0 }} />
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#e65100' }}>
                                        Atendida en día{order.reset_count > 1 ? 's' : ''} anterior{order.reset_count > 1 ? 'es' : ''} ({order.reset_count}x)
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Esta orden fue reseteada a "Nuevo" al cerrar la tienda {order.reset_count} {order.reset_count === 1 ? 'vez' : 'veces'} porque no fue concretada. Si se cierra la tienda sin concretarla nuevamente, será cancelada automáticamente.
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {activeTabId === 'detail' && (
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, sm: 6, md: 6, lg: 5 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>Información de la Orden</Typography>
                                        <OrderHeader
                                            order={order}
                                            user={user}
                                            newLocation={newLocation}
                                            sendLocation={sendLocation}
                                            handleChangeNewLocation={handleChangeNewLocation}
                                            onEditLogistics={() => setOpenLogistics(true)}
                                            onOrderSaved={updateOrder}
                                        />
                                    </Paper>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h6" fontWeight="bold">Productos</Typography>
                                            {user.role?.description !== 'Agencia' && (
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    {(Boolean(order.is_return) || Boolean(order.is_exchange)) ? (
                                                        <ButtonCustom size="small" variant="outlined" onClick={() => { setIsAddingRegular(true); setOpenSearch(true); }}>
                                                            + Agregar
                                                        </ButtonCustom>
                                                    ) : (
                                                        <>
                                                            <ButtonCustom size="small" variant="outlined" color="primary" onClick={() => { setIsAddingRegular(false); setOpenSearch(true); }}>
                                                                + Upsell
                                                            </ButtonCustom>
                                                            {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && (
                                                                <ButtonCustom size="small" variant="outlined" color="info" onClick={() => { setIsAddingRegular(true); setOpenSearch(true); }}>
                                                                    + Producto
                                                                </ButtonCustom>
                                                            )}
                                                        </>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>

                                        <Box sx={{ mb: 2 }}>
                                            {/* For return/exchange orders, show products with delete option */}
                                            {(Boolean(order.is_return) || Boolean(order.is_exchange)) ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {(order.products || []).map((p: any) => (
                                                        <OrderProductItem
                                                            key={p.id}
                                                            product={p}
                                                            currency={order.currency}
                                                            onDelete={() => { if (confirm(`¿Eliminar este producto del ${order.is_exchange ? 'cambio' : 'devolución'}?`)) removeUpsell(p.id); }}
                                                            onChangeVariant={canChangeVariant ? (variantId) => changeProductVariant(p.id, variantId) : undefined}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <OrderProductsList
                                                    products={(order.products || []).filter((p: any) => !p.is_upsell)}
                                                    currency={order.currency}
                                                    onChangeVariant={canChangeVariant ? changeProductVariant : undefined}
                                                    onDeleteItem={
                                                        user.role?.description === 'Admin'
                                                            ? (id) => { if (confirm("⚠️ ¿Estás seguro de eliminar este producto?\nEsto reducirá el total de la orden.")) removeUpsell(id); }
                                                            : undefined
                                                    }
                                                    onEditQuantity={
                                                        ['Admin', 'Vendedor'].includes(user.role?.description || '')
                                                            ? (id, qty, currentPrice) => {
                                                                // 🔥 CLIENT REQUEST: Vendedoras pueden editar cantidad y precio
                                                                const newQty = prompt("Nueva cantidad:", String(qty));
                                                                if (newQty && !isNaN(Number(newQty)) && Number(newQty) > 0) {
                                                                    const newPrice = prompt(`Nuevo precio unitario (actual: $${currentPrice}):`, String(currentPrice));
                                                                    if (newPrice && !isNaN(Number(newPrice)) && Number(newPrice) >= 0) {
                                                                        updateProductQuantity(id, Number(newQty), Number(newPrice));
                                                                    } else if (newPrice === null) {
                                                                        // Usuario canceló
                                                                    } else {
                                                                        // Solo actualizar cantidad
                                                                        updateProductQuantity(id, Number(newQty));
                                                                    }
                                                                }
                                                            }
                                                            : undefined
                                                    }
                                                />
                                            )}
                                        </Box>

                                        {!(order.is_return || order.is_exchange) && (order.products || []).filter((p: any) => p.is_upsell).length > 0 && (
                                            <>
                                                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 1 }}>VENTAS ADICIONALES (UPSELL)</Typography>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {(order.products || []).filter((p: any) => p.is_upsell).map((p: any) => (
                                                        <OrderProductItem
                                                            key={p.id}
                                                            product={p}
                                                            currency={order.currency}
                                                            onDelete={() => { if (confirm("¿Eliminar este upsell?")) removeUpsell(p.id); }}
                                                            onChangeVariant={canChangeVariant ? (variantId) => changeProductVariant(p.id, variantId) : undefined}
                                                        />
                                                    ))}
                                                </Box>
                                            </>
                                        )}

                                        {/* 🔥 CLIENT REQUEST: Advertencia si se modificaron productos originales */}
                                        {order.has_modified_original_products && user.role?.description === 'Vendedor' && (
                                            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                                                <AlertTitle fontWeight="bold">⚠️ Upsells Bloqueados</AlertTitle>
                                                Has modificado productos originales. No puedes agregar upsells. Contacta al administrador.
                                            </Alert>
                                        )}

                                        <Box sx={{ mt: 3, p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2, textAlign: 'right' }}>
                                            {/* 🔥 CLIENT REQUEST: Admin can edit total manually */}
                                            {user.role?.description === 'Admin' ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                    <Typography variant="h5" fontWeight="black" color="primary">
                                                        TOTAL: {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                                                    </Typography>
                                                    <Tooltip title="Editar total manualmente (solo Admin)">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => {
                                                                const newTotal = prompt("Nuevo total de la orden:", String(order.current_total_price));
                                                                if (newTotal && !isNaN(Number(newTotal)) && Number(newTotal) >= 0) {
                                                                    updateOrderTotal(Number(newTotal));
                                                                }
                                                            }}
                                                            sx={{ ml: 1 }}
                                                        >
                                                            <EditRounded fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            ) : (
                                                <Typography variant="h5" fontWeight="black" color="primary">
                                                    TOTAL: {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                                                </Typography>
                                            )}
                                            {(Boolean(order.is_return) || Boolean(order.is_exchange)) && (
                                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                                    <Typography variant="h6" color="text.secondary">
                                                        Las órdenes de {Boolean(order.is_exchange) ? 'cambio' : 'devolución'} no requieren registro de pagos.
                                                    </Typography>
                                                </Box>
                                            )}
                                            {order.ves_price !== undefined && user.role?.description !== 'Agencia' && (
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Monto en Bs: {fmtMoney(order.ves_price, 'VES')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 12, md: 12, lg: 3 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>IMPORTANTE</Typography>

                                        <OrderUpdatesList updates={order.updates} />
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}

                        {activeTabId === 'finance' && (
                            <>
                                {/* Hide payment sections for return orders */}
                                {Boolean(order.is_return) ? (
                                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
                                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                            🔄 Orden de Devolución
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Las órdenes de devolución no requieren pagos ni generan comisiones.<br />
                                            El cliente no paga - Total: <strong>$0.00</strong>
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                <OrderPaymentSection
                                                    order={order}
                                                    onPaymentsChange={setStagedPayments}
                                                    onUpdate={refreshOrder}
                                                />
                                            </Paper>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <OrderChangeSection
                                                order={order}
                                                onUpdate={refreshOrder}
                                                payments={stagedPayments}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <OrderCompanyAccounts />
                                        </Grid>
                                        {!order.is_exchange && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <OrderRefundsCard
                                                    order={order}
                                                    canRegister={['Admin', 'Gerente', 'Master', 'Vendedor'].includes(user.role?.description || '')}
                                                    onChange={refreshOrder}
                                                />
                                            </Grid>
                                        )}
                                        {/* Las carreras solo las ve el Admin; la agencia no (Fran, 2026-10-06) */}
                                        {['Admin', 'Master'].includes(user.role?.description || '') && (
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <OrderTripsCard orderId={order.id} canVoid />
                                            </Grid>
                                        )}
                                    </Grid>
                                )}
                            </>
                        )}

                        {activeTabId === 'whatsapp' && (
                            <Box sx={{ maxWidth: '800px', margin: 'auto' }}>
                                <OrderWhatsApp orderId={order.id} />
                            </Box>
                        )}

                        {activeTabId === 'history' && (
                            <Box sx={{ maxWidth: '800px', margin: 'auto' }}>
                                <OrderUpdatesList updates={order.updates} />
                            </Box>
                        )}

                        {activeTabId === 'technical' && (
                            <Box sx={{ maxWidth: '1000px', margin: 'auto' }}>
                                <ProductTechnicalSheet
                                    orderProducts={order.products || []}
                                    isAdmin={['Admin', 'Gerente', 'Master'].includes(user.role?.description || '')}
                                />
                            </Box>
                        )}

                        {activeTabId === 'actions' && (
                            <Box sx={{ maxWidth: '1000px', margin: 'auto' }}>
                                <OrderActivityList orderId={order.id} />
                            </Box>
                        )}


                        {/* 🛡️ SAFE AREA SPACER: Guarantees that content can always be scrolled above the fixed comment input */}
                        <Box sx={{ height: { xs: 200, sm: 300 }, width: '100%' }} />
                    </Box>
                </DialogContent>

                {/* 🏗️ FIXED COMMENT INPUT */}
                <DialogActions sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    p: 0,
                    bgcolor: isDark ? darken(user.color, 0.94) : '#ffffff',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    zIndex: 1000,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
                }}>
                    <OrderUpdateInput orderId={order.id} />
                </DialogActions>

                {/* 🛡️ MENU DE ACCIONES SECUNDARIAS */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    elevation={4}
                    slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 200, mt: 1 } } }}
                >
                    {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                        <>
                            <MenuItem onClick={() => { handleMenuClose(); setOpenLogistics(true); }}>
                                <ListItemIcon><LocalShippingRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Gestión Logística</ListItemText>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => { handleMenuClose(); setOpenAssign(true); }}>
                                <ListItemIcon><AssignmentIndRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Reasignar Vendedor</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); setOpenAssignAgency(true); }}>
                                <ListItemIcon><ApartmentRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Asignar Agencia</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); setOpenAssignDeliverer(true); }}>
                                <ListItemIcon><LocalShippingRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Asignar Repartidor</ListItemText>
                            </MenuItem>
                        </>
                    )}

                    {/* H4: la Líder pasa este pedido a otra vendedora de su grupo */}
                    {!!user.leader_group && leaderCanMove(order.status?.description) && !['Admin', 'Gerente'].includes(user.role?.description || '') && (
                        <MenuItem onClick={() => { handleMenuClose(); setOpenLeaderMove(true); }}>
                            <ListItemIcon><AssignmentIndRounded fontSize="small" /></ListItemIcon>
                            <ListItemText>Pasar a otra vendedora</ListItemText>
                        </MenuItem>
                    )}

                    <MenuItem onClick={() => { handleMenuClose(); setOpenPostpone(true); }}>
                        <ListItemIcon><EventRepeatRounded fontSize="small" /></ListItemIcon>
                        <ListItemText>Postponer Orden</ListItemText>
                    </MenuItem>

                    {!(order.is_return || order.is_exchange) && order.status?.description === 'Entregado' && (
                        <>
                            {['Admin', 'Gerente', 'Master', 'Vendedor'].includes(user.role?.description || '') && (
                                <MenuItem onClick={() => { handleMenuClose(); setOpenRefund(true); }}>
                                    <ListItemIcon><ReplayRounded fontSize="small" /></ListItemIcon>
                                    <ListItemText>Registrar Devolución (reembolso)</ListItemText>
                                </MenuItem>
                            )}
                            <MenuItem onClick={() => { handleMenuClose(); setConfirmReturnOpen(true); }}>
                                <ListItemIcon><EventRepeatRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Generar Cambio</ListItemText>
                            </MenuItem>
                        </>
                    )}

                    {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                        <>
                            <Divider />
                            <MenuItem onClick={() => { handleMenuClose(); setOpenCancel(true); }} sx={{ color: 'error.main' }}>
                                <ListItemIcon><DeleteSweepRounded fontSize="small" color="error" /></ListItemIcon>
                                <ListItemText>Cancelar orden</ListItemText>
                            </MenuItem>
                        </>
                    )}
                </Menu>

                {/* 🛠️ OTROS DIALOGS (MANTENIENDO LÓGICA) */}
                <ReminderDialog open={openReminder} onClose={() => setOpenReminder(false)} onSave={setReminder} />
                <ReviewCancellationDialog open={openApprove} onClose={() => setOpenApprove(false)} title="Aprobar cancelación" confirmText="Aprobar" onConfirm={approveCancellation} loading={loadingReview} />
                <ReviewCancellationDialog open={openReject} onClose={() => setOpenReject(false)} title="Rechazar cancelación" confirmText="Rechazar" onConfirm={rejectCancellation} loading={loadingReview} />
                <ReviewDeliveryDialog open={openApproveDelivery} onClose={() => setOpenApproveDelivery(false)} title="Aprobar Entrega" confirmText="Aprobar Entrega" onConfirm={approveDelivery} loading={loadingReview} />
                <ReviewDeliveryDialog open={openRejectDelivery} onClose={() => setOpenRejectDelivery(false)} title="Rechazar Entrega" confirmText="Rechazar" onConfirm={rejectDelivery} loading={loadingReview} />
                <ReviewDeliveryDialog open={openApproveLocation} onClose={() => setOpenApproveLocation(false)} title="Aprobar Cambio de Ubicación" confirmText="Aprobar" onConfirm={approveLocation} loading={loadingReview} />
                <ReviewDeliveryDialog open={openRejectLocation} onClose={() => setOpenRejectLocation(false)} title="Rechazar Cambio de Ubicación" confirmText="Rechazar" onConfirm={rejectLocation} loading={loadingReview} />
                <ReviewDeliveryDialog open={openApproveRejection} onClose={() => setOpenApproveRejection(false)} title="Aprobar Rechazo" confirmText="Confirmar Rechazo" onConfirm={approveRejection} loading={loadingReview} />
                <ReviewDeliveryDialog open={openRejectRejection} onClose={() => setOpenRejectRejection(false)} title="Denegar Solicitud de Rechazo" confirmText="Denegar (Mantener Orden)" onConfirm={rejectRejection} loading={loadingReview} />
                <CancelOrderDialog open={openCancel} onClose={() => setOpenCancel(false)} orderId={id} onCancelled={(cancelled: any) => { updateOrder({ ...order, status_id: cancelled?.status_id ?? order.status_id, status: cancelled?.status ?? { description: "Cancelado" } }); }} />
                <PostponeOrderDialog open={openPostpone} onClose={() => setOpenPostpone(false)} orderId={id} targetStatus={targetStatus} extraData={pendingExtraData} />
                <MarkDeliveredDialog open={openMarkDelivered} onClose={() => setOpenMarkDelivered(false)} order={order} binanceRate={binanceRate} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, data); }} />
                <ReportNovedadDialog open={openReportNovedad} onClose={() => setOpenReportNovedad(false)} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, { novedad_type: data.type, novedad_description: data.description }); }} />
                <ResolveNovedadDialog open={openResolveNovedad} onClose={() => setOpenResolveNovedad(false)} onConfirm={(resolution) => { if (pendingStatus) changeStatus(pendingStatus.description, { novedad_resolution: resolution }); }} />
                <AssignAgentDialog open={openAssign} onClose={() => setOpenAssign(false)} orderId={order.id} />
                {!!user.leader_group && <LeaderMoveOrderDialog open={openLeaderMove} onClose={() => setOpenLeaderMove(false)} order={{ id: order.id, name: order.name, agent_id: order.agent_id ?? order.agent?.id }} />}
                <AssignAgencyDialog open={openAssignAgency} onClose={() => setOpenAssignAgency(false)} orderId={order.id} stockElsewhere={order.stock_elsewhere} />
                <AssignDelivererDialog open={openAssignDeliverer} onClose={() => setOpenAssignDeliverer(false)} orderId={order.id} />
                <LogisticsDialog open={openLogistics} onClose={() => setOpenLogistics(false)} order={order} />
                <DailyRatesDialog open={openRates} onClose={() => setOpenRates(false)} />

                {/* CONFIRMAR CAMBIO (la devolución es un reembolso: RefundDialog) */}
                <Dialog open={confirmReturnOpen} onClose={() => setConfirmReturnOpen(false)}>
                    <DialogTitle>Generar orden de cambio</DialogTitle>
                    <DialogContent>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Esto creará una orden de <strong>CAMBIO</strong> basada en la orden {orderNo(order.name)}.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            • El cliente no paga (Total: $0) y no genera comisión<br />
                            • La lleva la agencia que entregó la orden (o la de su ciudad)<br />
                            • Lleva los mismos productos y tallas: la pieza buena sale de su almacén<br />
                            • La agencia retira la pieza defectuosa, que queda en su almacén como defectuosa<br />
                            • Es una sola carrera para la agencia
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmReturnOpen(false)} disabled={creatingReturn}>Cancelar</Button>
                        <ButtonCustom onClick={handleCreateReturn} disabled={creatingReturn}>
                            {creatingReturn ? 'Creando...' : 'Crear Cambio'}
                        </ButtonCustom>
                    </DialogActions>
                </Dialog>
                <RefundDialog
                    open={openRefund}
                    onClose={() => setOpenRefund(false)}
                    orderId={order.id}
                    orderName={order.name}
                    refundable={Math.max(0, Math.round((Number(order.current_total_price) - Number(order.refunded_usd || 0)) * 100) / 100)}
                    onSaved={refreshOrder}
                />
                <ProductSearchDialog open={openSearch} onClose={() => setOpenSearch(false)} onPick={(product) => { setUpsellCandidate(product); setOpenSearch(false); setShowUpsellConfirm(true); }} />
                <OrderInternalChat open={openInternalChat} onClose={() => setOpenInternalChat(false)} orderId={order.id} orderName={order.name} />
                <UpsellConfirmDialog
                    open={showUpsellConfirm}
                    onClose={() => setShowUpsellConfirm(false)}
                    orderId={order.id}
                    candidate={upsellCandidate}
                    title={isAddingRegular ? 'Confirmar Agregar Producto' : 'Confirmar Upsell'}
                    onConfirm={(qty, price, variantId) => { addUpsell(upsellCandidate.id, qty, price, !isAddingRegular, variantId); setShowUpsellConfirm(false); }}
                />
            </Dialog >
        </>
    );
};
