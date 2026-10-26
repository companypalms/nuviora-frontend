// src/components/finance/CashDebtsPanels.tsx
// Lo que se debe y lo que se cobra (Módulo 4 de Fran, §44 y §45), dentro de Finanzas › Caja:
// - Por pagar (§44): proveedores, agencias, empleados, herramientas y otras obligaciones, con lo pagado, lo pendiente y lo
//   vencido. Un cierre de agencia se paga en Cierres de agencias (lo deja "Pagado"); lo demás, aquí.
// - Por cobrar (§45): las otras cuentas por cobrar (el efectivo de las agencias se ve en su panel), con sus cobros, que
//   entran a una cuenta de la caja. Nada se borra: se anula con el motivo (§83).
import React, { useCallback, useEffect, useState } from "react";
import {
    Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { PayDialog } from "./PayDialog";
import { Currency, FinanceOptions, PAYABLE_STATUS, Payable, accountsFor, api, day, errorMessage, inCurrency, money, todayCaracas } from "./finance";

type PayableRow = Payable & { closure_id: number | null };

export const PayablesPanel: React.FC<{ options: FinanceOptions; onChanged: () => void }> = ({ options, onChanged }) => {
    const [rows, setRows] = useState<PayableRow[] | null>(null);
    const [types, setTypes] = useState<Record<string, string>>({});
    const [paying, setPaying] = useState<Payable | null>(null);
    const load = useCallback(() => {
        api<{ payables: PayableRow[]; payee_types: Record<string, string> }>("/finance/cash/payables")
            .then((r) => { setRows(r.payables); setTypes(r.payee_types); }).catch((e) => toast.error(errorMessage(e)));
    }, []);
    useEffect(() => { load(); }, [load]);

    const total = rows?.reduce((s, p) => s + p.balance_usd, 0) ?? 0;
    const overdue = rows?.filter((p) => p.status === "overdue").reduce((s, p) => s + p.balance_usd, 0) ?? 0;

    return (
        <Panel>
            <PanelHeader title="Por pagar" subtitle={rows ? `Se debe ${money(total)}${overdue > 0 ? `, de los cuales ${money(overdue)} están vencidos` : ""}.` : undefined} />
            {!rows ? <Typography color="text.secondary">Cargando…</Typography> : rows.length === 0 ? <Typography color="text.secondary">No se debe nada.</Typography> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>A quién</TableCell><TableCell>Qué</TableCell><TableCell>Vence</TableCell><TableCell align="right">Debe</TableCell>
                                <TableCell align="right">Pendiente</TableCell><TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        <Typography variant="body2">{p.payee}</Typography>
                                        <Typography variant="caption" color="text.secondary">{types[p.payee_type] ?? p.payee_type}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 180 }}>{p.description}</TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        {p.due_date ? day(p.due_date) : "—"}
                                        {p.status === "overdue" && <Chip size="small" color={PAYABLE_STATUS.overdue.color} label="Vencida" sx={{ ml: 1 }} />}
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{inCurrency(p.amount, p.currency)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                        <b>{inCurrency(p.balance, p.currency)}</b>
                                        {p.paid_amount > 0 && <Typography variant="caption" color="text.secondary" display="block">pagado {inCurrency(p.paid_amount, p.currency)}</Typography>}
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                        {p.closure_id
                                            ? <Link href={`/admin/cierres-agencias/${p.closure_id}`} underline="hover" variant="body2">Pagar en Cierres</Link>
                                            : <Button size="small" onClick={() => setPaying(p)}>Registrar pago</Button>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <PayDialog payable={paying} options={options} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); onChanged(); }} />
        </Panel>
    );
};

type Collection = {
    id: number; amount: number; currency: Currency; rate: number; amount_usd: number; applied_amount: number; collected_at: string; account: string | null;
    notes: string | null; voided_at: string | null; void_reason: string | null;
};
type Receivable = {
    id: number; debtor_name: string; description: string; currency: Currency; amount: number; rate: number; amount_usd: number; collected_amount: number;
    balance: number; balance_usd: number; issued_at: string; due_date: string | null; status: "open" | "overdue" | "collected"; notes: string | null;
    collections: Collection[];
};

export const ReceivablesPanel: React.FC<{ options: FinanceOptions; onChanged: () => void }> = ({ options, onChanged }) => {
    const [rows, setRows] = useState<Receivable[] | null>(null);
    const [creating, setCreating] = useState(false);
    const [collecting, setCollecting] = useState<Receivable | null>(null);
    const load = useCallback(() => {
        api<{ receivables: Receivable[] }>("/finance/receivables").then((r) => setRows(r.receivables)).catch((e) => toast.error(errorMessage(e)));
    }, []);
    useEffect(() => { load(); }, [load]);
    const done = () => { load(); onChanged(); };

    const voidOne = async (url: string) => {
        const reason = window.prompt("¿Por qué se anula?");
        if (!reason?.trim()) return;
        try { toast.success((await api<{ message: string }>(url, "POST", { reason: reason.trim() })).message); done(); } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Panel>
            <PanelHeader title="Por cobrar" subtitle="Préstamos, reintegros y otras cuentas por cobrar. El efectivo de las agencias está en Finanzas › Agencias."
                action={<Button size="small" variant="outlined" onClick={() => setCreating(true)}>Nueva cuenta por cobrar</Button>} />
            {!rows ? <Typography color="text.secondary">Cargando…</Typography> : rows.length === 0 ? <Typography color="text.secondary">No hay nada por cobrar.</Typography> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell>Quién debe</TableCell><TableCell>Qué</TableCell><TableCell>Vence</TableCell><TableCell align="right">Falta</TableCell><TableCell /></TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.debtor_name}</TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        {r.description}
                                        {r.collections.map((c) => (
                                            <Typography key={c.id} variant="caption" display="block" color={c.voided_at ? "text.disabled" : "text.secondary"}>
                                                Cobro del {day(c.collected_at)}: {inCurrency(c.amount, c.currency)}{c.account ? ` en ${c.account}` : ""}
                                                {c.voided_at ? ` (anulado: ${c.void_reason})` : <> · <Link component="button" variant="caption" onClick={() => voidOne(`/finance/receivable-collections/${c.id}/void`)}>anular</Link></>}
                                            </Typography>
                                        ))}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        {r.due_date ? day(r.due_date) : "—"}{r.status === "overdue" && <Chip size="small" color="error" label="Vencida" sx={{ ml: 1 }} />}
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                        <b>{inCurrency(r.balance, r.currency)}</b>
                                        <Typography variant="caption" color="text.secondary" display="block">de {inCurrency(r.amount, r.currency)}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                        <Button size="small" onClick={() => setCollecting(r)}>Registrar cobro</Button>
                                        {r.collections.every((c) => c.voided_at) && <Button size="small" color="error" onClick={() => voidOne(`/finance/receivables/${r.id}/void`)}>Anular</Button>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {creating && <NewReceivableDialog options={options} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); done(); }} />}
            {collecting && <CollectDialog receivable={collecting} options={options} onClose={() => setCollecting(null)} onSaved={() => { setCollecting(null); done(); }} />}
        </Panel>
    );
};

const NewReceivableDialog: React.FC<{ options: FinanceOptions; onClose: () => void; onSaved: () => void }> = ({ options, onClose, onSaved }) => {
    const [debtor, setDebtor] = useState("");
    const [description, setDescription] = useState("");
    const [value, setValue] = useState<MoneyValue>({ amount: "", currency: "USD", rate: "" });
    const [due, setDue] = useState("");
    const [saving, setSaving] = useState(false);
    const ok = debtor.trim() !== "" && description.trim() !== "" && value.amount.trim() !== "" && (value.currency !== "VES" || value.rate.trim() !== "");
    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>("/finance/receivables", "POST", {
                debtor_name: debtor.trim(), description: description.trim(), amount: value.amount.replace(",", "."), currency: value.currency,
                ...(value.currency === "VES" ? { rate: value.rate.replace(",", ".") } : {}), ...(due ? { due_date: due } : {}),
            })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Nueva cuenta por cobrar</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField label="Quién debe" value={debtor} onChange={(e) => setDebtor(e.target.value)} required inputProps={{ maxLength: 150 }} />
                    <TextField label="Qué" value={description} onChange={(e) => setDescription(e.target.value)} required inputProps={{ maxLength: 255 }}
                        placeholder="Préstamo, reintegro de un proveedor…" />
                    <MoneyFields value={value} onChange={setValue} currencies={options.currencies} label="Monto" />
                    <TextField type="date" label="Vence (opcional)" value={due} onChange={(e) => setDue(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ maxWidth: 220 }} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};

const CollectDialog: React.FC<{ receivable: Receivable; options: FinanceOptions; onClose: () => void; onSaved: () => void }> = ({ receivable, options, onClose, onSaved }) => {
    const [value, setValue] = useState<MoneyValue>({ amount: String(receivable.balance), currency: receivable.currency, rate: "" });
    const [date, setDate] = useState(todayCaracas());
    const [account, setAccount] = useState("");
    const [saving, setSaving] = useState(false);
    const accounts = accountsFor(options.financial_accounts, value.currency);
    const needsAccount = date > options.cash_start_date;
    const ok = value.amount.trim() !== "" && (value.currency !== "VES" || value.rate.trim() !== "") && (!needsAccount || accounts.some((a) => String(a.id) === account));
    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/receivables/${receivable.id}/collections`, "POST", {
                amount: value.amount.replace(",", "."), currency: value.currency, ...(value.currency === "VES" ? { rate: value.rate.replace(",", ".") } : {}),
                collected_at: date, ...(account ? { financial_account_id: Number(account) } : {}),
            })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Registrar cobro: {receivable.debtor_name}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">{receivable.description}. Falta cobrar <b>{inCurrency(receivable.balance, receivable.currency)}</b>.</Typography>
                    <MoneyFields value={value} onChange={setValue} currencies={receivable.currency === "VES" ? ["VES"] : options.currencies} label="Monto cobrado" />
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }}
                            inputProps={{ max: todayCaracas() }} sx={{ minWidth: 180 }} />
                        <TextField select label="Entra a" value={accounts.some((a) => String(a.id) === account) ? account : ""} onChange={(e) => setAccount(e.target.value)}
                            required={needsAccount} fullWidth>
                            {accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                        </TextField>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ok}>Registrar cobro</Button>
            </DialogActions>
        </Dialog>
    );
};
