// src/components/inventory/InTransitPanel.tsx
// "En camino" (Módulo 5 de Fran, entrega 1; §15, §16, §91, §92, R2, R3): lo que viene y todavía no está en ningún almacén.
// - Traslados en tránsito: salieron del origen y entran al destino cuando el Admin marca "Recibido" (R2). Cancelar uno
//   que ya salió lo devuelve al origen.
// - Compras por recibir (solo Admin): no suman stock hasta recibirlas. Al recibir se ponen la cantidad y el costo reales,
//   y ahí nacen el lote y la deuda o el pago, como en una compra normal (R3).
// - Entrega 4: los traslados de un plan aprobado quedan "pendientes de salir" (§92). Salen cuando el Admin lo marca; los
//   que reparten una compra no pueden salir hasta que la compra se recibe (§58, §118).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { api, errorMessage, money, todayCaracas } from "../finance/finance";
import { PurchaseFields } from "../finance/PurchaseFields";
import { PurchaseValue, emptyPurchase, purchasePayload, purchaseReady, uploadPurchaseReceipt } from "../finance/purchase";
import { useUserStore } from "../../store/user/UserStore";

type TransferLine = { id: number; product: string; variant: string | null; quantity: number };
type Transfer = {
    id: number; status: string; status_label: string; from_warehouse: string; to_warehouse: string; units: number; lines: TransferLine[];
    notes: string | null; dispatched_at: string | null; created_at: string | null; created_by: string | null;
    purchase_id: number | null; purchase_status: string | null; waiting_purchase: boolean;
};
type Purchase = {
    id: number; supplier_id: number; supplier: string; product: string; warehouse: string; quantity: number; total_amount: number;
    currency: string; rate: number; expected_at: string | null; expected_variants: Record<string, number> | null; notes: string | null;
    product_variants: { id: number; title: string; is_active: boolean }[];
};

const fmt = (d: string | null) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) + (d.length > 10 ? " " + d.slice(11, 16) : "") : "—");

export const InTransitPanel: React.FC = () => {
    const role = useUserStore((s) => s.user.role?.description) ?? "";
    const isAdmin = role === "Admin";
    const canReceive = ["Admin", "Gerente", "Master"].includes(role);
    const [transfers, setTransfers] = useState<Transfer[] | null>(null);
    const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
    const [purchases, setPurchases] = useState<Purchase[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<{ kind: "transfer" | "purchase"; id: number; label: string } | null>(null);
    const [reason, setReason] = useState("");
    const [receiving, setReceiving] = useState<Purchase | null>(null);

    const load = useCallback(async () => {
        try {
            const t = await api<{ transfers: Transfer[] }>("/inventory-transfers?status=open");
            setTransfers(t.transfers.filter((x) => x.status === "in_transit"));
            setPendingTransfers(t.transfers.filter((x) => x.status !== "in_transit").reverse());
            if (isAdmin) {
                const p = await api<{ purchases: Purchase[] }>("/finance/purchases?status=pending");
                setPurchases(p.purchases);
            }
        } catch (e) { toast.error(errorMessage(e)); }
    }, [isAdmin]);
    useEffect(() => { load(); }, [load]);

    const receiveTransfer = async (t: Transfer) => {
        if (!window.confirm(`¿Llegó a ${t.to_warehouse}? Entran ${t.units} unidades.`)) return;
        setBusy(`t${t.id}`);
        try {
            const r = await api<{ message: string }>(`/inventory-transfers/${t.id}/receive`, "POST", JSON.stringify({}));
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
    };

    const sendTransfer = async (t: Transfer) => {
        if (!window.confirm(`¿Salió el traslado de ${t.from_warehouse} a ${t.to_warehouse}? Salen ${t.units} unidades de ${t.from_warehouse} y van en tránsito.`)) return;
        setBusy(`s${t.id}`);
        try {
            const r = await api<{ message: string }>(`/inventory-transfers/${t.id}/send`, "POST", JSON.stringify({}));
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
    };

    const confirmCancel = async () => {
        if (!cancelling) return;
        setBusy("cancel");
        try {
            const url = cancelling.kind === "transfer" ? `/inventory-transfers/${cancelling.id}/cancel` : `/finance/purchases/${cancelling.id}/cancel`;
            const r = await api<{ message: string }>(url, "POST", JSON.stringify({ reason: reason.trim() }));
            toast.success(r.message);
            setCancelling(null);
            setReason("");
            load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
    };

    const today = todayCaracas();

    return (
        <Stack spacing={3}>
            {pendingTransfers.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6">Traslados pendientes de salir</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Vienen de un plan de inventario aprobado. Márcalos "Salió" cuando el chofer los retire: ahí salen del origen y quedan en tránsito.
                    </Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Creado</TableCell>
                                    <TableCell>De → a</TableCell>
                                    <TableCell>Productos</TableCell>
                                    <TableCell align="right">Unidades</TableCell>
                                    {canReceive && <TableCell align="right" />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingTransfers.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(t.created_at)}</TableCell>
                                        <TableCell>
                                            <b>{t.from_warehouse}</b> → <b>{t.to_warehouse}</b>
                                            {t.notes && <Typography variant="caption" color="text.secondary" display="block">{t.notes}</Typography>}
                                            {t.waiting_purchase && (
                                                <Chip size="small" color="warning" sx={{ mt: 0.5 }}
                                                    label={t.purchase_status === "cancelled" ? "Su compra se canceló: cancela este traslado" : "Retirar solo después de recibir la compra del proveedor"} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                                {t.lines.map((l) => <Chip key={l.id} size="small" label={`${l.product}${l.variant ? ` ${l.variant}` : ""} × ${l.quantity}`} />)}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">{t.units}</TableCell>
                                        {canReceive && (
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                <Button size="small" variant="contained" disabled={busy !== null || t.waiting_purchase} onClick={() => sendTransfer(t)}>Salió</Button>
                                                <Button size="small" color="inherit" disabled={busy !== null}
                                                    onClick={() => setCancelling({ kind: "transfer", id: t.id, label: `el traslado de ${t.from_warehouse} a ${t.to_warehouse} (todavía no salió)` })}>
                                                    Cancelar
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6">Traslados en tránsito</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Ya salieron del origen y todavía no están en el destino. Al marcarlos "Recibido" entran al destino con su lote y su costo.
                </Typography>
                {transfers === null ? <Typography color="text.secondary">Cargando…</Typography> : transfers.length === 0 ? (
                    <Alert severity="success">No hay traslados en camino.</Alert>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Salió</TableCell>
                                    <TableCell>De → a</TableCell>
                                    <TableCell>Productos</TableCell>
                                    <TableCell align="right">Unidades</TableCell>
                                    {canReceive && <TableCell align="right" />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transfers.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmt(t.dispatched_at)}</TableCell>
                                        <TableCell>
                                            <b>{t.from_warehouse}</b> → <b>{t.to_warehouse}</b>
                                            {t.notes && <Typography variant="caption" color="text.secondary" display="block">{t.notes}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                                {t.lines.map((l) => <Chip key={l.id} size="small" label={`${l.product}${l.variant ? ` ${l.variant}` : ""} × ${l.quantity}`} />)}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">{t.units}</TableCell>
                                        {canReceive && (
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                <Button size="small" variant="contained" disabled={busy !== null} onClick={() => receiveTransfer(t)}>Recibido</Button>
                                                <Button size="small" color="inherit" disabled={busy !== null}
                                                    onClick={() => setCancelling({ kind: "transfer", id: t.id, label: `el traslado a ${t.to_warehouse} (vuelve a ${t.from_warehouse})` })}>
                                                    Cancelar
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {isAdmin && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6">Compras por recibir</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Se registran en el ingreso de un producto, con "Por recibir". No suman stock hasta que las recibes con la cantidad y el costo reales.
                    </Typography>
                    {purchases === null ? <Typography color="text.secondary">Cargando…</Typography> : purchases.length === 0 ? (
                        <Alert severity="info">No hay compras por recibir.</Alert>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Llega</TableCell>
                                        <TableCell>Proveedor</TableCell>
                                        <TableCell>Producto</TableCell>
                                        <TableCell>Almacén</TableCell>
                                        <TableCell align="right">Cantidad</TableCell>
                                        <TableCell align="right">Costo esperado</TableCell>
                                        <TableCell align="right" />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {purchases.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                {fmt(p.expected_at)}
                                                {p.expected_at && p.expected_at < today && <Chip size="small" color="warning" label="Atrasada" sx={{ ml: 1 }} />}
                                            </TableCell>
                                            <TableCell>{p.supplier}</TableCell>
                                            <TableCell>
                                                {p.product}
                                                {p.expected_variants && Object.keys(p.expected_variants).length > 0 && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {Object.entries(p.expected_variants).map(([id, q]) => `${p.product_variants.find((v) => String(v.id) === id)?.title ?? id}: ${q}`).join(" · ")}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>{p.warehouse}</TableCell>
                                            <TableCell align="right">{p.quantity}</TableCell>
                                            <TableCell align="right">{p.currency === "VES" ? `Bs ${p.total_amount}` : money(p.total_amount)}</TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                <Button size="small" variant="contained" disabled={busy !== null} onClick={() => setReceiving(p)}>Recibir</Button>
                                                <Button size="small" color="inherit" disabled={busy !== null}
                                                    onClick={() => setCancelling({ kind: "purchase", id: p.id, label: `la compra de ${p.quantity} ${p.product} a ${p.supplier}` })}>
                                                    Cancelar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            <Dialog open={!!cancelling} onClose={() => setCancelling(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Cancelar</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>Vas a cancelar {cancelling?.label}.</Typography>
                    <TextField label="¿Por qué?" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth size="small" autoFocus inputProps={{ maxLength: 500 }} />
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setCancelling(null)}>Volver</Button>
                    <Button variant="contained" color="error" disabled={busy !== null || reason.trim().length < 3} onClick={confirmCancel}>Cancelar</Button>
                </DialogActions>
            </Dialog>

            <ReceivePurchaseDialog purchase={receiving} onClose={() => setReceiving(null)} onDone={() => { setReceiving(null); load(); }} />
        </Stack>
    );
};

/** Recibir una compra: cantidad (y tallas) y costo reales, y cómo se paga (§91, R3). */
const ReceivePurchaseDialog: React.FC<{ purchase: Purchase | null; onClose: () => void; onDone: () => void }> = ({ purchase, onClose, onDone }) => {
    const [quantity, setQuantity] = useState(0);
    const [variants, setVariants] = useState<Record<number, number>>({});
    const [fields, setFields] = useState<PurchaseValue>(emptyPurchase());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!purchase) return;
        setQuantity(purchase.quantity);
        const v: Record<number, number> = {};
        Object.entries(purchase.expected_variants ?? {}).forEach(([id, q]) => { v[Number(id)] = Number(q); });
        setVariants(v);
        setFields({
            ...emptyPurchase(), supplierId: String(purchase.supplier_id),
            money: { amount: String(purchase.total_amount), currency: purchase.currency as PurchaseValue["money"]["currency"], rate: purchase.currency === "VES" ? String(purchase.rate) : "" },
        });
    }, [purchase]);

    if (!purchase) return null;
    const variantTotal = Object.values(variants).reduce((a, b) => a + (Number(b) || 0), 0);
    const ok = quantity > 0 && variantTotal <= quantity && purchaseReady(fields);

    const submit = async () => {
        setSaving(true);
        try {
            const { supplier_id: _s, ...pay } = purchasePayload(fields);
            const cleanVariants = Object.fromEntries(Object.entries(variants).filter(([, q]) => Number(q) > 0));
            const r = await api<{ message: string; purchase: { id: number } }>(`/finance/purchases/${purchase.id}/receive`, "POST",
                JSON.stringify({ ...pay, quantity, ...(Object.keys(cleanVariants).length ? { variants: cleanVariants } : {}) }));
            if (fields.receipt) await uploadPurchaseReceipt(r.purchase.id, fields.receipt);
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Recibir compra: {purchase.product}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Se esperaban {purchase.quantity} unidades en {purchase.warehouse}. Pon lo que llegó de verdad: entra al stock con su lote, como cualquier compra.
                    </Typography>
                    <TextField type="number" label="Unidades que llegaron" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} size="small"
                        inputProps={{ min: 1 }} sx={{ maxWidth: 220 }} />
                    {purchase.product_variants.length > 0 && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                Por talla (lo que no repartas queda sin talla){variantTotal > quantity ? ` · suman ${variantTotal}, más que ${quantity}` : ""}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                {purchase.product_variants.filter((v) => v.is_active || variants[v.id]).map((v) => (
                                    <TextField key={v.id} type="number" label={v.title} value={variants[v.id] ?? ""} size="small" sx={{ width: 90 }}
                                        onChange={(e) => setVariants((s) => ({ ...s, [v.id]: Number(e.target.value) }))} inputProps={{ min: 0 }} />
                                ))}
                            </Box>
                        </Box>
                    )}
                    <PurchaseFields value={fields} onChange={setFields} quantity={quantity} lockSupplier hideToggle />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Volver</Button>
                <Button variant="contained" disabled={!ok || saving} onClick={submit}>{saving ? "Guardando…" : "Recibir"}</Button>
            </DialogActions>
        </Dialog>
    );
};
