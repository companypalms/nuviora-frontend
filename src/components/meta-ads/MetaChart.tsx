// src/components/meta-ads/MetaChart.tsx
// §26: elegir una métrica (CPA, CTR, CPM, CPC, Frequency, Purchases, Hook Rate, Hold Rate, LPV Rate, Conversion
// Rate…) y ver su evolución día por día en el rango, para lo que diga el filtro. Con el CPA se dibujan el Target CPA y
// el Break-even de cada día (§34): desde el Módulo 4, el CPA financiero vigente ese día (R12), con el manual tenue de
// referencia; con "comparar", el período anterior (§28).
import React, { useEffect, useState } from "react";
import { Box, MenuItem, Paper, Stack, TextField, Typography, useTheme } from "@mui/material";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { CHART_METRICS, api, fmtKind } from "./metaAds";

type Point = {
    date: string; value: number | null; previous: number | null; target_cpa: number | null; break_even_cpa: number | null;
    target_source?: "financial" | "manual" | null; manual_target_cpa?: number | null;
};

export const MetaChart: React.FC<{ query: string; title?: string; compare: boolean; isVideo?: boolean; canSeeSpend?: boolean; initialMetric?: string }> = ({
    query, title, compare, isVideo = true, canSeeSpend = true, initialMetric = "cpa",
}) => {
    const t = useTheme();
    const [metric, setMetric] = useState(initialMetric);
    const [points, setPoints] = useState<Point[] | null>(null);
    const def = CHART_METRICS.find((m) => m.key === metric) ?? CHART_METRICS[0];

    useEffect(() => {
        let alive = true;
        setPoints(null);
        api<{ points: Point[] }>(`/meta/report/series?metric=${metric}&${query}${compare ? "&compare=1" : ""}`)
            .then((r) => alive && setPoints(r.points))
            .catch(() => alive && setPoints([]));
        return () => { alive = false; };
    }, [metric, query, compare]);

    const options = CHART_METRICS.filter((m) => (isVideo || !m.video) && (canSeeSpend || m.key !== "spend"));
    const showTargets = metric === "cpa" && points?.some((p) => p.target_cpa !== null || p.break_even_cpa !== null);
    // R12: si el financiero manda algún día, el manual queda como una línea tenue de referencia
    const financial = points?.some((p) => p.target_source === "financial") ?? false;
    const showManual = showTargets && financial && (points?.some((p) => p.manual_target_cpa != null) ?? false);
    const label = (d: string) => { const [, m, day] = d.split("-"); return `${Number(day)}/${Number(m)}`; };

    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">{title ?? "Evolución"}: {def.label}</Typography>
                <TextField select size="small" label="Métrica" value={metric} onChange={(e) => setMetric(e.target.value)} sx={{ minWidth: 180 }}>
                    {options.map((m) => <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>)}
                </TextField>
            </Stack>
            {points === null ? <Typography variant="body2">Cargando…</Typography> : points.every((p) => p.value === null) ? (
                <Typography variant="body2" color="text.secondary">Sin datos en este rango.</Typography>
            ) : (
                <Box sx={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                        <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.palette.divider} />
                            <XAxis dataKey="date" tickFormatter={label} tick={{ fill: t.palette.text.secondary, fontSize: 11 }} />
                            <YAxis tick={{ fill: t.palette.text.secondary, fontSize: 11 }} width={56} tickFormatter={(v) => fmtKind(def.kind, v)} />
                            <ChartTooltip
                                contentStyle={{ borderRadius: 8, border: "none", background: t.palette.background.paper, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 12 }}
                                labelFormatter={(d) => label(String(d))}
                                formatter={(v: unknown, name?: string) => [fmtKind(def.kind, typeof v === "number" ? v : null), name ?? ""]}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="value" name={def.label} stroke={t.palette.primary.main} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            {compare && <Line type="monotone" dataKey="previous" name="Período anterior" stroke={t.palette.text.secondary} strokeDasharray="4 4" dot={false} connectNulls />}
                            {showTargets && <Line type="stepAfter" dataKey="target_cpa" name={financial ? "Target CPA financiero" : "Target CPA"} stroke={t.palette.success.main} strokeDasharray="6 3" dot={false} />}
                            {showTargets && <Line type="stepAfter" dataKey="break_even_cpa" name="Break-even" stroke={t.palette.error.main} strokeDasharray="6 3" dot={false} />}
                            {showManual && <Line type="stepAfter" dataKey="manual_target_cpa" name="Target manual (referencia)" stroke={t.palette.text.disabled} strokeDasharray="2 4" strokeWidth={1} dot={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Paper>
    );
};
