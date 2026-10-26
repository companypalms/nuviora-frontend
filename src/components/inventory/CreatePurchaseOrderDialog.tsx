import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Stack, TextField, MenuItem, Chip, Divider,
    Table, TableHead, TableRow, TableCell, TableBody,
    IconButton, Tooltip, Alert, CircularProgress
} from '@mui/material';
import {
    ShoppingCart as CartIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    AutoAwesome as ImportIcon,
} from '@mui/icons-material';
import { ButtonCustom } from '../custom';
import { request } from '../../common/request';
import {
    ISupplier, IWarehouse, IProduct,
    ICreatePurchaseOrderPayload
} from '../../interfaces/inventory.types';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface ScmSuggestion {
    product_id: number;
    product_name: string;
    sku?: string;
    purchase_suggested: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    suppliers: ISupplier[];
    warehouses: IWarehouse[];
    /** Pre-fill items from SCM suggestions */
    prefilledItems?: ScmSuggestion[];
}

interface LineItem {
    product_id: number;
    product_name: string;
    sku?: string;
    quantity_ordered: number;
    unit_cost_usd: number;
    notes: string;
}

const EMPTY_HEADER = {
    supplier_id: 0,
    warehouse_id: 0,
    expected_at: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    notes: '',
};

export const CreatePurchaseOrderDialog: React.FC<Props> = ({
    open, onClose, onSuccess, suppliers, warehouses, prefilledItems,
}) => {
    const [header, setHeader] = useState({ ...EMPTY_HEADER });
    const [items, setItems] = useState<LineItem[]>([]);
    const [allProducts, setAllProducts] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        if (open) {
            setHeader({ ...EMPTY_HEADER });
            loadProducts();
        }
    }, [open]);

    useEffect(() => {
        if (open && prefilledItems && prefilledItems.length > 0) {
            setItems(prefilledItems.map(s => ({
                product_id:      s.product_id,
                product_name:    s.product_name,
                sku:             s.sku,
                quantity_ordered: s.purchase_suggested,
                unit_cost_usd:   0,
                notes:           '',
            })));
        }
    }, [open, prefilledItems]);

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const { status, response } = await request('/products', 'GET');
            if (status === 200) {
                const json = await response.json();
                const list = json.data && Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
                setAllProducts(list);
            }
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleHeaderChange = (field: keyof typeof header, value: any) =>
        setHeader(prev => ({ ...prev, [field]: value }));

    const addItem = () =>
        setItems(prev => [...prev, { product_id: 0, product_name: '', quantity_ordered: 1, unit_cost_usd: 0, notes: '' }]);

    const removeItem = (idx: number) =>
        setItems(prev => prev.filter((_, i) => i !== idx));

    const updateItem = (idx: number, field: keyof LineItem, value: any) =>
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            if (field === 'product_id') {
                const p = allProducts.find(p => p.id === Number(value));
                return {
                    ...item,
                    product_id:   Number(value),
                    product_name: p?.title || p?.showable_name || p?.name || '',
                    sku:          p?.sku,
                };
            }
            return { ...item, [field]: value };
        }));

    const totalUSD = items.reduce((acc, i) => acc + (i.unit_cost_usd * i.quantity_ordered), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header.supplier_id) return toast.error('Selecciona un proveedor');
        if (!header.warehouse_id) return toast.error('Selecciona el almacén de recepción');
        if (items.length === 0) return toast.error('Agrega al menos un producto');
        if (items.some(i => !i.product_id)) return toast.error('Selecciona el producto en cada línea');

        setLoading(true);
        try {
            const payload: ICreatePurchaseOrderPayload = {
                supplier_id:  header.supplier_id,
                warehouse_id: header.warehouse_id,
                expected_at:  header.expected_at || undefined,
                notes:        header.notes || undefined,
                items: items.map(i => ({
                    product_id:       i.product_id,
                    quantity_ordered:  i.quantity_ordered,
                    unit_cost_usd:     i.unit_cost_usd,
                    notes:             i.notes || undefined,
                })),
            };

            const { status, response } = await request('/purchase-orders', 'POST', payload);
            if (status === 200 || status === 201) {
                const json = await response.json();
                toast.success(`✅ Orden ${json.data?.reference_number} creada como Borrador`);
                onSuccess();
                onClose();
            } else {
                const err = await response.json().catch(() => ({ message: 'Error desconocido' }));
                toast.error(err.message || `Error ${status}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const activeWarehouses = warehouses.filter(w => w.is_active);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                <CartIcon color="primary" />
                Nueva Orden de Compra
                {prefilledItems && prefilledItems.length > 0 && (
                    <Chip
                        icon={<ImportIcon sx={{ fontSize: 14 }} />}
                        label="Importada desde SCM"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ ml: 1 }}
                    />
                )}
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Stack spacing={3}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <TextField
                                select
                                label="Proveedor *"
                                value={header.supplier_id || ''}
                                onChange={e => handleHeaderChange('supplier_id', Number(e.target.value))}
                                sx={{ flex: 1, minWidth: 200 }}
                                required
                            >
                                {suppliers.filter(s => s.is_active).map(s => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name}
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                            ({s.currency} · {s.default_lead_time_days}d)
                                        </Typography>
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Almacén de Recepción *"
                                value={header.warehouse_id || ''}
                                onChange={e => handleHeaderChange('warehouse_id', Number(e.target.value))}
                                sx={{ flex: 1, minWidth: 200 }}
                                required
                            >
                                {activeWarehouses.map(w => (
                                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Fecha estimada de llegada"
                                type="date"
                                value={header.expected_at}
                                onChange={e => handleHeaderChange('expected_at', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ minWidth: 180 }}
                            />
                        </Box>

                        <TextField
                            label="Notas para la orden"
                            value={header.notes}
                            onChange={e => handleHeaderChange('notes', e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Condiciones especiales, referencias, etc."
                        />

                        <Divider />

                        {/* Items */}
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Productos ({items.length})
                                </Typography>
                                <ButtonCustom
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={addItem}
                                    type="button"
                                >
                                    Agregar Producto
                                </ButtonCustom>
                            </Stack>

                            {items.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 3 }}>
                                    No hay productos. Agrega al menos uno para continuar.
                                </Alert>
                            ) : (
                                <Box sx={{ overflowX: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Producto</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">Cantidad</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }} align="right">Costo USD</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">Subtotal</TableCell>
                                                <TableCell width={48} />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={item.product_id || ''}
                                                            onChange={e => updateItem(idx, 'product_id', e.target.value)}
                                                            fullWidth
                                                            disabled={loadingProducts}
                                                        >
                                                            {allProducts.map(p => (
                                                                <MenuItem key={p.id} value={p.id}>
                                                                    {p.title || p.showable_name || p.name}
                                                                    {p.sku && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>({p.sku})</Typography>}
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={item.quantity_ordered}
                                                            onChange={e => updateItem(idx, 'quantity_ordered', Math.max(1, parseInt(e.target.value) || 1))}
                                                            inputProps={{ min: 1, style: { textAlign: 'right', width: 70 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={item.unit_cost_usd}
                                                            onChange={e => updateItem(idx, 'unit_cost_usd', parseFloat(e.target.value) || 0)}
                                                            inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right', width: 90 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight="bold">
                                                            ${(item.unit_cost_usd * item.quantity_ordered).toFixed(2)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title="Eliminar">
                                                            <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}

                            {items.length > 0 && (
                                <Box sx={{ textAlign: 'right', mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Total estimado: <span style={{ color: '#2196f3' }}>${totalUSD.toFixed(2)} USD</span>
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <ButtonCustom variant="outlined" onClick={onClose} disabled={loading} type="button">
                        Cancelar
                    </ButtonCustom>
                    <ButtonCustom
                        type="submit"
                        variant="contained"
                        disabled={loading || items.length === 0}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CartIcon />}
                    >
                        {loading ? 'Creando...' : 'Crear Orden de Compra'}
                    </ButtonCustom>
                </DialogActions>
            </form>
        </Dialog>
    );
};
