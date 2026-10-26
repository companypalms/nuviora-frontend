// src/components/inventory/EditStockDialog.tsx
import React, { FC, useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Box } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { ButtonCustom } from "../custom";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";

type Type = "in" | "out" | "adjust";

export const EditStockDialog: FC<{
    open: boolean;
    onClose: () => void;
    product: any | null;
    onSaved: (updated: any) => void;
}> = ({ open, onClose, product, onSaved }) => {
    const [type, setType] = useState<Type>("in");
    const [quantity, setQuantity] = useState<number>(0);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setType("in");
            setQuantity(0);
            setNote("");
        }
    }, [open]);

    const handleSave = async () => {
        if (!product) return;
        if (type !== "adjust" && quantity <= 0) {
            toast.error("La cantidad debe ser mayor a 0");
            return;
        }
        if (type === "adjust" && isNaN(quantity)) {
            toast.error("Cantidad no válida");
            return;
        }

        setSaving(true);
        const body = new URLSearchParams();
        body.append("type", type);
        body.append("quantity", String(quantity));
        if (note.trim()) body.append("note", note.trim());

        try {
            const { status, response }: IResponse = await request(`/products/${product.id}/stock`, "PUT", body);
            if (status) {
                const data = await response.json();
                toast.success("Stock actualizado ✅");
                onSaved(data.product);
            } else {
                toast.error("No se pudo actualizar el stock ❌");
            }
        } catch {
            toast.error("Error en el servidor 🚨");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                Editar stock {product ? `— ${product.name ?? product.title ?? ""}` : ""}
                <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                    label="Tipo de movimiento"
                    select
                    size="small"
                    value={type}
                    onChange={(e) => setType(e.target.value as Type)}
                >
                    <MenuItem value="in">Entrada</MenuItem>
                    <MenuItem value="out">Salida</MenuItem>
                    <MenuItem value="adjust">Ajuste (fijar stock)</MenuItem>
                </TextField>

                <TextField
                    label={type === "adjust" ? "Nuevo stock" : "Cantidad"}
                    type="number"
                    size="small"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                />

                <TextField
                    label="Nota (opcional)"
                    size="small"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Proveedor X, merma, ajuste por inventario, etc."
                />
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={saving}>Cancelar</ButtonCustom>
                <ButtonCustom variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? "Guardando…" : "Guardar"}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
