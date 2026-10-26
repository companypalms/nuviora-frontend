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
    CircularProgress
} from '@mui/material';
import { ButtonCustom } from '../custom';
import { IProduct } from '../../interfaces/inventory.types';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { IResponse } from '../../interfaces/response-type';

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
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        showable_name: '',
        sku: '',
        price: 0,
        cost_usd: 0
    });

    useEffect(() => {
        if (open && product) {
            setFormData({
                title: product.title || '',
                showable_name: product.showable_name || '',
                sku: product.sku || '',
                price: product.price || 0,
                cost_usd: product.cost_usd || 0
            });
        }
    }, [open, product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setLoading(true);
        try {
            const { status, response }: IResponse = await request(
                `/inventory/products/${product.id}`,
                'PUT',
                JSON.stringify(formData)
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
            [name]: name === 'price' || name === 'cost_usd' ? Number(value) : value
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
                                <TextField
                                    fullWidth
                                    label="Costo de Compra (USD)"
                                    name="cost_usd"
                                    type="number"
                                    value={formData.cost_usd}
                                    onChange={handleChange}
                                    required
                                    size="small"
                                    inputProps={{ step: "0.01", min: 0 }}
                                    helperText="Este valor se usará para calcular la ganancia en métricas"
                                    sx={{ '& .MuiFormHelperText-root': { color: 'primary.main', fontWeight: 'medium' } }}
                                />
                            </Grid>
                        </Grid>
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
