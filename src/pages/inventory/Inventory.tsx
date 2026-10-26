import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Paper, Typography, Divider, IconButton, TextField,
    Table, TableHead, TableRow, TableCell, TableBody, Dialog,
    DialogTitle, DialogContent, DialogActions, Chip, Tooltip,
    Alert
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { request } from "../../common/request";
import { TypographyCustom, ButtonCustom } from "../../components/custom";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { IResponse } from "../../interfaces/response-type";

interface ProductRow {
    id: number;
    inventory_id?: number;
    name: string;
    sku?: string;
    price?: number;
    warehouse_stock: number;
    stock_available?: number;
    available_sizes?: string[];
    sizes_stock?: Record<string, number>;
}

interface Movement {
    id: number;
    product_id: number;
    type: "IN" | "OUT" | "ASSIGN" | "RETURN" | "SALE";
    quantity: number;
    deliverer_id?: number | null;
    order_id?: number | null;
    created_by?: number | null;
    created_at: string;
    note?: string | null;
}

const SizesBreakdownTooltip: React.FC<{ sizes_stock: Record<string, number>; available_sizes: string[] }> = ({ sizes_stock, available_sizes }) => {
    if (!available_sizes || available_sizes.length === 0) return null;
    return (
        <Tooltip
            title={
                <Box>
                    <Typography variant="caption" fontWeight={700}>Desglose por talla:</Typography>
                    {available_sizes.map(size => (
                        <Box key={size} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Typography variant="caption">{size}:</Typography>
                            <Typography variant="caption" fontWeight={700}>{sizes_stock?.[size] ?? 0}</Typography>
                        </Box>
                    ))}
                </Box>
            }
            arrow
        >
            <Chip
                icon={<LayersRounded />}
                label={available_sizes.map(s => `${s}: ${sizes_stock?.[s] ?? 0}`).join(" | ")}
                size="small"
                variant="outlined"
                color="info"
                sx={{ cursor: "pointer", maxWidth: 300, fontSize: "0.7rem" }}
            />
        </Tooltip>
    );
};

export const InventoryPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState<ProductRow | null>(null);
    const [delta, setDelta] = useState<number>(1);
    const [type, setType] = useState<"IN" | "OUT">("IN");
    const [note, setNote] = useState<string>("");
    const [openMovs, setOpenMovs] = useState(false);
    const [movs, setMovs] = useState<Movement[]>([]);
    const [from, setFrom] = useState<string>(dayjs().startOf("month").format("YYYY-MM-DD"));
    const [to, setTo] = useState<string>(dayjs().format("YYYY-MM-DD"));
    // Tallas
    const [sizesInput, setSizesInput] = useState<Record<string, number>>({});
    const { loadingSession, isValid, user } = useValidateSession();

    const load = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/inventory", "GET");
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
            } else {
                toast.error("No se pudo cargar el inventario ❌");
            }
        } catch {
            toast.error("Error cargando inventario 🚨");
        } finally {
            setLoading(false);
        }
    };

    const openDialog = (row: ProductRow, t: "IN" | "OUT") => {
        setSelected(row);
        setDelta(1);
        setType(t);
        setNote("");
        // Inicializar el desglose de tallas en 0 para cada talla conocida
        const initial: Record<string, number> = {};
        (row.available_sizes ?? []).forEach(s => { initial[s] = 0; });
        setSizesInput(initial);
    };

    // Validar que la suma de tallas == delta si el producto tiene tallas configuradas
    const sizesTotal = Object.values(sizesInput).reduce((a, b) => a + (b || 0), 0);
    const hasSizes = (selected?.available_sizes ?? []).length > 0;
    const sizesMatch = !hasSizes || sizesTotal === delta;

    const saveMovement = async () => {
        if (!selected) return;
        if (delta <= 0) { toast.error("La cantidad debe ser mayor a 0"); return; }
        if (hasSizes && !sizesMatch) {
            toast.error(`La suma de tallas (${sizesTotal}) debe ser igual a la cantidad total (${delta})`);
            return;
        }

        try {
            const body = new URLSearchParams();
            body.append("product_id", String(selected.id));
            body.append("type", type);
            body.append("quantity", String(delta));
            if (note) body.append("note", note);
            // Enviar desglose de tallas como JSON
            if (hasSizes && sizesTotal > 0) {
                Object.entries(sizesInput).forEach(([size, qty]) => {
                    if (qty > 0) body.append(`sizes[${size}]`, String(qty));
                });
            }

            const { status }: IResponse = await request("/stock/movements", "POST", body);
            if (status) {
                toast.success("Movimiento registrado ✅");
                setSelected(null);
                load();
            } else {
                toast.error("No se pudo registrar el movimiento ❌");
            }
        } catch {
            toast.error("Error registrando movimiento 🚨");
        }
    };

    const loadMovements = async (p: ProductRow) => {
        setSelected(p);
        setOpenMovs(true);
        try {
            const url = `/stock/movements?product_id=${p.id}&from=${from}&to=${to}`;
            const { status, response }: IResponse = await request(url, "GET");
            if (status) {
                const data = await response.json();
                setMovs(data.data ?? []);
            } else {
                toast.error("No se pudieron cargar los movimientos ❌");
            }
        } catch {
            toast.error("Error cargando movimientos 🚨");
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const x = q.trim().toLowerCase();
        if (!x) return rows;
        return rows.filter(r =>
            r.name.toLowerCase().includes(x) ||
            (r.sku ?? "").toLowerCase().includes(x)
        );
    }, [q, rows]);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title="Inventario" description="Control de stock general" />
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>Productos</Typography>
                        <IconButton onClick={load} disabled={loading}><RefreshRounded /></IconButton>
                        <Box sx={{ flex: 1 }} />
                        <TextField
                            size="small"
                            placeholder="Buscar por nombre o SKU…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Producto</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell align="right">Stock almacén</TableCell>
                                <TableCell>Tallas</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((r) => (
                                <TableRow key={r.id} hover>
                                    <TableCell>{r.name}</TableCell>
                                    <TableCell>{r.sku ?? "—"}</TableCell>
                                    <TableCell align="right">{r.stock_available ?? r.warehouse_stock ?? 0}</TableCell>
                                    <TableCell>
                                        {(r.available_sizes ?? []).length > 0 ? (
                                            <SizesBreakdownTooltip
                                                sizes_stock={r.sizes_stock ?? {}}
                                                available_sizes={r.available_sizes ?? []}
                                            />
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">Sin tallas</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton onClick={() => openDialog(r, "IN")} title="Entrada (IN)"><AddRounded /></IconButton>
                                        <IconButton onClick={() => openDialog(r, "OUT")} title="Salida (OUT)"><RemoveRounded /></IconButton>
                                        <IconButton onClick={() => loadMovements(r)} title="Ver movimientos"><HistoryRounded /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow><TableCell colSpan={5} align="center">Sin resultados</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Box>

            {/* Dialog IN/OUT */}
            <Dialog open={!!selected && !openMovs} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Movimiento {type === "IN" ? "Entrada ➕" : "Salida ➖"}</DialogTitle>
                <DialogContent>
                    <TypographyCustom variant="subtitle1" fontWeight="bold">{selected?.name}</TypographyCustom>
                    <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
                        <TextField
                            label="Cantidad total"
                            type="number"
                            value={delta}
                            onChange={(e) => setDelta(parseInt(e.target.value || "0", 10))}
                            inputProps={{ min: 1 }}
                            fullWidth
                        />

                        {/* Panel de desglose de tallas */}
                        {hasSizes && (
                            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                                <Typography variant="body2" fontWeight={700} mb={1}>
                                    📦 Desglose por talla
                                </Typography>
                                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                    Indica cuántas unidades corresponden a cada talla. La suma debe ser igual a la cantidad total.
                                </Typography>
                                <Box sx={{ display: "grid", gap: 1.5 }}>
                                    {(selected?.available_sizes ?? []).map(size => (
                                        <Box key={size} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <Chip label={size} size="small" sx={{ minWidth: 60 }} />
                                            <TextField
                                                size="small"
                                                type="number"
                                                label={`Cant. ${size}`}
                                                value={sizesInput[size] ?? 0}
                                                onChange={(e) => setSizesInput(prev => ({
                                                    ...prev,
                                                    [size]: parseInt(e.target.value || "0", 10)
                                                }))}
                                                inputProps={{ min: 0 }}
                                                sx={{ flex: 1 }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                                {!sizesMatch && sizesTotal > 0 && (
                                    <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                                        Suma de tallas: <b>{sizesTotal}</b> — Total: <b>{delta}</b>. Deben coincidir.
                                    </Alert>
                                )}
                                {sizesMatch && sizesTotal > 0 && (
                                    <Alert severity="success" sx={{ mt: 1.5, py: 0 }}>
                                        ✅ Desglose correcto ({sizesTotal} unidades)
                                    </Alert>
                                )}
                            </Box>
                        )}

                        <TextField
                            label="Nota (opcional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => setSelected(null)}>Cancelar</ButtonCustom>
                    <ButtonCustom variant="contained" onClick={saveMovement} disabled={hasSizes && !sizesMatch && sizesTotal > 0}>
                        Guardar
                    </ButtonCustom>
                </DialogActions>
            </Dialog>

            {/* Dialog historial */}
            <Dialog open={openMovs} onClose={() => { setOpenMovs(false); setSelected(null); }} maxWidth="md" fullWidth>
                <DialogTitle>Historial de movimientos — {selected?.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                        <TextField
                            label="Desde"
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            size="small"
                        />
                        <TextField
                            label="Hasta"
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            size="small"
                        />
                        <ButtonCustom
                            variant="outlined"
                            onClick={() => selected && loadMovements(selected)}
                            startIcon={<RefreshRounded />}
                        >
                            Filtrar
                        </ButtonCustom>
                    </Box>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell align="right">Cantidad</TableCell>
                                <TableCell>Repartidor</TableCell>
                                <TableCell>Orden</TableCell>
                                <TableCell>Nota</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {movs.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>{dayjs(m.created_at).format("YYYY-MM-DD HH:mm")}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={m.type}
                                            size="small"
                                            color={m.type === "IN" ? "success" : m.type === "OUT" ? "error" : "default"}
                                        />
                                    </TableCell>
                                    <TableCell align="right">{m.quantity}</TableCell>
                                    <TableCell>{m.deliverer_id ?? "—"}</TableCell>
                                    <TableCell>{m.order_id ?? "—"}</TableCell>
                                    <TableCell>{m.note ?? "—"}</TableCell>
                                </TableRow>
                            ))}
                            {movs.length === 0 && (
                                <TableRow><TableCell colSpan={6} align="center">Sin movimientos</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => { setOpenMovs(false); setSelected(null); }}>Cerrar</ButtonCustom>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};
