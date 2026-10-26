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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import ListAltIcon from '@mui/icons-material/ListAlt';
import * as XLSX from 'xlsx';

import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { useUserStore } from '../../store/user/UserStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout';
import { grey, green, blue, orange } from '@mui/material/colors';

interface OrderRow {
    id: number;
    order_number: string;
    status: string;
    client_name: string;
    client_phone: string;
    agent_name: string;
    agency_name: string;
    total: number;
    currency: string;
    created_at: string | null;
    processed_at: string | null;
    duration_hours: number | null;
}

const formatDateTime = (dt: string | null): string => {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const getDurationColor = (hours: number | null) => {
    if (hours === null) return grey[400];
    if (hours <= 4) return green[600];
    if (hours <= 24) return orange[600];
    return '#d32f2f';
};

const getDurationLabel = (hours: number | null): string => {
    if (hours === null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} h`;
};

const STATUS_COLORS: Record<string, string> = {
    'Entregado': green[600],
    'En ruta': blue[500],
    'Cancelado': '#d32f2f',
    'Rechazado': '#b71c1c',
    'Nuevo': '#1565c0',
    'Sin Stock': '#e65100',
    'Novedades': '#6a1b9a',
    'Novedad Solucionada': '#2e7d32',
    'Asignar a agencia': '#0277bd',
    'Asignado a vendedor': '#00838f',
};

const getStatusColor = (status: string): string => STATUS_COLORS[status] ?? grey[600];

export const DeliveredHoursReport: React.FC = () => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/reports/delivered-hours', 'GET');
            if (status) {
                const json = await response.json();
                setOrders(json.data ?? []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (user?.role?.description !== 'Admin') {
        return <Navigate to="/dashboard" />;
    }

    const filtered = orders.filter((o) => {
        const q = search.toLowerCase();
        return (
            o.order_number?.toLowerCase().includes(q) ||
            o.client_name?.toLowerCase().includes(q) ||
            o.agent_name?.toLowerCase().includes(q) ||
            o.agency_name?.toLowerCase().includes(q) ||
            o.status?.toLowerCase().includes(q)
        );
    });

    const handleDownload = () => {
        const rows = filtered.map((o) => ({
            'N° Pedido': o.order_number,
            'Estatus': o.status,
            'Cliente': o.client_name,
            'Teléfono': o.client_phone,
            'Vendedora': o.agent_name,
            'Agencia': o.agency_name,
            'Total': `${o.currency} ${Number(o.total).toFixed(2)}`,
            'Fecha y Hora del Pedido': o.created_at ?? '',
            'Fecha y Hora de Entrega': o.processed_at ?? '',
            'Tiempo de Entrega': o.duration_hours !== null ? getDurationLabel(o.duration_hours) : '',
            'Horas (número)': o.duration_hours ?? '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Pedidos');

        const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
            wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key] ?? '').length)) + 2,
        }));
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `reporte_pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // Stats
    const totalOrders = filtered.length;
    const delivered = filtered.filter((o) => o.status === 'Entregado');
    const avgHours = delivered.reduce((acc, o) => acc + (o.duration_hours ?? 0), 0) / (delivered.length || 1);
    const under4h = delivered.filter((o) => o.duration_hours !== null && o.duration_hours <= 4).length;

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1500, mx: 'auto' }}>

                {/* Header */}
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 4,
                        mb: 3,
                        background: isDark
                            ? 'linear-gradient(135deg, #1a237e22, #0d47a122)'
                            : 'linear-gradient(135deg, #e3f2fd, #f8f9fa)',
                        border: '1px solid',
                        borderColor: isDark ? 'primary.dark' : 'primary.light',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                        <IconButton onClick={() => navigate(-1)} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" fontWeight="black" gutterBottom sx={{ mb: 0 }}>
                                ⏱️ Reporte de Pedidos y Horas de Entrega
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Todas las órdenes — fecha de pedido vs. fecha de entrega. El tiempo de entrega aplica solo a pedidos <strong>Entregado</strong>.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5}>
                            <Tooltip title="Actualizar datos">
                                <IconButton onClick={fetchData} color="primary" disabled={loading}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <Button
                                id="download-xlsx-btn"
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownload}
                                disabled={loading || filtered.length === 0}
                                sx={{ borderRadius: 2, fontWeight: 'bold', px: 3 }}
                            >
                                Descargar XLSX
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                {/* Summary Cards */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
                    <Paper sx={{ flex: 1, p: 2.5, borderRadius: 3, borderLeft: `4px solid ${blue[500]}` }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <ListAltIcon sx={{ color: blue[500], fontSize: 32 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL PEDIDOS</Typography>
                                <Typography variant="h4" fontWeight="black" color="primary">{totalOrders}</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                    <Paper sx={{ flex: 1, p: 2.5, borderRadius: 3, borderLeft: `4px solid ${green[600]}` }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <LocalShippingIcon sx={{ color: green[600], fontSize: 32 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">ENTREGADOS</Typography>
                                <Typography variant="h4" fontWeight="black" color="success.main">{delivered.length}</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                    <Paper sx={{ flex: 1, p: 2.5, borderRadius: 3, borderLeft: `4px solid ${orange[500]}` }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <AccessTimeIcon sx={{ color: orange[500], fontSize: 32 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">PROMEDIO ENTREGA</Typography>
                                <Typography variant="h4" fontWeight="black">
                                    {delivered.length === 0 ? '—' : getDurationLabel(Number(avgHours.toFixed(2)))}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                    <Paper sx={{ flex: 1, p: 2.5, borderRadius: 3, borderLeft: `4px solid ${green[300]}` }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <AccessTimeIcon sx={{ color: green[300], fontSize: 32 }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">ENTREGADOS EN ≤ 4 H</Typography>
                                <Typography variant="h4" fontWeight="black">{under4h}</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Stack>

                {/* Search */}
                <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                    <TextField
                        id="search-orders-input"
                        fullWidth
                        size="small"
                        placeholder="Buscar por N° pedido, estatus, cliente, vendedora o agencia..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </Paper>

                {/* Table */}
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" p={8}>
                            <Stack alignItems="center" spacing={2}>
                                <CircularProgress size={48} />
                                <Typography color="text.secondary">Cargando pedidos...</Typography>
                            </Stack>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>N° Pedido</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>Estatus</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>Cliente</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>Vendedora</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>Agencia</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>📅 Fecha del Pedido</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>🚚 Fecha de Entrega</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>⏱️ Tiempo</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: isDark ? grey[900] : grey[50] }}>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                                <Typography color="text.secondary">
                                                    {search ? 'No se encontraron resultados.' : 'No hay pedidos registrados.'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((order) => (
                                            <TableRow key={order.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                                        {order.order_number}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={order.status}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            color: '#fff',
                                                            bgcolor: getStatusColor(order.status),
                                                            fontSize: '0.7rem',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{order.client_name}</Typography>
                                                    {order.client_phone && (
                                                        <Typography variant="caption" color="text.secondary">{order.client_phone}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{order.agent_name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">{order.agency_name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem">
                                                        {formatDateTime(order.created_at)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        fontSize="0.78rem"
                                                        color={order.processed_at ? 'success.main' : 'text.disabled'}
                                                    >
                                                        {formatDateTime(order.processed_at)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={getDurationLabel(order.duration_hours)}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            color: '#fff',
                                                            bgcolor: getDurationColor(order.duration_hours),
                                                            minWidth: 60,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {order.currency} {Number(order.total).toFixed(2)}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    {!loading && filtered.length > 0 && (
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary">
                                Mostrando <strong>{filtered.length}</strong> de <strong>{orders.length}</strong> pedidos
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Layout>
    );
};
