// src/components/finance/CashAccountDialog.tsx
// Una cuenta de la caja (Módulo 4 de Fran, §35 y §36): nombre, tipo, moneda, saldo empresarial inicial (la parte del
// negocio) y si está activa. El tipo y la moneda no cambian después; cambiar un saldo inicial ya puesto pide el motivo (§82).
import React, { useState } from "react";
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { CASH_CURRENCY_LABEL, CashAccount, CashCurrency, api, day, errorMessage, num } from "./finance";

type Props = {
    account: CashAccount | "new" | null; kinds: Record<string, string>; currencies: CashCurrency[]; startDate: string;
    onClose: () => void; onSaved: () => void;
};

export const CashAccountDialog: React.FC<Props> = (props) => (props.account
    ? <CashAccountForm key={props.account === "new" ? "new" : props.account.id} {...props} account={props.account} /> : null);

const CashAccountForm: React.FC<Props & { account: CashAccount | "new" }> = ({ account, kinds, currencies, startDate, onClose, onSaved }) => {
    const isNew = account === "new";
    const a = isNew ? null : account;
    const [name, setName] = useState(a?.name ?? "");
    const [kind, setKind] = useState(a?.kind ?? "bank");
    const [currency, setCurrency] = useState<CashCurrency>(a?.currency ?? "VES");
    const [opening, setOpening] = useState(a?.opening_balance !== null && a?.opening_balance !== undefined ? String(a.opening_balance) : "");
    const [openingDate, setOpeningDate] = useState(startDate);
    const [active, setActive] = useState(a?.is_active ?? true);
    const [notes, setNotes] = useState(a?.notes ?? "");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const openingValue = opening.trim() === "" ? null : num(opening);
    const changesOpening = a !== null && a.opening_balance !== null && (openingValue === null || Math.abs(openingValue - a.opening_balance) >= 0.005);
    const ok = name.trim() !== "" && (openingValue === null || Number.isFinite(openingValue)) && (!changesOpening || reason.trim() !== "");

    const save = async () => {
        setSaving(true);
        try {
            const body = { name: name.trim(), opening_balance: openingValue, notes: notes.trim() || null };
            const r = isNew
                ? await api<{ message: string }>("/finance/cash/accounts", "POST", { ...body, kind, currency, opening_date: openingDate })
                : await api<{ message: string }>(`/finance/cash/accounts/${a!.id}`, "PUT", { ...body, is_active: active, reason: reason.trim() || null });
            toast.success(r.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{isNew ? "Nueva cuenta" : a!.name}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={isNew} inputProps={{ maxLength: 100 }}
                        placeholder="Mercantil, Efectivo oficina…" />
                    {isNew ? (
                        <Stack direction="row" gap={1.5}>
                            <TextField select label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ flex: 1 }}>
                                {Object.entries(kinds).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                            </TextField>
                            <TextField select label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value as CashCurrency)} sx={{ flex: 1 }}>
                                {currencies.map((c) => <MenuItem key={c} value={c}>{CASH_CURRENCY_LABEL[c]}</MenuItem>)}
                            </TextField>
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">{a!.kind_label} · {CASH_CURRENCY_LABEL[a!.currency]}</Typography>
                    )}
                    <TextField label={`Saldo del negocio al ${day(isNew ? openingDate : a!.opening_date)}`} value={opening} onChange={(e) => setOpening(e.target.value)}
                        inputProps={{ inputMode: "decimal" }} helperText="Solo la parte del negocio: si la cuenta mezcla dinero personal, va lo que es de la empresa." />
                    {isNew && (
                        <TextField type="date" label="Desde" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} InputLabelProps={{ shrink: true }}
                            inputProps={{ min: startDate }} helperText="El día del saldo. Lo que pase después cuenta en la caja." />
                    )}
                    {changesOpening && (
                        <TextField label="¿Por qué cambia el saldo inicial?" value={reason} onChange={(e) => setReason(e.target.value)} required
                            inputProps={{ maxLength: 500 }} helperText="Queda en el historial de la cuenta." />
                    )}
                    <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 500 }} />
                    {!isNew && (
                        <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
                            label={active ? "Activa" : "Inactiva: no se ofrece para pagos nuevos"} />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>{isNew ? "Crear cuenta" : "Guardar"}</Button>
            </DialogActions>
        </Dialog>
    );
};
