// src/components/finance/RecurringAmountDialog.tsx
// Cambiar el monto de un gasto recurrente desde una fecha, o desactivarlo o reactivarlo desde una fecha (Módulo 4 de
// Fran, §25, §27): lo anterior conserva su monto ("Editor: $320 → $400; los meses anteriores mantienen $320").
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { Currency, RecurringExpense, api, day, errorMessage, todayCaracas } from "./finance";

export type AmountMode = "amount" | "deactivate" | "activate";

type Props = { target: { recurring: RecurringExpense; mode: AmountMode } | null; currencies: Currency[]; onClose: () => void; onSaved: () => void };

export const RecurringAmountDialog: React.FC<Props> = (props) =>
    props.target ? <AmountForm key={`${props.target.recurring.id}-${props.target.mode}`} {...props} target={props.target} /> : null;

const TITLE: Record<AmountMode, string> = { amount: "Cambiar monto", deactivate: "Desactivar", activate: "Reactivar" };

const AmountForm: React.FC<Props & { target: { recurring: RecurringExpense; mode: AmountMode } }> = ({ target, currencies, onClose, onSaved }) => {
    const { recurring: r, mode } = target;
    const last = r.versions[0];
    const [money, setMoney] = useState<MoneyValue>({ amount: last ? String(last.amount) : "", currency: last?.currency ?? "USD",
        rate: last?.currency === "VES" ? String(last.rate) : "" });
    const [validFrom, setValidFrom] = useState(todayCaracas());
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const corrects = last && validFrom === last.valid_from;

    const save = async () => {
        const body = mode === "deactivate"
            ? { is_active: false, valid_from: validFrom, reason }
            : { is_active: true, amount: money.amount.replace(",", "."), currency: money.currency, rate: money.currency === "VES" ? money.rate.replace(",", ".") : null, valid_from: validFrom, reason };
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/finance/recurring-expenses/${r.id}/versions`, "POST", body);
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const ready = validFrom !== "" && reason.trim() !== "" && (mode === "deactivate" || (money.amount.trim() !== "" && (money.currency !== "VES" || money.rate.trim() !== "")));

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{TITLE[mode]}: {r.name}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {mode !== "deactivate" && <MoneyFields value={money} onChange={setMoney} currencies={currencies} />}
                    <TextField type="date" label={mode === "deactivate" ? "Deja de pagarse desde" : "Desde"} value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }} inputProps={{ min: last?.valid_from }} sx={{ maxWidth: 260 }}
                        helperText={last ? `No puede ser antes del ${day(last.valid_from)}, el último cambio.` : undefined} />
                    {corrects && mode === "amount" && (
                        <Alert severity="warning">Es la misma fecha del último cambio: corrige ese monto en vez de agregar uno nuevo. Queda en el historial.</Alert>
                    )}
                    {!corrects && mode === "amount" && <Alert severity="info">Hasta el día anterior sigue valiendo el monto de antes.</Alert>}
                    <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }}
                        placeholder={mode === "amount" ? "Subió el precio, cambio de plan…" : undefined} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" color={mode === "deactivate" ? "error" : "primary"} onClick={save} disabled={saving || !ready}>{TITLE[mode]}</Button>
            </DialogActions>
        </Dialog>
    );
};
