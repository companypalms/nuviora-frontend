// src/components/logistics/AdjustmentsPanel.tsx
// "Solicitar ajuste" (§16.2.3, §29 punto 22; idea 3 de Fran): el operador no toca el stock, pide el ajuste con motivo; lo
// aplica administración al aprobarlo.
import React, { useCallback, useEffect, useState } from "react";
import {
    Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { api, errorMessage, hour } from "./logistics";

type Req = {
    id: number; quantity: number; reason: string; status: "pendiente" | "aprobada" | "rechazada"; created_at: string; decision_note: string | null;
    product: { title: string | null; name: string | null } | null; variant: { title: string } | null;
    requester: { names: string } | null; decider: { names: string } | null;
};
type Product = { id: number; title: string | null; name: string | null; variants: { id: number; title: string }[] };
const COLOR = { pendiente: "warning", aprobada: "success", rechazada: "default" } as const;

export const AdjustmentsPanel: React.FC<{ centerId: number; isAdmin: boolean }> = ({ centerId, isAdmin }) => {
    const [rows, setRows] = useState<Req[]>([]);
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [form, setForm] = useState({ product_id: "", variant_id: "", quantity: "-1", reason: "" });

    const load = useCallback(() => {
        api<{ requests: Req[] }>(`/logistics/centers/${centerId}/adjustments`).then((r) => setRows(r.requests)).catch((e) => toast.error(errorMessage(e)));
    }, [centerId]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            api<{ products: Product[] }>(`/logistics/centers/${centerId}/adjustment-products?q=${encodeURIComponent(q)}`)
                .then((r) => setProducts(r.products)).catch(() => setProducts([]));
        }, 300);
        return () => clearTimeout(t);
    }, [open, q, centerId]);

    const product = products.find((p) => String(p.id) === form.product_id);
    const send = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/adjustments`, "POST", {
                product_id: Number(form.product_id), variant_id: form.variant_id ? Number(form.variant_id) : null, quantity: Number(form.quantity), reason: form.reason,
            });
            toast.success(r.message);
            setOpen(false);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };
    const decide = async (id: number, approve: boolean) => {
        const note = approve ? null : window.prompt("Motivo del rechazo (opcional)") ?? null;
        try {
            const r = await api<{ message: string }>(`/logistics/adjustments/${id}/decide`, "POST", { approve, note });
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">El stock no cambia hasta que administración aprueba la solicitud.</Typography>
                <Button variant="contained" onClick={() => { setForm({ product_id: "", variant_id: "", quantity: "-1", reason: "" }); setOpen(true); }}>Solicitar ajuste</Button>
            </Stack>
            {rows.length === 0 ? <Typography color="text.secondary">No hay solicitudes.</Typography> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Piezas</TableCell><TableCell>Motivo</TableCell><TableCell>Pidió</TableCell><TableCell>Estado</TableCell><TableCell /></TableRow></TableHead>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.product?.title ?? r.product?.name}{r.variant ? ` · ${r.variant.title}` : ""}</TableCell>
                                    <TableCell align="right">{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</TableCell>
                                    <TableCell>{r.reason}</TableCell>
                                    <TableCell>{r.requester?.names} · {hour(r.created_at)}</TableCell>
                                    <TableCell><Chip size="small" color={COLOR[r.status]} label={r.status} />{r.decider ? ` ${r.decider.names}` : ""}{r.decision_note ? ` · ${r.decision_note}` : ""}</TableCell>
                                    <TableCell align="right">
                                        {isAdmin && r.status === "pendiente" && <>
                                            <Button size="small" color="success" onClick={() => decide(r.id, true)}>Aprobar</Button>
                                            <Button size="small" color="error" onClick={() => decide(r.id, false)}>Rechazar</Button>
                                        </>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Solicitar ajuste de stock</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <TextField label="Buscar producto" size="small" value={q} onChange={(e) => setQ(e.target.value)} />
                        <TextField select label="Producto" size="small" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value, variant_id: "" })}>
                            {products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.title ?? p.name}</MenuItem>)}
                        </TextField>
                        {product && product.variants.length > 0 && (
                            <TextField select label="Variante o talla" size="small" value={form.variant_id} onChange={(e) => setForm({ ...form, variant_id: e.target.value })}>
                                {product.variants.map((v) => <MenuItem key={v.id} value={String(v.id)}>{v.title}</MenuItem>)}
                            </TextField>
                        )}
                        <TextField label="Piezas (negativo si faltan, positivo si sobran)" type="number" size="small" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        <TextField label="Motivo" size="small" multiline minRows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant="contained" disabled={!form.product_id || !Number(form.quantity) || !form.reason.trim()} onClick={send}>Enviar a administración</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
