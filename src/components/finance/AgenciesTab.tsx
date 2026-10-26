// src/components/finance/AgenciesTab.tsx
// Finanzas › Agencias (Módulo 4 de Fran, §104): por agencia, sus cierres (pendiente con el monto provisional; aprobado por
// pagar; pagado), el efectivo nuestro que tiene y lo que se le debe. Van aparte: no se compensan solos (§103); "Liquidar
// efectivo" registra lo que entregó y, si se marca, lo que se descontó de su pago (R16). Solo el Admin (§81).
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { STATUS_COLOR } from "../agency-closures/closures";
import { SettleCashDialog } from "./SettleCashDialog";
import { AgencyCashRow, AgencyClosureSummary, FinanceOptions, api, cashAmount, day, errorMessage, money } from "./finance";

const week = (c: AgencyClosureSummary) => `${day(c.period_start).slice(0, 5)} al ${day(c.period_end)}`;

/** §104: "Monto provisional" mientras no se aprueba; "Monto aprobado" después; lo pagado al final. */
const closureAmount = (c: AgencyClosureSummary) => {
    if (c.status === "pagado") return <>{money(c.payment_amount ?? c.approved)}<Typography variant="caption" color="text.secondary" display="block">pagado el {c.paid_at ? day(c.paid_at) : "—"}{c.payment_method ? ` · ${c.payment_method}` : ""}</Typography></>;
    if (c.status === "listo_pago") return <>{money(c.approved)}<Typography variant="caption" color="warning.main" display="block">aprobado, por pagar</Typography></>;
    return <>{money(c.provisional)}<Typography variant="caption" color="text.secondary" display="block">provisional</Typography></>;
};

export const AgenciesTab: React.FC<{ options: FinanceOptions }> = ({ options }) => {
    const [rows, setRows] = useState<AgencyCashRow[] | null>(null);
    const [settling, setSettling] = useState<AgencyCashRow | null>(null);

    const load = useCallback(() => {
        api<{ agencies: AgencyCashRow[] }>("/finance/agencies").then((r) => setRows(r.agencies)).catch((e) => toast.error(errorMessage(e)));
    }, []);
    useEffect(() => { load(); }, [load]);

    if (!rows) return <Typography color="text.secondary" sx={{ p: 1 }}>Cargando…</Typography>;
    if (rows.length === 0) return <Typography color="text.secondary" sx={{ p: 1 }}>No hay agencias.</Typography>;

    return (
        <Stack spacing={2}>
            {rows.map((a) => (
                <Panel key={a.id}>
                    <PanelHeader title={a.name} subtitle="Su efectivo y lo que se le debe van aparte: solo se descuenta uno del otro si se marca al liquidar."
                        action={<Stack direction="row" gap={1}>
                            <Button size="small" variant="contained" onClick={() => setSettling(a)}>Liquidar efectivo</Button>
                            <Button size="small" href="/admin/cierres-agencias">Cierres</Button>
                        </Stack>} />
                    <Stack direction="row" gap={3} flexWrap="wrap" sx={{ mb: 1.5 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Tiene de nosotros (efectivo)</Typography>
                            <Typography variant="h6">≈ {money(a.cash_usd)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {a.cash.length === 0 ? "nada pendiente" : a.cash.map((c) => cashAmount(c.balance, c.currency)).join(" + ")}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Le debemos (cierres aprobados)</Typography>
                            <Typography variant="h6" color={a.owed_usd > 0 ? "warning.main" : undefined}>{money(a.owed_usd)}</Typography>
                            <Typography variant="caption" color="text.secondary">{a.payables.filter((p) => p.balance > 0).length} cierre(s) por pagar</Typography>
                        </Box>
                    </Stack>
                    {a.closures.length > 0 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Semana</TableCell><TableCell>Estado</TableCell><TableCell align="right">Monto</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {a.closures.map((c) => {
                                        const debt = a.payables.find((p) => p.closure_id === c.id);
                                        return (
                                            <TableRow key={c.id}>
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                    <Link href={`/admin/cierres-agencias/${c.id}`} underline="hover">{week(c)}</Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="small" color={STATUS_COLOR[c.status as keyof typeof STATUS_COLOR] ?? "default"} label={c.status_label} />
                                                    {debt && debt.paid > 0 && debt.balance > 0 && (
                                                        <Typography variant="caption" color="text.secondary" display="block">pagado {money(debt.paid)}, falta {money(debt.balance)}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{closureAmount(c)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Panel>
            ))}
            <SettleCashDialog agency={settling} accounts={options.financial_accounts} onClose={() => setSettling(null)} onSaved={() => { setSettling(null); load(); }} />
        </Stack>
    );
};
