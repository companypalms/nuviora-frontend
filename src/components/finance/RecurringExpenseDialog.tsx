// src/components/finance/RecurringExpenseDialog.tsx
// Crear un gasto recurrente o cambiar sus datos (Módulo 4 de Fran, §25, §26): nombre, categoría, frecuencia (semanal,
// mensual, anual o personalizada), día de pago y, opcionales, producto y ciudad. Al crearlo se pone el monto y desde
// cuándo; después el monto solo cambia con una versión nueva (RecurringAmountDialog, §27). Cambiar datos pide motivo (§82).
import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { CategoryField } from "./CategoryField";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { FinanceOptions, Frequency, RecurringExpense, api, errorMessage, todayCaracas } from "./finance";

type Props = { open: boolean; recurring: RecurringExpense | null; options: FinanceOptions; onClose: () => void; onSaved: () => void;
    onCategory: (c: { id: number; name: string; is_active: boolean }) => void };

export const RecurringExpenseDialog: React.FC<Props> = (props) => (props.open ? <RecurringForm key={props.recurring?.id ?? "new"} {...props} /> : null);

const RecurringForm: React.FC<Props> = ({ recurring, options, onClose, onSaved, onCategory }) => {
    const [form, setForm] = useState({
        name: recurring?.name ?? "", category: recurring ? String(recurring.expense_category_id) : "", frequency: (recurring?.frequency ?? "monthly") as Frequency,
        interval_days: recurring?.interval_days ? String(recurring.interval_days) : "", payment_day: recurring?.payment_day ? String(recurring.payment_day) : "",
        payment_date: recurring?.payment_date ?? "", product: recurring?.product_id ? String(recurring.product_id) : "", city: recurring?.city_id ? String(recurring.city_id) : "",
    });
    const [money, setMoney] = useState<MoneyValue>({ amount: "", currency: "USD", rate: "" });
    const [validFrom, setValidFrom] = useState(todayCaracas());
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const f = form.frequency;

    const save = async () => {
        const body: Record<string, unknown> = {
            name: form.name, expense_category_id: Number(form.category), frequency: f,
            interval_days: f === "custom" ? Number(form.interval_days) : null,
            payment_day: f === "weekly" || f === "monthly" ? Number(form.payment_day) : null,
            payment_date: f === "annual" || f === "custom" ? form.payment_date : null,
            product_id: form.product ? Number(form.product) : null, city_id: form.city ? Number(form.city) : null,
        };
        if (recurring) body.reason = reason;
        else Object.assign(body, { amount: money.amount.replace(",", "."), currency: money.currency, rate: money.currency === "VES" ? money.rate.replace(",", ".") : null, valid_from: validFrom });
        setSaving(true);
        try {
            const res = await api<{ message: string }>(recurring ? `/finance/recurring-expenses/${recurring.id}` : "/finance/recurring-expenses", recurring ? "PUT" : "POST", body);
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const scheduleReady = f === "weekly" || f === "monthly" ? form.payment_day !== "" : f === "annual" ? form.payment_date !== "" : form.payment_date !== "" && Number(form.interval_days) > 0;
    const ready = form.name.trim() !== "" && form.category !== "" && scheduleReady
        && (recurring ? reason.trim() !== "" : money.amount.trim() !== "" && (money.currency !== "VES" || money.rate.trim() !== "") && validFrom !== "");

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{recurring ? `Datos de ${recurring.name}` : "Nuevo gasto recurrente"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus
                        placeholder="Editor, Shopify, ChatGPT, hosting…" inputProps={{ maxLength: 150 }} />
                    <CategoryField value={form.category} onChange={(category) => setForm({ ...form, category })} options={options} onCreated={onCategory} />
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField select label="Frecuencia" value={f} onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency, payment_day: "" })} sx={{ minWidth: 200 }}>
                            {Object.entries(options.frequencies).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </TextField>
                        {f === "weekly" && (
                            <TextField select label="Se paga cada" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} fullWidth>
                                {Object.entries(options.weekdays).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                            </TextField>
                        )}
                        {f === "monthly" && (
                            <TextField select label="Día del mes" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} fullWidth
                                helperText="En los meses más cortos, el último día.">
                                {Array.from({ length: 31 }, (_, i) => <MenuItem key={i + 1} value={String(i + 1)}>{i + 1}</MenuItem>)}
                            </TextField>
                        )}
                        {f === "custom" && (
                            <TextField label="Cada cuántos días" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value.replace(/\D/g, "") })}
                                inputProps={{ inputMode: "numeric" }} fullWidth />
                        )}
                        {(f === "annual" || f === "custom") && (
                            <TextField type="date" label={f === "annual" ? "Fecha de pago" : "Un día de pago"} value={form.payment_date}
                                onChange={(e) => setForm({ ...form, payment_date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                        )}
                    </Stack>
                    {!recurring && (
                        <>
                            <MoneyFields value={money} onChange={setMoney} currencies={options.currencies} />
                            <TextField type="date" label="Se paga desde" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} InputLabelProps={{ shrink: true }}
                                helperText="Desde ese día cuenta en la rentabilidad, repartido en los días que cubre cada pago." sx={{ maxWidth: 320 }} />
                        </>
                    )}
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField select label="Producto (opcional)" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} fullWidth>
                            <MenuItem value="">Ninguno</MenuItem>
                            {options.products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.title}</MenuItem>)}
                        </TextField>
                        <TextField select label="Ciudad (opcional)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} fullWidth>
                            <MenuItem value="">Ninguna</MenuItem>
                            {options.cities.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                        </TextField>
                    </Stack>
                    {recurring && (
                        <>
                            <Alert severity="info">El monto no se cambia aquí: usa "Cambiar monto", para que los meses anteriores conserven el suyo.</Alert>
                            <TextField label="Motivo del cambio" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }} />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ready}>{recurring ? "Guardar" : "Crear"}</Button>
            </DialogActions>
        </Dialog>
    );
};
