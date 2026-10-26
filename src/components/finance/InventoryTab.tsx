// src/components/finance/InventoryTab.tsx
// Finanzas › Inventario (Módulo 4 de Fran, entrega 2e; §9 a §17, R3, R5, R8): cuánto vale el inventario a costo FIFO
// (cada lote a su costo más su logística, §11 y §14), los lotes que esperan su costo, los lotes con dónde está cada
// parte (§12), lo que está en revisión, los ajustes de conteo del período (Fran, 2026-10-14) y el transporte del período
// (§13). Solo el Admin (§81).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AuditHistoryDialog } from "./AuditHistoryDialog";
import { LotCostDialog } from "./LotCostDialog";
import { COST_SOURCE, InventoryLotRow, InventoryResponse, api, day, errorMessage, money, monthRange, usd4 } from "./finance";

const Stat: React.FC<{ label: string; value: React.ReactNode; hint: string; warn?: boolean }> = ({ label, value, hint, warn }) => (
    <Box sx={{ minWidth: 150, flex: "1 1 150px" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" color={warn ? "warning.main" : undefined}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </Box>
);

const Where: React.FC<{ places: InventoryLotRow["where"] }> = ({ places }) => (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
        {places.length === 0 ? <Typography variant="caption" color="text.secondary">agotado</Typography> : places.map((w) => (
            <Chip key={`${w.warehouse}|${w.state}`} size="small" variant="outlined" color={w.state === "review" ? "warning" : "default"}
                label={`${w.warehouse}${w.state === "review" ? " (revisión)" : ""}: ${w.units}`} />
        ))}
    </Stack>
);

const cost = (l: InventoryLotRow) => (l.unit_cost === null
    ? <Typography variant="caption" color="warning.main">sin costo</Typography>
    : <>{usd4(l.unit_cost)}<Typography variant="caption" color="text.secondary" display="block">{COST_SOURCE[l.cost_source ?? ""] ?? ""}</Typography></>);

export const InventoryTab: React.FC = () => {
    const [[from, to], setRange] = useState<[string, string]>(monthRange());
    const [product, setProduct] = useState("");
    const [data, setData] = useState<InventoryResponse | null>(null);
    const [editing, setEditing] = useState<InventoryLotRow | null>(null);
    const [history, setHistory] = useState<InventoryLotRow | null>(null);

    const load = useCallback(() => {
        const qs = new URLSearchParams({ from, to, ...(product ? { product_id: product } : {}) });
        api<InventoryResponse>(`/finance/inventory?${qs}`).then(setData).catch((e) => toast.error(errorMessage(e)));
    }, [from, to, product]);
    useEffect(() => { load(); }, [load]);

    if (!data) return <Typography color="text.secondary" sx={{ p: 1 }}>Cargando…</Typography>;
    const t = data.totals;
    const canSetCost = (l: InventoryLotRow) => l.kind !== "purchase" && l.kind !== "recovered";

    return (
        <Stack spacing={2}>
            {!data.initialized && (
                <Alert severity="info">El inventario por lotes empieza con el primer corte, que se toma solo unos minutos después del despliegue. Desde ahí cada movimiento queda en su lote.</Alert>
            )}
            <Panel>
                <PanelHeader title="Valor del inventario" subtitle="Lo que queda de cada lote, a su costo más su transporte (FIFO). Lo que está en revisión va aparte." />
                <Stack direction="row" gap={2} flexWrap="wrap">
                    <Stat label="Valor (FIFO)" value={money(t.value)} hint={`${t.units} unidades para vender`} />
                    <Stat label="Transporte incluido" value={money(t.logistics)} hint="parte de los viajes de lo que queda" />
                    <Stat label="En revisión" value={money(t.review_value)} hint={`${t.review_units} unidades que no se venden`} />
                    <Stat label="Sin costo" value={t.without_cost_units} hint="unidades sin costo: valen $0 aquí" warn={t.without_cost_units > 0} />
                    <Stat label="Lotes por completar" value={data.pending.length} hint="esperan su costo" warn={data.pending.length > 0} />
                </Stack>
                {data.check.differences > 0 && (
                    <Alert severity="warning" sx={{ mt: 1.5 }}>
                        {data.check.differences} diferencia(s) entre los lotes y el stock (almacén + producto + talla). Suele ser stock en negativo o un cambio hecho sin movimiento.
                    </Alert>
                )}
                {data.check.pending > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{data.check.pending} movimiento(s) recientes todavía sin pasar a los lotes (pasan en un minuto).</Typography>
                )}
            </Panel>

            {data.pending.length > 0 && (
                <Panel>
                    <PanelHeader title="Lotes por completar" subtitle="Entraron sin costo de compra o sin costo. Mientras tanto cuentan con el costo de catálogo (provisional) o en $0." />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Entró</TableCell><TableCell>Producto</TableCell><TableCell>Cómo entró</TableCell>
                                    <TableCell align="right">Unidades</TableCell><TableCell align="right">Quedan</TableCell><TableCell align="right">Costo</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.pending.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(l.received_at.slice(0, 10))}</TableCell>
                                        <TableCell>{l.product}{l.variant ? ` (${l.variant})` : ""}</TableCell>
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <Typography variant="body2">{l.kind_label}</Typography>
                                            {l.origin && <Typography variant="caption" color="text.secondary">{l.origin}{l.user ? ` · ${l.user}` : ""}</Typography>}
                                        </TableCell>
                                        <TableCell align="right">{l.initial}</TableCell>
                                        <TableCell align="right">{l.remaining}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{cost(l)}</TableCell>
                                        <TableCell align="right">{canSetCost(l) && <Button size="small" variant="outlined" onClick={() => setEditing(l)}>Poner costo</Button>}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Panel>
            )}

            <Panel>
                <PanelHeader title="Por producto" />
                {data.products.length === 0 ? <Typography color="text.secondary">Todavía no hay lotes.</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Producto</TableCell><TableCell align="right">Unidades</TableCell><TableCell align="right">Costo promedio</TableCell>
                                    <TableCell align="right">Valor</TableCell><TableCell align="right">En revisión</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.products.map((p) => (
                                    <TableRow key={p.product_id} hover onClick={() => setProduct(String(p.product_id))} sx={{ cursor: "pointer" }}>
                                        <TableCell>
                                            {p.product}
                                            {p.without_cost_units > 0 && <Typography variant="caption" color="warning.main" display="block">{p.without_cost_units} sin costo</Typography>}
                                        </TableCell>
                                        <TableCell align="right">{p.units}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                            {p.avg_unit_cost === null ? "—" : usd4(p.avg_unit_cost)}
                                            {p.logistics > 0 && <Typography variant="caption" color="text.secondary" display="block">con transporte</Typography>}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{money(p.value)}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{p.review_units > 0 ? `${p.review_units} u · ${money(p.review_value)}` : "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {data.warehouses.length > 0 && (
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                        {data.warehouses.map((w) => <Chip key={w.warehouse_id} size="small" variant="outlined" label={`${w.warehouse}: ${w.units} u · ${money(w.value)}`} />)}
                    </Stack>
                )}
            </Panel>

            <Panel>
                <PanelHeader title="Lotes" subtitle="Cada compra es un lote; al trasladarse conserva su costo, y cada parte suma su transporte."
                    action={
                        <TextField select size="small" label="Producto" value={product} onChange={(e) => setProduct(e.target.value)} sx={{ minWidth: 220 }}
                            SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
                            <MenuItem value="">Los más recientes</MenuItem>
                            {data.products.map((p) => <MenuItem key={p.product_id} value={String(p.product_id)}>{p.product}</MenuItem>)}
                        </TextField>
                    } />
                {data.lots.length === 0 ? <Typography color="text.secondary">Sin lotes.</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Entró</TableCell><TableCell>Producto</TableCell><TableCell>Origen</TableCell>
                                    <TableCell align="right">Unidades</TableCell><TableCell>Dónde está</TableCell><TableCell align="right">Costo</TableCell>
                                    <TableCell align="right">Transporte</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.lots.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(l.received_at.slice(0, 10))}</TableCell>
                                        <TableCell>{l.product}{l.variant ? ` (${l.variant})` : ""}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{l.kind_label}</Typography>
                                            {l.supplier && <Typography variant="caption" color="text.secondary">{l.supplier}</Typography>}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{l.remaining} / {l.initial}</TableCell>
                                        <TableCell sx={{ minWidth: 180 }}><Where places={l.where} /></TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{cost(l)}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{l.landed > 0 ? <Tooltip title="Promedio de lo que queda"><span>{usd4(l.landed)}</span></Tooltip> : "—"}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                            {canSetCost(l) && <Button size="small" onClick={() => setEditing(l)}>Costo</Button>}
                                            <Button size="small" color="inherit" onClick={() => setHistory(l)}>Historial</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    El costo de una compra se corrige en Finanzas › Proveedores, porque también cambia la deuda.
                </Typography>
            </Panel>

            <Panel>
                <PanelHeader title="En revisión" subtitle="Volvieron de un cambio ($0: su costo ya se contó) o se pasaron a revisión por dañadas o perdidas. Si se dan de baja, lo que tenía costo es merma." />
                {data.review.length === 0 ? <Typography color="text.secondary">Nada en revisión.</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Producto</TableCell><TableCell>Almacén</TableCell><TableCell align="right">Unidades</TableCell><TableCell align="right">Costo</TableCell></TableRow></TableHead>
                            <TableBody>
                                {data.review.map((r) => (
                                    <TableRow key={`${r.product_id}|${r.warehouse}`}>
                                        <TableCell>{r.product}</TableCell><TableCell>{r.warehouse}</TableCell>
                                        <TableCell align="right">{r.units}{r.from_exchange > 0 && <Typography variant="caption" color="text.secondary" display="block">{r.from_exchange} de cambios</Typography>}</TableCell>
                                        <TableCell align="right">{money(r.value)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>

            <Panel>
                <PanelHeader title={`Del ${day(data.from)} al ${day(data.to)}`} subtitle="Ajustes de conteo y transporte del período."
                    action={
                        <Stack direction="row" gap={1}>
                            <Chip label="Este mes" onClick={() => setRange(monthRange())} variant={from === monthRange()[0] ? "filled" : "outlined"} />
                            <Chip label="Mes pasado" onClick={() => setRange(monthRange(-1))} variant={from === monthRange(-1)[0] ? "filled" : "outlined"} />
                        </Stack>
                    } />
                <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 1.5 }}>
                    <Stat label="Ajustes hacia arriba" value={`+${data.adjustments.up_units} u`} hint={`${money(data.adjustments.up_value)} al costo`} />
                    <Stat label="Ajustes hacia abajo" value={`−${data.adjustments.down_units} u`} hint={`${money(data.adjustments.down_value)} al costo`} />
                    <Stat label="Transporte de inventario" value={money(data.trips.total_usd)} hint={`${data.trips.count} viaje(s), ${data.trips.units} unidades`} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Un ajuste es una corrección de conteo con la agencia: no es merma ni gasto. Si se repiten hacia abajo, conviene revisarlo con la agencia.
                </Typography>
                {data.adjustments.rows.length > 0 && (
                    <TableContainer>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Producto</TableCell><TableCell>Almacén</TableCell><TableCell align="right">Unidades</TableCell><TableCell align="right">Al costo</TableCell><TableCell>Nota</TableCell></TableRow></TableHead>
                            <TableBody>
                                {data.adjustments.rows.map((a) => (
                                    <TableRow key={a.movement_id}>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(a.date.slice(0, 10))}</TableCell>
                                        <TableCell>{a.product}</TableCell><TableCell>{a.warehouse}</TableCell>
                                        <TableCell align="right" sx={{ color: a.units < 0 ? "error.main" : "success.main" }}>{a.units > 0 ? `+${a.units}` : a.units}</TableCell>
                                        <TableCell align="right">{money(a.value)}</TableCell>
                                        <TableCell sx={{ minWidth: 160 }}><Typography variant="caption">{a.notes}{a.user ? ` · ${a.user}` : ""}</Typography></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>

            <LotCostDialog lot={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
            <AuditHistoryDialog subject={history ? { type: "inventory_lot", id: history.id, title: `Lote de ${history.product}` } : null} onClose={() => setHistory(null)} />
        </Stack>
    );
};
