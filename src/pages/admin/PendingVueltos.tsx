import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Stack,
    Divider,
    Chip,
    IconButton,
    Tooltip,
    Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBackRounded, GroupsRounded } from '@mui/icons-material';
import { useUserStore } from '../../store/user/UserStore';
import {
    ContentCopyRounded,
    CloudUploadRounded,
    AccountBalanceRounded,
    PersonRounded,
    CalendarTodayRounded,
    AttachMoneyRounded,
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { Loading } from '../../components/ui/content/Loading';
import { toast } from 'react-toastify';
import { useValidateSession } from '../../hooks/useValidateSession';
import moment from 'moment';
import { blue, green, orange } from '@mui/material/colors';
import { OrderDialog } from '../../components/orders/OrderDialog';

// 🔥 Tarea 9: monto exacto en bolívares de cada vuelto, con la tasa guardada en la orden (change_rate).
// Fran: las tasas no se tocan y los vueltos se pagan solo en Bs.
const isBsMethod = (method?: string) => !!method && (method.startsWith('BOLIVARES') || method === 'PAGOMOVIL');
const vueltoBs = (order: any): number | null => {
    const rate = Number(order.change_rate);
    return rate > 0 ? Number(order.change_amount_company) * rate : null;
};
const fmtBs = (n: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const clientName = (order: any) =>
    `${order.client?.first_name ?? ''} ${order.client?.last_name ?? ''}`.trim() || 'Cliente sin nombre';

type VueltoGroup = { id: number; name: string; leader_id: number | null; leader: string | null };

/** La líder con vista simple no tiene menú lateral: se le da una barra con "volver". */
const Shell: React.FC<{ lite: boolean; children: React.ReactNode }> = ({ lite, children }) => {
    const navigate = useNavigate();
    if (!lite) return <Layout>{children}</Layout>;
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 1 }}>
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/ordenes')} sx={{ textTransform: 'none' }}>
                Mis órdenes
            </Button>
            {children}
        </Box>
    );
};

export const PendingVueltos: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [orders, setOrders] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    // Fran (30-sep): la líder paga los vueltos de su grupo; administración ve cuánto transferirle a cada una
    const [scope, setScope] = useState<'all' | 'group'>('all');
    const [myGroup, setMyGroup] = useState<{ id: number; name: string } | null>(null);
    const isLite = !!useUserStore((s) => s.user.is_lite_view);
    const role = useUserStore((s) => s.user.role?.description);
    const navigate = useNavigate();
    // Vueltos de la agencia con pago mixto que administración tiene que validar (Fran, 2026-10-03)
    const [toValidate, setToValidate] = useState(0);

    useEffect(() => {
        if (isValid) {
            loadPendingVueltos();
            loadBanks();
            if (role === 'Admin' || role === 'Gerente') loadToValidate();
        }
    }, [isValid, role]);

    const loadToValidate = async () => {
        const { status, response }: IResponse = await request('/orders/change-approvals', 'GET');
        if (status === 200) {
            const data = await response.json();
            setToValidate(data.orders?.length ?? 0);
        }
    };

    const loadBanks = async () => {
        const { status, response }: IResponse = await request('/banks', 'GET');
        if (status === 200) {
            const data = await response.json();
            setBanks(data);
        }
    };

    const loadPendingVueltos = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/orders/pending-vueltos', 'GET');
            if (status === 200) {
                const data = await response.json();
                setOrders(data.orders);
                setScope(data.scope === 'group' ? 'group' : 'all');
                setMyGroup(data.group ?? null);
            }
        } catch (error) {
            toast.error('Error al cargar vueltos pendientes');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyDetails = (order: any) => {
        const details = order.change_payment_details;
        if (!details) return;

        let text = "";
        const method = order.change_method_company;

        const getBankName = (id: any) => banks.find(b => b.id === id)?.name || "N/A";

        const bs = vueltoBs(order);
        const amountLine = bs !== null ? `\nMonto: Bs. ${fmtBs(bs)}` : '';

        if (method === 'BOLIVARES_PAGOMOVIL') {
            // Fran (2026-10-06): solo los datos para pegar en el pago móvil, igual que el botón de la ficha
            // (OrderChangeSection): CÓDIGO_BANCO CÉDULA TELÉFONO MONTO, sin rótulos ni nombre del banco.
            const code = banks.find(b => b.id === details.bank_id)?.code;
            const phone = `${details.phone_prefix || ''}${details.phone_number || ''}`;
            const amount = bs !== null ? bs.toFixed(2).replace('.', ',') : '';
            text = [code, details.cedula, phone, amount].filter(Boolean).join(' ');
        } else if (method === 'BOLIVARES_TRANSFERENCIA') {
            text = `TRANSFERENCIA BANCARIA\nCuenta: ${details.account_number}\nCédula: ${details.cedula}\nBanco: ${getBankName(details.bank_id)}${amountLine}`;
        } else if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES', 'ZINLI_DOLARES'].includes(method)) {
            text = `${method.split('_')[0]}: ${details.email}`;
        }

        if (text) {
            navigator.clipboard.writeText(text);
            toast.info("Datos del cliente copiados 📋");
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    const bsOrders = orders.filter((o) => isBsMethod(o.change_method_company));
    const totalBs = bsOrders.reduce((acc, o) => acc + (vueltoBs(o) ?? 0), 0);
    const withoutRate = bsOrders.filter((o) => vueltoBs(o) === null).length;
    const otherOrders = orders.length - bsOrders.length;

    // Total en Bs por grupo (lo que administración le transfiere a cada líder); sin grupo, lo paga administración
    const byGroup = Object.values(bsOrders.reduce((acc: Record<string, { group: VueltoGroup | null; count: number; bs: number }>, o) => {
        const key = o.vuelto_group ? String(o.vuelto_group.id) : 'none';
        acc[key] ??= { group: o.vuelto_group ?? null, count: 0, bs: 0 };
        acc[key].count += 1;
        acc[key].bs += vueltoBs(o) ?? 0;
        return acc;
    }, {})).sort((a, b) => (a.group ? 0 : 1) - (b.group ? 0 : 1) || b.bs - a.bs);

    return (
        <Shell lite={isLite}>
            <Box sx={{ p: 2 }}>
                <DescripcionDeVista
                    title={scope === 'group' ? `Vueltos de mi grupo${myGroup ? ` · ${myGroup.name}` : ''}` : 'Vueltos Pendientes'}
                    description={scope === 'group'
                        ? 'Los vueltos de los clientes de tus vendedoras. Administración te transfiere el total; tú haces cada pago móvil y subes el comprobante en la orden.'
                        : 'Órdenes entregadas con vuelto por pagar. Cada líder paga los de su grupo: transfiérele el total de su grupo. Los que no tienen grupo los paga administración.'}
                />

                {toValidate > 0 && (
                    <Alert
                        severity="warning"
                        sx={{ mt: 2, borderRadius: 2 }}
                        action={<Button color="inherit" size="small" onClick={() => navigate('/admin/vueltos-por-validar')}>Ver</Button>}
                    >
                        {toValidate === 1 ? 'Hay 1 vuelto de agencia por validar' : `Hay ${toValidate} vueltos de agencia por validar`} (el cliente pagó en efectivo y digital).
                    </Alert>
                )}

                {loading && orders.length === 0 ? (
                    <Loading />
                ) : orders.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
                        <AccountBalanceRounded sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">No hay vueltos pendientes por pagar</Typography>
                    </Box>
                ) : (
                    <>
                    <Card sx={{ mt: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                {scope === 'group' ? 'TOTAL DE TUS VUELTOS POR PAGAR, EN BOLÍVARES' : 'TOTAL A TRANSFERIR EN BOLÍVARES'}
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                                Bs. {fmtBs(totalBs)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {bsOrders.length} vuelto{bsOrders.length === 1 ? '' : 's'} en bolívares, calculado{bsOrders.length === 1 ? '' : 's'} con la tasa guardada en cada orden.
                            </Typography>
                            {withoutRate > 0 && (
                                <Typography variant="body2" color="error">
                                    ⚠ {withoutRate} orden{withoutRate === 1 ? '' : 'es'} sin tasa guardada: no {withoutRate === 1 ? 'entra' : 'entran'} en el total.
                                </Typography>
                            )}
                            {otherOrders > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    {otherOrders} vuelto{otherOrders === 1 ? '' : 's'} con otro método (dólares) fuera del total.
                                </Typography>
                            )}
                            {scope === 'all' && byGroup.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                        A TRANSFERIR A CADA LÍDER
                                    </Typography>
                                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                                        {byGroup.map((g) => (
                                            <Box key={g.group?.id ?? 'none'} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                <GroupsRounded fontSize="small" color={g.group ? 'warning' : 'disabled'} />
                                                <Typography variant="body2" sx={{ flex: 1, minWidth: 180 }}>
                                                    {g.group
                                                        ? <><b>{g.group.leader ?? 'Sin líder'}</b> · {g.group.name}</>
                                                        : <><b>Sin grupo</b> · los paga administración</>}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {g.count} vuelto{g.count === 1 ? '' : 's'}
                                                </Typography>
                                                <Typography variant="body1" fontWeight="bold" sx={{ minWidth: 130, textAlign: 'right' }}>
                                                    Bs. {fmtBs(g.bs)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {orders.map((order) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={order.id}>
                                <Card sx={{
                                    borderRadius: 4,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: '0.3s',
                                    '&:hover': { boxShadow: 4 }
                                }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold" color="primary">
                                                    #{order.order_number}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {moment(order.processed_at).format('DD/MM/YYYY hh:mm A')}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={order.change_method_company?.replace('_', ' ')}
                                                size="small"
                                                color="info"
                                                variant="outlined"
                                            />
                                        </Stack>

                                        <Divider sx={{ my: 1.5 }} />

                                        <Stack spacing={1}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PersonRounded fontSize="small" color="disabled" />
                                                <Typography variant="body2">{clientName(order)}</Typography>
                                            </Box>
                                            {order.agent && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Vendedora: {order.agent.names}
                                                    </Typography>
                                                    {scope === 'all' && order.vuelto_group && (
                                                        <Chip size="small" variant="outlined" color="warning" label={`Grupo de ${order.vuelto_group.leader ?? order.vuelto_group.name}`} sx={{ height: 18, fontSize: '0.65rem' }} />
                                                    )}
                                                </Box>
                                            )}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AttachMoneyRounded fontSize="small" color="success" />
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    Vuelto: ${Number(order.change_amount_company).toFixed(2)}
                                                </Typography>
                                            </Box>
                                            {isBsMethod(order.change_method_company) && (
                                                <Typography variant="body2" sx={{ pl: 4 }} color={vueltoBs(order) === null ? 'error' : 'text.primary'}>
                                                    {vueltoBs(order) !== null
                                                        ? <>A transferir: <b>Bs. {fmtBs(vueltoBs(order)!)}</b> (tasa {fmtBs(Number(order.change_rate))})</>
                                                        : '⚠ Sin tasa guardada en la orden'}
                                                </Typography>
                                            )}
                                        </Stack>

                                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                                            <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
                                                MÉTODO: {order.change_method_company}
                                            </Typography>
                                            {order.change_payment_details ? (
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                    Datos disponibles para copiar
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="error" sx={{ fontSize: '0.75rem' }}>
                                                    ⚠ Sin datos de pago cargados
                                                </Typography>
                                            )}
                                        </Box>

                                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                startIcon={<ContentCopyRounded />}
                                                disabled={!order.change_payment_details}
                                                onClick={() => handleCopyDetails(order)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Copiar
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => setSelectedOrder(order)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Ver
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    </>
                )}
            </Box>

            {selectedOrder && (
                <OrderDialog
                    id={selectedOrder.id}
                    open={!!selectedOrder}
                    setOpen={(val) => {
                        if (!val) {
                            setSelectedOrder(null);
                            loadPendingVueltos();
                        }
                    }}
                />
            )}
        </Shell>
    );
};
