// src/components/replenishment/ApprovePlanDialog.tsx
// Aprobar el plan (Módulo 5 de Fran, entrega 4; §89–§92). El Admin aprueba todo o en parte: cambia cantidades, quita
// movimientos (cantidad 0) y cambia proveedor, costo, almacén de recepción, origen o destino. Se guarda lo aprobado junto a
// lo recomendado. Las compras quedan "por recibir" (no se le manda nada al proveedor) y los traslados "pendientes de salir";
// los que reparten una compra esperan a que llegue (§58).
import React, { useEffect, useState } from "react";
import {
    Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { api, errorMessage, money, num } from "../finance/finance";
import { ReplConfig } from "./replenishment";

export type ApprovablePurchase = {
    id: number; product: string; variant: string | null; recommended: number; unit_cost_usd: number | null;
    supplier_id: number | null; receiving_warehouse_id: number | null;
};
export type ApprovableTransfer = {
    id: number; product: string; variant: string | null; quantity: number; from_warehouse_id: number; to_warehouse_id: number; depends_on_purchase: boolean;
};

type PRow = { id: number; qty: string; supplier_id: string; receiving_warehouse_id: string; unit_cost_usd: string };
type TRow = { id: number; qty: string; from_warehouse_id: string; to_warehouse_id: string };

export const ApprovePlanDialog: React.FC<{
    open: boolean; planId: number; purchases: ApprovablePurchase[]; transfers: ApprovableTransfer[]; config: ReplConfig;
    onClose: () => void; onApproved: () => void;
}> = ({ open, planId, purchases, transfers, config, onClose, onApproved }) => {
    const [p, setP] = useState<PRow[]>([]);
    const [t, setT] = useState<TRow[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setP(purchases.map((r) => ({ id: r.id, qty: String(r.recommended), supplier_id: r.supplier_id ? String(r.supplier_id) : "",
            receiving_warehouse_id: r.receiving_warehouse_id ? String(r.receiving_warehouse_id) : "", unit_cost_usd: r.unit_cost_usd !== null ? String(r.unit_cost_usd) : "" })));
        setT(transfers.map((r) => ({ id: r.id, qty: String(r.quantity), from_warehouse_id: String(r.from_warehouse_id), to_warehouse_id: String(r.to_warehouse_id) })));
    }, [open, purchases, transfers]);

    const setPf = (i: number, k: keyof PRow, v: string) => setP((rows) => rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    const setTf = (i: number, k: keyof TRow, v: string) => setT((rows) => rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    const capital = p.reduce((a, r) => a + (num(r.qty) || 0) * (num(r.unit_cost_usd) || 0), 0);
    const units = p.reduce((a, r) => a + (num(r.qty) || 0), 0);
    const moved = t.reduce((a, r) => a + (num(r.qty) || 0), 0);
    const suppliers = config.suppliers.filter((s) => s.is_active);

    const submit = async () => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>(`/finance/replenishment/plans/${planId}/approve`, "POST", {
                purchases: p.map((r) => ({ id: r.id, qty: Math.max(0, Math.round(num(r.qty) || 0)), supplier_id: r.supplier_id ? Number(r.supplier_id) : null,
                    receiving_warehouse_id: r.receiving_warehouse_id ? Number(r.receiving_warehouse_id) : null, unit_cost_usd: r.unit_cost_usd === "" ? null : num(r.unit_cost_usd) })),
                transfers: t.map((r) => ({ id: r.id, qty: Math.max(0, Math.round(num(r.qty) || 0)), from_warehouse_id: Number(r.from_warehouse_id), to_warehouse_id: Number(r.to_warehouse_id) })),
            });
            toast.success(r.message);
            onApproved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const whSelect = (value: string, onChange: (v: string) => void, label: string) => (
        <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 150 }}>
            {config.warehouses.map((w) => <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>)}
        </TextField>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Aprobar plan #{planId}</DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Puedes cambiar cantidades, poner 0 para quitar un movimiento y cambiar proveedor, costo, almacén, origen o destino. Las compras quedan
                    "por recibir" en Inventario › En camino (no se le manda nada al proveedor). Los traslados quedan pendientes de salir; los que reparten una
                    compra esperan a que llegue. Un plan se aprueba una sola vez.
                </Alert>
                <Typography variant="subtitle1" fontWeight={700}>1. Comprar</Typography>
                {p.length === 0 ? <Typography color="text.secondary" sx={{ mb: 2 }}>Este plan no tiene compras.</Typography> : (
                    <TableContainer sx={{ mb: 2 }}>
                        <Table size="small">
                            <TableHead><TableRow>
                                <TableCell>Producto</TableCell><TableCell align="right">Recomendado</TableCell><TableCell>Aprobar</TableCell>
                                <TableCell>Proveedor</TableCell><TableCell>Costo por unidad (USD)</TableCell><TableCell>Se recibe en</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {p.map((r, i) => {
                                    const src = purchases[i];
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell>{src.product}{src.variant ? <b> {src.variant}</b> : null}</TableCell>
                                            <TableCell align="right">{src.recommended}</TableCell>
                                            <TableCell><TextField size="small" value={r.qty} onChange={(e) => setPf(i, "qty", e.target.value)} sx={{ width: 90 }} inputProps={{ inputMode: "numeric" }} /></TableCell>
                                            <TableCell>
                                                <TextField select size="small" label="Proveedor" value={r.supplier_id} onChange={(e) => setPf(i, "supplier_id", e.target.value)} sx={{ minWidth: 170 }}>
                                                    {suppliers.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                                                </TextField>
                                            </TableCell>
                                            <TableCell><TextField size="small" value={r.unit_cost_usd} onChange={(e) => setPf(i, "unit_cost_usd", e.target.value)} sx={{ width: 110 }} inputProps={{ inputMode: "decimal" }} /></TableCell>
                                            <TableCell>{whSelect(r.receiving_warehouse_id, (v) => setPf(i, "receiving_warehouse_id", v), "Almacén")}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <Typography variant="subtitle1" fontWeight={700}>2. Transferir</Typography>
                {t.length === 0 ? <Typography color="text.secondary">Este plan no tiene traslados.</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead><TableRow>
                                <TableCell>Producto</TableCell><TableCell align="right">Recomendado</TableCell><TableCell>Aprobar</TableCell><TableCell>De</TableCell><TableCell>A</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {t.map((r, i) => {
                                    const src = transfers[i];
                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                {src.product}{src.variant ? <b> {src.variant}</b> : null}
                                                {src.depends_on_purchase && <Typography variant="caption" color="warning.main" display="block">Sale después de recibir la compra</Typography>}
                                            </TableCell>
                                            <TableCell align="right">{src.quantity}</TableCell>
                                            <TableCell><TextField size="small" value={r.qty} onChange={(e) => setTf(i, "qty", e.target.value)} sx={{ width: 90 }} inputProps={{ inputMode: "numeric" }} /></TableCell>
                                            <TableCell>{whSelect(r.from_warehouse_id, (v) => setTf(i, "from_warehouse_id", v), "Origen")}</TableCell>
                                            <TableCell>{whSelect(r.to_warehouse_id, (v) => setTf(i, "to_warehouse_id", v), "Destino")}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
                    Se aprueban {units} unidades por comprar ({money(capital)}) y {moved} por trasladar.
                </Typography>
                <Button color="inherit" onClick={onClose}>Volver</Button>
                <Button variant="contained" disabled={saving} onClick={submit}>{saving ? "Aprobando…" : "Aprobar plan"}</Button>
            </DialogActions>
        </Dialog>
    );
};
