import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Chip, TextField, InputAdornment,
    Stack, Tooltip, IconButton, Skeleton, Alert, Button
} from '@mui/material';
import {
    DownloadRounded,
    RefreshRounded,
    SearchRounded,
    TrendingDown as DangerIcon,
    WarningAmberRounded as WarningIcon,
    CheckCircleRounded as OkIcon,
    HelpOutlineRounded as GrayIcon,
    ShoppingCartRounded as CartIcon,
    AddShoppingCart as CreatePoIcon,
} from '@mui/icons-material';
import { request } from '../../common/request';
import { CreatePurchaseOrderDialog } from './CreatePurchaseOrderDialog';
import { ISupplier, IWarehouse } from '../../interfaces/inventory.types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

interface ScmProduct {
    product_id: number;
    product_name: string;
    sku: string;
    image?: string;
    warehouse_name: string;
    stock_physical: number;
    stock_useful: number;
    lead_time_days: number;
    daily_demand: number;
    days_coverage: number | null;
    safety_stock: number;
    target_stock: number;
    purchase_suggested: number;
    priority: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
}

const PRIORITY_CONFIG = {
    red:    { label: 'URGENTE',    color: '#ef4444', chip: 'error'   as const, Icon: DangerIcon },
    orange: { label: 'ALERTA',     color: '#f97316', chip: 'warning' as const, Icon: WarningIcon },
    yellow: { label: 'PRECAUCIÓN', color: '#eab308', chip: 'default' as const, Icon: WarningIcon },
    green:  { label: 'OK',         color: '#22c55e', chip: 'success' as const, Icon: OkIcon },
    gray:   { label: 'SIN DATA',   color: '#94a3b8', chip: 'default' as const, Icon: GrayIcon },
};

const PRIORITY_ORDER = { red: 0, orange: 1, yellow: 2, green: 3, gray: 4 };

export const PurchaseSuggestionsTable: React.FC = () => {
    const [data, setData] = useState<ScmProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterPriority, setFilterPriority] = useState<string>('all');

    // Fase 5: Crear OC desde sugerencias
    const [createPoOpen, setCreatePoOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);

    const fetch = async () => {
        setLoading(true);
        setError(null);
        try {
            const [scmRes, suppliersRes, warehousesRes] = await Promise.all([
                request('/scm/dashboard', 'GET'),
                request('/suppliers', 'GET'),
                request('/warehouses', 'GET'),
            ]);
            if (scmRes.status === 200) {
                const json = await scmRes.response.json();
                setData(json.data ?? []);
            } else {
                setError('No se pudo cargar el reporte de compras.');
            }
            if (suppliersRes.status === 200) {
                const json = await suppliersRes.response.json();
                setSuppliers(json.data ?? []);
            }
            if (warehousesRes.status === 200) {
                const json = await warehousesRes.response.json();
                setWarehouses(json.data?.data ?? json.data ?? []);
            }
        } catch {
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, []);

    const filtered = data
        .filter(d => d.purchase_suggested > 0) // only products that need buying
        .filter(d => filterPriority === 'all' || d.priority === filterPriority)
        .filter(d =>
            d.product_name.toLowerCase().includes(search.toLowerCase()) ||
            (d.sku ?? '').toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5));

    const exportToExcel = () => {
        const worksheetData = filtered.map(d => ({
            'Producto': d.product_name,
            'SKU': d.sku || '—',
            'Almacén': d.warehouse_name,
            'Prioridad': PRIORITY_CONFIG[d.priority].label,
            'Stock Útil': d.stock_useful,
            'Demanda Diaria': d.daily_demand,
            'Días de Cobertura': d.days_coverage ?? 'Sin data',
            'Stock Seguridad': d.safety_stock,
            'Stock Objetivo': d.target_stock,
            'Sugerido a Comprar': d.purchase_suggested
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sugerencias de Compra");

        // Ajustar anchos de columna automáticamente
        const columnWidths = [
            { wch: 35 }, // Producto
            { wch: 15 }, // SKU
            { wch: 20 }, // Almacén
            { wch: 15 }, // Prioridad
            { wch: 12 }, // Stock Útil
            { wch: 15 }, // Demanda
            { wch: 15 }, // Cobertura
            { wch: 15 }, // Stock Seguridad
            { wch: 15 }, // Stock Objetivo
            { wch: 18 }, // Sugerido a Comprar
        ];
        worksheet['!cols'] = columnWidths;

        XLSX.writeFile(workbook, `Reporte_Compras_Nuviora_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    const priorities: { value: string; label: string }[] = [
        { value: 'all', label: 'Todos' },
        { value: 'red', label: '🔴 Urgente' },
        { value: 'orange', label: '🟠 Alerta' },
        { value: 'yellow', label: '🟡 Precaución' },
    ];

    return (
        <Box>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CartIcon color="warning" /> Compras Sugeridas
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Productos que requieren reabastecimiento según el motor SCM
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Actualizar">
                        <IconButton onClick={fetch} disabled={loading}>
                            <RefreshRounded />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<CreatePoIcon />}
                        onClick={() => setCreatePoOpen(true)}
                        disabled={filtered.length === 0}
                        color="secondary"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        Crear OC
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<DownloadRounded />}
                        onClick={exportToExcel}
                        disabled={filtered.length === 0}
                        color="primary"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        Exportar Excel (.xlsx)
                    </Button>
                </Stack>
            </Stack>

            {/* Filters */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Buscar producto o SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ flex: 1, maxWidth: 320 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
                />
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {priorities.map(p => (
                        <Chip
                            key={p.value}
                            label={p.label}
                            size="small"
                            onClick={() => setFilterPriority(p.value)}
                            color={filterPriority === p.value ? 'primary' : 'default'}
                            variant={filterPriority === p.value ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                        />
                    ))}
                </Stack>
            </Stack>

            {/* Error */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Table */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Almacén</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Prioridad</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Stock útil</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Dem./día</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Cobertura</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Stock obj.</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#f97316' }} align="right">⚡ Comprar</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <TableCell key={j}><Skeleton /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                        {data.filter(d => d.purchase_suggested > 0).length === 0
                                            ? '✅ No hay productos que requieran compra en este momento.'
                                            : 'No hay resultados para el filtro aplicado.'
                                        }
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((row, i) => {
                                const cfg = PRIORITY_CONFIG[row.priority];
                                const { Icon } = cfg;
                                return (
                                    <TableRow
                                        key={`${row.product_id}-${i}`}
                                        hover
                                        sx={{
                                            borderLeft: `3px solid ${cfg.color}`,
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 200 }}>
                                                    {row.product_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.sku || '—'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {row.warehouse_name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                size="small"
                                                label={cfg.label}
                                                color={cfg.chip}
                                                icon={<Icon sx={{ fontSize: '12px !important' }} />}
                                                sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold" sx={{ color: cfg.color }}>
                                                {row.stock_useful}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{row.daily_demand}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.days_coverage !== null ? (
                                                <Typography variant="body2" fontWeight="bold" sx={{ color: cfg.color }}>
                                                    {row.days_coverage}d
                                                </Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">Sin data</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">{row.target_stock}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={`+${row.purchase_suggested}`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    bgcolor: 'rgba(249,115,22,0.12)',
                                                    color: '#ea580c',
                                                    border: '1px solid rgba(249,115,22,0.3)'
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filtered.length > 0 && (
                    <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} requieren compra
                        </Typography>
                        <Typography variant="caption" fontWeight="bold" color="warning.main">
                            Total a comprar: {filtered.reduce((acc, r) => acc + r.purchase_suggested, 0)} unidades
                        </Typography>
                    </Box>
                )}
            </Paper>

            {/* Crear OC desde sugerencias */}
            <CreatePurchaseOrderDialog
                open={createPoOpen}
                onClose={() => setCreatePoOpen(false)}
                onSuccess={() => setCreatePoOpen(false)}
                suppliers={suppliers}
                warehouses={warehouses}
                prefilledItems={filtered.map(d => ({
                    product_id:       d.product_id,
                    product_name:     d.product_name,
                    sku:              d.sku,
                    purchase_suggested: d.purchase_suggested,
                }))}
            />
        </Box>
    );
};
