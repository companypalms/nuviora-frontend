// src/components/finance/OpeningBalancesDialog.tsx
// Los saldos iniciales de la caja, todos de una vez (Módulo 4 de Fran, §36 y R14): lo que tenía el negocio en cada cuenta
// al cierre del día de arranque, incluido el efectivo que tenía cada agencia. Cambiar uno ya puesto pide el motivo (§82).
import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { CashAccount, api, cashAmount, day, errorMessage, num } from "./finance";

type Props = { open: boolean; accounts: CashAccount[]; startDate: string; onClose: () => void; onSaved: () => void };

export const OpeningBalancesDialog: React.FC<Props> = (props) => (props.open ? <OpeningBalancesForm {...props} /> : null);

const OpeningBalancesForm: React.FC<Props> = ({ accounts, startDate, onClose, onSaved }) => {
    const active = accounts.filter((a) => a.is_active);
    const [values, setValues] = useState<Record<number, string>>(() => Object.fromEntries(active.map((a) => [a.id, a.opening_balance === null ? "" : String(a.opening_balance)])));
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const parsed = (id: number) => (values[id].trim() === "" ? null : num(values[id]));
    const changed = active.filter((a) => {
        const v = parsed(a.id);
        return a.opening_balance === null ? v !== null : v === null || Math.abs(v - a.opening_balance) >= 0.005;
    });
    const needsReason = changed.some((a) => a.opening_balance !== null);
    const valid = active.every((a) => parsed(a.id) === null || Number.isFinite(parsed(a.id)));

    const save = async () => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>("/finance/cash/opening-balances", "PUT", {
                balances: changed.map((a) => ({ id: a.id, opening_balance: parsed(a.id) })), reason: reason.trim() || null,
            });
            toast.success(r.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Saldos iniciales</DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Lo que tenía el negocio en cada cuenta al cierre del {day(startDate)}. Si una cuenta mezcla dinero personal, va solo la parte de la
                        empresa. En el efectivo de cada agencia va lo que tenía guardado de las entregas que todavía no había liquidado.
                    </Typography>
                    {active.map((a) => (
                        <Stack key={a.id} direction="row" gap={1.5} alignItems="center">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap>{a.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {a.kind_label}{a.movements > 0 ? ` · hoy ${cashAmount(a.balance, a.currency)}` : ""}
                                </Typography>
                            </div>
                            <TextField size="small" value={values[a.id]} onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
                                placeholder="sin poner" inputProps={{ inputMode: "decimal" }} sx={{ width: 170 }}
                                InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{a.currency === "VES" ? "Bs" : a.currency}</Typography> }} />
                        </Stack>
                    ))}
                    {needsReason && (
                        <TextField label="¿Por qué cambian?" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }}
                            helperText="Hay saldos que ya estaban puestos: el cambio queda en el historial de cada cuenta." />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !valid || changed.length === 0 || (needsReason && reason.trim() === "")}>
                    Guardar {changed.length > 0 ? `(${changed.length})` : ""}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
