// src/components/finance/ExpenseDialog.tsx
// "+ Registrar gasto" y "Corregir" (Módulo 4 de Fran, §24): concepto, categoría, monto, moneda, fecha, descripción,
// comprobante opcional y, opcionales, producto, ciudad, almacén, agencia o proveedor. Corregir pide el motivo (§82).
// Entrega 3 (§28, §44): cómo se pagó. Desde una cuenta de la caja (sale ese día), o queda por pagar (una deuda con un
// empleado, una herramienta u otra obligación). Antes del arranque de la caja puede quedar sin indicar.
import React, { useState } from "react";
import {
    Alert, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { CategoryField } from "./CategoryField";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { Expense, FinanceOptions, accountsFor, api, errorMessage, todayCaracas } from "./finance";

type PayMode = "paid" | "payable" | "none";

type Props = { open: boolean; expense: Expense | null; options: FinanceOptions; onClose: () => void; onSaved: () => void;
    onCategory: (c: { id: number; name: string; is_active: boolean }) => void };

const LINKS = [
    { key: "product_id", label: "Producto" }, { key: "city_id", label: "Ciudad" }, { key: "warehouse_id", label: "Almacén" },
    { key: "agency_id", label: "Agencia" }, { key: "supplier_id", label: "Proveedor" },
] as const;
type LinkKey = typeof LINKS[number]["key"];

const initial = (e: Expense | null) => ({
    concept: e?.concept ?? "", category: e ? String(e.expense_category_id) : "", date: e?.expense_date ?? todayCaracas(), description: e?.description ?? "",
    links: Object.fromEntries(LINKS.map((l) => [l.key, e?.[l.key] ? String(e[l.key]) : ""])) as Record<LinkKey, string>,
});

export const ExpenseDialog: React.FC<Props> = (props) => (props.open ? <ExpenseForm key={props.expense?.id ?? "new"} {...props} /> : null);

const ExpenseForm: React.FC<Props> = ({ expense, options, onClose, onSaved, onCategory }) => {
    const [form, setForm] = useState(initial(expense));
    const [money, setMoney] = useState<MoneyValue>({ amount: expense ? String(expense.amount) : "", currency: expense?.currency ?? "USD",
        rate: expense && expense.currency === "VES" ? String(expense.rate) : "" });
    const [receipt, setReceipt] = useState<File | null>(null);
    const [reason, setReason] = useState("");
    const [showLinks, setShowLinks] = useState(Boolean(expense && LINKS.some((l) => expense[l.key])));
    const [saving, setSaving] = useState(false);
    const [pay, setPay] = useState({
        mode: (expense?.payable ? "payable" : expense?.financial_account_id ? "paid" : expense ? "none" : "paid") as PayMode,
        account: expense?.financial_account_id ? String(expense.financial_account_id) : "",
        payeeType: expense?.payable?.payee_type ?? "employee", payeeName: expense?.payable?.payee ?? "", due: expense?.payable?.due_date ?? "",
    });
    const beforeCash = form.date <= options.cash_start_date;
    const payAccounts = accountsFor(options.financial_accounts, money.currency);
    const payOk = pay.mode === "paid" ? payAccounts.some((a) => String(a.id) === pay.account)
        : pay.mode === "payable" ? pay.payeeName.trim() !== "" : beforeCash;

    const choices = (key: LinkKey): { id: number; label: string }[] => ({
        product_id: options.products.map((p) => ({ id: p.id, label: p.title })),
        city_id: options.cities.map((c) => ({ id: c.id, label: c.name })),
        warehouse_id: options.warehouses.map((w) => ({ id: w.id, label: w.name })),
        agency_id: options.agencies.map((a) => ({ id: a.id, label: a.names })),
        supplier_id: options.suppliers.map((s) => ({ id: s.id, label: s.name })),
    })[key];

    const save = async () => {
        const body = new FormData();
        body.append("concept", form.concept);
        body.append("expense_category_id", form.category);
        body.append("amount", money.amount.replace(",", "."));
        body.append("currency", money.currency);
        if (money.currency === "VES") body.append("rate", money.rate.replace(",", "."));
        body.append("expense_date", form.date);
        body.append("description", form.description);
        LINKS.forEach((l) => body.append(l.key, form.links[l.key]));
        if (receipt) body.append("receipt", receipt);
        body.append("payment", pay.mode);
        if (pay.mode === "paid") body.append("financial_account_id", pay.account);
        if (pay.mode === "payable") {
            body.append("payee_type", pay.payeeType);
            body.append("payee_name", pay.payeeName.trim());
            if (pay.due) body.append("due_date", pay.due);
        }
        if (expense) body.append("reason", reason);
        setSaving(true);
        try {
            const res = await api<{ message: string }>(expense ? `/finance/expenses/${expense.id}` : "/finance/expenses", "POST", body);
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const ready = form.concept.trim() !== "" && form.category !== "" && money.amount.trim() !== "" && (money.currency !== "VES" || money.rate.trim() !== "")
        && (!expense || reason.trim() !== "") && payOk;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{expense ? "Corregir gasto" : "Registrar gasto"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField label="Concepto" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} required autoFocus
                        placeholder="Mentoría, curso, reparación, transporte…" inputProps={{ maxLength: 150 }} />
                    <CategoryField value={form.category} onChange={(category) => setForm({ ...form, category })} options={options} onCreated={onCategory} />
                    <MoneyFields value={money} onChange={setMoney} currencies={options.currencies} />
                    <TextField type="date" label="Fecha" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayCaracas() }} sx={{ maxWidth: 220 }} />
                    <Stack spacing={1}>
                        <Typography variant="subtitle2">¿Cómo se pagó?</Typography>
                        <ToggleButtonGroup size="small" exclusive value={pay.mode} onChange={(_, v) => v && setPay({ ...pay, mode: v })}>
                            <ToggleButton value="paid">Ya se pagó</ToggleButton>
                            <ToggleButton value="payable">Queda por pagar</ToggleButton>
                            <ToggleButton value="none" disabled={!beforeCash}>Sin indicar</ToggleButton>
                        </ToggleButtonGroup>
                        {pay.mode === "paid" && (
                            <TextField select size="small" label="Cuenta de donde salió" value={payAccounts.some((a) => String(a.id) === pay.account) ? pay.account : ""}
                                onChange={(e) => setPay({ ...pay, account: e.target.value })} required helperText="Sale de la caja el día del gasto.">
                                {payAccounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                            </TextField>
                        )}
                        {pay.mode === "payable" && (
                            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                                <TextField select size="small" label="A quién" value={pay.payeeType} onChange={(e) => setPay({ ...pay, payeeType: e.target.value })} sx={{ minWidth: 190 }}>
                                    {Object.entries(options.payee_types).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                                </TextField>
                                <TextField size="small" label="Nombre" value={pay.payeeName} onChange={(e) => setPay({ ...pay, payeeName: e.target.value })} required fullWidth
                                    inputProps={{ maxLength: 150 }} placeholder="Programador, Shopify…" />
                                <TextField size="small" type="date" label="Vence" value={pay.due} onChange={(e) => setPay({ ...pay, due: e.target.value })}
                                    InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
                            </Stack>
                        )}
                        {pay.mode === "payable" && <Typography variant="caption" color="text.secondary">Queda en Finanzas › Caja › Por pagar. Sale de la caja cuando se registre el pago.</Typography>}
                        {!beforeCash && pay.mode === "none" && <Typography variant="caption" color="error">Desde el arranque de la caja hay que decir cómo se pagó.</Typography>}
                    </Stack>
                    <TextField label="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline minRows={2} />
                    <div>
                        <Button component="label" variant="outlined" size="small">
                            {receipt ? "Cambiar comprobante" : expense?.has_receipt ? "Reemplazar comprobante" : "Adjuntar comprobante (opcional)"}
                            <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                        </Button>
                        {receipt && <Typography variant="caption" sx={{ ml: 1 }}>{receipt.name}</Typography>}
                    </div>
                    <div>
                        <Button size="small" onClick={() => setShowLinks(!showLinks)}>{showLinks ? "Ocultar asociaciones" : "Asociar a un producto, ciudad, almacén, agencia o proveedor"}</Button>
                        <Collapse in={showLinks}>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                {LINKS.map((l) => (
                                    <TextField key={l.key} select size="small" label={l.label} value={form.links[l.key]}
                                        onChange={(e) => setForm({ ...form, links: { ...form.links, [l.key]: e.target.value } })}>
                                        <MenuItem value="">Ninguno</MenuItem>
                                        {choices(l.key).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.label}</MenuItem>)}
                                    </TextField>
                                ))}
                                <Typography variant="caption" color="text.secondary">
                                    Con producto o ciudad, el gasto se le carga a ese producto o esa ciudad. Sin ellos es un gasto general: se descuenta después del margen de contribución.
                                </Typography>
                            </Stack>
                        </Collapse>
                    </div>
                    {expense && (
                        <>
                            <Alert severity="info">El cambio queda en el historial del gasto, con el valor anterior y el nuevo.</Alert>
                            <TextField label="Motivo del cambio" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }} />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ready}>{expense ? "Guardar corrección" : "Registrar"}</Button>
            </DialogActions>
        </Dialog>
    );
};
