// src/components/inventory/ReviewIntakeDialog.tsx
// "Pasar a revisión" (Módulo 4 de Fran, R8): la mercancía dañada o perdida, en un traslado o en el almacén, queda para
// revisión. Las piezas siguen en el almacén pero dejan de venderse hasta que el Admin las revise: vuelven a la venta o
// se dan de baja, y si se dan de baja su costo cuenta como merma. Solo el Admin.
import { FC, useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IProductStock } from "../../interfaces/inventory.types";

const REASONS = ["Dañada en un traslado", "Perdida en un traslado", "Dañada en el almacén", "Perdida en el almacén"];

/** Lo que se puede pasar a revisión: por almacén y talla (o "sin talla"), lo que no está ya en revisión. */
function freeLines(productStock: IProductStock) {
    const lines: { warehouse_id: number; warehouse_name: string; variant_id: number | null; title: string; quantity: number }[] = [];
    productStock.warehouses.forEach((w) => {
        const variants = w.variants_stock ?? [];
        variants.forEach((v) => {
            const free = v.quantity - v.defective_stock;
            if (free > 0) lines.push({ warehouse_id: w.warehouse_id, warehouse_name: w.warehouse_name, variant_id: v.variant_id, title: v.title, quantity: free });
        });
        const defectiveWithoutSize = Math.max(0, (w.defective_stock ?? 0) - variants.reduce((a, v) => a + v.defective_stock, 0));
        const free = (w.unassigned ?? w.quantity) - defectiveWithoutSize;
        if (free > 0) {
            lines.push({ warehouse_id: w.warehouse_id, warehouse_name: w.warehouse_name, variant_id: null, title: variants.length ? "Sin talla" : "", quantity: free });
        }
    });

    return lines;
}

interface Props {
    open: boolean;
    onClose: () => void;
    productStock: IProductStock | null;
    onSaved: () => void;
}

export const ReviewIntakeDialog: FC<Props> = ({ open, onClose, productStock, onSaved }) => {
    const lines = useMemo(() => (productStock ? freeLines(productStock) : []), [productStock]);
    const [lineKey, setLineKey] = useState("");
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const keyOf = (l: { warehouse_id: number; variant_id: number | null }) => `${l.warehouse_id}|${l.variant_id ?? ""}`;
    useEffect(() => {
        if (!open) return;
        setLineKey(lines[0] ? keyOf(lines[0]) : "");
        setQty(1);
        setReason("");
    }, [open, lines]);

    const line = lines.find((l) => keyOf(l) === lineKey);
    const tooMany = !!line && qty > line.quantity;

    const save = async () => {
        if (!line || !productStock) return;
        setSaving(true);
        try {
            const { status, response } = await request("/inventory/defective/intake", "POST", {
                warehouse_id: line.warehouse_id,
                product_id: productStock.product_id,
                variant_id: line.variant_id,
                quantity: qty,
                reason: reason.trim(),
            });
            const data = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                toast.success(data.message ?? "Listo");
                onSaved();
                onClose();
            } else {
                toast.error(data.message ?? "No se pudo guardar");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Pasar a revisión</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
                <Typography variant="subtitle2">{productStock?.product?.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                    Para piezas dañadas o perdidas. Siguen en el almacén, pero no se venden hasta que las revises: ahí decides si vuelven a la venta o se dan de baja.
                </Typography>
                {lines.length === 0 ? (
                    <Alert severity="info">Este producto no tiene piezas disponibles para pasar a revisión.</Alert>
                ) : (
                    <>
                        <TextField select size="small" label="Dónde" value={lineKey} onChange={(e) => setLineKey(e.target.value)} fullWidth>
                            {lines.map((l) => (
                                <MenuItem key={keyOf(l)} value={keyOf(l)}>
                                    {l.warehouse_name}{l.title ? ` · ${l.title}` : ""}: {l.quantity} disponible(s)
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            size="small" type="number" label="Cantidad" value={qty}
                            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                            error={tooMany}
                            helperText={tooMany ? `Solo hay ${line?.quantity}.` : undefined}
                            fullWidth
                        />
                        <div>
                            <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                                {REASONS.map((r) => <Chip key={r} label={r} size="small" variant={reason === r ? "filled" : "outlined"} onClick={() => setReason(r)} />)}
                            </Stack>
                            <TextField size="small" label="Qué le pasó" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required
                                inputProps={{ maxLength: 500 }} placeholder="Llegó rota en el traslado a Valencia…" />
                        </div>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <ButtonCustom disabled={!line || tooMany || qty < 1 || reason.trim() === "" || saving} onClick={save} color="warning">
                    Pasar a revisión
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
