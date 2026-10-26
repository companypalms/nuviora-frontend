import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, TextField, Autocomplete, Divider, MenuItem, Alert } from '@mui/material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { WarehouseSelector } from '../../components/inventory/WarehouseSelector';
import { VariantBreakdown } from '../../components/inventory/VariantBreakdown';
import { variantPayload, variantSum } from '../../common/variants';
import { ButtonCustom } from '../../components/custom';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IProduct, IVariantStock } from '../../interfaces/inventory.types';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../../components/ui/content/Loading';
import { useValidateSession } from '../../hooks/useValidateSession';
import { PurchaseFields } from '../../components/finance/PurchaseFields';
import { PurchaseValue, emptyPurchase, purchasePayload, purchaseReady, uploadPurchaseReceipt } from '../../components/finance/purchase';

interface Props {
    isEmbedded?: boolean;
}

export const StockAdjustment: React.FC<Props> = ({ isEmbedded }) => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<IProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
    const [warehouseId, setWarehouseId] = useState<number | null>(null);
    const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    // Tarea 4: cantidades por talla (reparto en entrada/salida, cantidad exacta en ajuste)
    const [variantsInput, setVariantsInput] = useState<Record<number, number>>({});
    const [currentVariants, setCurrentVariants] = useState<Record<number, number> | undefined>(undefined);
    const { loadingSession, isValid, user } = useValidateSession();
    // Módulo 4 de Fran (§9, §16, R6): el ingreso del Admin pregunta cuánto costó la compra
    const isAdmin = user?.role?.description === 'Admin';
    const [purchase, setPurchase] = useState<PurchaseValue>(emptyPurchase());
    const withPurchase = type === 'in' && isAdmin && purchase.enabled;

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        setVariantsInput({});
        if (warehouseId && selectedProduct) {
            checkStock();
        } else {
            setCurrentStock(null);
            setCurrentVariants(undefined);
        }
    }, [warehouseId, selectedProduct]);

    useEffect(() => { setVariantsInput({}); }, [type]);

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
        if (!warehouseId || !selectedProduct) return;
        try {
            const { status, response }: IResponse = await request(
                `/warehouses/${warehouseId}/inventory?product_id=${selectedProduct.id}`,
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
                setCurrentStock(stock);
                const byVariant: Record<number, number> = {};
                (data.current_variants ?? []).forEach((v: IVariantStock) => { byVariant[v.variant_id] = v.quantity; });
                setCurrentVariants(byVariant);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !warehouseId) {
            toast.error('Complete todos los campos requeridos');
            return;
        }
        if (quantity <= 0 && type !== 'adjustment') {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }
        const variantMode = type === 'adjustment' ? 'absolute' : 'split';
        const variantTotal = variantMode === 'absolute'
            ? (selectedProduct.variants ?? []).reduce((a, v) => a + (variantsInput[v.id] ?? currentVariants?.[v.id] ?? 0), 0)
            : variantSum(variantsInput);
        if (variantTotal > quantity) {
            toast.error(`Las tallas suman ${variantTotal} y la cantidad es ${quantity}`);
            return;
        }

        setLoading(true);
        try {
            let endpoint = '';
            let body: any = {
                product_id: selectedProduct.id,
                quantity,
                notes
            };
            const variants = variantPayload(variantsInput, variantMode);
            if (Object.keys(variants).length > 0) body.variants = variants;

            if (type === 'in') {
                endpoint = '/inventory-movements/in';
                body.to_warehouse_id = warehouseId;
                if (withPurchase) body.purchase = purchasePayload(purchase);
            } else if (type === 'out') {
                endpoint = '/inventory-movements/out';
                body.from_warehouse_id = warehouseId;
            } else {
                endpoint = '/inventory-movements/adjust';
                body.warehouse_id = warehouseId;
                body.new_quantity = quantity;
            }

            const { status, response }: IResponse = await request(endpoint, 'POST', JSON.stringify(body));

            if (status >= 200 && status < 300) {
                const data = await response.json().catch(() => ({}));
                if (withPurchase && purchase.receipt && data.purchase?.id) await uploadPurchaseReceipt(data.purchase.id, purchase.receipt);
                toast.success(withPurchase && data.message ? data.message : 'Ajuste realizado con éxito');
                checkStock();
                setVariantsInput({});
                setPurchase(emptyPurchase());
                if (!isEmbedded) navigate('/inventory/movements');
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al realizar ajuste');
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
                        <Typography variant="h6" gutterBottom>Ajuste / Entrada / Salida Manual</Typography>
                        <Divider />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Autocomplete
                            options={products}
                            getOptionLabel={(option) => `${option.title} (${option.sku})`}
                            value={selectedProduct}
                            onChange={(_, newValue) => setSelectedProduct(newValue)}
                            renderInput={(params) => <TextField {...params} label="Producto" placeholder="Buscar producto..." />}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <WarehouseSelector
                            label="Almacén"
                            value={warehouseId}
                            onChange={setWarehouseId}
                        />
                        {currentStock !== null && (
                            <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                                Stock actual: <strong>{currentStock}</strong>
                            </Alert>
                        )}
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            select
                            fullWidth
                            label="Tipo de Movimiento"
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                        >
                            <MenuItem value="in">Entrada (Compra/Devolución)</MenuItem>
                            <MenuItem value="out">Salida (Venta/Pérdida)</MenuItem>
                            <MenuItem value="adjustment">Ajuste (Corrección Total)</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label={type === 'adjustment' ? "Nueva Cantidad Total" : "Cantidad"}
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            inputProps={{ min: 0 }}
                            helperText={type === 'adjustment' ? 'El stock se actualizará a este valor exacto' : ''}
                        />
                    </Grid>

                    {(selectedProduct?.variants ?? []).length > 0 && (
                        <Grid size={{ xs: 12 }}>
                            <VariantBreakdown
                                variants={selectedProduct?.variants ?? []}
                                value={variantsInput}
                                onChange={setVariantsInput}
                                mode={type === 'adjustment' ? 'absolute' : 'split'}
                                total={quantity}
                                available={currentVariants}
                            />
                        </Grid>
                    )}

                    {type === 'in' && isAdmin && (
                        <Grid size={{ xs: 12 }}>
                            <PurchaseFields value={purchase} onChange={setPurchase} quantity={quantity} />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Notas / Motivo"
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
                        <ButtonCustom onClick={handleSubmit} disabled={loading || (withPurchase && !purchaseReady(purchase))}>
                            {loading ? 'Procesando...' : 'Guardar Ajuste'}
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
                title="Ajuste de Stock"
                description="Entradas, salidas y correcciones manuales"
            />
            {content}
        </Layout>
    );
};

