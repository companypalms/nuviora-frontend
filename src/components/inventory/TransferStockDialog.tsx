import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    TextField,
    Box,
    Typography,
    InputAdornment
} from '@mui/material';
import { ButtonCustom } from '../custom';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IWarehouse, IProduct, IStockTransferRequest, IVariantStock } from '../../interfaces/inventory.types';
import { VariantBreakdown } from './VariantBreakdown';
import { variantPayload, variantSum } from '../../common/variants';
import { toast } from 'react-toastify';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    warehouses?: IWarehouse[];
    initialFromWarehouseId?: number;
}

export const TransferStockDialog: React.FC<Props> = ({ open, onClose, onSuccess, warehouses, initialFromWarehouseId }) => {
    const [products, setProducts] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [localWarehouses, setLocalWarehouses] = useState<IWarehouse[]>(warehouses || []);
    const [loadingWarehouses, setLoadingWarehouses] = useState(false);
    // Tarea 4: cuántas de cada talla se trasladan, y cuántas hay en el origen
    const [variantsInput, setVariantsInput] = useState<Record<number, number>>({});
    const [availableVariants, setAvailableVariants] = useState<Record<number, number> | undefined>(undefined);
    const selectedProduct = products.find(p => p.id === Number(form.product_id));

    const [form, setForm] = useState<IStockTransferRequest>({
        product_id: 0,
        from_warehouse_id: initialFromWarehouseId || 0,
        to_warehouse_id: 0,
        quantity: 1,
        notes: ''
    });

    useEffect(() => {
        if (open) {
            loadProducts();
            if (!warehouses || warehouses.length === 0) {
                loadWarehouses();
            }
            // Reset form when dialog opens
            setForm({
                product_id: 0,
                from_warehouse_id: initialFromWarehouseId || 0,
                to_warehouse_id: 0,
                quantity: 1,
                notes: ''
            });
        }
    }, [open]);

    useEffect(() => {
        setVariantsInput({});
        setAvailableVariants(undefined);
        if (!form.product_id || !form.from_warehouse_id || !(selectedProduct?.variants ?? []).length) return;
        (async () => {
            const { status, response }: IResponse = await request(`/warehouses/${form.from_warehouse_id}/inventory?product_id=${form.product_id}`, 'GET');
            if (status === 200) {
                const data = await response.json();
                const byVariant: Record<number, number> = {};
                (data.current_variants ?? []).forEach((v: IVariantStock) => { byVariant[v.variant_id] = v.quantity; });
                setAvailableVariants(byVariant);
            }
        })();
    }, [form.product_id, form.from_warehouse_id, selectedProduct?.id]);

    const loadWarehouses = async () => {
        setLoadingWarehouses(true);
        try {
            const { status, response }: IResponse = await request('/warehouses', 'GET');
            if (status) {
                const data = await response.json();
                setLocalWarehouses(data.data || []);
            }
        } catch (error) {
            console.error('Error loading warehouses', error);
        } finally {
            setLoadingWarehouses(false);
        }
    };

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const { status, response }: IResponse = await request('/products?paginate=false', 'GET');
            if (status) {
                const data = await response.json();
                // Depending on API response structure:
                if (data.data && Array.isArray(data.data)) {
                    setProducts(data.data);
                } else if (Array.isArray(data)) {
                    setProducts(data);
                }
            }
        } catch (error) {
            console.error('Error loading products', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleChange = (field: keyof IStockTransferRequest, value: any) => {
        setForm({ ...form, [field]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.product_id) return toast.error('Selecciona un producto');
        if (!form.from_warehouse_id) return toast.error('Selecciona el almacén de origen');
        if (!form.to_warehouse_id) return toast.error('Selecciona el almacén de destino');
        if (form.from_warehouse_id === form.to_warehouse_id) return toast.error('Los almacenes deben ser distintos');
        if (form.quantity <= 0) return toast.error('La cantidad debe ser mayor a 0');
        if (variantSum(variantsInput) > form.quantity) return toast.error('Las tallas suman más que la cantidad');

        setLoading(true);
        try {
            const body = new URLSearchParams();
            body.append('product_id', String(form.product_id));
            body.append('from_warehouse_id', String(form.from_warehouse_id));
            body.append('to_warehouse_id', String(form.to_warehouse_id));
            body.append('quantity', String(form.quantity));
            if (form.notes) body.append('notes', form.notes);
            Object.entries(variantPayload(variantsInput)).forEach(([id, q]) => body.append(`variants[${id}]`, String(q)));

            const { status, response }: IResponse = await request('/inventory-movements/transfer', 'POST', body);
            
            if (status === 200 || status === 201) {
                toast.success('✅ Transferencia completada. El stock fue movido al destino exitosamente.');
                onSuccess();
                onClose();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
                toast.error(errorData.message || `Error ${status} al transferir`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapHorizIcon color="primary" /> 
                <Typography variant="h6" fontWeight="bold">Transferir Mercancía</Typography>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        
                        <TextField
                            select
                            label="Producto"
                            value={form.product_id || ''}
                            onChange={(e) => handleChange('product_id', e.target.value)}
                            fullWidth
                            required
                            disabled={loadingProducts}
                        >
                            {products.map(p => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.title || p.name || p.showable_name} {p.sku ? `(${p.sku})` : ''}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                            <TextField
                                select
                                label="Origen"
                                value={form.from_warehouse_id || ''}
                                onChange={(e) => handleChange('from_warehouse_id', e.target.value)}
                                fullWidth
                                required
                                disabled={loadingWarehouses}
                            >
                                {localWarehouses.filter(w => w.is_active).map(w => (
                                    <MenuItem key={w.id} value={w.id}>
                                        {w.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Destino"
                                value={form.to_warehouse_id || ''}
                                onChange={(e) => handleChange('to_warehouse_id', e.target.value)}
                                fullWidth
                                required
                                disabled={loadingWarehouses}
                            >
                                {localWarehouses.filter(w => w.is_active && w.id !== form.from_warehouse_id).map(w => (
                                    <MenuItem key={w.id} value={w.id}>
                                        {w.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <TextField
                            label="Cantidad"
                            type="number"
                            value={form.quantity}
                            onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                            fullWidth
                            required
                            inputProps={{ min: 1 }}
                        />

                        {(selectedProduct?.variants ?? []).length > 0 && (
                            <VariantBreakdown
                                variants={selectedProduct?.variants ?? []}
                                value={variantsInput}
                                onChange={setVariantsInput}
                                total={form.quantity}
                                available={availableVariants}
                            />
                        )}

                        <TextField
                            label="Nota o Motivo (Opcional)"
                            value={form.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Ej. Reabastecimiento semanal, traslado a pedido especial..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>
                        Cancelar
                    </ButtonCustom>
                    <ButtonCustom type="submit" variant="contained" disabled={loading || loadingProducts}>
                        {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                    </ButtonCustom>
                </DialogActions>
            </form>
        </Dialog>
    );
};
