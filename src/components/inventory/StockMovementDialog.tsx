import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    Typography,
    MenuItem,
    Grid,
} from '@mui/material';
import { ButtonCustom } from '../custom';
import { WarehouseSelector } from './WarehouseSelector';
import { VariantBreakdown } from './VariantBreakdown';
import { IProduct, IVariantStock } from '../../interfaces/inventory.types';
import { variantPayload, variantSum } from '../../common/variants';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { IResponse } from '../../interfaces/response-type';
import { useUserStore } from '../../store/user/UserStore';
import { PurchaseFields } from '../finance/PurchaseFields';
import { PurchaseValue, emptyPurchase, pendingPurchasePayload, pendingPurchaseReady, purchasePayload, purchaseReady, uploadPurchaseReceipt } from '../finance/purchase';
import { todayCaracas } from '../finance/finance';

type MovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'writeoff';

// Módulo 5 de Fran (§94, R4): el tipo del ajuste, y las salidas que cuentan como gasto (igual que la merma)
const COUNT_REASONS: Record<string, string> = { count_error: 'Error de conteo', admin_correction: 'Corrección administrativa', other: 'Otro' };
const WRITE_OFF_REASONS: Record<string, string> = { sample: 'Muestra', gift: 'Regalo', internal_use: 'Uso interno' };

interface StockMovementDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: IProduct;
    initialType?: MovementType;
}

export const StockMovementDialog: React.FC<StockMovementDialogProps> = ({
    open,
    onClose,
    onSuccess,
    product,
    initialType = 'in'
}) => {
    const [type, setType] = useState<MovementType>(initialType);
    const [fromWarehouseId, setFromWarehouseId] = useState<number | null>(null);
    const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableStock, setAvailableStock] = useState<number | null>(null);
    // Tallas y variantes (tarea 4): cantidad de cada una y lo que hay en el almacén que se mira
    const [variantsInput, setVariantsInput] = useState<Record<number, number>>({});
    const [availableVariants, setAvailableVariants] = useState<Record<number, number> | undefined>(undefined);
    // Módulo 4 de Fran (§9, §16, R6): el ingreso del Admin pregunta cuánto costó la compra
    const isAdmin = useUserStore((s) => s.user.role?.description) === 'Admin';
    const [purchase, setPurchase] = useState<PurchaseValue>(emptyPurchase());
    const withPurchase = type === 'in' && isAdmin && purchase.enabled;
    // Módulo 5 (§16, R3): la compra puede quedar "por recibir", con la fecha en que llega; no suma stock todavía
    const [arrival, setArrival] = useState<'now' | 'pending'>('now');
    const [expectedAt, setExpectedAt] = useState('');
    const pendingPurchase = withPurchase && arrival === 'pending';
    const [countReason, setCountReason] = useState('count_error');
    const [writeOffReason, setWriteOffReason] = useState('');

    useEffect(() => {
        if (open) {
            setType(initialType);
            setFromWarehouseId(null);
            setToWarehouseId(null);
            setQuantity(1);
            setNotes('');
            setAvailableStock(null);
            setVariantsInput({});
            setAvailableVariants(undefined);
            setPurchase(emptyPurchase());
            setArrival('now');
            setExpectedAt('');
            setCountReason('count_error');
            setWriteOffReason('');
        }
    }, [open, initialType, product]);

    // El stock que se muestra es el del origen (salida, traslado) o el del almacén que se ajusta
    const stockWarehouseId = type === 'out' || type === 'transfer' || type === 'writeoff' ? fromWarehouseId : type === 'adjustment' ? toWarehouseId : null;

    useEffect(() => {
        setVariantsInput({});
        if (stockWarehouseId && product) {
            checkStock(stockWarehouseId);
        } else {
            setAvailableStock(null);
            setAvailableVariants(undefined);
        }
    }, [stockWarehouseId, product, type]);

    const checkStock = async (warehouseId: number) => {
        try {
            const { status, response }: IResponse = await request(
                `/warehouses/${warehouseId}/inventory?product_id=${product?.id}`,
                'GET'
            );
            if (status === 200) {
                const data = await response.json();
                const stock = data.current_stock ?? 0;
                setAvailableStock(stock);
                const byVariant: Record<number, number> = {};
                (data.current_variants ?? []).forEach((v: IVariantStock) => { byVariant[v.variant_id] = v.quantity; });
                setAvailableVariants(byVariant);
                if (type === 'adjustment') setQuantity(stock);
            }
        } catch (error) {
            console.error("Error checking stock", error);
        }
    };

    const variants = product?.variants ?? [];
    const hasVariants = variants.length > 0;
    const mode = type === 'adjustment' ? 'absolute' : 'split';
    const variantsTotal = mode === 'absolute'
        ? variants.reduce((a, v) => a + (variantsInput[v.id] ?? availableVariants?.[v.id] ?? 0), 0)
        : variantSum(variantsInput);
    const variantsOk = !hasVariants || variantsTotal <= quantity;

    const handleSubmit = async () => {
        if (!product) return;
        if (quantity <= 0 && type !== 'adjustment') {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }
        if (!variantsOk) {
            toast.error(`Las tallas suman ${variantsTotal} y la cantidad es ${quantity}`);
            return;
        }

        setLoading(true);
        try {
            let endpoint = '';
            let body: any = {
                product_id: product.id,
                quantity,
                notes
            };

            if (hasVariants) {
                const payload = variantPayload(variantsInput, mode);
                if (Object.keys(payload).length > 0) body.variants = payload;
            }

            switch (type) {
                case 'in':
                    if (!toWarehouseId) { toast.error('Seleccione almacén destino'); setLoading(false); return; }
                    if (pendingPurchase) {
                        endpoint = '/finance/purchases';
                        body = { ...body, ...pendingPurchasePayload(purchase, expectedAt), warehouse_id: toWarehouseId };
                        break;
                    }
                    endpoint = '/inventory-movements/in';
                    body.to_warehouse_id = toWarehouseId;
                    if (withPurchase) body.purchase = purchasePayload(purchase);
                    break;
                case 'writeoff':
                    if (!fromWarehouseId) { toast.error('Seleccione almacén'); setLoading(false); return; }
                    if (!writeOffReason) { toast.error('Elige si es muestra, regalo o uso interno'); setLoading(false); return; }
                    if (notes.trim().length < 3) { toast.error('Escribe el motivo: para quién o para qué'); setLoading(false); return; }
                    endpoint = '/inventory-movements/write-off';
                    body.warehouse_id = fromWarehouseId;
                    body.reason = writeOffReason;
                    break;
                case 'out':
                    if (!fromWarehouseId) { toast.error('Seleccione almacén origen'); setLoading(false); return; }
                    endpoint = '/inventory-movements/out';
                    body.from_warehouse_id = fromWarehouseId;
                    break;
                case 'transfer':
                    if (!fromWarehouseId) { toast.error('Seleccione almacén origen'); setLoading(false); return; }
                    if (!toWarehouseId) { toast.error('Seleccione almacén destino'); setLoading(false); return; }
                    if (fromWarehouseId === toWarehouseId) { toast.error('Los almacenes deben ser diferentes'); setLoading(false); return; }
                    endpoint = '/inventory-movements/transfer';
                    body.from_warehouse_id = fromWarehouseId;
                    body.to_warehouse_id = toWarehouseId;
                    break;
                case 'adjustment':
                    if (!toWarehouseId) { toast.error('Seleccione almacén'); setLoading(false); return; }
                    if (countReason === 'other' && !notes.trim()) { toast.error('Con "Otro", explica el motivo del ajuste'); setLoading(false); return; }
                    endpoint = '/inventory-movements/adjust';
                    body.warehouse_id = toWarehouseId;
                    body.new_quantity = quantity;
                    body.reason = countReason;
                    break;
            }

            const { status, response }: IResponse = await request(endpoint, 'POST', JSON.stringify(body));

            if (status === 200 || status === 201) {
                const data = await response.json().catch(() => ({}));
                if (withPurchase && !pendingPurchase && purchase.receipt && data.purchase?.id) await uploadPurchaseReceipt(data.purchase.id, purchase.receipt);
                // El traslado, la compra y la salida interna dicen qué pasó (por ejemplo, que el traslado queda en tránsito)
                toast.success((withPurchase || type === 'transfer' || type === 'writeoff') && data.message ? data.message : 'Movimiento realizado con éxito');
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al realizar movimiento');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'in': return 'Entrada de Stock ➕';
            case 'out': return 'Salida de Stock ➖';
            case 'transfer': return 'Transferencia entre Almacenes 🔄';
            case 'adjustment': return 'Ajuste de Inventario (Fijar Stock) 🎯';
            case 'writeoff': return 'Muestra, regalo o uso interno 🎁';
            default: return 'Movimiento de Stock';
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {product?.title} <Typography component="span" variant="body2" color="text.secondary">({product?.sku})</Typography>
                    </Typography>

                    <TextField
                        select
                        label="Tipo de Movimiento"
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="in">Entrada (Compra/Devolución)</MenuItem>
                        <MenuItem value="out">Salida (Venta/Pérdida)</MenuItem>
                        <MenuItem value="transfer">Transferencia</MenuItem>
                        <MenuItem value="adjustment">Ajuste (Corrección)</MenuItem>
                        {isAdmin && <MenuItem value="writeoff">Muestra, regalo o uso interno</MenuItem>}
                    </TextField>
                    {type === 'transfer' && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                            La mercancía sale del origen y queda "En tránsito". Entra al destino cuando marques "Recibido" en Inventario › En camino.
                        </Typography>
                    )}
                    {type === 'adjustment' && (
                        <>
                            <TextField select label="Tipo de ajuste" value={countReason} onChange={(e) => setCountReason(e.target.value)} fullWidth size="small">
                                {Object.entries(COUNT_REASONS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                            </TextField>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                                ¿Dañado o perdido? No es un ajuste: usa "Pasar a revisión" en la tarjeta del producto. ¿Muestra, regalo o uso interno? Elige ese tipo de movimiento arriba.
                            </Typography>
                        </>
                    )}
                    {type === 'writeoff' && (
                        <>
                            <TextField select label="¿Qué es?" value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} fullWidth size="small" required>
                                {Object.entries(WRITE_OFF_REASONS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                            </TextField>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                                Sale del inventario sin ser una venta, y su costo cuenta como gasto, igual que la merma.
                            </Typography>
                        </>
                    )}
                    {type === 'out' && isAdmin && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                            ¿Una pieza dañada o perdida? Mejor usa "Pasar a revisión", en la tarjeta del producto: queda para revisarla y, si se da de baja, cuenta como merma.
                        </Typography>
                    )}

                    {(type === 'out' || type === 'transfer' || type === 'writeoff') && (
                        <WarehouseSelector
                            label={type === 'writeoff' ? "Almacén" : "Desde Almacén (Origen)"}
                            value={fromWarehouseId}
                            onChange={setFromWarehouseId}
                        />
                    )}

                    {(type === 'in' || type === 'transfer' || type === 'adjustment') && (
                        <WarehouseSelector
                            label={type === 'transfer' ? "Hacia Almacén (Destino)" : "Almacén"}
                            value={toWarehouseId}
                            onChange={setToWarehouseId}
                        />
                    )}

                    {availableStock !== null && (
                        <Typography variant="body2" color={availableStock > 0 ? "success.main" : "error.main"}>
                            {type === 'adjustment' ? 'Stock actual' : 'Stock disponible en origen'}: <strong>{availableStock}</strong>
                        </Typography>
                    )}

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label={type === 'adjustment' ? "Nueva Cantidad Total" : "Cantidad"}
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                    </Grid>

                    {hasVariants && (
                        <VariantBreakdown
                            variants={variants}
                            value={variantsInput}
                            onChange={setVariantsInput}
                            mode={mode}
                            total={quantity}
                            available={availableVariants}
                        />
                    )}

                    {type === 'in' && isAdmin && purchase.enabled && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>¿Ya llegó la mercancía?</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <ButtonCustom variant={arrival === 'now' ? 'contained' : 'outlined'} onClick={() => setArrival('now')}>Ya llegó: entra hoy</ButtonCustom>
                                <ButtonCustom variant={arrival === 'pending' ? 'contained' : 'outlined'} onClick={() => setArrival('pending')}>Por recibir</ButtonCustom>
                                {arrival === 'pending' && (
                                    <TextField type="date" label="Llega el" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} size="small" required
                                        InputLabelProps={{ shrink: true }} inputProps={{ min: todayCaracas() }} />
                                )}
                            </Box>
                        </Box>
                    )}
                    {type === 'in' && isAdmin && <PurchaseFields value={purchase} onChange={setPurchase} quantity={quantity} pending={pendingPurchase} />}

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Notas / Motivo"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom onClick={onClose} color="primary" variant="outlined">
                    Cancelar
                </ButtonCustom>
                <ButtonCustom
                    onClick={handleSubmit}
                    disabled={loading || !variantsOk || (withPurchase && !(pendingPurchase ? pendingPurchaseReady(purchase, expectedAt) : purchaseReady(purchase)))}
                >
                    {loading ? 'Procesando...' : 'Guardar'}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
