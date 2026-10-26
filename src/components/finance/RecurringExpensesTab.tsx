// src/components/finance/RecurringExpensesTab.tsx
// Finanzas › Gastos recurrentes (Módulo 4 de Fran, §25 a §28): editor, Shopify, ChatGPT, herramientas… Cada uno con su
// frecuencia y día de pago, su monto vigente y su historial de montos (§27). Para la rentabilidad se reparte en los días
// que cubre (§28); el "al mes" sirve para comparar gastos de distinta frecuencia. Entrega 3: cada vencimiento se paga aparte
// ("Registrar pago") y sale de la caja ese día; los que pasaron sin pagar se ven vencidos.
import React, { useCallback, useEffect, useState } from "react";
import {
    Button, Chip, IconButton, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AuditHistoryDialog } from "./AuditHistoryDialog";
import { AmountMode, RecurringAmountDialog } from "./RecurringAmountDialog";
import { RecurringExpenseDialog } from "./RecurringExpenseDialog";
import { RecurringPayDialog } from "./RecurringPayDialog";
import { FinanceOptions, RecurringExpense, api, day, errorMessage, money, original } from "./finance";

type Response = { recurring: RecurringExpense[]; monthly_total: number };

const Status: React.FC<{ r: RecurringExpense }> = ({ r }) => {
    if (r.scheduled) {
        return <Chip size="small" color="info" variant="outlined"
            label={r.scheduled.is_active ? `Desde ${day(r.scheduled.valid_from)}: ${original(r.scheduled.amount, r.scheduled.currency, r.scheduled.rate)}` : `Se desactiva el ${day(r.scheduled.valid_from)}`} />;
    }
    return r.active_today ? <Chip size="small" color="success" variant="outlined" label="Activo" /> : <Chip size="small" label="Inactivo" />;
};

export const RecurringExpensesTab: React.FC<{ options: FinanceOptions; onCategory: (c: { id: number; name: string; is_active: boolean }) => void }> = ({ options, onCategory }) => {
    const [data, setData] = useState<Response | null>(null);
    const [editing, setEditing] = useState<RecurringExpense | null | "new">(null);
    const [amount, setAmount] = useState<{ recurring: RecurringExpense; mode: AmountMode } | null>(null);
    const [history, setHistory] = useState<RecurringExpense | null>(null);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; r: RecurringExpense } | null>(null);
    const [paying, setPaying] = useState<RecurringExpense | null>(null);

    const load = useCallback(() => { api<Response>("/finance/recurring-expenses").then(setData).catch((e) => toast.error(errorMessage(e))); }, []);
    useEffect(() => { load(); }, [load]);
    const act = (fn: (r: RecurringExpense) => void) => () => { if (menu) fn(menu.r); setMenu(null); };
    const lastActive = (r: RecurringExpense) => r.versions[0]?.is_active ?? false;

    return (
        <Stack spacing={2}>
            <Panel>
                <PanelHeader title="Gastos recurrentes"
                    subtitle={data ? `Los activos suman unos ${money(data.monthly_total)} al mes. En la rentabilidad, cada pago se reparte en los días que cubre.` : undefined}
                    action={<Button variant="contained" onClick={() => setEditing("new")}>+ Gasto recurrente</Button>} />
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.recurring.length === 0 ? (
                    <Typography color="text.secondary">Todavía no hay gastos recurrentes. Agrega el editor, Shopify, ChatGPT…</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nombre</TableCell><TableCell>Cuándo se paga</TableCell><TableCell align="right">Monto</TableCell>
                                    <TableCell align="right">Al mes</TableCell><TableCell>Próximo pago</TableCell><TableCell>Pagos</TableCell><TableCell>Estado</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.recurring.map((r) => (
                                    <TableRow key={r.id} sx={{ opacity: r.active_today || r.scheduled ? 1 : 0.6 }}>
                                        <TableCell sx={{ minWidth: 150 }}>
                                            <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.category}{r.product || r.city ? ` · ${[r.product, r.city].filter(Boolean).join(" · ")}` : " · general"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{r.schedule}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                            {r.current ? original(r.current.amount, r.current.currency, r.current.rate) : "—"}
                                            {r.current && r.current.currency !== "USD" && <Typography variant="caption" color="text.secondary" display="block">{money(r.current.amount_usd)}</Typography>}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{money(r.monthly_usd)}</TableCell>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(r.next_payment)}</TableCell>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                                            {r.due.filter((d) => d.overdue).length > 0
                                                ? <Chip size="small" color="error" variant="outlined" label={`${r.due.filter((d) => d.overdue).length} vencido(s)`} onClick={() => setPaying(r)} />
                                                : r.payments.find((p) => !p.voided_at)
                                                    ? <Typography variant="caption" color="text.secondary">último el {day(r.payments.find((p) => !p.voided_at)!.paid_at)}</Typography>
                                                    : <Typography variant="caption" color="text.secondary">—</Typography>}
                                        </TableCell>
                                        <TableCell><Status r={r} /></TableCell>
                                        <TableCell padding="checkbox">
                                            <Tooltip title="Acciones">
                                                <IconButton size="small" aria-label={`Acciones de ${r.name}`} onClick={(ev) => setMenu({ anchor: ev.currentTarget, r })}>
                                                    <MoreVertRounded fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>

            <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
                <MenuItem onClick={act(setPaying)}>Registrar pago</MenuItem>
                {menu && lastActive(menu.r) && <MenuItem onClick={act((r) => setAmount({ recurring: r, mode: "amount" }))}>Cambiar monto</MenuItem>}
                <MenuItem onClick={act(setEditing)}>Cambiar datos</MenuItem>
                {menu && (lastActive(menu.r)
                    ? <MenuItem onClick={act((r) => setAmount({ recurring: r, mode: "deactivate" }))} sx={{ color: "error.main" }}>Desactivar</MenuItem>
                    : <MenuItem onClick={act((r) => setAmount({ recurring: r, mode: "activate" }))}>Reactivar</MenuItem>)}
                <MenuItem onClick={act(setHistory)}>Historial</MenuItem>
            </Menu>

            <RecurringExpenseDialog open={editing !== null} recurring={editing === "new" ? null : editing} options={options} onCategory={onCategory}
                onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
            <RecurringAmountDialog target={amount} currencies={options.currencies} onClose={() => setAmount(null)} onSaved={() => { setAmount(null); load(); }} />
            <AuditHistoryDialog subject={history ? { type: "recurring_expense", id: history.id, title: history.name } : null} onClose={() => setHistory(null)} />
            <RecurringPayDialog recurring={paying} options={options} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load(); }} />
        </Stack>
    );
};
