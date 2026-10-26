// src/components/finance/GroupOrdersDialog.tsx
// Drill-down (Módulo 4 de Fran, §49): los pedidos de un producto, una ciudad o un producto + ciudad en el período, con
// lo que aporta cada uno. Tocar uno abre sus líneas y costos.
import React, { useEffect, useState } from "react";
import {
    Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Pagination, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { OrderEconomicsDialog } from "./OrderEconomicsDialog";
import { GroupRow, OrderRow, api, day, errorMessage, money } from "./finance";

type Props = { group: GroupRow | null; by: string; range: [string, string]; onClose: () => void };

export const GroupOrdersDialog: React.FC<Props> = ({ group, by, range, onClose }) => {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ orders: OrderRow[]; total: number; last_page: number } | null>(null);
    const [orderId, setOrderId] = useState<number | null>(null);

    useEffect(() => {
        if (!group) return;
        const qs = new URLSearchParams({ from: range[0], to: range[1], page: String(page) });
        if (by !== "city") qs.set("product_id", group.product_id ? String(group.product_id) : "none");
        if (by !== "product") qs.set("city_id", group.city_id ? String(group.city_id) : "none");
        let alive = true;
        api<{ orders: OrderRow[]; total: number; last_page: number }>(`/finance/profitability/orders?${qs}`)
            .then((r) => { if (alive) setData(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; };
    }, [group, by, range, page]);

    const close = () => { setPage(1); setData(null); onClose(); };

    return (
        <Dialog open={group !== null} onClose={close} fullWidth maxWidth="lg">
            <DialogTitle>{group?.name}: pedidos del {day(range[0])} al {day(range[1])}</DialogTitle>
            <DialogContent>
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.orders.length === 0 ? (
                    <Typography color="text.secondary">Sin pedidos: lo de esta fila es publicidad o gastos asignados.</Typography>
                ) : (
                    <>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Orden</TableCell><TableCell>Resultado</TableCell><TableCell>Creada</TableCell>
                                        <TableCell align="right">Ingreso</TableCell><TableCell align="right">COGS</TableCell><TableCell align="right">Delivery</TableCell>
                                        <TableCell align="right">Comisiones</TableCell><TableCell align="right">Aporta</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.orders.map((o) => (
                                        <TableRow key={o.order_id} hover onClick={() => setOrderId(o.order_id)} sx={{ cursor: "pointer" }}>
                                            <TableCell>{o.name}{o.kind === "exchange" && <Chip size="small" label="cambio" sx={{ ml: 0.5 }} />}</TableCell>
                                            <TableCell>{o.outcome === "delivered" ? `Entregada ${day(o.delivered_date)}` : o.status}</TableCell>
                                            <TableCell>{day(o.created_date)}</TableCell>
                                            <TableCell align="right">{money(o.revenue)}</TableCell>
                                            <TableCell align="right">{money(o.cogs)}{o.cogs_missing_lines > 0 && <Typography variant="caption" color="warning.main" display="block">sin costo</Typography>}
                                                {o.outcome === "delivered" && o.cogs_source !== "lots" && o.cogs_missing_lines === 0 && <Typography variant="caption" color="text.secondary" display="block">de catálogo</Typography>}
                                                {o.logistics > 0 && <Typography variant="caption" color="text.secondary" display="block">+ {money(o.logistics)} transporte</Typography>}</TableCell>
                                            <TableCell align="right">{money(o.delivery)}{o.delivery_estimated && <Typography variant="caption" color="text.secondary" display="block">estimado</Typography>}
                                                {o.delivery_missing_trips > 0 && <Typography variant="caption" color="warning.main" display="block">sin calcular</Typography>}</TableCell>
                                            <TableCell align="right">{money(o.commissions)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: o.result < 0 ? "error.main" : undefined }}>{money(o.result)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">{data.total} pedidos. "Aporta" es antes de publicidad y gastos.</Typography>
                            {data.last_page > 1 && <Pagination size="small" count={data.last_page} page={page} onChange={(_, p) => setPage(p)} />}
                        </Stack>
                    </>
                )}
            </DialogContent>
            <DialogActions><Button onClick={close}>Cerrar</Button></DialogActions>
            <OrderEconomicsDialog orderId={orderId} onClose={() => setOrderId(null)} />
        </Dialog>
    );
};
