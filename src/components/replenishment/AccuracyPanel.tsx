// src/components/replenishment/AccuracyPanel.tsx
// Reabastecimiento › Precisión (Módulo 5 de Fran, entrega 4; §97–§105). Cuando termina el horizonte de un plan (el día en
// que se generó + su cobertura), el sistema compara lo previsto con lo entregado de verdad. La confiabilidad nunca sale
// sola: debajo van sus partes (§103). Por nivel: global, producto, variante, ciudad y almacén (§104). Solo sugiere; no
// cambia nada de la configuración (§105).
import React, { useEffect, useState } from "react";
import {
    Alert, Box, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { api, errorMessage } from "../finance/finance";

type Metrics = {
    lines: number; predicted: number; actual: number; abs_error: number; mae: number | null; wape: number | null; accuracy: number | null; bias_pct: number | null;
    stockout_rate: number | null; excess_rate: number | null; excess_units: number; stockout_avoidance: number | null; excess_control: number | null; reliability: number | null;
};
type LevelRow = Metrics & { key: string; label: string };
type Evaluation = {
    id: number; generated_at: string; coverage_days: number; approved: boolean; evaluated_at: string;
    from: string; to: string; days: number; stock_measured: boolean; weights: Record<"accuracy" | "stockout" | "excess", number>;
    global: Metrics; by_product: LevelRow[]; by_variant: LevelRow[]; by_city: LevelRow[]; by_warehouse: LevelRow[]; suggestions: string[];
    follow_up: {
        purchase_recommended: number; purchase_approved: number; purchase_bought: number; purchase_received: number;
        transfer_recommended: number; transfer_approved: number; transfer_done: number;
        actual_units: number; end_stock: number | null; stockouts: number; excess_units: number;
    };
};

const pct = (v: number | null) => (v === null ? "—" : `${String(v).replace(".", ",")} %`);
const n = (v: number | null) => (v === null ? "—" : String(v).replace(".", ","));
const date = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
/** §101: "El sistema tiende a sobreestimar aproximadamente 15 %" */
const biasText = (b: number | null) => b === null ? "Sin ventas reales en el horizonte: no se puede medir el sesgo."
    : Math.abs(b) < 1 ? "El sistema no se desvía ni para arriba ni para abajo."
        : `El sistema tiende a ${b > 0 ? "sobreestimar" : "subestimar"} aproximadamente ${String(Math.abs(Math.round(b))).replace(".", ",")} %.`;

const LEVELS = [
    { key: "by_product", label: "Producto" },
    { key: "by_variant", label: "Variante" },
    { key: "by_city", label: "Ciudad" },
    { key: "by_warehouse", label: "Almacén" },
] as const;

export const AccuracyPanel: React.FC = () => {
    const [rows, setRows] = useState<Evaluation[] | null>(null);
    const [pending, setPending] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [level, setLevel] = useState<(typeof LEVELS)[number]["key"]>("by_product");

    useEffect(() => {
        api<{ evaluations: Evaluation[]; pending: number }>("/finance/replenishment/evaluations").then((r) => {
            setRows(r.evaluations);
            setPending(r.pending);
            if (r.evaluations[0]) setSelected(r.evaluations[0].id);
        }).catch((e) => toast.error(errorMessage(e)));
    }, []);

    if (rows === null) return <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography>;
    if (rows.length === 0) {
        return (
            <Alert severity="info">
                Todavía no hay planes evaluados. Un plan se evalúa solo, cada mañana, cuando termina su horizonte (el día en que se generó + su cobertura).
                {pending > 0 ? ` Hay ${pending} esperando a que termine.` : ""}
            </Alert>
        );
    }
    const e = rows.find((r) => r.id === selected) ?? rows[0];
    const g = e.global;
    const f = e.follow_up;
    const part = (label: string, value: string, weight?: number) => (
        <Box sx={{ minWidth: 150 }}>
            <Typography variant="caption" color="text.secondary">{label}{weight !== undefined ? ` (peso ${weight} %)` : ""}</Typography>
            <Typography variant="h6">{value}</Typography>
        </Box>
    );

    return (
        <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
                <TextField select size="small" label="Plan evaluado" value={e.id} onChange={(ev) => setSelected(Number(ev.target.value))} sx={{ minWidth: 320 }}>
                    {rows.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                            #{r.id} · {date(r.from)} al {date(r.to)} · {r.approved ? "aprobado" : "sin aprobar"} · confiabilidad {pct(r.global.reliability)}
                        </MenuItem>
                    ))}
                </TextField>
                {pending > 0 && <Typography variant="body2" color="text.secondary">{pending} planes esperando a que termine su horizonte.</Typography>}
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="overline">Confiabilidad del forecast</Typography>
                <Typography variant="h4" fontWeight={700}>{pct(g.reliability)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Plan #{e.id}: {e.days} días, del {date(e.from)} al {date(e.to)}. {biasText(g.bias_pct)}
                </Typography>
                <Stack direction="row" gap={3} flexWrap="wrap">
                    {part("Accuracy", pct(g.accuracy), e.weights.accuracy)}
                    {part("Prevención de quiebres", pct(g.stockout_avoidance), e.weights.stockout)}
                    {part("Control de exceso", e.stock_measured ? pct(g.excess_control) : "sin medir", e.weights.excess)}
                    {part("Bias", g.bias_pct === null ? "—" : `${g.bias_pct > 0 ? "+" : ""}${pct(g.bias_pct)}`)}
                </Stack>
                <Stack direction="row" gap={3} flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {part("Previsto", `${n(g.predicted)} u`)}
                    {part("Real", `${n(g.actual)} u`)}
                    {part("MAE", n(g.mae))}
                    {part("WAPE", pct(g.wape))}
                    {part("Quiebres", pct(g.stockout_rate))}
                    {part("Exceso", e.stock_measured ? `${g.excess_units} u` : "sin medir")}
                </Stack>
                {!e.stock_measured && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Se evaluó tarde: el stock de hoy ya no es el del final del horizonte, así que el exceso no se mide y su peso se reparte entre las otras dos.
                    </Typography>
                )}
            </Paper>

            {e.suggestions.length > 0 && (
                <Alert severity="warning">
                    {e.suggestions.map((s, i) => <Typography key={i} variant="body2">{s}</Typography>)}
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Son sugerencias: nada cambia solo. Si quieres ajustar algo, hazlo en Configuración o Productos.</Typography>
                </Alert>
            )}

            <Panel>
                <PanelHeader title="Seguimiento del plan" subtitle="Lo recomendado, lo aprobado y lo que de verdad pasó." />
                <Stack direction="row" gap={3} flexWrap="wrap" sx={{ p: 2, pt: 0 }}>
                    {part("Compra recomendada", `${f.purchase_recommended} u`)}
                    {part("Aprobada", `${f.purchase_approved} u`)}
                    {part("Comprada", `${f.purchase_bought} u`)}
                    {part("Recibida", `${f.purchase_received} u`)}
                    {part("Traslados recomendados", `${f.transfer_recommended} u`)}
                    {part("Aprobados", `${f.transfer_approved} u`)}
                    {part("Trasladados", `${f.transfer_done} u`)}
                    {part("Consumo real", `${n(f.actual_units)} u`)}
                    {part("Stock final", f.end_stock === null ? "sin medir" : `${f.end_stock} u`)}
                    {part("Líneas con quiebre", String(f.stockouts))}
                    {part("Exceso final", e.stock_measured ? `${f.excess_units} u` : "sin medir")}
                </Stack>
            </Panel>

            <Panel>
                <PanelHeader title="Precisión por nivel" subtitle="Un forecast puede ser muy bueno en una ciudad y flojo en otra." />
                <Tabs value={level} onChange={(_, v) => setLevel(v)} sx={{ px: 2 }}>
                    {LEVELS.map((l) => <Tab key={l.key} value={l.key} label={l.label} />)}
                </Tabs>
                <TableContainer sx={{ p: 1, maxHeight: 520 }}>
                    <Table size="small" stickyHeader>
                        <TableHead><TableRow>
                            <TableCell>{LEVELS.find((l) => l.key === level)?.label}</TableCell><TableCell align="right">Previsto</TableCell><TableCell align="right">Real</TableCell>
                            <TableCell align="right">Error</TableCell><TableCell align="right">Accuracy</TableCell><TableCell align="right">Bias</TableCell>
                            <TableCell align="right">Quiebres</TableCell><TableCell align="right">Exceso</TableCell><TableCell align="right">Confiabilidad</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {e[level].length === 0 ? (
                                <TableRow><TableCell colSpan={9}><Typography color="text.secondary" variant="body2">Nada que mostrar en este nivel.</Typography></TableCell></TableRow>
                            ) : e[level].map((r) => (
                                <TableRow key={r.key}>
                                    <TableCell>{r.label}</TableCell>
                                    <TableCell align="right">{n(r.predicted)}</TableCell><TableCell align="right">{n(r.actual)}</TableCell><TableCell align="right">{n(r.abs_error)}</TableCell>
                                    <TableCell align="right">{pct(r.accuracy)}</TableCell>
                                    <TableCell align="right">{r.bias_pct === null ? "—" : `${r.bias_pct > 0 ? "+" : ""}${pct(r.bias_pct)}`}</TableCell>
                                    <TableCell align="right">{pct(r.stockout_rate)}</TableCell>
                                    <TableCell align="right">{e.stock_measured ? `${r.excess_units} u` : "—"}</TableCell>
                                    <TableCell align="right"><b>{pct(r.reliability)}</b></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Panel>
        </Stack>
    );
};
