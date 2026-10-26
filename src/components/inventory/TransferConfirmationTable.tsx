import React, { useEffect, useState } from 'react';
import {
    Box, Paper, Typography, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Chip, IconButton, Tooltip, 
    Skeleton, Alert, Button, Stack, CircularProgress
} from '@mui/material';
import {
    CheckCircleRounded as OkIcon,
    CancelRounded as CancelIcon,
    RefreshRounded,
    SwapHorizRounded as TransferIcon,
    Warehouse as WarehouseIcon,
    Inventory as ProductIcon
} from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface Movement {
    id: number;
    product: { name?: string; title?: string; showable_name?: string; sku?: string };
    from_warehouse: { name: string } | null;
    to_warehouse: { name: string } | null;
    quantity: number;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    notes?: string;
    user?: { names?: string; name?: string };
}

export const TransferConfirmationTable: React.FC = () => {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { status, response } = await request('/inventory-movements?status=pending&movement_type=transfer', 'GET');
            if (status === 200) {
                const json = await response.json();
                setMovements(json.data?.data ?? []);
            }
        } catch (e) {
            toast.error('Error cargando transferencias pendientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAction = async (id: number, action: 'confirm' | 'reject') => {
        setActioning(id);
        try {
            const { status } = await request(`/inventory-movements/${id}/${action}`, 'POST');
            if (status === 200 || status === 201) {
                toast.success(action === 'confirm' ? 'Transferencia confirmada ✅' : 'Transferencia rechazada ❌');
                fetchData();
            } else {
                toast.error('No se pudo completar la acción');
            }
        } catch {
            toast.error('Error de conexión');
        } finally {
            setActioning(null);
        }
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TransferIcon color="primary" /> Formalización de Recepción
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Confirma que el stock ha llegado físicamente a su destino para que se sume al inventario.
                    </Typography>
                </Box>
                <IconButton onClick={fetchData} disabled={loading}>
                    <RefreshRounded />
                </IconButton>
            </Stack>

            {loading ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            ) : movements.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                    No hay transferencias pendientes de confirmación. Todo el stock está al día.
                </Alert>
            ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Origen ➡️ Destino</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Cantidad</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones (Admin)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {movements.map((m) => (
                                <TableRow key={m.id} hover>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {dayjs(m.created_at).format('DD/MM HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <ProductIcon fontSize="inherit" color="disabled" />
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {m.product?.title || m.product?.showable_name || m.product?.name || '—'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">{m.product?.sku}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" fontWeight="bold">{m.from_warehouse?.name ?? '—'}</Typography>
                                            <TransferIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                            <Typography variant="caption" fontWeight="bold" color="primary">{m.to_warehouse?.name ?? '—'}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip label={m.quantity} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="success"
                                                startIcon={actioning === m.id ? <CircularProgress size={14} color="inherit" /> : <OkIcon />}
                                                onClick={() => handleAction(m.id, 'confirm')}
                                                disabled={!!actioning}
                                                sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.7rem' }}
                                            >
                                                Confirmar
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={actioning === m.id ? <CircularProgress size={14} color="inherit" /> : <CancelIcon />}
                                                onClick={() => handleAction(m.id, 'reject')}
                                                disabled={!!actioning}
                                                sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.7rem' }}
                                            >
                                                Rechazar
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};
