// src/components/finance/CashMovementDialog.tsx
// Un movimiento de caja a mano (Módulo 4 de Fran, §37 a §41, §83):
// - aporte (§37) o retiro (§38) del propietario: no son ingreso ni gasto;
// - transferencia entre cuentas de la misma moneda (§39): lo que sale de más que lo que llega es la comisión, que sí es gasto (§40);
// - cambio de moneda (§41): monto de origen y de destino (la tasa sale sola) y la comisión aparte;
// - ajuste de saldo (§83): sube o baja una cuenta, con motivo.
// En bolívares la tasa se escribe a mano (R2). Comprobante opcional (§79).
import React, { useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { CashAccount, api, cashAmount, errorMessage, money, num, todayCaracas } from "./finance";

type Kind = "owner_contribution" | "owner_withdrawal" | "internal_transfer" | "exchange" | "adjustment";

const HELP: Record<Kind, string> = {
    owner_contribution: "Dinero que pone el dueño. Sube la caja, pero no es ingreso: no cambia el beneficio.",
    owner_withdrawal: "Dinero que saca el dueño. Baja la caja, pero no es gasto del negocio.",
    internal_transfer: "De una cuenta a otra de la misma moneda. Si llega menos de lo que sale, la diferencia es la comisión: esa sí es gasto.",
    exchange: "De una moneda a otra (por ejemplo, Bs a USDT). La tasa sale de los dos montos. La comisión, si la hay, es gasto.",
    adjustment: "Para cuadrar con el banco una diferencia que no tiene otro registro. Pide el motivo y no cambia el beneficio.",
};

const dollars = (c: string) => c === "USD" || c === "USDT";
const family = (c: string) => (dollars(c) ? "USD" : c);
const unit = (c: string) => (c === "VES" ? "Bs" : c);

type Props = { open: boolean; accounts: CashAccount[]; kinds: Record<string, string>; onClose: () => void; onSaved: () => void };

export const CashMovementDialog: React.FC<Props> = (props) => (props.open ? <CashMovementForm {...props} /> : null);

const CashMovementForm: React.FC<Props> = ({ accounts, kinds, onClose, onSaved }) => {
    const usable = accounts.filter((a) => a.is_active && a.kind !== "agency_cash");
    const [kind, setKind] = useState<Kind>("internal_transfer");
    const [date, setDate] = useState(todayCaracas());
    const [fromId, setFromId] = useState("");
    const [toId, setToId] = useState("");
    const [fromAmount, setFromAmount] = useState("");
    const [toAmount, setToAmount] = useState("");
    const [rate, setRate] = useState("");
    const [fee, setFee] = useState("");
    const [direction, setDirection] = useState<"up" | "down">("down");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const from = usable.find((a) => String(a.id) === fromId) ?? null;
    const to = usable.find((a) => String(a.id) === toId) ?? null;
    // Qué cuentas se piden
    const needsFrom = kind === "owner_withdrawal" || kind === "internal_transfer" || kind === "exchange" || (kind === "adjustment" && direction === "down");
    const needsTo = kind === "owner_contribution" || kind === "internal_transfer" || kind === "exchange" || (kind === "adjustment" && direction === "up");
    const single = needsFrom !== needsTo ? (needsFrom ? from : to) : null;
    const singleAmount = needsFrom && !needsTo ? fromAmount : toAmount;
    const setSingleAmount = needsFrom && !needsTo ? setFromAmount : setToAmount;

    const toOptions = useMemo(() => usable.filter((a) => a.id !== from?.id && (kind !== "internal_transfer" || !from || family(a.currency) === family(from.currency))
        && (kind !== "exchange" || !from || family(a.currency) !== family(from.currency))), [usable, from, kind]);

    // Lo que se ve calculado
    const sent = num(fromAmount);
    const received = toAmount.trim() === "" ? sent : num(toAmount);
    const transferFee = kind === "internal_transfer" && sent > 0 && received > 0 ? Math.round((sent - received) * 100) / 100 : 0;
    const exchangeRate = kind === "exchange" && from && to && sent > 0 && num(toAmount) > 0
        ? (dollars(to.currency) ? sent / num(toAmount) : dollars(from.currency) ? num(toAmount) / sent : null) : null;
    const rateCurrency = single?.currency ?? from?.currency ?? "";
    const needsRate = (kind !== "exchange" && rateCurrency !== "" && !dollars(rateCurrency))
        || (kind === "exchange" && !!from && !!to && !dollars(from.currency) && !dollars(to.currency));
    const singleUsd = single && num(singleAmount) > 0 ? (dollars(single.currency) ? num(singleAmount) : num(rate) > 0 ? num(singleAmount) / num(rate) : null) : null;

    const ok = date !== "" && (!needsFrom || from) && (!needsTo || to)
        && (single ? num(singleAmount) > 0 : sent > 0 && (kind !== "exchange" || num(toAmount) > 0) && (kind !== "internal_transfer" || (received > 0 && received <= sent)))
        && (!needsRate || num(rate) > 0) && (kind !== "adjustment" || notes.trim() !== "");

    const save = async () => {
        setSaving(true);
        try {
            const body = new FormData();
            body.append("kind", kind);
            body.append("occurred_on", date);
            if (needsFrom && from) body.append("from_account_id", String(from.id));
            if (needsTo && to) body.append("to_account_id", String(to.id));
            if (single) {
                body.append(needsFrom ? "from_amount" : "to_amount", String(num(singleAmount)));
            } else {
                body.append("from_amount", String(sent));
                if (toAmount.trim() !== "") body.append("to_amount", String(num(toAmount)));
            }
            if (needsRate && rate.trim() !== "") body.append("rate", String(num(rate)));
            if (kind === "exchange" && fee.trim() !== "") body.append("fee", String(num(fee)));
            if (reference.trim()) body.append("reference", reference.trim());
            if (notes.trim()) body.append("notes", notes.trim());
            if (receipt) body.append("receipt", receipt);
            toast.success((await api<{ message: string }>("/finance/cash/movements", "POST", body)).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const accountSelect = (label: string, value: string, onChange: (v: string) => void, options: CashAccount[]) => (
        <TextField select label={label} value={value} onChange={(e) => onChange(e.target.value)} fullWidth required>
            {options.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} · {cashAmount(a.balance, a.currency)}</MenuItem>)}
        </TextField>
    );

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Nuevo movimiento</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField select label="Qué es" value={kind} onChange={(e) => { setKind(e.target.value as Kind); setToId(""); }}>
                        {Object.entries(kinds).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                    </TextField>
                    <Typography variant="body2" color="text.secondary">{HELP[kind]}</Typography>
                    <TextField type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayCaracas() }} sx={{ maxWidth: 200 }} />
                    {kind === "adjustment" && (
                        <ToggleButtonGroup size="small" exclusive value={direction} onChange={(_, v) => v && setDirection(v)}>
                            <ToggleButton value="down">Baja el saldo</ToggleButton>
                            <ToggleButton value="up">Sube el saldo</ToggleButton>
                        </ToggleButtonGroup>
                    )}

                    {needsFrom !== needsTo ? (
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            {needsFrom ? accountSelect("Cuenta", fromId, setFromId, usable) : accountSelect("Cuenta", toId, setToId, usable)}
                            <TextField label={`Monto${single ? ` (${unit(single.currency)})` : ""}`} value={singleAmount} onChange={(e) => setSingleAmount(e.target.value)}
                                required inputProps={{ inputMode: "decimal" }} sx={{ minWidth: 160 }} />
                        </Stack>
                    ) : (
                        <>
                            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                                {accountSelect("Sale de", fromId, (v) => { setFromId(v); setToId(""); }, usable)}
                                <TextField label={`Sale${from ? ` (${unit(from.currency)})` : ""}`} value={fromAmount} onChange={(e) => setFromAmount(e.target.value)}
                                    required inputProps={{ inputMode: "decimal" }} sx={{ minWidth: 160 }} />
                            </Stack>
                            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                                {accountSelect("Entra a", toId, setToId, toOptions)}
                                <TextField label={`Llega${to ? ` (${unit(to.currency)})` : ""}`} value={toAmount} onChange={(e) => setToAmount(e.target.value)}
                                    required={kind === "exchange"} placeholder={kind === "internal_transfer" ? "lo mismo" : ""} inputProps={{ inputMode: "decimal" }} sx={{ minWidth: 160 }}
                                    helperText={kind === "internal_transfer" ? "Si llega menos, la diferencia es la comisión" : undefined} />
                            </Stack>
                            {kind === "internal_transfer" && transferFee > 0 && from && (
                                <Typography variant="body2" color="warning.main">Comisión: {cashAmount(transferFee, from.currency)} (queda como gasto en "Comisiones bancarias").</Typography>
                            )}
                            {kind === "internal_transfer" && transferFee < 0 && <Typography variant="body2" color="error">Lo que llega no puede ser más de lo que sale.</Typography>}
                            {kind === "exchange" && (
                                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
                                    <TextField label={`Comisión${from ? ` (${unit(from.currency)})` : ""}`} value={fee} onChange={(e) => setFee(e.target.value)}
                                        inputProps={{ inputMode: "decimal" }} sx={{ maxWidth: 200 }} helperText="Sale aparte de la cuenta de origen. Es gasto." />
                                    {exchangeRate !== null && from && to && (
                                        <Typography variant="body2" color="text.secondary">
                                            Tasa: {new Intl.NumberFormat("es-VE", { maximumFractionDigits: 4 }).format(exchangeRate)} {dollars(to.currency) ? unit(from.currency) : unit(to.currency)} por dólar
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </>
                    )}

                    {needsRate && (
                        <TextField label={`Tasa (${rateCurrency === "VES" || (kind === "exchange") ? "Bs" : unit(rateCurrency)} por USD)`} value={rate} onChange={(e) => setRate(e.target.value)}
                            required inputProps={{ inputMode: "decimal" }} sx={{ maxWidth: 220 }}
                            helperText={singleUsd !== null ? `Son ${money(singleUsd)}` : "La de esta operación (R2)"} />
                    )}
                    <TextField label="Referencia" value={reference} onChange={(e) => setReference(e.target.value)} inputProps={{ maxLength: 120 }} sx={{ maxWidth: 260 }} />
                    <TextField label={kind === "adjustment" ? "Motivo del ajuste" : "Notas"} value={notes} onChange={(e) => setNotes(e.target.value)}
                        required={kind === "adjustment"} multiline minRows={2} inputProps={{ maxLength: 500 }} />
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
