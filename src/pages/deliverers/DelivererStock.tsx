import React, { useEffect, useState } from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    IconButton,
    Divider,
} from "@mui/material";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import KeyboardReturnRoundedIcon from "@mui/icons-material/KeyboardReturnRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { TypographyCustom } from "../../components/custom";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { IResponse } from "../../interfaces/response-type";
import { useUserStore } from "../../store/user/UserStore";


interface Deliverer {
    id: number;
    names: string;
    surnames: string;
    email: string;
}

interface InventoryProduct {
    id: number;
    name: string;
    sku?: string;
    stock_available: number; // lo que expone el endpoint de inventario
}

interface DelivererStockProduct {
    id: number;
    product_id: number;
    name: string;
    sku?: string;
    quantity: number;
}

interface Props {
    isEmbedded?: boolean;
}

export const DelivererStock: React.FC<Props> = ({ isEmbedded }) => {
    const { user } = useUserStore.getState();
    const { loadingSession, isValid } = useValidateSession();

    const [loading, setLoading] = useState(false);
    const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
    const [selectedDelivererId, setSelectedDelivererId] = useState<number | "">("");

    const [inventory, setInventory] = useState<InventoryProduct[]>([]);
    const [delivererStock, setDelivererStock] = useState<DelivererStockProduct[]>([]);

    // cantidades que escribes en los inputs
    const [assignQty, setAssignQty] = useState<Record<number, number>>({});
    const [returnQty, setReturnQty] = useState<Record<number, number>>({});

    // 🔹 Cargar repartidores + inventario al montar
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);

                // Repartidores
                const resDeliverers: IResponse = await request("/users/deliverers", "GET");
                if (resDeliverers.status) {
                    const data = await resDeliverers.response.json();
                    setDeliverers(data.data ?? []);
                } else {
                    toast.error("No se pudieron cargar los repartidores ❌");
                }

                // Inventario general (Bodega principal)
                const resInventory: IResponse = await request("/inventory?main=true", "GET");
                if (resInventory.status) {
                    const data = await resInventory.response.json();
                    setInventory(data.data ?? []);
                } else {
                    toast.error("No se pudo cargar el inventario ❌");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error al cargar datos de stock 🚨");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    // 🔹 Cargar stock del repartidor cuando cambie el seleccionado
    useEffect(() => {
        const fetchDelivererStock = async () => {
            if (!selectedDelivererId) return;
            try {
                setLoading(true);
                const res: IResponse = await request(
                    `/deliverers/${selectedDelivererId}/stock`,
                    "GET"
                );
                if (res.status) {
                    const data = await res.response.json();
                    const items = data.data?.items ?? data.data ?? [];
                    setDelivererStock(items);
                } else {
                    toast.error("No se pudo obtener el stock del repartidor ❌");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error cargando stock del repartidor 🚨");
            } finally {
                setLoading(false);
            }
        };

        fetchDelivererStock();
    }, [selectedDelivererId]);

    const handleAssign = async (productId: number) => {
        if (!selectedDelivererId) {
            toast.warning("Primero selecciona un repartidor");
            return;
        }

        const qty = assignQty[productId] ?? 0;
        if (!qty || qty <= 0) {
            toast.warning("Ingrese una cantidad válida para asignar");
            return;
        }

        try {
            setLoading(true);
            const body = new URLSearchParams();
            body.append("product_id", String(productId));
            body.append("quantity", String(qty));

            const { status, response }: IResponse = await request(
                `/deliverers/${selectedDelivererId}/stock/assign`,
                "POST",
                body
            );
            switch (status) {
                case 200:
                    const data = await response.json();
                    if (data.inventory) setInventory(data.inventory);
                    if (data.deliverer_stock) setDelivererStock(data.deliverer_stock);
                    setAssignQty((prev) => ({ ...prev, [productId]: 0 }));
                    toast.success("Stock asignado correctamente ✅");
                    break;
                case 400:
                    toast.error("El usuario no es repartidor ❌");
                    break;
                case 422:
                    const { message } = await response.json();
                    toast.error(message);
                    break;

            }
        } catch (err) {
            console.error(err);
            toast.error("Error en servidor al asignar stock 🚨");
        } finally {
            setLoading(false);
        }
    };

    const handleReturn = async (rowId: number, productId: number) => {
        if (!selectedDelivererId) {
            toast.warning("Primero selecciona un repartidor");
            return;
        }

        const qty = returnQty[rowId] ?? 0;
        if (!qty || qty <= 0) {
            toast.warning("Ingrese una cantidad válida para devolver");
            return;
        }

        try {
            setLoading(true);
            const body = new URLSearchParams();
            body.append("product_id", String(productId));
            body.append("quantity", String(qty));

            const res: IResponse = await request(
                `/deliverers/${selectedDelivererId}/stock/return`,
                "POST",
                body
            );

            if (res.status) {
                const data = await res.response.json();

                if (data.inventory) setInventory(data.inventory);
                if (data.deliverer_stock) setDelivererStock(data.deliverer_stock);

                // limpiar input de ese row
                setReturnQty((prev) => ({ ...prev, [rowId]: 0 }));

                toast.success("Stock devuelto correctamente ✅");
            } else {
                toast.error("No se pudo devolver el stock ❌");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error en servidor al devolver stock 🚨");
        } finally {
            setLoading(false);
        }
    };

    const selectedDeliverer = deliverers.find((d) => d.id === selectedDelivererId);
    if (loadingSession || !isValid || !user.token) {
        return <Loading />;
    }

    const content = (
        <Box sx={{ p: isEmbedded ? 0 : 2 }}>
            {loading && <Loading />}

            <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                    <InputLabel id="deliverer-select-label">Repartidor</InputLabel>
                    <Select
                        labelId="deliverer-select-label"
                        label="Repartidor"
                        value={selectedDelivererId}
                        onChange={(e) =>
                            setSelectedDelivererId(e.target.value as number | "")
                        }
                    >
                        {deliverers.map((d) => (
                            <MenuItem key={d.id} value={d.id}>
                                {d.names} {d.surnames} ({d.email})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedDeliverer && (
                    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <TypographyCustom variant="subtitle1" fontWeight="bold">
                            Stock actual de: {selectedDeliverer.names} {selectedDeliverer.surnames}
                        </TypographyCustom>
                        <TypographyCustom variant="body2" color="text.secondary">
                            Productos asignados hoy:{" "}
                            {delivererStock.length > 0 && delivererStock.reduce(
                                (acc, item) => acc + (item.quantity ?? 0),
                                0
                            )}
                        </TypographyCustom>
                    </Box>
                )}
            </Box>

            <Grid container spacing={2}>
                {/* Inventario general */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                        <TypographyCustom variant="h6" sx={{ mb: 1 }}>
                            Inventario general
                        </TypographyCustom>
                        <TypographyCustom
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Selecciona un repartidor y asigna cantidades desde aquí.
                        </TypographyCustom>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 500, overflowY: "auto" }}>
                            {inventory.length === 0 && (
                                <TypographyCustom
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    No hay productos en el inventario.
                                </TypographyCustom>
                            )}

                            {inventory.map((p) => (
                                <Box
                                    key={p.id}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: "1px solid rgba(0,0,0,0.05)",
                                        backgroundColor: "background.paper",
                                    }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <TypographyCustom variant="subtitle2">
                                            {p.name}
                                        </TypographyCustom>
                                        <TypographyCustom
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            SKU: {p.sku ?? "N/A"}
                                        </TypographyCustom>
                                        <TypographyCustom variant="body2">
                                            Stock disponible: {p.stock_available}
                                        </TypographyCustom>
                                    </Box>

                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Cant."
                                        sx={{ width: 90 }}
                                        value={assignQty[p.id] ?? ""}
                                        onChange={(e) =>
                                            setAssignQty((prev) => ({
                                                ...prev,
                                                [p.id]: Number(e.target.value),
                                            }))
                                        }
                                        inputProps={{ min: 0 }}
                                    />

                                    <IconButton
                                        onClick={() => handleAssign(p.id)}
                                        color="primary"
                                        disabled={!selectedDelivererId}
                                    >
                                        <AddCircleOutlineRoundedIcon />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>

                {/* Stock del repartidor */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                        <TypographyCustom variant="h6" sx={{ mb: 1 }}>
                            Stock del repartidor
                        </TypographyCustom>
                        <TypographyCustom
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Aquí ves lo que tiene asignado y puedes registrar devoluciones.
                        </TypographyCustom>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 500, overflowY: "auto" }}>
                            {(!selectedDelivererId || delivererStock.length === 0) && (
                                <TypographyCustom
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {selectedDelivererId
                                        ? "Este repartidor no tiene productos asignados aún."
                                        : "Selecciona un repartidor para ver su stock."}
                                </TypographyCustom>
                            )}

                            {delivererStock.length > 0 && delivererStock.map((row) => (
                                <Box
                                    key={row.id}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: "1px solid rgba(0,0,0,0.05)",
                                        backgroundColor: "background.paper",
                                    }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <TypographyCustom variant="subtitle2">
                                            {row.name}
                                        </TypographyCustom>
                                        <TypographyCustom
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            SKU: {row.sku ?? "N/A"}
                                        </TypographyCustom>
                                        <TypographyCustom variant="body2">
                                            Cantidad asignada: {row.quantity}
                                        </TypographyCustom>
                                    </Box>

                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Devolver"
                                        sx={{ width: 100 }}
                                        value={returnQty[row.id] ?? ""}
                                        onChange={(e) =>
                                            setReturnQty((prev) => ({
                                                ...prev,
                                                [row.id]: Number(e.target.value),
                                            }))
                                        }
                                        inputProps={{ min: 0, max: row.quantity }}
                                    />

                                    <IconButton
                                        onClick={() => handleReturn(row.id, row.product_id)}
                                        color="secondary"
                                        disabled={!selectedDelivererId}
                                    >
                                        <KeyboardReturnRoundedIcon />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );

    if (isEmbedded) return content;

    return (
        <Layout>
            <DescripcionDeVista
                title="Stock de repartidores"
                description="Asigna y controla el stock diario de cada repartidor."
            />
            {content}
        </Layout>
    );
};

