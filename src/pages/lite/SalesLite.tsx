import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LiteTopBar } from './LiteTopBar';
import { LiteOrderCards, OrderStatusInfo, StatusChip, WhatsAppBubble } from './LiteOrderCards';
import {
    Box,
    Typography,
    Tabs,
    useTheme,
    alpha,
    Tab,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    CircularProgress,
    TextField,
    InputAdornment,
    Button,
    Collapse,
    useMediaQuery
} from '@mui/material';
import { useUserStore } from '../../store/user/UserStore';
import { request } from '../../common/request';
import { toast, ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import { Layout } from '../../components/ui/Layout'; // Removed per request
import { SearchRounded, RefreshRounded } from '@mui/icons-material';
import { orange } from '@mui/material/colors';
import { LiteOrderDialog } from './LiteOrderDialog';
import { LiteNotificationMonitor } from './LiteNotificationMonitor';
import { LiteBroadcastMonitor } from './LiteBroadcastMonitor';
import { BankAccountsDialog } from '../../components/orders/BankAccountsDialog';
import { CreateOrderDialog } from '../../components/orders/CreateOrderDialog';
import { DailyRatesDialog } from '../../components/orders/DailyRatesDialog';
import { PhoneActionMenu } from '../../components/orders/PhoneActionMenu';
import { useOrdersStore } from '../../store/orders/OrdersStore';
import { LeaderViewSelect } from '../my-group/LeaderViewSelect';
import { LeaderView, MY_ORDERS, appendLeaderView } from '../my-group/leaderView';
import { orderNo } from "../../lib/functions";

// Componente simple de Tabla Lite
const LiteOrderTable = ({ statusTitle, searchTerm, onRefresh, onDataUpdate, leaderView = MY_ORDERS }: any) => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    // En el teléfono, tarjetas: la tabla no cabe (2026-10-03)
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null); // Para abrir el Dialog Lite
    const [openDialog, setOpenDialog] = useState(false);

    // Fetch data logic
    const fetchOrders = useCallback(async (reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const pageToLoad = reset ? 1 : page;
            const params = new URLSearchParams();
            params.append('per_page', '25');
            params.append('page', pageToLoad.toString());
            params.append('status', statusTitle);
            if (searchTerm) params.append('search', searchTerm);
            appendLeaderView(params, leaderView);

            const { status, response } = await request(`/orders?${params.toString()}`, 'GET');
            if (status === 200) {
                const data = await response.json();
                if (reset) {
                    setOrders(data.data);
                    setPage(2);
                } else {
                    setOrders(prev => [...prev, ...data.data]);
                    setPage(prev => prev + 1);
                }
                setHasMore(data.meta.last_page >= pageToLoad + 1);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error cargando órdenes");
        } finally {
            setLoading(false);
        }
    }, [loading, page, statusTitle, searchTerm, leaderView]);

    // Efecto para cargar al cambiar status, búsqueda o vista de la Líder
    useEffect(() => {
        fetchOrders(true);
    }, [statusTitle, searchTerm, leaderView]);

    // Exponer refresh al padre si fuera necesario (aquí lo usamos interno)
    useEffect(() => {
        if (onRefresh) onRefresh.current = () => fetchOrders(true);
    }, [onRefresh, statusTitle]);



    const handleOpenOrder = (order: any, tab?: string) => {
        if (tab) {
            useOrdersStore.getState().setInitialTabId(tab);
        } else {
            useOrdersStore.getState().setInitialTabId('detail');
        }
        setSelectedOrder(order);
        setOpenDialog(true);
    };

    const handleOpenOrderById = useCallback((id: number) => {
        setSelectedOrder({ id });
        setOpenDialog(true);
    }, []);

    return (
        <React.Fragment>
            <LiteNotificationMonitor orders={orders} onOpenOrder={handleOpenOrderById} />
            <LiteBroadcastMonitor
                onOrderUpdate={(reset) => {
                    fetchOrders(reset);
                    if (onDataUpdate) onDataUpdate();
                }}
                onOpenOrder={handleOpenOrderById}
            />
            {isMobile ? (
                <LiteOrderCards
                    orders={orders}
                    loading={loading}
                    hasMore={hasMore}
                    userId={user.id}
                    showWhatsApp={user.role?.description !== 'Agencia'}
                    onOpen={handleOpenOrder}
                    onLoadMore={() => fetchOrders(false)}
                />
            ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: '70vh', bgcolor: 'background.paper' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID / Cliente</TableCell>
                            <TableCell>Detalles</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        {orderNo(order.name)}
                                    </Typography>
                                    {order.agent && order.agent_id !== user.id && (
                                        <Chip size="small" variant="outlined" color="warning" label={`de ${order.agent.names}`} sx={{ height: 20, fontSize: '0.7rem', mb: 0.25 }} />
                                    )}
                                    <Typography variant="body2" color="text.secondary">
                                        {order.client?.first_name} {order.client?.last_name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PhoneActionMenu
                                            phone={order.client.phone}
                                            sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                                        />
                                        {user.role?.description !== 'Agencia' && (
                                            <WhatsAppBubble count={order.whatsapp_unread_count || 0} onClick={() => handleOpenOrder(order, 'whatsapp')} />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                        {order.current_total_price} {order.currency}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {order.item_count || order.products?.length || '?'} items
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <StatusChip status={order.status?.description} />
                                    <OrderStatusInfo order={order} onOpenDetail={() => handleOpenOrder(order, 'detail')} />
                                </TableCell>
                                <TableCell align="right">
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => handleOpenOrder(order)}
                                        sx={{ borderRadius: 4, textTransform: 'none', px: 2 }}
                                    >
                                        Gestionar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No hay órdenes en esta bandeja</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && hasMore && orders.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Button onClick={() => fetchOrders(false)} size="small">Cargar más</Button>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            )}

            {/* Reemplazo por LiteOrderDialog */}
            {selectedOrder && (
                <LiteOrderDialog
                    open={openDialog}
                    setOpen={setOpenDialog}
                    id={selectedOrder.id}
                    onClose={() => {
                        // Forzamos actualización al cerrar
                        fetchOrders(true);
                        // También podríamos disparar actualización de contadores mediante prop si lo pasamos
                        if (onRefresh && onRefresh.current) onRefresh.current();
                        if (onDataUpdate) onDataUpdate();
                    }}
                />
            )}
        </React.Fragment>
    );
};

export const SalesLite = () => {
    const user = useUserStore((state) => state.user);
    const logout = useUserStore((state) => state.logout);
    const validateToken = useUserStore((state) => state.validateToken);
    const theme = useTheme();
    const [currentTab, setCurrentTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [commissions, setCommissions] = useState(0);
    const [loadingCommissions, setLoadingCommissions] = useState(false);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const refreshRef = useRef<any>(null);
    const [openBankDialog, setOpenBankDialog] = useState(false);
    const [openRatesDialog, setOpenRatesDialog] = useState(false);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [showTestPanel, setShowTestPanel] = useState(false);
    // Solo la Líder: ver sus órdenes, las de su grupo o las de una vendedora
    const [leaderView, setLeaderView] = useState<LeaderView>(MY_ORDERS);
    const leaderViewRef = useRef<LeaderView>(MY_ORDERS);

    useEffect(() => {
        leaderViewRef.current = leaderView;
        if (user.id) fetchCounts();
    }, [leaderView]);

    useEffect(() => {
        if (!user.id) {
            validateToken();
        } else {
            fetchCommissions();
            fetchCounts();
        }
    }, [user.id, validateToken]);

    // Polling unificado: cada 45s refresca ordenes, contadores y comisiones
    useEffect(() => {
        if (!user.id) return;

        const interval = setInterval(() => {
            // 1. Refrescar Ordenes (si la tab está montada y ref asignada)
            if (refreshRef.current) {
                refreshRef.current();
            }
            // 2. Refrescar Contadores y Comisiones
            fetchCounts();
            fetchCommissions();
        }, 45000);

        return () => clearInterval(interval);
    }, [user.id]);

    const fetchCounts = async () => {
        try {
            const params = new URLSearchParams();
            appendLeaderView(params, leaderViewRef.current);
            const query = params.toString();
            const { status, response } = await request(`/orders/lite/counts${query ? `?${query}` : ''}`, 'GET');
            if (status === 200) {
                const data = await response.json();
                setCounts(data.counts || {});
            }
        } catch (e) {
            console.error("Error fetching counts", e);
        }
    };

    const fetchCommissions = async () => {
        if (loadingCommissions) return;
        setLoadingCommissions(true);
        try {
            const { status, response } = await request('/earnings/me', 'GET');
            if (status === 200) {
                const body = await response.json();
                // Backend returns: { status: true, data: { amount_usd: ... } }
                setCommissions(Number(body.data?.amount_usd) || 0);
            }
        } catch (e) {
            console.error("Error fetching commissions", e);
        } finally {
            setLoadingCommissions(false);
        }
    };

    const handleLogout = async () => {
        if (await logout()) {
            window.location.href = "/";
        }
    };

    const triggerTestNoti = async (type: string) => {
        try {
            const body = new URLSearchParams();
            body.append('type', type);
            const { status, response } = await request('/test/notifications', 'POST', body);
            if (status === 200) {
                toast.success(`Disparada: ${type}`);
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al disparar notificación");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error de conexión");
        }
    };

    // Definimos las Tabs disponibles para la vendedora Lite (Ajustado a requerimiento)
    const TABS = [
        { label: "Reprogramado Hoy", status: "Reprogramado para hoy" },
        { label: "Asignado a Mí", status: "Asignado a vendedor" },
        { label: "Sin Stock", status: "Sin Stock" },
        { label: "Con Comprobante", status: "Con Comprobante" },
        { label: "Llamado 1", status: "Llamado 1" },
        { label: "Llamado 2", status: "Llamado 2" },
        { label: "Llamado 3", status: "Llamado 3" },
        { label: "Esperando Ubicación", status: "Esperando Ubicacion" },
        { label: "Listo para Agencia", status: "Asignar a agencia" },
        { label: "Para Más Tarde", status: "Programado para mas tarde" },
        { label: "Programado otro día", status: "Programado para otro dia" },
        { label: "Novedades", status: "Novedades" },
        { label: "Novedad Solucionada", status: "Novedad Solucionada" },
        { label: "Entregadas", status: "Entregado" },
        { label: "Canceladas", status: "Cancelado" }
    ];

    const getCurrentStatus = () => TABS[currentTab].status;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', fontFamily: 'inherit', transition: 'background-color 0.3s' }}>
            <LiteTopBar
                commissions={commissions}
                loadingCommissions={loadingCommissions}
                onRefresh={() => { fetchCommissions(); fetchCounts(); }}
                onCreate={() => setOpenCreateDialog(true)}
                onBankAccounts={() => setOpenBankDialog(true)}
                onRates={() => setOpenRatesDialog(true)}
                onToggleTestPanel={() => setShowTestPanel((v) => !v)}
                onLogout={handleLogout}
            />

            {/* CONTENIDO PRINCIPAL */}
            <Box sx={{ maxWidth: 1000, margin: '0 auto', width: '100%', p: { xs: 1, md: 3 } }}>

                {/* Buscador Integrado */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: { xs: 2, md: 3 }, alignItems: 'center' }}>
                    <TextField
                        sx={{ flex: { xs: '1 1 100%', sm: '1 1 240px' } }}
                        placeholder="Buscar cliente, teléfono o #orden..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded color="action" />
                                </InputAdornment>
                            ),
                            sx: { bgcolor: 'background.paper', borderRadius: 3 }
                        }}
                        variant="outlined"
                        size="small"
                    />
                    {user.leader_group && (
                        <Box sx={{ flex: { xs: '1 1 0', sm: '0 0 220px' }, minWidth: 0 }}>
                            <LeaderViewSelect value={leaderView} onChange={setLeaderView} minWidth={0} fullWidth />
                        </Box>
                    )}
                    <IconButton aria-label="Actualizar órdenes" sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', ml: 'auto' }} onClick={() => refreshRef.current && refreshRef.current()}>
                        <RefreshRounded />
                    </IconButton>
                </Box>

                {/* TEST NOTIFICATION PANEL */}
                <Collapse in={showTestPanel}>
                    <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px dashed orange', bgcolor: alpha(orange[500], 0.05) }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: orange[800] }}>🛠 PANEL DE PRUEBAS - NOTIFICACIONES</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Button size="small" variant="outlined" color="primary" onClick={() => triggerTestNoti('assigned')}>Test Asignación</Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => triggerTestNoti('novelty')}>Test Novedad</Button>
                            <Button size="small" variant="outlined" color="success" onClick={() => triggerTestNoti('resolved')}>Test Resuelta</Button>
                            <Button size="small" variant="outlined" color="info" onClick={() => triggerTestNoti('scheduled')}>Test Posponer</Button>
                            <Button size="small" variant="outlined" color="warning" onClick={() => triggerTestNoti('waiting')}>Test Espera</Button>
                        </Box>
                    </Paper>
                </Collapse>

                {/* Tabs de Navegación */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, bgcolor: 'background.paper', borderRadius: 2, px: { xs: 0, sm: 2 } }}>
                    <Tabs
                        value={currentTab}
                        onChange={(_, v) => setCurrentTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {TABS.map((tab, idx) => (
                            <Tab
                                key={idx}
                                label={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {tab.label}
                                        <Chip
                                            label={counts[tab.status] || 0}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                minWidth: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                bgcolor: currentTab === idx ? 'primary.main' : alpha(theme.palette.text.primary, 0.1),
                                                color: currentTab === idx ? 'white' : 'text.primary'
                                            }}
                                        />
                                    </Box>
                                }
                                sx={{ borderRadius: 2, minHeight: 48, textTransform: 'none', fontWeight: 'bold', px: { xs: 1.25, sm: 2 }, minWidth: 0, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            />
                        ))}
                    </Tabs>
                </Box>

                {/* Contenido de la Tabla */}
                {/* Contenido de la Tabla */}
                <LiteOrderTable
                    statusTitle={getCurrentStatus()}
                    searchTerm={searchTerm}
                    onRefresh={refreshRef}
                    onDataUpdate={fetchCounts}
                    leaderView={leaderView}
                />
            </Box>

            {/* Dialogo de Cuentas, Tasas, Crear Orden */}
            <BankAccountsDialog open={openBankDialog} onClose={() => setOpenBankDialog(false)} />
            <DailyRatesDialog open={openRatesDialog} onClose={() => setOpenRatesDialog(false)} />
            <CreateOrderDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                onSuccess={() => {
                    if (refreshRef.current) refreshRef.current();
                    fetchCounts();
                }}
            />

            <ToastContainer
                stacked
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={user.theme || 'dark'}
                transition={Bounce}
            />
        </Box>
    );
};
