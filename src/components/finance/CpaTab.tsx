// src/components/finance/CpaTab.tsx
// Finanzas › CPA (Módulo 4 de Fran, §60 a §74): Target y Break-even financieros por producto + ciudad (§70, el valor
// principal) y por producto (§69), con la ventana madura (§60), Meta Purchases como denominador (§63) y el Fully Loaded
// como métrica secundaria con su nota obligatoria (§74). Cada cálculo es una versión (§73); no cambia nada en Meta (§71).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { CpaRow, CpaVersion, api, day, errorMessage, money, pct } from "./finance";

type Response = { window: { from: string; to: string }; last_computed_at: string | null; rows: CpaRow[] };

const Viable: React.FC<{ v: CpaVersion }> = ({ v }) => (v.purchases <= 0 ? <Chip size="small" label="sin compras de Meta" />
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
                            <TableCell align="right">Margen</TableCell><TableCell align="right">Break-even</TableCell><TableCell align="right">Target</TableCell><TableCell>Calculado</TableCell></TableRow></TableHead>
                        <TableBody>
                            {versions.map((v) => (
                                <TableRow key={v.id}>
                                    <TableCell>{v.version}</TableCell><TableCell>{day(v.period_from)} – {day(v.period_to)}</TableCell>
                                    <TableCell align="right">{pct(v.effectiveness)}</TableCell><TableCell align="right">{v.target_pct} % {v.target_type === "cost" ? "s/costo" : "s/ventas"}</TableCell>
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
                <PanelHeader title="CPA financiero por producto y ciudad"
                    subtitle={data ? `Ventana madura: órdenes creadas del ${day(data.window.from)} al ${day(data.window.to)}. Se calcula solo los miércoles a las 12:00${data.last_computed_at ? `; el último, ${data.last_computed_at}` : ""}.` : undefined}
                    action={<Button variant="contained" onClick={recalc} disabled={busy}>Recalcular ahora</Button>} />
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.rows.length === 0 ? (
                    <Typography color="text.secondary">Todavía no se calculó. Toca "Recalcular ahora".</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Producto / ciudad</TableCell><TableCell align="right">Efectividad</TableCell><TableCell align="right">Ingreso (R)</TableCell>
                                    <TableCell align="right">Costos sin publicidad (V)</TableCell><TableCell align="right">Compras Meta (P)</TableCell><TableCell align="right">CPA Meta</TableCell>
                                    <TableCell align="right">Break-even</TableCell><TableCell align="right">Target</TableCell><TableCell align="right">Fully Loaded</TableCell><TableCell>Estado</TableCell>
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
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(r.break_even)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(r.target)}<Typography variant="caption" color="text.secondary" display="block">{r.target_pct} % {r.target_type === "cost" ? "s/costo" : "s/ventas"}</Typography></TableCell>
                                            <TableCell align="right" sx={{ color: "text.secondary" }}>{money(r.fully_loaded)}</TableCell>
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
                <Typography variant="body2">· <b>Break-even</b> = (R − V) / P: el CPA máximo que Meta puede mostrar antes de quedar en $0 de beneficio. <b>Target</b> = lo mismo, dejando el margen objetivo del producto. P son las compras de Meta, no los pedidos entregados. El CPA Meta en rojo pasa el Break-even.</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>· <b>Fully Loaded</b> (secundario): El CPA Fully Loaded incluye gastos generales que no necesariamente desaparecen si una campaña se detiene. No debe utilizarse como referencia principal para decidir si una campaña debe escalarse o pausarse. Para decisiones de publicidad utilizar principalmente Financial Target CPA y Financial Break-even CPA.</Typography>
            </Alert>
            <History row={history} onClose={() => setHistory(null)} />
        </Stack>
    );
};
