import React, { useEffect, useState } from "react";
import { Layout } from "../components/ui/Layout";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import {
    Box, Card, CardContent, Grid, Typography, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, TextField, Button, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Collapse, IconButton, Chip
} from "@mui/material";
import { fmtMoney } from "../lib/money";
import { toast } from "react-toastify";
import { Add as AddIcon, TrendingUp, Close as CloseIcon, LocalShipping as ShippedIcon, ShoppingCartCheckout, CheckCircleOutline as EffectivenessIcon, KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

export const Metrics = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [openAdSpend, setOpenAdSpend] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [shops, setShops] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        shop_id: '',
        city_id: '',
        agency_id: ''
    });
    const [expandedSeller, setExpandedSeller] = useState<number | null>(null);
    const [expandedWorkload, setExpandedWorkload] = useState<number | null>(null);
    const [expandedAgency, setExpandedAgency] = useState<number | null>(null);

    const fetchMetrics = async () => {
        // Validation: Ensure year is reasonable to avoid server crashes
        const startYear = parseInt(startDate.split('-')[0]);
        const endYear = parseInt(endDate.split('-')[0]);
        if (isNaN(startYear) || startYear < 2000 || isNaN(endYear) || endYear < 2000) return;

        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                ...filters
            });
            const { status, response }: IResponse = await request(`/metrics?${queryParams.toString()}`, "GET");
            if (status) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (e) {
            toast.error("Error al cargar métricas");
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { status, response }: IResponse = await request("/inventory/products?paginate=false", "GET");
            if (status) {
                const data = await response.json();
                setProducts(Array.isArray(data) ? data : (data.data || []));
            }
        } catch (e) { }
    };

    const fetchFiltersData = async () => {
        try {
            const [shopsRes, citiesRes, agenciesRes] = await Promise.all([
                request("/shops", "GET"),
                request("/cities", "GET"),
                request("/users/role/Agencia?include_inactive=1", "GET") // filtro: también las desactivadas (paso 6)
            ]);
            if (shopsRes.status) {
                const data = await shopsRes.response.json();
                setShops(data.data || data);
            }
            if (citiesRes.status) setCities(await citiesRes.response.json());
            if (agenciesRes.status) setAgencies((await agenciesRes.response.json()).data);
        } catch (e) { }
    };

    useEffect(() => {
        if (isValid) {
            fetchMetrics();
            fetchProducts();
            fetchFiltersData();
        }
    }, [isValid, startDate, endDate, filters]);

    const handleSaveAdSpend = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const { status }: IResponse = await request("/metrics/ad-spend", "POST", data as any);
            if (status) {
                toast.success("Inversión guardada");
                setOpenAdSpend(false);
                fetchMetrics();
            }
        } catch (e) {
            toast.error("Error al guardar inversión");
        }
    };

    if (loadingSession || (loading && !metrics)) return <Loading />;

    const summary = metrics?.summary || {};

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} gap={2} flexWrap="wrap">
                <DescripcionDeVista title="Sistema de Métricas" description="Análisis de efectividad, rentabilidad y ventas" />
                <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
                    <TextField select size="small" label="Tienda" value={filters.shop_id} onChange={(e) => setFilters({ ...filters, shop_id: e.target.value })} sx={{ minWidth: 120 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {shops.map(s => <MenuItem key={s.id} value={s.id}>{s.name || s.title}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Ciudad" value={filters.city_id} onChange={(e) => setFilters({ ...filters, city_id: e.target.value })} sx={{ minWidth: 120 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {cities.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Agencia" value={filters.agency_id} onChange={(e) => setFilters({ ...filters, agency_id: e.target.value })} sx={{ minWidth: 120 }}>
                        <MenuItem value="">Todas</MenuItem>
                        {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.names}</MenuItem>)}
                    </TextField>
                    <TextField size="small" type="date" label="Desde" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="date" label="Hasta" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAdSpend(true)}>Ad Spend</Button>
                </Box>
            </Box>

            <Grid container spacing={3} mb={4}>
                <SummaryCard title="Efectividad Global" value={`${summary.global_effectiveness ?? 0}%`} sub={`${summary.global_delivered_orders ?? 0} de ${summary.global_total_orders ?? 0} órdenes entregadas`} icon={<EffectivenessIcon color="success" />} />
                <SummaryCard title="Valor Promedio Orden" value={fmtMoney(summary.avg_order_value, 'USD')} icon={<TrendingUp color="primary" />} />
                <SummaryCard title="Upsells Realizados" value={summary.upsells_count} icon={<ShoppingCartCheckout color="success" />} />
                <SummaryCard title="Cancelaciones" value={summary.cancellations_count} icon={<CloseIcon color="error" />} />
                <SummaryCard title="Rechazados post-envío" value={summary.rejected_after_shipping_count} icon={<ShippedIcon color="warning" />} />
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Efectividad y Ganancia por Producto</Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Producto</TableCell>
                                            <TableCell align="right">Efec.</TableCell>
                                            <TableCell align="right">Rentab.</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {metrics?.products?.map((p: any) => (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    {p.title || p.name}
                                                    {p.ad_spend > 0 && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                                            Ad Spend {fmtMoney(p.ad_spend, 'USD')} · {SPEND_SOURCE_LABEL[p.ad_spend_source] ?? p.ad_spend_source}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">{p.effectiveness}%</TableCell>
                                                <TableCell align="right" sx={{ color: p.net_profit >= 0 ? 'success.main' : 'error.main' }}>
                                                    {fmtMoney(p.net_profit, 'USD')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <Card elevation={3} sx={{ borderRadius: 4 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Efectividad Ventas (Nuevas Asignaciones)</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    Basado en <b>fecha de creación</b> de la orden. Atribución a la primera vendedora.
                                </Typography>
                                <TableContainer component={Paper} elevation={0}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: 32 }} />
                                                <TableCell>Vendedora</TableCell>
                                                <TableCell align="right">Total</TableCell>
                                                <TableCell align="right">Entregadas</TableCell>
                                                <TableCell align="right" sx={{ color: 'secondary.main', whiteSpace: 'nowrap' }}>Pasadas ✦</TableCell>
                                                <TableCell align="right">Efec.</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {metrics?.sellers?.map((s: any) => (
                                                <React.Fragment key={s.id}>
                                                    <TableRow
                                                        hover
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => setExpandedSeller(expandedSeller === s.id ? null : s.id)}
                                                    >
                                                        <TableCell sx={{ py: 0.5 }}>
                                                            <IconButton size="small">
                                                                {expandedSeller === s.id ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                                            </IconButton>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>{s.names || s.name}</TableCell>
                                                        <TableCell align="right">{s.total_assigned}</TableCell>
                                                        <TableCell align="right">{s.success_delivered}</TableCell>
                                                        <TableCell align="right" sx={{ color: s.delivered_by_other > 0 ? 'secondary.main' : 'text.disabled', fontWeight: s.delivered_by_other > 0 ? 'bold' : 'normal' }}>
                                                            {s.delivered_by_other > 0 ? `-${s.delivered_by_other}` : '—'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: s.delivery_rate >= 70 ? 'success.main' : s.delivery_rate >= 40 ? 'warning.main' : 'error.main' }}>
                                                            {s.delivery_rate}%
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                                                            <Collapse in={expandedSeller === s.id} timeout="auto" unmountOnExit>
                                                                <Box sx={{ px: 4, py: 1.5, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                                                                        Desglose de estados finales ({s.total_assigned} asignadas originalmente)
                                                                    </Typography>
                                                                    <Box display="flex" flexWrap="wrap" gap={0.8}>
                                                                        {s.status_breakdown?.map((b: any) => (
                                                                            <Chip
                                                                                key={b.status}
                                                                                size="small"
                                                                                label={`${b.status}: ${b.count}`}
                                                                                color={b.status === 'Entregado' ? 'success' : b.status === 'Cancelado' ? 'error' : b.status === 'Rechazado' ? 'warning' : 'default'}
                                                                                variant={b.status === 'Entregado' || b.status === 'Cancelado' || b.status === 'Rechazado' ? 'filled' : 'outlined'}
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                    {s.delivered_by_other > 0 && (
                                                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                                                                            ✦ Pasadas = se le asignó primero a ella pero otra vendedora cerró la venta.
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>

                        <Card elevation={3} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="primary">Volumen de Trabajo y Actividad (Reporte para Vendedoras)</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    Filtrado por <b>fecha de actividad</b> (historial de logs). Muestra todo lo trabajado en el rango seleccionado.
                                </Typography>
                                <TableContainer component={Paper} elevation={0}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: 32 }} />
                                                <TableCell>Vendedora</TableCell>
                                                <TableCell align="right">Órdenes Tocadas</TableCell>
                                                <TableCell align="right">Entregadas</TableCell>
                                                <TableCell align="right" sx={{ color: 'info.main' }}>Rescatadas ★</TableCell>
                                                <TableCell align="right">Efec.</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {metrics?.workload?.map((w: any) => (
                                                <React.Fragment key={w.id}>
                                                    <TableRow
                                                        hover
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => setExpandedWorkload(expandedWorkload === w.id ? null : w.id)}
                                                    >
                                                        <TableCell sx={{ py: 0.5 }}>
                                                            <IconButton size="small" color="primary">
                                                                {expandedWorkload === w.id ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                                            </IconButton>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>{w.names || w.name}</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{w.total_assigned}</TableCell>
                                                        <TableCell align="right">{w.success_delivered}</TableCell>
                                                        <TableCell align="right" sx={{ color: w.rescued_from_other > 0 ? 'info.main' : 'text.disabled', fontWeight: w.rescued_from_other > 0 ? 'bold' : 'normal' }}>
                                                            {w.rescued_from_other > 0 ? `+${w.rescued_from_other}` : '—'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {w.delivery_rate}%
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                                                            <Collapse in={expandedWorkload === w.id} timeout="auto" unmountOnExit>
                                                                <Box sx={{ px: 4, py: 1.5, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                                                                        Desglose de actividad real ({w.total_assigned} órdenes procesadas en este rango)
                                                                    </Typography>
                                                                    <Box display="flex" flexWrap="wrap" gap={0.8}>
                                                                        {w.status_breakdown?.map((b: any) => (
                                                                            <Chip
                                                                                key={b.status}
                                                                                size="small"
                                                                                label={`${b.status}: ${b.count}`}
                                                                                color={b.status === 'Entregado' ? 'success' : b.status === 'Cancelado' ? 'error' : b.status === 'Rechazado' ? 'warning' : 'default'}
                                                                                variant={b.status === 'Entregado' || b.status === 'Cancelado' || b.status === 'Rechazado' ? 'filled' : 'outlined'}
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                                                                        ★ "Rescatadas" = órdenes que eran originalmente de otra persona y tú entregaste.
                                                                    </Typography>
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Efectividad de Agencias</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Haz clic en una fila para ver el desglose
                            </Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ width: 32 }} />
                                            <TableCell>Agencia</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                            <TableCell align="right">Entregadas</TableCell>
                                            <TableCell align="right">Efec.</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {metrics?.agencies?.map((a: any) => (
                                            <React.Fragment key={a.id}>
                                                <TableRow
                                                    hover
                                                    sx={{ cursor: 'pointer' }}
                                                    onClick={() => setExpandedAgency(expandedAgency === a.id ? null : a.id)}
                                                >
                                                    <TableCell sx={{ py: 0.5 }}>
                                                        <IconButton size="small">
                                                            {expandedAgency === a.id ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                                                        </IconButton>
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{a.names || a.name}</TableCell>
                                                    <TableCell align="right">{a.total_assigned}</TableCell>
                                                    <TableCell align="right">{a.success_delivered}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: a.delivery_rate >= 70 ? 'success.main' : a.delivery_rate >= 40 ? 'warning.main' : 'error.main' }}>
                                                        {a.delivery_rate}%
                                                    </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                                                        <Collapse in={expandedAgency === a.id} timeout="auto" unmountOnExit>
                                                            <Box sx={{ px: 4, py: 1.5, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                                                                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                                                                    Desglose de estados finales ({a.total_assigned} órdenes únicas)
                                                                </Typography>
                                                                <Box display="flex" flexWrap="wrap" gap={0.8}>
                                                                    {a.status_breakdown?.map((b: any) => (
                                                                        <Chip
                                                                            key={b.status}
                                                                            size="small"
                                                                            label={`${b.status}: ${b.count}`}
                                                                            color={
                                                                                b.status === 'Entregado' ? 'success' :
                                                                                    b.status === 'Cancelado' ? 'error' :
                                                                                        b.status === 'Rechazado' ? 'warning' : 'default'
                                                                            }
                                                                            variant={b.status === 'Entregado' || b.status === 'Cancelado' || b.status === 'Rechazado' ? 'filled' : 'outlined'}
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Ganancia Neta Diaria</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                El Ad Spend sale de <b>Meta Ads</b> (campañas clasificadas por producto y ciudad). Lo registrado a mano solo cuenta los días en que Meta no tiene gasto de ese producto.
                            </Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Día</TableCell>
                                            <TableCell align="right">Ingresos</TableCell>
                                            <TableCell align="right">Costos</TableCell>
                                            <TableCell align="right">Ad Spend</TableCell>
                                            <TableCell align="right">Comisiones</TableCell>
                                            <TableCell align="right">Ganancia Neta</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {metrics?.daily?.map((d: any) => (
                                            <TableRow key={d.date}>
                                                <TableCell>{d.date}</TableCell>
                                                <TableCell align="right">{fmtMoney(d.revenue, 'USD')}</TableCell>
                                                <TableCell align="right" sx={{ color: 'error.main' }}>-{fmtMoney(d.cost, 'USD')}</TableCell>
                                                <TableCell align="right" sx={{ color: 'error.main' }}>
                                                    -{fmtMoney(d.ad_spend, 'USD')}
                                                    {d.ad_spend_source && <SpendSource source={d.ad_spend_source} />}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: 'error.main' }}>-{fmtMoney(d.commissions || 0, 'USD')}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: d.net_profit >= 0 ? 'success.main' : 'error.main' }}>
                                                    {fmtMoney(d.net_profit, 'USD')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog Ad Spend */}
            <Dialog open={openAdSpend} onClose={() => setOpenAdSpend(false)}>
                <form onSubmit={handleSaveAdSpend}>
                    <DialogTitle>Registrar Inversión Publicitaria</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1} minWidth={300}>
                            <TextField select name="product_id" label="Producto" fullWidth required>
                                {products.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.title || p.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField name="date" label="Fecha" type="date" fullWidth required defaultValue={new Date().toISOString().split('T')[0]} InputLabelProps={{ shrink: true }} />
                            <TextField name="amount" label="Monto Invertido ($)" type="number" fullWidth required inputProps={{ step: "0.01" }} />
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300 }}>
                                Solo hace falta para lo que no está en Meta Ads. Si Meta tiene gasto de ese producto ese día, se usa el de Meta.
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAdSpend(false)}>Cancelar</Button>
                        <Button variant="contained" type="submit">Guardar</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Layout>
    );
};

/** De dónde salió el Ad Spend (Fran, 2026-10-09, punto 7: el gasto real de Meta). */
const SPEND_SOURCE_LABEL: Record<string, string> = { meta: 'Meta', manual: 'manual', mixed: 'Meta + manual' };
const SpendSource = ({ source }: { source: string }) => (
    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
        {SPEND_SOURCE_LABEL[source] ?? source}
    </Typography>
);

const SummaryCard = ({ title, value, sub, icon }: any) => (
    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
        <Card elevation={3} sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">{title}</Typography>
                        <Typography variant="h5" fontWeight="bold">{value}</Typography>
                        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
                    </Box>
                    {icon}
                </Box>
            </CardContent>
        </Card>
    </Grid>
);
