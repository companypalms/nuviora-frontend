// src/components/finance/ExpensesTab.tsx
// Finanzas › Gastos (Módulo 4 de Fran, §24 a §30): los gastos manuales de un período y cuánto suman, con los recurrentes
// repartidos en esos días (§28). Separa los generales, que van después del margen de contribución (§29), de los
// asignados a un producto o una ciudad (§30). Un gasto se corrige con motivo o se anula; nunca se borra (§83).
import React, { useCallback, useEffect, useState } from "react";
import {
    Box, Button, Chip, FormControlLabel, IconButton, Menu, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AuditHistoryDialog } from "./AuditHistoryDialog";
import { ExpenseDialog } from "./ExpenseDialog";
import { VoidExpenseDialog } from "./VoidExpenseDialog";
import { Expense, ExpensesResponse, FinanceOptions, api, day, download, errorMessage, money, monthRange, original } from "./finance";

const Stat: React.FC<{ label: string; value: number; hint: string }> = ({ label, value, hint }) => (
    <Box sx={{ minWidth: 140, flex: "1 1 140px" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6">{money(value)}</Typography>
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </Box>
);

export const ExpensesTab: React.FC<{ options: FinanceOptions; onCategory: (c: { id: number; name: string; is_active: boolean }) => void }> = ({ options, onCategory }) => {
    const [[from, to], setRange] = useState<[string, string]>(monthRange());
    const [category, setCategory] = useState("");
    const [voided, setVoided] = useState(false);
    const [data, setData] = useState<ExpensesResponse | null>(null);
    const [editing, setEditing] = useState<Expense | null | "new">(null);
    const [voiding, setVoiding] = useState<Expense | null>(null);
    const [history, setHistory] = useState<Expense | null>(null);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; expense: Expense } | null>(null);

    const load = useCallback(() => {
        const qs = new URLSearchParams({ from, to, ...(category ? { category_id: category } : {}), ...(voided ? { voided: "1" } : {}) });
        api<ExpensesResponse>(`/finance/expenses?${qs}`).then(setData).catch((e) => toast.error(errorMessage(e)));
    }, [from, to, category, voided]);
    useEffect(() => { load(); }, [load]);

    const s = data?.summary;
    const act = (fn: (e: Expense) => void) => () => { if (menu) fn(menu.expense); setMenu(null); };

    return (
        <Stack spacing={2}>
            <Panel>
                <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }} flexWrap="wrap">
                    <Stack direction="row" gap={1}>
                        <Chip label="Este mes" onClick={() => setRange(monthRange())} variant={from === monthRange()[0] ? "filled" : "outlined"} />
                        <Chip label="Mes pasado" onClick={() => setRange(monthRange(-1))} variant={from === monthRange(-1)[0] ? "filled" : "outlined"} />
                    </Stack>
                    <TextField type="date" size="small" label="Desde" value={from} onChange={(e) => setRange([e.target.value, to])} InputLabelProps={{ shrink: true }} />
                    <TextField type="date" size="small" label="Hasta" value={to} onChange={(e) => setRange([from, e.target.value])} InputLabelProps={{ shrink: true }} />
                    <TextField select size="small" label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 200 }}
                        SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                        <MenuItem value="">Todas</MenuItem>
                        {options.categories.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                    </TextField>
                    <FormControlLabel control={<Switch checked={voided} onChange={(e) => setVoided(e.target.checked)} />} label="Ver anulados" />
                </Stack>
            </Panel>

            {s && (
                <Panel>
                    <PanelHeader title={`Gastos del ${day(data.from)} al ${day(data.to)}`} subtitle="Lo que cuenta en la rentabilidad del período. Los anulados no suman." />
                    <Stack direction="row" gap={2} flexWrap="wrap">
                        <Stat label="Total" value={s.total} hint="manuales + recurrentes" />
                        <Stat label="Manuales" value={s.manual} hint="el día de su fecha" />
                        <Stat label="Recurrentes" value={s.recurring} hint="repartidos en estos días" />
                        <Stat label="Generales" value={s.general} hint="después del margen de contribución" />
                        <Stat label="De un producto o ciudad" value={s.assigned} hint="se le cargan a ellos" />
                        <Stat label="Transporte de inventario" value={s.trips} hint="viajes: va al costo de lo vendido, no suma aquí" />
                    </Stack>
                    {s.by_category.length > 0 && (
                        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                            {s.by_category.map((c) => <Chip key={c.category} size="small" variant="outlined" label={`${c.category}: ${money(c.amount_usd)}`} />)}
                        </Stack>
                    )}
                </Panel>
            )}

            <Panel>
                <PanelHeader title="Gastos manuales" subtitle="Mentoría, curso, reparación, transporte, compras extraordinarias…"
                    action={<Button variant="contained" onClick={() => setEditing("new")}>+ Registrar gasto</Button>} />
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.expenses.length === 0 ? (
                    <Typography color="text.secondary">No hay gastos manuales en estas fechas.</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Fecha</TableCell><TableCell>Concepto</TableCell><TableCell>Categoría</TableCell><TableCell>Asociado a</TableCell>
                                    <TableCell align="right">Monto</TableCell><TableCell align="right">En USD</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.expenses.map((e) => (
                                    <TableRow key={e.id} sx={{ opacity: e.voided_at ? 0.55 : 1 }}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(e.expense_date)}</TableCell>
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <Typography variant="body2" sx={{ textDecoration: e.voided_at ? "line-through" : "none" }}>{e.concept}</Typography>
                                            {e.voided_at && <Typography variant="caption" color="error">Anulado: {e.void_reason}</Typography>}
                                            {e.inventory_trip_id && (
                                                <Tooltip title="Su costo se reparte entre las unidades del viaje y cuenta cuando se venden: no suma en los gastos del período. Se corrige o se anula en Inventario › Operaciones.">
                                                    <Chip size="small" label="Viaje de traslado" sx={{ ml: 0.5 }} />
                                                </Tooltip>
                                            )}
                                            {!e.voided_at && e.description && <Typography variant="caption" color="text.secondary" display="block">{e.description}</Typography>}
                                        </TableCell>
                                        <TableCell>{e.category}</TableCell>
                                        <TableCell sx={{ minWidth: 120 }}>
                                            {[e.product, e.city, e.warehouse, e.agency, e.supplier].filter(Boolean).join(" · ") || <Typography variant="caption" color="text.secondary">General</Typography>}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{original(e.amount, e.currency, e.rate)}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{money(e.amount_usd)}</TableCell>
                                        <TableCell padding="checkbox">
                                            <Tooltip title="Acciones">
                                                <IconButton size="small" aria-label={`Acciones de ${e.concept}`} onClick={(ev) => setMenu({ anchor: ev.currentTarget, expense: e })}>
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
                {menu?.expense.has_receipt && <MenuItem onClick={act((e) => download(`/finance/expenses/${e.id}/receipt`, `gasto-${e.id}`))}>Ver comprobante</MenuItem>}
                {!menu?.expense.voided_at && !menu?.expense.inventory_trip_id && <MenuItem onClick={act(setEditing)}>Corregir</MenuItem>}
                {!menu?.expense.voided_at && !menu?.expense.inventory_trip_id && <MenuItem onClick={act(setVoiding)} sx={{ color: "error.main" }}>Anular</MenuItem>}
                <MenuItem onClick={act(setHistory)}>Historial</MenuItem>
            </Menu>

            <ExpenseDialog open={editing !== null} expense={editing === "new" ? null : editing} options={options} onCategory={onCategory}
                onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
            <VoidExpenseDialog expense={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); load(); }} />
            <AuditHistoryDialog subject={history ? { type: "expense", id: history.id, title: history.concept } : null} onClose={() => setHistory(null)} />
        </Stack>
    );
};
