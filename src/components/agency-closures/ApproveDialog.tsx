// src/components/agency-closures/ApproveDialog.tsx
// Aprobar el cierre completo con un botón (Fran, 15/10/2026: "que yo pueda aprobar el monto de la agencia y le dé a un
// botón, o que pueda elegir otro monto y le dé a un botón"): las diferencias que siguen abiertas se aprueban con lo que
// cobra la agencia; con otro monto, ese es el monto final del cierre, con su motivo. Queda "Listo para pago".
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { ClosureDetail, api, money } from "./closures";

export const ApproveDialog: React.FC<{ closure: ClosureDetail; mode: "agency" | "manual"; onClose: () => void; onApproved: () => void }> = ({ closure, mode, onClose, onApproved }) => {
    const { cases, reported, total } = closure.approve_all;
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const value = Number(amount.replace(",", "."));
    const ok = mode === "agency" || (amount.trim() !== "" && Number.isFinite(value) && value >= 0 && reason.trim() !== "");

    const save = async () => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>(`/delivery/closures/${closure.id}/approve`, "POST",
                mode === "agency" ? { option: "agency" } : { option: "manual", amount: value, reason: reason.trim() });
            toast.success(r.message);
            onApproved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{mode === "agency" ? "Aprobar lo de la agencia" : "Aprobar otro monto"}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{closure.agency}, semana {closure.week}.</Typography>
                {mode === "agency" ? (
                    <Typography variant="body2">
                        {cases === 1 ? "La diferencia que queda se aprueba" : `Las ${cases} diferencias que quedan se aprueban`} con lo que cobra la agencia ({money(reported)}).
                        El cierre queda <b>listo para pago por {money(total)}</b>.
                    </Typography>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant="body2">
                            {cases > 0 ? `${cases === 1 ? "La diferencia que queda se aprueba" : `Las ${cases} diferencias que quedan se aprueban`} y el cierre` : "El cierre"} queda
                            listo para pago por el monto que escribas. {cases > 0 ? `Con lo que cobra la agencia serían ${money(total)}.` : `Hoy el monto final es ${money(closure.final_approved_total)}.`}
                        </Typography>
                        <TextField label="Monto final del cierre" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} />
                        <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} required
                            placeholder="Ej.: lo acordado con la agencia" />
                        <Alert severity="info" sx={{ py: 0 }}>Si después reabres un caso, este monto deja de valer.</Alert>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Aprobar</Button>
            </DialogActions>
        </Dialog>
    );
};
