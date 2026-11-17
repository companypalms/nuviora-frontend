import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    Typography,
    Grid,
    CircularProgress,
    MenuItem
} from '@mui/material';
import { ButtonCustom } from '../custom';
import { IProduct } from '../../interfaces/inventory.types';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { IResponse } from '../../interfaces/response-type';
import { useUserStore } from '../../store/user/UserStore';
import { DeliveryPdfSection } from './DeliveryPdfSection';

interface EditProductDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: IProduct;
}

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
    open,
    onClose,
    onSuccess,
    product
}) => {
    const role = useUserStore((s) => s.user.role?.description) ?? '';
    // .153: el grupo de editores de cada producto (su líder) lo elige solo el dueño
    const canGroup = ['Admin', 'Master'].includes(role);
    const [leaders, setLeaders] = useState<{ id: number; name: string }[]>([]);
    const [leaderId, setLeaderId] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        showable_name: '',
        sku: '',
        price: 0
    });

    useEffect(() => {
        if (open && product) {
            setFormData({
                title: product.title || '',
                showable_name: product.showable_name || '',
                sku: product.sku || '',
                price: product.price || 0
            });
            setLeaderId(product.editor_leader_id ?? '');
        }
    }, [open, product]);

    useEffect(() => {
        if (!open || !canGroup) return;
        request('/products/editor-leaders', 'GET').then(async ({ status, response }: IResponse) => {
            if (status === 200) setLeaders((await response.json()).leaders ?? []);
        }).catch(() => setLeaders([]));
    }, [open, canGroup]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setLoading(true);
        try {
            const { status, response }: IResponse = await request(
                `/inventory/products/${product.id}`,
                'PUT',
                JSON.stringify(canGroup ? { ...formData, editor_leader_id: leaderId === '' ? null : leaderId } : formData)
            );

            if (status === 200) {
                toast.success('Producto actualizado con éxito');
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al actualizar producto');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? Number(value) : value
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Detalles del Producto</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Título del Producto"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            size="small"
                        />
                        <TextField
                            fullWidth
                            label="Nombre para Mostrar (Temporal)"
                            name="showable_name"
                            value={formData.showable_name}
                            onChange={handleChange}
                            size="small"
                            helperText="Este es el nombre que se verá en las órdenes y reportes."
                        />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Precio de Venta (USD)"
                                    name="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                    size="small"
                                    inputProps={{ step: "0.01", min: 0 }}
                                />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                {/* 2026-10-31: el costo sale solo de las compras registradas en el inventario, nunca de aquí */}
                                <Typography variant="caption" color="text.secondary">
                                    El costo sale de las compras registradas en Inventario: el de la última compra. Se ve en Finanzas › Configuración.
                                </Typography>
                            </Grid>
                        </Grid>
                        {canGroup && (
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Grupo de editores"
                                value={leaderId}
                                onChange={(e) => setLeaderId(e.target.value === '' ? '' : Number(e.target.value))}
                                helperText="La comisión del líder sale de la ganancia de los productos de su grupo. Un producto es de un solo grupo."
                            >
                                <MenuItem value="">Ningún grupo</MenuItem>
                                {leaders.map((l) => <MenuItem key={l.id} value={l.id}>Grupo de {l.name}</MenuItem>)}
                            </TextField>
                        )}
                        {/* .106: el PDF al entregar se guarda solo (no con "Guardar Cambios") */}
                        {product && ['Admin', 'Master'].includes(role) && <DeliveryPdfSection productId={product.id} />}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <ButtonCustom onClick={onClose} color="inherit" variant="text">
                        Cancelar
                    </ButtonCustom>
                    <ButtonCustom
                        type="submit"
                        disabled={loading}
                        variant="contained"
                        sx={{ px: 4 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Guardar Cambios'}
                    </ButtonCustom>
                </DialogActions>
            </form>
        </Dialog>
    );
};
