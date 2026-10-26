// src/components/finance/OrderEconomicsDialog.tsx
// El último nivel del drill-down (Módulo 4 de Fran, §49): un pedido con sus líneas, sus carreras y sus comisiones, y de
// dónde sale cada número ("Cada cifra debe poder explicarse").
import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { api, errorMessage, money } from "./finance";

type Detail = {
    order: { id: number; name: string; status: string | null; total: number; refunded: number; created_at: string | null; delivered_at: string | null; is_exchange: boolean; is_return: boolean };
    financials: { outcome: string; revenue: number; revenue_refunded: number; cogs_main: number; cogs_upsell: number; logistics: number;
        cogs_source: "lots" | "catalog" | "mixed" | null; cogs_is_provisional: boolean; delivery: number; commission_seller: number;
        commission_upsell: number; commission_leader: number; total_cost: number; result: number; computed_at: string | null } | null;
    lots: { lot_id: number | null; kind: string | null; received_at: string | null; supplier: string | null; product: string | null; variant: string | null;
        warehouse: string | null; units: number; unit_cost: number | null; landed: number }[];
    lines: { name: string; size: string | null; quantity: number; price: number; subtotal: number; is_upsell: boolean; unit_cost: number | null; cogs: number | null }[];
    trips: { date: string; agency: string | null; type: string; result: string | null; cost: number; source: string; void_reason: string | null }[];
    legacy_agency: { date: string; agency: string | null; cost: number }[];
    commissions: { role: string; user: string | null; amount: number; date: string }[];
    leader: { user: string | null; amount: number; pct: number }[];
};

const ROLE: Record<string, string> = { vendedor: "Vendedora", upsell: "Upsell", repartidor: "Repartidor propio" };
const LOT_KIND: Record<string, string> = { initial: "lote inicial", purchase: "compra", pending_cost: "por completar", recovered: "de un cambio", adjustment: "ajuste" };
const SOURCE: Record<string, string> = { lots: "de sus lotes", catalog: "de catálogo (provisional)", mixed: "de sus lotes y de catálogo (provisional)" };
const OUTCOME: Record<string, string> = { delivered: "Entregada", not_delivered: "No entregada", open: "Abierta" };

export const OrderEconomicsDialog: React.FC<{ orderId: number | null; onClose: () => void }> = ({ orderId, onClose }) => {
    const [d, setD] = useState<Detail | null>(null);
    useEffect(() => {
        if (!orderId) return;
        let alive = true;
        api<Detail>(`/finance/profitability/orders/${orderId}`).then((r) => { if (alive) setD(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; setD(null); };
    }, [orderId]);
    const f = d?.financials;

    return (
        <Dialog open={orderId !== null} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{d ? `Orden ${d.order.name}` : "Orden"}{d?.order.is_exchange ? " · cambio" : ""}</DialogTitle>
            <DialogContent>
                {!d ? <Typography color="text.secondary">Cargando…</Typography> : (
                    <Stack spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                            {d.order.status} · creada {d.order.created_at}{d.order.delivered_at ? ` · entregada ${d.order.delivered_at}` : ""}
                            {f ? ` · ${OUTCOME[f.outcome] ?? f.outcome}` : ""}
                        </Typography>
                        {f && (
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 1.5 }}>
                                <div><Typography variant="caption" color="text.secondary">Ingreso</Typography><Typography variant="h6">{money(f.revenue)}</Typography>
                                    {f.revenue_refunded > 0 && <Typography variant="caption" color="error">devuelto {money(f.revenue_refunded)}</Typography>}</div>
                                <div><Typography variant="caption" color="text.secondary">Costos</Typography><Typography variant="h6">{money(f.total_cost)}</Typography></div>
                                <div><Typography variant="caption" color="text.secondary">Resultado</Typography>
                                    <Typography variant="h6" color={f.result < 0 ? "error.main" : "success.main"}>{money(f.result)}</Typography></div>
                                <div><Typography variant="caption" color="text.secondary">Calculado</Typography><Typography variant="body2">{f.computed_at}</Typography></div>
                            </Box>
                        )}
                        <div>
                            <Typography variant="subtitle2">Líneas y costo del producto</Typography>
                            {f && f.outcome === "delivered" && (
                                <Typography variant="body2" sx={{ mb: 0.5 }}>
                                    Costo del producto: <b>{money(f.cogs_main + f.cogs_upsell)}</b>, {SOURCE[f.cogs_source ?? "catalog"]}
                                    {f.logistics > 0 ? <> · transporte: <b>{money(f.logistics)}</b></> : null}
                                </Typography>
                            )}
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Cant.</TableCell><TableCell align="right">Precio</TableCell>
                                    <TableCell align="right">Costo de catálogo</TableCell><TableCell align="right">COGS de catálogo</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {d.lines.map((l, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{l.name}{l.size ? ` (${l.size})` : ""}{l.is_upsell ? " · upsell" : ""}</TableCell>
                                            <TableCell align="right">{l.quantity}</TableCell><TableCell align="right">{money(l.subtotal)}</TableCell>
                                            <TableCell align="right">{l.unit_cost === null ? <Typography variant="caption" color="warning.main">sin costo</Typography> : money(l.unit_cost)}</TableCell>
                                            <TableCell align="right">{money(l.cogs)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Typography variant="caption" color="text.secondary">El ingreso es el total de la orden ({money(d.order.total)}), que puede tener descuentos o recargos frente a las líneas. El costo solo cuenta si se entregó.</Typography>
                        </div>
                        {d.lots.length > 0 && (
                            <div>
                                <Typography variant="subtitle2">De qué lote salió</Typography>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Lote</TableCell><TableCell>Almacén</TableCell><TableCell align="right">Unidades</TableCell>
                                        <TableCell align="right">Costo unit.</TableCell><TableCell align="right">Transporte unit.</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {d.lots.map((l, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    {l.lot_id === null ? <Typography variant="caption" color="warning.main">sin lote (salió sin stock)</Typography>
                                                        : <>{l.product}{l.variant ? ` (${l.variant})` : ""} · {LOT_KIND[l.kind ?? ""] ?? l.kind}{l.supplier ? ` de ${l.supplier}` : ""}{l.received_at ? ` del ${l.received_at.split("-").reverse().join("/")}` : ""}</>}
                                                </TableCell>
                                                <TableCell>{l.warehouse}</TableCell>
                                                <TableCell align="right">{l.units}</TableCell>
                                                <TableCell align="right">{l.unit_cost === null ? <Typography variant="caption" color="warning.main">sin costo</Typography> : money(l.unit_cost)}</TableCell>
                                                <TableCell align="right">{l.landed > 0 ? money(l.landed) : "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <div>
                            <Typography variant="subtitle2">Delivery</Typography>
                            {d.trips.length === 0 && d.legacy_agency.length === 0 && <Typography variant="body2" color="text.secondary">Sin carreras.</Typography>}
                            {d.trips.map((t, i) => (
                                <Stack key={i} direction="row" justifyContent="space-between" gap={1} sx={{ py: 0.25 }}>
                                    <Typography variant="body2">{t.date} · {t.agency} · {t.type}{t.result ? `, ${t.result}` : ""} <Typography component="span" variant="caption" color="text.secondary">({t.source})</Typography></Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>{money(t.cost)}</Typography>
                                </Stack>
                            ))}
                            {d.legacy_agency.map((t, i) => (
                                <Stack key={`l${i}`} direction="row" justifyContent="space-between" gap={1} sx={{ py: 0.25 }}>
                                    <Typography variant="body2">{t.date} · {t.agency} <Typography component="span" variant="caption" color="text.secondary">(lo que se le pagaba a la agencia, antes del registro de carreras)</Typography></Typography>
                                    <Typography variant="body2">{money(t.cost)}</Typography>
                                </Stack>
                            ))}
                        </div>
                        <Divider />
                        <div>
                            <Typography variant="subtitle2">Comisiones</Typography>
                            {d.commissions.length === 0 && d.leader.length === 0 && <Typography variant="body2" color="text.secondary">Sin comisiones (solo nacen al entregar).</Typography>}
                            {d.commissions.map((c, i) => (
                                <Stack key={i} direction="row" justifyContent="space-between"><Typography variant="body2">{ROLE[c.role] ?? c.role}: {c.user}</Typography><Typography variant="body2">{money(c.amount)}</Typography></Stack>
                            ))}
                            {d.leader.map((l, i) => (
                                <Stack key={`ld${i}`} direction="row" justifyContent="space-between"><Typography variant="body2">Líder: {l.user} ({l.pct} %)</Typography><Typography variant="body2">{money(l.amount)}</Typography></Stack>
                            ))}
                        </div>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
        </Dialog>
    );
};
