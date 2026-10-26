// src/components/finance/PurchaseCorrectDialog.tsx
// Corregir el costo de una compra ya registrada (Módulo 4 de Fran, entrega 2e; §9, §83): las unidades no cambian;
// cambian el costo de sus lotes (y de las órdenes que ya los vendieron) y la deuda con el proveedor. Al contado, también
// el pago con que nació pagada. Pide el motivo: queda en el historial (§82).
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { FinanceOptions, Purchase, api, errorMessage, money, original, toUsd } from "./finance";

type Props = { purchase: Purchase | null; options: FinanceOptions; onClose: () => void; onSaved: () => void };

export const PurchaseCorrectDialog: React.FC<Props> = (props) => (props.purchase ? <CorrectForm key={props.purchase.id} {...props} purchase={props.purchase} /> : null);

const CorrectForm: React.FC<Props & { purchase: Purchase }> = ({ purchase, options, onClose, onSaved }) => {
    const [value, setValue] = useState<MoneyValue>({ amount: String(purchase.total_amount), currency: purchase.currency,
        rate: purchase.currency === "VES" ? String(purchase.rate) : "" });
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const usd = toUsd(value.amount, value.currency, value.rate);

    const save = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/finance/purchases/${purchase.id}/correct`, "POST", {
                total_amount: Number(value.amount.replace(",", ".")), currency: value.currency,
                ...(value.currency === "VES" ? { rate: Number(value.rate.replace(",", ".")) } : {}), reason: reason.trim(),
            });
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Corregir el costo de la compra</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <div>
                        <Typography variant="subtitle2">{purchase.quantity} × {purchase.product} · {purchase.supplier}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Hoy: {original(purchase.total_amount, purchase.currency, purchase.rate)} ({money(purchase.unit_cost_usd)} por unidad), {purchase.payment_type_label.toLowerCase()}
                        </Typography>
                    </div>
                    <MoneyFields value={value} onChange={setValue} currencies={options.currencies} label="Costo total correcto" noun="compra" />
                    <Typography variant="body2">
                        Nuevo costo por unidad: <b>{usd === null ? "—" : money(Math.round((usd / purchase.quantity) * 10000) / 10000)}</b>
                    </Typography>
                    <Alert severity="info">
                        Cambia el costo de sus lotes y de las órdenes que ya vendieron esas unidades, y la deuda con el proveedor
                        {purchase.payment_type === "cash" ? " (al contado, también su pago)." : ". Si ya se pagó más que el costo nuevo, primero hay que anular el pago que sobra."}
                    </Alert>
                    <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }}
                        helperText="Queda en el historial de la compra." />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || usd === null || reason.trim() === ""}>Guardar corrección</Button>
            </DialogActions>
        </Dialog>
    );
};
