import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Stack, Chip, Alert, Divider,
    Table, TableHead, TableRow, TableCell, TableBody, TextField,
    CircularProgress, LinearProgress
} from '@mui/material';
import {
    Inventory as InventoryIcon,
    CheckCircle as OkIcon,
    Warning as PartialIcon,
} from '@mui/icons-material';
import { ButtonCustom } from '../custom';
import { request } from '../../common/request';
import { IPurchaseOrder, IReceiveItemsPayload } from '../../interfaces/inventory.types';
import { toast } from 'react-toastify';

interface ReceiveQty {
    purchase_order_item_id: number;
    quantity_received: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    order: IPurchaseOrder;
}

export const ReceivePurchaseOrderDialog: React.FC<Props> = ({ open, onClose, onSuccess, order }) => {
    const [quantities, setQuantities] = useState<Record<number, number>>(() => {
        const init: Record<number, number> = {};
        order.items?.forEach(item => {
            init[item.id] = item.pending_quantity;
        });
        return init;
    });
    const [loading, setLoading] = useState(false);

    const handleQtyChange = (itemId: number, value: number) => {
        const item = order.items?.find(i => i.id === itemId);
        if (!item) return;
        const max = item.pending_quantity;
        setQuantities(prev => ({ ...prev, [itemId]: Math.min(max, Math.max(0, value)) }));
    };

    const totalToReceive = Object.values(quantities).reduce((a, b) => a + b, 0);

    const handleReceive = async () => {
        if (totalToReceive === 0) return toast.error('Ingresa al menos una unidad a recibir');

        setLoading(true);
        try {
            const payload: IReceiveItemsPayload = {
                items: (order.items ?? [])
                    .filter(item => (quantities[item.id] ?? 0) > 0)
                    .map(item => ({
                        purchase_order_item_id: item.id,
                        quantity_received: quantities[item.id] ?? 0,
                    })),
            };

            const { status, response } = await request(`/purchase-orders/${order.id}/receive`, 'POST', payload);

            if (status === 200 || status === 201) {
                const json = await response.json();
                toast.success(json.message || '✅ Recepción registrada');
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                <InventoryIcon color="success" />
                Recepción de Mercancía — {order.reference_number}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={3}>
                    {/* Summary */}
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Stack direction="row" spacing={3}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Proveedor</Typography>
                                <Typography variant="body2" fontWeight="bold">{order.supplier?.name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Bodega Destino</Typography>
                                <Typography variant="body2" fontWeight="bold">{order.warehouse?.name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Estado</Typography>
                                <Box mt={0.25}>
                                    <Chip label={order.status_label} size="small" color="warning" />
                                </Box>
                            </Box>
                        </Stack>
                    </Box>

                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Ingresa la cantidad <strong>físicamente recibida</strong> de cada producto. Si recibes menos de lo pedido, la orden quedará en estado <strong>Recibida Parcial</strong>.
                    </Alert>

                    <Divider />

                    {/* Items table */}
                    <Box sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Pedido</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Ya recibido</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Pendiente</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', minWidth: 130 }} align="right">Recibir ahora</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(order.items ?? []).map(item => {
                                    const isComplete = item.pending_quantity === 0;
                                    return (
                                        <TableRow key={item.id} sx={{ opacity: isComplete ? 0.5 : 1 }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {item.product?.title || item.product?.showable_name || item.product?.name || `Producto #${item.product_id}`}
                                                </Typography>
                                                {item.product?.sku && (
                                                    <Typography variant="caption" color="text.secondary">{item.product.sku}</Typography>
                                                )}
                                                {/* Progress bar */}
                                                <Box mt={0.5}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.round((item.quantity_received / item.quantity_ordered) * 100)}
                                                        sx={{ height: 4, borderRadius: 2 }}
                                                        color={isComplete ? 'success' : 'warning'}
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Chip label={item.quantity_ordered} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" color={item.quantity_received > 0 ? 'success.main' : 'text.disabled'}>
                                                    {item.quantity_received}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                {isComplete ? (
                                                    <OkIcon color="success" fontSize="small" />
                                                ) : (
                                                    <Typography variant="body2" color="warning.main" fontWeight="bold">
                                                        {item.pending_quantity}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    disabled={isComplete}
                                                    value={quantities[item.id] ?? 0}
                                                    onChange={e => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                                                    inputProps={{
                                                        min: 0,
                                                        max: item.pending_quantity,
                                                        style: { textAlign: 'right', width: 80 }
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Box>

                    {/* Summary */}
                    {totalToReceive > 0 && (
                        <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <OkIcon color="success" />
                            <Typography variant="body2" fontWeight="bold">
                                Se registrarán <strong>{totalToReceive}</strong> unidades en la bodega <strong>{order.warehouse?.name}</strong>
                            </Typography>
                        </Box>
                    )}

                    {totalToReceive === 0 && (
                        <Alert severity="warning" icon={<PartialIcon />} sx={{ borderRadius: 2 }}>
                            Ingresa la cantidad recibida en al menos un producto para continuar.
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>
                    Cancelar
                </ButtonCustom>
                <ButtonCustom
                    variant="contained"
                    color="success"
                    onClick={handleReceive}
                    disabled={loading || totalToReceive === 0}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <OkIcon />}
                >
                    {loading ? 'Registrando...' : `Confirmar Recepción (${totalToReceive} u.)`}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
