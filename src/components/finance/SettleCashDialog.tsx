// src/components/finance/SettleCashDialog.tsx
// Liquidar el efectivo de una agencia (Módulo 4 de Fran, §43, §103, R16): lo que entregó pasa de su "Efectivo pendiente" a la
// cuenta donde se guarda (no es ingreso nuevo), el día que sea. Si el Admin lo marca, una parte se descuenta de lo que se le
// debe (nunca solo, §103). Una moneda por vez: dólares o bolívares. Comprobante opcional (§79).
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { AgencyCashRow, CashAccountOption, accountsFor, api, cashAmount, errorMessage, money, num, todayCaracas } from "./finance";

type Props = { agency: AgencyCashRow | null; accounts: CashAccountOption[]; onClose: () => void; onSaved: () => void };

export const SettleCashDialog: React.FC<Props> = (props) => (props.agency ? <SettleCashForm key={props.agency.id} {...props} agency={props.agency} /> : null);

const SettleCashForm: React.FC<Props & { agency: AgencyCashRow }> = ({ agency, accounts, onClose, onSaved }) => {
    const usdCash = agency.cash.find((c) => c.currency === "USD");
    const vesCash = agency.cash.find((c) => c.currency === "VES");
    const [currency, setCurrency] = useState<"USD" | "VES">(usdCash || !vesCash ? "USD" : "VES");
    const [date, setDate] = useState(todayCaracas());
    const [delivered, setDelivered] = useState("");
    const [toId, setToId] = useState("");
    const [compensation, setCompensation] = useState("");
    const [rate, setRate] = useState("");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const holding = (currency === "USD" ? usdCash : vesCash)?.balance ?? 0;
    const dest = accountsFor(accounts, currency);
    const d = delivered.trim() === "" ? 0 : num(delivered);
    const c = compensation.trim() === "" ? 0 : num(compensation);
    const r = num(rate);
    const compUsd = currency === "VES" ? (r > 0 ? c / r : null) : c;
    const tooMuch = compUsd !== null && compUsd > agency.owed_usd + 0.005;
    const ok = date !== "" && Number.isFinite(d) && Number.isFinite(c) && d >= 0 && c >= 0 && d + c > 0 && (d === 0 || toId !== "")
        && (currency !== "VES" || r > 0) && !tooMuch;

    const save = async () => {
        setSaving(true);
        try {
            const body = new FormData();
            body.append("currency", currency);
            body.append("occurred_on", date);
            body.append("delivered", String(d));
            if (d > 0) body.append("to_account_id", toId);
            if (c > 0) body.append("compensation", String(c));
            if (currency === "VES") body.append("rate", String(r));
            if (reference.trim()) body.append("reference", reference.trim());
            if (notes.trim()) body.append("notes", notes.trim());
            if (receipt) body.append("receipt", receipt);
            toast.success((await api<{ message: string }>(`/finance/agencies/${agency.id}/settle`, "POST", body)).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Liquidar efectivo: {agency.name}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Lo que entrega la agencia pasa de su efectivo pendiente a la cuenta donde se guarda: no es una venta nueva. Si se queda con una parte
                        como pago de lo que se le debe, escríbelo en "Se descuenta"; si no, la deuda no se toca.
                    </Typography>
                    <ToggleButtonGroup size="small" exclusive value={currency} onChange={(_, v) => { if (v) { setCurrency(v); setToId(""); } }}>
                        <ToggleButton value="USD">Dólares · tiene {cashAmount(usdCash?.balance ?? 0, "USD")}</ToggleButton>
                        <ToggleButton value="VES">Bolívares · tiene {cashAmount(vesCash?.balance ?? 0, "VES")}</ToggleButton>
                    </ToggleButtonGroup>
                    <TextField type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayCaracas() }} sx={{ maxWidth: 200 }} helperText="El día que lo entregó (no tiene que ser miércoles)." />
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField label={`Entregó (${currency === "VES" ? "Bs" : "$"})`} value={delivered} onChange={(e) => setDelivered(e.target.value)}
                            inputProps={{ inputMode: "decimal" }} sx={{ minWidth: 170 }} />
                        <TextField select label="Se guarda en" value={toId} onChange={(e) => setToId(e.target.value)} fullWidth required={d > 0}
                            helperText={dest.length === 0 ? `No hay cuentas en ${currency === "VES" ? "bolívares" : "dólares"}: créala en Finanzas › Caja.` : undefined}>
                            {dest.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                        </TextField>
                    </Stack>
                    {agency.owed_usd > 0 && (
                        <TextField label={`Se descuenta de lo que se le debe (${currency === "VES" ? "Bs" : "$"})`} value={compensation} onChange={(e) => setCompensation(e.target.value)}
                            inputProps={{ inputMode: "decimal" }} sx={{ maxWidth: 320 }}
                            helperText={`Se le debe ${money(agency.owed_usd)}. Paga primero los cierres más viejos.`} error={tooMuch} />
                    )}
                    {currency === "VES" && (
                        <TextField label="Tasa (Bs por USD)" value={rate} onChange={(e) => setRate(e.target.value)} required inputProps={{ inputMode: "decimal" }} sx={{ maxWidth: 220 }}
                            helperText={compUsd !== null && c > 0 ? `Lo descontado son ${money(compUsd)}` : "La de esta entrega (R2)"} />
                    )}
                    {d + c > holding + 0.005 && <Alert severity="warning">Es más de lo que el sistema dice que tiene ({cashAmount(holding, currency)}). Revisa el saldo inicial de su efectivo.</Alert>}
                    <TextField label="Referencia" value={reference} onChange={(e) => setReference(e.target.value)} inputProps={{ maxLength: 120 }} sx={{ maxWidth: 260 }} />
                    <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 500 }} />
                    <Button variant="outlined" component="label" size="small" sx={{ alignSelf: "flex-start" }}>
                        {receipt ? `Comprobante: ${receipt.name}` : "Adjuntar comprobante (opcional)"}
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Registrar</Button>
            </DialogActions>
        </Dialog>
    );
};
