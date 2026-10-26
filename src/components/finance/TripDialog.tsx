// src/components/finance/TripDialog.tsx
// "Registrar viaje" y "Corregir" (Módulo 4 de Fran, §13, §14, §15, R8): el Admin marca los traslados que se hicieron en
// el viaje (pueden ser de varios destinos y productos) y escribe lo que costó: mano de obra, combustible y otros, en su
// moneda y con su tasa (R2). El desgaste sale de la regla de Configuración (§15). Se ve el total y cuánto le toca a
// cada unidad: eso se suma al costo de esas unidades cuando se venden (§14). Corregir pide el motivo (§82).
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import {
    CURRENCY_LABEL, Currency, FinanceOptions, Trip, TripMovement, WearRule, accountsFor, api, errorMessage, inCurrency, money, num, todayCaracas, tripTotals,
    usd4,
} from "./finance";

type Props = { open: boolean; trip: Trip | null; options: FinanceOptions; onClose: () => void; onSaved: () => void };

export const TripDialog: React.FC<Props> = (props) => (props.open ? <TripForm key={props.trip?.id ?? "new"} {...props} /> : null);

const amount = (v: number | undefined) => (v ? String(v) : "");

const TripForm: React.FC<Props> = ({ trip, options, onClose, onSaved }) => {
    const [candidates, setCandidates] = useState<TripMovement[] | null>(null);
    const [days, setDays] = useState(45);
    const [selected, setSelected] = useState<Set<number>>(new Set(trip?.movements.map((m) => m.id) ?? []));
    const [form, setForm] = useState({
        date: trip?.trip_date ?? todayCaracas(), description: trip?.description ?? "", currency: (trip?.currency ?? "USD") as Currency,
        rate: trip && trip.currency === "VES" ? String(trip.rate) : "", labor: amount(trip?.labor), fuel: amount(trip?.fuel), other: amount(trip?.other),
        account: trip?.financial_account_id ? String(trip.financial_account_id) : "", notes: trip?.notes ?? "", reason: "",
    });
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api<{ movements: TripMovement[]; days: number }>(`/finance/trips/candidates${trip ? `?trip_id=${trip.id}` : ""}`)
            .then((r) => { setCandidates(r.movements); setDays(r.days); })
            .catch((e) => toast.error(errorMessage(e)));
    }, [trip]);

    // Un viaje corregido conserva la regla de desgaste con la que se registró
    const rule: WearRule = trip ? { mode: trip.wear_mode, value: trip.wear_value } : options.vehicle_wear;
    const ruleLabel = trip ? trip.wear_label : options.vehicle_wear.label;
    const n = (s: string) => (s.trim() === "" ? 0 : num(s));
    const rate = form.currency === "VES" ? n(form.rate) : 1;
    const totals = tripTotals(n(form.labor), n(form.fuel), n(form.other), form.currency, rate, rule);
    const units = useMemo(() => (candidates ?? []).filter((m) => selected.has(m.id)).reduce((a, m) => a + m.quantity, 0), [candidates, selected]);
    const perUnit = units > 0 ? totals.totalUsd / units : null;
    const badNumber = [form.labor, form.fuel, form.other].some((v) => v.trim() !== "" && !(num(v) >= 0));
    const ready = selected.size > 0 && totals.totalUsd > 0 && !badNumber && (form.currency !== "VES" || rate > 0) && (!trip || form.reason.trim() !== "");

    const toggle = (id: number) => setSelected((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });

    const save = async () => {
        const body = new FormData();
        body.append("trip_date", form.date);
        body.append("description", form.description);
        body.append("currency", form.currency);
        if (form.currency === "VES") body.append("rate", form.rate.replace(",", "."));
        (["labor", "fuel", "other"] as const).forEach((k) => body.append(k, String(n(form[k]))));
        selected.forEach((id) => body.append("movement_ids[]", String(id)));
        if (form.account) body.append("financial_account_id", form.account);
        if (form.notes.trim()) body.append("notes", form.notes.trim());
        if (receipt) body.append("receipt", receipt);
        if (trip) body.append("reason", form.reason);
        setSaving(true);
        try {
            const res = await api<{ message: string }>(trip ? `/finance/trips/${trip.id}` : "/finance/trips", "POST", body);
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const costField = (key: "labor" | "fuel" | "other", label: string) => (
        <TextField size="small" label={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} fullWidth
            inputProps={{ inputMode: "decimal" }} InputProps={{ startAdornment: <InputAdornment position="start">{form.currency === "VES" ? "Bs" : "$"}</InputAdornment> }} />
    );

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{trip ? "Corregir viaje" : "Registrar viaje de traslado"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField type="date" size="small" label="Fecha del viaje" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                            InputLabelProps={{ shrink: true }} inputProps={{ max: todayCaracas() }} sx={{ minWidth: 180 }} />
                        <TextField size="small" label="Ruta (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth
                            placeholder="Valencia → Maracay → Caracas" inputProps={{ maxLength: 255 }} />
                    </Stack>

                    <div>
                        <Typography variant="subtitle2">¿Qué traslados se hicieron en este viaje?</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Los de los últimos {days} días que no están en otro viaje. El costo se reparte entre todas las unidades marcadas, sea cual sea su destino.
                        </Typography>
                        {candidates === null ? <Typography color="text.secondary" sx={{ mt: 1 }}>Cargando…</Typography> : candidates.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 1 }}>No hay traslados sin viaje. Primero se hace el traslado (arriba, "Transferencia de Stock") y después se registra el viaje.</Alert>
                        ) : (
                            <TableContainer sx={{ maxHeight: 260, mt: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox" /><TableCell>Fecha</TableCell><TableCell>Producto</TableCell><TableCell>Desde → Hacia</TableCell>
                                            <TableCell align="right">Unidades</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {candidates.map((m) => (
                                            <TableRow key={m.id} hover onClick={() => toggle(m.id)} sx={{ cursor: "pointer" }} selected={selected.has(m.id)}>
                                                <TableCell padding="checkbox"><Checkbox size="small" checked={selected.has(m.id)} inputProps={{ "aria-label": `Traslado ${m.id}` }} /></TableCell>
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>{m.date.slice(8, 10)}/{m.date.slice(5, 7)} {m.date.slice(11)}</TableCell>
                                                <TableCell>{m.product}{m.variant ? ` (${m.variant})` : ""}</TableCell>
                                                <TableCell>{m.from} → {m.to}</TableCell>
                                                <TableCell align="right">{m.quantity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </div>

                    <div>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>¿Cuánto costó?</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField select size="small" label="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })} sx={{ minWidth: 170 }}>
                                {options.currencies.map((c) => <MenuItem key={c} value={c}>{CURRENCY_LABEL[c]}</MenuItem>)}
                            </TextField>
                            {form.currency === "VES" && (
                                <TextField size="small" label="Tasa" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required sx={{ minWidth: 150 }}
                                    InputProps={{ endAdornment: <InputAdornment position="end">Bs/$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} />
                            )}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 1.5 }}>
                            {costField("labor", "Mano de obra")}
                            {costField("fuel", "Combustible")}
                            {costField("other", "Otros")}
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Desgaste del vehículo: <b>{inCurrency(totals.wear, form.currency)}</b>
                            <Typography component="span" variant="body2" color="text.secondary"> ({ruleLabel})</Typography>
                        </Typography>
                    </div>

                    <Alert severity={units > 0 && totals.totalUsd > 0 ? "success" : "info"} icon={false}>
                        <Typography variant="body2">
                            Total del viaje: <b>{inCurrency(totals.total, form.currency)}</b>{form.currency === "VES" ? ` = ${money(totals.totalUsd)}` : ""}
                            {" · "}{units} unidad(es) · <b>{perUnit === null ? "—" : usd4(Math.round(perUnit * 10000) / 10000)} por unidad</b>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Se suma al costo de cada una de esas unidades y cuenta cuando se venden. No se cuenta dos veces: en Gastos se ve como transporte del mes, pero no suma en la rentabilidad del período.
                        </Typography>
                    </Alert>

                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField select size="small" label="Cuenta de donde salió el pago" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}
                            SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} fullWidth
                            helperText="Sale de la caja lo pagado (sin el desgaste). Sin cuenta, no sale de la caja.">
                            <MenuItem value="">Sin indicar</MenuItem>
                            {accountsFor(options.financial_accounts, form.currency).map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                        </TextField>
                        <TextField size="small" label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth inputProps={{ maxLength: 500 }} />
                    </Stack>
                    <div>
                        <Button component="label" variant="outlined" size="small">
                            {receipt ? "Cambiar comprobante" : trip?.has_receipt ? "Reemplazar comprobante" : "Adjuntar comprobante (opcional)"}
                            <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                        </Button>
                        {receipt && <Typography variant="caption" sx={{ ml: 1 }}>{receipt.name}</Typography>}
                    </div>
                    {trip && (
                        <TextField size="small" label="Motivo de la corrección" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required
                            inputProps={{ maxLength: 500 }} helperText="Queda en el historial del viaje, con lo que había antes y lo nuevo." />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ready}>{trip ? "Guardar corrección" : "Registrar viaje"}</Button>
            </DialogActions>
        </Dialog>
    );
};
