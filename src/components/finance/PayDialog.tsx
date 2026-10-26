// src/components/finance/PayDialog.tsx
// "Registrar pago" de una deuda con un proveedor (Módulo 4 de Fran, §17): parcial o total. Cada pago baja el saldo y no
// cambia el costo del inventario. En otra moneda descuenta su equivalente con la tasa que escribe el Admin (R2); una deuda
// en bolívares se paga en bolívares. Sale de una cuenta de la caja en esa moneda (entrega 3): desde el arranque de la caja es
// obligatoria; lo pagado antes ya está en los saldos iniciales.
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { FinanceOptions, Payable, accountsFor, api, errorMessage, inCurrency, num, toUsd, todayCaracas } from "./finance";

type Props = { payable: Payable | null; options: FinanceOptions; onClose: () => void; onDone: () => void };

export const PayDialog: React.FC<Props> = (props) => (props.payable ? <PayForm key={props.payable.id} {...props} payable={props.payable} /> : null);

const PayForm: React.FC<Props & { payable: Payable }> = ({ payable, options, onClose, onDone }) => {
    const [value, setValue] = useState<MoneyValue>({ amount: "", currency: payable.currency, rate: "" });
    const [date, setDate] = useState(todayCaracas());
    const [account, setAccount] = useState("");
    const [notes, setNotes] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const ves = payable.currency === "VES";
    const usd = toUsd(value.amount, value.currency, value.rate);
    // Lo que descuenta de la deuda, en su moneda
    const applied = ves ? (Number.isFinite(num(value.amount)) ? num(value.amount) : null) : usd;
    const tooMuch = applied !== null && applied > payable.balance + 0.005;
    const accounts = accountsFor(options.financial_accounts, value.currency);
    const needsAccount = date > options.cash_start_date;
    const accountOk = !needsAccount || accounts.some((a) => String(a.id) === account);

    const save = async () => {
        const body = new FormData();
        body.append("amount", value.amount.replace(",", "."));
        body.append("currency", value.currency);
        if (value.currency === "VES") body.append("rate", value.rate.replace(",", "."));
        body.append("paid_at", date);
        if (account) body.append("financial_account_id", account);
        if (notes.trim()) body.append("notes", notes.trim());
        if (receipt) body.append("receipt", receipt);
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/finance/payables/${payable.id}/payments`, "POST", body);
            toast.success(res.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <div>
                        <Typography variant="subtitle2">{payable.payee} · {payable.description}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Deuda {inCurrency(payable.amount, payable.currency)}, pagado {inCurrency(payable.paid_amount, payable.currency)}.
                            Pendiente: <b>{inCurrency(payable.balance, payable.currency)}</b>
                        </Typography>
                    </div>
                    <MoneyFields value={value} onChange={setValue} currencies={ves ? ["VES"] : options.currencies} label="Monto del pago" noun="pago" />
                    {value.currency === payable.currency && (
                        <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setValue({ ...value, amount: String(payable.balance) })}>
                            Pagar todo lo pendiente
                        </Button>
                    )}
                    {!ves && value.currency === "VES" && usd !== null && (
                        <Typography variant="caption" color="text.secondary">Descuenta {inCurrency(usd, payable.currency)} de la deuda.</Typography>
                    )}
                    {tooMuch && <Alert severity="warning">El pago es mayor que lo pendiente ({inCurrency(payable.balance, payable.currency)}).</Alert>}
                    <TextField type="date" label="Fecha del pago" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayCaracas() }} sx={{ maxWidth: 220 }} />
                    <TextField select label={needsAccount ? "Cuenta de donde salió" : "Cuenta de donde salió (antes de la caja: opcional)"} value={accounts.some((a) => String(a.id) === account) ? account : ""}
                        onChange={(e) => setAccount(e.target.value)} required={needsAccount} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
                        helperText={accounts.length === 0 ? "No hay cuentas de la caja en esa moneda: créala en Finanzas › Caja." : "Sale de la caja en esa cuenta."}>
                        {!needsAccount && <MenuItem value="">Sin indicar</MenuItem>}
                        {accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                    </TextField>
                    <TextField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} inputProps={{ maxLength: 500 }} />
                    <div>
                        <Button component="label" variant="outlined" size="small">
                            {receipt ? "Cambiar comprobante" : "Adjuntar comprobante (opcional)"}
                            <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                        </Button>
                        {receipt && <Typography variant="caption" sx={{ ml: 1 }}>{receipt.name}</Typography>}
                    </div>
                    <Typography variant="caption" color="text.secondary">El pago baja la deuda y no cambia el costo del inventario de esa compra.</Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || applied === null || applied <= 0 || tooMuch || !accountOk}>Registrar pago</Button>
            </DialogActions>
        </Dialog>
    );
};
