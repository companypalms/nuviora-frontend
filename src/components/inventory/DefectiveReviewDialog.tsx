// src/components/inventory/DefectiveReviewDialog.tsx
// Revisar las piezas en revisión (Fran, 2026-10-02; Módulo 4, R3 y R8): las que vuelven de un cambio y las dañadas o
// perdidas quedan aparte, sin contar como disponibles. Después de revisarlas, el Admin decide si vuelven a la venta (con
// su costo) o se dan de baja; si tenían costo, la baja cuenta como merma en la rentabilidad.
import { FC, useEffect, useMemo, useState } from "react";
import {
    Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Radio, RadioGroup,
    TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IProductStock } from "../../interfaces/inventory.types";

/** Lo que hay para revisar: por almacén, por talla (o "sin talla"). */
function defectiveLines(productStock: IProductStock) {
    const lines: { warehouse_id: number; warehouse_name: string; variant_id: number | null; title: string; quantity: number }[] = [];
    productStock.warehouses.forEach((w) => {
        const total = w.defective_stock ?? 0;
        if (total <= 0) return;
        let withSize = 0;
        (w.variants_stock ?? []).forEach((v) => {
            if (v.defective_stock > 0) {
                lines.push({ warehouse_id: w.warehouse_id, warehouse_name: w.warehouse_name, variant_id: v.variant_id, title: v.title, quantity: v.defective_stock });
                withSize += v.defective_stock;
            }
        });
        if (total - withSize > 0) {
            lines.push({ warehouse_id: w.warehouse_id, warehouse_name: w.warehouse_name, variant_id: null, title: "Sin talla", quantity: total - withSize });
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

export const DefectiveReviewDialog: FC<Props> = ({ open, onClose, productStock, onSaved }) => {
    const lines = useMemo(() => (productStock ? defectiveLines(productStock) : []), [productStock]);
    const [lineKey, setLineKey] = useState("");
    const [qty, setQty] = useState(1);
    const [action, setAction] = useState<"restock" | "discard">("restock");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const keyOf = (l: { warehouse_id: number; variant_id: number | null }) => `${l.warehouse_id}|${l.variant_id ?? ""}`;
    useEffect(() => {
        if (!open) return;
        setLineKey(lines[0] ? keyOf(lines[0]) : "");
        setQty(1);
        setAction("restock");
        setNotes("");
    }, [open, lines]);

    const line = lines.find((l) => keyOf(l) === lineKey);
    const tooMany = !!line && qty > line.quantity;

    const save = async () => {
        if (!line || !productStock) return;
        setSaving(true);
        try {
            const { status, response } = await request("/inventory/defective/resolve", "POST", {
                warehouse_id: line.warehouse_id,
                product_id: productStock.product_id,
                variant_id: line.variant_id,
                quantity: qty,
                action,
                notes: notes.trim() || null,
            });
            const data = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                toast.success(data.message ?? "Listo");
                onSaved();
                onClose();
            } else {
                toast.error(data.message ?? "No se pudo guardar");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Revisar piezas</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
                <Typography variant="subtitle2">{productStock?.product?.title}</Typography>
                {lines.length === 0 ? (
                    <Alert severity="info">Este producto no tiene piezas en revisión.</Alert>
                ) : (
                    <>
                        <TextField select size="small" label="Cuáles" value={lineKey} onChange={(e) => setLineKey(e.target.value)} fullWidth>
                            {lines.map((l) => (
                                <MenuItem key={keyOf(l)} value={keyOf(l)}>
                                    {l.warehouse_name} · {l.title}: {l.quantity}
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
                        <RadioGroup value={action} onChange={(e) => setAction(e.target.value as "restock" | "discard")}>
                            <FormControlLabel value="restock" control={<Radio />} label="Está bien: vuelve a la venta" />
                            <FormControlLabel value="discard" control={<Radio />} label="Está dañada o no está: dar de baja (sale del inventario)" />
                        </RadioGroup>
                        {action === "discard" && (
                            <Typography variant="caption" color="text.secondary">
                                Si la pieza tenía costo (dañada o perdida), su costo cuenta como merma en la rentabilidad. Una pieza que volvió de un cambio no suma: su costo ya se contó en la venta.
                            </Typography>
                        )}
                        <TextField size="small" label="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline maxRows={3} />
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <ButtonCustom disabled={!line || tooMany || qty < 1 || saving} onClick={save} color={action === "discard" ? "error" : "primary"}>
                    {action === "discard" ? "Dar de baja" : "Devolver a la venta"}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
