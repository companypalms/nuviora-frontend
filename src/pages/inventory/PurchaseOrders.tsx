import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Typography, Stack, Chip, Paper, Table, TableHead,
    TableRow, TableCell, TableBody, TableContainer, IconButton,
    Tooltip, TextField, MenuItem, Alert, Skeleton,
    Badge, Button, Divider, Avatar
} from '@mui/material';
import {
    ShoppingCart as CartIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    LocalShipping as ReceiveIcon,
    Cancel as CancelIcon,
    Visibility as ViewIcon,
    Send as SendIcon,
    CheckCircle as ConfirmIcon,
    People as SuppliersIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import {
    IPurchaseOrder, PurchaseOrderStatus,
    ISupplier, IWarehouse
} from '../../interfaces/inventory.types';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';
import { CreatePurchaseOrderDialog } from '../../components/inventory/CreatePurchaseOrderDialog';
import { ReceivePurchaseOrderDialog } from '../../components/inventory/ReceivePurchaseOrderDialog';
import { SupplierFormDialog } from '../../components/inventory/SupplierFormDialog';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' }> = {
    draft:     { label: 'Borrador',          color: 'default' },
    sent:      { label: 'Enviada',           color: 'info' },
    confirmed: { label: 'Confirmada',        color: 'primary' },
    partial:   { label: 'Recibida Parcial',  color: 'warning' },
    received:  { label: 'Recibida',          color: 'success' },
    cancelled: { label: 'Cancelada',         color: 'error' },
};

const OPEN_STATUSES: PurchaseOrderStatus[] = ['draft', 'sent', 'confirmed', 'partial'];
const ALL_STATUSES: PurchaseOrderStatus[]  = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'];

// ── Main component ─────────────────────────────────────────────────────────────

export const PurchaseOrders: React.FC<{ isEmbedded?: boolean }> = ({ isEmbedded }) => {
    const { loadingSession, isValid, user } = useValidateSession();

    const [orders, setOrders] = useState<IPurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected order for dialogs
    const [selectedOrder, setSelectedOrder] = useState<IPurchaseOrder | null>(null);

    // Dialogs
    const [createOpen, setCreateOpen] = useState(false);
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [supplierOpen, setSupplierOpen] = useState(false);
    const [editSupplier, setEditSupplier] = useState<ISupplier | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('open');
    const [supplierFilter, setSupplierFilter] = useState<string>('');

    // ── Load ──────────────────────────────────────────────────────────────────

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter === 'open') {
                params.set('status', OPEN_STATUSES.join(','));
            } else if (statusFilter && statusFilter !== 'all') {
                params.set('status', statusFilter);
            }
            if (supplierFilter) params.set('supplier_id', supplierFilter);
            params.set('per_page', '50');

            const [ordersRes, suppliersRes, warehousesRes] = await Promise.all([
                request(`/purchase-orders?${params.toString()}`, 'GET'),
                request('/suppliers', 'GET'),
                request('/warehouses', 'GET'),
            ]);

            if (ordersRes.status === 200) {
                const json = await ordersRes.response.json();
                setOrders(json.data?.data ?? []);
            }
            if (suppliersRes.status === 200) {
                const json = await suppliersRes.response.json();
                setSuppliers(json.data ?? []);
            }
            if (warehousesRes.status === 200) {
                const json = await warehousesRes.response.json();
                setWarehouses(json.data?.data ?? json.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter, supplierFilter]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const changeStatus = async (order: IPurchaseOrder, newStatus: PurchaseOrderStatus) => {
        const labels: Record<string, string> = { sent: 'Enviada', confirmed: 'Confirmada' };
        const label = labels[newStatus] ?? newStatus;
        const { status, response } = await request(`/purchase-orders/${order.id}/status`, 'POST', { status: newStatus });
        if (status === 200 || status === 201) {
            toast.success(`Orden ${order.reference_number} → ${label} ✅`);
            loadAll();
        } else {
            const err = await response.json().catch(() => ({ message: 'Error' }));
            toast.error(err.message);
        }
    };

    const cancelOrder = async (order: IPurchaseOrder) => {
        if (!window.confirm(`¿Cancelar la orden ${order.reference_number}?`)) return;
        const { status, response } = await request(`/purchase-orders/${order.id}/cancel`, 'POST');
        if (status === 200 || status === 201) {
            toast.success('Orden cancelada');
            loadAll();
        } else {
            const err = await response.json().catch(() => ({ message: 'Error' }));
            toast.error(err.message);
        }
    };

    const openReceive = async (order: IPurchaseOrder) => {
        // Load full order with items before opening dialog
        const { status, response } = await request(`/purchase-orders/${order.id}`, 'GET');
        if (status === 200) {
            const json = await response.json();
            setSelectedOrder(json.data);
            setReceiveOpen(true);
        } else {
            toast.error('No se pudo cargar la orden');
        }
    };

    // ── Stats ─────────────────────────────────────────────────────────────────

    const openCount  = orders.filter(o => OPEN_STATUSES.includes(o.status)).length;
    const totalUSD   = orders.filter(o => OPEN_STATUSES.includes(o.status)).reduce((acc, o) => acc + o.total_usd, 0);

    // ── Render ────────────────────────────────────────────────────────────────

    if (loadingSession || !isValid || !user.token) return <Loading />;

    const content = (
        <Box>

            {/* KPI Strip */}
            <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', flex: 1, minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">Órdenes Abiertas</Typography>
                    <Typography variant="h4" fontWeight="800" color="primary.main">{openCount}</Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', flex: 1, minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">Total Comprometido</Typography>
                    <Typography variant="h4" fontWeight="800" color="warning.main">
                        ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', flex: 1, minWidth: 140 }}>
                    <Typography variant="caption" color="text.secondary">Proveedores Activos</Typography>
                    <Typography variant="h4" fontWeight="800" color="success.main">
                        {suppliers.filter(s => s.is_active).length}
                    </Typography>
                </Paper>
            </Stack>

            {/* Toolbar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                    select size="small" label="Estado"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    sx={{ minWidth: 160 }}
                >
                    <MenuItem value="open">🟡 Abiertas</MenuItem>
                    <MenuItem value="all">Todas</MenuItem>
                    <Divider />
                    {ALL_STATUSES.map(s => (
                        <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
                    ))}
                </TextField>

                <TextField
                    select size="small" label="Proveedor"
                    value={supplierFilter}
                    onChange={e => setSupplierFilter(e.target.value)}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">Todos los proveedores</MenuItem>
                    {suppliers.map(s => (
                        <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                    ))}
                </TextField>

                <Box sx={{ flex: 1 }} />

                <Button
                    variant="outlined"
                    startIcon={<SuppliersIcon />}
                    onClick={() => { setEditSupplier(null); setSupplierOpen(true); }}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                    Proveedores
                </Button>

                <IconButton onClick={loadAll} disabled={loading}>
                    <RefreshIcon />
                </IconButton>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                >
                    Nueva OC
                </Button>
            </Stack>

            {/* Table */}
            {loading ? (
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
            ) : orders.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                    No hay órdenes de compra. Crea una desde aquí o desde la tabla de "Compras Sugeridas" del SCM.
                </Alert>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Referencia</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Proveedor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bodega</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Estado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Total USD</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Llegada Est.</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.map(order => {
                                const cfg = STATUS_CONFIG[order.status];
                                const isOpen = OPEN_STATUSES.includes(order.status);
                                const canReceive = ['sent', 'confirmed', 'partial'].includes(order.status);
                                const canSend = order.status === 'draft';
                                const canConfirm = order.status === 'sent';

                                return (
                                    <TableRow key={order.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold" color="primary">
                                                {order.reference_number}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {dayjs(order.created_at).format('DD/MM/YYYY')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.light' }}>
                                                    {order.supplier?.name?.[0]?.toUpperCase() ?? '?'}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2">{order.supplier?.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {order.supplier?.currency}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{order.warehouse?.name}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={cfg.label}
                                                color={cfg.color}
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold">
                                                ${(order.total_usd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {order.expected_at ? (
                                                <Typography variant="body2">
                                                    {dayjs(order.expected_at).format('DD/MM/YYYY')}
                                                </Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                {canSend && (
                                                    <Tooltip title="Marcar como Enviada">
                                                        <IconButton size="small" color="info" onClick={() => changeStatus(order, 'sent')}>
                                                            <SendIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {canConfirm && (
                                                    <Tooltip title="Marcar como Confirmada">
                                                        <IconButton size="small" color="primary" onClick={() => changeStatus(order, 'confirmed')}>
                                                            <ConfirmIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {canReceive && (
                                                    <Tooltip title="Registrar Recepción">
                                                        <IconButton size="small" color="success" onClick={() => openReceive(order)}>
                                                            <ReceiveIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {isOpen && (
                                                    <Tooltip title="Cancelar Orden">
                                                        <IconButton size="small" color="error" onClick={() => cancelOrder(order)}>
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialogs */}
            <CreatePurchaseOrderDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSuccess={loadAll}
                suppliers={suppliers}
                warehouses={warehouses}
            />

            {selectedOrder && (
                <ReceivePurchaseOrderDialog
                    open={receiveOpen}
                    onClose={() => setReceiveOpen(false)}
                    onSuccess={loadAll}
                    order={selectedOrder}
                />
            )}

            <SupplierFormDialog
                open={supplierOpen}
                onClose={() => setSupplierOpen(false)}
                onSuccess={loadAll}
                supplier={editSupplier}
            />
        </Box>
        );

    // When embedded inside InventoryDashboard — no extra layout or header
    if (isEmbedded) return content;

    // Standalone route — wrap with Layout + title
    return (
        <Layout>
            <DescripcionDeVista
                title="Órdenes de Compra"
                description="Gestión de compras al proveedor y recepción de mercancía"
            />
            {content}
        </Layout>
    );
};
