// src/components/finance/CashDashboardPanel.tsx
// El tablero de la caja (Módulo 4 de Fran, §46): caja disponible, dinero pendiente en agencias, cuentas por cobrar, cuentas
// por pagar, entradas y salidas del período y próximos pagos. En el Resumen va compacto, como la tarjeta de LIQUIDEZ,
// separada de la rentabilidad (§48). Todo en USD aproximado: los Bs se pasan con la tasa de Binance. También responde
// "¿cuánto puedo destinar a comprar inventario?" (§110).
import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { CashDashboard, api, day, errorMessage, inCurrency, money } from "./finance";

const Card: React.FC<{ label: string; value: string; hint: React.ReactNode; tone?: "error" | "success" }> = ({ label, value, hint, tone }) => (
    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider", minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" sx={{ color: tone ? `${tone}.main` : undefined }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" display="block">{hint}</Typography>
    </Box>
);

const Breakdown: React.FC<{ title: string; rows: { kind: string; label: string; usd: number }[] }> = ({ title, rows }) => (
    <Box sx={{ flex: "1 1 260px", minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{title}</Typography>
        {rows.length === 0 ? <Typography variant="body2" color="text.secondary">Nada en el período.</Typography> : rows.map((r) => (
            <Stack key={r.kind} direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>{money(r.usd)}</Typography>
            </Stack>
        ))}
    </Box>
);

type Props = {
    from: string; to: string;
    /** En el Resumen: solo las tarjetas y el total de los próximos pagos, con un botón a la caja. */
    compact?: boolean; onOpenCash?: () => void;
    /** Cambia cuando la caja registra algo, para volver a pedir el tablero. */
    refreshKey?: number;
};

export const CashDashboardPanel: React.FC<Props> = ({ from, to, compact, onOpenCash, refreshKey }) => {
    const [data, setData] = useState<CashDashboard | null>(null);

    useEffect(() => {
        let alive = true;
        api<CashDashboard>(`/finance/cash/dashboard?from=${from}&to=${to}`)
            .then((r) => { if (alive) setData(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; };
    }, [from, to, refreshKey]);

    const overdue = data?.upcoming.filter((u) => u.overdue) ?? [];

    return (
        <Panel>
            <PanelHeader title="Liquidez"
                subtitle={`Cuánto dinero hay, dónde está y qué viene. Entradas y salidas del ${day(from)} al ${day(to)}. Los Bs se pasan a USD con la tasa de Binance: es aproximado.`}
                action={compact && onOpenCash ? <Button size="small" variant="outlined" onClick={onOpenCash}>Ver la caja</Button> : undefined} />
            {!data ? <Typography color="text.secondary">Cargando…</Typography> : (
                <Stack spacing={2}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 2 }}>
                        <Card label="Caja disponible" value={`≈ ${money(data.available_usd)}`} hint="en las cuentas de la empresa" tone={data.available_usd < 0 ? "error" : undefined} />
                        <Card label="Dinero en agencias" value={`≈ ${money(data.agencies_usd)}`} hint="efectivo cobrado que no han entregado" />
                        <Card label="Por cobrar" value={`≈ ${money(data.receivable_usd)}`}
                            hint={data.other_receivable_usd > 0 ? `agencias y ${money(data.other_receivable_usd)} de otras cuentas` : "el efectivo de las agencias"} />
                        <Card label="Por pagar" value={`≈ ${money(data.payable_usd)}`} tone={data.payable_overdue_usd > 0 ? "error" : undefined}
                            hint={data.payable_overdue_usd > 0 ? `${money(data.payable_overdue_usd)} vencido` : "nada vencido"} />
                        <Card label="Entradas del período" value={`≈ ${money(data.inflow_usd)}`} hint="sin movimientos entre cuentas" tone="success" />
                        <Card label="Salidas del período" value={`≈ ${money(data.outflow_usd)}`} hint="sin movimientos entre cuentas" />
                    </Box>

                    <Typography variant="body2">
                        Disponible para comprar inventario: <b>≈ {money(data.inventory_capital_usd)}</b>
                        <Typography component="span" variant="caption" color="text.secondary">
                            {" "}(la caja, menos lo que se debe y {money(data.recurring_soon_usd)} de gastos recurrentes de los próximos {data.upcoming_days} días; el efectivo de las agencias no cuenta hasta que lo entreguen)
                        </Typography>
                    </Typography>
                    {compact ? (
                        <Typography variant="body2" color="text.secondary">
                            Próximos {data.upcoming_days} días: {data.upcoming.length === 0 ? "no hay pagos pendientes." : <>
                                <b>{data.upcoming.length}</b> pago(s) por ≈ {money(data.upcoming_usd)}
                                {overdue.length > 0 && <>, de los cuales <Typography component="span" variant="body2" color="error.main">{overdue.length} vencido(s)</Typography></>}.
                            </>}
                        </Typography>
                    ) : (
                        <>
                            <Stack direction="row" gap={3} flexWrap="wrap">
                                <Breakdown title="De dónde entró" rows={data.inflow_by_kind} />
                                <Breakdown title="En qué salió" rows={data.outflow_by_kind} />
                            </Stack>
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                    Próximos pagos ({data.upcoming_days} días){data.upcoming.length > 0 && ` · ≈ ${money(data.upcoming_usd)}`}
                                </Typography>
                                {data.upcoming.length === 0 ? <Typography variant="body2" color="text.secondary">No hay pagos pendientes.</Typography> : (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow><TableCell>Vence</TableCell><TableCell>A quién</TableCell><TableCell>Qué</TableCell><TableCell align="right">Monto</TableCell><TableCell /></TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {data.upcoming.map((u) => (
                                                    <TableRow key={`${u.type}-${u.payable_id ?? u.recurring_id}-${u.date}`}>
                                                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                            {u.date ? day(u.date) : "sin fecha"}
                                                            {u.overdue && <Chip size="small" color="error" label="Vencido" sx={{ ml: 1 }} />}
                                                        </TableCell>
                                                        <TableCell>{u.payee}</TableCell>
                                                        <TableCell sx={{ minWidth: 160 }}>{u.description}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{inCurrency(u.amount, u.currency)}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                            {u.closure_id
                                                                ? <Link href={`/admin/cierres-agencias/${u.closure_id}`} underline="hover" variant="body2">Pagar en Cierres</Link>
                                                                : <Typography variant="caption" color="text.secondary">{u.type === "recurring" ? "en Gastos recurrentes" : "en Por pagar"}</Typography>}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>
                        </>
                    )}
                </Stack>
            )}
        </Panel>
    );
};
