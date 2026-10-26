import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    Autocomplete,
    Divider,
    Alert
} from '@mui/material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { WarehouseSelector } from '../../components/inventory/WarehouseSelector';
import { VariantBreakdown } from '../../components/inventory/VariantBreakdown';
import { variantPayload, variantSum } from '../../common/variants';
import { ButtonCustom, TextFieldCustom } from '../../components/custom';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IProduct, IVariantStock } from '../../interfaces/inventory.types';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';

interface Props {
    isEmbedded?: boolean;
}

export const StockTransfer: React.FC<Props> = ({ isEmbedded }) => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<IProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
    const [fromWarehouseId, setFromWarehouseId] = useState<number | null>(null);
    const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableStock, setAvailableStock] = useState<number | null>(null);
    // Tarea 4: cuántas de cada talla se trasladan, y cuántas hay en el origen
    const [variantsInput, setVariantsInput] = useState<Record<number, number>>({});
    const [availableVariants, setAvailableVariants] = useState<Record<number, number> | undefined>(undefined);
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        setVariantsInput({});
        if (fromWarehouseId && selectedProduct) {
            checkStock();
        } else {
            setAvailableStock(null);
            setAvailableVariants(undefined);
        }
    }, [fromWarehouseId, selectedProduct]);

    const loadProducts = async () => {
        try {
            const { status, response }: IResponse = await request('/inventory/products?paginate=false', 'GET');
            if (status) {
                const data = await response.json();
                setProducts(data.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const checkStock = async () => {
        if (!fromWarehouseId || !selectedProduct) return;
        try {
            const { status, response }: IResponse = await request(
                `/warehouses/${fromWarehouseId}/inventory?product_id=${selectedProduct.id}`,
                'GET'
            );
            if (status) {
                const data = await response.json();
                // Use the new current_stock field from backend if it exists, 
                // otherwise fallback to searching in the array
                let stock = 0;
                if (data.current_stock !== undefined) {
                    stock = data.current_stock;
                } else if (data.inventory) {
                    stock = data.inventory.find((i: any) => i.product_id == selectedProduct.id)?.quantity || 0;
                }
                setAvailableStock(stock);
                const byVariant: Record<number, number> = {};
                (data.current_variants ?? []).forEach((v: IVariantStock) => { byVariant[v.variant_id] = v.quantity; });
                setAvailableVariants(byVariant);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !fromWarehouseId || !toWarehouseId) {
            toast.error('Complete todos los campos requeridos');
            return;
        }
        if (fromWarehouseId === toWarehouseId) {
            toast.error('El almacén de origen y destino deben ser diferentes');
            return;
        }
        if (quantity <= 0) {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }
        if (availableStock !== null && quantity > availableStock) {
            toast.error('Stock insuficiente en almacén de origen');
            return;
        }
        if (variantSum(variantsInput) > quantity) {
            toast.error('Las tallas suman más que la cantidad');
            return;
        }

        setLoading(true);
        try {
            const body: Record<string, unknown> = {
                product_id: selectedProduct.id,
                from_warehouse_id: fromWarehouseId,
                to_warehouse_id: toWarehouseId,
                quantity,
                notes
            };
            const variants = variantPayload(variantsInput);
            if (Object.keys(variants).length > 0) body.variants = variants;

            const { status, response }: IResponse = await request('/inventory-movements/transfer', 'POST', JSON.stringify(body));

            if (status >= 200 && status < 300) {
                toast.success('Transferencia realizada con éxito');
                if (!isEmbedded) navigate('/inventory/movements');
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al realizar transferencia');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    const content = (
        <Box sx={{ p: isEmbedded ? 0 : 2, maxWidth: isEmbedded ? '100%' : 800, mx: isEmbedded ? 0 : 'auto' }}>
            <Paper sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="h6" gutterBottom>Transferencia de Stock</Typography>
                        <Divider />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Autocomplete
                            options={products}
                            getOptionLabel={(option) => `${option.title} (${option.sku})`}
                            value={selectedProduct}
                            onChange={(_, newValue) => setSelectedProduct(newValue)}
                            renderInput={(params) => <TextFieldCustom {...params} label="Producto" placeholder="Buscar producto..." />}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <WarehouseSelector
                            label="Desde Almacén (Origen)"
                            value={fromWarehouseId}
                            onChange={setFromWarehouseId}
                        />
                        {availableStock !== null && (
                            <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                                Stock disponible: <strong>{availableStock}</strong>
                            </Alert>
                        )}
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <WarehouseSelector
                            label="Hacia Almacén (Destino)"
                            value={toWarehouseId}
                            onChange={setToWarehouseId}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Cantidad a Transferir"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            inputProps={{ min: 1, max: availableStock || undefined }}
                        />
                    </Grid>

                    {(selectedProduct?.variants ?? []).length > 0 && (
                        <Grid size={{ xs: 12 }}>
                            <VariantBreakdown
                                variants={selectedProduct?.variants ?? []}
                                value={variantsInput}
                                onChange={setVariantsInput}
                                total={quantity}
                                available={availableVariants}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Notas / Observaciones"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        {!isEmbedded && (
                            <ButtonCustom variant="outlined" onClick={() => navigate(-1)}>
                                Cancelar
                            </ButtonCustom>
                        )}
                        <ButtonCustom onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Procesando...' : 'Confirmar Transferencia'}
                        </ButtonCustom>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );

    if (isEmbedded) return content;

    return (
        <Layout>
            <DescripcionDeVista
                title="Nueva Transferencia"
                description="Mover stock entre almacenes"
            />
            {content}
        </Layout>
    );
};

