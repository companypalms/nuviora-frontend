import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Chip, LinearProgress,
    Stack, Avatar, Tooltip, IconButton, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions, Button, TextField, InputAdornment, Alert,
    CircularProgress, Tabs, Tab,
} from '@mui/material';
import { PurchaseSuggestionsTable } from '../../components/inventory/PurchaseSuggestionsTable';
import { TransferConfirmationTable } from '../../components/inventory/TransferConfirmationTable';
import { ShoppingCartRounded as CartTabIcon, QueryStatsRounded as ScmTabIcon, AssignmentTurnedInRounded as ConfirmTabIcon } from '@mui/icons-material';
import { useUserStore } from '../../store/user/UserStore';
import {
    TrendingDown as DangerIcon,
    Warning as WarningIcon,
    CheckCircle as OkIcon,
    HelpOutline as GrayIcon,
    Inventory as InventoryIcon,
    Edit as EditIcon,
    Refresh as RefreshIcon,
    ShoppingCart as PurchaseIcon,
    CalendarToday as DaysIcon,
} from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';

interface ScmProduct {
    product_id: number;
    product_name: string;
    sku: string;
    image?: string;
    warehouse_id: number;
    warehouse_name: string;
    // Stock
    stock_physical: number;
    stock_reserved: number;
    stock_defective: number;
    stock_blocked: number;
    stock_useful: number;
    // Métricas
    lead_time_days: number;
    defect_percentage: number;
    daily_demand: number;
    days_coverage: number | null;
    safety_stock: number;
    target_stock: number;
    purchase_suggested: number;
    priority: 'red' | 'orange' | 'yellow' | 'green' | 'gray';
}

interface Meta {
    total: number;
    red_count: number;
    orange_count: number;
    yellow_count: number;
    green_count: number;
}

const PRIORITY_CONFIG = {
    red:    { label: 'URGENTE', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',    Icon: DangerIcon,  chip: 'error'   as const },
    orange: { label: 'ALERTA',  color: '#f97316', bg: 'rgba(249,115,22,0.08)',   Icon: WarningIcon, chip: 'warning' as const },
    yellow: { label: 'PRECAUCIÓN', color: '#eab308', bg: 'rgba(234,179,8,0.06)', Icon: WarningIcon, chip: 'default' as const },
    green:  { label: 'OK',      color: '#22c55e', bg: 'rgba(34,197,94,0.06)',    Icon: OkIcon,      chip: 'success' as const },
    gray:   { label: 'SIN DATA',color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', Icon: GrayIcon,    chip: 'default' as const },
};

export const ScmDashboard: React.FC = () => {
    const [data, setData] = useState<ScmProduct[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [apiError, setApiError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const user = useUserStore(s => s.user);
    const isAdmin = ['Admin', 'Gerente', 'Master'].includes(user.role?.description ?? '');

    // Edit dialog
    const [editTarget, setEditTarget] = useState<ScmProduct | null>(null);
    const [editForm, setEditForm] = useState({ reserved_stock: 0, defective_stock: 0, blocked_stock: 0, lead_time_days: 3, defect_percentage: 0 });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const { status, response } = await request('/scm/dashboard', 'GET');
            if (status === 200) {
                const json = await response.json();
                setData(json.data ?? []);
                setMeta(json.meta ?? null);
            } else {
                let msg = `Error HTTP ${status}`;
                try {
                    const err = await response.json();
                    msg = err.message || err.error || msg;
                } catch {}
                setApiError(msg);
                toast.error(`SCM Error: ${msg}`);
            }
        } catch (e: any) {
            const msg = e?.message || 'Error de conexión al servidor';
            setApiError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenEdit = (item: ScmProduct) => {
        setEditTarget(item);
        setEditForm({
            reserved_stock:     item.stock_reserved,
            defective_stock:    item.stock_defective,
            blocked_stock:      item.stock_blocked,
            lead_time_days:     item.lead_time_days,
            defect_percentage:  item.defect_percentage,
        });
    };

    const handleSaveEdit = async () => {
        if (!editTarget) return;
        setSaving(true);
        try {
            // Update inventory SCM fields
            await request(`/scm/inventory/${editTarget.warehouse_id}`, 'PUT', {
                reserved_stock:  editForm.reserved_stock,
                defective_stock: editForm.defective_stock,
                blocked_stock:   editForm.blocked_stock,
            });
            // Update product SCM metrics
            await request(`/scm/products/${editTarget.product_id}`, 'PUT', {
                lead_time_days:    editForm.lead_time_days,
                defect_percentage: editForm.defect_percentage,
            });

            toast.success('Métricas actualizadas ✅');
            setEditTarget(null);
            fetchData();
        } catch {
            toast.error('Error guardando métricas');
        } finally {
            setSaving(false);
        }
    };

    const filtered = data.filter(d =>
        d.product_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.sku ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const CoverageBar = ({ days, leadTime }: { days: number | null, leadTime: number }) => {
        if (days === null) return <Typography variant="caption" color="text.disabled">Sin datos de venta</Typography>;
        const pct = Math.min(100, (days / (leadTime * 3)) * 100);
        const color = days < leadTime ? '#ef4444' : days < leadTime * 1.5 ? '#f97316' : days < leadTime * 2.5 ? '#eab308' : '#22c55e';
        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Días de cobertura</Typography>
                    <Typography variant="caption" fontWeight="bold" sx={{ color }}>{days}d</Typography>
                </Box>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
                <Typography variant="caption" color="text.disabled">Lead Time: {leadTime}d</Typography>
            </Box>
        );
    };

    return (
        <Box>
            {/* Tab Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} aria-label="scm tabs">
                    <Tab icon={<ScmTabIcon />} iconPosition="start" label="Análisis de Stock" />
                    <Tab
                        icon={<CartTabIcon />}
                        iconPosition="start"
                        label="Compras Sugeridas"
                    />
                    {isAdmin && (
                        <Tab 
                            icon={<ConfirmTabIcon />} 
                            iconPosition="start" 
                            label="Formalización" 
                        />
                    )}
                </Tabs>
            </Box>

            {/* ── TAB 2: Formalización (Admin Only) ────────────────────── */}
            {activeTab === 2 && isAdmin && <TransferConfirmationTable />}

            {/* ── TAB 1: Compras sugeridas ─────────────────────────────── */}
            {activeTab === 1 && <PurchaseSuggestionsTable />}

            {/* ── TAB 0: Análisis SCM ──────────────────────────────────── */}
            {activeTab === 0 && <>

            {/* Header KPIs */}
            {meta && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[
                        { label: 'URGENTE', count: meta.red_count, color: '#ef4444', icon: '🔴' },
                        { label: 'ALERTA', count: meta.orange_count, color: '#f97316', icon: '🟠' },
                        { label: 'PRECAUCIÓN', count: meta.yellow_count, color: '#eab308', icon: '🟡' },
                        { label: 'OK', count: meta.green_count, color: '#22c55e', icon: '🟢' },
                    ].map(kpi => (
                        <Grid size={{ xs: 6, sm: 3 }} key={kpi.label}>
                            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center', borderLeft: `4px solid ${kpi.color}` }}>
                                <Typography variant="h4" fontWeight="800">{kpi.icon} {kpi.count}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">{kpi.label}</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Alert Section: Stock Crítico (Fase 4) */}
            {isAdmin && meta && meta.red_count > 0 && (
                <Alert 
                    severity="error" 
                    variant="filled"
                    icon={<DangerIcon />}
                    sx={{ mb: 3, borderRadius: 3, bgcolor: '#ef4444' }}
                >
                    <Typography variant="subtitle2" fontWeight="bold">
                        🚨 ALERTA DE ABASTECIMIENTO: Tienes {meta.red_count} productos en quiebre técnico o con menos de 3 días de stock.
                    </Typography>
                    <Typography variant="caption">
                        Revisa la pestaña de "Compras Sugeridas" para formalizar los pedidos al proveedor.
                    </Typography>
                </Alert>
            )}

            {/* Search + Refresh */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                    size="small"
                    placeholder="Buscar producto o SKU..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ flex: 1, maxWidth: 350 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">🔍</InputAdornment> }}
                />
                <Tooltip title="Actualizar">
                    <IconButton onClick={fetchData} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : apiError ? (
                <Alert severity="error" sx={{ borderRadius: 3 }} action={
                    <Button color="inherit" size="small" onClick={fetchData}>Reintentar</Button>
                }>
                    <strong>Error del servidor:</strong> {apiError}
                </Alert>
            ) : filtered.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                    No se encontraron productos en inventario. Asegúrate de correr la migración y tener registros en la tabla <strong>inventories</strong>.
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {filtered.map((item, idx) => {
                        const cfg = PRIORITY_CONFIG[item.priority];
                        const { Icon } = cfg;
                        return (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`${item.product_id}-${item.warehouse_id}-${idx}`}>
                                <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: cfg.bg, height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform .2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
                                    <CardContent sx={{ flex: 1 }}>
                                        {/* Header */}
                                        <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
                                            <Avatar src={item.image} sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: 'action.hover' }}>
                                                <InventoryIcon fontSize="small" />
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="subtitle2" fontWeight="bold" noWrap>{item.product_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.sku} · {item.warehouse_name}</Typography>
                                            </Box>
                                            <Chip
                                                size="small"
                                                label={cfg.label}
                                                color={cfg.chip}
                                                icon={<Icon sx={{ fontSize: '13px !important' }} />}
                                                sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}
                                            />
                                        </Stack>

                                        {/* Stock Útil */}
                                        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper', mb: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="h5" fontWeight="800" sx={{ color: cfg.color, lineHeight: 1 }}>
                                                        {item.stock_useful}
                                                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>útiles</Typography>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">de {item.stock_physical} físicos</Typography>
                                                </Box>
                                                <Stack spacing={0.25} alignItems="flex-end">
                                                    {item.stock_reserved  > 0 && <Chip label={`📦 ${item.stock_reserved} reservados`} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                                    {item.stock_defective > 0 && <Chip label={`⚠️ ${item.stock_defective} defectuosos`} size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                                    {item.stock_blocked   > 0 && <Chip label={`🔒 ${item.stock_blocked} bloqueados`} size="small" color="error" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                                </Stack>
                                            </Stack>
                                        </Paper>

                                        {/* Cobertura */}
                                        <Box sx={{ mb: 2 }}>
                                            <CoverageBar days={item.days_coverage} leadTime={item.lead_time_days} />
                                        </Box>

                                        {/* KPIs */}
                                        <Stack direction="row" spacing={2}>
                                            <Box sx={{ textAlign: 'center', flex: 1 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Demanda/día</Typography>
                                                <Typography variant="subtitle2" fontWeight="bold">{item.daily_demand}</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center', flex: 1 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Stock objetiv.</Typography>
                                                <Typography variant="subtitle2" fontWeight="bold">{item.target_stock}</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center', flex: 1 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Sugerido comprar</Typography>
                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: item.purchase_suggested > 0 ? '#f97316' : 'text.primary' }}>
                                                    {item.purchase_suggested > 0 ? `+${item.purchase_suggested}` : '—'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>

                                    {/* Footer */}
                                    <Box sx={{ px: 2, pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                        <Tooltip title="Editar métricas SCM">
                                            <IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{ bgcolor: 'action.hover' }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon color="primary" /> Ajustar Métricas SCM
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{editTarget?.product_name}</Typography>

                    <Stack spacing={2.5} sx={{ mt: 1.5 }}>
                        <Typography variant="overline" color="text.secondary">── Stock Desglosado ──</Typography>
                        <TextField size="small" label="Reservados" type="number" fullWidth
                            value={editForm.reserved_stock}
                            onChange={e => setEditForm(p => ({ ...p, reserved_stock: +e.target.value }))}
                            helperText="Unidades comprometidas en pedidos activos"
                        />
                        <TextField size="small" label="Defectuosos" type="number" fullWidth
                            value={editForm.defective_stock}
                            onChange={e => setEditForm(p => ({ ...p, defective_stock: +e.target.value }))}
                            helperText="Unidades con defecto confirmado"
                        />
                        <TextField size="small" label="Bloqueados" type="number" fullWidth
                            value={editForm.blocked_stock}
                            onChange={e => setEditForm(p => ({ ...p, blocked_stock: +e.target.value }))}
                            helperText="Retenidos por auditoría u otra razón"
                        />

                        <Typography variant="overline" color="text.secondary">── Métricas del Producto ──</Typography>
                        <TextField size="small" label="Lead Time (días)" type="number" fullWidth
                            value={editForm.lead_time_days}
                            onChange={e => setEditForm(p => ({ ...p, lead_time_days: +e.target.value }))}
                            helperText="¿Cuántos días tarda el proveedor en entregar?"
                            InputProps={{ endAdornment: <InputAdornment position="end">días</InputAdornment> }}
                        />
                        <TextField size="small" label="% Merma / Defecto" type="number" fullWidth
                            value={editForm.defect_percentage}
                            onChange={e => setEditForm(p => ({ ...p, defect_percentage: +e.target.value }))}
                            helperText="El sistema inflará la compra para compensar. Ej: 5 = 5%"
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setEditTarget(null)} color="inherit">Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <OkIcon />}
                        sx={{ borderRadius: 2, px: 3 }}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
            </>}
        </Box>
    );
};
