// src/components/agency-closures/PayDialog.tsx
// Registrar el pago de un cierre listo para pago (Módulo 3, §37): fecha, método, referencia y comprobante.
// Módulo 4 (§102, caso 16): sale de una cuenta de la caja y salda la deuda del cierre. En una cuenta en bolívares se escribe
// cuántos Bs se pagaron (la tasa sale sola). Lo que ya se descontó del efectivo de la agencia (R16) no se vuelve a pagar.
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { AttachFileRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { ClosureDetail, money, upload } from "./closures";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
const bs = (v: number) => `Bs ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`;

export const PayDialog: React.FC<{ closure: ClosureDetail; onClose: () => void; onPaid: () => void }> = ({ closure, onClose, onPaid }) => {
    const balance = closure.debt ? closure.debt.balance : (closure.final_approved_total ?? 0);
    const [form, setForm] = useState({ date: today(), account: "", ves: "", method: "", reference: "" });
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const account = closure.pay_accounts.find((a) => String(a.id) === form.account) ?? null;
    const needsAccount = balance > 0.005 && form.date > closure.cash_start_date;
    const ves = Number(form.ves.replace(",", "."));
    const vesOk = account?.currency !== "VES" || (Number.isFinite(ves) && ves > 0);
    const ok = form.date !== "" && (!needsAccount || account !== null) && vesOk;

    const save = async () => {
        setSaving(true);
        try {
            const r = await upload(`/delivery/closures/${closure.id}/pay`, {
                date: form.date, financial_account_id: account ? String(account.id) : null,
                amount_ves: account?.currency === "VES" ? String(ves) : null, method: form.method.trim(), reference: form.reference.trim(), receipt,
            });
            toast.success(r.message);
            onPaid();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Registrar el pago</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {closure.agency}, semana {closure.week}. Monto final aprobado: <b>{money(closure.final_approved_total)}</b>.
                </Typography>
                <Stack spacing={2}>
                    {closure.debt && closure.debt.compensated > 0 && (
                        <Alert severity="info">
                            Ya se descontaron {money(closure.debt.compensated)} del efectivo que entregó la agencia. Queda por pagar <b>{money(balance)}</b>.
                        </Alert>
                    )}
                    {balance <= 0.005 ? (
                        <Alert severity="success">No queda nada por pagar: se marca pagado.</Alert>
                    ) : (
                        <>
                            <TextField select label="Cuenta de donde sale" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}
                                required={needsAccount} helperText={`Sale de la caja: ${money(balance)}${account?.currency === "VES" ? " pagados en bolívares" : ""}.`}>
                                {closure.pay_accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                            </TextField>
                            {account?.currency === "VES" && (
                                <TextField label="Bolívares pagados" value={form.ves} onChange={(e) => setForm({ ...form, ves: e.target.value })} required
                                    inputProps={{ inputMode: "decimal" }} placeholder={closure.binance_rate ? bs(balance * closure.binance_rate) : ""}
                                    helperText={vesOk && ves > 0 ? `Tasa: ${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 4 }).format(ves / balance)} Bs por dólar` : "Lo que salió del banco."} />
                            )}
                        </>
                    )}
                    <TextField type="date" label="Fecha de pago" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }} />
                    <TextField label="Método" placeholder="Pago móvil, Zelle, efectivo…" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
                    <TextField label="Referencia" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                    <Button component="label" variant="outlined" startIcon={<AttachFileRounded />} sx={{ justifyContent: "flex-start" }}>
                        {receipt ? receipt.name : "Adjuntar comprobante (opcional)"}
                        <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Marcar pagado</Button>
            </DialogActions>
        </Dialog>
    );
};
