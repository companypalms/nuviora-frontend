// src/components/finance/RecurringPayDialog.tsx
// "Registrar pago" de un gasto recurrente (Módulo 4 de Fran, §28): cada vencimiento se paga aparte y sale de la caja el día
// que se pagó, desde una cuenta de la caja. La rentabilidad no cambia: el recurrente se sigue repartiendo en lo que cubre.
// Abajo, los pagos ya registrados, que se anulan con el motivo (§83).
import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { FinanceOptions, RecurringExpense, accountsFor, api, day, errorMessage, inCurrency, original, todayCaracas } from "./finance";

/** due: el vencimiento que se paga (el calendario abre la ventana con el del día); si no se dice, el primero sin pagar. */
type Props = { recurring: RecurringExpense | null; options: FinanceOptions; onClose: () => void; onSaved: () => void; due?: string };

export const RecurringPayDialog: React.FC<Props> = (props) => (props.recurring ? <RecurringPayForm key={props.recurring.id} {...props} recurring={props.recurring} /> : null);

const RecurringPayForm: React.FC<Props & { recurring: RecurringExpense }> = ({ recurring, options, onClose, onSaved, due: wanted }) => {
    const unpaid = recurring.due.filter((d) => !d.paid);
    const first = unpaid.find((d) => d.due_date === wanted) ?? unpaid[0] ?? null;
    const [due, setDue] = useState(first?.due_date ?? "");
    const [money, setMoney] = useState<MoneyValue>({ amount: first ? String(first.amount) : "", currency: first?.currency ?? "USD", rate: "" });
    const [paidAt, setPaidAt] = useState(todayCaracas());
    const [account, setAccount] = useState("");
    const [notes, setNotes] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [voidReason, setVoidReason] = useState<Record<number, string>>({});

    const accounts = accountsFor(options.financial_accounts, money.currency);
    const needsAccount = paidAt > options.cash_start_date;
    const ok = due !== "" && money.amount.trim() !== "" && (money.currency !== "VES" || money.rate.trim() !== "")
        && (!needsAccount || accounts.some((a) => String(a.id) === account));

    const pickDue = (date: string) => {
        setDue(date);
        const d = recurring.due.find((x) => x.due_date === date);
        if (d) setMoney({ amount: String(d.amount), currency: d.currency, rate: "" });
    };

    const save = async () => {
        setSaving(true);
        try {
            const body = new FormData();
            body.append("due_date", due);
            body.append("paid_at", paidAt);
            body.append("amount", money.amount.replace(",", "."));
            body.append("currency", money.currency);
            if (money.currency === "VES") body.append("rate", money.rate.replace(",", "."));
            if (account) body.append("financial_account_id", account);
            if (notes.trim()) body.append("notes", notes.trim());
            if (receipt) body.append("receipt", receipt);
            toast.success((await api<{ message: string }>(`/finance/recurring-expenses/${recurring.id}/payments`, "POST", body)).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const voidPayment = async (id: number) => {
        try {
            toast.success((await api<{ message: string }>(`/finance/recurring-payments/${id}/void`, "POST", { reason: (voidReason[id] ?? "").trim() })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Registrar pago: {recurring.name}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {recurring.due.length === 0 ? (
                        <Typography color="text.secondary">No tiene vencimientos desde el arranque de la caja.</Typography>
                    ) : (
                        <TextField select label="Vencimiento que se paga" value={due} onChange={(e) => pickDue(e.target.value)} required>
                            {recurring.due.map((d) => (
                                <MenuItem key={d.due_date} value={d.due_date} disabled={d.paid}>
                                    {day(d.due_date)} · {inCurrency(d.amount, d.currency)}{d.paid ? " · pagado" : d.overdue ? " · vencido" : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <MoneyFields value={money} onChange={setMoney} currencies={options.currencies} label="Monto pagado" noun="pago" />
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField type="date" label="Fecha del pago" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} InputLabelProps={{ shrink: true }}
                            inputProps={{ max: todayCaracas() }} sx={{ minWidth: 180 }} />
                        <TextField select label="Cuenta de donde salió" value={accounts.some((a) => String(a.id) === account) ? account : ""} onChange={(e) => setAccount(e.target.value)}
                            required={needsAccount} fullWidth>
                            {accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                        </TextField>
                    </Stack>
                    <TextField label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} inputProps={{ maxLength: 500 }} />
                    <Button component="label" variant="outlined" size="small" sx={{ alignSelf: "flex-start" }}>
                        {receipt ? `Comprobante: ${receipt.name}` : "Adjuntar comprobante (opcional)"}
                        <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                    </Button>
                    <Typography variant="caption" color="text.secondary">Sale de la caja ese día. En la rentabilidad no cambia nada: el gasto se sigue repartiendo en los días que cubre.</Typography>
                    {recurring.payments.length > 0 && (
                        <>
                            <Divider />
                            <Typography variant="subtitle2">Pagos registrados</Typography>
                            {recurring.payments.map((p) => (
                                <Stack key={p.id} direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }} sx={{ opacity: p.voided_at ? 0.55 : 1 }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        Vence {day(p.due_date)} · pagado el {day(p.paid_at)} · {original(p.amount, p.currency, p.rate)}{p.account ? ` · ${p.account}` : ""}
                                        {p.voided_at && <Typography component="span" variant="caption" color="error.main"> · anulado: {p.void_reason}</Typography>}
                                    </Typography>
                                    {!p.voided_at && (
                                        <>
                                            <TextField size="small" placeholder="Motivo para anular" value={voidReason[p.id] ?? ""}
                                                onChange={(e) => setVoidReason({ ...voidReason, [p.id]: e.target.value })} sx={{ minWidth: 180 }} />
                                            <Button size="small" color="error" disabled={(voidReason[p.id] ?? "").trim() === ""} onClick={() => voidPayment(p.id)}>Anular</Button>
                                        </>
                                    )}
                                </Stack>
                            ))}
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cerrar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Registrar pago</Button>
            </DialogActions>
        </Dialog>
    );
};
