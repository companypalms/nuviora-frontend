import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Card,
    CardContent,
    Stack,
    Divider,
    IconButton,
    Collapse,
    useTheme,
    LinearProgress,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Toolbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    FunnelChart,
    Funnel,
    LabelList,
} from 'recharts';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { request } from '../common/request';
import { IResponse } from '../interfaces/response-type';
import { useUserStore } from '../store/user/UserStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { OrderDialog } from '../components/orders/OrderDialog';
import { blue, green, orange, red, grey } from '@mui/material/colors';
import { lighten } from '@mui/material/styles';
import { Layout } from '../components/ui/Layout';

const COLORS = [blue[500], green[500], orange[500], red[500], grey[500], '#8884d8', '#82ca9d', '#ffc658'];

export const BusinessMetrics: React.FC = () => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [sellerId, setSellerId] = useState('');
    const [agencyId, setAgencyId] = useState('');
    const [productId, setProductId] = useState('');

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        sectionA: true,
        sectionB: true,
        sectionC: true,
        sectionD: true,
        sectionE: true,
    });

    // Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
    const [dialogTitle, setDialogTitle] = useState('');
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    const handleOpenDialog = (title: string, orders: any[]) => {
        setDialogTitle(title);
        setSelectedOrders(orders || []);
        setOpenDialog(true);
    };

    const handleOpenOrderDetails = (id: number) => {
        setSelectedOrderId(id);
        setShowOrderDetails(true);
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                seller_id: sellerId,
                agency_id: agencyId,
                product_id: productId,
            });
            const { status, response }: IResponse = await request(`/business-metrics?${query.toString()}`, 'GET');
            if (status) {
                const json = await response.json();
                setData(json.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (user?.role?.description !== 'Admin') {
        return <Navigate to="/dashboard" />;
    }

    const StatCard = ({ title, value, icon, color, subValue }: any) => (
        <Card sx={{ height: '100%', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="overline" color="text.secondary" fontWeight="bold">
                        {title}
                    </Typography>
                    <Box sx={{ p: 1, bgcolor: lighten(color, 0.8), color: color, borderRadius: 2, display: 'flex' }}>
                        {icon}
                    </Box>
                </Stack>
                <Typography variant="h4" fontWeight="black">
                    {value}
                </Typography>
                {subValue && (
                    <Typography variant="caption" color="text.secondary">
                        {subValue}
                    </Typography>
                )}
            </CardContent>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: color }} />
        </Card>
    );

    const ChartContainer = ({ title, children, sectionId }: any) => (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={expandedSections[sectionId] ? 3 : 0}>
                <Typography variant="h6" fontWeight="bold">
                    {title}
                </Typography>
                <IconButton onClick={() => toggleSection(sectionId)}>
                    {expandedSections[sectionId] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            </Stack>
            <Collapse in={expandedSections[sectionId]}>
                <Box sx={{ width: '100%', mt: 2 }}>
                    {children}
                </Box>
            </Collapse>
        </Paper>
    );

    if (!data && loading) {
        return (
            <Layout>
                <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                    <CircularProgress />
                </Box>
            </Layout>
        );
    }

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ p: 4, maxWidth: 1600, mx: 'auto' }}>
                {/* Header & Filters */}
                <Paper sx={{ p: 3, borderRadius: 4, mb: 4, bgcolor: isDark ? 'background.paper' : 'white' }}>
                    <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(-1)}
                            sx={{ color: 'text.secondary', width: 'fit-content' }}
                        >
                            Volver
                        </Button>
                    </Stack>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" fontWeight="black" gutterBottom>
                                🏢 Métricas del Negocio
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Panel analítico estratégico para la toma de decisiones.
                            </Typography>
                        </Box>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
                            <TextField
                                type="date"
                                label="Inicio"
                                size="small"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                type="date"
                                label="Fin"
                                size="small"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Vendedora</InputLabel>
                                <Select
                                    value={sellerId}
                                    label="Vendedora"
                                    onChange={(e) => setSellerId(e.target.value)}
                                >
                                    <MenuItem value="">Todas</MenuItem>
                                    {data?.filters?.sellers?.map((s: any) => (
                                        <MenuItem key={s.id} value={s.id}>{s.names}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Agencia</InputLabel>
                                <Select
                                    value={agencyId}
                                    label="Agencia"
                                    onChange={(e) => setAgencyId(e.target.value)}
                                >
                                    <MenuItem value="">Todas</MenuItem>
                                    {data?.filters?.agencies?.map((a: any) => (
                                        <MenuItem key={a.id} value={a.id}>{a.names}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                startIcon={<TrendingUpIcon />}
                                onClick={fetchData}
                                disabled={loading}
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                {loading ? "Calculando..." : "Actualizar"}
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {/* SECCIÓN A: FLUJO DE PEDIDOS NUEVOS */}
                <ChartContainer title="🔄 Flujo de Pedidos Nuevos" sectionId="sectionA">
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, lg: 8 }}>
                            {/* Make height explicit and ensure Grid item has width */}
                            <Box sx={{ height: 400, width: '100%', minHeight: 300, position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.sectionA?.tracking} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {data?.sectionA?.tracking?.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </Grid>
                        <Grid size={{ xs: 12, lg: 4 }}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" mb={2}>Análisis de Novedades</Typography>
                                    <StatCard
                                        title="% Pedidos con Novedad"
                                        value={`${data?.sectionA?.novelties?.total_percentage || 0}%`}
                                        icon={<ErrorOutlineIcon />}
                                        color={orange[500]}
                                        subValue={`Promedio: ${data?.sectionA?.novelties?.avg_per_order || 0} por pedido`}
                                    />
                                </Box>
                                <Box>
                                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Tipo de Novedad</TableCell>
                                                    <TableCell align="right">%</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.entries(data?.sectionA?.novelties?.distribution || {}).map(([key, val]: any) => (
                                                    <TableRow key={key}>
                                                        <TableCell sx={{ fontSize: '0.75rem' }}>{key}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{val.percentage}%</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            </Stack>
                        </Grid>

                        {/* Break to new row for the bottom table */}
                        <Grid size={{ xs: 12 }}>
                            <Box mt={2}>
                                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                                    <Table>
                                        <TableHead sx={{ bgcolor: isDark ? grey[900] : grey[50] }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Estado del Tracking</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Penetración (%)</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {data?.sectionA?.tracking?.map((row: any) => (
                                                <TableRow key={row.name}>
                                                    <TableCell>{row.name}</TableCell>
                                                    <TableCell align="center">
                                                        <Button
                                                            variant="text"
                                                            color="primary"
                                                            size="small"
                                                            onClick={() => handleOpenDialog(row.name, row.orders)}
                                                            sx={{ fontWeight: 'bold' }}
                                                        >
                                                            {row.count}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box display="flex" alignItems="center" px={4}>
                                                            <LinearProgress variant="determinate" value={row.percentage} sx={{ flex: 1, height: 8, borderRadius: 4, mr: 2 }} />
                                                            <Typography variant="body2" fontWeight="bold">{row.percentage}%</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={row.percentage > 50 ? "Alto" : row.percentage > 20 ? "Medio" : "Bajo"} size="small" color={row.percentage > 50 ? "success" : "default"} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Grid>
                    </Grid>
                </ChartContainer>

                {/* Dialog para ver detalles de órdenes */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogContent dividers>
                        {selectedOrders && selectedOrders.length > 0 ? (
                            <List>
                                {selectedOrders.map((order: any) => (
                                    <React.Fragment key={order.id}>
                                        <ListItem alignItems="flex-start">
                                            <ListItemText
                                                primary={<Typography fontWeight="bold">{order.display_number} - {order.client}</Typography>}
                                                secondary={`ID: ${order.id}`}
                                            />
                                            <Button size="small" variant="outlined" onClick={() => handleOpenOrderDetails(order.id)}>
                                                Ver
                                            </Button>
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary" align="center">No hay órdenes para mostrar.</Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDialog(false)}>Cerrar</Button>
                    </DialogActions>
                </Dialog>

                {/* SECCIÓN B: RESULTADO DE PROGRAMADO PARA HOY */}
                <ChartContainer title="📅 Resultado de 'Programado para Hoy'" sectionId="sectionB">
                    <Grid container spacing={4} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <StatCard
                                title="Total Programados"
                                value={data?.sectionB?.total || 0}
                                icon={<TrendingUpIcon />}
                                color={blue[500]}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                                Nota: Estos son pedidos programados en días anteriores para ser gestionados hoy.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Box sx={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <FunnelChart>
                                        <RechartsTooltip />
                                        <Funnel
                                            dataKey="count"
                                            data={data?.sectionB?.funnel || []}
                                            isAnimationActive
                                        >
                                            <LabelList position="right" fill={isDark ? "white" : "black"} dataKey="name" />
                                        </Funnel>
                                    </FunnelChart>
                                </ResponsiveContainer>
                            </Box>
                        </Grid>
                    </Grid>
                </ChartContainer>

                {/* SECCIÓN C: VENDEDORAS */}
                <ChartContainer title="👩‍💼 Rendimiento de Vendedoras" sectionId="sectionC">
                    <Grid container spacing={3}>
                        {data?.sectionC?.vendedoras?.map((v: any) => (
                            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={v.id}>
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                    <Typography variant="h6" fontWeight="bold" mb={2}>{v.name}</Typography>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Asignados</Typography>
                                            <Typography variant="h5" fontWeight="bold">{v.stats.assigned}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Tasa Entrega</Typography>
                                            <Typography variant="h5" fontWeight="bold" color={green[500]}>{v.stats.delivery_rate}%</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Tasa Agencia</Typography>
                                            <Typography variant="h5" fontWeight="bold" color={blue[500]}>{v.stats.agency_rate}%</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" color="text.secondary">Tasa Cancelado</Typography>
                                            <Typography variant="h5" fontWeight="bold" color={red[500]}>{v.stats.cancel_rate}%</Typography>
                                        </Grid>
                                    </Grid>
                                    <Divider sx={{ my: 2 }} />
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2">Novedades Solucionadas:</Typography>
                                        <Typography variant="body2" fontWeight="bold">{v.novelties.resolved_rate}%</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={v.novelties.resolved_rate}
                                        color={v.novelties.resolved_rate > 70 ? "success" : "warning"}
                                        sx={{ mt: 1, height: 6, borderRadius: 3 }}
                                    />
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </ChartContainer>

                {/* SECCIÓN D: AGENCIAS */}
                <ChartContainer title="🚚 Eficiencia de Agencias" sectionId="sectionD">
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: isDark ? grey[900] : grey[50] }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Agencia</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Recibidos</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>% En Ruta</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>% Novedad</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>% Entregado</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>% Cancelado</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data?.sectionD?.agencias?.map((row: any) => (
                                    <TableRow key={row.name} hover>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{row.name}</TableCell>
                                        <TableCell align="center">{row.stats.received}</TableCell>
                                        <TableCell align="center">
                                            <Chip label={`${row.stats.in_route_rate}%`} size="small" variant="outlined" color="primary" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color={red[400]} fontWeight="bold">{row.stats.novelty_rate}%</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" color={green[500]} fontWeight="heavy">{row.stats.delivered_rate}%</Typography>
                                        </TableCell>
                                        <TableCell align="center">{row.stats.cancel_rate}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </ChartContainer>

                {/* SECCIÓN E: PRODUCTOS */}
                <ChartContainer title="📦 Desempeño por Producto" sectionId="sectionE">
                    <Grid container spacing={3}>
                        {data?.sectionE?.productos?.map((p: any) => (
                            <Grid size={{ xs: 12 }} key={p.id}>
                                <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                                        <Box>
                                            <Typography variant="h6" fontWeight="bold">{p.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">Total Pedidos: {p.volume.total}</Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={3}>
                                            <Box textAlign="center">
                                                <Typography variant="caption" sx={{ display: 'block' }}>Efectividad Entrega</Typography>
                                                <Typography variant="h5" fontWeight="black" color={green[500]}>{p.effectiveness}%</Typography>
                                            </Box>
                                            <Box textAlign="center">
                                                <Typography variant="caption" sx={{ display: 'block' }}>Tasa Rechazo</Typography>
                                                <Typography variant="h5" fontWeight="black" color={red[500]}>{p.quality.rejection_rate}%</Typography>
                                            </Box>
                                        </Box>
                                    </Stack>
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12 }}>
                                            <Stack direction="row" spacing={1} sx={{ width: '100%', height: 24, bgcolor: grey[200], borderRadius: 12, overflow: 'hidden' }}>
                                                <Box sx={{ width: `${p.effectiveness}%`, bgcolor: green[500], transition: 'width 1s' }} />
                                                <Box sx={{ width: `${p.quality.rejection_rate}%`, bgcolor: red[500], transition: 'width 1s' }} />
                                                <Box sx={{ flex: 1, bgcolor: grey[300] }} />
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between" mt={1}>
                                                <Typography variant="caption">Entrega: {p.volume.delivered}</Typography>
                                                <Typography variant="caption">Rechazo: {p.volume.rejected}</Typography>
                                                <Typography variant="caption">Cancelado: {p.volume.cancelled}</Typography>
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </ChartContainer>
            </Box>

            <OrderDialog
                open={showOrderDetails}
                setOpen={setShowOrderDetails}
                id={selectedOrderId || undefined}
            />
        </Layout>
    );
};
