import React, { useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    TextField,
    ToggleButtonGroup,
    ToggleButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { ButtonCustom, TypographyCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";

type Product = {
    id: number;
    title?: string;
    name?: string;
    stock_total: number;
};

interface Props {
    open: boolean;
    onClose: () => void;
    product: Product;
    onSaved: (updated: any) => void;
}

export const StockAdjustDialog: React.FC<Props> = ({ open, onClose, product, onSaved }) => {
    const [mode, setMode] = useState<"delta" | "absolute">("delta");
    const [qty, setQty] = useState<string>("0");
    const [saving, setSaving] = useState(false);

    const title = useMemo(
        () => product.title || product.name || `#${product.id}`,
        [product]
    );

    const handleSave = async () => {
        const n = Number(qty);
        if (Number.isNaN(n)) {
            toast.error("Cantidad inválida");
            return;
        }
        if (mode === "delta" && n === 0) {
            toast.error("El ajuste (+/-) no puede ser 0");
            return;
        }
        setSaving(true);
        try {
            const body = new URLSearchParams();
            body.append(mode, String(n)); // "delta" o "absolute"
            const { status, response }: IResponse = await request(
                `/inventory/products/${product.id}/stock`,
                "PUT",
                body
            );
            if (!status) {
                toast.error("No se pudo actualizar el stock ❌");
                return;
            }
            const data = await response.json();
            onSaved(data.product ?? data.data ?? { ...product, stock_total: (mode === "absolute" ? n : product.stock_total + n) });
            toast.success("Stock actualizado ✅");
            onClose();
        } catch (e) {
            toast.error("Error al actualizar stock 🚨");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogContent>
                <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
                    <TypographyCustom variant="subtitle1">{title}</TypographyCustom>
                    <TypographyCustom variant="body2" color="text.secondary">
                        Stock actual: <b>{product.stock_total ?? 0}</b>
                    </TypographyCustom>

                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={mode}
                        onChange={(_, v) => v && setMode(v)}
                    >
                        <ToggleButton value="delta">Ajuste (+/-)</ToggleButton>
                        <ToggleButton value="absolute">Valor exacto</ToggleButton>
                    </ToggleButtonGroup>

                    <TextField
                        label={mode === "delta" ? "Cantidad (+/-)" : "Nuevo stock (exacto)"}
                        type="number"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        inputProps={{ step: 1 }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom startIcon={<CloseRoundedIcon />} variant="outlined" onClick={onClose} disabled={saving}>
                    Cancelar
                </ButtonCustom>
                <ButtonCustom startIcon={<SaveRoundedIcon />} onClick={handleSave} disabled={saving}>
                    Guardar
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
