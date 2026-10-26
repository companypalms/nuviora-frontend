// src/components/finance/RefundsWithoutAccount.tsx
// Reembolsos que no salen de ninguna cuenta (Módulo 4 de Fran, §77: el reembolso afecta la caja). La orden registra el
// reembolso con su método, y eso lo hacen también vendedoras y gerentes, que no ven las cuentas. Si el método no dice la
// cuenta (efectivo, "Otro"), el Admin la pone aquí. En bolívares se puede escribir lo que salió; si no, se usa la tasa del
// pago de la orden.
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { FinanceOptions, RefundWithoutAccount, api, day, errorMessage, money } from "./finance";

export const RefundsWithoutAccount: React.FC<{ refunds: RefundWithoutAccount[]; options: FinanceOptions; onSaved: () => void }> = ({ refunds, options, onSaved }) => {
    const [editing, setEditing] = useState<RefundWithoutAccount | null>(null);
    if (refunds.length === 0) return null;

    return (
        <Alert severity="warning">
            <Typography variant="body2" sx={{ mb: 0.5 }}>
                {refunds.length} reembolso(s) no dicen de qué cuenta salió el dinero: no salen de la caja hasta que se diga.
            </Typography>
            {refunds.map((r) => (
                <Stack key={r.id} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="body2">
                        {r.order ?? `Orden ${r.order_id}`} · {money(r.amount_usd)}{r.method ? ` por ${r.method}` : ""} · el {day(r.refunded_at)}
                    </Typography>
                    <Button size="small" color="inherit" onClick={() => setEditing(r)}>Poner cuenta</Button>
                </Stack>
            ))}
            {editing && <RefundAccountDialog refund={editing} options={options} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved(); }} />}
        </Alert>
    );
};

const RefundAccountDialog: React.FC<{ refund: RefundWithoutAccount; options: FinanceOptions; onClose: () => void; onSaved: () => void }> = ({ refund, options, onClose, onSaved }) => {
    const [account, setAccount] = useState("");
    const [bolivares, setBolivares] = useState("");
    const [saving, setSaving] = useState(false);
    const chosen = options.financial_accounts.find((a) => String(a.id) === account);

    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/refunds/${refund.id}/account`, "PUT", {
                financial_account_id: Number(account),
                ...(chosen?.currency === "VES" && bolivares.trim() ? { amount: bolivares.replace(",", ".") } : {}),
            })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>¿De qué cuenta salió?</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Reembolso de {money(refund.amount_usd)} de {refund.order ?? `la orden ${refund.order_id}`}{refund.method ? ` por ${refund.method}` : ""}, el {day(refund.refunded_at)}.
                    </Typography>
                    <TextField select label="Cuenta" value={account} onChange={(e) => setAccount(e.target.value)} required>
                        {options.financial_accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                    </TextField>
                    {chosen?.currency === "VES" && (
                        <TextField label="Bolívares que salieron (opcional)" value={bolivares} onChange={(e) => setBolivares(e.target.value)} inputMode="decimal"
                            helperText="Si se deja vacío, se usa la tasa del pago de la orden." />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !account}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
