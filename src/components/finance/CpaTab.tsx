// src/components/finance/CpaTab.tsx
// Finanzas › CPA: el CPA objetivo y el break-even reales por producto + ciudad (§70, el valor principal) y por producto
// (§69), por compra de Meta (§63), con los gastos fijos adentro y la cohorte más prudente entre 7 y 28 días (pedido del
// dueño, 2026-10-30). Cada cálculo es una versión (§73); no cambia nada en Meta (§71).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { CpaRow, CpaVersion, CpaWindow, FixedShare, api, day, errorMessage, money, pct } from "./finance";

type Response = {
    window: { from: string; to: string; long_from: string; days: number; long_days: number };
    fixed: FixedShare; city_min_purchases: number; last_computed_at: string | null; rows: CpaRow[];
};

const windowLine = (label: string, w: CpaWindow | null) => !w ? `${label}: sin datos`
    : `${label} (${day(w.from)} – ${day(w.to)}): objetivo ${money(w.target)} · break-even ${money(w.break_even)} · ${w.purchases} compras de Meta${w.missing_trips > 0 ? ` · ${w.missing_trips} carreras sin costo completadas con ${money(w.shipping_filled)}` : ""}`;

/** Qué fechas se usaron: las de 7 días, las de 28 o el número del producto (ciudad con pocas compras). */
const Basis: React.FC<{ v: CpaVersion }> = ({ v }) => {
    const d = v.detail;
    if (!d) return <Typography variant="caption" color="text.secondary">—</Typography>;
    const label = d.chosen === "product" ? "del producto" : `${v.window_days ?? (d.chosen === "short" ? d.short?.days : d.long?.days)} días`;
    const why = d.chosen === "product" ? `Menos de ${d.city_min_purchases} compras de Meta: usa el objetivo de su producto.`
        : d.chosen === "long" && (d.short?.purchases ?? 0) < d.city_min_purchases ? `Menos de ${d.city_min_purchases} compras de Meta en ${d.short?.days ?? 7} días: usa los ${d.long?.days ?? 28}.`
        : "La más prudente de las dos (la de objetivo más bajo).";
    return (
        <Tooltip title={<>{why}<br />{windowLine(`${d.short?.days ?? 7} días`, d.short)}<br />{windowLine(`${d.long?.days ?? 28} días`, d.long)}</>}>
            <Chip size="small" variant="outlined" label={label} />
        </Tooltip>
    );
};

const Viable: React.FC<{ v: CpaVersion }> = ({ v }) => (v.detail?.no_cost
    ? <Tooltip title="Este producto nunca tuvo una compra registrada en el inventario: no se sabe cuánto cuesta. Registra su compra en Inventario (o completa el costo de su lote en Finanzas › Inventario)."><Chip size="small" color="warning" label="falta el costo: registra una compra" /></Tooltip>
    : v.purchases <= 0 ? <Chip size="small" label="sin compras de Meta" />
    : v.viable ? <Chip size="small" color="success" variant="outlined" label="viable" />
    : <Tooltip title="Con la estructura actual de costes y efectividad, el margen configurado no es alcanzable."><Chip size="small" color="error" label="$0 · no viable" /></Tooltip>);

const History: React.FC<{ row: CpaRow | null; onClose: () => void }> = ({ row, onClose }) => {
    const [versions, setVersions] = useState<CpaVersion[] | null>(null);
    const product = row?.product_id;
    const city = row?.city_id;
    useEffect(() => {
        if (!product) return;
        let alive = true;
        api<{ versions: CpaVersion[] }>(`/finance/cpa/history?product_id=${product}${city ? `&city_id=${city}` : ""}`)
            .then((r) => { if (alive) setVersions(r.versions); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; setVersions(null); };
    }, [product, city]);
    return (
        <Dialog open={row !== null} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Histórico del CPA: {row?.product}{row?.city ? ` / ${row.city}` : ""}</DialogTitle>
            <DialogContent>
                {!versions ? <Typography color="text.secondary">Cargando…</Typography> : (
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Versión</TableCell><TableCell>Período</TableCell><TableCell align="right">Efectividad</TableCell>
                            <TableCell align="right">Utilidad</TableCell><TableCell align="right">Gastos fijos</TableCell><TableCell align="right">Break-even</TableCell><TableCell align="right">Objetivo</TableCell><TableCell>Calculado</TableCell></TableRow></TableHead>
                        <TableBody>
                            {versions.map((v) => (
                                <TableRow key={v.id}>
                                    <TableCell>{v.version}</TableCell><TableCell>{day(v.period_from)} – {day(v.period_to)}</TableCell>
                                    <TableCell align="right">{pct(v.effectiveness)}</TableCell><TableCell align="right">{v.target_pct} % {v.target_type === "cost" ? "s/costo" : "s/ventas"}</TableCell>
                                    <TableCell align="right">{v.fixed_pct === null ? "—" : `${v.fixed_pct} %`}</TableCell>
                                    <TableCell align="right">{money(v.break_even)}</TableCell><TableCell align="right">{money(v.target)}</TableCell>
                                    <TableCell>{v.computed_at}{v.trigger === "manual" ? " (a mano)" : ""}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
        </Dialog>
    );
};

export const CpaTab: React.FC = () => {
    const [data, setData] = useState<Response | null>(null);
    const [busy, setBusy] = useState(false);
    const [history, setHistory] = useState<CpaRow | null>(null);
    const load = useCallback(() => { api<Response>("/finance/cpa").then(setData).catch((e) => toast.error(errorMessage(e))); }, []);
    useEffect(() => { load(); }, [load]);

    const recalc = async () => {
        setBusy(true);
        try { toast.success((await api<{ message: string }>("/finance/cpa/recalculate", "POST")).message); load(); }
        catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    };

    return (
        <Stack spacing={2}>
            <Panel>
                <PanelHeader title="CPA objetivo y break-even reales, por producto y ciudad"
                    subtitle={data ? `Órdenes creadas del ${day(data.window.from)} al ${day(data.window.to)} (${data.window.days} días) y del ${day(data.window.long_from)} al ${day(data.window.to)} (${data.window.long_days}); vale la más prudente. Se calcula cada día a las 06:30${data.last_computed_at ? `; el último, ${data.last_computed_at}` : ""}.` : undefined}
                    action={<Button variant="contained" onClick={recalc} disabled={busy}>Recalcular ahora</Button>} />
                {data && (
                    <Alert severity={data.fixed.source === "real" ? "warning" : "info"} variant="outlined" sx={{ mb: 2 }}>
                        Gastos fijos: se aparta el <b>{data.fixed.pct} %</b> de cada venta{data.fixed.source === "real"
                            ? ` (lo real: ${money(data.fixed.expenses)} de gastos generales sobre ${money(data.fixed.revenue)} cobrados del ${day(data.fixed.from)} al ${day(data.fixed.to)}).`
                            : ` (el mínimo; lo real del ${day(data.fixed.from)} al ${day(data.fixed.to)} es ${data.fixed.real_pct === null ? "—" : `${data.fixed.real_pct} %`}: ${money(data.fixed.expenses)} de gastos generales cargados sobre ${money(data.fixed.revenue)} cobrados).`}
                    </Alert>
                )}
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.rows.length === 0 ? (
                    <Typography color="text.secondary">Todavía no se calculó. Toca "Recalcular ahora".</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Producto / ciudad</TableCell><TableCell align="right">Efectividad</TableCell><TableCell align="right">Ingreso (R)</TableCell>
                                    <TableCell align="right">Costos sin publicidad (V)</TableCell><TableCell align="right">Compras Meta (P)</TableCell><TableCell align="right">CPA Meta</TableCell>
                                    <TableCell align="right">Break-even</TableCell><TableCell align="right">Objetivo</TableCell><TableCell>Fechas</TableCell><TableCell>Estado</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.rows.map((r) => {
                                    const over = r.meta_cpa !== null && r.break_even !== null && r.meta_cpa > r.break_even;
                                    return (
                                        <TableRow key={r.id} hover onClick={() => setHistory(r)} sx={{ cursor: "pointer", bgcolor: r.city_id ? undefined : "action.hover" }}>
                                            <TableCell sx={{ pl: r.city_id ? 4 : 2, fontWeight: r.city_id ? 400 : 700, minWidth: 180 }}>{r.city ?? r.product}</TableCell>
                                            <TableCell align="right">{pct(r.effectiveness)}</TableCell><TableCell align="right">{money(r.revenue)}</TableCell>
                                            <TableCell align="right">{money(r.variable_costs)}</TableCell><TableCell align="right">{r.purchases}</TableCell>
                                            <TableCell align="right" sx={{ color: over ? "error.main" : undefined }}>{money(r.meta_cpa)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(r.break_even)}{r.fixed_pct !== null && <Typography variant="caption" color="text.secondary" display="block">con {r.fixed_pct} % fijos</Typography>}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(r.target)}<Typography variant="caption" color="text.secondary" display="block">{r.target_pct} % {r.target_type === "cost" ? "s/costo" : "s/ventas"}</Typography></TableCell>
                                            <TableCell><Basis v={r} /></TableCell>
                                            <TableCell><Viable v={r} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>
            <Alert severity="info" variant="outlined">
                <Typography variant="body2">· <b>Break-even</b> = (R − V − gastos fijos) / P: el CPA máximo que puede mostrar Ads Manager para quedar en $0, ya con los gastos fijos cubiertos. <b>Objetivo</b> = lo mismo, dejando además la utilidad del producto. P son las compras de Meta (lo que cuenta Ads Manager), no los pedidos entregados: la efectividad real de cada ciudad ya va adentro. El CPA Meta en rojo pasa el break-even.</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>· <b>Prudente</b>: R es solo lo cobrado de lo entregado; V incluye producto, envíos (también los fallidos; una carrera sin costo cuenta lo que cuesta en promedio una carrera en esa ciudad) y las comisiones de todos los roles. Se calcula con 7 y con 28 días y vale el objetivo más bajo: si empeora se nota enseguida, si mejora no se confía hasta que se sostenga. Una ciudad con menos de {data?.city_min_purchases ?? 30} compras de Meta usa sus 28 días o el número de su producto.</Typography>
            </Alert>
            <History row={history} onClose={() => setHistory(null)} />
        </Stack>
    );
};
