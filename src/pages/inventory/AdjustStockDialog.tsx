import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { TextFieldCustom, TypographyCustom, ButtonCustom } from "../../components/custom";

export const AdjustStockDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    product: any | null;
    onAdjusted: (p: any) => void;
}> = ({ open, onClose, product, onAdjusted }) => {
    const [type, setType] = useState<'IN' | 'OUT'>('IN');
    const [qty, setQty] = useState<number>(1);
    const [reason, setReason] = useState<string>("");

    useEffect(() => {
        if (open) { setType('IN'); setQty(1); setReason(""); }
    }, [open]);

    const submit = async () => {
        if (!product?.id) return;
        if (qty <= 0) { toast.error("Cantidad inválida"); return; }

        const body = new URLSearchParams();
        body.append('product_id', String(product.id));
        body.append('type', type);
        body.append('quantity', String(qty));
        if (reason) body.append('reason', reason);

        const { status, response }: IResponse = await request('/inventory/adjust', 'POST', body);
        if (status) {
            const data = await response.json();
            onAdjusted(data.product);
            toast.success(data.message ?? "Stock actualizado ✅");
            onClose();
        } else {
            const err = await response.json().catch(() => ({ message: 'No se pudo actualizar' }));
            toast.error(err.message ?? "No se pudo actualizar ❌");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Ajustar stock — {product?.sku ?? '—'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                    <ToggleButtonGroup exclusive value={type} onChange={(_, v) => v && setType(v)}>
                        <ToggleButton value="IN">Entrada</ToggleButton>
                        <ToggleButton value="OUT">Salida</ToggleButton>
                    </ToggleButtonGroup>
                    <TextFieldCustom label="Cantidad" type="number" value={qty} onChange={(e: any) => setQty(Number(e.target.value))} />
                    <TextFieldCustom label="Motivo (opcional)" value={reason} onChange={(e: any) => setReason(e.target.value)} />
                    <TypographyCustom variant="caption" color="text.secondary">
                        Stock actual: {product?.stock ?? 0}
                    </TypographyCustom>
                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom variant="outlined" onClick={onClose}>Cancelar</ButtonCustom>
                <ButtonCustom onClick={submit}>{type === 'IN' ? 'Agregar' : 'Descontar'}</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};