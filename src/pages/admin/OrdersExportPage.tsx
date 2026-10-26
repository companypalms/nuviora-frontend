import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Toolbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    TextField,
    Stack,
    Chip,
    useTheme,
    InputAdornment,
    IconButton,
    Tooltip,
    Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import * as XLSX from 'xlsx';

import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { useUserStore } from '../../store/user/UserStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout';
import { grey, green, blue, orange, red } from '@mui/material/colors';

interface OrderRow {
    id: number;
    order_number: string;
    status: string;
    is_delivered: boolean;
    is_cancelled: boolean;
    is_return: boolean;
    is_exchange: boolean;
    client_name: string;
    client_phone: string;
    city: string;
    province: string;
    agent_name: string;
    agency_name: string;
    deliverer_name: string;
    products_summary: string;
    products_count: number;
    products_qty_total: number;
    has_upsell: boolean;
    total: number;
    currency: string;
    payment_method: string;
    delivery_cost: number;
    created_at: string | null;
    processed_at: string | null;
    scheduled_for: string | null;
    created_weekday: string;
    created_hour: string;
    duration_hours: number | null;
    postpone_count: number;
    novedad_type: string;
}

const STATUS_COLORS: Record<string, string> = {
    'Entregado': green[600],
    'En ruta': blue[500],
    'Cancelado': red[600],
    'Rechazado': red[900],
    'Nuevo': '#1565c0',
    'Sin Stock': orange[800],
    'Novedades': '#6a1b9a',
    'Novedad Solucionada': '#2e7d32',
    'Asignar a agencia': '#0277bd',
    'Asignado a vendedor': '#00838f',
};

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => new Date().toISOString().slice(0, 8) + '01';

export const OrdersExportPage: React.FC = () => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState<string>(firstOfMonth());
    const [toDate, setToDate] = useState<string>(today());
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [search, setSearch] = useState('');
    const [hasLoaded, setHasLoaded] = useState(false);

    if (!user || !['Admin', 'Gerente'].includes(user.role?.description || '')) {
        return <Navigate to="/dashboard" />;
    }

    const fetchOrders = useCallback(async () => {
        if (!fromDate || !toDate) return;
        setLoading(true);
        try {
            const { status, response }: IResponse = await request(
                `/reports/orders-export?from=${fromDate}&to=${toDate}`,
                'GET'
            );
            if (status) {
                const json = await response.json();
                setOrders(json.data ?? []);
                setHasLoaded(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    const filtered = orders.filter((o) => {
        const q = search.toLowerCase();
        return (
            o.order_number?.toLowerCase().includes(q) ||
            o.client_name?.toLowerCase().includes(q) ||
            o.agent_name?.toLowerCase().includes(q) ||
            o.agency_name?.toLowerCase().includes(q) ||
            o.city?.toLowerCase().includes(q) ||
            o.status?.toLowerCase().includes(q) ||
            o.products_summary?.toLowerCase().includes(q)
        );
    });

    const handleDownload = () => {
        const rows = filtered.map((o) => ({
            // Identificadores
            'N° Pedido':           o.order_number,
            'ID Sistema':          o.id,
            // Estatus
            'Estatus':             o.status,
            'Entregado':           o.is_delivered ? 'Sí' : 'No',
            'Cancelado':           o.is_cancelled ? 'Sí' : 'No',
            'Es devolución':       o.is_return ? 'Sí' : 'No',
            'Es cambio':           o.is_exchange ? 'Sí' : 'No',
            // Cliente
            'Cliente':             o.client_name,
            'Teléfono':            o.client_phone,
            // Geografía
            'Ciudad':              o.city,
            'Provincia':           o.province,
            // Equipo
            'Vendedora':           o.agent_name,
            'Agencia':             o.agency_name,
            'Repartidor':          o.deliverer_name,
            // Productos
            'Resumen Productos':   o.products_summary,
            'N° Productos':        o.products_count,
            'Unidades Total':      o.products_qty_total,
            'Tiene Upsell':        o.has_upsell ? 'Sí' : 'No',
            // Financiero
            'Total USD':           o.total,
            'Moneda':              o.currency,
            'Método de Pago':      o.payment_method,
            'Costo Envío':         o.delivery_cost,
            // Fechas
            'Fecha Creación':      o.created_at ?? '',
            'Día de la semana':    o.created_weekday ?? '',
            'Hora de creación':    o.created_hour ? `${o.created_hour}:00` : '',
            'Fecha Entrega':       o.processed_at ?? '',
            'Programada para':     o.scheduled_for ?? '',
            'Horas hasta entrega': o.duration_hours ?? '',
            // Comportamiento
            'Veces pospuesta':     o.postpone_count,
            'Tipo Novedad':        o.novedad_type ?? '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');

        // Autofit columns
        const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
            wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? '').length)) + 2,
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `ordenes_${fromDate}_al_${toDate}.xlsx`);
    };

    // Stats
    const delivered  = filtered.filter((o) => o.is_delivered).length;
    const cancelled  = filtered.filter((o) => o.is_cancelled).length;
    const avgHours   = (() => {
        const withTime = filtered.filter((o) => o.duration_hours !== null);
        return withTime.length
            ? withTime.reduce((a, o) => a + (o.duration_hours ?? 0), 0) / withTime.length
            : null;
    })();

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1500, mx: 'auto' }}>

                {/* Header */}
                <Paper
                    sx={{
                        p: 3, borderRadius: 4, mb: 3,
                        background: isDark
                            ? 'linear-gradient(135deg, #1a237e22, #0d47a122)'
                            : 'linear-gradient(135deg, #e3f2fd, #f8f9fa)',
                        border: '1px solid',
                        borderColor: isDark ? 'primary.dark' : 'primary.light',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton onClick={() => navigate(-1)} size="small"><ArrowBackIcon /></IconButton>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" fontWeight="black" sx={{ mb: 0 }}>
                                📥 Exportar Órdenes
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Selecciona un rango de fechas y descarga un Excel completo con todos los datos para análisis.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5}>
                            <Tooltip title="Recargar datos">
                                <IconButton onClick={fetchOrders} color="primary" disabled={loading}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownload}
                                disabled={loading || filtered.length === 0}
                                sx={{ borderRadius: 2, fontWeight: 'bold', px: 3 }}
                            >
                                Descargar XLSX ({filtered.length})
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {/* Filters */}
                <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                        <TextField
                            label="Fecha Desde"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{ minWidth: 180 }}
                        />
                        <TextField
                            label="Fecha Hasta"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{ minWidth: 180 }}
                        />
                        <Button
                            id="fetch-orders-btn"
                            variant="contained"
                            color="primary"
                            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <FilterAltIcon />}
                            onClick={fetchOrders}
                            disabled={loading}
                            sx={{ borderRadius: 2, fontWeight: 'bold', height: 40 }}
                        >
                            {loading ? 'Cargando...' : 'Consultar'}
                        </Button>
                    </Stack>
                </Paper>

                {/* Summary cards */}
                {hasLoaded && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
                        {[
                            { label: 'TOTAL ÓRDENES', value: filtered.length, color: blue[500] },
                            { label: 'ENTREGADAS', value: delivered, color: green[600] },
                            { label: 'CANCELADAS', value: cancelled, color: red[500] },
                            { label: 'PROM. ENTREGA', value: avgHours !== null ? `${avgHours.toFixed(1)} h` : '—', color: orange[600] },
                        ].map((card) => (
                            <Paper key={card.label} sx={{ flex: 1, p: 2.5, borderRadius: 3, borderLeft: `4px solid ${card.color}` }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">{card.label}</Typography>
                                <Typography variant="h4" fontWeight="black" sx={{ color: card.color }}>{card.value}</Typography>
                            </Paper>
                        ))}
                    </Stack>
                )}

                {/* Search */}
                {hasLoaded && (
                    <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                        <TextField
                            fullWidth size="small"
                            placeholder="Buscar por pedido, cliente, vendedora, ciudad, producto, estatus..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                                endAdornment: search ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                    </Paper>
                )}

                {/* Table */}
                {!hasLoaded && !loading && (
                    <Alert severity="info" sx={{ borderRadius: 3 }}>
                        Selecciona un rango de fechas y presiona <strong>Consultar</strong> para ver las órdenes.
                    </Alert>
                )}

                {hasLoaded && (
                    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={8}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer sx={{ maxHeight: 550 }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            {['N° Pedido', 'Estatus', 'Cliente', 'Ciudad', 'Vendedora', 'Agencia', 'Productos', 'Total', 'Creación', 'Entrega', '⏱ Horas'].map((h) => (
                                                <TableCell key={h} sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={11} align="center" sx={{ py: 5 }}>
                                                    <Typography color="text.secondary">
                                                        {search ? 'Sin resultados para la búsqueda.' : 'No hay órdenes en este rango.'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : filtered.map((o) => (
                                            <TableRow key={o.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold" color="primary">{o.order_number}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={o.status}
                                                        size="small"
                                                        sx={{ fontWeight: 'bold', color: '#fff', bgcolor: STATUS_COLORS[o.status] ?? grey[500], fontSize: '0.7rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{o.client_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{o.client_phone}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{o.city}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{o.province}</Typography>
                                                </TableCell>
                                                <TableCell><Typography variant="body2">{o.agent_name}</Typography></TableCell>
                                                <TableCell><Typography variant="body2" color="text.secondary">{o.agency_name}</Typography></TableCell>
                                                <TableCell sx={{ maxWidth: 220 }}>
                                                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {o.products_summary}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {o.currency} {o.total.toFixed(2)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">{o.created_at?.slice(0, 16).replace('T', ' ') ?? '—'}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" color={o.processed_at ? 'success.main' : 'text.disabled'}>
                                                        {o.processed_at?.slice(0, 16).replace('T', ' ') ?? '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {o.duration_hours !== null
                                                        ? <Chip label={`${o.duration_hours.toFixed(1)} h`} size="small" color={o.duration_hours <= 4 ? 'success' : o.duration_hours <= 24 ? 'warning' : 'error'} sx={{ fontWeight: 'bold' }} />
                                                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                        {!loading && filtered.length > 0 && (
                            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary">
                                    Mostrando <strong>{filtered.length}</strong> de <strong>{orders.length}</strong> órdenes
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                )}
            </Box>
        </Layout>
    );
};
