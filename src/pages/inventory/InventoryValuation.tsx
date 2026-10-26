import React, { useCallback, useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Chip, Alert, Skeleton, TextField, MenuItem,
    Divider, Tooltip, IconButton, Button,
} from '@mui/material';
import {
    TrendingUp as ProfitIcon,
    Inventory as StockIcon,
    Refresh as RefreshIcon,
    DownloadRounded,
    WarningAmberRounded as WarnIcon,
    CheckCircleRounded as OkIcon,
    AccountBalance as ValuationIcon,
} from '@mui/icons-material';
import { request } from '../../common/request';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ValuationRow {
    product_id: number;
    product_name: string;
    sku: string;
    warehouse_name: string;
    quantity: number;
    sale_price_usd: number;
    effective_cost_usd: number;
    cost_source: 'purchase_order' | 'manual';
    total_value_usd: number;
    margin_usd: number | null;
    margin_pct: number | null;
    last_receipt_at: string | null;
}

interface Summary {
    total_products: number;
    total_warehouses: number;
    total_units: number;
    total_value_usd: number;
    products_with_po_cost: number;
    products_with_manual_cost: number;
    avg_margin_pct: number | null;
}

interface ByWarehouse {
    warehouse_name: string;
    total_products: number;
    total_units: number;
    total_value_usd: number;
}

interface ProfitRow {
    product_id: number;
    product_name: string;
    sku: string;
    total_stock: number;
    sale_price_usd: number;
    effective_cost_usd: number;
    cost_source: 'purchase_order' | 'manual';
    total_value_usd: number;
    margin_usd: number | null;
    margin_pct: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, decimals = 2) =>
    n === null || n === undefined ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const pct = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : `${Number(n).toFixed(1)}%`;

const marginColor = (pct: number | null): string => {
    if (pct === null) return 'text.disabled';
    if (pct >= 50) return 'success.main';
    if (pct >= 25) return 'warning.main';
    return 'error.main';
};

// ─── Component ────────────────────────────────────────────────────────────────

export const InventoryValuation: React.FC = () => {
    const [view, setView] = useState<'valuation' | 'profitability'>('valuation');
    const [loading, setLoading] = useState(true);

    // Valuation state
    const [rows, setRows]             = useState<ValuationRow[]>([]);
    const [summary, setSummary]       = useState<Summary | null>(null);
    const [byWarehouse, setByWarehouse] = useState<ByWarehouse[]>([]);

    // Profitability state
    const [profitRows, setProfitRows] = useState<ProfitRow[]>([]);

    // Filters
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [marginFilter, setMarginFilter]       = useState('all');
    const [search, setSearch]                   = useState('');

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (view === 'valuation') {
                const { status, response } = await request('/reports/inventory-valuation', 'GET');
                if (status === 200) {
                    const json = await response.json();
                    setRows(json.rows ?? []);
                    setSummary(json.summary ?? null);
                    setByWarehouse(json.by_warehouse ?? []);
                }
            } else {
                const { status, response } = await request('/reports/profitability', 'GET');
                if (status === 200) {
                    const json = await response.json();
                    setProfitRows(json.data ?? []);
                }
            }
        } finally {
            setLoading(false);
        }
    }, [view]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Filtered rows ─────────────────────────────────────────────────────────

    const filteredRows = rows
        .filter(r => !warehouseFilter || r.warehouse_name === warehouseFilter)
        .filter(r => {
            if (marginFilter === 'high')   return (r.margin_pct ?? 0) >= 50;
            if (marginFilter === 'medium') return (r.margin_pct ?? 0) >= 25 && (r.margin_pct ?? 0) < 50;
            if (marginFilter === 'low')    return (r.margin_pct ?? 0) < 25 && r.margin_pct !== null;
            return true;
        })
        .filter(r =>
            !search ||
            r.product_name.toLowerCase().includes(search.toLowerCase()) ||
            (r.sku ?? '').toLowerCase().includes(search.toLowerCase())
        );

    const filteredProfitRows = profitRows
        .filter(r => {
            if (marginFilter === 'high')   return (r.margin_pct ?? 0) >= 50;
            if (marginFilter === 'medium') return (r.margin_pct ?? 0) >= 25 && (r.margin_pct ?? 0) < 50;
            if (marginFilter === 'low')    return (r.margin_pct ?? 0) < 25 && r.margin_pct !== null;
            return true;
        })
        .filter(r =>
            !search ||
            r.product_name.toLowerCase().includes(search.toLowerCase()) ||
            (r.sku ?? '').toLowerCase().includes(search.toLowerCase())
        );

    const warehouses = [...new Set(rows.map(r => r.warehouse_name))];

    // ── Export ────────────────────────────────────────────────────────────────

    const exportExcel = () => {
        const data = view === 'valuation'
            ? filteredRows.map(r => ({
                'Producto':           r.product_name,
                'SKU':                r.sku ?? '—',
                'Almacén':            r.warehouse_name,
                'Stock':              r.quantity,
                'Precio Venta (USD)': r.sale_price_usd,
                'Costo Efectivo (USD)': r.effective_cost_usd,
                'Fuente Costo':       r.cost_source === 'purchase_order' ? 'OC' : 'Manual',
                'Valor Total (USD)':  r.total_value_usd,
                'Margen USD':         r.margin_usd ?? '—',
                'Margen %':           r.margin_pct ?? '—',
              }))
            : filteredProfitRows.map(r => ({
                'Producto':           r.product_name,
                'SKU':                r.sku ?? '—',
                'Stock Total':        r.total_stock,
                'Precio Venta (USD)': r.sale_price_usd,
                'Costo Efectivo (USD)': r.effective_cost_usd,
                'Fuente Costo':       r.cost_source === 'purchase_order' ? 'OC' : 'Manual',
                'Valor Inventario':   r.total_value_usd,
                'Margen USD':         r.margin_usd ?? '—',
                'Margen %':           r.margin_pct ?? '—',
              }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, view === 'valuation' ? 'Valoración' : 'Rentabilidad');
        XLSX.writeFile(wb, `Nuviora_${view === 'valuation' ? 'Valoracion' : 'Rentabilidad'}_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Box>
            {/* View toggle */}
            <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <Button
                    variant={view === 'valuation' ? 'contained' : 'outlined'}
                    startIcon={<ValuationIcon />}
                    onClick={() => setView('valuation')}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                >
                    Valoración de Inventario
                </Button>
                <Button
                    variant={view === 'profitability' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<ProfitIcon />}
                    onClick={() => setView('profitability')}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                >
                    Rentabilidad por Producto
                </Button>
            </Stack>

            {/* ── VALUATION VIEW ── */}
            {view === 'valuation' && (
                <>
                    {/* KPI Strip */}
                    {summary && (
                        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
                            {[
                                { label: 'Valor Total Inventario', value: fmt(summary.total_value_usd), color: 'primary.main', bold: true },
                                { label: 'Unidades en Stock',      value: summary.total_units.toLocaleString(), color: 'text.primary' },
                                { label: 'Productos únicos',       value: summary.total_products, color: 'text.primary' },
                                { label: 'Margen Promedio',        value: pct(summary.avg_margin_pct), color: marginColor(summary.avg_margin_pct) },
                                { label: 'Costo vía OC',           value: summary.products_with_po_cost, color: 'success.main' },
                                { label: 'Costo manual',           value: summary.products_with_manual_cost, color: 'warning.main' },
                            ].map((kpi, i) => (
                                <Paper key={i} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', flex: '1 1 140px', minWidth: 120 }}>
                                    <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                                    <Typography variant="h5" fontWeight="800" color={kpi.color as any}>
                                        {kpi.value}
                                    </Typography>
                                </Paper>
                            ))}
                        </Stack>
                    )}

                    {/* By warehouse */}
                    {byWarehouse.length > 0 && (
                        <Stack direction="row" spacing={2} sx={{ mb: 3, overflowX: 'auto', pb: 1 }}>
                            {byWarehouse.map(w => (
                                <Paper
                                    key={w.warehouse_name}
                                    elevation={0}
                                    onClick={() => setWarehouseFilter(prev => prev === w.warehouse_name ? '' : w.warehouse_name)}
                                    sx={{
                                        p: 2, borderRadius: 3, border: '2px solid',
                                        borderColor: warehouseFilter === w.warehouse_name ? 'primary.main' : 'divider',
                                        cursor: 'pointer', flexShrink: 0, minWidth: 160,
                                        '&:hover': { borderColor: 'primary.light' },
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" noWrap>{w.warehouse_name}</Typography>
                                    <Typography variant="h6" fontWeight="800">{fmt(w.total_value_usd)}</Typography>
                                    <Typography variant="caption" color="text.secondary">{w.total_units} unidades</Typography>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </>
            )}

            {/* ── PROFITABILITY VIEW ── */}
            {view === 'profitability' && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
                    El costo efectivo prioriza el <strong>costo promedio ponderado de las OCs recibidas</strong>. 
                    Si no hay OCs para un producto, usa el campo <code>cost_usd</code> del producto.
                    El margen = precio venta − costo efectivo.
                </Alert>
            )}

            {/* Toolbar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                    size="small" placeholder="Buscar producto o SKU…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ flex: 1, maxWidth: 320 }}
                />

                {view === 'valuation' && (
                    <TextField
                        select size="small" label="Almacén"
                        value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}
                        sx={{ minWidth: 180 }}
                    >
                        <MenuItem value="">Todos los almacenes</MenuItem>
                        {warehouses.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                    </TextField>
                )}

                <TextField
                    select size="small" label="Margen"
                    value={marginFilter} onChange={e => setMarginFilter(e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="high">🟢 Alto (≥50%)</MenuItem>
                    <MenuItem value="medium">🟡 Medio (25-50%)</MenuItem>
                    <MenuItem value="low">🔴 Bajo (&lt;25%)</MenuItem>
                </TextField>

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Actualizar">
                    <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
                </Tooltip>

                <Button
                    variant="outlined" startIcon={<DownloadRounded />}
                    onClick={exportExcel}
                    disabled={loading || (view === 'valuation' ? filteredRows.length : filteredProfitRows.length) === 0}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                    Exportar Excel
                </Button>
            </Stack>

            {/* Table */}
            {loading ? (
                <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 3 }} />
            ) : view === 'valuation' ? (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Almacén</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Stock</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio Venta</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Costo Efectivo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Fuente</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Valor Total</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Margen</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                        {rows.length === 0
                                            ? '📦 No hay inventario valorado. Primero recepciona mercancía via Órdenes de Compra.'
                                            : 'No hay resultados para el filtro aplicado.'}
                                    </TableCell>
                                </TableRow>
                            ) : filteredRows.map((row, i) => (
                                <TableRow key={i} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">{row.product_name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.sku ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">{row.warehouse_name}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip label={row.quantity} size="small" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2">{fmt(row.sale_price_usd)}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold">{fmt(row.effective_cost_usd)}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title={row.cost_source === 'purchase_order' ? 'Costo calculado de OCs recibidas' : 'Costo manual del producto'}>
                                            <Chip
                                                size="small"
                                                icon={row.cost_source === 'purchase_order' ? <OkIcon sx={{ fontSize: '12px !important' }} /> : <WarnIcon sx={{ fontSize: '12px !important' }} />}
                                                label={row.cost_source === 'purchase_order' ? 'OC' : 'Manual'}
                                                color={row.cost_source === 'purchase_order' ? 'success' : 'warning'}
                                                variant="outlined"
                                            />
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                                            {fmt(row.total_value_usd)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold" color={marginColor(row.margin_pct) as any}>
                                            {pct(row.margin_pct)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {fmt(row.margin_usd, 2)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredRows.length > 0 && (
                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                                {filteredRows.length} líneas de inventario
                            </Typography>
                            <Typography variant="caption" fontWeight="bold" color="primary.main">
                                Total mostrado: {fmt(filteredRows.reduce((a, r) => a + r.total_value_usd, 0))}
                            </Typography>
                        </Box>
                    )}
                </TableContainer>
            ) : (
                /* PROFITABILITY TABLE */
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Stock</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Precio Venta</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Costo Efectivo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Fuente</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Valor Inventario</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Margen Unit.</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Margen %</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredProfitRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                        No hay datos de rentabilidad disponibles.
                                    </TableCell>
                                </TableRow>
                            ) : filteredProfitRows.map((row, i) => (
                                <TableRow key={i} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">{row.product_name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.sku ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip label={row.total_stock} size="small" color={row.total_stock > 0 ? 'default' : 'error'} />
                                    </TableCell>
                                    <TableCell align="right">{fmt(row.sale_price_usd)}</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold">{fmt(row.effective_cost_usd)}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            size="small"
                                            label={row.cost_source === 'purchase_order' ? 'OC' : 'Manual'}
                                            color={row.cost_source === 'purchase_order' ? 'success' : 'warning'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                                            {fmt(row.total_value_usd)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color={marginColor(row.margin_pct) as any}>
                                            {fmt(row.margin_usd, 2)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold" color={marginColor(row.margin_pct) as any}>
                                            {pct(row.margin_pct)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredProfitRows.length > 0 && (
                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                                {filteredProfitRows.length} productos
                            </Typography>
                            <Stack direction="row" spacing={3}>
                                <Typography variant="caption" fontWeight="bold" color="primary.main">
                                    Valor total: {fmt(filteredProfitRows.reduce((a, r) => a + r.total_value_usd, 0))}
                                </Typography>
                                <Typography variant="caption" fontWeight="bold" color="success.main">
                                    Margen prom.: {pct(filteredProfitRows.filter(r => r.margin_pct !== null).reduce((a, r) => a + (r.margin_pct ?? 0), 0) / (filteredProfitRows.filter(r => r.margin_pct !== null).length || 1))}
                                </Typography>
                            </Stack>
                        </Box>
                    )}
                </TableContainer>
            )}
        </Box>
    );
};
