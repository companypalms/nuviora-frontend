// src/components/orders/UpsellConfirmDialog.tsx
// Confirmar un upsell (o un producto en una devolución/cambio). Fran, 2026-10-02: no se puede agregar un
// producto, ni una talla, que no hay para este pedido. El servidor dice cuánto hay de cada talla
// (GET /orders/{id}/upsell-options) y lo vuelve a revisar al guardar.
import { FC, useEffect, useState } from "react";
import {
    Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography,
} from "@mui/material";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IProductVariant } from "../../interfaces/inventory.types";

type Option = { id: number; title: string; available: number | null };
type Options = { checked: boolean; available: number | null; variants: Option[] };

interface Props {
    open: boolean;
    onClose: () => void;
    orderId: number;
    candidate: { id: number; name?: string; title?: string; price?: number | string; variants?: IProductVariant[] } | null;
    title: string;
    onConfirm: (quantity: number, price: number, variantId: number | null) => void;
}

export const UpsellConfirmDialog: FC<Props> = ({ open, onClose, orderId, candidate, title, onConfirm }) => {
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);
    const [variantId, setVariantId] = useState<number | "">("");
    const [options, setOptions] = useState<Options | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !candidate) return;
        setQty(1);
        setPrice(Number(candidate.price ?? 0));
        setVariantId("");
        setOptions(null);
        setLoading(true);
        request(`/orders/${orderId}/upsell-options?product_id=${candidate.id}`, "GET")
            .then(async ({ status, response }) => {
                if (status >= 200 && status < 300) setOptions(await response.json());
            })
            .catch(() => undefined)
            .finally(() => setLoading(false));
    }, [open, candidate, orderId]);

    // Las tallas salen del servidor; si no respondió, las del producto (sin saber cuánto hay)
    const variants: Option[] = options?.variants
        ?? (candidate?.variants ?? []).filter((v: IProductVariant) => v.is_active).map((v: IProductVariant) => ({ id: v.id, title: v.title, available: null }));
    const hasVariants = variants.length > 0;
    const chosen = variants.find((v) => v.id === variantId);
    const available = hasVariants ? (chosen?.available ?? null) : (options?.available ?? null);
    const noneLeft = options?.checked && (hasVariants ? variants.every((v) => (v.available ?? 0) <= 0) : (options.available ?? 0) <= 0);
    const tooMany = available !== null && qty > available;
    const blocked = loading || qty < 1 || (hasVariants && !variantId) || !!noneLeft || tooMany;

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1, minWidth: 300 }}>
                <Typography variant="subtitle1" fontWeight="bold">{candidate?.name || candidate?.title}</Typography>
                {loading && <CircularProgress size={20} sx={{ alignSelf: "center" }} />}
                {noneLeft && (
                    <Alert severity="warning">
                        {hasVariants ? "No hay ninguna talla de este producto disponible para este pedido." : "No hay de este producto disponible para este pedido."}
                    </Alert>
                )}
                <TextField
                    label="Cantidad"
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    error={tooMany}
                    helperText={tooMany ? `Solo hay ${available} para este pedido.` : available !== null && (!hasVariants || chosen) ? `Hay ${available} para este pedido.` : undefined}
                    fullWidth
                />
                <TextField label="Precio de Venta (c/u)" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} helperText="Puedes modificar el precio para dar un descuento" fullWidth />
                {hasVariants && (
                    <TextField
                        select
                        label="Talla o variante"
                        value={variantId}
                        onChange={(e) => setVariantId(Number(e.target.value))}
                        fullWidth
                        required
                    >
                        {variants.map((v) => {
                            const none = v.available !== null && v.available <= 0;
                            return (
                                <MenuItem key={v.id} value={v.id} disabled={none}>
                                    {v.available === null ? v.title : none ? `${v.title} · no hay` : `${v.title} · hay ${v.available}`}
                                </MenuItem>
                            );
                        })}
                    </TextField>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <ButtonCustom disabled={blocked} onClick={() => onConfirm(qty, price, variantId || null)}>Agregar</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
