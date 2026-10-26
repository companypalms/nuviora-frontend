import { useState, useEffect } from "react";
import { IProductVariant } from "../../interfaces/inventory.types";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography, IconButton, Grid, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { ButtonCustom } from "../custom";
import { ProductSearchDialog } from "../products/ProductsSearchDialog";
import { DeleteOutline, AddCircleOutline } from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { useUserStore } from "../../store/user/UserStore";
import { fmtMoney } from "../../lib/money";
import { orderNo } from "../../lib/functions";

interface CreateOrderDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (order: any) => void;
    prefillName?: string;
    prefillPhone?: string;
}

export const CreateOrderDialog = ({ open, onClose, onSuccess, prefillName, prefillPhone }: CreateOrderDialogProps) => {
    const user = useUserStore(state => state.user);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [clientName, setClientName] = useState("");

    // Phone Split
    const [phonePrefix, setPhonePrefix] = useState("0412");
    const [phoneNumber, setPhoneNumber] = useState("");

    const [clientProvince, setClientProvince] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("");

    // Product List
    const [products, setProducts] = useState<any[]>([]);
    const [openProductSearch, setOpenProductSearch] = useState(false);

    // Fran (30-sep): cuántas hay de cada talla en la ciudad del cliente (variant_id => piezas)
    const [cityStock, setCityStock] = useState<Record<number, number> | null>(null);

    // Dynamic Data
    const [agents, setAgents] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const isAdminOrManager = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user.role?.description || '');

    useEffect(() => {
        if (open) {
            fetchCities();
            if (isAdminOrManager) {
                fetchAgents();
            }

            // Prefill logic
            if (prefillName) setClientName(prefillName);
            if (prefillPhone) {
                // Remove non-numeric characters and handle common formats
                const cleanPhone = prefillPhone.replace(/\D/g, '');
                
                // If contains country code (e.g. 58), remove it
                let trimmed = cleanPhone.startsWith('58') ? cleanPhone.substring(2) : cleanPhone;
                
                // Handle formats starting with 0 (e.g. 0412...)
                if (trimmed.startsWith('0')) trimmed = trimmed.substring(1);

                if (trimmed.length === 10) {
                    const prefix = `0${trimmed.substring(0, 3)}`;
                    const number = trimmed.substring(3);
                    const validPrefixes = ['0412', '0422', '0414', '0424', '0416', '0426'];
                    if (validPrefixes.includes(prefix)) {
                        setPhonePrefix(prefix);
                        setPhoneNumber(number);
                    } else {
                        setPhoneNumber(trimmed.substring(3)); // Fallback, let user adjust
                    }
                }
            }
        }
    }, [open, isAdminOrManager, prefillName, prefillPhone]);

    const fetchCities = async () => {
        try {
            const { status, response } = await request('/cities', 'GET');
            if (status === 200) {
                const data = await response.json();
                setCities(data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };
    const fetchAgents = async () => {
        try {
            const { status, response } = await request('/users/role/Vendedor', 'GET');
            if (status === 200) {
                const data = await response.json();
                setAgents(data.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Tarea 4: un producto con tallas va en una fila por talla (se elige en la fila); sin tallas, se suma a la suya
    const activeVariants = (p: { variants?: IProductVariant[] }) => (p.variants ?? []).filter(v => v.is_active);

    // Qué tallas hay en la ciudad elegida (sin decir de qué agencia): se vuelve a pedir al cambiar la ciudad o los productos
    const variantProductIds = Array.from(new Set(products.filter(p => activeVariants(p).length > 0).map(p => p.id))).sort().join(',');
    useEffect(() => {
        if (!open || !clientProvince || !variantProductIds) {
            setCityStock(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { status, response } = await request(`/inventory/by-city?city=${encodeURIComponent(clientProvince)}&product_ids=${variantProductIds}`, 'GET');
                if (status !== 200 || cancelled) return;
                const data = await response.json();
                const city = (data.data ?? [])[0];
                if (!city || !city.has_agency) {
                    setCityStock(null); // ciudad sin agencias configuradas: no se sabe, no se limita
                    return;
                }
                const map: Record<number, number> = {};
                for (const prod of city.products ?? []) {
                    for (const v of prod.variants ?? []) map[v.id] = v.available;
                }
                setCityStock(map);
            } catch (error) {
                console.error(error);
            }
        })();
        return () => { cancelled = true; };
    }, [open, clientProvince, variantProductIds]);

    // Piezas de esa talla pedidas en todo el formulario (dos filas de la misma talla suman)
    const requestedOf = (variantId: number) => products.filter(p => p.variant_id === variantId).reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    const variantShort = (p: any) => {
        if (!cityStock || !p.variant_id) return null;
        const have = cityStock[p.variant_id] ?? 0;
        return have < requestedOf(p.variant_id) ? have : null;
    };
    const handleAddProduct = (product: any) => {
        setProducts(prev => {
            const exists = activeVariants(product).length === 0 && prev.find(p => p.id === product.id);
            if (exists) {
                return prev.map(p => p.rowKey === exists.rowKey ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { ...product, rowKey: `${product.id}-${Date.now()}`, variant_id: '', quantity: 1, price: parseFloat(product.price || 0) }];
        });
        setOpenProductSearch(false);
    };

    const handleRemoveProduct = (rowKey: string) => {
        setProducts(prev => prev.filter(p => p.rowKey !== rowKey));
    };

    const handleQuantityChange = (rowKey: string, qty: number) => {
        if (qty < 1) return;
        setProducts(prev => prev.map(p => p.rowKey === rowKey ? { ...p, quantity: qty } : p));
    };

    const handlePriceChange = (rowKey: string, price: number) => {
        if (price < 0) return;
        setProducts(prev => prev.map(p => p.rowKey === rowKey ? { ...p, price: price } : p));
    };

    const handleVariantChange = (rowKey: string, variantId: number) => {
        setProducts(prev => prev.map(p => p.rowKey === rowKey ? { ...p, variant_id: variantId } : p));
    };

    const calculateTotal = () => {
        return products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    };

    const handleSubmit = async () => {
        const fullPhone = `${phonePrefix}${phoneNumber}`;

        if (!clientName || phoneNumber.length !== 7 || !clientProvince || products.length === 0) {
            toast.warning("Por favor complete los campos obligatorios. El teléfono debe tener 7 dígitos.");
            return;
        }
        const missing = products.find(p => activeVariants(p).length > 0 && !p.variant_id);
        if (missing) {
            toast.warning(`Elige la talla de ${missing.name || missing.title}.`);
            return;
        }
        const short = products.find(p => variantShort(p) !== null);
        if (short) {
            const title = activeVariants(short).find(v => v.id === short.variant_id)?.title;
            toast.warning(`No hay suficientes de la talla ${title} de ${short.name || short.title} en ${clientProvince}.`);
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                client_name: clientName,
                client_phone: fullPhone,
                client_province: clientProvince,
                client_address: clientAddress,
                products: products.map(p => ({
                    id: p.id,
                    variant_id: p.variant_id || null,
                    quantity: p.quantity,
                    price: p.price
                }))
            };

            if (isAdminOrManager && selectedAgent) {
                payload.agent_id = selectedAgent;
            }

            const { status, response } = await request('/orders', 'POST', JSON.stringify(payload));
            const data = await response.json();

            if (status === 200 && data.status) {
                toast.success(`Orden ${orderNo(data.order.name)} creada exitosamente`);
                if (onSuccess) onSuccess(data.order);
                handleClose();
            } else {
                toast.error(data.message || "Error al crear la orden");
            }

        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setClientName("");
        setPhonePrefix("0412");
        setPhoneNumber("");
        setClientProvince("");
        setClientAddress("");
        setSelectedAgent("");
        setProducts([]);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Crear Orden Manual</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Sección Cliente */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Datos del Cliente</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Nombre Completo"
                                    fullWidth
                                    required
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                />
                            </Grid>

                            {/* Teléfono Dividido */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <FormControl sx={{ minWidth: 100 }}>
                                        <InputLabel>Prefijo</InputLabel>
                                        <Select
                                            value={phonePrefix}
                                            label="Prefijo"
                                            onChange={(e) => setPhonePrefix(e.target.value)}
                                        >
                                            {['0412', '0422', '0414', '0424', '0416', '0426'].map(p => (
                                                <MenuItem key={p} value={p}>{p}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Número (7 dígitos)"
                                        fullWidth
                                        required
                                        value={phoneNumber}
                                        onChange={e => {
                                            // Allow only numbers and max 7 chars
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 7) setPhoneNumber(val);
                                        }}
                                        slotProps={{ htmlInput: { maxLength: 7, inputMode: 'numeric' } }}
                                    />
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Provincia / Ciudad</InputLabel>
                                    <Select
                                        value={clientProvince}
                                        label="Provincia / Ciudad"
                                        onChange={(e) => setClientProvince(e.target.value)}
                                    >
                                        {cities.map((city: any) => (
                                            <MenuItem key={city.id} value={city.name}>
                                                {city.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Dirección Detallada"
                                    fullWidth
                                    value={clientAddress}
                                    onChange={e => setClientAddress(e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Sección Asignación (Solo Admin) */}
                    {isAdminOrManager && (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Asignación</Typography>
                            <FormControl fullWidth size="small">
                                <InputLabel>Vendedora Asignada</InputLabel>
                                <Select
                                    label="Vendedora Asignada"
                                    value={selectedAgent}
                                    onChange={(e) => setSelectedAgent(e.target.value)}
                                >
                                    <MenuItem value="">-- Sin asignar (Nuevo) --</MenuItem>
                                    {agents.map((agent: any) => (
                                        <MenuItem key={agent.id} value={agent.id}>
                                            {agent.username || agent.names + ' ' + (agent.surnames || '')}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {/* Sección Productos */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">Productos</Typography>
                            <Button startIcon={<AddCircleOutline />} onClick={() => setOpenProductSearch(true)} size="small">
                                Agregar Producto
                            </Button>
                        </Box>

                        {products.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                No hay productos agregados
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {products.map((p) => (
                                    <Box key={p.rowKey} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, flexWrap: 'wrap' }}>
                                        <Box sx={{ flex: 1, minWidth: 120 }}>
                                            <Typography variant="body2" fontWeight="bold">{p.name || p.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
                                        </Box>

                                        {activeVariants(p).length > 0 && (
                                            <TextField
                                                select
                                                label="Talla"
                                                size="small"
                                                sx={{ width: 150 }}
                                                value={p.variant_id}
                                                onChange={(e) => handleVariantChange(p.rowKey, Number(e.target.value))}
                                                error={!p.variant_id || variantShort(p) !== null}
                                                helperText={
                                                    !clientProvince ? 'Elige la ciudad para ver qué hay'
                                                        : variantShort(p) !== null ? (variantShort(p) ? `Solo hay ${variantShort(p)}` : 'No hay en la ciudad')
                                                            : undefined
                                                }
                                            >
                                                {activeVariants(p).map((v) => {
                                                    const have = cityStock ? (cityStock[v.id] ?? 0) : null;
                                                    return (
                                                        <MenuItem key={v.id} value={v.id} disabled={have !== null && have <= 0}>
                                                            {v.title}{have === null ? '' : have > 0 ? ` · hay ${have}` : ' · no hay'}
                                                        </MenuItem>
                                                    );
                                                })}
                                            </TextField>
                                        )}

                                        <TextField
                                            label="Cant."
                                            type="number"
                                            size="small"
                                            sx={{ width: 80 }}
                                            value={p.quantity}
                                            onChange={(e) => handleQuantityChange(p.rowKey, parseInt(e.target.value))}
                                        />

                                        <TextField
                                            label="Precio ($)"
                                            type="number"
                                            size="small"
                                            sx={{ width: 100 }}
                                            value={p.price}
                                            onChange={(e) => handlePriceChange(p.rowKey, parseFloat(e.target.value))}
                                        />

                                        <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 60, textAlign: 'right' }}>
                                            {fmtMoney(p.price * p.quantity, 'USD')}
                                        </Typography>

                                        <IconButton size="small" color="error" onClick={() => handleRemoveProduct(p.rowKey)}>
                                            <DeleteOutline />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Total: {fmtMoney(calculateTotal(), 'USD')}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom variant="outlined" onClick={handleClose} disabled={loading}>Cancelar</ButtonCustom>
                <ButtonCustom variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Orden'}
                </ButtonCustom>
            </DialogActions>

            <ProductSearchDialog
                open={openProductSearch}
                onClose={() => setOpenProductSearch(false)}
                onPick={handleAddProduct}
            />
        </Dialog>
    );
};
